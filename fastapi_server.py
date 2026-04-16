import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
import time
import pandas as pd

# Handle imports safely to avoid crashing if dependencies are missing during init
try:
    from rag_engine import EnergyRAG
    from geo_utils import get_utility_df, get_unified_df, kpi_advanced, ALL_UTILITIES
except Exception as e:
    print(f"Warning: Core imports failed. Error: {e}")
    EnergyRAG = None
    get_unified_df = None

app = FastAPI(title="STADTWERKE X API", description="Production API for the EnergyBot Intelligence Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production: Restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = None

@app.on_event("startup")
def startup_event():
    global engine
    if EnergyRAG:
        try:
            print("Initializing EnergyRAG Engine...")
            engine = EnergyRAG()
            print("Engine initialized successfully.")
        except Exception as e:
            print(f"Failed to initialize Engine: {e}")

@app.get("/api/health")
def health_check():
    """System health check and LLM status validation"""
    if not engine:
        return {"status": "backend_degraded", "llm_available": False}
    status = engine.check_llm_status()["msg"]
    kb_count = engine.vs.count() if hasattr(engine, 'vs') else 0
    print(f"INFO: API Health Check - KB Count: {kb_count}")
    return {"status": "ok", "llm": status, "kb_count": kb_count}

@app.get("/api/kpis")
def get_kpis(utility: str = "Alle Sparten"):
    """Fetch global KPIs for the dashboard"""
    if not get_unified_df:
        raise HTTPException(status_code=500, detail="Data utilities not loaded.")
        
    df = get_unified_df() if utility == "Alle Sparten" else get_utility_df(utility)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for {utility}")
    
    kpis = kpi_advanced(df)
    sanitized_kpis = {k: float(v) if isinstance(v, (int, float)) else v for k, v in kpis.items()}
    return sanitized_kpis

class ChatMessage(BaseModel):
    role: str
    content: str
    
class ChatRequest(BaseModel):
    query: str
    utility: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = []

@app.post("/api/chat")
def chat(request: ChatRequest):
    """Core RAG query endpoint"""
    if not engine:
        raise HTTPException(status_code=500, detail="RAG Engine not initialized.")
    
    try:
        req_util = request.utility if request.utility != "Alle Sparten" else None
        response = engine.answer_question(request.query, utility=req_util, history=request.history)
        
        # Safely extract pending_action or download links
        return {
            "answer": response.get("answer", "No answer found."),
            "pending_action": response.get("pending_action", None)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/assets")
def get_assets(utility: str = "Alle Sparten"):
    """Fetch detailed asset list and summaries for charts"""
    if not get_unified_df:
        raise HTTPException(status_code=500, detail="Data utilities not loaded.")
        
    df = get_unified_df() if utility == "Alle Sparten" else get_utility_df(utility)
    if df.empty:
        return {"records": [], "summary": {"age": [], "risk": []}}

    # 1. Summary: Age Groups
    age_bins = [0, 10, 20, 30, 100]
    age_labels = ["0-10 J", "10-20 J", "20-30 J", "30+ J"]
    df['AgeGroup'] = pd.cut(df['Alter'], bins=age_bins, labels=age_labels, right=False)
    age_summary = df.groupby('AgeGroup', observed=True).size().reset_index(name='count')
    age_data = []
    for label in age_labels:
        count = int(age_summary[age_summary['AgeGroup'] == label]['count'].sum())
        age_data.append({"name": label, "value": count})

    # 2. Summary: Risk distribution
    risk_summary = df['Risiko'].value_counts().to_dict()
    risk_data = [
        {"name": "Hoch", "value": int(risk_summary.get("Hoch", 0)), "color": "#ef4444"},
        {"name": "Mittel", "value": int(risk_summary.get("Mittel", 0)), "color": "#f59e0b"},
        {"name": "Niedrig", "value": int(risk_summary.get("Niedrig", 0)), "color": "#22c55e"},
    ]

    # 3. Records for table (last 100 rows)
    records = df.tail(100).to_dict('records')
    clean_records = []
    for r in records:
        # Step-by-step cleaning to ensure JSON compatibility
        row = {}
        for k, v in r.items():
            key = str(k) # Handle non-string keys
            if pd.isna(v):
                row[key] = None
            elif hasattr(v, 'item'): # Handle numpy scalars
                row[key] = v.item()
            elif isinstance(v, (pd.Timestamp, pd.Period)):
                row[key] = str(v)
            else:
                row[key] = v
        clean_records.append(row)

    return {
        "records": clean_records,
        "summary": {
            "age": age_data,
            "risk": risk_data
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("fastapi_server:app", host="127.0.0.1", port=8000, reload=True)

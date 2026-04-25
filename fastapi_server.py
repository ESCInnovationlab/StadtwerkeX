import os
import re as _re
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
import time
import pandas as pd

from logging_config import setup_logging
setup_logging()
logger = logging.getLogger(__name__)

# Handle imports safely to avoid crashing if dependencies are missing during init
try:
    from rag_engine import EnergyRAG
    from geo_utils import get_utility_df, get_unified_df, kpi_advanced, ALL_UTILITIES, load_excel
except Exception as e:
    logger.error("Core imports failed: %s", e)
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
    logger.info("Stadtwerke X Intelligence Platform starting...")
    if EnergyRAG:
        try:
            logger.info("Initializing EnergyRAG Engine...")
            engine = EnergyRAG()
            logger.info("Engine initialized successfully.")
        except Exception as e:
            logger.error("Failed to initialize Engine: %s", e)

@app.get("/api/health")
def health_check():
    """System health check and LLM status validation"""
    if not engine:
        return {"status": "backend_degraded", "llm_available": False}
    status = engine.check_llm_status()["msg"]
    kb_count = engine.vs.count() if hasattr(engine, 'vs') else 0
    logger.info("API Health Check - KB Count: %d", kb_count)
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

@app.get("/api/kpis/detailed")
def get_detailed_kpis(utility: str = "Alle Sparten"):
    if not get_unified_df:
        raise HTTPException(status_code=500, detail="Data utilities not loaded.")

    df = get_unified_df() if utility == "Alle Sparten" else get_utility_df(utility)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for {utility}")

    def safe_int(val):
        try:
            return int(val)
        except:
            return 0

    def safe_float(val):
        try:
            return float(val)
        except:
            return 0.0

    def get_col_df(frame, candidates):
        for col in frame.columns:
            lower = str(col).lower()
            if any(c.lower() in lower for c in candidates):
                return frame[col]
        return pd.Series(dtype=object)

    def yr(v):
        if pd.isna(v):
            return None
        m = _re.search(r'(\d{4})', str(v))
        if m:
            y = int(m.group(1))
            return y if 1900 < y < 2030 else None
        return None

    try:
        raw = load_excel()
    except Exception:
        raw = pd.DataFrame()

    # ── 1. Anschlüsse ─────────────────────────────────────────────────
    total  = len(df)
    wasser = safe_int((df["Sparte"] == "Wasser").sum())
    gas    = safe_int((df["Sparte"] == "Gas").sum())
    avg_age = safe_float(df["Alter"].mean()) if "Alter" in df.columns else 0.0

    druck_col = get_col_df(df, ["druck"])
    gas_md = safe_int(((df["Sparte"] == "Gas") & (druck_col.astype(str).str.contains("MD", case=False, na=False))).sum()) if not druck_col.empty else 0
    gas_nd = safe_int(((df["Sparte"] == "Gas") & (druck_col.astype(str).str.contains("ND", case=False, na=False))).sum()) if not druck_col.empty else 0

    haushalt = buero = industrie = gemeinschaft = schule = hotel = msh = msh_nein = unclassified = 0
    if not raw.empty:
        haushalt     = safe_int(get_col_df(raw, ["haushalt"]).eq("Ja").sum())
        buero        = safe_int(get_col_df(raw, ["büro", "buero"]).eq("Ja").sum())
        industrie    = safe_int(get_col_df(raw, ["industrie"]).eq("Ja").sum())
        gemeinschaft = safe_int(get_col_df(raw, ["gemeinschaft"]).eq("Ja").sum())
        schule       = safe_int(get_col_df(raw, ["schule", "bildung"]).eq("Ja").sum())
        hotel        = safe_int(get_col_df(raw, ["hotel"]).eq("Ja").sum())
        msh_col_raw  = raw.get("Mehrspartenhauseinführung", pd.Series(dtype=object))
        msh          = safe_int((msh_col_raw == "Ja").sum())
        msh_nein     = safe_int((msh_col_raw == "Nein").sum())
        _bt_flags = [
            get_col_df(raw, ["haushalt"]),
            get_col_df(raw, ["büro", "buero"]),
            get_col_df(raw, ["industrie"]),
            get_col_df(raw, ["gemeinschaft"]),
            get_col_df(raw, ["schule", "bildung"]),
            get_col_df(raw, ["hotel"]),
        ]
        _has_type = pd.Series(False, index=raw.index)
        for _c in _bt_flags:
            if not _c.empty:
                _has_type = _has_type | (_c == "Ja")
        unclassified = safe_int((~_has_type).sum())

    # ── 2. Kritisch ───────────────────────────────────────────────────
    hoch        = safe_int((df["Risiko"] == "Hoch").sum())
    wasser_hoch = safe_int(((df["Sparte"] == "Wasser") & (df["Risiko"] == "Hoch")).sum())
    gas_hoch    = safe_int(((df["Sparte"] == "Gas")    & (df["Risiko"] == "Hoch")).sum())
    high_risk_pct = safe_float(100 * hoch / max(total, 1))

    overdue_wasser = overdue_gas = insp_overdue = 0
    if not raw.empty:
        wi_col = "Wasser (Letztes) Inspektionsdatum"
        gi_col = "Gas (Letztes) Inspektionsdatum"
        if wi_col in raw.columns:
            wi = raw[wi_col].apply(yr)
            overdue_wasser = safe_int(((2026 - wi).dropna() > 5).sum())
        if gi_col in raw.columns:
            gi = raw[gi_col].apply(yr)
            overdue_gas = safe_int(((2026 - gi).dropna() > 5).sum())
        insp_overdue = overdue_wasser + overdue_gas

    # ── 3. Über Nutzungsdauer ─────────────────────────────────────────
    over_lifespan = renewal_next_10yr = renewal_next_20yr = 0
    age_gt_80 = age_gt_80_wasser = wasser_over = gas_over = oldest_asset_years = 0
    if not raw.empty:
        w_col = "Wasser Einbaudatum/ Fertigmeldung"
        g_col = "Gas Einbaudatum/ Fertigmeldung"
        wa = raw[w_col].apply(yr).apply(lambda y: 2026 - y if y else None) if w_col in raw.columns else pd.Series(dtype=float)
        ga = raw[g_col].apply(yr).apply(lambda y: 2026 - y if y else None) if g_col in raw.columns else pd.Series(dtype=float)
        wa_v = wa.dropna()
        ga_v = ga.dropna()

        wasser_over   = safe_int((wa_v > 64).sum())
        gas_over      = safe_int((ga_v > 64).sum())
        over_lifespan = wasser_over + gas_over

        age_gt_80        = safe_int((wa_v > 80).sum()) + safe_int((ga_v > 80).sum())
        age_gt_80_wasser = safe_int((wa_v > 80).sum())

        renewal_next_10yr = safe_int(((wa_v > 54) & (wa_v <= 64)).sum()) + safe_int(((ga_v > 54) & (ga_v <= 64)).sum())
        renewal_next_20yr = safe_int(((wa_v > 44) & (wa_v <= 64)).sum()) + safe_int(((ga_v > 44) & (ga_v <= 64)).sum())

        all_ages = pd.concat([wa_v, ga_v])
        oldest_asset_years = safe_int(all_ages.max()) if not all_ages.empty else 0

    # ── 4. Materialrisiko ─────────────────────────────────────────────
    werkstoff_col   = get_col_df(df, ["werkstoff"])
    az_count        = safe_int((werkstoff_col == "Asbestzement-(AZ)").sum()) if not werkstoff_col.empty else 0
    stahl_no_kks    = safe_int((werkstoff_col == "Stahl ohne KKS").sum()) if not werkstoff_col.empty else 0
    critical_material = az_count + stahl_no_kks
    schutzrohr_col  = get_col_df(df, ["schutzrohr"])
    schutzrohr_nein = safe_int(((df["Sparte"] == "Wasser") & (schutzrohr_col == "Nein")).sum()) if not schutzrohr_col.empty else 0

    return {
        "anschluesse": {
            "total": total, "wasser": wasser, "gas": gas, "avg_age": avg_age,
            "haushalt": haushalt, "buero": buero, "industrie": industrie,
            "gemeinschaft": gemeinschaft, "schule": schule, "hotel": hotel,
            "unclassified": unclassified,
            "msh": msh, "msh_nein": msh_nein, "gas_md": gas_md, "gas_nd": gas_nd,
        },
        "kritisch": {
            "hoch_risiko": hoch, "wasser_kritisch": wasser_hoch,
            "gas_kritisch": gas_hoch, "high_risk_pct": high_risk_pct,
            "inspection_overdue": insp_overdue,
            "overdue_wasser": overdue_wasser, "overdue_gas": overdue_gas,
        },
        "ueber_nutzungsdauer": {
            "over_lifespan": over_lifespan, "renewal_next_10yr": renewal_next_10yr,
            "renewal_next_20yr": renewal_next_20yr, "age_gt_80": age_gt_80,
            "age_gt_80_wasser": age_gt_80_wasser, "wasser_over": wasser_over,
            "gas_over": gas_over, "oldest_asset_years": oldest_asset_years,
        },
        "modernisierung": {
            "critical_material": critical_material, "az_leitungen": az_count,
            "stahl_ohne_kks": stahl_no_kks, "schutzrohr_nein": schutzrohr_nein,
            "msh_nein": msh_nein,
        },
    }

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

@app.get("/api/map-explorer")
def get_map_explorer(utility: str = "Alle Sparten"):
    """Fetch all asset records for the Map Explorer page"""
    if not get_unified_df:
        raise HTTPException(status_code=500, detail="Data utilities not loaded.")

    df = get_unified_df() if utility == "Alle Sparten" else get_utility_df(utility)
    if df.empty:
        return {"records": []}

    CURRENT_YEAR = 2026
    clean_records = []
    for r in df.to_dict('records'):
        row = {}
        for k, v in r.items():
            key = str(k)
            try:
                is_na = pd.isna(v)
            except Exception:
                is_na = False
            if is_na:
                row[key] = None
            elif hasattr(v, 'item'):
                row[key] = v.item()
            elif isinstance(v, (pd.Timestamp, pd.Period)):
                row[key] = str(v)
            else:
                row[key] = v
        renewal = row.get("Erneuerung_empfohlen_bis")
        row["over_lifespan"] = bool(renewal is not None and renewal < CURRENT_YEAR)
        clean_records.append(row)

    return {"records": clean_records}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("fastapi_server:app", host="127.0.0.1", port=8000, reload=True)

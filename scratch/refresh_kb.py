import os
import shutil
import pandas as pd
from rag_engine import EnergyRAG
from geo_utils import get_unified_df

def refresh_kb():
    print("START: Initializing EnergyRAG and performing soft reset...")
    # Initialize Engine
    engine = EnergyRAG()
    
    # Use internal API to reset collection (safe while chroma is locked)
    count = engine.init_or_refresh_kb(reset=True)
    
    print(f"SUCCESS: Re-indexing complete. {count} records indexed.")
    
    # Simple check
    print("QUERY TEST: 'Wie viele Anschluesse haben wir?'")
    resp = engine.answer_question("Wie viele Anschluesse haben wir?")
    print(f"BOT RESPONSE: {resp['answer']}")

if __name__ == "__main__":
    refresh_kb()

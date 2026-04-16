import os
import sys
import pandas as pd
from rag_engine import EnergyRAG

def verify():
    print("--- AI Brain Verification ---")
    engine = EnergyRAG()
    
    kb_count = engine.vs.count()
    print(f"Knowledge Base Count: {kb_count}")
    
    if engine.unified_df is not None:
        df_count = len(engine.unified_df)
        print(f"Engine DataFrame Count: {df_count}")
    else:
        print("Engine DataFrame is EMPTY!")
        
    print("\nQuery: 'Wie viele Gasanschl\u00fcsse haben wir?'")
    resp = engine.answer_question("Wie viele Gasanschl\u00fcsse haben wir?")
    print(f"BOT Result: {resp['answer']}")
    
    print("\nQuery: 'Welche Adresse hat Kundennummer 11?'")
    resp = engine.answer_question("Welche Adresse hat Kundennummer 11?")
    print(f"BOT Result: {resp['answer']}")

if __name__ == "__main__":
    verify()

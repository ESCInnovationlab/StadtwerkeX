from rag_engine import EnergyRAG
import os

print("Initializing indexing...")
engine = EnergyRAG()
count = engine.init_or_refresh_kb(reset=True)
print(f"Indexing complete. {count} items added to knowledge base.")

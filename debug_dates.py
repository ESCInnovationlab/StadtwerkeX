import pandas as pd
raw = pd.read_excel("excel_data/Hausanschluss_data.xlsx", header=[0, 1])
util_col = "Daten zum Netzanschluss Wasser"
section = raw.xs(util_col, axis=1, level=0)
date_col = [c for c in section.columns if "Einbaudatum" in c][0]
print(f"Date column head:\n{section[date_col].head(10)}")
print(f"Types: {section[date_col].map(type).unique()}")

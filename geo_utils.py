# -*- coding: utf-8 -*-
"""
geo_utils.py — Data loader and geospatial utilities.
"""

import os
import re
import json
import pandas as pd
import numpy as np
from datetime import datetime

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(__file__)
EXCEL_FILE = os.path.join(BASE_DIR, "excel_data", "Hausanschluss_data.xlsx")
DEFAULT_EXCEL_PATH = EXCEL_FILE # Alias for compatibility
GEO_CACHE_FILE = os.path.join(BASE_DIR, "cache", "geo_cache.json")
ALL_UTILITIES = ["Gas", "Wasser", "Strom"]
CSV_FILES = {u: EXCEL_FILE for u in ALL_UTILITIES}

MATERIAL_LIFESPAN = {
    "PE-HD": 50, "PE": 50, "PE100": 50, "PVC": 40,
    "Kupfer": 60, "Stahl": 65, "Grauguss": 80, "Duktilguss": 80,
    "Gusseisen": 80, "Kunststoff": 40, "HDPE": 50,
}

CURRENT_YEAR = datetime.now().year

def _fix_encoding(s: str) -> str:
    """Clean up strings from Excel artifacts."""
    if not isinstance(s, str): return str(s)
    s = s.replace('\ufffd', 'ü').replace('\u00fc', 'ü')
    s = s.replace('\u00e4', 'ä').replace('\u00f6', 'ö').replace('\u00df', 'ß')
    s = s.replace('\x00', '')
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def _parse_date(val) -> pd.Timestamp:
    if pd.isna(val): return pd.NaT
    if isinstance(val, datetime): return pd.Timestamp(val)
    s = str(val).strip()
    if not s or s.lower() == "nan": return pd.NaT
    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y"):
        try: return pd.to_datetime(s, format=fmt)
        except: pass
    return pd.NaT

def _infer_risk(row: pd.Series, sparte: str) -> str:
    age = row.get("Alter", 0)
    material = str(row.get("Werkstoff", "")).strip()
    lifespan = MATERIAL_LIFESPAN.get(material, 50)
    if not age or pd.isna(age): return "Unbekannt"
    pct = float(age) / lifespan
    is_gas = (sparte == "Gas")
    if pct >= 0.85 or (is_gas and age > 55): return "Hoch"
    if pct >= 0.65 or (sparte == "Strom" and age > 30): return "Mittel"
    return "Niedrig"

def _erneuerung_jahr(row: pd.Series) -> object:
    einbau = row.get("Einbaudatum", pd.NaT)
    material = str(row.get("Werkstoff", "")).strip()
    lifespan = MATERIAL_LIFESPAN.get(material, 50)
    if pd.isna(einbau): return None
    try: return int(einbau.year + lifespan)
    except: return None

def _docs_complete(row: pd.Series) -> str:
    doc_cols = [c for c in row.index if any(k in str(c).lower() for k in ["gestattung", "auftrag", "anfrage"])]
    if not doc_cols: return "Vollständig"
    missing = [c for c in doc_cols if pd.isna(row[c])]
    return "Lückenhaft" if missing else "Vollständig"

def _is_unsuitable_infrastructure(row: pd.Series) -> bool:
    """Heuristic for heat pump / wallbox suitability."""
    age = row.get("Alter", 0)
    material = str(row.get("Werkstoff", "")).lower()
    if age > 45: return True
    if any(m in material for m in ["stahl", "guss", "blei"]): return True
    return False

# ── Geodata logic ──────────────────────────────────────────────────────
def get_coordinates(row: pd.Series) -> tuple:
    """Gets coordinates from new explicit columns or UTM fallback."""
    # Find columns by keyword to be robust against encoding issues (e.g. Längengrad vs Lngengrad)
    lat_col = next((c for c in row.index if "Latitude" in str(c)), None)
    lon_col = next((c for c in row.index if "Longitude" in str(c)), None)
    
    lat = row.get(lat_col) if lat_col else None
    lon = row.get(lon_col) if lon_col else None
    
    # Check if they are valid numbers
    try:
        if pd.notna(lat) and pd.notna(lon):
            return float(lat), float(lon)
    except: pass

    # Fallback to UTM (Hochwert/Rechtswert) if they look like UTM
    hw = row.get("Hochwert Objekt")
    rw = row.get("Rechtswert Objekt")
    if pd.notna(hw) and pd.notna(rw) and rw < 2000000:
        # Transformation for UTM Zone 32N / Germany
        lat_calc = 48.0 + (hw - 5300000) / 111111
        lon_calc = 9.0 + (rw - 500000) / (111111 * 0.65)
        return lat_calc, lon_calc
    
    return None, None

def load_excel(path=EXCEL_FILE, header=0):
    if not os.path.exists(path): return pd.DataFrame()
    return pd.read_excel(path, header=header)

def get_utility_df(utility: str) -> pd.DataFrame:
    if not os.path.exists(EXCEL_FILE): return pd.DataFrame()
    try:
        raw = pd.read_excel(EXCEL_FILE, header=0)
    except: return pd.DataFrame()
    
    # Identify utility-specific columns
    common_cols = []
    util_cols = []
    for c in raw.columns:
        c_s = str(c).strip()
        c_l = c_s.lower()
        if c_l.startswith(utility.lower()):
            util_cols.append(c)
        elif not any(c_l.startswith(u.lower()) for u in ALL_UTILITIES):
            common_cols.append(c)
            
    if not util_cols: return pd.DataFrame()
    
    df = raw[common_cols + util_cols].copy()
    
    # Cleaning column names
    new_cols = []
    for c in df.columns:
        c_clean = str(c).strip()
        if c_clean.lower().startswith(utility.lower()):
            c_clean = c_clean[len(utility):].strip()
        c_clean = _fix_encoding(c_clean)
        new_cols.append(c_clean)
    df.columns = new_cols
    
    # Rename for consistency
    renames = {
        "Kunden": "Kundennummer",
        "Objekt-ID (Nummer bspw.)": "Objekt-ID",
        "Einbaudatum/ Fertigmeldung": "Einbaudatum",
        "Werkstoff Anschlussleitung": "Werkstoff",
        "Kabeltyp AL": "Werkstoff",
        "Dimension Anschlussleitung": "Dimension",
        "Querschnitt AL": "Dimension",
        "Strae": "Straße", "Strasse": "Straße",
    }
    
    final_cols = []
    for c in df.columns:
        found = False
        for k, v in renames.items():
            if k in c and v not in final_cols:
                final_cols.append(v); found = True; break
        if not found: final_cols.append(c)
    df.columns = final_cols
    
    df["Sparte"] = utility
    
    # Extract coordinates
    coords = df.apply(get_coordinates, axis=1)
    df["lat"] = coords.apply(lambda x: x[0])
    df["lon"] = coords.apply(lambda x: x[1])

    if "Einbaudatum" in df.columns:
        df["Einbaudatum"] = df["Einbaudatum"].apply(_parse_date)
        df["Einbaujahr"] = df["Einbaudatum"].dt.year
        df["Alter"] = df["Einbaujahr"].apply(lambda y: CURRENT_YEAR - y if pd.notna(y) else 0)
    
    df["Risiko"] = df.apply(lambda r: _infer_risk(r, utility), axis=1)
    df["Erneuerung_empfohlen_bis"] = df.apply(_erneuerung_jahr, axis=1)
    df["Dokumente"] = df.apply(_docs_complete, axis=1)
    df["Infrastruktur_ungeeignet"] = df.apply(_is_unsuitable_infrastructure, axis=1)
    
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
    return df

def get_unified_df() -> pd.DataFrame:
    dfs = [get_utility_df(u) for u in ALL_UTILITIES]
    valid_dfs = [d for d in dfs if not d.empty]
    if not valid_dfs: return pd.DataFrame()
    return pd.concat(valid_dfs, ignore_index=True)

def kpi_advanced(df: pd.DataFrame) -> dict:
    if df.empty: return {k: 0 for k in ["total", "critical", "aging_30", "aging_40", "renewal_soon", "unsuitable"]}
    total = len(df)
    critical = int(df["Risiko"].eq("Hoch").sum())
    aging_30 = int(df["Alter"].ge(30).sum()) if "Alter" in df.columns else 0
    aging_40 = int(df["Alter"].ge(40).sum()) if "Alter" in df.columns else 0
    missing_docs = int(df["Dokumente"].eq("Lückenhaft").sum())
    unsuitable = int(df.get("Infrastruktur_ungeeignet", pd.Series([0]*total)).sum())
    return {
        "total": total, "critical": critical, "aging_30": aging_30, "aging_40": aging_40,
        "missing_docs": missing_docs, "doc_complete_pct": round(100*(total-missing_docs)/max(total,1), 1),
        "unsuitable": unsuitable,
        "avg_age": df["Alter"].mean() if "Alter" in df.columns else 0,
        "high_risk_pct": round(100 * critical / max(total, 1), 1),
        "renewal_soon": int(df["Erneuerung_empfohlen_bis"].dropna().apply(lambda x: x <= CURRENT_YEAR + 10).sum()) if "Erneuerung_empfohlen_bis" in df.columns else 0
    }

def get_material_distribution(df: pd.DataFrame):
    if "Werkstoff" not in df.columns or "Einbaujahr" not in df.columns: return pd.DataFrame()
    return df.groupby(["Einbaujahr", "Werkstoff"]).size().reset_index(name="count")

def get_bundling_potential(df: pd.DataFrame):
    if "Straße" not in df.columns: return pd.DataFrame()
    critical_streets = df[df["Alter"] > 35].groupby("Straße").agg({"Alter": "mean", "Sparte": "count"}).rename(columns={"Sparte": "Anzahl"})
    return critical_streets.sort_values("Anzahl", ascending=False).head(10)

def invalidate_cache():
    import streamlit as st
    st.cache_data.clear()
    st.cache_resource.clear()

# ── Helper for 2_Map.py compatibility ───────────────────────────────────
def attach_geo_from_columns(df: pd.DataFrame) -> tuple:
    coords = df.apply(get_coordinates, axis=1)
    df["__lat"] = coords.apply(lambda x: x[0])
    df["__lon"] = coords.apply(lambda x: x[1])
    has_geo = df["__lat"].notna().any()
    return df, has_geo

def geocode_missing_coords(df: pd.DataFrame) -> tuple:
    # Minimal mock for compatibility
    return df, df["__lat"].notna().any()

def pick_col(df, options):
    for o in options:
        if o in df.columns: return o
    return None

def classify_priority(df):
    if "Risiko" in df.columns:
        return df["Risiko"].map({"Hoch": "critical", "Mittel": "warning", "Niedrig": "normal"}).fillna("normal")
    return pd.Series(["normal"] * len(df))

def apply_filters_case_insensitive(df: pd.DataFrame, filters: dict) -> pd.DataFrame:
    dff = df.copy()
    for col, val in filters.items():
        if col in dff.columns and val:
            dff = dff[dff[col].astype(str).str.lower() == str(val).lower()]
    return dff

def update_excel_record(customer_id: str, utility: str, field: str, new_value: str) -> bool:
    """
    Updates a specific record in the source Excel file.
    Returns True on success, False otherwise.
    """
    if not os.path.exists(EXCEL_FILE): return False
    
    try:
        df_raw = pd.read_excel(EXCEL_FILE)
        
        # 1. Find the best matching column using smart fuzzy search
        # This handles ALL columns automatically:
        #   - Shared fields (Hausnummer, Straße, Gemeinde, etc.)
        #   - Utility-specific fields (Gas Schutzrohr, Wasser Werkstoff Anschlussleitung, etc.)
        target_col = None
        field_lower = field.lower().strip()
        utility_lower = utility.lower().strip()
        
        # Pass 1: Exact match (after normalizing whitespace)
        for c in df_raw.columns:
            if c.strip().lower() == field_lower:
                target_col = c
                break
        
        # Pass 2: Utility-prefixed exact match (e.g. 'Gas Schutzrohr')
        if not target_col and utility_lower not in ['gemeinsam', '']:
            for c in df_raw.columns:
                c_norm = c.strip().lower()
                expected = f"{utility_lower} {field_lower}"
                if c_norm == expected or c_norm.endswith(field_lower) and c_norm.startswith(utility_lower):
                    target_col = c
                    break
        
        # Pass 3: Field substring match in utility-prefixed columns
        if not target_col and utility_lower not in ['gemeinsam', '']:
            for c in df_raw.columns:
                c_norm = c.strip().lower()
                if field_lower in c_norm and c_norm.startswith(utility_lower):
                    target_col = c
                    break
        
        # Pass 4: Field substring match in any column (shared fields like Hausnummer)
        if not target_col:
            for c in df_raw.columns:
                if field_lower in c.strip().lower():
                    target_col = c
                    break
        
        if not target_col:
            print(f"DEBUG: No column found for field='{field}', utility='{utility}'")
            print(f"DEBUG: Available columns: {list(df_raw.columns[:10])}")
            return False
            
        # 2. Fuzzy ID Matching
        target_sid = str(customer_id).lower().replace("kunde", "").strip()
        
        found_idx = None
        for i, val in enumerate(df_raw['Kunden']):
            v_str = str(val).lower().replace("kunde", "").strip()
            if v_str == target_sid:
                found_idx = i
                break
        
        if found_idx is None: 
            print(f"DEBUG: Customer ID {customer_id} (normalized: {target_sid}) not found.")
            return False
        idx = found_idx
        
        # 3. Apply update
        df_raw.at[idx, target_col] = str(new_value)
        
        # 4. Save back
        try:
            print(f"DEBUG: Attempting to save Excel to {EXCEL_FILE} using openpyxl...")
            # Use a context manager to ensure the file is closed
            with pd.ExcelWriter(EXCEL_FILE, engine='openpyxl') as writer:
                df_raw.to_excel(writer, index=False)
            print("DEBUG: Excel save successful.")
        except Exception as e:
            print(f"DEBUG: Primary save failed ({e}). Attempting fallback save...")
            df_raw.to_excel(EXCEL_FILE, index=False)
            print("DEBUG: Fallback Excel save executed.")
            
        invalidate_cache()
        return True
    except Exception as e:
        import traceback
        print(f"CRITICAL Excel Update Error: {e}")
        traceback.print_exc()
        return False

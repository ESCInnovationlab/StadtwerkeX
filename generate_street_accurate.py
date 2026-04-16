"""
generate_street_accurate.py

CORRECT architecture:
  1. Snap every house to its nearest ROAD point via OSRM /nearest  (parallel, fast)
  2. Build ONE MST backbone per utility on those road-snapped hub-points
     → hub points are ON streets, so the MST edges follow the street network
  3. Each MST edge is the Main Pipeline segment
  4. Each house gets ONE Lateral: house -> its road-snapped hub
  5. Each hub becomes a Connection Hub marker

Result: Main pipeline stays on streets, laterals are short perpendiculars from
        the house door to the street edge.
"""
import os, json, sys
import numpy as np
import pandas as pd
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from scipy.spatial.distance import pdist, squareform
from scipy.sparse.csgraph import minimum_spanning_tree
import geo_utils

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
OUT_FILE   = os.path.join(BASE_DIR, "frontend", "public", "data", "utility_networks.geojson")
UTILITIES  = ["Gas", "Wasser"]
MAX_WORKERS = 20          # parallel OSRM calls
OSRM_BASE  = "http://router.project-osrm.org"
OFFSET     = {"Gas": 0.000020, "Wasser": -0.000020}   # keep lines side-by-side on street

# Supply stations
STATIONS = [
    {"name": "Hammerstein",   "lat": 51.2880, "lon": 7.0550},
    {"name": "Kocherscheidt", "lat": 51.2810, "lon": 7.0450},
    {"name": "Rohdenhaus",    "lat": 51.2950, "lon": 7.0600},
]


# ── helpers ──────────────────────────────────────────────────────────────────

def osrm_nearest(lon, lat, n=1):
    """Return road-snapped [lon, lat] closest to the given point."""
    try:
        r = requests.get(
            f"{OSRM_BASE}/nearest/v1/driving/{lon},{lat}?number={n}",
            timeout=4)
        if r.status_code == 200:
            d = r.json()
            if d.get("code") == "Ok":
                return d["waypoints"][0]["location"]   # [lon, lat]
    except Exception:
        pass
    return [lon, lat]   # fallback: use original point


def snap_houses_parallel(house_list):
    """
    house_list: list of dicts with keys lon, lat (+ pass-through keys)
    Returns same list with an extra key 'hub' = road-snapped [lon, lat]
    """
    results = [None] * len(house_list)

    def _snap(idx, h):
        hub = osrm_nearest(h["lon"], h["lat"])
        return idx, hub

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(_snap, i, h): i for i, h in enumerate(house_list)}
        done = 0
        total = len(house_list)
        for f in as_completed(futures):
            idx, hub = f.result()
            results[idx] = hub
            done += 1
            if done % 100 == 0 or done == total:
                print(f"    snapped {done}/{total}", end="\r", flush=True)
    print()
    return results


def offset_pt(pt, perp, d):
    return [pt[0] + perp[0] * d, pt[1] + perp[1] * d]


def apply_offset_to_hub(hub, off):
    """Shift hub slightly perpendicular so Gas/Wasser don't overlap."""
    if off == 0:
        return hub
    # simple east-west nudge (good enough at street scale)
    return [hub[0] + off, hub[1]]


def build_mst(points):
    arr = np.array(points)
    mst = minimum_spanning_tree(squareform(pdist(arr)))
    cx  = mst.tocoo()
    return list(zip(cx.row.tolist(), cx.col.tolist()))


def route_via_osrm(p1, p2):
    """Get a street-following polyline between two road points."""
    try:
        coords = f"{p1[0]},{p1[1]};{p2[0]},{p2[1]}"
        r = requests.get(
            f"{OSRM_BASE}/route/v1/driving/{coords}?overview=full&geometries=geojson",
            timeout=5)
        if r.status_code == 200:
            d = r.json()
            if d.get("code") == "Ok":
                return d["routes"][0]["geometry"]["coordinates"]
    except Exception:
        pass
    return [p1, p2]


# ── main generator ────────────────────────────────────────────────────────────

def create_features(utility):
    print(f"\n[{utility}] Loading data...")
    df = geo_utils.get_utility_df(utility).dropna(subset=["lat", "lon"]).reset_index(drop=True)
    if df.empty:
        print(f"  No data.")
        return []

    # Prepare house list
    houses = []
    for _, row in df.iterrows():
        houses.append({
            "lon":         float(row["lon"]),
            "lat":         float(row["lat"]),
            "risiko":      str(row.get("Risiko", "N/A")),
            "material":    str(row.get("Werkstoff", "N/A")),
            "dimension":   str(row.get("Dimension", "N/A")),
            "Kundenname":  str(row.get("Kundenname", "")),
            "Kundennummer":str(row.get("Kundennummer", "")),
        })

    off = OFFSET.get(utility, 0)
    print(f"[{utility}] Snapping {len(houses)} houses to nearest road...")
    hubs_raw = snap_houses_parallel(houses)

    # Apply offset so Gas and Wasser sit side-by-side on the street
    hubs = [apply_offset_to_hub(h, off) for h in hubs_raw]

    features = []

    # ── Build ONE interconnected main pipeline via MST of hubs ──────────────
    print(f"[{utility}] Building MST backbone ({len(hubs)} nodes)...")
    edges = build_mst(hubs)

    print(f"[{utility}] Routing {len(edges)} MST edges via OSRM (parallel)...")

    def _route_edge(e):
        i, j = e
        return i, j, route_via_osrm(hubs[i], hubs[j])

    routed = {}
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futs = {ex.submit(_route_edge, e): e for e in edges}
        done = 0
        for f in as_completed(futs):
            i, j, coords = f.result()
            routed[(i, j)] = coords
            done += 1
            if done % 50 == 0 or done == len(edges):
                print(f"    routed {done}/{len(edges)}", end="\r", flush=True)
    print()

    # Emit Main Pipe features
    for (i, j), coords in routed.items():
        features.append({
            "type": "Feature",
            "properties": {
                "utility":  utility,
                "type":     "Main Pipe",
                "network":  "Stadtnetz",
                "risiko":   "N/A",
                "material": "PE-HD" if utility == "Gas" else "GG",
                "dimension":"DN 150",
            },
            "geometry": {"type": "LineString", "coordinates": coords},
        })

    # ── Laterals + Connection Hubs per house ────────────────────────────────
    for idx, (house, hub) in enumerate(zip(houses, hubs)):
        base = {
            "utility":      utility,
            "network":      "Stadtnetz",
            "risiko":       house["risiko"],
            "material":     house["material"],
            "dimension":    house["dimension"],
            "Kundenname":   house["Kundenname"],
            "Kundennummer": house["Kundennummer"],
        }

        # Lateral: house -> hub (short perpendicular to street)
        features.append({
            "type": "Feature",
            "properties": {**base, "type": "Lateral"},
            "geometry": {"type": "LineString", "coordinates": [hub, [house["lon"], house["lat"]]]},
        })

        # Connection Hub marker (the box icon ON the street)
        features.append({
            "type": "Feature",
            "properties": {**base, "type": "Connection Hub"},
            "geometry": {"type": "Point", "coordinates": hub},
        })

    print(f"[{utility}] Done: {len(features)} features")
    return features


def main():
    print("=== Street-Accurate Infrastructure Generator ===")
    all_features = []
    for util in UTILITIES:
        try:
            all_features.extend(create_features(util))
        except Exception as e:
            import traceback
            print(f"ERROR for {util}: {e}")
            traceback.print_exc()

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": all_features}, f,
                  ensure_ascii=False)   # no indent = smaller file / faster load
    print(f"\nWrote {len(all_features)} features to {OUT_FILE}")


if __name__ == "__main__":
    main()

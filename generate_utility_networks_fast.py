"""
generate_utility_networks_fast.py
Fast offline generator: Uses MST backbone to chain houses into a network,
perpendicular-projects houses to find their connection point on the main pipe.
No OSRM calls needed — pure Python. Runs in seconds not minutes.
"""
import pandas as pd
import numpy as np
import json
import os
from scipy.spatial.distance import pdist, squareform
from scipy.sparse.csgraph import minimum_spanning_tree
import geo_utils

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GEOJSON_FILE = os.path.join(BASE_DIR, "frontend", "public", "data", "utility_networks.geojson")

# Supply stations
STATIONS = {
    "Stadtnetz": [
        {"name": "Hammerstein",   "lat": 51.2880, "lon": 7.0550},
        {"name": "Kocherscheidt", "lat": 51.2810, "lon": 7.0450},
    ],
    "Ortsteilnetz": [
        {"name": "Rohdenhaus", "lat": 51.2950, "lon": 7.0600},
    ],
}

UTILITIES = ["Gas", "Wasser"]

# Perpendicular offset so Gas and Wasser don't sit exactly on top of each other
OFFSET = {"Gas": 0.000025, "Wasser": -0.000025}


def project_point_to_segment(pt, v, w):
    """Return the closest point on segment v-w to point pt."""
    v, w, pt = np.array(v), np.array(w), np.array(pt)
    l2 = np.dot(w - v, w - v)
    if l2 < 1e-15:
        return v
    t = max(0.0, min(1.0, np.dot(pt - v, w - v) / l2))
    return v + t * (w - v)


def build_mst_edges(points):
    """Return (i, j) pairs forming the Minimum Spanning Tree."""
    arr = np.array(points)
    mst = minimum_spanning_tree(squareform(pdist(arr)))
    cx = mst.tocoo()
    return list(zip(cx.row.tolist(), cx.col.tolist()))


def offset_coords(coords, d):
    """Shift a polyline perpendicularly by d degrees."""
    if d == 0 or len(coords) < 2:
        return coords
    out = []
    for i, pt in enumerate(coords):
        if i == 0:
            a, b = np.array(coords[0]), np.array(coords[1])
        elif i == len(coords) - 1:
            a, b = np.array(coords[-2]), np.array(coords[-1])
        else:
            a, b = np.array(coords[i - 1]), np.array(coords[i + 1])
        direction = b - a
        norm = np.linalg.norm(direction)
        if norm < 1e-12:
            out.append(pt)
            continue
        perp = np.array([-direction[1], direction[0]]) / norm
        out.append((np.array(pt) + perp * d).tolist())
    return out


def create_features_for_utility(utility):
    print(f"  Building network for {utility}...")
    df = geo_utils.get_utility_df(utility).dropna(subset=["lat", "lon"]).reset_index(drop=True)
    if df.empty:
        print(f"    No data for {utility}")
        return []

    all_stations = [s for zone_list in STATIONS.values() for s in zone_list]
    off = OFFSET.get(utility, 0)

    features = []

    # Assign each house to its closest station zone
    def zone_of(h_lat, h_lon):
        best = min(all_stations,
                   key=lambda s: (h_lat - s["lat"]) ** 2 + (h_lon - s["lon"]) ** 2)
        for zone, stations in STATIONS.items():
            if best in stations:
                return zone, best
        return "Stadtnetz", all_stations[0]

    for zone_name, zone_stations in STATIONS.items():
        # Gather houses in this zone
        zone_rows = []
        for _, row in df.iterrows():
            z, _ = zone_of(float(row["lat"]), float(row["lon"]))
            if z == zone_name:
                zone_rows.append(row)

        if not zone_rows:
            continue

        # Build point list: stations first, then houses
        station_pts = [[s["lon"], s["lat"]] for s in zone_stations]
        house_pts   = [[float(r["lon"]), float(r["lat"])] for r in zone_rows]
        all_pts     = station_pts + house_pts
        n_stations  = len(station_pts)

        if len(all_pts) < 2:
            continue

        # MST over all nodes (stations + houses) gives us the backbone
        edges = build_mst_edges(all_pts)

        # Collect only station-to-station or station-chain edges as "Main Pipe" backbone
        # Any edge touching a house node is the lateral part
        main_pipe_edges = []   # edges between two non-house nodes or skeleton
        lateral_edges   = []   # edges touching a house

        # We'll treat EVERY edge as main pipe (the MST IS the main pipe network)
        # and then project each house perpendicularly onto the nearest main pipe segment
        # to get a clean connection hub.

        # Step 1: Collect all main-pipe segments (the MST backbone — ALL edges)
        backbone_segs = []
        for i, j in edges:
            seg = [all_pts[i], all_pts[j]]
            backbone_segs.append(seg)

        # Step 2: Offset the entire backbone
        all_backbone_coords = []
        for seg in backbone_segs:
            off_seg = offset_coords(seg, off)
            all_backbone_coords.append(off_seg)
            props = {
                "utility": utility,
                "network": zone_name,
                "type": "Main Pipe",
                "risiko": "N/A",
                "material": "PE-HD" if utility == "Gas" else "GG",
                "dimension": "DN 150" if utility == "Gas" else "DN 150",
            }
            features.append({
                "type": "Feature",
                "properties": props,
                "geometry": {"type": "LineString", "coordinates": off_seg},
            })

        # Step 3: For each house, find its closest point on any backbone segment
        for idx, row in enumerate(zone_rows):
            h_lon, h_lat = float(row["lon"]), float(row["lat"])
            house_pt = [h_lon, h_lat]
            risk = str(row.get("Risiko", "N/A"))

            best_dist = float("inf")
            best_hub  = house_pt

            for off_seg in all_backbone_coords:
                for k in range(len(off_seg) - 1):
                    proj = project_point_to_segment(house_pt, off_seg[k], off_seg[k + 1])
                    d = (house_pt[0] - proj[0]) ** 2 + (house_pt[1] - proj[1]) ** 2
                    if d < best_dist:
                        best_dist = d
                        best_hub  = proj.tolist()

            lat_props = {
                "utility": utility,
                "network": zone_name,
                "type": "Lateral",
                "risiko": risk,
                "material": "PE-HD" if utility == "Gas" else "PE",
                "dimension": "DN 40"  if utility == "Gas" else "DN 32",
            }
            # Lateral: house → hub
            features.append({
                "type": "Feature",
                "properties": lat_props,
                "geometry": {"type": "LineString", "coordinates": [best_hub, house_pt]},
            })

            # Connection Hub (box on the main pipe)
            hub_props = {**lat_props, "type": "Connection Hub",
                         "Kundenname": str(row.get("Kundenname", "")),
                         "Kundennummer": str(row.get("Kundennummer", ""))}
            features.append({
                "type": "Feature",
                "properties": hub_props,
                "geometry": {"type": "Point", "coordinates": best_hub},
            })

        print(f"    {zone_name}: {len(zone_rows)} connections done")

    return features


def main():
    print("=== Fast Offline Infrastructure Generator ===")
    all_features = []
    for util in UTILITIES:
        try:
            all_features.extend(create_features_for_utility(util))
        except Exception as exc:
            print(f"  ERROR for {util}: {exc}")

    os.makedirs(os.path.dirname(GEOJSON_FILE), exist_ok=True)
    with open(GEOJSON_FILE, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": all_features}, f,
                  ensure_ascii=False, indent=2)
    print(f"\nDone -- {len(all_features)} features written to {GEOJSON_FILE}")


if __name__ == "__main__":
    main()

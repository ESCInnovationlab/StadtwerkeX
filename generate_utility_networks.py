import pandas as pd
import numpy as np
import json
import os
import requests
import time
from scipy.spatial.distance import pdist, squareform
from scipy.sparse.csgraph import minimum_spanning_tree
import geo_utils

# File paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GEOJSON_FILE = os.path.join(BASE_DIR, "frontend", "public", "data", "utility_networks.geojson")

# Define the supply points for all utilities
STATIONS = {
    "Stadtnetz": [
        {"name": "Hammerstein", "lat": 51.2880, "lon": 7.0550},
        {"name": "Kocherscheidt", "lat": 51.2810, "lon": 7.0450}
    ],
    "Ortsteilnetz": [
        {"name": "Rohdenhaus", "lat": 51.2950, "lon": 7.0600}
    ]
}

UTILITIES = ["Gas", "Wasser"]

def get_osrm_route(p1, p2):
    """Get a detailed road route between p1 and p2 using OSRM."""
    coords_str = f"{p1[0]},{p1[1]};{p2[0]},{p2[1]}"
    url = f"http://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("code") == "Ok":
                return data["routes"][0]["geometry"]["coordinates"]
    except: pass
    return [p1, p2]

def get_osrm_nearest(pt):
    """Snap a point to the nearest road vertex using OSRM."""
    url = f"http://router.project-osrm.org/nearest/v1/driving/{pt[0]},{pt[1]}?number=1"
    try:
        response = requests.get(url, timeout=3)
        if response.status_code == 200:
            data = response.json()
            if data.get("code") == "Ok":
                return data["waypoints"][0]["location"]
    except: pass
    return pt

def offset_polyline(coords, offset_dist):
    if offset_dist == 0 or len(coords) < 2: return coords
    new_coords = []
    for i in range(len(coords)):
        if i == 0: v1, v2 = np.array(coords[i]), np.array(coords[i+1])
        elif i == len(coords)-1: v1, v2 = np.array(coords[i-1]), np.array(coords[i])
        else: v1, v2 = np.array(coords[i-1]), np.array(coords[i+1])
        direction = v2 - v1
        dist = np.linalg.norm(direction)
        if dist == 0: new_coords.append(coords[i]); continue
        perp = np.array([-direction[1], direction[0]]) / dist
        new_coords.append((np.array(coords[i]) + perp * offset_dist).tolist())
    return new_coords

def create_utility_features(utility):
    print(f"Generating optimized network for: {utility}")
    df = geo_utils.get_utility_df(utility).dropna(subset=['lat', 'lon'])
    if df.empty: return []

    all_stations = []
    for zone, s_list in STATIONS.items():
        for s in s_list: all_stations.append({**s, "zone": zone})

    # Visual Offsets so Gas and Wasser don't overlap
    OFFSET = {"Gas": 0.000035, "Wasser": -0.000035}
    offset_val = OFFSET.get(utility, 0)
    
    features = []

    for _, row in df.iterrows():
        h_lat, h_lon = float(row["lat"]), float(row["lon"])
        house_pt = [h_lon, h_lat]
        risk = str(row.get("Risiko", "N/A"))
        
        # 1. Snap house to nearest STREET Point -> This is the HUB
        hub_pt = get_osrm_nearest(house_pt)
        
        # 2. Find nearest supply station to connect this HUB to the main backbone
        nearest_station = min(all_stations, key=lambda s: (h_lat-s["lat"])**2 + (h_lon-s["lon"])**2)
        station_pt = [nearest_station["lon"], nearest_station["lat"]]

        # 3. Create Main Pipeline (following streets)
        route_coords = get_osrm_route(station_pt, hub_pt)
        main_pipe = offset_polyline(route_coords, offset_val)

        common_props = {
            "utility": utility, "network": nearest_station["zone"],
            "risiko": risk, "material": row.get("Werkstoff", "N/A"),
            "dimension": row.get("Dimension", "N/A")
        }

        # MAIN PIPE Feature
        features.append({
            "type": "Feature",
            "properties": {**common_props, "type": "Main Pipe", "risiko": "N/A"},
            "geometry": {"type": "LineString", "coordinates": main_pipe}
        })

        # LATERAL Feature (House to Hub)
        features.append({
            "type": "Feature",
            "properties": {**common_props, "type": "Lateral"},
            "geometry": {"type": "LineString", "coordinates": [hub_pt, house_pt]}
        })

        # CONNECTION HUB Feature (The Box on the street)
        features.append({
            "type": "Feature",
            "properties": {**common_props, "type": "Connection Hub"},
            "geometry": {"type": "Point", "coordinates": hub_pt}
        })

    return features

def main():
    all_features = []
    for util in UTILITIES:
        try:
            all_features.extend(create_utility_features(util))
        except Exception as e:
            print(f"Error: {e}")
        
    geojson = {"type": "FeatureCollection", "features": all_features}
    os.makedirs(os.path.dirname(GEOJSON_FILE), exist_ok=True)
    with open(GEOJSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    print(f"Generated {GEOJSON_FILE} with {len(all_features)} features.")

if __name__ == "__main__":
    main()

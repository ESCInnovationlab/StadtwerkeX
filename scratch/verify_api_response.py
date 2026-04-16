import requests
import json

try:
    resp = requests.get("http://localhost:8000/api/assets?utility=Alle Sparten")
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Records count: {len(data.get('records', []))}")
        if data.get('records'):
            print(f"First record keys: {list(data['records'][0].keys())}")
            print(f"First record 'Straße': {data['records'][0].get('Straße')}")
            print(f"First record 'Strae': {data['records'][0].get('Strae')}")
    else:
        print(f"Error Body: {resp.text}")
except Exception as e:
    print(f"Exception: {e}")

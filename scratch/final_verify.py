import requests
import json

def check_utility(utility):
    print(f"\n--- Checking {utility} ---")
    try:
        url = f"http://localhost:8000/api/assets?utility={utility}"
        resp = requests.get(url)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            records = data.get('records', [])
            print(f"Records count: {len(records)}")
            if records:
                first = records[0]
                # Check for standard keys we want in the frontend
                keys_to_check = ['Kundenname', 'Straße', 'Hausnummer', 'Risiko', 'Alter', 'Sparte']
                for k in keys_to_check:
                    print(f"  Key '{k}': {first.get(k)}")
                # Check for bad keys
                if 'Strae' in first:
                    print(f"  WARNING: 'Strae' still present!")
        else:
            print(f"Error: {resp.text}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    check_utility("Gas")
    check_utility("Strom")
    check_utility("Alle Sparten")

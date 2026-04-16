import pandas as pd
from geo_utils import get_utility_df, get_unified_df

def test_get_assets(utility="Gas"):
    df = get_unified_df() if utility == "Alle Sparten" else get_utility_df(utility)
    if df.empty:
        print("Empty DF")
        return

    print("Columns available:", df.columns.tolist())
    
    # 1. Summary: Age Groups
    age_bins = [0, 10, 20, 30, 100]
    age_labels = ["0-10 J", "10-20 J", "20-30 J", "30+ J"]
    
    # Check if 'Alter' exists
    if 'Alter' not in df.columns:
        print("ERROR: 'Alter' column missing")
        return

    df['AgeGroup'] = pd.cut(df['Alter'], bins=age_bins, labels=age_labels, right=False)
    age_summary = df.groupby('AgeGroup', observed=True).size().reset_index(name='count')
    print("Age Summary Done")

    # 2. Summary: Risk distribution
    if 'Risiko' not in df.columns:
        print("ERROR: 'Risiko' column missing")
        return
    risk_summary = df['Risiko'].value_counts().to_dict()
    print("Risk Summary Done")

    # 3. Records for table
    records = df.tail(100).to_dict('records')
    print("Fetched", len(records), "records")

if __name__ == "__main__":
    test_get_assets("Gas")

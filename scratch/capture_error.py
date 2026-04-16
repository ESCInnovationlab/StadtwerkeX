import traceback
try:
    from fastapi_server import get_assets
    res = get_assets("Gas")
    print("Function called successfully")
except Exception as e:
    print(f"FAILED with error: {e}")
    traceback.print_exc()

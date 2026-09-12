"""
Root ASGI entrypoint for Render / Cloud deployments
Imports and re-exports the FastAPI app from ml/api.py
"""

import sys
import os

# Add ml directory to sys.path so model loading and submodules work seamlessly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ml_dir = os.path.join(BASE_DIR, "ml")
if ml_dir not in sys.path:
    sys.path.insert(0, ml_dir)

from ml.api import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=True)

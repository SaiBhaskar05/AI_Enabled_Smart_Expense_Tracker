"""
FastAPI ML Prediction Service
==============================
Start: uvicorn api:app --host 0.0.0.0 --port 8000

Endpoints:
  GET  /health   — Health check
  POST /predict  — Predict expense category from description
  GET  /metrics  — Get model evaluation metrics
"""

import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from predict import predict

app = FastAPI(
    title="Expense Category Predictor",
    description="ML service for predicting expense categories from text descriptions",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    description: str

class PredictResponse(BaseModel):
    category: str
    confidence: float
    all_probabilities: dict = {}

@app.get("/health")
def health():
    return {"status": "healthy", "service": "expense-category-predictor"}

@app.post("/predict", response_model=PredictResponse)
def predict_category(req: PredictRequest):
    if not req.description or len(req.description.strip()) < 2:
        raise HTTPException(status_code=400, detail="Description too short")
    
    try:
        result = predict(req.description)
        return PredictResponse(**result)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Run 'python train.py' first."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
def get_metrics():
    metrics_path = os.environ.get("METRICS_PATH", "models/metrics.json")
    if not os.path.exists(metrics_path):
        raise HTTPException(status_code=404, detail="Model not trained yet. Run 'python train.py' first.")
    with open(metrics_path, 'r') as f:
        return json.load(f)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)

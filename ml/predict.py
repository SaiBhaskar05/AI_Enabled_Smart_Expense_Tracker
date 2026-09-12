"""
Inference module — Expense Category Prediction
"""

import os
import pickle
import re
import numpy as np

MODEL_PATH = os.environ.get("MODEL_PATH", "models/model.pkl")
VECTORIZER_PATH = os.environ.get("VECTORIZER_PATH", "models/vectorizer.pkl")

_model = None
_vectorizer = None

def load_model():
    global _model, _vectorizer
    if _model is None:
        with open(MODEL_PATH, 'rb') as f:
            _model = pickle.load(f)
        with open(VECTORIZER_PATH, 'rb') as f:
            _vectorizer = pickle.load(f)
    return _model, _vectorizer

def clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r'[^a-z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def predict(description: str) -> dict:
    """
    Predict expense category from description text.
    Returns: { "category": str, "confidence": float }
    """
    model, vectorizer = load_model()
    
    cleaned = clean_text(description)
    vec = vectorizer.transform([cleaned])
    
    # Get probabilities (Logistic Regression supports predict_proba)
    probabilities = model.predict_proba(vec)[0]
    predicted_idx = probabilities.argmax()
    predicted_class = model.classes_[predicted_idx]
    confidence = float(probabilities[predicted_idx])
    
    return {
        "category": predicted_class,
        "confidence": round(confidence, 4),
        "all_probabilities": {
            cls: round(float(prob), 4)
            for cls, prob in zip(model.classes_, probabilities)
        }
    }

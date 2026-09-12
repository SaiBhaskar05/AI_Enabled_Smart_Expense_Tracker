"""
Inference module — Expense Category Prediction
"""

import os
import pickle
import re
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_model_path():
    env_path = os.environ.get("MODEL_PATH")
    if env_path and os.path.exists(env_path):
        return env_path
    if os.path.exists("models/model.pkl"):
        return "models/model.pkl"
    return os.path.join(BASE_DIR, "models", "model.pkl")

def get_vectorizer_path():
    env_path = os.environ.get("VECTORIZER_PATH")
    if env_path and os.path.exists(env_path):
        return env_path
    if os.path.exists("models/vectorizer.pkl"):
        return "models/vectorizer.pkl"
    return os.path.join(BASE_DIR, "models", "vectorizer.pkl")

_model = None
_vectorizer = None

def load_model():
    global _model, _vectorizer
    if _model is None:
        model_p = get_model_path()
        vec_p = get_vectorizer_path()
        with open(model_p, 'rb') as f:
            _model = pickle.load(f)
        with open(vec_p, 'rb') as f:
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

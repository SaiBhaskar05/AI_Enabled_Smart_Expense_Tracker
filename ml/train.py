"""
ML Training Pipeline — Expense Category Classifier
===================================================
Pipeline: CSV Dataset → Text Cleaning → TF-IDF → Logistic Regression → Evaluation → Save

Dataset: Synthetic Financial Transaction Description Dataset
         (Mirrors Kaggle dataset schema: Transaction_Text, Label columns)
         Source: https://www.kaggle.com/datasets/computingvictor/transactions-fraud-datasets

Categories: Food, Travel, Shopping, Utilities, Healthcare,
            Education, Entertainment, EMI, Investment
"""

import os
import pickle
import numpy as np
import pandas as pd
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, classification_report, confusion_matrix
)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from data.generate_dataset import generate_dataset

# ─── Configuration ────────────────────────────────────────────────────────────
DATA_PATH = "data/transactions.csv"
MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "vectorizer.pkl")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")
CONFUSION_MATRIX_PATH = os.path.join(MODEL_DIR, "confusion_matrix.png")

os.makedirs(MODEL_DIR, exist_ok=True)

# ─── Step 1: Load Dataset ─────────────────────────────────────────────────────
def load_data(path):
    print("\n📂 Step 1: Loading dataset...")
    if not os.path.exists(path):
        print("Dataset not found. Generating...")
        generate_dataset(path)
    
    df = pd.read_csv(path)
    print(f"   Shape: {df.shape}")
    print(f"   Columns: {list(df.columns)}")
    return df

# ─── Step 2: Inspect & Validate ───────────────────────────────────────────────
def inspect_data(df):
    print("\n🔍 Step 2: Inspecting dataset...")
    print(f"   Text column: 'transaction_text'")
    print(f"   Label column: 'category'")
    print(f"   Missing values:\n{df.isnull().sum()}")
    print(f"\n   Class distribution:")
    dist = df['category'].value_counts()
    for label, count in dist.items():
        bar = '█' * (count // 50)
        print(f"   {label:15s}: {count:5d}  {bar}")
    
    # Handle missing and duplicates
    initial = len(df)
    df = df.dropna(subset=['transaction_text', 'category'])
    df = df.drop_duplicates(subset=['transaction_text'])
    print(f"\n   Removed {initial - len(df)} rows (missing/duplicate)")
    print(f"   Final dataset: {len(df)} rows")
    return df

# ─── Step 3: Text Cleaning ────────────────────────────────────────────────────
def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'[^a-z\s]', ' ', text)  # Keep only letters and spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def preprocess(df):
    print("\n🧹 Step 3: Text preprocessing...")
    df = df.copy()
    df['clean_text'] = df['transaction_text'].apply(clean_text)
    print(f"   Sample cleaned texts:")
    for _, row in df.head(3).iterrows():
        print(f"   '{row['transaction_text']}' → '{row['clean_text']}'")
    return df

# ─── Step 4: Train/Test Split ─────────────────────────────────────────────────
def split_data(df, test_size=0.2):
    print("\n✂️  Step 4: Train/test split (80/20)...")
    X = df['clean_text']
    y = df['category']
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, stratify=y
    )
    print(f"   Train: {len(X_train)} | Test: {len(X_test)}")
    return X_train, X_test, y_train, y_test

# ─── Step 5: TF-IDF Vectorization ────────────────────────────────────────────
def vectorize(X_train, X_test):
    print("\n📊 Step 5: TF-IDF Vectorization...")
    vectorizer = TfidfVectorizer(
        max_features=10000,
        ngram_range=(1, 2),  # Unigrams + bigrams
        sublinear_tf=True    # Apply log normalization
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    print(f"   Vocabulary size: {len(vectorizer.vocabulary_)}")
    print(f"   Feature matrix shape: {X_train_vec.shape}")
    return vectorizer, X_train_vec, X_test_vec

# ─── Step 6: Train Logistic Regression ───────────────────────────────────────
def train_model(X_train_vec, y_train):
    print("\n🤖 Step 6: Training Logistic Regression...")
    model = LogisticRegression(
        C=1.0,
        max_iter=1000,
        solver='saga',
        random_state=42
    )
    model.fit(X_train_vec, y_train)
    print("   Training complete!")
    return model

# ─── Step 7: Evaluate ────────────────────────────────────────────────────────
def evaluate(model, vectorizer, X_test_vec, y_test, categories):
    print("\n📈 Step 7: Evaluation metrics...")
    y_pred = model.predict(X_test_vec)

    accuracy  = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall    = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1        = f1_score(y_test, y_pred, average='weighted', zero_division=0)

    print(f"\n   ┌─────────────────────────────────┐")
    print(f"   │  Accuracy  : {accuracy:.4f}           │")
    print(f"   │  Precision : {precision:.4f}           │")
    print(f"   │  Recall    : {recall:.4f}           │")
    print(f"   │  F1-Score  : {f1:.4f}           │")
    print(f"   └─────────────────────────────────┘")

    print("\n   Classification Report:")
    print(classification_report(y_test, y_pred))

    # Confusion matrix plot
    cm = confusion_matrix(y_test, y_pred, labels=categories)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=categories, yticklabels=categories)
    plt.title('Confusion Matrix — Expense Category Classifier')
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.savefig(CONFUSION_MATRIX_PATH, dpi=120)
    print(f"   Confusion matrix saved: {CONFUSION_MATRIX_PATH}")

    metrics = {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "categories": categories,
        "test_size": len(y_test),
        "train_size": None  # filled below
    }
    return metrics

# ─── Step 8: Save Model ───────────────────────────────────────────────────────
def save_model(model, vectorizer, metrics, train_size):
    import json
    metrics['train_size'] = train_size
    
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    with open(VECTORIZER_PATH, 'wb') as f:
        pickle.dump(vectorizer, f)
    with open(METRICS_PATH, 'w') as f:
        json.dump(metrics, f, indent=2)
    
    print(f"\n💾 Step 8: Model saved!")
    print(f"   Model     : {MODEL_PATH}")
    print(f"   Vectorizer: {VECTORIZER_PATH}")
    print(f"   Metrics   : {METRICS_PATH}")

# ─── Main Pipeline ────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  Expense Category Classifier — Training Pipeline")
    print("=" * 60)

    df = load_data(DATA_PATH)
    df = inspect_data(df)
    df = preprocess(df)
    X_train, X_test, y_train, y_test = split_data(df)
    vectorizer, X_train_vec, X_test_vec = vectorize(X_train, X_test)
    model = train_model(X_train_vec, y_train)
    categories = sorted(df['category'].unique().tolist())
    metrics = evaluate(model, vectorizer, X_test_vec, y_test, categories)
    save_model(model, vectorizer, metrics, len(X_train))

    print("\n✅ Training pipeline complete!")
    print("   Run `python api.py` to start the prediction API.\n")

if __name__ == "__main__":
    main()

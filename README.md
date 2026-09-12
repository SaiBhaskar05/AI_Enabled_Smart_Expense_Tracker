# 💰 AI Enabled Smart Expense Tracker

An intelligent, full-stack personal finance and group expense management application powered by **Google Gemini AI**, **Machine Learning category classification**, and **modern web technologies**.

---

## ✨ Features

- 🤖 **Financial AI Copilot**: Conversational AI assistant powered by **Google Gemini** for financial advice, spending analysis, and budgeting tips.
- 🧠 **ML-Powered Categorization**: Automatic transaction category prediction using **Scikit-Learn (TF-IDF + Logistic Regression)** and FastAPI with rule-based fallback.
- 📊 **Interactive Analytics & Charts**: Rich visual insights with Chart.js and React Chart.js 2 for spending trends, monthly breakdowns, and category distributions.
- 👥 **Group & Trip Expenses**: Split expenses among friends, roomates, or trips with automated settlement calculations and email reminders.
- 💳 **Bills & Receipts Vault**: Store and manage recurring bills, due dates, and payment receipts.
- 📥 **CSV Import / Export**: Easy bulk import and export of expense data.
- 📧 **Automated Email Reports**: Daily, weekly, and monthly scheduled spending digests sent via Nodemailer.
- 🎨 **Modern Claymorphism UI**: Beautiful, responsive, and tactile design system built with custom CSS tokens and Lucide React icons.

---

## 🏗️ Architecture

```
AI_Enabled_Smart_Expense_Tracker/
├── frontend/          # React 19 SPA (Vite + Chart.js + Lucide)
├── backend/           # Node.js Express REST API (MongoDB + JWT + Gemini AI)
├── ml/                # Python FastAPI Microservice (Scikit-Learn ML Inference)
├── render.yaml        # Render Cloud Infrastructure Blueprint
└── DEPLOYMENT.md      # Step-by-step production deployment manual
```

---

## 🚀 Quick Start (Local Development)

### 1. ML Microservice (Python)
```bash
cd ml
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Backend API (Node.js)
```bash
cd backend
npm install
# Configure backend/.env (see backend/.env.example)
npm run dev
```

### 3. Frontend App (React)
```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 Production Deployment

For complete instructions on deploying:
- **Frontend** on [Vercel](https://vercel.com)
- **Backend & ML** on [Render](https://render.com)
- **Database** on [MongoDB Atlas](https://www.mongodb.com/atlas)

👉 See the comprehensive [DEPLOYMENT.md](DEPLOYMENT.md) guide.

---

## 📄 License
MIT License

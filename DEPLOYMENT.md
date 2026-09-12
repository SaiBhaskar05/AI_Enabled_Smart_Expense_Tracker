# 🚀 Smart Expense Tracker — Production Deployment Guide

This guide covers deploying the **Smart Expense Tracker** using modern cloud platforms:
- **Frontend**: [Vercel](https://vercel.com) or [Netlify](https://netlify.com)
- **Backend API**: [Render](https://render.com) or [Railway](https://railway.app)
- **ML Prediction Service**: [Render](https://render.com) or [Railway](https://railway.app)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) (Free M0 Cluster)

---

## 📋 Architecture Overview

```
 ┌───────────────────────────┐
 │   React Frontend (Vite)   │  (Vercel / Netlify)
 └─────────────┬─────────────┘
               │ HTTPS (VITE_API_URL)
 ┌─────────────▼─────────────┐
 │ Node.js Express Backend   │  (Render / Railway)
 └──────┬──────────────┬─────┘
        │              │
        │ Internal     │ Mongoose Connection
        ▼              ▼
┌──────────────┐ ┌──────────────┐
│  Python ML   │ │MongoDB Atlas │
│ (FastAPI)    │ │(Free Cluster)│
└──────────────┘ └──────────────┘
```

---

## 🛠️ Step 1: Set Up MongoDB Atlas (Database)

1. Go to **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)** and sign up / log in.
2. Click **Create a Database** → Choose the **M0 Free Tier** → Select a cloud provider/region close to you.
3. **Database Access (User Creation)**:
   - Go to **Security** → **Database Access** → **Add New Database User**.
   - Set Authentication Method to **Password**.
   - Enter a username and secure password (e.g. `expense_admin` and note your password).
   - Set Database User Privileges to **Read and write to any database**.
4. **Network Access (IP Whitelist)**:
   - Go to **Security** → **Network Access** → **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`) so Render/Railway can connect.
   - Click **Confirm**.
5. **Get Connection String**:
   - Go to **Databases** → Click **Connect** on your cluster.
   - Select **Drivers** (Node.js).
   - Copy the connection URI. It looks like:
     ```
     mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/smart_expense_tracker?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your actual credentials.

---

## 🧠 Step 2: Deploy the ML Service (FastAPI) on Render

1. Log in to **[Render Dashboard](https://dashboard.render.com)**.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository containing the project.
4. Configure the service:
   - **Name**: `smart-expense-ml`
   - **Region**: Same as your database region (e.g., Oregon)
   - **Root Directory**: `ml`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn api:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
5. Click **Create Web Service**.
6. Once deployed, note down the service URL (e.g. `https://smart-expense-ml.onrender.com`).

---

## ⚙️ Step 3: Deploy the Backend API (Node.js) on Render

1. In **[Render Dashboard](https://dashboard.render.com)**, click **New +** → **Web Service**.
2. Select your repository.
3. Configure the service:
   - **Name**: `smart-expense-backend`
   - **Region**: Same region as ML service
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Under **Environment Variables**, add the following keys:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `5000` | Server listening port |
   | `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string from Step 1 |
   | `JWT_SECRET` | *32+ character random string* | Secret key for JWT session tokens |
   | `JWT_EXPIRE` | `7d` | Token expiry duration |
   | `ML_API_URL` | `https://smart-expense-ml.onrender.com` | URL of the ML service from Step 2 |
   | `FRONTEND_URL` | `https://your-frontend-domain.vercel.app` | Your Vercel frontend URL (can update after Step 4) |
   | `GEMINI_API_KEY` | `AIzaSy...` | *(Optional)* Google Gemini AI Key from AI Studio |
   | `EMAIL_HOST` | `smtp.gmail.com` | *(Optional)* SMTP host for email notifications |
   | `EMAIL_PORT` | `587` | *(Optional)* SMTP port |
   | `EMAIL_USER` | `your-email@gmail.com` | *(Optional)* SMTP sender email |
   | `EMAIL_PASSWORD` | `your-app-password` | *(Optional)* Gmail App Password |
   | `EMAIL_FROM` | `Smart Expense Tracker <your-email@gmail.com>` | *(Optional)* Email From header |
5. Click **Create Web Service**.
6. Note down your backend URL (e.g. `https://smart-expense-backend.onrender.com`).
7. Test the health endpoint: `https://smart-expense-backend.onrender.com/api/health` should return `{"success": true, ...}`.

---

## 💻 Step 4: Deploy the Frontend (React Vite) on Vercel or Netlify

### Option A: Deploy on Vercel (Recommended)

1. Go to **[Vercel Dashboard](https://vercel.com/dashboard)** and click **Add New...** → **Project**.
2. Import your GitHub repository.
3. Configure the project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - **`VITE_API_URL`**: `https://smart-expense-backend.onrender.com/api` *(Make sure to append `/api`)*
5. Click **Deploy**.
6. Once deployed, copy your production frontend URL (e.g., `https://smart-expense-tracker.vercel.app`).
7. **Important**: Go back to your Render Backend settings and ensure `FRONTEND_URL` is set to this URL.

---

### Option B: Deploy on Netlify

1. Go to **[Netlify Dashboard](https://app.netlify.com)** and click **Add new site** → **Import an existing project**.
2. Select your repository.
3. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
4. Add Environment Variable:
   - **`VITE_API_URL`**: `https://smart-expense-backend.onrender.com/api`
5. Click **Deploy site**.

---

## ⚡ Alternative: 1-Click Render Blueprint (`render.yaml`)

This repository includes a `render.yaml` blueprint. To deploy the Backend & ML services together:

1. Push this repository to GitHub.
2. In Render Dashboard, click **New +** → **Blueprint**.
3. Connect your repository. Render will automatically detect `render.yaml` and configure both `smart-expense-backend` and `smart-expense-ml`.
4. Enter your `MONGODB_URI` and `FRONTEND_URL` in the prompts.
5. Click **Apply**.

---

## 🐳 Alternative: 1-Command Local/VPS Docker Deployment

If you want to run the full stack on a Linux VPS (AWS EC2, DigitalOcean, Linode) or your local machine with Docker:

```bash
# 1. Clone repo
git clone <your-repo-url>
cd smart-expense-tracker

# 2. Set environment variables (optional: create .env with GEMINI_API_KEY, etc.)

# 3. Start everything with Docker Compose
docker compose up --build -d

# 4. View running containers
docker compose ps
```

The application will be live at:
- **Frontend Web App**: `http://<your-ip-or-domain>` (Port 80)
- **Backend API**: `http://<your-ip-or-domain>:5000/api`
- **ML Microservice**: `http://<your-ip-or-domain>:8000`

---

## ✅ Post-Deployment Verification Checklist

1. **Backend Health Check**:
   - Open `https://<backend-url>/api/health` → Should respond with `{"success": true, "message": "API is running"}`.
2. **ML Health Check**:
   - Open `https://<ml-url>/health` → Should respond with `{"status": "healthy"}`.
3. **Frontend Authentication**:
   - Open your frontend URL (`https://<frontend-url>`).
   - Register a new account and verify that you land on the Dashboard.
4. **Expense Categorization & AI**:
   - Add an expense (e.g. `"Starbucks latte"`).
   - Check that the ML auto-predicts category as **Food**.
5. **SPA Direct Route Reload**:
   - Navigate to `/expenses` and press **Refresh (F5)** in your browser. Verify the page reloads cleanly without 404.

---

🎉 **Your Smart Expense Tracker is now live and fully operational!**

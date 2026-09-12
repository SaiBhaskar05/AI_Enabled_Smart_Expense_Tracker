require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/database');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');
const emailRoutes = require('./src/routes/emailRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const mlRoutes = require('./src/routes/mlRoutes');
const importExportRoutes = require('./src/routes/importExportRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const billRoutes = require('./src/routes/billRoutes');
const aiRoutes = require('./src/routes/aiRoutes');

// Scheduler
const { initScheduler } = require('./src/services/scheduler');

const app = express();

// Trust reverse proxies (Cloudflare Tunnel, Vite proxy, etc.)
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration supporting Cloudflare Tunnels, Vercel, Netlify, Render, Railway, and local dev
const envOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(url => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  ...envOrigins,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const originClean = origin.replace(/\/$/, '');
    
    if (
      originClean.includes('localhost') ||
      originClean.includes('127.0.0.1') ||
      originClean.includes('.trycloudflare.com') ||
      originClean.includes('.cloudflareaccess.com') ||
      originClean.includes('.vercel.app') ||
      originClean.includes('.netlify.app') ||
      originClean.includes('.onrender.com') ||
      originClean.includes('.railway.app') ||
      allowedOrigins.includes(originClean)
    ) {
      return callback(null, true);
    }
    
    // In production, also allow matching origins
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Rate limiting for auth endpoints (adjusted for proxy/tunnel)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/import-export', importExportRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // Initialize scheduled email jobs
  initScheduler();
});

module.exports = server;

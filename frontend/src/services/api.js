import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
};

// ─── Expenses ─────────────────────────────────────────────────────
export const expensesAPI = {
  create: (data) => API.post('/expenses', data),
  getAll: (params) => API.get('/expenses', { params }),
  getOne: (id) => API.get(`/expenses/${id}`),
  update: (id, data) => API.put(`/expenses/${id}`, data),
  delete: (id) => API.delete(`/expenses/${id}`),
  getStats: () => API.get('/expenses/stats'),
};

// ─── Categories ───────────────────────────────────────────────────
export const categoriesAPI = {
  getAll: () => API.get('/categories'),
  create: (data) => API.post('/categories', data),
  update: (id, data) => API.put(`/categories/${id}`, data),
  delete: (id) => API.delete(`/categories/${id}`),
};

// ─── Budgets ──────────────────────────────────────────────────────
export const budgetsAPI = {
  getAll: () => API.get('/budgets'),
  create: (data) => API.post('/budgets', data),
  update: (id, data) => API.put(`/budgets/${id}`, data),
  delete: (id) => API.delete(`/budgets/${id}`),
};

// ─── ML ───────────────────────────────────────────────────────────
export const mlAPI = {
  predict: (description) => API.post('/ml/predict', { description }),
  health: () => API.get('/ml/health'),
};

// ─── Email ────────────────────────────────────────────────────────
export const emailAPI = {
  getPreferences: () => API.get('/email/preferences'),
  updatePreferences: (data) => API.put('/email/preferences', data),
  addRecipient: (data) => API.post('/email/recipients', data),
  updateRecipient: (id, data) => API.put(`/email/recipients/${id}`, data),
  deleteRecipient: (id) => API.delete(`/email/recipients/${id}`),
  sendDaily: (sendToRecipients = false) => API.post('/email/send-daily', { sendToRecipients }),
  sendWeekly: (sendToRecipients = false) => API.post('/email/send-weekly', { sendToRecipients }),
  sendMonthly: (sendToRecipients = false) => API.post('/email/send-monthly', { sendToRecipients }),
  sendToRecipient: (data) => API.post('/email/send-to-recipient', data),
};


// ─── Groups & Trips ──────────────────────────────────────────────
export const groupsAPI = {
  getAll: () => API.get('/groups'),
  getOne: (id) => API.get(`/groups/${id}`),
  create: (data) => API.post('/groups', data),
  update: (id, data) => API.put(`/groups/${id}`, data),
  delete: (id) => API.delete(`/groups/${id}`),
  joinByCode: (inviteCode) => API.post('/groups/join', { inviteCode }),
  addMember: (id, email) => API.post(`/groups/${id}/members`, { email }),
  removeMember: (id, userId) => API.delete(`/groups/${id}/members/${userId}`),
  
  // Group Expenses
  getExpenses: (id, params) => API.get(`/groups/${id}/expenses`, { params }),
  addExpense: (id, data) => API.post(`/groups/${id}/expenses`, data),
  deleteExpense: (id, expenseId) => API.delete(`/groups/${id}/expenses/${expenseId}`),
  
  // Balances & Settlements
  getBalances: (id) => API.get(`/groups/${id}/balances`),
  recordSettlement: (id, data) => API.post(`/groups/${id}/settle`, data),
  getSettlements: (id) => API.get(`/groups/${id}/settle`),

  // Email Reports & Reminders
  sendEmailSummary: (id, data) => API.post(`/groups/${id}/email-summary`, data),
  sendSettlementReminder: (id, data) => API.post(`/groups/${id}/email-reminder`, data),

  // Personal Dashboard Sync
  getSyncStatus: (id) => API.get(`/groups/${id}/sync-status`),
  importToPersonal: (id, data) => API.post(`/groups/${id}/import-to-personal`, data),
};

// ─── Reports ──────────────────────────────────────────────────────
export const reportsAPI = {
  get: (params) => API.get('/reports', { params }),
};

// ─── Import/Export ────────────────────────────────────────────────
export const importExportAPI = {
  preview: (csvData) => API.post('/import-export/preview', { csvData }),
  import: (rows) => API.post('/import-export/import', { rows }),
  exportUrl: (params) => {
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_URL || '/api';
    const qs = new URLSearchParams({ ...params, token }).toString();
    return `${base}/import-export/export?${qs}`;
  },
  export: (params) => API.get('/import-export/export', { params, responseType: 'blob' }),
};

// ─── Bills & Receipts Vault ───────────────────────────────────────
export const billsAPI = {
  upload: (data) => API.post('/bills', data),
  getPersonal: (params) => API.get('/bills', { params }),
  getGroup: (groupId, params) => API.get(`/bills/group/${groupId}`, { params }),
  delete: (id) => API.delete(`/bills/${id}`),
};

// ─── Gemini AI Copilot & Insights ─────────────────────────────────
export const aiAPI = {
  chat: (message, history = []) => API.post('/ai/copilot/chat', { message, history }),
  getInsights: () => API.get('/ai/copilot/insights'),
  getContext: () => API.get('/ai/copilot/context'),
};

export default API;



// Currency formatting
export const formatCurrency = (amount, currency = '₹') => {
  if (amount === undefined || amount === null) return `${currency}0`;
  return `${currency}${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

// Date formatting
export const formatDate = (date, options = {}) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', ...options
  });
};

export const formatDateInput = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

export const formatRelativeDate = (date) => {
  const now = new Date();
  const d = new Date(date);
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(date);
};

// Period calculations
export const getPeriodDates = (period) => {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: new Date(now.setHours(0,0,0,0)), end: new Date(new Date().setHours(23,59,59,999)) };
    case 'week': {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
      return { start, end: new Date(new Date().setHours(23,59,59,999)) };
    }
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(new Date().setHours(23,59,59,999)) };
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: new Date(new Date().setHours(23,59,59,999)) };
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date() };
  }
};

// Month names
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Category colors
export const CATEGORY_COLORS = {
  'Food':         '#f97316',
  'Travel':       '#06b6d4',
  'Shopping':     '#a855f7',
  'Utilities':    '#eab308',
  'Healthcare':   '#ef4444',
  'Education':    '#3b82f6',
  'Entertainment':'#ec4899',
  'EMI':          '#64748b',
  'Investment':   '#10b981',
  'Others':       '#94a3b8',
};

export const CATEGORY_ICONS = {
  'Food': 'Utensils', 'Travel': 'Plane', 'Shopping': 'ShoppingBag',
  'Utilities': 'Zap', 'Healthcare': 'HeartPulse', 'Education': 'GraduationCap',
  'Entertainment': 'Film', 'EMI': 'Building', 'Investment': 'TrendingUp', 'Others': 'Tag',
};

export const getCategoryColor = (name) => CATEGORY_COLORS[name] || '#7c5cfc';
export const getCategoryIcon  = (name) => CATEGORY_ICONS[name]  || 'Tag';

// Percentage
export const getPercentage = (value, total) => total > 0 ? Math.round((value / total) * 100) : 0;

// Truncate text
export const truncate = (text, max = 40) =>
  text && text.length > max ? text.substring(0, max) + '…' : text;

// Debounce
export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// Generate initials
export const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

// Payment methods
export const PAYMENT_METHODS = ['Cash','Credit Card','Debit Card','UPI','Net Banking','Wallet','Other'];

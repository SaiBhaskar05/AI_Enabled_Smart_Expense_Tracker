const nodemailer = require('nodemailer');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

const axios = require('axios');

// Clean and normalize email credentials
const getEmailCredentials = () => {
  const user = (process.env.EMAIL_USER || '').trim();
  // Strip any accidental spaces from App Passwords (e.g., "abcd efgh ijkl mnop")
  const pass = (process.env.EMAIL_PASSWORD || '').trim().replace(/\s+/g, '');
  const host = (process.env.EMAIL_HOST || 'smtp.gmail.com').trim();
  const rawPort = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : null;
  const service = (process.env.EMAIL_SERVICE || '').trim().toLowerCase();
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  const from = (process.env.EMAIL_FROM || `Smart Expense Tracker <${user || 'onboarding@resend.dev'}>`).trim();

  return { user, pass, host, rawPort, service, resendApiKey, brevoApiKey, from };
};

// Create transporter with explicit IPv4 and quick timeout controls for Render cloud compatibility
const buildTransporter = ({ host, port, secure, user, pass, service }) => {
  if (service === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for 587 / 2525
    auth: {
      user,
      pass
    },
    // Force IPv4 resolution to prevent Render IPv6 DNS timeout with smtp servers
    family: 4,
    pool: false,
    connectionTimeout: 7000,
    greetingTimeout: 7000,
    socketTimeout: 9000,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    }
  });
};

// Primary, secondary, and tertiary transporter creators
const createTransporterChain = () => {
  const { user, pass, host, rawPort, service } = getEmailCredentials();
  
  if (!user || !pass) {
    return [];
  }

  const list = [];

  if (service === 'gmail') {
    list.push({
      name: 'Gmail Native Service Preset',
      transporter: buildTransporter({ service: 'gmail', user, pass })
    });
  }

  if (rawPort) {
    list.push({
      name: `SMTP (${host}:${rawPort})`,
      transporter: buildTransporter({ host, port: rawPort, secure: rawPort === 465, user, pass })
    });
  }

  // If host is Gmail or generic, provide multi-port candidates: 465 (SSL), 587 (STARTTLS), and 2525
  const defaultPorts = rawPort === 465 ? [587, 2525] : rawPort === 587 ? [465, 2525] : [465, 587, 2525];
  for (const port of defaultPorts) {
    list.push({
      name: `SMTP (${host}:${port})`,
      transporter: buildTransporter({ host, port, secure: port === 465, user, pass })
    });
  }

  // Also include Gmail service preset as backup for Gmail accounts
  if (service !== 'gmail' && (host.includes('gmail') || user.includes('@gmail.com'))) {
    list.push({
      name: 'Gmail Service Preset Fallback',
      transporter: buildTransporter({ service: 'gmail', user, pass })
    });
  }

  return list;
};

// Format currency
const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Base HTML email template
const baseTemplate = (content, title, sharingInfo = null) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f4ff; color: #1e293b; }
    .wrapper { max-width: 600px; margin: 30px auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; color: white; }
    .header h1 { font-size: 24px; font-weight: 700; }
    .header p { opacity: 0.85; margin-top: 6px; font-size: 14px; }
    .shared-banner { background: #e0e7ff; color: #4338ca; padding: 10px 24px; text-align: center; font-size: 13px; font-weight: 600; border-bottom: 1px solid #c7d2fe; }
    .body { padding: 32px; }
    .stat-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat-card { flex: 1; background: #f8faff; border-radius: 16px; padding: 16px; text-align: center; border: 1px solid #e2e8f0; }
    .stat-card .value { font-size: 22px; font-weight: 700; color: #6366f1; }
    .stat-card .label { font-size: 12px; color: #64748b; margin-top: 4px; }
    .section-title { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .category-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .category-name { font-size: 14px; color: #334155; }
    .category-amount { font-size: 14px; font-weight: 600; color: #6366f1; }
    .progress-bar { background: #e2e8f0; border-radius: 8px; height: 6px; margin-top: 4px; }
    .progress-fill { background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 8px; height: 6px; }
    .footer { background: #f8faff; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #16a34a; }
    .badge-red { background: #fee2e2; color: #dc2626; }
    .badge-yellow { background: #fef3c7; color: #d97706; }
  </style>
</head>
<body>
  <div class="wrapper">
    ${sharingInfo ? `<div class="shared-banner">🤝 Shared Report: ${sharingInfo.ownerName}'s Expenses</div>` : ''}
    ${content}
    <div class="footer">
      <p>Smart Expense Tracker • Manage your money wisely</p>
      <p style="margin-top:6px">
        ${sharingInfo 
          ? `You're receiving this report because <strong>${sharingInfo.ownerName}</strong> (${sharingInfo.relation || 'Friend/Family'}) shared their expense summary with you.`
          : "You're receiving this because you enabled email reports in your settings."
        }
      </p>
    </div>
  </div>
</body>
</html>
`;

// Generate daily summary email
const generateDailySummary = async (userId, userEmail, userName, recipientInfo = null) => {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

  const [summaryResult, categories] = await Promise.all([
    Expense.aggregate([
      { $match: { userId, date: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Expense.aggregate([
      { $match: { userId, date: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ])
  ]);

  const summary = summaryResult[0] || { total: 0, count: 0 };
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const categoryRows = categories.map(c =>
    `<div class="category-row"><span class="category-name">${c._id}</span><span class="category-amount">${formatCurrency(c.total)}</span></div>`
  ).join('');

  const greeting = recipientInfo
    ? `Hi ${recipientInfo.name || 'there'}! Here is <strong>${userName}</strong>'s daily spending summary for today.`
    : `Hi ${userName}! Here's your spending summary for today.`;

  const content = `
    <div class="header">
      <h1>📊 Daily Expense Summary</h1>
      <p>${dateStr}</p>
    </div>
    <div class="body">
      <p style="margin-bottom:20px;color:#64748b">${greeting}</p>
      <div class="stat-row">
        <div class="stat-card"><div class="value">${formatCurrency(summary.total)}</div><div class="label">Total Spent</div></div>
        <div class="stat-card"><div class="value">${summary.count}</div><div class="label">Transactions</div></div>
      </div>
      ${categories.length > 0 ? `
        <p class="section-title">By Category</p>
        ${categoryRows}
      ` : '<p style="color:#94a3b8;text-align:center;padding:20px">No expenses recorded today 🎉</p>'}
    </div>
  `;

  const subject = recipientInfo
    ? `[Shared] ${userName}'s Daily Summary — ${dateStr}`
    : `Your Daily Summary — ${dateStr}`;

  return { subject, html: baseTemplate(content, 'Daily Summary', recipientInfo ? { ownerName: userName, relation: recipientInfo.relationship } : null) };
};

// Generate weekly summary email
const generateWeeklySummary = async (userId, userName, recipientInfo = null) => {
  const now = new Date();
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);

  const [summaryResult, categories, dailyTrend] = await Promise.all([
    Expense.aggregate([
      { $match: { userId, date: { $gte: startOfWeek } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 }, max: { $max: '$amount' } } }
    ]),
    Expense.aggregate([
      { $match: { userId, date: { $gte: startOfWeek } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]),
    Expense.aggregate([
      { $match: { userId, date: { $gte: startOfWeek } } },
      { $group: { _id: { $dateToString: { format: '%a', date: '$date' } }, total: { $sum: '$amount' } } }
    ])
  ]);

  const summary = summaryResult[0] || { total: 0, count: 0, max: 0 };
  const topCategory = categories[0]?._id || 'None';

  const categoryRows = categories.slice(0, 5).map(c =>
    `<div class="category-row"><span class="category-name">${c._id}</span><span class="category-amount">${formatCurrency(c.total)}</span></div>`
  ).join('');

  const greeting = recipientInfo
    ? `Hi ${recipientInfo.name || 'there'}! Here is <strong>${userName}</strong>'s weekly spending overview.`
    : `Hi ${userName}! Here's your weekly spending overview.`;

  const content = `
    <div class="header">
      <h1>📅 Weekly Expense Summary</h1>
      <p>Week of ${startOfWeek.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}</p>
    </div>
    <div class="body">
      <p style="margin-bottom:20px;color:#64748b">${greeting}</p>
      <div class="stat-row">
        <div class="stat-card"><div class="value">${formatCurrency(summary.total)}</div><div class="label">Total Spent</div></div>
        <div class="stat-card"><div class="value">${summary.count}</div><div class="label">Transactions</div></div>
        <div class="stat-card"><div class="value">${topCategory}</div><div class="label">Top Category</div></div>
      </div>
      ${categories.length > 0 ? `<p class="section-title">Category Breakdown</p>${categoryRows}` : ''}
    </div>
  `;

  const subject = recipientInfo
    ? `[Shared] ${userName}'s Weekly Summary — ${formatCurrency(summary.total)} spent`
    : `Your Weekly Summary — ${formatCurrency(summary.total)} spent`;

  return { subject, html: baseTemplate(content, 'Weekly Summary', recipientInfo ? { ownerName: userName, relation: recipientInfo.relationship } : null) };
};

// Generate monthly summary email
const generateMonthlySummary = async (userId, userName, recipientInfo = null) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [summaryResult, categories, budgets] = await Promise.all([
    Expense.aggregate([
      { $match: { userId, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 }, avg: { $avg: '$amount' }, max: { $max: '$amount' } } }
    ]),
    Expense.aggregate([
      { $match: { userId, date: { $gte: startOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]),
    Budget.find({ userId })
  ]);

  const summary = summaryResult[0] || { total: 0, count: 0, avg: 0, max: 0 };
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const categoryRows = categories.slice(0, 6).map(c =>
    `<div class="category-row"><span class="category-name">${c._id}</span><span class="category-amount">${formatCurrency(c.total)}</span></div>`
  ).join('');

  const budgetRows = await Promise.all(budgets.slice(0, 4).map(async (b) => {
    const spending = await Expense.aggregate([
      { $match: { userId, category: b.category, date: { $gte: b.startDate, $lte: b.endDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const spent = spending[0]?.total || 0;
    const pct = Math.min(100, Math.round((spent / b.amount) * 100));
    const badgeClass = pct >= 100 ? 'badge-red' : pct >= 80 ? 'badge-yellow' : 'badge-green';
    return `
      <div class="category-row">
        <span class="category-name">${b.category}</span>
        <span>${formatCurrency(spent)} / ${formatCurrency(b.amount)} <span class="badge ${badgeClass}">${pct}%</span></span>
      </div>`;
  }));

  const greeting = recipientInfo
    ? `Hi ${recipientInfo.name || 'there'}! Here is <strong>${userName}</strong>'s complete monthly spending report.`
    : `Hi ${userName}! Here's your complete monthly spending report.`;

  const content = `
    <div class="header">
      <h1>🗓️ Monthly Expense Summary</h1>
      <p>${monthName}</p>
    </div>
    <div class="body">
      <p style="margin-bottom:20px;color:#64748b">${greeting}</p>
      <div class="stat-row">
        <div class="stat-card"><div class="value">${formatCurrency(summary.total)}</div><div class="label">Total Spent</div></div>
        <div class="stat-card"><div class="value">${summary.count}</div><div class="label">Transactions</div></div>
        <div class="stat-card"><div class="value">${formatCurrency(summary.avg)}</div><div class="label">Avg/Transaction</div></div>
      </div>
      ${categories.length > 0 ? `<p class="section-title">Category Breakdown</p>${categoryRows}` : ''}
      ${budgets.length > 0 ? `<p class="section-title" style="margin-top:20px">Budget Utilization</p>${budgetRows.join('')}` : ''}
    </div>
  `;

  const subject = recipientInfo
    ? `[Shared] ${userName}'s Monthly Summary for ${monthName} — ${formatCurrency(summary.total)} spent`
    : `Your Monthly Summary for ${monthName} — ${formatCurrency(summary.total)} spent`;

  return { subject, html: baseTemplate(content, 'Monthly Summary', recipientInfo ? { ownerName: userName, relation: recipientInfo.relationship } : null) };
};

// Generate group summary email
const generateGroupSummaryEmail = async (group, expenses, memberBalances, simplifiedDebts, senderName) => {
  const currencySymbol = group.currency === 'USD' ? '$' : group.currency === 'EUR' ? '€' : '₹';
  const fmt = (val) => `${currencySymbol}${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const budget = group.totalBudget || 0;
  const budgetPct = budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0;
  const remaining = Math.max(0, budget - totalSpent);

  // Recent 5 expenses rows
  const expenseRows = expenses.slice(0, 8).map(e => {
    const payerName = e.paidBy?.name || 'A Member';
    const dateStr = e.date ? new Date(e.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '';
    return `
      <div class="category-row">
        <div>
          <span class="category-name" style="font-weight:600">${e.description}</span>
          <div style="font-size:12px;color:#64748b">Paid by ${payerName} • ${e.category || 'General'} • ${dateStr}</div>
        </div>
        <span class="category-amount">${fmt(e.amount)}</span>
      </div>
    `;
  }).join('');

  // Debts rows
  const debtRows = (simplifiedDebts || []).map(d => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;margin-bottom:8px;background:#f8faff;border-radius:12px;border:1px solid #e2e8f0;">
      <div>
        <strong style="color:#1e293b">${d.fromUser?.name || 'Member'}</strong>
        <span style="color:#64748b;font-size:13px"> owes </span>
        <strong style="color:#10b981">${d.toUser?.name || 'Member'}</strong>
      </div>
      <span style="font-weight:700;color:#6366f1;font-size:15px">${fmt(d.amount)}</span>
    </div>
  `).join('');

  // Category Budgets & Spend
  const catSpending = {};
  expenses.forEach(e => {
    const cName = (e.category || 'General').trim();
    catSpending[cName] = (catSpending[cName] || 0) + (e.amount || 0);
  });

  const catRows = (group.categoryBudgets || []).map(cb => {
    const catName = cb.category ? cb.category.trim() : '';
    const spent = catSpending[catName] || 0;
    const pct = cb.amount > 0 ? Math.round((spent / cb.amount) * 100) : 0;
    const badgeClass = pct >= 100 ? 'badge-red' : pct >= 80 ? 'badge-yellow' : 'badge-green';
    return `
      <div class="category-row">
        <span class="category-name">${cb.category}</span>
        <span>${fmt(spent)} / ${fmt(cb.amount)} <span class="badge ${badgeClass}">${pct}%</span></span>
      </div>
    `;
  }).join('');

  const content = `
    <div class="header">
      <h1>Group Expense & Budget Summary</h1>
      <p style="font-size:16px;font-weight:600;margin-top:4px">${group.name}</p>
    </div>
    <div class="body">
      <p style="margin-bottom:20px;color:#64748b">
        Shared by <strong>${senderName}</strong> for the group <strong>${group.name}</strong> (${(group.members || []).length} members).
      </p>

      <div class="stat-row">
        <div class="stat-card">
          <div class="value">${fmt(totalSpent)}</div>
          <div class="label">Total Spent</div>
        </div>
        ${budget > 0 ? `
          <div class="stat-card">
            <div class="value" style="color:#10b981">${fmt(remaining)}</div>
            <div class="label">Remaining Budget</div>
          </div>
        ` : `
          <div class="stat-card">
            <div class="value">${expenses.length}</div>
            <div class="label">Total Expenses</div>
          </div>
        `}
      </div>

      ${budget > 0 ? `
        <div style="margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#64748b;margin-bottom:4px">
            <span>Budget Utilization</span>
            <span>${budgetPct}% (${fmt(totalSpent)} / ${fmt(budget)})</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${budgetPct}%; background: ${budgetPct > 90 ? '#ef4444' : budgetPct > 75 ? '#f59e0b' : 'linear-gradient(90deg, #6366f1, #8b5cf6)'}"></div>
          </div>
        </div>
      ` : ''}

      ${simplifiedDebts && simplifiedDebts.length > 0 ? `
        <p class="section-title">Who Owes Who (Settlements)</p>
        <div style="margin-bottom:24px;">
          ${debtRows}
        </div>
      ` : '<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:12px;text-align:center;color:#065f46;margin-bottom:20px;font-weight:600;">All group balances are settled!</div>'}

      ${catRows ? `
        <p class="section-title">Category Budgets</p>
        <div style="margin-bottom:24px;">${catRows}</div>
      ` : ''}

      <p class="section-title">Recent Group Expenses</p>
      ${expenses.length > 0 ? expenseRows : '<p style="color:#94a3b8;text-align:center;padding:16px">No expenses recorded yet.</p>'}
    </div>
  `;

  const subject = `[${group.name}] Group Expense Summary — Total ${fmt(totalSpent)}`;
  return { subject, html: baseTemplate(content, `${group.name} Summary`, { ownerName: senderName, relation: 'Group Member' }) };
};

// Generate personalized settlement reminder email
const generateSettlementReminderEmail = async ({ groupName, debtorName, creditorName, amount, currency, notes }) => {
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
  const formattedAmount = `${currencySymbol}${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const content = `
    <div class="header" style="background: linear-gradient(135deg, #059669, #10b981);">
      <h1>Settlement Reminder</h1>
      <p style="font-size:15px;margin-top:4px">${groupName}</p>
    </div>
    <div class="body">
      <p style="margin-bottom:20px;color:#334155;font-size:15px">
        Hi <strong>${debtorName}</strong>,
      </p>
      <p style="margin-bottom:20px;color:#64748b;line-height:1.6;">
        This is a friendly reminder from <strong>${creditorName}</strong> regarding your pending settlement in the group <strong>${groupName}</strong>.
      </p>

      <div style="background:#f0fdf4;border:2px dashed #86efac;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
        <div style="font-size:13px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Amount Due</div>
        <div style="font-size:32px;font-weight:800;color:#059669;margin:8px 0">${formattedAmount}</div>
        <div style="font-size:14px;color:#15803d">Payable to <strong>${creditorName}</strong></div>
      </div>

      ${notes ? `
        <div style="background:#f8fafc;border-left:4px solid #6366f1;padding:12px 16px;margin-bottom:20px;border-radius:0 8px 8px 0;">
          <strong style="color:#1e293b;font-size:13px">Note from ${creditorName}:</strong>
          <p style="color:#475569;margin-top:4px;font-size:14px">${notes}</p>
        </div>
      ` : ''}

      <div style="text-align:center;margin-top:28px;">
        <p style="font-size:13px;color:#64748b">Please settle this via UPI or preferred payment app and mark it as settled in the Smart Tracker dashboard.</p>
      </div>
    </div>
  `;

  const subject = `[Reminder] Settle ${formattedAmount} for ${groupName} with ${creditorName}`;
  return { subject, html: baseTemplate(content, 'Settlement Reminder', { ownerName: creditorName, relation: 'Group Member' }) };
};

// Send via Resend HTTPS API (Works 100% on Render without SMTP port blocks)
const sendViaResend = async ({ resendApiKey, from, to, subject, html }) => {
  const res = await axios.post(
    'https://api.resend.com/emails',
    {
      from: from.includes('<') ? from : `Smart Expense Tracker <${from}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html
    },
    {
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );
  return { messageId: res.data?.id || 'resend-ok', provider: 'Resend API' };
};

// Send via Brevo HTTPS API
const sendViaBrevoApi = async ({ brevoApiKey, from, to, subject, html, user }) => {
  const senderEmail = user || (from.match(/<([^>]+)>/)?.[1] || from);
  const res = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { email: senderEmail, name: 'Smart Expense Tracker' },
      to: [{ email: to }],
      subject,
      htmlContent: html
    },
    {
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );
  return { messageId: res.data?.messageId || 'brevo-ok', provider: 'Brevo API' };
};

// Verify email service connection / diagnostics
const verifyEmailTransporter = async () => {
  const { user, pass, host, rawPort, resendApiKey, brevoApiKey } = getEmailCredentials();

  // 1. If Resend API Key is configured
  if (resendApiKey) {
    try {
      await axios.get('https://api.resend.com/api-keys', {
        headers: { Authorization: `Bearer ${resendApiKey}` },
        timeout: 8000
      });
      return {
        ok: true,
        message: 'Resend API connection verified successfully (Bypasses Render SMTP port blocks).',
        host: 'api.resend.com',
        user: 'Resend API'
      };
    } catch (e) {
      return {
        ok: false,
        message: `Resend API key check failed: ${e.response?.data?.message || e.message}`
      };
    }
  }

  // 2. If Brevo API Key is configured
  if (brevoApiKey) {
    try {
      await axios.get('https://api.brevo.com/v3/account', {
        headers: { 'api-key': brevoApiKey },
        timeout: 8000
      });
      return {
        ok: true,
        message: 'Brevo API connection verified successfully.',
        host: 'api.brevo.com',
        user: 'Brevo API'
      };
    } catch (e) {
      return {
        ok: false,
        message: `Brevo API check failed: ${e.response?.data?.message || e.message}`
      };
    }
  }

  if (!user || !pass) {
    return {
      ok: false,
      message: 'Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD (or RESEND_API_KEY) in Render environment variables.'
    };
  }

  const chain = createTransporterChain();
  const errors = [];

  for (const item of chain) {
    try {
      await item.transporter.verify();
      return {
        ok: true,
        message: `SMTP connection verified successfully using ${item.name}.`,
        host: host || 'smtp.gmail.com',
        user
      };
    } catch (err) {
      console.warn(`⚠️ [${item.name}] verify failed:`, err.message);
      errors.push(`${item.name}: ${err.code || err.message}`);
    }
  }

  const isTimeout = errors.some(e => e.includes('ETIMEDOUT') || e.includes('timeout') || e.includes('ECONNREFUSED'));
  let guidance = '';
  if (isTimeout) {
    guidance = ' Note: Render blocks standard SMTP ports (465 & 587). To fix this on Render, either: 1) Use an unblocked SMTP port like 2525 (e.g., Brevo SMTP: smtp-relay.brevo.com port 2525), or 2) Set RESEND_API_KEY in Render environment variables (Free 3,000 emails/mo at resend.com).';
  }

  return {
    ok: false,
    message: `SMTP verification failed across all attempted ports. (${errors.join(' | ')}).${guidance}`,
    code: 'SMTP_UNREACHABLE'
  };
};

// Send email helper with multi-transport cascading & API fallbacks
const sendEmail = async (to, subject, html) => {
  const { user, pass, from, resendApiKey, brevoApiKey } = getEmailCredentials();

  // Priority 1: Resend HTTPS API (100% reliable on Render free/starter tiers)
  if (resendApiKey) {
    try {
      const res = await sendViaResend({ resendApiKey, from, to, subject, html });
      console.log(`✉️ Email dispatched via Resend API to ${to} (ID: ${res.messageId})`);
      return res;
    } catch (err) {
      console.error('❌ Resend API dispatch failed:', err.response?.data || err.message);
      if (!user || !pass) {
        throw new Error(`Resend API failed: ${err.response?.data?.message || err.message}`);
      }
      console.warn('⚠️ Falling back to SMTP chain...');
    }
  }

  // Priority 2: Brevo HTTPS API
  if (brevoApiKey) {
    try {
      const res = await sendViaBrevoApi({ brevoApiKey, from, to, subject, html, user });
      console.log(`✉️ Email dispatched via Brevo API to ${to} (ID: ${res.messageId})`);
      return res;
    } catch (err) {
      console.error('❌ Brevo API dispatch failed:', err.response?.data || err.message);
      if (!user || !pass) {
        throw new Error(`Brevo API failed: ${err.response?.data?.message || err.message}`);
      }
      console.warn('⚠️ Falling back to SMTP chain...');
    }
  }

  if (!user || !pass) {
    console.warn('⚠️ Email credentials not configured');
    throw new Error('Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD (or RESEND_API_KEY) in Render environment variables.');
  }

  const chain = createTransporterChain();
  const errors = [];

  const mailOptions = {
    from,
    to,
    subject,
    html
  };

  for (const item of chain) {
    try {
      const info = await item.transporter.sendMail(mailOptions);
      console.log(`✉️ Email dispatched successfully via [${item.name}] to ${to} (ID: ${info.messageId})`);
      return info;
    } catch (error) {
      console.warn(`⚠️ [${item.name}] dispatch failed: ${error.code || error.message}`);
      
      if (error.code === 'EAUTH' || (error.message && error.message.includes('Invalid login'))) {
        const authMsg = 'Gmail SMTP Authentication Failed. Please ensure you are using a 16-character Google App Password (not your regular Gmail password) with 2-Step Verification enabled.';
        console.error('❌', authMsg);
        throw new Error(authMsg);
      }
      
      errors.push(`${item.name}: ${error.code || error.message}`);
    }
  }

  const isTimeout = errors.some(e => e.includes('ETIMEDOUT') || e.includes('timeout') || e.includes('ECONNREFUSED'));
  let guidance = '';
  if (isTimeout) {
    guidance = ' Render blocks outbound SMTP ports 465 and 587. To fix this on Render, use port 2525 (e.g. Brevo SMTP: smtp-relay.brevo.com on port 2525) or add RESEND_API_KEY in Render environment variables.';
  }

  throw new Error(`Failed to send email. All SMTP transports failed (${errors.join(' | ')}).${guidance}`);
};

// Send report to recipient helper
const sendReportToRecipient = async ({ to, recipientName, relationship, ownerId, ownerName, frequency }) => {
  let emailData;
  const recipientInfo = { name: recipientName, relationship };
  if (frequency === 'daily') {
    emailData = await generateDailySummary(ownerId, to, ownerName, recipientInfo);
  } else if (frequency === 'weekly') {
    emailData = await generateWeeklySummary(ownerId, ownerName, recipientInfo);
  } else {
    emailData = await generateMonthlySummary(ownerId, ownerName, recipientInfo);
  }

  await sendEmail(to, emailData.subject, emailData.html);
  return emailData;
};

module.exports = {
  sendEmail,
  verifyEmailTransporter,
  generateDailySummary,
  generateWeeklySummary,
  generateMonthlySummary,
  generateGroupSummaryEmail,
  generateSettlementReminderEmail,
  sendReportToRecipient
};



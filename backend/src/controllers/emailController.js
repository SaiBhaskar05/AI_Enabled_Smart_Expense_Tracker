const EmailPreference = require('../models/EmailPreference');
const User = require('../models/User');
const {
  sendEmail,
  generateDailySummary,
  generateWeeklySummary,
  generateMonthlySummary,
  sendReportToRecipient
} = require('../services/emailService');

// @desc   Get email preferences
// @route  GET /api/email/preferences
const getPreferences = async (req, res) => {
  try {
    let prefs = await EmailPreference.findOne({ userId: req.user._id });
    if (!prefs) {
      prefs = await EmailPreference.create({ userId: req.user._id, recipients: [] });
    }
    res.json({ success: true, data: { preferences: prefs } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch preferences' });
  }
};

// @desc   Update email preferences
// @route  PUT /api/email/preferences
const updatePreferences = async (req, res) => {
  try {
    const prefs = await EmailPreference.findOneAndUpdate(
      { userId: req.user._id },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, message: 'Preferences updated', data: { preferences: prefs } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update preferences' });
  }
};

// @desc   Add friend/family recipient
// @route  POST /api/email/recipients
const addRecipient = async (req, res) => {
  try {
    const { name, email, relationship, daily, weekly, monthly, active } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    let prefs = await EmailPreference.findOne({ userId: req.user._id });
    if (!prefs) {
      prefs = await EmailPreference.create({ userId: req.user._id, recipients: [] });
    }

    // Check duplicate email
    const duplicate = prefs.recipients.find(r => r.email.toLowerCase() === email.trim().toLowerCase());
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'A recipient with this email already exists' });
    }

    prefs.recipients.push({
      name: name || '',
      email: email.trim().toLowerCase(),
      relationship: relationship || 'Family',
      daily: daily !== undefined ? daily : false,
      weekly: weekly !== undefined ? weekly : true,
      monthly: monthly !== undefined ? monthly : true,
      active: active !== undefined ? active : true
    });

    await prefs.save();
    res.status(201).json({ success: true, message: 'Recipient added successfully', data: { preferences: prefs } });
  } catch (error) {
    console.error('Add recipient error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to add recipient' });
  }
};

// @desc   Update a recipient
// @route  PUT /api/email/recipients/:recipientId
const updateRecipient = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const { name, email, relationship, daily, weekly, monthly, active } = req.body;

    const prefs = await EmailPreference.findOne({ userId: req.user._id });
    if (!prefs) {
      return res.status(404).json({ success: false, message: 'Preferences not found' });
    }

    const recipient = prefs.recipients.id(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    if (name !== undefined) recipient.name = name;
    if (email !== undefined) recipient.email = email.trim().toLowerCase();
    if (relationship !== undefined) recipient.relationship = relationship;
    if (daily !== undefined) recipient.daily = daily;
    if (weekly !== undefined) recipient.weekly = weekly;
    if (monthly !== undefined) recipient.monthly = monthly;
    if (active !== undefined) recipient.active = active;

    await prefs.save();
    res.json({ success: true, message: 'Recipient updated', data: { preferences: prefs } });
  } catch (error) {
    console.error('Update recipient error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update recipient' });
  }
};

// @desc   Delete a recipient
// @route  DELETE /api/email/recipients/:recipientId
const deleteRecipient = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const prefs = await EmailPreference.findOne({ userId: req.user._id });
    if (!prefs) {
      return res.status(404).json({ success: false, message: 'Preferences not found' });
    }

    prefs.recipients.pull({ _id: recipientId });
    await prefs.save();
    res.json({ success: true, message: 'Recipient removed', data: { preferences: prefs } });
  } catch (error) {
    console.error('Delete recipient error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete recipient' });
  }
};

// @desc   Send daily summary manually to owner (and optionally to daily recipients)
// @route  POST /api/email/send-daily
const sendDailySummary = async (req, res) => {
  try {
    const user = req.user;
    const { sendToRecipients } = req.body;
    const { subject, html } = await generateDailySummary(user._id, user.email, user.name);
    await sendEmail(user.email, subject, html);

    let recipientCount = 0;
    if (sendToRecipients) {
      const prefs = await EmailPreference.findOne({ userId: user._id });
      const activeDaily = (prefs?.recipients || []).filter(r => r.active && r.daily);
      for (const r of activeDaily) {
        try {
          await sendReportToRecipient({
            to: r.email,
            recipientName: r.name,
            relationship: r.relationship,
            ownerId: user._id,
            ownerName: user.name,
            frequency: 'daily'
          });
          recipientCount++;
        } catch (e) {
          console.error(`Failed to send daily summary to ${r.email}:`, e.message);
        }
      }
    }

    const msg = recipientCount > 0
      ? `Daily summary sent to ${user.email} and ${recipientCount} family/friend recipient(s)`
      : `Daily summary sent to ${user.email}`;

    res.json({ success: true, message: msg });
  } catch (error) {
    console.error('Send daily email error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send email' });
  }
};

// @desc   Send weekly summary manually
// @route  POST /api/email/send-weekly
const sendWeeklySummary = async (req, res) => {
  try {
    const user = req.user;
    const { sendToRecipients } = req.body;
    const { subject, html } = await generateWeeklySummary(user._id, user.name);
    await sendEmail(user.email, subject, html);

    let recipientCount = 0;
    if (sendToRecipients) {
      const prefs = await EmailPreference.findOne({ userId: user._id });
      const activeWeekly = (prefs?.recipients || []).filter(r => r.active && r.weekly);
      for (const r of activeWeekly) {
        try {
          await sendReportToRecipient({
            to: r.email,
            recipientName: r.name,
            relationship: r.relationship,
            ownerId: user._id,
            ownerName: user.name,
            frequency: 'weekly'
          });
          recipientCount++;
        } catch (e) {
          console.error(`Failed to send weekly summary to ${r.email}:`, e.message);
        }
      }
    }

    const msg = recipientCount > 0
      ? `Weekly summary sent to ${user.email} and ${recipientCount} family/friend recipient(s)`
      : `Weekly summary sent to ${user.email}`;

    res.json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to send email' });
  }
};

// @desc   Send monthly summary manually
// @route  POST /api/email/send-monthly
const sendMonthlySummary = async (req, res) => {
  try {
    const user = req.user;
    const { sendToRecipients } = req.body;
    const { subject, html } = await generateMonthlySummary(user._id, user.name);
    await sendEmail(user.email, subject, html);

    let recipientCount = 0;
    if (sendToRecipients) {
      const prefs = await EmailPreference.findOne({ userId: user._id });
      const activeMonthly = (prefs?.recipients || []).filter(r => r.active && r.monthly);
      for (const r of activeMonthly) {
        try {
          await sendReportToRecipient({
            to: r.email,
            recipientName: r.name,
            relationship: r.relationship,
            ownerId: user._id,
            ownerName: user.name,
            frequency: 'monthly'
          });
          recipientCount++;
        } catch (e) {
          console.error(`Failed to send monthly summary to ${r.email}:`, e.message);
        }
      }
    }

    const msg = recipientCount > 0
      ? `Monthly summary sent to ${user.email} and ${recipientCount} family/friend recipient(s)`
      : `Monthly summary sent to ${user.email}`;

    res.json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to send email' });
  }
};

// @desc   Send instant summary to a specific recipient or arbitrary email
// @route  POST /api/email/send-to-recipient
const sendToRecipient = async (req, res) => {
  try {
    const user = req.user;
    const { recipientId, email, name, relationship, frequency } = req.body;

    let targetEmail = email;
    let targetName = name || '';
    let targetRel = relationship || 'Family';
    let targetFreq = frequency || 'monthly';

    if (recipientId) {
      const prefs = await EmailPreference.findOne({ userId: user._id });
      const found = prefs?.recipients?.id(recipientId);
      if (found) {
        targetEmail = found.email;
        targetName = found.name;
        targetRel = found.relationship;
      }
    }

    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Target email is required' });
    }

    await sendReportToRecipient({
      to: targetEmail,
      recipientName: targetName,
      relationship: targetRel,
      ownerId: user._id,
      ownerName: user.name,
      frequency: targetFreq
    });

    res.json({
      success: true,
      message: `${targetFreq.charAt(0).toUpperCase() + targetFreq.slice(1)} summary successfully sent to ${targetEmail}`
    });
  } catch (error) {
    console.error('Send to recipient error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send email to recipient' });
  }
};

module.exports = {
  getPreferences,
  updatePreferences,
  addRecipient,
  updateRecipient,
  deleteRecipient,
  sendDailySummary,
  sendWeeklySummary,
  sendMonthlySummary,
  sendToRecipient
};


const cron = require('node-cron');
const User = require('../models/User');
const EmailPreference = require('../models/EmailPreference');
const {
  sendEmail,
  generateDailySummary,
  generateWeeklySummary,
  generateMonthlySummary,
  sendReportToRecipient
} = require('./emailService');

// Send daily emails for all users and recipients who have daily preference enabled
const runDailyEmails = async () => {
  console.log('⏰ Running daily email job...');
  try {
    const prefs = await EmailPreference.find({
      $or: [
        { dailySummary: true },
        { 'recipients.active': true, 'recipients.daily': true }
      ]
    });

    for (const pref of prefs) {
      try {
        const user = await User.findById(pref.userId);
        if (!user) continue;

        // Send to owner if enabled
        if (pref.dailySummary) {
          const { subject, html } = await generateDailySummary(user._id, user.email, user.name);
          await sendEmail(user.email, subject, html);
          console.log(`✅ Daily email sent to owner ${user.email}`);
        }

        // Send to active family/friend recipients with daily enabled
        const dailyRecipients = (pref.recipients || []).filter(r => r.active && r.daily);
        for (const recipient of dailyRecipients) {
          try {
            await sendReportToRecipient({
              to: recipient.email,
              recipientName: recipient.name,
              relationship: recipient.relationship,
              ownerId: user._id,
              ownerName: user.name,
              frequency: 'daily'
            });
            console.log(`✅ Daily shared email sent to recipient ${recipient.email} (${recipient.relationship})`);
          } catch (rErr) {
            console.error(`❌ Failed daily recipient email to ${recipient.email}:`, rErr.message);
          }
        }
      } catch (err) {
        console.error(`❌ Failed daily email for user ${pref.userId}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Daily email job error:', error);
  }
};

// Send weekly emails for all users and recipients who have weekly preference enabled
const runWeeklyEmails = async () => {
  console.log('⏰ Running weekly email job...');
  try {
    const prefs = await EmailPreference.find({
      $or: [
        { weeklySummary: true },
        { 'recipients.active': true, 'recipients.weekly': true }
      ]
    });

    for (const pref of prefs) {
      try {
        const user = await User.findById(pref.userId);
        if (!user) continue;

        // Send to owner if enabled
        if (pref.weeklySummary) {
          const { subject, html } = await generateWeeklySummary(user._id, user.name);
          await sendEmail(user.email, subject, html);
          console.log(`✅ Weekly email sent to owner ${user.email}`);
        }

        // Send to active family/friend recipients with weekly enabled
        const weeklyRecipients = (pref.recipients || []).filter(r => r.active && r.weekly);
        for (const recipient of weeklyRecipients) {
          try {
            await sendReportToRecipient({
              to: recipient.email,
              recipientName: recipient.name,
              relationship: recipient.relationship,
              ownerId: user._id,
              ownerName: user.name,
              frequency: 'weekly'
            });
            console.log(`✅ Weekly shared email sent to recipient ${recipient.email} (${recipient.relationship})`);
          } catch (rErr) {
            console.error(`❌ Failed weekly recipient email to ${recipient.email}:`, rErr.message);
          }
        }
      } catch (err) {
        console.error(`❌ Failed weekly email for user ${pref.userId}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Weekly email job error:', error);
  }
};

// Send monthly emails for all users and recipients who have monthly preference enabled
const runMonthlyEmails = async () => {
  console.log('⏰ Running monthly email job...');
  try {
    const prefs = await EmailPreference.find({
      $or: [
        { monthlySummary: true },
        { 'recipients.active': true, 'recipients.monthly': true }
      ]
    });

    for (const pref of prefs) {
      try {
        const user = await User.findById(pref.userId);
        if (!user) continue;

        // Send to owner if enabled
        if (pref.monthlySummary) {
          const { subject, html } = await generateMonthlySummary(user._id, user.name);
          await sendEmail(user.email, subject, html);
          console.log(`✅ Monthly email sent to owner ${user.email}`);
        }

        // Send to active family/friend recipients with monthly enabled
        const monthlyRecipients = (pref.recipients || []).filter(r => r.active && r.monthly);
        for (const recipient of monthlyRecipients) {
          try {
            await sendReportToRecipient({
              to: recipient.email,
              recipientName: recipient.name,
              relationship: recipient.relationship,
              ownerId: user._id,
              ownerName: user.name,
              frequency: 'monthly'
            });
            console.log(`✅ Monthly shared email sent to recipient ${recipient.email} (${recipient.relationship})`);
          } catch (rErr) {
            console.error(`❌ Failed monthly recipient email to ${recipient.email}:`, rErr.message);
          }
        }
      } catch (err) {
        console.error(`❌ Failed monthly email for user ${pref.userId}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Monthly email job error:', error);
  }
};

const initScheduler = () => {
  // Daily at 8:00 PM
  cron.schedule('0 20 * * *', runDailyEmails, { timezone: 'Asia/Kolkata' });

  // Weekly on Sunday at 9:00 AM
  cron.schedule('0 9 * * 0', runWeeklyEmails, { timezone: 'Asia/Kolkata' });

  // Monthly on 1st at 9:00 AM
  cron.schedule('0 9 1 * *', runMonthlyEmails, { timezone: 'Asia/Kolkata' });

  console.log('📅 Email scheduler initialized with multi-recipient dispatch');
};

module.exports = { initScheduler, runDailyEmails, runWeeklyEmails, runMonthlyEmails };


const axios = require('axios');

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

const ruleBasedPredict = (text) => {
  const lower = text.toLowerCase();
  
  const rules = [
    { keywords: ['grocery', 'supermarket', 'food', 'dinner', 'lunch', 'breakfast', 'pizza', 'burger', 'restaurant', 'cafe', 'coffee', 'zomato', 'swiggy', 'blinkit', 'zepto', 'milk', 'vegetable', 'fruit', 'snack', 'dosa', 'starbucks', 'kitchen'], category: 'Food' },
    { keywords: ['uber', 'ola', 'rapido', 'cab', 'taxi', 'flight', 'airline', 'train', 'metro', 'bus', 'fuel', 'petrol', 'diesel', 'parking', 'toll', 'irctc', 'auto', 'ride'], category: 'Travel' },
    { keywords: ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'dress', 'shirt', 'pants', 'electronics', 'laptop', 'phone', 'mall', 'shopping', 'store', 'zara', 'h&m', 'purchase'], category: 'Shopping' },
    { keywords: ['electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'recharge', 'mobile', 'bill', 'bescom', 'tata play', 'dth', 'utility'], category: 'Utilities' },
    { keywords: ['doctor', 'hospital', 'medicine', 'pharmacy', 'apollo', 'pharmeasy', 'test', 'clinic', 'dentist', 'health', 'fitness', 'gym', 'medical'], category: 'Health' },
    { keywords: ['course', 'book', 'tuition', 'fee', 'school', 'college', 'udemy', 'coursera', 'exam', 'stationery', 'education', 'learning'], category: 'Education' },
    { keywords: ['netflix', 'spotify', 'movie', 'cinema', 'pvr', 'hotstar', 'prime', 'game', 'gaming', 'concert', 'ticket', 'entertainment', 'show', 'theater'], category: 'Entertainment' },
    { keywords: ['emi', 'loan', 'credit card bill', 'mortgage', 'installment', 'lic', 'insurance'], category: 'EMI/Loans' },
    { keywords: ['mutual fund', 'stock', 'sip', 'zerodha', 'groww', 'crypto', 'gold', 'investment', 'shares', 'bonds'], category: 'Investments' }
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return { category: rule.category, confidence: 0.90, source: 'rule' };
    }
  }

  return { category: 'Other', confidence: 0.60, source: 'fallback' };
};

// @desc   Get ML category prediction
// @route  POST /api/ml/predict
const predict = async (req, res) => {
  try {
    const { description } = req.body;
    if (!description || description.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Description too short for prediction' });
    }

    const trimmed = description.trim();

    try {
      const response = await axios.post(`${ML_API_URL}/predict`, 
        { description: trimmed },
        { timeout: 3000 }
      );

      return res.json({
        success: true,
        data: {
          ...response.data,
          source: 'ml'
        }
      });
    } catch (mlErr) {
      console.warn('ML Python service unreachable, using rule-based predictor:', mlErr.message);
      const fallbackPrediction = ruleBasedPredict(trimmed);
      return res.json({
        success: true,
        data: fallbackPrediction
      });
    }
  } catch (error) {
    console.error('Prediction controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to predict category'
    });
  }
};

// @desc   ML service health check
// @route  GET /api/ml/health
const mlHealth = async (req, res) => {
  try {
    const response = await axios.get(`${ML_API_URL}/health`, { timeout: 3000 });
    res.json({ success: true, data: { status: 'online', details: response.data } });
  } catch {
    res.json({ success: true, data: { status: 'offline', fallback: 'rule-based' } });
  }
};

module.exports = { predict, mlHealth };


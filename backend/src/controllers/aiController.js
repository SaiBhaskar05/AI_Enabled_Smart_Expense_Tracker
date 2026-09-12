const {
  generateCopilotChatResponse,
  generateFinancialInsights,
  buildUserFinancialContext
} = require('../services/geminiService');

/**
 * @desc    Chat with Gemini AI Financial Copilot
 * @route   POST /api/ai/copilot/chat
 * @access  Private
 */
const copilotChat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const reply = await generateCopilotChatResponse({
      userId: req.user._id,
      userName: req.user.name,
      userMessage: message.trim(),
      conversationHistory: Array.isArray(history) ? history : []
    });

    res.status(200).json({
      success: true,
      data: {
        reply,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in copilotChat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process Copilot response',
      error: error.message
    });
  }
};

/**
 * @desc    Get AI Financial Health Insights
 * @route   GET /api/ai/copilot/insights
 * @access  Private
 */
const getFinancialInsights = async (req, res) => {
  try {
    const insights = await generateFinancialInsights(req.user._id, req.user.name);

    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error in getFinancialInsights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial insights',
      error: error.message
    });
  }
};

/**
 * @desc    Get User Financial Snapshot Summary
 * @route   GET /api/ai/copilot/context
 * @access  Private
 */
const getFinancialContext = async (req, res) => {
  try {
    const context = await buildUserFinancialContext(req.user._id);

    res.status(200).json({
      success: true,
      data: context
    });
  } catch (error) {
    console.error('Error in getFinancialContext:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial context',
      error: error.message
    });
  }
};

module.exports = {
  copilotChat,
  getFinancialInsights,
  getFinancialContext
};

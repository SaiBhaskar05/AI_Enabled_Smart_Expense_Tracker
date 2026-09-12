import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Bot, X, Send, TrendingUp, Wallet, PieChart,
  ShieldAlert, RefreshCw, ChevronRight, User, HelpCircle, ArrowUp
} from 'lucide-react';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/copilot.css';

export const FinancialCopilotModal = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 280);
  };

  // Auto-collapse launcher button into compact icon after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCollapsed(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Initial welcome greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          sender: 'ai',
          text: `Hi **${user?.name || 'there'}**! I'm your **AI Financial Copilot**.\n\nI have real-time visibility into your personal ledger, budgets, and spending habits. Ask me anything about your finances, or try one of the suggestions below!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [user]);

  // Fetch financial context snapshot when opening drawer
  useEffect(() => {
    if (isOpen) {
      fetchContext();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchContext = async () => {
    try {
      const res = await aiAPI.getContext();
      if (res.data?.success) {
        setContext(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load copilot financial context:', e);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send conversation history to backend for context-grounded response
      const historyPayload = messages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await aiAPI.chat(query, historyPayload);
      if (res.data?.success) {
        const aiMsg = {
          id: Date.now() + 1,
          sender: 'ai',
          text: res.data.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error('Copilot Chat Error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: `I encountered an issue analyzing your request. Please try again or ask another question.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const starterPrompts = [
    { label: 'Top Spending', query: 'Where did I spend the most money this month?' },
    { label: 'Highest Expense', query: 'What is my highest recorded expense?' },
    { label: '50/30/20 Rule', query: 'Explain the 50/30/20 budgeting rule' },
    { label: 'Budget Health', query: 'Review my active budgets and let me know if I am overspending.' },
    { label: 'How to Save', query: 'What are 5 ways I can boost my savings?' },
    { label: 'Recent Transactions', query: 'Show my latest 5 transactions' },
    { label: 'Payment Modes', query: 'Breakdown my expenses by payment method' },
    { label: 'Month Comparison', query: 'Compare my spending this month to last month.' }
  ];

  // Simple clean markdown formatter
  const renderFormattedText = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Header 3 / 4
      if (line.startsWith('### ')) {
        return <h3 key={idx}>{formatInlineBold(line.replace('### ', ''))}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={idx}>{formatInlineBold(line.replace('#### ', ''))}</h4>;
      }
      // Bullet list item
      if (line.startsWith('• ') || line.startsWith('* ') || line.startsWith('- ')) {
        return (
          <div key={idx} style={{ display: 'flex', gap: '8px', margin: '3px 0' }}>
            <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>•</span>
            <span>{formatInlineBold(line.replace(/^([•*-])\s+/, ''))}</span>
          </div>
        );
      }
      // Numbered list item
      if (/^\d+\.\s+/.test(line)) {
        const num = line.match(/^(\d+\.)\s+/)[1];
        const content = line.replace(/^\d+\.\s+/, '');
        return (
          <div key={idx} style={{ display: 'flex', gap: '8px', margin: '4px 0' }}>
            <span style={{ color: '#6d28d9', fontWeight: '800' }}>{num}</span>
            <span>{formatInlineBold(content)}</span>
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} style={{ height: '6px' }} />;
      }
      return <p key={idx}>{formatInlineBold(line)}</p>;
    });
  };

  const formatInlineBold = (str) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Launcher Button - Animates smoothly between pill and compact round icon */}
      <button
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`copilot-floating-btn ${isCollapsed && !isHovered ? 'collapsed' : ''}`}
        title="Open AI Financial Copilot"
        aria-label="Open AI Financial Copilot"
      >
        <div className="copilot-sparkle-dot" />
        <Sparkles size={19} />
        <span className="copilot-btn-label">AI Copilot</span>
      </button>

      {/* Slide-over Drawer / Modal */}
      {isOpen && (
        <div className={`copilot-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
          <div className={`copilot-drawer ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="copilot-header">
              <div className="copilot-header-brand">
                <div className="copilot-icon-badge">
                  <Bot size={22} />
                </div>
                <div className="copilot-title-box">
                  <h3>
                    <span>Financial Copilot</span>
                    <span className="copilot-ai-badge">AI Assistant</span>
                  </h3>
                  <div className="copilot-status-indicator">
                    <span className="copilot-status-dot" />
                    <span>Real-time Financial Snapshot Active</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={fetchContext}
                  className="copilot-close-btn"
                  title="Refresh financial context"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  onClick={handleClose}
                  className="copilot-close-btn"
                  title="Close Copilot"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Context Summary Bar */}
            {context && (
              <div className="copilot-context-bar">
                <div className="copilot-context-item">
                  <Wallet size={14} />
                  <span>{context.currentMonth}: <strong>₹{Number(context.currentTotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></span>
                </div>
                <div className="copilot-context-item">
                  <PieChart size={14} />
                  <span>Top: <strong>{context.categoryBreakdown?.[0]?.category || 'None'}</strong></span>
                </div>
                <div className="copilot-context-item">
                  <TrendingUp size={14} />
                  <span>{context.transactionCountThisMonth} txns</span>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="copilot-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`copilot-msg-wrapper ${msg.sender}`}>
                  <div className={`copilot-msg-avatar ${msg.sender}`}>
                    {msg.sender === 'user' ? <User size={15} /> : <Sparkles size={15} />}
                  </div>
                  <div className={`copilot-msg-bubble ${msg.sender}`}>
                    {renderFormattedText(msg.text)}
                    <div
                      className="copilot-msg-time"
                      style={{
                        fontSize: '0.675rem',
                        opacity: 0.75,
                        marginTop: '6px',
                        textAlign: msg.sender === 'user' ? 'right' : 'left'
                      }}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="copilot-msg-wrapper ai">
                  <div className="copilot-msg-avatar ai">
                    <Sparkles size={15} />
                  </div>
                  <div className="copilot-typing">
                    <span className="copilot-dot" />
                    <span className="copilot-dot" />
                    <span className="copilot-dot" />
                    <span style={{ fontSize: '0.75rem', color: '#6d28d9', fontWeight: 600, marginLeft: '6px' }}>
                      AI is analyzing your spending...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Starter Prompt Chips */}
            <div className="copilot-prompt-starters">
              {starterPrompts.map((p, i) => (
                <button
                  key={i}
                  className="copilot-chip-btn"
                  onClick={() => handleSendMessage(p.query)}
                  disabled={isLoading}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="copilot-input-area">
              <form
                className="copilot-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  className="copilot-input-field"
                  placeholder="Ask about your budget, savings, or spending..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="copilot-send-btn"
                  disabled={!inputValue.trim() || isLoading}
                  title="Send message"
                >
                  <ArrowUp size={18} />
                </button>
              </form>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

import React from 'react';

export const BudgetCard = ({ budget }) => {
  const percentage = budget.percentage || 0;
  const spent = budget.spent || 0;
  const amount = budget.amount || 0;

  const formatCurrency = (val) =>
    `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <div className="budget-card">
      <div className="budget-header">
        <h4>{budget.category}</h4>
        <span className={`budget-status ${budget.isOverBudget ? 'over' : ''}`}>
          {percentage}%
        </span>
      </div>
      <div className="budget-progress">
        <div className="progress-bar">
          <div 
            className={`progress-fill ${budget.isOverBudget ? 'over' : ''}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
      <div className="budget-footer">
        <span className="spent">{formatCurrency(spent)}</span>
        <span className="limit">of {formatCurrency(amount)}</span>
      </div>
    </div>
  );
};

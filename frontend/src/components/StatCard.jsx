import React from 'react';

export const StatCard = ({ icon: Icon, label, value, change, positive, iconColor = '#7c5cfc', iconBg = '#ede9ff' }) => {
  return (
    <div className="stat-card clay-card">
      <div className="stat-icon-wrapper" style={{ background: iconBg }}>
        {typeof Icon === 'function' || typeof Icon === 'object' ? (
          React.isValidElement(Icon) ? Icon : <Icon size={24} color={iconColor} />
        ) : (
          <span style={{ fontSize: '1.5rem' }}>{Icon}</span>
        )}
      </div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <h3 className="stat-value">{value}</h3>
        {change && (
          <p className={`stat-change ${positive ? 'positive' : 'negative'}`}>
            {change}
          </p>
        )}
      </div>
    </div>
  );
};


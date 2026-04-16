import React from 'react';
import './KpiCard.css';

export default function KpiCard({ title, value, label, detail, color, onClick }) {
    return (
        <div 
            className="metric-card glass-card" 
            style={{ borderBottom: `4px solid ${color || 'var(--color-primary)'}` }}
            onClick={onClick}
        >
            <div className="metric-value" style={{ color: color }}>
                {value}
            </div>
            <div className="metric-label">{label}</div>
            <div className="metric-detail">{detail}</div>
            <button className="metric-btn">Details anzeigen</button>
        </div>
    );
}

import React from 'react';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, Map,ShieldCheck, Bot, LogOut, RefreshCw } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ activeTab, setActiveTab }) {
    const { activeUtility, setActiveUtility, logout, fetchKPIs, kpis } = useApp();

    const utilities = ["Alle Sparten", "Gas", "Wasser", "Strom"];

    const navItems = [
        { id: 'analysis', label: 'Strategische Analyse', icon: LayoutDashboard },
        { id: 'map', label: 'Netz-Karte', icon: Map },
        { id: 'compliance', label: 'Compliance & Daten', icon: ShieldCheck },
        { id: 'chat', label: 'KI -Assistent', icon: Bot },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <img src="https://img.icons8.com/isometric/100/factory.png" alt="Logo" width="40" />
                <div className="brand-text">
                    <h3>STADTWERKE X</h3>
                    <span>Intelligence Platform</span>
                </div>
            </div>

            <div className="sidebar-section">
                <p className="section-label">System-Steuerung</p>
                <div className="utility-selector">
                    <label>Sparte auswählen</label>
                    <select 
                        value={activeUtility} 
                        onChange={(e) => setActiveUtility(e.target.value)}
                        className="premium-select"
                    >
                        {utilities.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <button 
                        key={item.id}
                        className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(item.id)}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-status">
                <p className="section-label">KI-Training & Status</p>
                <div className="status-indicator success">
                    <div className="pulse"></div>
                    <span>🤖 LLM Einsatzbereit</span>
                </div>
                {kpis && (
                    <div className="kb-info">
                        Daten im Speicher: {kpis.total || 0}
                    </div>
                )}
                <button className="btn-refresh" onClick={fetchKPIs}>
                    <RefreshCw size={14} />
                    KI-Speicher aktualisieren
                </button>
            </div>

            <button className="btn-logout" onClick={logout}>
                <LogOut size={18} />
                <span>Abmelden</span>
            </button>
        </aside>
    );
}

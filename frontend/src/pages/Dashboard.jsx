import React, { useState } from 'react';
import Sidebar from '../components/ui/Sidebar';
import KpiCard from '../components/ui/KpiCard';
import { useApp } from '../context/AppContext';
import StrategicAnalysis from '../tabs/StrategicAnalysis';
import NetworkMap from '../tabs/NetworkMap';
import ComplianceAudit from '../tabs/ComplianceAudit';
import AiAssistant from '../tabs/AiAssistant';
import './Dashboard.css';

export default function Dashboard() {
    const { kpis, activeUtility, activeTab, setActiveTab } = useApp();

    const handleKpiClick = (tabId) => {
        setActiveTab(tabId);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'analysis': return <StrategicAnalysis />;
            case 'map': return <NetworkMap />;
            case 'compliance': return <ComplianceAudit />;
            case 'chat': return <AiAssistant />;
            default: return <StrategicAnalysis />;
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h1>STADTWERKE X</h1>
                    <p>Plattform für Infrastruktur-Analyse, Risikomanagement und Lifecycle-Planung.</p>
                </header>

                <div className="kpi-grid">
                    <KpiCard 
                        title="Gesamtbestand" 
                        value={kpis?.total || '0'} 
                        label="Anschlüsse" 
                        detail="Gesamtbestand"
                        onClick={() => handleKpiClick('analysis')}
                    />
                    <KpiCard 
                        title="Ersatzbedarf" 
                        value={kpis?.critical || '0'} 
                        label="Kritisch" 
                        detail="Sofortiger Handlungsbedarf"
                        color="var(--color-danger)"
                        onClick={() => handleKpiClick('map')}
                    />
                    <KpiCard 
                        title="Überalterung" 
                        value={kpis?.over_lifespan || '0'} 
                        label="Über Nutzungsdauer" 
                        detail="Technische Nutzungsdauer erreicht"
                        color="var(--color-warning)"
                        onClick={() => handleKpiClick('map')}
                    />
                    <KpiCard 
                        title="Infrastruktur" 
                        value={kpis?.unsuitable || '0'} 
                        label="Modernisierung" 
                        detail="Anpassung für WP/EV nötig"
                        onClick={() => handleKpiClick('map')}
                    />
                </div>

                <div className="tab-container glass-card">
                    <div className="tab-navigation">
                        <button 
                            className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analysis')}
                        >
                            📉 Strategische Analyse
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
                            onClick={() => setActiveTab('map')}
                        >
                            🗺️ Netz-Karte
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
                            onClick={() => setActiveTab('compliance')}
                        >
                            🛡️ Compliance & Daten
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                            onClick={() => setActiveTab('chat')}
                        >
                            🤖 KI -Assistent
                        </button>
                    </div>

                    <div className="tab-content">
                        {renderTabContent()}
                    </div>
                </div>
            </main>
        </div>
    );
}

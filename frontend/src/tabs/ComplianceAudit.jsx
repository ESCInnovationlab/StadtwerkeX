import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import './Tabs.css';

export default function ComplianceAudit() {
    const { activeUtility, viewAssetOnMap } = useApp();
    const [auditData, setAuditData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAudit = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`http://localhost:8000/api/assets?utility=${activeUtility}`);
                // Filter for missing docs or high risk for the audit view
                const criticalAssets = response.data.records.filter(r => 
                    r.Dokumente === 'Lückenhaft' || r.Risiko === 'Hoch'
                );
                setAuditData(criticalAssets);
            } catch (err) {
                console.error("Audit fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAudit();
    }, [activeUtility]);

    if (loading) {
        return <div className="loading-state">Prüfe Dokumentenstatus...</div>;
    }

    return (
        <div className="tab-pane">
            <header className="tab-header">
                <h3>🛡️ Compliance-Audit & Dokumentenprüfung</h3>
                <p>Anzeige von Anschlüssen mit fehlender Dokumentation oder kritischem Zustand ({activeUtility}).</p>
            </header>

            <div className="asset-list-section glass-card">
                <div className="table-wrapper">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Kundenname</th>
                                <th>Sparte</th>
                                <th>Status</th>
                                <th>Dokumentation</th>
                                <th>Straße</th>
                                <th>Aktion</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditData.map((r, i) => (
                                <tr key={i}>
                                    <td>{r.Kundenname}</td>
                                    <td>
                                        <span className={`badge ${r.Sparte?.toLowerCase()}`}>
                                            {r.Sparte}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge-risk ${r.Risiko === 'Hoch' ? 'high' : 'medium'}`}>
                                            {r.Risiko}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ color: r.Dokumente === 'Lückenhaft' ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
                                            {r.Dokumente === 'Lückenhaft' ? '⚠️ Unterlagen fehlen' : '✅ Vollständig'}
                                        </span>
                                    </td>
                                    <td>{r.Straße} {r.Hausnummer}</td>
                                    <td>
                                        <button 
                                            className="btn-table" 
                                            onClick={() => viewAssetOnMap(r)}
                                            title="Auf Karte anzeigen"
                                        >
                                            👁️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {auditData.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                        Keine Compliance-Lücken für die gewählte Sparte gefunden.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import axios from 'axios';
import './Tabs.css';

export default function StrategicAnalysis() {
    const { activeUtility, viewAssetOnMap } = useApp();
    const [records, setRecords] = useState([]);
    const [summary, setSummary] = useState({ age: [], risk: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`http://localhost:8000/api/assets?utility=${activeUtility}`);
                setRecords(response.data.records || []);
                setSummary(response.data.summary || { age: [], risk: [] });
            } catch (err) {
                console.error("Error fetching dynamic assets:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [activeUtility]);

    if (loading) {
        return <div className="loading-state">Lade Infrastrukturdaten...</div>;
    }

    return (
        <div className="tab-pane">
            <header className="tab-header">
                <h3>📊 Strategische Übersicht: {activeUtility}</h3>
                <p>Analyse basierend auf {records.length === 100 ? 'den aktuellsten 100' : records.length} Datensätzen.</p>
            </header>

            <div className="chart-grid">
                <div className="chart-card glass-card">
                    <h4>Altersstruktur der Infrastruktur</h4>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={summary.age}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                                <Bar dataKey="value" name="Anzahl" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card glass-card">
                    <h4>Risiko-Verteilung (Asset-Zustand)</h4>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={summary.risk}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {summary.risk.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="asset-list-section glass-card">
                <h4>📋 Anschluss-Verzeichnis</h4>
                <div className="table-wrapper">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Kundenname</th>
                                <th>Nr.</th>
                                <th>Sparte</th>
                                <th>Straße</th>
                                <th>Risiko</th>
                                <th>Alter</th>
                                <th>Aktion</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r, i) => (
                                <tr key={i}>
                                    <td>{r.Kundenname || 'Unbekannt'}</td>
                                    <td>{r.Kundennummer || '-'}</td>
                                    <td>
                                        <span className={`badge ${r.Sparte?.toLowerCase()}`}>
                                            {r.Sparte}
                                        </span>
                                    </td>
                                    <td>{r.Straße} {r.Hausnummer}</td>
                                    <td>
                                        <span className={`badge-risk ${r.Risiko === 'Hoch' ? 'high' : r.Risiko === 'Mittel' ? 'medium' : 'low'}`}>
                                            {r.Risiko}
                                        </span>
                                    </td>
                                    <td>{r.Alter} J.</td>
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
                            {records.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                        Keine Daten für diese Sparte gefunden.
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

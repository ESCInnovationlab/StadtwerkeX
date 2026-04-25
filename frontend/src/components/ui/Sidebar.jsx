import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { LogOut, RefreshCw } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar() {
    const { activeUtility, setActiveUtility, logout, fetchKPIs, kpis } = useApp();
    const { t } = useLanguage();

    const utilities = [
        { value: 'Alle Sparten', label: t('sidebar.allUtilities') },
        { value: 'Gas',          label: t('sidebar.gas') },
        { value: 'Wasser',       label: t('sidebar.water') },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <img src="https://img.icons8.com/isometric/100/factory.png" alt="Logo" width="38" />
                <div className="brand-text">
                    <h3>STADTWERKE X</h3>
                    <span>{t('home.platformLabel')}</span>
                </div>
            </div>

            <div className="sidebar-section">
                <p className="section-label">{t('sidebar.systemControl')}</p>
                <div className="utility-selector">
                    <label>{t('sidebar.selectUtility')}</label>
                    <select
                        value={activeUtility}
                        onChange={(e) => setActiveUtility(e.target.value)}
                        className="premium-select"
                    >
                        {utilities.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="sidebar-status" style={{ marginTop: 'auto' }}>
                <p className="section-label">{t('sidebar.aiStatus')}</p>
                <div className="status-indicator success">
                    <div className="pulse"></div>
                    <span>{t('sidebar.llmReady')}</span>
                </div>
                {kpis && (
                    <div className="kb-info">
                        {t('sidebar.dataInMemory')}: {kpis.total || 0}
                    </div>
                )}
                <button className="btn-refresh" onClick={fetchKPIs}>
                    <RefreshCw size={13} />
                    {t('sidebar.updateMemory')}
                </button>
            </div>

            <button className="btn-logout" onClick={logout} style={{ marginTop: '12px' }}>
                <LogOut size={16} />
                <span>{t('sidebar.signOut')}</span>
            </button>
        </aside>
    );
}

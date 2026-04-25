import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { fmtNum, fmtAge } from '../utils/fmt';
import StrategicAnalysis from '../tabs/StrategicAnalysis';
import NetworkMap from '../tabs/NetworkMap';
import AiAssistant from '../tabs/AiAssistant';
import { Zap, X } from 'lucide-react';
import '../components/ui/PageKpiGrid.css';
import './SubPage.css';

/* ─── Building Type Breakdown Modal ─────────────────────────────────────────── */
function BuildingTypeModal({ d, totalBuildings, onClose }) {
    useEffect(() => {
        const handle = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handle);
        return () => document.removeEventListener('keydown', handle);
    }, [onClose]);

    const items = [
        { label: 'Residential',      value: d?.haushalt,      sub: 'Wohngebäude' },
        { label: 'Office & Admin',   value: d?.buero,         sub: 'Büro- und Verwaltungsgebäude' },
        { label: 'Industry & Trade', value: d?.industrie,     sub: 'Industrie- und Handwerksbetriebe' },
        { label: 'Community',        value: d?.gemeinschaft,  sub: 'Öffentliche & soziale Gebäude' },
        { label: 'Schools',          value: d?.schule,        sub: 'Schul- und Bildungsgebäude' },
        { label: 'Hotels',           value: d?.hotel,         sub: 'Beherbergungsbetriebe' },
        { label: 'Unclassified',     value: d?.unclassified,  sub: 'No building type assigned' },
    ];

    return (
        <div className="btype-overlay" onClick={onClose}>
            <div className="btype-modal" onClick={e => e.stopPropagation()}>
                <div className="btype-header">
                    <div>
                        <h2 className="btype-title">Building Type Breakdown</h2>
                        <p className="btype-subtitle">
                            {fmtNum(totalBuildings)} total properties · some properties have multiple types
                        </p>
                    </div>
                    <button className="btype-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <div className="btype-grid">
                    {items.map(item => (
                        <div key={item.label} className="btype-card">
                            <div className="btype-value">{fmtNum(item.value)}</div>
                            <div className="btype-label">{item.label}</div>
                            <div className="btype-sub">{item.sub}</div>
                        </div>
                    ))}
                </div>

                <p className="btype-note">
                    Note: Some properties have multiple building types assigned. Counts may overlap.
                </p>
            </div>
        </div>
    );
}

/* ─── Main page ─────────────────────────────────────────────────────────────── */
export default function AnschlussePage() {
    const { kpis, detailedKpis, activeUtility } = useApp();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('analysis');
    const [mapFilter, setMapFilter] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const d = detailedKpis?.anschluesse;
    const p = 'pages.anschluesse';

    const tabs = [
        { id: 'analysis', label: t('tabs.strategicAnalysis') },
        { id: 'map',      label: t('tabs.networkMap') },
        { id: 'chat',     label: t('tabs.aiAssistant') },
    ];

    const total          = d?.total ?? kpis?.total;
    const totalBuildings = (d?.msh ?? 0) + (d?.msh_nein ?? 0);
    const showGasPressure = activeUtility === 'Gas';

    const goToMap = (filter) => { setMapFilter(filter); setActiveTab('map'); };

    const renderContent = () => {
        switch (activeTab) {
            case 'analysis': return <StrategicAnalysis />;
            case 'map':      return <NetworkMap filterConfig={mapFilter} />;
            case 'chat':     return <AiAssistant />;
            default:         return <StrategicAnalysis />;
        }
    };

    return (
        <div className="subpage">

            {/* ── Page header ──────────────────────────────────────────── */}
            <div className="page-header">
                <div className="page-header-top">
                    <div>
                        <div className="subpage-breadcrumb">
                            <Zap size={13} /> {t(`${p}.breadcrumb`)}
                        </div>
                        <h1>{t(`${p}.title`)}</h1>
                        <p>{t(`${p}.desc`)}</p>
                    </div>
                    <div className="page-kpi-badge">
                        <span className="kpi-value">{fmtNum(total)}</span>
                        <span className="kpi-sublabel">{t(`${p}.badgeLabel`)}</span>
                    </div>
                </div>
            </div>

            {/* ── Row 1: 4 cards ───────────────────────────────────────── */}
            <div className="pkpi-grid" style={{ '--col-count': 4 }}>
                <div className="pkpi-card pkpi-clickable"
                    onClick={() => goToMap({ label: 'All Connections' })}>
                    <div className="pkpi-value">{fmtNum(total)}</div>
                    <div className="pkpi-label">{t(`${p}.kpis.total.label`)}</div>
                    <div className="pkpi-sub">{t(`${p}.kpis.total.sub`)}</div>
                    <div className="pkpi-map-hint">Karte →</div>
                </div>

                <div className="pkpi-card pkpi-clickable"
                    onClick={() => goToMap({ sparte: 'Wasser', label: 'Water Connections' })}>
                    <div className="pkpi-value">{fmtNum(d?.wasser)}</div>
                    <div className="pkpi-label">{t(`${p}.kpis.wasser.label`)}</div>
                    <div className="pkpi-sub">
                        {d?.total ? Math.round(100 * d.wasser / d.total) : '—'}% {t(`${p}.kpis.wasser.sub`)}
                    </div>
                    <div className="pkpi-map-hint">Karte →</div>
                </div>

                <div className="pkpi-card pkpi-clickable"
                    onClick={() => goToMap({ sparte: 'Gas', label: 'Gas Connections' })}>
                    <div className="pkpi-value">{fmtNum(d?.gas)}</div>
                    <div className="pkpi-label">{t(`${p}.kpis.gas.label`)}</div>
                    <div className="pkpi-sub">
                        {d?.total ? Math.round(100 * d.gas / d.total) : '—'}% {t(`${p}.kpis.gas.sub`)}
                    </div>
                    <div className="pkpi-map-hint">Karte →</div>
                </div>

                <div className="pkpi-card">
                    <div className="pkpi-value">{fmtAge(d?.avg_age)}</div>
                    <div className="pkpi-label">{t(`${p}.kpis.avgAge.label`)}</div>
                    <div className="pkpi-sub">{t(`${p}.kpis.avgAge.sub`)}</div>
                </div>
            </div>

            {/* ── Row 2: 3 cards ───────────────────────────────────────── */}
            <div className="pkpi-grid" style={{ '--col-count': 3 }}>
                {/* Total Buildings — opens modal */}
                <div className="pkpi-card pkpi-clickable"
                    onClick={() => setModalOpen(true)}>
                    <div className="pkpi-value">{fmtNum(totalBuildings)}</div>
                    <div className="pkpi-label">{t(`${p}.kpis.totalBuildings.label`)}</div>
                    <div className="pkpi-sub">{t(`${p}.kpis.totalBuildings.sub`)}</div>
                    <div className="pkpi-map-hint">↗ View breakdown</div>
                </div>

                <div className="pkpi-card">
                    <div className="pkpi-value">{fmtNum(d?.msh)}</div>
                    <div className="pkpi-label">{t(`${p}.kpis.msh.label`)}</div>
                    <div className="pkpi-sub">{t(`${p}.kpis.msh.sub`)}</div>
                </div>

                <div className="pkpi-card">
                    <div className="pkpi-value">{fmtNum(d?.msh_nein)}</div>
                    <div className="pkpi-label">{t(`${p}.kpis.singleUtility.label`)}</div>
                    <div className="pkpi-sub">{t(`${p}.kpis.singleUtility.sub`)}</div>
                </div>
            </div>

            {/* ── Gas Pressure (Gas utility only, fade in/out) ─────────── */}
            <div className={`anschluss-pressure-section${showGasPressure ? ' anschluss-pressure-section--visible' : ''}`}>
                <div className="subpage-section-divider">
                    <span>{t('lang') === 'de' ? 'Druckstufen Gas' : 'Gas Pressure Levels'}</span>
                </div>
                <div className="pkpi-grid" style={{ '--col-count': 2, marginBottom: 0 }}>
                    <div className="pkpi-card pkpi-clickable"
                        onClick={() => goToMap({ sparte: 'Gas', label: 'Gas Medium Pressure (MD)' })}>
                        <div className="pkpi-value">{fmtNum(d?.gas_md)}</div>
                        <div className="pkpi-label">{t(`${p}.kpis.gasMd.label`)}</div>
                        <div className="pkpi-sub">{t(`${p}.kpis.gasMd.sub`)}</div>
                        <div className="pkpi-map-hint">Karte →</div>
                    </div>
                    <div className="pkpi-card pkpi-clickable"
                        onClick={() => goToMap({ sparte: 'Gas', label: 'Gas Low Pressure (ND)' })}>
                        <div className="pkpi-value">{fmtNum(d?.gas_nd)}</div>
                        <div className="pkpi-label">{t(`${p}.kpis.gasNd.label`)}</div>
                        <div className="pkpi-sub">{t(`${p}.kpis.gasNd.sub`)}</div>
                        <div className="pkpi-map-hint">Karte →</div>
                    </div>
                </div>
            </div>

            {/* ── Tab container ─────────────────────────────────────────── */}
            <div className="tab-container glass-card">
                <div className="tab-navigation">
                    {tabs.map(tab => (
                        <button key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}>
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className={`tab-content${activeTab === 'map' ? ' tab-content--map' : ''}`}>
                    {renderContent()}
                </div>
            </div>

            {/* ── Modal ─────────────────────────────────────────────────── */}
            {modalOpen && (
                <BuildingTypeModal
                    d={d}
                    totalBuildings={totalBuildings}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </div>
    );
}

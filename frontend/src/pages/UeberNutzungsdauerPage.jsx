import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { fmtNum, fmtAge } from '../utils/fmt';
import NetworkMap from '../tabs/NetworkMap';
import StrategicAnalysis from '../tabs/StrategicAnalysis';
import AiAssistant from '../tabs/AiAssistant';
import PageKpiGrid from '../components/ui/PageKpiGrid';
import { Clock } from 'lucide-react';
import './SubPage.css';

export default function UeberNutzungsdauerPage() {
    const { kpis, detailedKpis, activeUtility } = useApp();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('map');
    const [mapFilter, setMapFilter] = useState(null);
    const d = detailedKpis?.ueber_nutzungsdauer;
    const p = 'pages.renewal';

    const tabs = [
        { id: 'map', label: t('tabs.networkMap') },
        { id: 'analysis', label: t('tabs.strategicAnalysis') },
        { id: 'chat', label: t('tabs.aiAssistant') },
    ];

    const showWasser = activeUtility !== 'Gas';
    const showGas = activeUtility !== 'Wasser';
    const primaryValue = d?.over_lifespan ?? kpis?.over_lifespan;

    const goToMap = (filter) => {
        setMapFilter(filter);
        setActiveTab('map');
    };

    const kpiItems = [
        {
            label: t(`${p}.kpis.over.label`),
            value: fmtNum(primaryValue),
            sub: t(`${p}.kpis.over.sub`),
            accent: '#f59e0b', glow: 'warning',
            onClick: () => goToMap({ overLifespan: true, label: 'Renewal Overdue' }),
        },
        {
            label: t(`${p}.kpis.next10.label`),
            value: fmtNum(d?.renewal_next_10yr),
            sub: t(`${p}.kpis.next10.sub`),
            accent: '#f59e0b', glow: 'warning',
            onClick: () => goToMap({ ageMin: 40, label: 'Renewal < 10 Years' }),
        },
        {
            label: t(`${p}.kpis.next20.label`),
            value: fmtNum(d?.renewal_next_20yr),
            sub: t(`${p}.kpis.next20.sub`),
            onClick: () => goToMap({ ageMin: 30, label: 'Renewal < 20 Years' }),
        },
        {
            label: t(`${p}.kpis.age80.label`),
            value: fmtNum(d?.age_gt_80),
            sub: t(`${p}.kpis.age80.allConnsNote`),
            accent: '#ef4444', glow: 'danger',
            onClick: () => goToMap({ ageMin: 80, label: 'Older than 80 Years' }),
        },
        showWasser && {
            label: t(`${p}.kpis.age80w.label`),
            value: fmtNum(d?.age_gt_80_wasser),
            sub: t(`${p}.kpis.age80w.sub`),
            accent: '#ef4444',
            onClick: () => goToMap({ ageMin: 80, sparte: 'Wasser', label: 'Water > 80 Years' }),
        },
        showWasser && {
            label: t(`${p}.kpis.wOver.label`),
            value: fmtNum(d?.wasser_over),
            sub: t(`${p}.kpis.wOver.sub`),
            onClick: () => goToMap({ overLifespan: true, sparte: 'Wasser', label: 'Water – Overdue' }),
        },
        showGas && {
            label: t(`${p}.kpis.gOver.label`),
            value: fmtNum(d?.gas_over),
            sub: t(`${p}.kpis.gOver.sub`),
            onClick: () => goToMap({ overLifespan: true, sparte: 'Gas', label: 'Gas – Overdue' }),
        },
        {
            label: t(`${p}.kpis.oldest.label`),
            value: fmtAge(d?.oldest_asset_years),
            sub: t(`${p}.kpis.oldest.sub`),
            accent: '#ef4444',
        },
    ].filter(Boolean);

    const renderContent = () => {
        switch (activeTab) {
            case 'map': return <NetworkMap filterConfig={mapFilter} />;
            case 'analysis': return <StrategicAnalysis />;
            case 'chat': return <AiAssistant />;
            default: return <NetworkMap filterConfig={mapFilter} />;
        }
    };

    return (
        <div className="subpage">
            <div className="page-header">
                <div className="page-header-top">
                    <div>
                        <div className="subpage-breadcrumb subpage-breadcrumb--warning">
                            <Clock size={13} /> {t(`${p}.breadcrumb`)}
                        </div>
                        <h1>{t(`${p}.title`)}</h1>
                        <p>{t(`${p}.desc`)}</p>
                    </div>
                    <div className="page-kpi-badge">
                        <span className="kpi-value kpi-value--warning">{fmtNum(primaryValue)}</span>
                        <span className="kpi-sublabel">{t(`${p}.badgeLabel`)}</span>
                    </div>
                </div>
            </div>

            <PageKpiGrid items={kpiItems} />

            <div className="tab-container glass-card">
                <div className="tab-navigation">
                    {tabs.map(tab => (
                        <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className={`tab-content${activeTab === 'map' ? ' tab-content--map' : ''}`}>{renderContent()}</div>
            </div>
        </div>
    );
}

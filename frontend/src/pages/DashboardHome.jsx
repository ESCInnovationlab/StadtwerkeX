import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { fmtNum } from '../utils/fmt';
import { ArrowRight, Zap, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import './DashboardHome.css';

const kpiCards = [
    {
        path: '/dashboard/anschluesse',
        labelKey: 'nav.connections',
        titleKey: 'pages.anschluesse.title',
        descKey: 'pages.anschluesse.desc',
        icon: Zap,
        kpiKey: 'total',
        detailGroup: 'anschluesse',
        detailKey: 'total',
        accent: '#ffffff',
    },
    {
        path: '/dashboard/kritisch',
        labelKey: 'nav.critical',
        titleKey: 'pages.kritisch.title',
        descKey: 'pages.kritisch.desc',
        icon: AlertTriangle,
        kpiKey: 'critical',
        detailGroup: 'kritisch',
        detailKey: 'hoch_risiko',
        accent: '#ef4444',
    },
    {
        path: '/dashboard/ueber-nutzungsdauer',
        labelKey: 'nav.renewalDue',
        titleKey: 'pages.renewal.title',
        descKey: 'pages.renewal.desc',
        icon: Clock,
        kpiKey: 'over_lifespan',
        detailGroup: 'renewal',
        detailKey: 'over_lifespan',
        accent: '#f59e0b',
    },
    {
        path: '/dashboard/modernisierung',
        labelKey: 'nav.modernization',
        titleKey: 'pages.modernisierung.title',
        descKey: 'pages.modernisierung.desc',
        icon: ShieldAlert,
        kpiKey: 'modernization_issues',
        detailGroup: 'modernisierung',
        detailKey: 'critical_material',
        accent: '#ffffff',
    },
];

export default function DashboardHome() {
    const { kpis, detailedKpis, activeUtility } = useApp();
    const { t } = useLanguage();

    return (
        <div className="home-page">
            {/* Hero */}
            <section className="home-hero">
                <div className="home-hero-label">{t('home.platformLabel')}</div>
                <h1 className="home-hero-title">STADTWERKE X</h1>
                <p className="home-hero-sub">{t('home.heroSub')}</p>
            </section>

            {/* About */}
            <section className="home-about glass-card">
                <div className="home-about-grid">
                    <div className="home-about-col">
                        <h2>{t('home.whatIsIt')}</h2>
                        <p>{t('home.aboutText')}</p>
                    </div>
                    <div className="home-about-col">
                        <h2>{t('home.whatForIt')}</h2>
                        <ul className="home-feature-list">
                            {t('home.features').map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                    </div>
                </div>
                {activeUtility && activeUtility !== 'Alle Sparten' && activeUtility !== 'All Utilities' && (
                    <div className="home-utility-badge">
                        {t('home.activeUtility')}: <strong>{activeUtility}</strong>
                    </div>
                )}
            </section>

            {/* KPI Navigation Cards */}
            <section className="home-kpi-section">
                <h2 className="home-section-title">{t('home.sections')}</h2>
                <div className="home-kpi-grid">
                    {kpiCards.map((card) => {
                        const Icon = card.icon;
                        const value = detailedKpis?.[card.detailGroup]?.[card.detailKey] ?? kpis?.[card.kpiKey];
                        return (
                            <Link key={card.path} to={card.path} className="home-kpi-card glass-card">
                                <div className="home-kpi-card-top">
                                    <div className="home-kpi-icon" style={{ color: card.accent, borderColor: `${card.accent}22` }}>
                                        <Icon size={20} />
                                    </div>
                                    <span className="home-kpi-value" style={{ color: card.accent }}>
                                        {fmtNum(value)}
                                    </span>
                                </div>
                                <div className="home-kpi-label">{t(card.labelKey)}</div>
                                <p className="home-kpi-desc">{t(card.descKey)}</p>
                                <div className="home-kpi-cta">
                                    {t('home.openSection')} <ArrowRight size={14} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

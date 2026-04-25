import './PageKpiGrid.css';

/**
 * items: { label, value, sub?, accent?, glow?, onClick? }
 *   glow: 'danger' | 'warning' | 'info'  — adds pulsing glow border
 *   onClick: () => void                   — makes card clickable (redirects to map)
 */
export default function PageKpiGrid({ items = [] }) {
    if (!items.length) return null;

    return (
        <div className="pkpi-grid" style={{ '--col-count': Math.min(items.length, 4) }}>
            {items.map((item, i) => {
                const cls = [
                    'pkpi-card',
                    item.glow ? `pkpi-glow-${item.glow}` : '',
                    item.onClick ? 'pkpi-clickable' : '',
                ].filter(Boolean).join(' ');

                return (
                    <div
                        key={i}
                        className={cls}
                        onClick={item.onClick}
                        title={item.onClick ? 'Auf Karte anzeigen →' : undefined}
                    >
                        <div
                            className="pkpi-value"
                            style={item.accent ? { color: item.accent } : undefined}
                        >
                            {item.value ?? '—'}
                        </div>
                        <div className="pkpi-label">{item.label}</div>
                        {item.sub && <div className="pkpi-sub">{item.sub}</div>}
                        {item.onClick && (
                            <div className="pkpi-map-hint">Karte →</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

import { useEffect, useState, useMemo, useCallback, useRef, Fragment } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useApp } from '../context/AppContext';
import { X, Map as MapIcon, RotateCcw, ChevronDown, AlertTriangle, Clock, Droplets, Flame, Wrench, GitBranch, Activity } from 'lucide-react';
import './MapExplorerPage.css';

/* ─── Map helpers ─────────────────────────────────────────────────────────── */
function AutoFit({ records }) {
    const map = useMap();
    const doneRef = useRef(false);
    useEffect(() => {
        if (doneRef.current || records.length === 0) return;
        const pts = records.filter(r => r.lat && r.lon).map(r => [r.lat, r.lon]);
        if (pts.length > 0) {
            try { map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 }); doneRef.current = true; }
            catch (_) {}
        }
    }, [records.length, map]);
    return null;
}

function MapResizer() {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize();
        const t = setTimeout(() => map.invalidateSize(), 300);
        return () => clearTimeout(t);
    }, [map]);
    return null;
}

/* ─── Colours ─────────────────────────────────────────────────────────────── */
const RISK_COLOR   = { Hoch: '#ef4444', Mittel: '#f97316', Niedrig: '#22c55e' };
const SPARTE_COLOR = { Gas: '#f59e0b', Wasser: '#38bdf8' };

function getMarkerColor(asset, colorBy) {
    if (colorBy === 'risiko')   return RISK_COLOR[asset.Risiko]   ?? '#888';
    if (colorBy === 'sparte')   return SPARTE_COLOR[asset.Sparte] ?? '#888';
    if (colorBy === 'lifespan') return asset.over_lifespan ? '#f59e0b' : '#22c55e';
    if (colorBy === 'age') {
        const a = asset.Alter || 0;
        if (a >= 80) return '#ef4444';
        if (a >= 60) return '#f97316';
        if (a >= 40) return '#f59e0b';
        return '#22c55e';
    }
    return '#888';
}

/* ─── Filter options ──────────────────────────────────────────────────────── */
const WERKSTOFF_OPTS = ['Alle','Stahl','PE','PVC','Asbestzement-(AZ)','Stahl mit KKS','Stahl ohne KKS'];
const AGE_OPTS = [
    { label: 'All Ages', min: 0  },
    { label: '> 20 yrs', min: 20 },
    { label: '> 40 yrs', min: 40 },
    { label: '> 60 yrs', min: 60 },
    { label: '> 80 yrs', min: 80 },
];
const COLOR_BY_OPTS = [
    { value: 'risiko',   label: 'Risk Level'     },
    { value: 'sparte',   label: 'Utility'        },
    { value: 'lifespan', label: 'Renewal Status' },
    { value: 'age',      label: 'Age Group'      },
];

/* ─── Popup ───────────────────────────────────────────────────────────────── */
function AssetPopup({ asset }) {
    return (
        <Popup className="explorer-popup">
            <div className="ep-header">
                <span className="ep-sparte" style={{
                    background: (SPARTE_COLOR[asset.Sparte] ?? '#888') + '22',
                    color: SPARTE_COLOR[asset.Sparte] ?? '#888',
                    borderColor: (SPARTE_COLOR[asset.Sparte] ?? '#888') + '44',
                }}>
                    {asset.Sparte === 'Gas' ? '⛽' : '💧'} {asset.Sparte}
                </span>
                <span className="ep-risk" style={{ color: RISK_COLOR[asset.Risiko] }}>
                    {asset.Risiko}
                </span>
            </div>
            <div className="ep-name">{asset.Kundenname || '—'}</div>
            <div className="ep-addr">{asset['Straße']} {asset.Hausnummer}</div>
            <div className="ep-stats">
                <div><span>Age</span><strong>{asset.Alter ? `${asset.Alter} yrs` : '—'}</strong></div>
                <div><span>Material</span><strong>{asset.Werkstoff || '—'}</strong></div>
                <div><span>Renewal</span><strong>{asset['Erneuerung_empfohlen_bis'] || '—'}</strong></div>
            </div>
        </Popup>
    );
}

/* ─── Markers ─────────────────────────────────────────────────────────────── */
function AssetDot({ asset, colorBy, onClick }) {
    if (!asset.lat || !asset.lon) return null;
    const color = getMarkerColor(asset, colorBy);
    return (
        <CircleMarker
            center={[asset.lat, asset.lon]}
            radius={5}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 1.5, opacity: 1 }}
            eventHandlers={{ click: () => onClick(asset) }}
        >
            <AssetPopup asset={asset} />
        </CircleMarker>
    );
}

function HouseMarker({ asset, colorBy, onClick, showNum }) {
    if (!asset.lat || !asset.lon) return null;
    const color = getMarkerColor(asset, colorBy);
    const num   = asset.Hausnummer || '?';
    const icon  = useMemo(() => L.divIcon({
        html: `<div class="explorer-house-pin" style="--c:${color}">
            ${showNum ? `<div class="pin-num-top">${num}</div>` : ''}
            <svg viewBox="0 0 24 24" class="pin-home-svg" fill="${color}">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
        </div>`,
        className: '',
        iconSize: [32, 44],
        iconAnchor: [16, 44],
        popupAnchor: [0, -46],
    }), [color, num, showNum]);

    return (
        <Marker position={[asset.lat, asset.lon]} icon={icon} eventHandlers={{ click: () => onClick(asset) }}>
            <AssetPopup asset={asset} />
        </Marker>
    );
}

function MarkerLayer({ filtered, colorBy, onDotClick }) {
    const map = useMap();
    const [zoom, setZoom] = useState(() => map.getZoom());
    useEffect(() => {
        const h = () => setZoom(map.getZoom());
        map.on('zoomend', h);
        return () => map.off('zoomend', h);
    }, [map]);

    return (
        <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={40}
            polygonOptions={{ opacity: 0 }}
            iconCreateFunction={(cluster) => {
                const count = cluster.getChildCount();
                const size  = count > 100 ? 48 : count > 30 ? 40 : 32;
                return L.divIcon({
                    html: `<div class="explorer-cluster" style="width:${size}px;height:${size}px;font-size:${size < 40 ? '0.72rem' : '0.8rem'}">${count}</div>`,
                    className: '',
                    iconSize: [size, size],
                    iconAnchor: [size / 2, size / 2],
                });
            }}
        >
            {filtered.map((asset, i) =>
                zoom >= 17
                    ? <HouseMarker key={i} asset={asset} colorBy={colorBy} onClick={onDotClick} showNum={zoom >= 16} />
                    : <AssetDot    key={i} asset={asset} colorBy={colorBy} onClick={onDotClick} />
            )}
        </MarkerClusterGroup>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   PIPELINE SYSTEM
   ══════════════════════════════════════════════════════════════════════════

   Root cause of missing pipelines (diagnosed from data):
   ─────────────────────────────────────────────────────
   1. proximityClusters() was filtering out single-asset clusters (len < 2)
      leaving 77 isolated assets with zero pipeline drawn.

   2. clipToBbox() was clipping OSM way nodes that fell outside the asset
      bounding box. For dense streets like Gladiolenweg (28 assets in 42m),
      the tight bbox had zero OSM nodes inside it → empty result → no road drawn.
      The road WAS in the cache but got clipped to nothing.

   Fix:
   ─────
   1. Single-asset streets: draw a short road-following segment by finding
      the nearest OSM way for that street name and taking the closest
      sub-segment to that asset. Falls back to a tiny 30m stub.

   2. Replace clipToBbox (node removal) with selectWaysByProximity:
      Keep an entire OSM way polyline if ANY of its nodes is within
      MAX_DIST_M metres of ANY asset in the cluster. This way a road
      that passes through a dense cluster is always kept whole.
   ══════════════════════════════════════════════════════════════════════════ */

const OVERPASS  = 'https://overpass-api.de/api/interpreter';
const AREA_BBOX = '51.220,6.900,51.350,7.140';

/* Singleton road cache — one fetch, reused forever */
let _roadCache = null;
function getRoadCache() {
    if (_roadCache) return _roadCache;
    _roadCache = fetch(OVERPASS, {
        method: 'POST',
        body: `data=${encodeURIComponent(
            `[out:json][timeout:30];way["highway"]["name"](${AREA_BBOX});(._;>;);out body;`
        )}`,
    })
    .then(r => r.json())
    .then(data => {
        const nodes = {};
        data.elements.forEach(el => {
            if (el.type === 'node') nodes[el.id] = [el.lat, el.lon];
        });
        const byName = {};
        data.elements.forEach(el => {
            if (el.type !== 'way' || !el.tags?.name) return;
            const coords = (el.nodes || []).map(id => nodes[id]).filter(Boolean);
            if (coords.length >= 2) {
                (byName[el.tags.name] = byName[el.tags.name] || []).push(coords);
            }
        });
        return byName;
    })
    .catch(() => ({}));
    return _roadCache;
}

/* ─── Geometry utilities ──────────────────────────────────────────────────── */

function distM(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLon = (lon2 - lon1) * 111320 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
}

/*
 * Split asset points into proximity clusters.
 * KEY FIX: single-point clusters (len === 1) are NOW kept — we draw
 * a short road segment for them instead of skipping entirely.
 */
function proximityClusters(points, maxGapM = 300) {
    if (!points.length) return [];
    const sorted = [...points].sort((a, b) => a.lat - b.lat || a.lon - b.lon);
    const clusters = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
        const pt = sorted[i];
        let bestC = null, bestD = Infinity;
        for (const c of clusters) {
            for (const cp of c) {
                const d = distM(cp.lat, cp.lon, pt.lat, pt.lon);
                if (d < bestD) { bestD = d; bestC = c; }
            }
        }
        bestD <= maxGapM ? bestC.push(pt) : clusters.push([pt]);
    }
    // Return ALL clusters including single-asset ones
    return clusters;
}

/*
 * Select OSM way polylines that pass near a cluster.
 * Keeps a whole way if ANY of its nodes is within maxDistM of ANY cluster asset.
 * This replaces the old node-clipping approach which silently dropped roads
 * when no nodes fell inside a tight bbox.
 */
function selectWaysNearCluster(roadPolylines, cluster, maxDistM = 120) {
    return roadPolylines.filter(way =>
        way.some(node =>
            cluster.some(asset =>
                distM(asset.lat, asset.lon, node[0], node[1]) <= maxDistM
            )
        )
    );
}

/*
 * For a single isolated asset with no nearby cluster partner,
 * find the closest segment of the named road and return a short
 * subsection of it (nearest node ± 1 neighbour = 1 road segment).
 */
function nearestRoadSegment(roadPolylines, lat, lon) {
    let bestPt = null, bestD = Infinity, bestWay = null, bestIdx = -1;
    roadPolylines.forEach(way => {
        way.forEach((pt, idx) => {
            const d = distM(lat, lon, pt[0], pt[1]);
            if (d < bestD) { bestD = d; bestPt = pt; bestWay = way; bestIdx = idx; }
        });
    });
    if (!bestWay || bestD > 150) return null; // asset too far from any road
    // Return the road segment: node before + nearest + node after
    const from = Math.max(0, bestIdx - 1);
    const to   = Math.min(bestWay.length - 1, bestIdx + 1);
    return bestWay.slice(from, to + 1);
}

/* Lateral offset so Gas & Water sit side-by-side (not stacked) */
function lateralOffset(coords, metres) {
    if (Math.abs(metres) < 0.01 || coords.length < 2) return coords;
    const K = 1 / 111320;
    return coords.map((pt, i) => {
        const prev = coords[Math.max(0, i - 1)];
        const next = coords[Math.min(coords.length - 1, i + 1)];
        const dLat = next[0] - prev[0], dLon = next[1] - prev[1];
        const len  = Math.sqrt(dLat * dLat + dLon * dLon) || 1;
        return [
            pt[0] + (-dLon / len) * metres * K,
            pt[1] + ( dLat / len) * metres * K / Math.cos(pt[0] * Math.PI / 180),
        ];
    });
}

/* Nearest point on any road polyline — for connection stubs */
function nearestOnLines(lines, lat, lon) {
    let best = null, bestD = Infinity;
    lines.forEach(pts => pts.forEach(pt => {
        const d = distM(lat, lon, pt[0], pt[1]);
        if (d < bestD) { bestD = d; best = { pt, d }; }
    }));
    return best;
}

/* ─── Connection stub layer ───────────────────────────────────────────────── */
function StubLayer({ assets, roadLines, sparte, show }) {
    const map = useMap();
    const [zoom, setZoom] = useState(() => map.getZoom());
    useEffect(() => {
        const h = () => setZoom(map.getZoom());
        map.on('zoomend', h);
        return () => map.off('zoomend', h);
    }, [map]);

    if (zoom < 15 || !show || show === 'off' || !roadLines.length) return null;
    const showSparte = show === 'alle' ||
        (show === 'gas'    && sparte === 'Gas') ||
        (show === 'wasser' && sparte === 'Wasser');
    if (!showSparte) return null;

    const color = SPARTE_COLOR[sparte];
    return (
        <>
            {assets
                .filter(a => a.Sparte === sparte && a.lat && a.lon)
                .map((asset, i) => {
                    const found = nearestOnLines(roadLines, asset.lat, asset.lon);
                    if (!found || found.d > 55) return null;
                    return (
                        <Polyline key={i}
                            positions={[[asset.lat, asset.lon], found.pt]}
                            pathOptions={{
                                color,
                                weight: 1,
                                opacity: 0.5,
                                dashArray: '3 5',
                                lineCap: 'round',
                            }}
                        />
                    );
                })}
        </>
    );
}

/* ─── Pipeline layer ──────────────────────────────────────────────────────── */
function PipelineLayer({ allRecords, show }) {
    const [lines,      setLines]      = useState([]);
    const [roadLines,  setRoadLines]  = useState([]);
    const [cacheReady, setCacheReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getRoadCache().then(cache => {
            if (!cancelled) { window.__roadCache = cache; setCacheReady(true); }
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!cacheReady || !show || show === 'off') {
            setLines([]); setRoadLines([]); return;
        }
        const cache   = window.__roadCache || {};
        const spartes = show === 'alle' ? ['Gas', 'Wasser'] : show === 'gas' ? ['Gas'] : ['Wasser'];
        const result  = [];
        const allRoad = []; // unshifted coords for stub snapping

        spartes.forEach(sparte => {
            const color  = SPARTE_COLOR[sparte];
            const offset = sparte === 'Gas' ? 3 : -3;

            // Group by street name
            const byStreet = {};
            allRecords
                .filter(a => a.Sparte === sparte && a.lat && a.lon)
                .forEach(a => {
                    const k = (a['Straße'] || '').trim();
                    if (k) (byStreet[k] = byStreet[k] || []).push({ lat: a.lat, lon: a.lon });
                });

            Object.entries(byStreet).forEach(([name, pts]) => {
                const roadPolys = cache[name];

                // All clusters including single-asset ones
                proximityClusters(pts, 300).forEach(cluster => {

                    if (cluster.length === 1) {
                        // ── Single isolated asset ──
                        // Try to find the nearest segment of this named road
                        if (roadPolys?.length) {
                            const seg = nearestRoadSegment(roadPolys, cluster[0].lat, cluster[0].lon);
                            if (seg && seg.length >= 2) {
                                result.push({ coords: lateralOffset(seg, offset), color });
                                allRoad.push(seg);
                                return;
                            }
                        }
                        // No named road found: tiny stub from asset outward
                        // (just 2 points ~20m apart — marks the connection point)
                        const stub = [
                            [cluster[0].lat - 0.00009, cluster[0].lon],
                            [cluster[0].lat + 0.00009, cluster[0].lon],
                        ];
                        result.push({ coords: stub, color, stub: true });
                        return;
                    }

                    // ── Multi-asset cluster ──
                    if (roadPolys?.length) {
                        /*
                         * FIX: selectWaysNearCluster keeps whole way polylines
                         * that pass near the cluster, instead of clipping nodes.
                         * This fixes streets like Gladiolenweg (42m cluster span)
                         * where no OSM nodes fell inside the old tight bbox.
                         */
                        const nearby = selectWaysNearCluster(roadPolys, cluster, 120);

                        if (nearby.length) {
                            nearby.forEach(seg => {
                                if (seg.length >= 2) {
                                    result.push({ coords: lateralOffset(seg, offset), color });
                                    allRoad.push(seg);
                                }
                            });
                            return;
                        }
                    }

                    // ── Fallback: no OSM road found — straight line between cluster endpoints ──
                    const sorted = [...cluster].sort((a, b) => a.lat - b.lat);
                    const seg = [
                        [sorted[0].lat, sorted[0].lon],
                        [sorted[sorted.length - 1].lat, sorted[sorted.length - 1].lon],
                    ];
                    result.push({ coords: lateralOffset(seg, offset), color, fallback: true });
                    allRoad.push(seg);
                });
            });
        });

        setLines(result);
        setRoadLines(allRoad);
    }, [cacheReady, show, allRecords]);

    const gasAssets    = useMemo(() => allRecords.filter(a => a.Sparte === 'Gas'),    [allRecords]);
    const wasserAssets = useMemo(() => allRecords.filter(a => a.Sparte === 'Wasser'), [allRecords]);

    return (
        <>
            {lines.map((line, i) => (
                <Polyline key={i}
                    positions={line.coords}
                    pathOptions={{
                        color: line.color,
                        weight: line.stub ? 1 : 2,
                        opacity: line.stub ? 0.3 : line.fallback ? 0.5 : 0.85,
                        dashArray: line.stub ? '2 6' : undefined,
                        lineCap: 'round',
                        lineJoin: 'round',
                    }}
                />
            ))}
            <StubLayer assets={gasAssets}    roadLines={roadLines} sparte="Gas"    show={show} />
            <StubLayer assets={wasserAssets} roadLines={roadLines} sparte="Wasser" show={show} />
        </>
    );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function MapExplorerPage() {
    const { activeUtility } = useApp();

    const [allRecords, setAllRecords] = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [selected,   setSelected]   = useState(null);
    const [panelOpen,  setPanelOpen]  = useState(false);

    const [fSparte,    setFSparte]    = useState('Alle');
    const [fRisiko,    setFRisiko]    = useState('Alle');
    const [fWerkstoff, setFWerkstoff] = useState('Alle');
    const [fAge,       setFAge]       = useState(0);
    const [fLifespan,  setFLifespan]  = useState(false);
    const [colorBy,    setColorBy]    = useState('risiko');
    const [fPipeline,  setFPipeline]  = useState('off');

    useEffect(() => { getRoadCache(); }, []); // prefetch on mount

    useEffect(() => {
        setLoading(true);
        fetch(`http://localhost:8000/api/map-explorer?utility=${activeUtility}`)
            .then(r => r.json())
            .then(d => { setAllRecords(d.records || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [activeUtility]);

    const filtered = useMemo(() => allRecords.filter(a => {
        if (fSparte    !== 'Alle' && a.Sparte    !== fSparte)    return false;
        if (fRisiko    !== 'Alle' && a.Risiko    !== fRisiko)    return false;
        if (fWerkstoff !== 'Alle' && a.Werkstoff !== fWerkstoff) return false;
        if (fAge > 0   && (a.Alter || 0) < fAge)                 return false;
        if (fLifespan  && !a.over_lifespan)                       return false;
        return true;
    }), [allRecords, fSparte, fRisiko, fWerkstoff, fAge, fLifespan]);

    const stats = useMemo(() => ({
        total:  filtered.length,
        hoch:   filtered.filter(a => a.Risiko === 'Hoch').length,
        wasser: filtered.filter(a => a.Sparte === 'Wasser').length,
        gas:    filtered.filter(a => a.Sparte === 'Gas').length,
        over:   filtered.filter(a => a.over_lifespan).length,
    }), [filtered]);

    const resetFilters = () => {
        setFSparte('Alle'); setFRisiko('Alle');
        setFWerkstoff('Alle'); setFAge(0); setFLifespan(false);
    };

    const handleDotClick = useCallback((asset) => {
        setSelected(asset); setPanelOpen(true);
    }, []);

    const activeFilterCount = [
        fSparte !== 'Alle', fRisiko !== 'Alle',
        fWerkstoff !== 'Alle', fAge > 0, fLifespan,
    ].filter(Boolean).length;

    const pipelineActive = fPipeline !== 'off';

    return (
        <div className="explorer-root">

            <div className="explorer-filterbar">
                <div className="efb-left">
                    <div className="efb-brand"><MapIcon size={14} /><span>Net Explorer</span></div>
                    {activeFilterCount > 0 && <span className="efb-active-badge">{activeFilterCount} active</span>}
                </div>
                <div className="efb-controls">
                    <div className="efb-select-wrap">
                        <select className="efb-select" value={fSparte} onChange={e => setFSparte(e.target.value)}>
                            <option value="Alle">All Utilities</option>
                            <option value="Gas">Gas</option>
                            <option value="Wasser">Water</option>
                        </select>
                        <ChevronDown size={11} className="efb-chevron" />
                    </div>
                    <div className="efb-select-wrap">
                        <select className="efb-select" value={fRisiko} onChange={e => setFRisiko(e.target.value)}>
                            <option value="Alle">All Risk</option>
                            <option value="Hoch">High</option>
                            <option value="Mittel">Medium</option>
                            <option value="Niedrig">Low</option>
                        </select>
                        <ChevronDown size={11} className="efb-chevron" />
                    </div>
                    <div className="efb-select-wrap">
                        <select className="efb-select" value={fWerkstoff} onChange={e => setFWerkstoff(e.target.value)}>
                            {WERKSTOFF_OPTS.map(w => <option key={w} value={w}>{w === 'Alle' ? 'All Materials' : w}</option>)}
                        </select>
                        <ChevronDown size={11} className="efb-chevron" />
                    </div>
                    <div className="efb-select-wrap">
                        <select className="efb-select" value={fAge} onChange={e => setFAge(Number(e.target.value))}>
                            {AGE_OPTS.map(o => <option key={o.min} value={o.min}>{o.label}</option>)}
                        </select>
                        <ChevronDown size={11} className="efb-chevron" />
                    </div>
                    <div className="efb-select-wrap">
                        <select className="efb-select efb-select--color" value={colorBy} onChange={e => setColorBy(e.target.value)}>
                            {COLOR_BY_OPTS.map(o => <option key={o.value} value={o.value}>Color: {o.label}</option>)}
                        </select>
                        <ChevronDown size={11} className="efb-chevron" />
                    </div>
                    <button className={`efb-toggle ${fLifespan ? 'efb-toggle--active' : ''}`}
                        onClick={() => setFLifespan(v => !v)}>
                        <Clock size={12} />Overdue
                    </button>
                    {activeFilterCount > 0 && (
                        <button className="efb-reset" onClick={resetFilters}><RotateCcw size={12} /></button>
                    )}
                    <div className="efb-sep" />
                    <div className={`efb-pipe-chip ${pipelineActive ? `efb-pipe-chip--on efb-pipe-chip--${fPipeline}` : ''}`}>
                        <GitBranch size={12} />
                        <span className="efb-pipe-label">Pipelines:</span>
                        <div className="efb-select-wrap">
                            <select className="efb-select efb-select--borderless" value={fPipeline}
                                onChange={e => setFPipeline(e.target.value)}>
                                <option value="off">None</option>
                                <option value="gas">Gas</option>
                                <option value="wasser">Water</option>
                                <option value="alle">All</option>
                            </select>
                            <ChevronDown size={11} className="efb-chevron" />
                        </div>
                    </div>
                </div>
                <div className="efb-count">
                    <Activity size={11} />
                    <span>{loading ? '…' : `${filtered.length} / ${allRecords.length}`}</span>
                </div>
            </div>

            <div className="explorer-stats">
                <div className="estats-group">
                    {[
                        { label: 'Shown',     value: stats.total,  color: 'rgba(255,255,255,0.9)', dot: null },
                        { label: 'High Risk', value: stats.hoch,   color: '#ef4444', dot: '#ef4444' },
                        { label: 'Water',     value: stats.wasser, color: '#38bdf8', dot: '#38bdf8' },
                        { label: 'Gas',       value: stats.gas,    color: '#f59e0b', dot: '#f59e0b' },
                        { label: 'Overdue',   value: stats.over,   color: '#a78bfa', dot: '#a78bfa' },
                    ].map(s => (
                        <div key={s.label} className="estat">
                            {s.dot && <span className="estat-dot" style={{ background: s.dot }} />}
                            <span className="estat-value" style={{ color: s.color }}>{s.value}</span>
                            <span className="estat-label">{s.label}</span>
                        </div>
                    ))}
                </div>
                <div className="estats-legend">
                    {colorBy === 'risiko' && Object.entries(RISK_COLOR).map(([k, v]) => (
                        <span key={k} className="ldot-item">
                            <span className="ldot" style={{ background: v }} />
                            {k === 'Hoch' ? 'High' : k === 'Mittel' ? 'Medium' : 'Low'}
                        </span>
                    ))}
                    {colorBy === 'sparte' && Object.entries(SPARTE_COLOR).map(([k, v]) => (
                        <span key={k} className="ldot-item">
                            <span className="ldot" style={{ background: v }} />
                            {k === 'Wasser' ? 'Water' : k}
                        </span>
                    ))}
                    {colorBy === 'lifespan' && (<>
                        <span className="ldot-item"><span className="ldot" style={{ background: '#f59e0b' }} />Overdue</span>
                        <span className="ldot-item"><span className="ldot" style={{ background: '#22c55e' }} />In Service</span>
                    </>)}
                    {colorBy === 'age' && [['< 40yr','#22c55e'],['40–60yr','#f59e0b'],['60–80yr','#f97316'],['> 80yr','#ef4444']].map(([l,c]) => (
                        <span key={l} className="ldot-item"><span className="ldot" style={{ background: c }} />{l}</span>
                    ))}
                    {pipelineActive && (<>
                        <span className="estats-sep" />
                        {(fPipeline === 'gas' || fPipeline === 'alle') && (
                            <span className="ldot-item ldot-item--pipe">
                                <span className="pipe-swatch" style={{ background: '#f59e0b' }} />Gas pipeline
                            </span>
                        )}
                        {(fPipeline === 'wasser' || fPipeline === 'alle') && (
                            <span className="ldot-item ldot-item--pipe">
                                <span className="pipe-swatch" style={{ background: '#38bdf8' }} />Water pipeline
                            </span>
                        )}
                    </>)}
                </div>
            </div>

            <div className="explorer-body">
                <div className={`explorer-map-wrap ${panelOpen ? 'panel-open' : ''}`}>
                    {loading && (
                        <div className="explorer-loading">
                            <div className="explorer-spinner" />
                            <span>Loading network data…</span>
                        </div>
                    )}
                    <MapContainer center={[51.278, 7.033]} zoom={14}
                        style={{ height: '100%', width: '100%' }} zoomControl={false}>
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            maxZoom={19} keepBuffer={4}
                        />
                        <MapResizer />
                        <AutoFit records={filtered} />
                        <PipelineLayer allRecords={allRecords} show={fPipeline} />
                        <MarkerLayer filtered={filtered} colorBy={colorBy} onDotClick={handleDotClick} />
                    </MapContainer>
                </div>

                {panelOpen && selected && (
                    <aside className="explorer-detail">
                        <div className="ed-header">
                            <div className="ed-pills">
                                <span className="ed-pill" style={{
                                    background: (SPARTE_COLOR[selected.Sparte] ?? '#888') + '18',
                                    color: SPARTE_COLOR[selected.Sparte] ?? '#888',
                                    borderColor: (SPARTE_COLOR[selected.Sparte] ?? '#888') + '40',
                                }}>
                                    {selected.Sparte === 'Gas' ? <Flame size={11} /> : <Droplets size={11} />}
                                    {selected.Sparte === 'Wasser' ? 'Water' : selected.Sparte}
                                </span>
                                <span className="ed-pill" style={{
                                    background: (RISK_COLOR[selected.Risiko] ?? '#888') + '18',
                                    color: RISK_COLOR[selected.Risiko] ?? '#888',
                                    borderColor: (RISK_COLOR[selected.Risiko] ?? '#888') + '40',
                                }}>
                                    {selected.Risiko === 'Hoch' ? 'High' : selected.Risiko === 'Mittel' ? 'Medium' : selected.Risiko === 'Niedrig' ? 'Low' : selected.Risiko}
                                </span>
                            </div>
                            <button className="ed-close" onClick={() => setPanelOpen(false)}><X size={14} /></button>
                        </div>
                        <div className="ed-name">{selected.Kundenname || 'Asset'}</div>
                        <div className="ed-addr">
                            {selected['Straße']} {selected.Hausnummer}
                            <span className="ed-city">, 42489 Wülfrath</span>
                        </div>
                        <div className="ed-rule" />
                        <div className="ed-grid">
                            {[
                                ['Customer No.',  selected.Kundennummer],
                                ['Utility',       selected.Sparte === 'Wasser' ? 'Water' : selected.Sparte],
                                ['Install Year',  selected.Einbaujahr ?? '—'],
                                ['Age',           selected.Alter ? `${selected.Alter} years` : '—'],
                                ['Material',      selected.Werkstoff ?? '—'],
                                ['Pressure',      selected.Druckstufe ?? '—'],
                                ['Risk',          selected.Risiko === 'Hoch' ? 'High' : selected.Risiko === 'Mittel' ? 'Medium' : selected.Risiko === 'Niedrig' ? 'Low' : selected.Risiko],
                                ['Renewal By',    selected['Erneuerung_empfohlen_bis'] ?? '—'],
                                ['No Defects',    selected['Keine Mängel'] ?? '—'],
                                ['Overdue',       selected.over_lifespan ? 'Yes' : 'No'],
                            ].map(([k, v]) => (
                                <div key={k} className="ed-row">
                                    <span className="ed-key">{k}</span>
                                    <span className="ed-val" style={{
                                        color: k === 'Risk'       && v === 'High' ? '#ef4444'
                                             : k === 'Overdue'    && v === 'Yes'  ? '#f59e0b'
                                             : k === 'No Defects' && v === 'No'   ? '#ef4444'
                                             : undefined,
                                    }}>{String(v ?? '—')}</span>
                                </div>
                            ))}
                        </div>
                        <div className="ed-alerts">
                            {selected.over_lifespan && (
                                <div className="ed-alert ed-alert--warn">
                                    <Clock size={12} /> Technical service life exceeded
                                </div>
                            )}
                            {selected.Risiko === 'Hoch' && (
                                <div className="ed-alert ed-alert--danger">
                                    <AlertTriangle size={12} /> Immediate action required
                                </div>
                            )}
                            {selected.Werkstoff === 'Asbestzement-(AZ)' && (
                                <div className="ed-alert ed-alert--danger">
                                    <Wrench size={12} /> AC pipe — mandatory replacement
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
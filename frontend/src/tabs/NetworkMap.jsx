import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../context/AppContext';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './MarkerCluster.css';
import StreetView3D from '../components/3d/StreetView3D';
import './NetworkMap.css';

// Define custom icons
const defaultIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const yellowIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Helper component to update map view
function MapResizer({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, zoom || 18, { animate: true });
        }
    }, [center, zoom, map]);
    return null;
}

export default function NetworkMap() {
    const { activeUtility, selectedAsset, setSelectedAsset } = useApp();
    const [geoData, setGeoData] = useState(null);
    const [mapFocus, setMapFocus] = useState(null);
    const [assets, setAssets] = useState([]);
    const [viewMode, setViewMode] = useState('2D'); // '2D' or '3D'

    useEffect(() => {
        if (selectedAsset && selectedAsset.lat && selectedAsset.lon) {
            setMapFocus([selectedAsset.lat, selectedAsset.lon]);
        }
    }, [selectedAsset]);

    useEffect(() => {
        fetch('/data/utility_networks.geojson')
            .then(res => res.json())
            .then(data => setGeoData(data))
            .catch(err => console.error("Map Data Error:", err));
            
        fetch(`http://localhost:8000/api/assets?utility=${activeUtility}`)
            .then(res => res.json())
            .then(data => setAssets(data.records || []))
            .catch(err => console.error("Assets Map Fetch Error:", err));
    }, [activeUtility]);

    const getStyle = (feature) => {
        const props = feature.properties;
        const utility = props.utility;
        const type = props.type;
        
        // Hide point features (handled by pointToLayer)
        if (type === 'Connection Hub') return {};

        // Filter by activeUtility unless showing all
        if (activeUtility !== 'Alle Sparten' && utility !== activeUtility) {
            return { opacity: 0, weight: 0, fillOpacity: 0, interactive: false };
        }

        // When an asset is selected, dim everything not belonging to it
        if (selectedAsset) {
            const featureId = props.Kundennummer || props.kundennummer;
            if (featureId && String(featureId) !== String(selectedAsset.Kundennummer)) {
                return { opacity: 0.08, weight: 1, color: utility === 'Gas' ? '#eab308' : '#3b82f6', dashArray: '4 8' };
            }
        }

        // Color: Yellow for Gas, Blue for Wasser
        const baseColor = utility === 'Gas' ? '#eab308' : '#3b82f6';

        if (type === 'Main Pipe') {
            return {
                color: baseColor,
                weight: selectedAsset ? 5 : 4,
                opacity: 0.95,
                dashArray: '8 6',
                lineCap: 'round',
                lineJoin: 'round',
            };
        }

        // Lateral
        return {
            color: baseColor,
            weight: selectedAsset ? 4 : 2,
            opacity: 0.85,
            dashArray: 'none',
        };
    };

    const pointToLayer = (feature, latlng) => {
        if (feature.properties.type !== 'Connection Hub') return null;
        const utility = feature.properties.utility;
        const risk = feature.properties.risiko;
        const color = utility === 'Gas' ? '#eab308' : '#3b82f6';
        const borderColor = risk === 'Hoch' ? '#ef4444' : '#1e293b';

        // Filter by activeUtility
        if (activeUtility !== 'Alle Sparten' && utility !== activeUtility) return null;

        return L.marker(latlng, {
            icon: L.divIcon({
                className: '',
                html: `<div style="
                    width: 10px; height: 10px;
                    background: ${color};
                    border: 2px solid ${borderColor};
                    transform: rotate(45deg);
                    box-shadow: 0 0 4px ${color}88;
                "></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
            }),
        });
    };

    return (
        <div className="tab-pane">
            <div className="map-controls glass-card">
                <div className="control-info">
                    {selectedAsset ? (
                        <>
                            <strong>📍 Fokus:</strong> {selectedAsset.Kundenname} ({selectedAsset.Straße} {selectedAsset.Hausnummer})
                        </>
                    ) : (
                        <>
                            <strong>🗺️ Netz-Übersicht:</strong> {activeUtility}
                        </>
                    )}
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    {selectedAsset && (
                        <div style={{ display: 'flex', background: '#18181b', borderRadius: '8px', padding: '4px', border: '1px solid #3f3f46' }}>
                            <button 
                                className={`btn-table ${viewMode === '2D' ? 'active-view' : ''}`}
                                style={viewMode === '2D' ? { background: '#dc2626', color: 'white', borderColor: '#ef4444' } : { border: 'none', background: 'transparent' }}
                                onClick={() => setViewMode('2D')}
                            >
                                🗺️ 2D Map
                            </button>
                            <button 
                                className={`btn-table ${viewMode === '3D' ? 'active-view' : ''}`}
                                style={viewMode === '3D' ? { background: '#dc2626', color: 'white', borderColor: '#ef4444' } : { border: 'none', background: 'transparent' }}
                                onClick={() => setViewMode('3D')}
                            >
                                🏘️ 3D Streetview
                            </button>
                        </div>
                    )}
                    
                    {selectedAsset ? (
                        <button className="btn-table" onClick={() => {
                            setSelectedAsset(null);
                            setViewMode('2D');
                        }}>
                            🏠 Zurück zur Übersicht
                        </button>
                    ) : (
                        <button className="btn-table" onClick={() => setMapFocus([51.246, 7.039])}>
                            Wülfrath Zentrum
                        </button>
                    )}
                </div>
            </div>

            <div className="map-canvas" style={{ position: 'relative' }}>
                {/* Map Legend */}
                <div style={{
                    position: 'absolute', bottom: '30px', right: '10px', zIndex: 1000,
                    background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(8px)',
                    padding: '12px 16px', borderRadius: '10px',
                    border: '1px solid #3f3f46', fontFamily: 'Outfit, sans-serif',
                    color: 'white', fontSize: '0.8rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#a1a1aa' }}>Legende</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <div style={{ width: '24px', height: '4px', background: '#eab308', borderRadius: '2px' }}></div>
                        <span>Gas Hauptleitung</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <div style={{ width: '24px', height: '4px', background: '#3b82f6', borderRadius: '2px' }}></div>
                        <span>Wasser Hauptleitung</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <div style={{ width: '10px', height: '10px', background: '#eab308', transform: 'rotate(45deg)', border: '2px solid #1e293b' }}></div>
                        <span style={{ paddingLeft: '4px' }}>Gas Anschluss-Hub</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', background: '#3b82f6', transform: 'rotate(45deg)', border: '2px solid #1e293b' }}></div>
                        <span style={{ paddingLeft: '4px' }}>Wasser Anschluss-Hub</span>
                    </div>
                </div>

                {viewMode === '3D' && selectedAsset ? (
                    <StreetView3D asset={selectedAsset} utility={activeUtility} />
                ) : (
                <MapContainer 
                    center={[51.246, 7.039]} 
                    zoom={15} 
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />
                    
                    {geoData && (
                        <GeoJSON 
                            key={JSON.stringify(activeUtility) + (selectedAsset?.Kundennummer || '')}
                            data={geoData} 
                            style={getStyle}
                            pointToLayer={pointToLayer}
                            onEachFeature={(feature, layer) => {
                                if (feature.properties) {
                                    const p = feature.properties;
                                    layer.bindPopup(`
                                        <div class="map-popup">
                                            <h4>${p.utility} &mdash; ${p.type}</h4>
                                            <p>Netz: ${p.network || 'N/A'}</p>
                                            <p>Material: <strong>${p.material || 'N/A'}</strong></p>
                                            <p>Risiko: <strong style="color:${p.risiko === 'Hoch' ? '#ef4444' : 'inherit'}">${p.risiko || 'N/A'}</strong></p>
                                            ${p.Kundenname ? `<p>Kunde: <strong>${p.Kundenname}</strong></p>` : ''}
                                        </div>
                                    `);
                                }
                            }}
                        />
                    )}

                    <MapResizer center={mapFocus} />
                    
                    <MarkerClusterGroup
                        chunkedLoading
                        polygonOptions={{ opacity: 0 }} // Hide the giant polygons
                    >
                        {assets.map((asset, idx) => {
                        const isSelected = selectedAsset && selectedAsset.Kundennummer === asset.Kundennummer;
                        if (!asset.lat || !asset.lon) return null;
                        
                        return (
                            <Marker 
                                key={idx} 
                                position={[asset.lat, asset.lon]}
                                icon={asset.Risiko === 'Hoch' ? redIcon : asset.Sparte === 'Gas' ? yellowIcon : defaultIcon}
                                eventHandlers={{
                                    click: () => {
                                        setSelectedAsset(asset);
                                        setMapFocus([asset.lat, asset.lon]);
                                    }
                                }}
                            >
                                <Popup className="custom-asset-popup">
                                    <h3 style={{ margin: '0 0 5px 0', borderBottom: '2px solid red', paddingBottom: '5px', fontSize: '1.2em', fontWeight: 'normal' }}>
                                        {asset.Kundenname || 'Asset'}
                                    </h3>
                                    <table style={{ width: '100%', marginTop: '10px', fontSize: '0.95em' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ padding: '3px 0' }}><span role="img" aria-label="id">🆔</span> <strong>ID:</strong></td>
                                                <td style={{ padding: '3px 0', paddingLeft: '15px' }}>{asset.Kundennummer}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 0' }}><span role="img" aria-label="sparte">📊</span> <strong>Sparte:</strong></td>
                                                <td style={{ padding: '3px 0', paddingLeft: '15px' }}>{asset.Sparte}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 0' }}><span role="img" aria-label="ort">📍</span> <strong>Ort:</strong></td>
                                                <td style={{ padding: '3px 0', paddingLeft: '15px' }}>42489 Wülfrath</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 0' }}><span role="img" aria-label="adresse">🏠</span> <strong>Adresse:</strong></td>
                                                <td style={{ padding: '3px 0', paddingLeft: '15px' }}>{asset.Straße} {asset.Hausnummer}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 0' }}><span role="img" aria-label="alter">⏳</span> <strong>Alter:</strong></td>
                                                <td style={{ padding: '3px 0', paddingLeft: '15px' }}>{asset.Alter} {asset.Alter ? 'Jahre' : ''}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 0' }}><span role="img" aria-label="risiko">⚠️</span> <strong>Risiko:</strong></td>
                                                <td style={{ 
                                                    padding: '3px 0', 
                                                    paddingLeft: '15px',
                                                    color: asset.Risiko === 'Hoch' ? 'red' : 'inherit',
                                                    fontWeight: asset.Risiko === 'Hoch' ? 'bold' : 'normal'
                                                }}>{asset.Risiko}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </Popup>
                            </Marker>
                        );
                    })}
                    </MarkerClusterGroup>
                </MapContainer>
                )}
            </div>
        </div>
    );
}

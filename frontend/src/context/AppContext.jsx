import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeUtility, setActiveUtility] = useState('Alle Sparten');
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [activeTab, setActiveTab] = useState('analysis');

    // Trigger map view for specific asset
    const viewAssetOnMap = (asset) => {
        setSelectedAsset(asset);
        setActiveTab('map');
    };

    // Fetch KPIs when utility changes
    useEffect(() => {
        if (isAuthenticated) {
            fetchKPIs();
        }
    }, [activeUtility, isAuthenticated]);

    const fetchKPIs = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`http://localhost:8000/api/kpis?utility=${activeUtility}`);
            setKpis(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch KPIs:', err);
            setError('Systemdaten konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const login = (username, password) => {
        // Mock authentication based on app.py logic
        if (username === 'admin' && password === 'esc_service_2026') {
            setIsAuthenticated(true);
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
    };

    const value = {
        isAuthenticated,
        activeUtility,
        setActiveUtility,
        kpis,
        loading,
        error,
        login,
        logout,
        fetchKPIs,
        activeTab,
        setActiveTab,
        selectedAsset,
        setSelectedAsset,
        viewAssetOnMap
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

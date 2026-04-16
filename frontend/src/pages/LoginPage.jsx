import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useApp();
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        const success = login(username, password);
        if (success) {
            navigate('/dashboard');
        } else {
            setError('Ungültige Zugangsdaten.');
        }
    };

    return (
        <div className="login-page">
            <div className="login-backdrop"></div>
            <div className="login-card glass-card">
                <div className="login-header">
                    <img src="https://img.icons8.com/isometric/100/factory.png" alt="Logo" width="60" />
                    <h2>STADTWERKE X</h2>
                    <p>Verschlüsselter Systemzugriff</p>
                </div>
                
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <label>Benutzername</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ihr System-ID"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Passwort</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    
                    {error && <div className="login-error">{error}</div>}
                    
                    <button type="submit" className="btn-premium btn-primary">
                        Authentifizieren
                    </button>
                    
                    <button type="button" className="btn-cancel" onClick={() => navigate('/')}>
                        Abbrechen
                    </button>
                </form>
            </div>
        </div>
    );
}

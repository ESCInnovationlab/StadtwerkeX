import React, { useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { Vector3 } from 'three';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import EarthGroup from '../components/3d/EarthGroup';
import './LoginPage.css';

function LoginCameraRig() {
    const germanyLookAt = new Vector3(-0.97, 3.91, -3.10);
    const targetPosition = new Vector3(-2.45, 4.5, 1.3);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        state.camera.position.x = targetPosition.x + Math.sin(t * 0.28) * 0.08;
        state.camera.position.y = targetPosition.y + Math.cos(t * 0.22) * 0.05;
        state.camera.position.z = targetPosition.z + Math.sin(t * 0.2) * 0.06;
        state.camera.lookAt(germanyLookAt);
    });

    return null;
}

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
            <Canvas
                camera={{ position: [-2.45, 4.5, 1.3], fov: 34 }}
                className="login-webgl"
            >
                <color attach="background" args={['#020408']} />
                <ambientLight intensity={0.35} />
                <directionalLight position={[10, 5, -5]} intensity={2.5} />
                <pointLight position={[-10, -5, 5]} intensity={1} color="#3b82f6" />
                <Stars radius={300} depth={60} count={10000} factor={6} saturation={0} fade speed={0.8} />
                <EarthGroup highlightGermany autoRotate={false} />
                <LoginCameraRig />
            </Canvas>
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

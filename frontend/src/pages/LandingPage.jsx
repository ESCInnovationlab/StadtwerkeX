import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import EarthGroup from '../components/3d/EarthGroup';
import CameraRig from '../components/3d/CameraRig';
import './LandingPage.css';

export default function LandingPage() {
    const [isZooming, setIsZooming] = useState(false);
    const navigate = useNavigate();

    const handleStart = () => {
        setIsZooming(true);
    };

    const onZoomComplete = () => {
        navigate('/login');
    };

    return (
        <div className="landing-container">
            <Canvas 
                camera={{ position: [0, 0, 15], fov: 45 }}
                className="webgl-canvas"
            >
                <color attach="background" args={['#020408']} />
                <ambientLight intensity={0.3} />
                <directionalLight position={[10, 5, -5]} intensity={2.5} />
                <pointLight position={[-10, -5, 5]} intensity={1} color="#3b82f6" />
                
                <Stars radius={300} depth={60} count={20000} factor={7} saturation={0} fade speed={1} />
                
                <Suspense fallback={null}>
                    <EarthGroup />
                    <CameraRig isZooming={isZooming} onComplete={onZoomComplete} />
                </Suspense>
            </Canvas>

            <div className={`ui-overlay ${isZooming ? 'exit' : ''}`}>
                <h1 className="landing-title">STADTWERKE X</h1>
                <p className="landing-subtitle">INFRASTRUCTURE INTELLIGENCE UNIT</p>
                <button className="btn-init" onClick={handleStart}>
                    SYSTEMSTART
                </button>
            </div>
        </div>
    );
}

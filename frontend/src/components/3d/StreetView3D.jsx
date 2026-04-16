import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Html, Float, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// Realistic House Component
const DetailedHouse = ({ position, isFocused }) => {
    return (
        <group position={position}>
            {/* House Body */}
            <mesh position={[0, 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[4, 4, 4]} />
                <meshStandardMaterial color={isFocused ? "#27272a" : "#18181b"} roughness={0.7} />
            </mesh>
            
            {/* Windows */}
            {[
                [1.2, 2.5, 2.01], [-1.2, 2.5, 2.01], // Front Top
                [1.2, 1, 2.01], [-1.2, 1, 2.01],    // Front Bottom
            ].map((p, i) => (
                <mesh key={i} position={p}>
                    <planeGeometry args={[1, 1]} />
                    <meshStandardMaterial 
                        color="#ffffff" 
                        emissive="#fde047" 
                        emissiveIntensity={isFocused ? 1.5 : 0.5} 
                    />
                </mesh>
            ))}

            {/* Roof */}
            <mesh position={[0, 4.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                <coneGeometry args={[3.8, 2.5, 4]} />
                <meshStandardMaterial color="#09090b" roughness={0.1} metalness={0.5} />
            </mesh>

            {/* Door */}
            <mesh position={[0, 0.75, 2.02]}>
                <planeGeometry args={[1, 1.5]} />
                <meshStandardMaterial color="#7f1d1d" />
            </mesh>
        </group>
    );
};

// Underground Multi-Pipeline Infrastructure
const InfrastructureGrid = ({ risk, isFocusedHouse }) => {
    const gasColor = "#eab308"; // Yellow for Gas
    const waterColor = "#3b82f6"; // Blue for Water
    
    const materialRefGas = useRef();
    const materialRefWater = useRef();

    useFrame(({ clock }) => {
        if (isFocusedHouse) {
            const t = clock.elapsedTime;
            if (materialRefGas.current) materialRefGas.current.emissiveIntensity = 2 + Math.sin(t * 4) * 1.5;
            if (materialRefWater.current) materialRefWater.current.emissiveIntensity = 2 + Math.cos(t * 4) * 1.5;
        }
    });

    return (
        <group position={[0, -1.5, 0]}>
            {/* MAIN LINES UNDER THE ROAD (Parallel) */}
            {/* Gas Line (Red) */}
            <mesh position={[0.5, 0, 7]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.2, 0.2, 100]} />
                <meshStandardMaterial color={gasColor} emissive={gasColor} emissiveIntensity={0.5} />
            </mesh>

            {/* Water Line (Blue) */}
            <mesh position={[-0.5, 0, 7]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.2, 0.2, 100]} />
                <meshStandardMaterial color={waterColor} emissive={waterColor} emissiveIntensity={0.5} />
            </mesh>

            {/* BRANCHING CONNECTIONS TO THE HOUSE */}
            {isFocusedHouse && (
                <group>
                    {/* Gas Lateral */}
                    <mesh position={[0.5, 0, 3.5]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.15, 0.15, 7.5]} />
                        <meshStandardMaterial ref={materialRefGas} color={gasColor} emissive={gasColor} emissiveIntensity={1} />
                    </mesh>

                    {/* Water Lateral */}
                    <mesh position={[-0.5, 0, 3.5]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.15, 0.15, 7.5]} />
                        <meshStandardMaterial ref={materialRefWater} color={waterColor} emissive={waterColor} emissiveIntensity={1} />
                    </mesh>
                    
                    {/* Connection Point at House (Meter) */}
                    <mesh position={[0, 2, 1.5]}>
                        <boxGeometry args={[1.2, 0.8, 0.4]} />
                        <meshStandardMaterial 
                            color={risk === 'Hoch' ? "#ef4444" : "#22c55e"} 
                            emissive={risk === 'Hoch' ? "#ef4444" : "#22c55e"} 
                            emissiveIntensity={1} 
                        />
                    </mesh>
                </group>
            )}
        </group>
    );
};

// Street Lamps
const StreetLamp = ({ position }) => (
    <group position={position}>
        <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.05, 0.1, 6]} />
            <meshStandardMaterial color="#09090b" />
        </mesh>
        <mesh position={[0, 6, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 1]} />
            <meshStandardMaterial color="#09090b" />
        </mesh>
        <pointLight position={[0, 5.8, 1]} intensity={5} color="#fef08a" distance={10} />
    </group>
);

export default function StreetView3D({ asset }) {
    const houses = useMemo(() => [
        { pos: [-12, 0, 0], id: 1 },
        { pos: [-6, 0, 0], id: 2 },
        { pos: [0, 0, 0], id: 0, focused: true },
        { pos: [6, 0, 0], id: 3 },
        { pos: [12, 0, 0], id: 4 },
    ], []);

    if (!asset) return null;

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Canvas shadows camera={{ position: [-15, 12, 20], fov: 35 }}>
                <color attach="background" args={['#020617']} />
                
                <ambientLight intensity={0.2} />
                <spotLight position={[20, 20, 10]} intensity={2} castShadow />
                
                {/* Semi-Transparent Road */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 10]} receiveShadow>
                    <planeGeometry args={[100, 10]} />
                    <meshPhysicalMaterial 
                        color="#0a0a0a" 
                        roughness={0.5} 
                        transparent 
                        opacity={0.85} // Clear enough to see underground lines
                        metalness={0.2}
                    />
                </mesh>

                {/* Infrastructure */}
                <InfrastructureGrid risk={asset.Risiko} isFocusedHouse={true} />

                {/* Houses & Environment */}
                {houses.map((h) => (
                    <DetailedHouse key={h.id} position={h.pos} isFocused={h.focused} />
                ))}
                
                <StreetLamp position={[-15, 0, 4]} />
                <StreetLamp position={[0, 0, 4]} />
                <StreetLamp position={[15, 0, 4]} />

                <OrbitControls minDistance={10} maxDistance={35} maxPolarAngle={Math.PI / 2.1} makeDefault />

                <EffectComposer>
                    <Bloom luminanceThreshold={1} intensity={1.5} radius={0.4} />
                    <Vignette offset={0.1} darkness={1.1} />
                </EffectComposer>

                {/* Overlay Info inside Canvas */}
                <Html position={[0, 8, 0]} center distanceFactor={15}>
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.9)',
                        color: 'white',
                        padding: '12px 20px',
                        borderRadius: '12px',
                        border: '1px solid #3f3f46',
                        fontFamily: 'Outfit, sans-serif',
                        backdropFilter: 'blur(10px)',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none'
                    }}>
                        <strong>{asset.Kundenname}</strong>
                        <div style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>{asset.Straße} {asset.Hausnummer}</div>
                    </div>
                </Html>
            </Canvas>
        </div>
    );
}

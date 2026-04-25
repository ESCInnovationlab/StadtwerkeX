import React, { useMemo, useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export default function EarthGroup({
  highlightGermany = false,
  autoRotate = true,
  rotationSpeed = 0.00035,
  baseRotation = [0, 0, 0]
}) {
  const earthRef = useRef();
  const germanyGlowRef = useRef();
  const germanyPointLightRef = useRef();
  
  const [colorMap, specularMap, normalMap] = useLoader(THREE.TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg'
  ]);

  const germanyPosition = useMemo(() => {
    return latLonToVector3(51.1657, 10.4515, 5.08);
  }, []);

  useFrame(({ clock }, delta) => {
    if (earthRef.current) {
      if (autoRotate) {
        earthRef.current.rotation.y += rotationSpeed * (delta * 60);
      }

      if (highlightGermany && germanyGlowRef.current && germanyPointLightRef.current) {
        const t = clock.getElapsedTime();
        const basePulse = 0.68 + Math.sin(t * 2.9) * 0.08;

        // Sharp intermittent "lightning" bursts:
        // - high-frequency carrier gives spiky peaks
        // - gate only opens in narrow random-like windows
        const spikeCarrier = Math.pow(Math.max(0, Math.sin(t * 58)), 9);
        const gateA = Math.max(0, Math.sin(t * 1.8 + Math.sin(t * 0.31) * 1.2) - 0.83) * 5.8;
        const gateB = Math.max(0, Math.sin(t * 2.5 + 1.4) - 0.86) * 6.5;
        const lightningFlash = spikeCarrier * (gateA + gateB);

        const flashScale = Math.min(lightningFlash, 1.45);

        germanyGlowRef.current.scale.setScalar(basePulse + flashScale * 0.22);
        germanyGlowRef.current.material.opacity = 0.34 + basePulse * 0.18 + flashScale * 0.48;
        germanyPointLightRef.current.intensity = 1.5 + basePulse * 1.5 + flashScale * 6.2;
      }
    }
  });

  return (
    <group ref={earthRef} rotation={baseRotation}>
      {/* Primary Earth Mesh */}
      <mesh>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial 
          map={colorMap}
          normalMap={normalMap}
          roughnessMap={specularMap}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Atmospheric Glow */}
      <mesh scale={1.03}>
        <sphereGeometry args={[5, 64, 64]} />
        <meshPhysicalMaterial 
          color="#4b90ff"
          transparent
          opacity={0.3}
          roughness={1}
          transmission={0.5} 
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {highlightGermany && (
        <group position={germanyPosition}>
          <pointLight
            ref={germanyPointLightRef}
            color="#88d4ff"
            intensity={2.2}
            distance={4}
            decay={1.4}
          />
          <mesh ref={germanyGlowRef}>
            <sphereGeometry args={[0.24, 24, 24]} />
            <meshBasicMaterial
              color="#9cd9ff"
              transparent
              opacity={0.48}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

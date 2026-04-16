import React, { useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function EarthGroup() {
  const earthRef = useRef();
  
  const [colorMap, specularMap, normalMap] = useLoader(THREE.TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg'
  ]);

  useFrame(() => {
    if (earthRef.current) {
        earthRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <group ref={earthRef}>
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
    </group>
  );
}

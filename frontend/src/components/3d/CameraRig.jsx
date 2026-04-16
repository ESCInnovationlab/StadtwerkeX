import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useEffect } from 'react';
import gsap from 'gsap';

export default function CameraRig({ isZooming, onComplete }) {
  const { camera, mouse } = useThree();
  const targetPos = new Vector3(-3.8, 4.6, 2.5); // Target: Germany approximate coordinates on the sphere
  
  useEffect(() => {
    if (isZooming) {
      // Precise zoom animation matching landing_3d.html logic
      const tl = gsap.timeline({
        onComplete: onComplete
      });

      tl.to(camera.position, {
        z: camera.position.z + 1.5,
        duration: 0.5,
        ease: "power2.out"
      }, 0)
      .to(camera, {
        fov: 85,
        duration: 0.5,
        onUpdate: () => camera.updateProjectionMatrix()
      }, 0);

      tl.to(camera.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: 1.5,
        ease: "expo.inOut"
      }, 0.5)
      .to(camera, {
        fov: 30,
        duration: 1.5,
        ease: "power3.out",
        onUpdate: () => camera.updateProjectionMatrix()
      }, 0.8);
    }
  }, [isZooming, camera, onComplete]);

  useFrame((state) => {
    if (!isZooming) {
        // Subtle floating animation
        const t = state.clock.getElapsedTime();
        const floatY = Math.sin(t * 0.5) * 0.1;
        const floatX = Math.cos(t * 0.3) * 0.1;
        
        // Target position based on mouse but anchored at z=15
        const targetX = mouse.x * 2 + floatX;
        const targetY = mouse.y * 2 + floatY;
        
        // Smoothly move camera towards the interactive target
        state.camera.position.lerp(new Vector3(targetX, targetY, 15), 0.05);
        state.camera.lookAt(0, 0, 0);
    }
  });

  return null;
}

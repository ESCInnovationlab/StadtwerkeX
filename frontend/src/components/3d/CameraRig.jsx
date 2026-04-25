import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';

export default function CameraRig({ isZooming, onComplete }) {
  const { camera, mouse } = useThree();
  const focusPoint = useMemo(() => new Vector3(-0.97, 3.91, -3.10), []);
  const targetPos = useMemo(() => new Vector3(-2.6, 4.7, 1.0), []);
  const desiredPosition = useRef(new Vector3(0, 0, 15));
  const lookAtTarget = useRef(new Vector3(0, 0, 0));
  
  useEffect(() => {
    if (isZooming) {
      const tl = gsap.timeline({
        onComplete: onComplete
      });

      tl.to(camera.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: 1.8,
        ease: "power3.inOut"
      }, 0.5)
      .to(camera, {
        fov: 34,
        duration: 1.8,
        ease: "power3.out",
        onUpdate: () => camera.updateProjectionMatrix()
      }, 0.5);

      tl.to(lookAtTarget.current, {
        x: focusPoint.x,
        y: focusPoint.y,
        z: focusPoint.z,
        duration: 1.5,
        ease: "power2.out"
      }, 0.75);
    }
  }, [isZooming, camera, onComplete, targetPos, focusPoint]);

  useFrame((state) => {
    if (!isZooming) {
      const t = state.clock.getElapsedTime();
      const floatY = Math.sin(t * 0.55) * 0.07;
      const floatX = Math.cos(t * 0.4) * 0.06;

      // Smoother mouse response with lower sensitivity.
      const targetX = mouse.x * 1.1 + floatX;
      const targetY = mouse.y * 0.8 + floatY;
      desiredPosition.current.set(targetX, targetY, 15);

      state.camera.position.lerp(desiredPosition.current, 0.03);
      lookAtTarget.current.lerp(new Vector3(0, 0, 0), 0.08);
      state.camera.lookAt(lookAtTarget.current);
    } else {
      state.camera.lookAt(lookAtTarget.current);
    }
  });

  return null;
}

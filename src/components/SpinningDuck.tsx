"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const YELLOW = 0xffd23f;
const ORANGE = 0xf58220;
const DARK = 0x1c1917;

/** Builds a low-poly rubber duck out of primitives, centered on the origin. */
function createDuck() {
  const duck = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: YELLOW,
    roughness: 0.42,
    metalness: 0.05,
  });
  const beakMaterial = new THREE.MeshStandardMaterial({
    color: ORANGE,
    roughness: 0.5,
    metalness: 0.02,
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: DARK,
    roughness: 0.25,
    metalness: 0.1,
  });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), bodyMaterial);
  body.scale.set(1.25, 1, 0.98);
  duck.add(body);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 20), bodyMaterial);
  tail.position.set(-1.14, 0.42, 0);
  tail.rotation.z = Math.PI / 2 + 0.55;
  duck.add(tail);

  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.42, 12, 24), bodyMaterial);
  neck.position.set(0.72, 0.62, 0);
  neck.rotation.z = -0.42;
  duck.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 40, 28), bodyMaterial);
  head.position.set(0.98, 1.05, 0);
  duck.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.52, 20), beakMaterial);
  beak.position.set(1.48, 0.98, 0);
  beak.rotation.z = -Math.PI / 2;
  duck.add(beak);

  const eyeGeometry = new THREE.SphereGeometry(0.075, 16, 12);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(1.21, 1.19, side * 0.25);
    duck.add(eye);
  }

  const wingGeometry = new THREE.SphereGeometry(0.58, 32, 20);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeometry, bodyMaterial);
    wing.position.set(0.02, 0.12, side * 0.74);
    wing.scale.set(0.95, 0.62, 0.3);
    wing.rotation.x = side * 0.12;
    duck.add(wing);
  }

  return duck;
}

export default function SpinningDuck() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 1.3, 6.4);
    camera.lookAt(0, 0.45, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffe9b0, 1.2);
    rimLight.position.set(-5, 2, -4);
    scene.add(rimLight);

    const duck = createDuck();
    scene.add(duck);

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = new THREE.Timer();
    timer.connect(document);
    let frame = 0;

    const animate = () => {
      timer.update();
      const elapsed = timer.getElapsed();
      const speed = reducedMotion.matches ? 0.18 : 0.7;
      duck.rotation.y = elapsed * speed;
      duck.rotation.z = Math.sin(elapsed * 1.1) * 0.04;
      duck.position.y = Math.sin(elapsed * 1.5) * 0.09;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      timer.disconnect();
      observer.disconnect();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((entry) => entry.dispose());
          } else {
            material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Pato 3D girando"
      className="h-full w-full"
    />
  );
}

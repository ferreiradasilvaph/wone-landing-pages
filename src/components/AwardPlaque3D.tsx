"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, RoundedBox, Float } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import type { Mesh, Group } from "three";

/**
 * Placa de acrílico gerada por código.
 *
 * Não é um modelo dos troféus reais — não há `.glb` no projeto. É um bloco
 * translúcido com bisel e o símbolo da marca extrudado, tingido pela cor do
 * marco ativo. O material usa `transmission`, que dá o vidro sem precisar de
 * textura.
 */
function Plaque({ accent, spin }: { accent: string; spin: boolean }) {
  const group = useRef<Group>(null);
  const block = useRef<Mesh>(null);

  useFrame((state) => {
    if (!group.current) return;

    // Vaivém de ±35° em vez de giro completo: a face com o logo fica sempre
    // voltada para quem olha. Num giro de 360° a placa passa boa parte do
    // tempo de perfil, aparecendo como uma lasca.
    const sway = spin ? Math.sin(state.clock.elapsedTime * 0.45) * 0.62 : 0;

    group.current.rotation.y = sway + state.pointer.x * 0.35;
    group.current.rotation.x = -state.pointer.y * 0.18;
  });

  return (
    <group ref={group}>
      {/* Bloco de acrílico */}
      <RoundedBox ref={block} args={[2.2, 2.9, 0.42]} radius={0.1} smoothness={6}>
        <meshPhysicalMaterial
          transmission={0.94}
          thickness={1.1}
          roughness={0.14}
          ior={1.46}
          clearcoat={1}
          clearcoatRoughness={0.08}
          attenuationColor={accent}
          attenuationDistance={2.4}
          color="#ffffff"
        />
      </RoundedBox>

      {/* Dois anéis entrelaçados do ícone, em relevo na face */}
      {[-0.34, 0.34].map((x) => (
        <mesh key={x} position={[x, 0.26, 0.2]}>
          <torusGeometry args={[0.46, 0.085, 20, 64]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.55}
            metalness={0.65}
            roughness={0.25}
          />
        </mesh>
      ))}

      {/* Base escura, para a placa parecer apoiada */}
      <mesh position={[0, -1.72, 0]}>
        <cylinderGeometry args={[1.15, 1.3, 0.3, 48]} />
        <meshStandardMaterial color="#0a0a0d" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

/**
 * Canvas da placa. Importado por `next/dynamic` com `ssr: false` no carrossel,
 * para o three não entrar no bundle inicial nem rodar no servidor.
 */
export default function AwardPlaque3D({ accent }: { accent: string }) {
  const reduced = useReducedMotion();
  // `dpr` limitado: em telas retina o custo de preencher o canvas com um
  // material transmissivo cresce rápido.
  const dpr = useMemo<[number, number]>(() => [1, 1.5], []);

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 6.4], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <directionalLight position={[-5, -2, -4]} intensity={0.9} color={accent} />
      <Environment preset="city" />

      <Float
        speed={reduced ? 0 : 1.4}
        rotationIntensity={reduced ? 0 : 0.25}
        floatIntensity={reduced ? 0 : 0.5}
      >
        <Plaque accent={accent} spin={!reduced} />
      </Float>
    </Canvas>
  );
}

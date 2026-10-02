"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Environment, Extrude } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { Shape, type Group } from "three";

/**
 * Perfis 2D das quatro etapas, extrudados em 3D.
 *
 * Coordenadas num quadrado de -1 a 1, centradas pelo `<Center>` do drei. O
 * `gateway` é o lugar reservado para a Dotfy: trocar o corpo desta função pelo
 * contorno oficial é a única alteração necessária quando o arquivo chegar.
 */
function buildShape(name: string): Shape {
  const s = new Shape();

  if (name === "telegram") {
    // Avião de papel
    s.moveTo(-1, 0.25);
    s.lineTo(1, 0.95);
    s.lineTo(0.15, -0.95);
    s.lineTo(-0.05, -0.1);
    s.lineTo(-1, 0.25);
    return s;
  }

  if (name === "funnel") {
    // Funil com haste
    s.moveTo(-1, 0.9);
    s.lineTo(1, 0.9);
    s.lineTo(0.18, -0.1);
    s.lineTo(0.18, -0.95);
    s.lineTo(-0.18, -0.7);
    s.lineTo(-0.18, -0.1);
    s.lineTo(-1, 0.9);
    return s;
  }

  if (name === "money") {
    // Cifrão esquematizado em traço grosso
    s.moveTo(-0.55, 0.82);
    s.lineTo(0.62, 0.82);
    s.lineTo(0.62, 0.46);
    s.lineTo(-0.16, 0.46);
    s.lineTo(-0.16, 0.18);
    s.lineTo(0.62, 0.18);
    s.lineTo(0.62, -0.82);
    s.lineTo(-0.62, -0.82);
    s.lineTo(-0.62, -0.46);
    s.lineTo(0.22, -0.46);
    s.lineTo(0.22, -0.18);
    s.lineTo(-0.62, -0.18);
    s.lineTo(-0.62, 0.82);
    return s;
  }

  // gateway: cartão com tarja
  s.moveTo(-0.95, 0.6);
  s.lineTo(0.95, 0.6);
  s.lineTo(0.95, -0.6);
  s.lineTo(-0.95, -0.6);
  s.lineTo(-0.95, 0.6);
  return s;
}

function Solid({ name, hovered }: { name: string; hovered: boolean }) {
  const group = useRef<Group>(null);
  const shape = useMemo(() => buildShape(name), [name]);

  useFrame((state, delta) => {
    if (!group.current) return;

    // Em repouso oscila devagar; sob o cursor acelera e inclina um pouco mais.
    const t = state.clock.elapsedTime;
    const amplitude = hovered ? 0.85 : 0.4;
    const speed = hovered ? 1.1 : 0.5;

    const targetY = Math.sin(t * speed) * amplitude;
    const targetX = hovered ? -0.18 : Math.sin(t * 0.35) * 0.12;

    // Interpolação suave, para a mudança de ritmo no hover não dar solavanco.
    group.current.rotation.y += (targetY - group.current.rotation.y) * delta * 4;
    group.current.rotation.x += (targetX - group.current.rotation.x) * delta * 4;

    const scale = hovered ? 1.12 : 1;
    group.current.scale.x += (scale - group.current.scale.x) * delta * 6;
    group.current.scale.y = group.current.scale.z = group.current.scale.x;
  });

  return (
    <group ref={group}>
      <Center>
        {/* O cifrão precisa da haste atravessando o S, e o gateway da tarja —
            as duas são peças soltas, que um Shape único não comporta. */}
        {name === "money" && (
          <mesh position={[0, 0, 0.17]}>
            <boxGeometry args={[0.2, 2.3, 0.34]} />
            <meshPhysicalMaterial
              color={hovered ? "#FF9D45" : "#FF7700"}
              emissive="#FF7700"
              emissiveIntensity={hovered ? 0.55 : 0.22}
              metalness={0.75}
              roughness={0.22}
            />
          </mesh>
        )}

        {name === "gateway" && (
          <mesh position={[0, 0.22, 0.36]}>
            <boxGeometry args={[1.9, 0.3, 0.08]} />
            <meshStandardMaterial color="#1b1b24" metalness={0.6} roughness={0.4} />
          </mesh>
        )}

        <Extrude
          args={[
            shape,
            {
              depth: 0.34,
              bevelEnabled: true,
              bevelSize: 0.05,
              bevelThickness: 0.05,
              bevelSegments: 4,
            },
          ]}
        >
          {/* Degradê de requinte: o metal laranja escurece nas faces laterais e
              acende nas quinas por conta do bevel + emissive. */}
          <meshPhysicalMaterial
            color={hovered ? "#FF9D45" : "#FF7700"}
            emissive="#FF7700"
            emissiveIntensity={hovered ? 0.55 : 0.22}
            metalness={0.75}
            roughness={0.22}
            clearcoat={1}
            clearcoatRoughness={0.15}
          />
        </Extrude>
      </Center>
    </group>
  );
}

/**
 * Canvas de um ícone. Montado só quando a etapa entra em vista (quem decide é
 * o `StepsTimeline`), para não abrir quatro contextos WebGL de uma vez.
 */
export default function StepIcon3D({
  name,
  hovered,
}: {
  name: string;
  hovered: boolean;
}) {
  const reduced = useReducedMotion();
  const dpr = useMemo<[number, number]>(() => [1, 1.5], []);

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 4.2], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      // Sem movimento, desenha um quadro e para — nada de laço de render.
      frameloop={reduced ? "demand" : "always"}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <directionalLight position={[-4, -2, -3]} intensity={0.8} color="#FF7700" />
      <Environment preset="city" />
      <Solid name={name} hovered={hovered && !reduced} />
    </Canvas>
  );
}

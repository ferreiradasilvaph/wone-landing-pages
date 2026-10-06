"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Quaternion,
  Vector3,
  type Group,
  type Mesh,
} from "three";

/* --------------------------------------------------------------------------
   O globo

   O designer olhou o card dos quatro países: "esse eu gostei, mas comparado aos
   demais está simples" — apontando a parte das bandeiras, que era uma lista de
   quatro linhas. A lista continua embaixo, porque é por ela que se escolhe o
   país; o que entrou foi o lugar de onde o preço está saindo.

   O globo é de pontos, não de contornos: distribuição uniforme pela esfera, sem
   fronteiras desenhadas. É honesto (não existe mapa oficial aqui dentro) e lê
   na hora como planeta. Os quatro marcadores ficam na latitude e longitude de
   verdade de cada capital, e o globo gira para pôr o país escolhido de frente —
   a rotação sai de um `setFromUnitVectors` entre o marcador e a direção da
   câmera, então é exata, sem conta de ângulo de Euler.
   -------------------------------------------------------------------------- */

/** Capitais dos quatro países onde a Wone cobra. */
const PLACES: Record<string, { lat: number; lon: number }> = {
  BRL: { lat: -15.8, lon: -47.9 },
  ARS: { lat: -34.6, lon: -58.4 },
  MXN: { lat: 19.4, lon: -99.1 },
  COP: { lat: 4.7, lon: -74.1 },
};

const BRAND = "#FF7700";
const FRONT = new Vector3(0, 0, 1);
/** Quantos pontos formam a casca. 2400 fecha a superfície e não pesa. */
const DOTS = 2400;

/** Direção (vetor unitário) de uma coordenada geográfica. */
function direction(lat: number, lon: number) {
  const phi = (lat * Math.PI) / 180;
  const theta = (lon * Math.PI) / 180;
  return new Vector3(
    Math.cos(phi) * Math.sin(theta),
    Math.sin(phi),
    Math.cos(phi) * Math.cos(theta),
  );
}

/** Casca de pontos distribuídos por espiral de Fibonacci — sem aglomerar nos polos. */
function useDotShell() {
  return useMemo(() => {
    const positions = new Float32Array(DOTS * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < DOTS; i += 1) {
      const y = 1 - (i / (DOTS - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;

      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * radius;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    return geometry;
  }, []);
}

type GlobeProps = {
  /** Códigos das moedas, na ordem em que aparecem na lista. */
  codes: string[];
  active: number;
  reduced: boolean;
};

function Globe({ codes, active, reduced }: GlobeProps) {
  const globe = useRef<Group>(null);
  const pulse = useRef<Mesh>(null);
  const dots = useDotShell();

  const targets = useMemo(
    () =>
      codes.map((code) => {
        const place = PLACES[code] ?? { lat: 0, lon: 0 };
        return direction(place.lat, place.lon);
      }),
    [codes],
  );

  /** Rotação que traz o marcador escolhido para a frente da câmera. */
  const facing = useMemo(() => {
    const quaternion = new Quaternion();
    return (index: number) =>
      quaternion.setFromUnitVectors(targets[index] ?? FRONT, FRONT);
  }, [targets]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    if (globe.current) {
      const target = facing(active);
      globe.current.quaternion.slerp(target, reduced ? 1 : 1 - Math.exp(-4.5 * dt));
    }

    /* O anel do país ativo respira — é o que diz "é este aqui". */
    if (pulse.current && !reduced) {
      const beat = 1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.14;
      pulse.current.scale.setScalar(beat);
    }
  });

  return (
    <group>
      {/* Halo: a atmosfera vista por dentro, que separa o globo do preto */}
      <mesh scale={1.17}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial color={BRAND} transparent opacity={0.08} side={BackSide} />
      </mesh>

      <group ref={globe}>
        {/* Corpo opaco: é ele que esconde os pontos do outro lado */}
        <mesh>
          <sphereGeometry args={[0.975, 48, 32]} />
          <meshStandardMaterial color="#0c0c11" roughness={1} metalness={0} />
        </mesh>

        {/* A casca de pontos */}
        <points geometry={dots}>
          <pointsMaterial
            color={BRAND}
            size={0.021}
            sizeAttenuation
            transparent
            opacity={0.62}
          />
        </points>

        {/* Linha do equador, só para o giro ter referência */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.002, 0.0035, 6, 96]} />
          <meshBasicMaterial color="#FFFFE3" transparent opacity={0.12} />
        </mesh>

        {targets.map((dir, index) => {
          const position = dir.clone().multiplyScalar(1.01);
          const isActive = index === active;

          return (
            <group
              key={codes[index]}
              position={position}
              onUpdate={(self) => self.lookAt(0, 0, 0)}
            >
              {/* Pino */}
              <mesh>
                <sphereGeometry args={[isActive ? 0.045 : 0.03, 12, 10]} />
                <meshBasicMaterial color={isActive ? "#FFFFE3" : BRAND} />
              </mesh>

              {/* Anel em volta: pulsa no país escolhido */}
              <mesh ref={isActive ? pulse : undefined} position={[0, 0, 0.004]}>
                <torusGeometry args={[isActive ? 0.09 : 0.055, 0.008, 6, 36]} />
                <meshBasicMaterial
                  color={BRAND}
                  transparent
                  opacity={isActive ? 0.95 : 0.45}
                />
              </mesh>

              {/* Feixe saindo do país ativo: é o pagamento subindo */}
              {isActive && (
                <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.012, 0.004, 0.22, 8]} />
                  <meshBasicMaterial color={BRAND} transparent opacity={0.5} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    </group>
  );
}

/**
 * Canvas do globo. Carregado por `next/dynamic` dentro do `CheckoutDemo`, então
 * o three só vem para quem abre esta aba.
 */
export default function GlobeScene(props: GlobeProps) {
  const dpr = useMemo<[number, number]>(() => [1, 1.5], []);

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 3.15], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[2.5, 2, 3]} intensity={2} />
      <directionalLight position={[-3, -1, -2]} intensity={0.8} color={BRAND} />
      <Globe {...props} />
    </Canvas>
  );
}

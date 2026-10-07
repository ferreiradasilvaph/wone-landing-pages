"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Quaternion,
  Vector3,
  type Group,
  type Mesh,
  type ShaderMaterial,
} from "three";
import { isLand } from "./landMask";

/* --------------------------------------------------------------------------
   O globo

   O designer olhou o card dos quatro países: "esse eu gostei, mas comparado aos
   demais está simples" — apontando a parte das bandeiras, que era uma lista de
   quatro linhas. A lista continua embaixo, porque é por ela que se escolhe o
   país; o que entrou foi o lugar de onde o preço está saindo.

   A primeira versão era uma esfera de pontos distribuídos por igual: lia como
   planeta, mas não como *este* planeta — faltava reconhecer a América do Sul
   girando para a frente. Agora os pontos só caem em terra firme, consultando a
   máscara do Natural Earth em `landMask` (1° × 1°, 8 kB de base64, nenhuma
   textura para baixar). O oceano virou uma esfera escura e iluminada, que é o
   que esconde os pontos do outro lado e dá a curvatura.

   O resto do acabamento: os pontos têm shader próprio, então escurecem e
   encolhem no lado que a luz não pega — é isso que faz a bola parecer redonda
   num quadro de 240 px; a atmosfera é um fresnel por fora, não um halo de
   opacidade fixa; e a grade de meridianos e paralelos fica no limite do
   visível, só para o giro ter referência.

   Os quatro marcadores ficam na latitude e longitude de verdade de cada
   capital, e o globo gira para pôr o país escolhido de frente — a rotação sai
   de um `setFromUnitVectors` entre o marcador e a direção da câmera, então é
   exata, sem conta de ângulo de Euler.
   -------------------------------------------------------------------------- */

/** Capitais dos quatro países onde a Wone cobra. */
const PLACES: Record<string, { lat: number; lon: number }> = {
  BRL: { lat: -15.8, lon: -47.9 },
  ARS: { lat: -34.6, lon: -58.4 },
  MXN: { lat: 19.4, lon: -99.1 },
  COP: { lat: 4.7, lon: -74.1 },
};

const BRAND = "#FF7700";
const CREAM = "#FFFFE3";
const FRONT = new Vector3(0, 0, 1);

/**
 * Candidatos sorteados na esfera; sobram os ~30% que caem em terra. 18.000 dá
 * uma malha de ~1,5°, que é o ponto em que os continentes fecham sem o desenho
 * virar mancha — e são ~5.200 pontos desenhados, numa chamada só.
 */
const SAMPLES = 18000;

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

/** Passo médio entre dois candidatos, em graus. */
const STEP = (Math.sqrt((4 * Math.PI) / SAMPLES) * 180) / Math.PI;

/** Ruído determinístico: mesma malha em todo recarregamento, sem `Math.random`. */
function noise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Os pontos de terra firme: espiral de Fibonacci (não aglomera nos polos),
 * sacudida um tanto e filtrada pela máscara.
 *
 * A sacudida importa: a espiral crua tem regularidade suficiente para bater com
 * a grade de 1° da máscara e desenhar listras — bem visíveis na Sibéria, perto
 * do limbo. Um deslocamento de 40% do passo desmancha as listras; mais que
 * isso e a malha começa a abrir buracos.
 *
 * Dois atributos acompanham cada ponto: `aFleck`, um número fixo que o shader
 * usa para variar o tamanho (sem ele a malha tem cara de grade), e `aCoast`,
 * ligado quando o vizinho já é mar — é o que acende a linha da costa e faz o
 * contorno dos continentes aparecer num quadro de 240 px.
 */
function useLandDots() {
  return useMemo(() => {
    const positions: number[] = [];
    const flecks: number[] = [];
    const coasts: number[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < SAMPLES; i += 1) {
      const y = 1 - (i / (SAMPLES - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;

      const seedLat = (Math.asin(y) * 180) / Math.PI;
      const seedLon =
        (Math.atan2(Math.cos(theta) * radius, Math.sin(theta) * radius) * 180) /
        Math.PI;

      /* Longitude anda mais rápido perto dos polos: o passo cresce com 1/cos. */
      const span = 1 / Math.max(0.25, Math.cos((seedLat * Math.PI) / 180));
      const lat = seedLat + (noise(i) - 0.5) * STEP * 0.4;
      const lon = seedLon + (noise(i + 0.5) - 0.5) * STEP * span * 0.4;
      if (!isLand(lat, lon)) continue;

      const dir = direction(lat, lon);
      const shore = span * STEP;
      const coast =
        !isLand(lat + STEP, lon) ||
        !isLand(lat - STEP, lon) ||
        !isLand(lat, lon + shore) ||
        !isLand(lat, lon - shore);

      positions.push(dir.x, dir.y, dir.z);
      flecks.push(noise(i + 0.25));
      coasts.push(coast ? 1 : 0);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3),
    );
    geometry.setAttribute("aFleck", new BufferAttribute(new Float32Array(flecks), 1));
    geometry.setAttribute("aCoast", new BufferAttribute(new Float32Array(coasts), 1));
    return geometry;
  }, []);
}

/* A terra: cada ponto é um disco que a luz atinge de lado, então o que está
   perto do limbo escuro encolhe e apaga. `uScale` é a altura do buffer de
   desenho, igual ao que o `pointsMaterial` do three faz com sizeAttenuation. */
const DOT_VERTEX = /* glsl */ `
  attribute float aFleck;
  attribute float aCoast;
  uniform float uSize;
  uniform float uScale;
  uniform vec3 uLight;
  varying float vLit;
  varying float vCoast;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 normal = normalize(normalMatrix * normalize(position));
    vec3 light = normalize((viewMatrix * vec4(uLight, 0.0)).xyz);
    vLit = clamp(dot(normal, light) * 0.55 + 0.45, 0.0, 1.0);
    vCoast = aCoast;

    float fleck = 0.84 + aFleck * 0.3 + aCoast * 0.16;
    gl_PointSize = uSize * fleck * (uScale / -mv.z) * (0.72 + 0.4 * vLit);
    gl_Position = projectionMatrix * mv;
  }
`;

const DOT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uWarm;
  varying float vLit;
  varying float vCoast;

  void main() {
    vec2 offset = gl_PointCoord - vec2(0.5);
    float dist = dot(offset, offset);
    if (dist > 0.25) discard;

    float edge = smoothstep(0.25, 0.06, dist);
    vec3 color = mix(uColor, uWarm, vLit * 0.28 + vCoast * 0.5);
    float gain = (0.44 + 0.72 * vLit) * (1.0 + vCoast * 0.38);
    gl_FragColor = vec4(color * gain, edge * (0.6 + 0.4 * vLit));
  }
`;

/* A atmosfera: acende onde a esfera foge da câmera, apaga no meio. */
const AIR_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const AIR_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
    gl_FragColor = vec4(uColor, pow(rim, 3.2) * 0.42);
  }
`;

type GlobeProps = {
  /** Códigos das moedas, na ordem em que aparecem na lista. */
  codes: string[];
  active: number;
  reduced: boolean;
};

function Globe({ codes, active, reduced }: GlobeProps) {
  const globe = useRef<Group>(null);
  const pulse = useRef<Mesh>(null);
  const dotMaterial = useRef<ShaderMaterial>(null);
  const dots = useLandDots();

  /** Uniforms dos pontos. Criados uma vez: o shader só lê deles. */
  const dotUniforms = useMemo(
    () => ({
      uSize: { value: 0.056 },
      uScale: { value: 300 },
      uLight: { value: new Vector3(2.4, 1.6, 2.6) },
      uColor: { value: new Vector3(1, 0.467, 0) },
      uWarm: { value: new Vector3(1, 1, 0.89) },
    }),
    [],
  );

  const airUniforms = useMemo(
    () => ({ uColor: { value: new Vector3(1, 0.53, 0.18) } }),
    [],
  );

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

    /* Tamanho do ponto em pixels depende da altura do buffer, que muda com o
       resize e com o dpr. Um número por frame, lido do próprio canvas. */
    if (dotMaterial.current) {
      dotMaterial.current.uniforms.uScale.value =
        state.gl.domElement.height * 0.5;
    }

    /* O anel do país ativo respira — é o que diz "é este aqui". */
    if (pulse.current && !reduced) {
      const beat = 1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.14;
      pulse.current.scale.setScalar(beat);
    }
  });

  return (
    <group>
      {/* Atmosfera: fresnel por fora, visto pelo lado de dentro da casca */}
      <mesh scale={1.055}>
        <sphereGeometry args={[1, 48, 32]} />
        <shaderMaterial
          vertexShader={AIR_VERTEX}
          fragmentShader={AIR_FRAGMENT}
          uniforms={airUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={BackSide}
        />
      </mesh>

      <group ref={globe}>
        {/* O oceano: é ele que esconde os pontos do outro lado e dá a curvatura */}
        <mesh>
          <sphereGeometry args={[0.986, 64, 48]} />
          <meshStandardMaterial
            color="#0a0d16"
            roughness={0.78}
            metalness={0.18}
            emissive="#160a04"
            emissiveIntensity={0.55}
          />
        </mesh>

        {/* A terra firme */}
        <points geometry={dots}>
          <shaderMaterial
            ref={dotMaterial}
            vertexShader={DOT_VERTEX}
            fragmentShader={DOT_FRAGMENT}
            uniforms={dotUniforms}
            transparent
            depthWrite={false}
          />
        </points>

        {/* Grade: equador, dois paralelos e seis meridianos, no limite do visível */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.002, 0.0035, 6, 96]} />
          <meshBasicMaterial color={CREAM} transparent opacity={0.11} />
        </mesh>

        {[30, -30].map((lat) => {
          const phi = (lat * Math.PI) / 180;
          return (
            <mesh
              key={lat}
              rotation={[Math.PI / 2, 0, 0]}
              position={[0, Math.sin(phi), 0]}
            >
              <torusGeometry args={[Math.cos(phi), 0.0022, 6, 80]} />
              <meshBasicMaterial color={CREAM} transparent opacity={0.05} />
            </mesh>
          );
        })}

        {[0, 1, 2, 3, 4, 5].map((slot) => (
          <mesh key={slot} rotation={[0, (slot * Math.PI) / 6, 0]}>
            <torusGeometry args={[1.001, 0.0022, 6, 80]} />
            <meshBasicMaterial color={CREAM} transparent opacity={0.045} />
          </mesh>
        ))}

        {targets.map((dir, index) => {
          const position = dir.clone().multiplyScalar(1.012);
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
                <meshBasicMaterial color={isActive ? CREAM : BRAND} />
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
      camera={{ position: [0, 0, 3.6], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[2.4, 1.6, 2.6]} intensity={2.1} />
      <directionalLight position={[-3, -1, -2]} intensity={0.7} color={BRAND} />
      <Globe {...props} />
    </Canvas>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Environment, Extrude, RoundedBox } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { Shape, type Group, type Mesh } from "three";

/* --------------------------------------------------------------------------
   Os quatro ícones do passo a passo

   Eram quatro sólidos extrudados girando no lugar: um avião, um funil, um
   cartão e um cifrão. O designer gostou da ideia e do crescer sob o cursor, mas
   pediu algo mais surpreendente — e tinha razão: um símbolo girando é um
   símbolo girando, qualquer que seja o passo.

   Agora cada ícone é uma cena pequena que faz o que a etapa diz. O avião voa em
   círculo deixando rastro; os blocos se encaixam um sobre o outro; o cartão
   mergulha na maquininha e ela responde com um anel de luz; as moedas se
   empilham, uma caindo a cada volta. O cursor não muda o enredo, muda o ritmo:
   tudo acelera, abre e acende — o crescer que ele já tinha aprovado, agora com
   o que crescer.

   Tudo sai de primitivas (caixa arredondada, cilindro, toro, uma extrusão) e de
   `useFrame`: nenhum arquivo de modelo, nenhuma textura. O canvas tem 96 px, e
   essa é a regra que decidiu cada cena — três peças no máximo, silhueta grande,
   movimento que se lê de longe.
   -------------------------------------------------------------------------- */

const BRAND = "#FF7700";
const BRAND_LIT = "#FF9D45";
const INK = "#1b1b24";

/** Interpolação suave e independente da taxa de quadros. */
function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/** Material laranja da marca, igual nas quatro cenas. */
function BrandMaterial({ hovered, dark = false }: { hovered: boolean; dark?: boolean }) {
  return (
    <meshPhysicalMaterial
      color={dark ? INK : hovered ? BRAND_LIT : BRAND}
      emissive={BRAND}
      emissiveIntensity={dark ? (hovered ? 0.22 : 0.08) : hovered ? 0.55 : 0.22}
      metalness={dark ? 0.45 : 0.75}
      roughness={dark ? 0.45 : 0.22}
      clearcoat={1}
      clearcoatRoughness={0.15}
    />
  );
}

/* --------------------------------------------------------------------------
   1. Conecte seu bot — o avião voa
   -------------------------------------------------------------------------- */

/** Avião de papel, o mesmo perfil que o ícone 2D usa. */
function planeShape() {
  const s = new Shape();
  s.moveTo(-1, 0.25);
  s.lineTo(1, 0.95);
  s.lineTo(0.15, -0.95);
  s.lineTo(-0.05, -0.1);
  s.lineTo(-1, 0.25);
  return s;
}

/** Quantas marcas de rastro ficam atrás do avião. */
const TRAIL = 7;

function Plane({ hovered }: { hovered: boolean }) {
  const orbit = useRef<Group>(null);
  const roll = useRef<Group>(null);
  const trail = useRef<(Mesh | null)[]>([]);
  const angle = useRef(0);
  const spin = useRef(0);
  const shape = useMemo(() => planeShape(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    angle.current += dt * (hovered ? 2.1 : 1.1);

    const radius = 0.68;
    const place = (a: number, node: Group | Mesh | null, lift: number) => {
      if (!node) return;
      node.position.set(
        Math.cos(a) * radius,
        Math.sin(a * 2) * 0.16 + lift,
        Math.sin(a) * radius * 0.6,
      );
    };

    place(angle.current, orbit.current, 0);

    if (orbit.current) {
      /* O nariz aponta para onde ele vai, e o corpo inclina na curva. */
      orbit.current.rotation.y = -angle.current;
      orbit.current.rotation.z = -0.35;
    }

    /* Giro de barril sob o cursor: uma volta completa, sempre terminando em pé. */
    spin.current = damp(spin.current, hovered ? Math.PI * 2 : 0, 3, dt);
    if (roll.current) roll.current.rotation.x = spin.current;

    trail.current.forEach((dot, index) => {
      place(angle.current - (index + 1) * 0.17, dot, 0);
      if (dot) {
        const fade = 1 - index / TRAIL;
        dot.scale.setScalar(fade * (hovered ? 0.13 : 0.1));
      }
    });
  });

  return (
    <group>
      <group ref={orbit}>
        <group ref={roll}>
          <Center>
            <Extrude
              args={[
                shape,
                {
                  depth: 0.3,
                  bevelEnabled: true,
                  bevelSize: 0.05,
                  bevelThickness: 0.05,
                  bevelSegments: 4,
                },
              ]}
              scale={0.72}
            >
              <BrandMaterial hovered={hovered} />
            </Extrude>
          </Center>
        </group>
      </group>

      {Array.from({ length: TRAIL }, (_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            trail.current[index] = node;
          }}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial
            color={BRAND}
            transparent
            opacity={(1 - index / TRAIL) * 0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

/* --------------------------------------------------------------------------
   2. Monte seu funil — os blocos se encaixam
   -------------------------------------------------------------------------- */

const BLOCK_Y = [0.78, 0, -0.78];

function Blocks({ hovered }: { hovered: boolean }) {
  const blocks = useRef<(Group | null)[]>([]);
  const group = useRef<Group>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    /* Em repouso, o bloco de cima sobe e encaixa de novo a cada ciclo. Sob o
       cursor os três se afastam, como uma vista explodida. */
    const cycle = (t % 2.6) / 2.6;
    const snap = cycle < 0.45 ? Math.sin(cycle * Math.PI * 2.2) * 0.34 : 0;

    blocks.current.forEach((block, index) => {
      if (!block) return;
      const spread = hovered ? (index - 1) * -0.42 : 0;
      const lift = index === 0 && !hovered ? snap : 0;
      block.position.y = damp(block.position.y, BLOCK_Y[index] + spread + lift, 9, dt);
      block.rotation.z = damp(block.rotation.z, hovered ? (index - 1) * 0.1 : 0, 6, dt);
    });

    if (group.current) {
      group.current.rotation.y = damp(
        group.current.rotation.y,
        hovered ? 0.55 : Math.sin(t * 0.4) * 0.3,
        4,
        dt,
      );
      group.current.rotation.x = damp(group.current.rotation.x, hovered ? -0.2 : 0, 4, dt);
    }
  });

  return (
    <group ref={group}>
      {/* Fio que liga os três, atrás deles */}
      <mesh position={[-0.52, 0, -0.14]}>
        <boxGeometry args={[0.07, 1.62, 0.07]} />
        <BrandMaterial hovered={hovered} />
      </mesh>

      {BLOCK_Y.map((y, index) => (
        <group
          key={y}
          position={[0, y, 0]}
          ref={(node) => {
            blocks.current[index] = node;
          }}
        >
          <RoundedBox args={[1.5, 0.56, 0.5]} radius={0.1} smoothness={3}>
            <meshPhysicalMaterial
              color={INK}
              metalness={0.4}
              roughness={0.5}
              clearcoat={0.6}
            />
          </RoundedBox>

          {/* Barra da categoria, igual à dos blocos do editor */}
          <mesh position={[-0.68, 0, 0.19]}>
            <boxGeometry args={[0.12, 0.44, 0.16]} />
            <BrandMaterial hovered={hovered} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* --------------------------------------------------------------------------
   3. Conecte seu gateway — o cartão entra e a maquininha responde
   -------------------------------------------------------------------------- */

function Terminal({ hovered }: { hovered: boolean }) {
  const card = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const group = useRef<Group>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const period = hovered ? 1.6 : 2.8;
    const cycle = (t % period) / period;

    /* Meio ciclo descendo até o slot, meio voltando. */
    const dip = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
    const eased = dip * dip * (3 - 2 * dip);

    if (card.current) {
      card.current.position.y = 0.95 - eased * 0.75;
      card.current.rotation.z = (1 - eased) * 0.12;
    }

    /* O anel sai da maquininha quando o cartão chega ao fundo. */
    if (ring.current) {
      const burst = Math.max(0, (eased - 0.72) / 0.28);
      const scale = 0.6 + burst * 1.5;
      ring.current.scale.setScalar(scale);
      const material = ring.current.material as { opacity: number; transparent: boolean };
      material.transparent = true;
      material.opacity = burst * (hovered ? 0.9 : 0.6);
    }

    if (group.current) {
      group.current.rotation.y = damp(
        group.current.rotation.y,
        hovered ? 0.5 : Math.sin(t * 0.35) * 0.28,
        4,
        dt,
      );
      group.current.rotation.x = damp(group.current.rotation.x, hovered ? -0.22 : -0.1, 4, dt);
    }
  });

  return (
    <group ref={group} position={[0, -0.1, 0]}>
      {/* Maquininha */}
      <RoundedBox args={[1.7, 0.95, 0.9]} radius={0.14} smoothness={3} position={[0, -0.6, 0]}>
        <meshPhysicalMaterial color={INK} metalness={0.45} roughness={0.45} clearcoat={0.7} />
      </RoundedBox>

      {/* Boca do slot */}
      <mesh position={[0, -0.14, 0]}>
        <boxGeometry args={[1.26, 0.09, 0.4]} />
        <meshBasicMaterial color="#05050b" />
      </mesh>

      {/* Anel de confirmação, deitado sobre a maquininha */}
      <mesh ref={ring} position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.05, 8, 32]} />
        <meshBasicMaterial color={BRAND} transparent opacity={0} />
      </mesh>

      {/* Cartão */}
      <group ref={card} position={[0, 0.95, 0]}>
        <RoundedBox args={[1.2, 0.78, 0.09]} radius={0.07} smoothness={3}>
          <BrandMaterial hovered={hovered} />
        </RoundedBox>
        {/* Chip */}
        <mesh position={[-0.3, 0.1, 0.06]}>
          <boxGeometry args={[0.26, 0.2, 0.03]} />
          <meshPhysicalMaterial color="#2a2a33" metalness={0.9} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

/* --------------------------------------------------------------------------
   4. Venda e entregue — as moedas se empilham
   -------------------------------------------------------------------------- */

const STACK_Y = [-0.72, -0.44, -0.16];

function Coins({ hovered }: { hovered: boolean }) {
  const falling = useRef<Mesh>(null);
  const group = useRef<Group>(null);
  const stack = useRef<(Mesh | null)[]>([]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const period = hovered ? 1.4 : 2.4;
    const cycle = (t % period) / period;

    /* A moeda cai do alto, assenta no topo da pilha e volta a cair. */
    if (falling.current) {
      const drop = Math.min(1, cycle / 0.7);
      falling.current.position.y = 1.35 - drop * drop * 1.23;
      falling.current.rotation.x = (1 - drop) * 2.4;
      falling.current.visible = cycle < 0.92;
    }

    /* A pilha afunda um fio quando a moeda chega — peso. */
    stack.current.forEach((coin, index) => {
      if (!coin) return;
      const hit = cycle > 0.66 && cycle < 0.78 ? -0.035 : 0;
      coin.position.y = damp(coin.position.y, STACK_Y[index] + hit, 14, dt);
    });

    if (group.current) {
      group.current.rotation.y += dt * (hovered ? 1.6 : 0.5);
      group.current.rotation.x = damp(group.current.rotation.x, hovered ? -0.3 : -0.16, 4, dt);
    }
  });

  return (
    <group ref={group}>
      {STACK_Y.map((y, index) => (
        <mesh
          key={y}
          position={[0, y, 0]}
          ref={(node) => {
            stack.current[index] = node;
          }}
        >
          <cylinderGeometry args={[0.62, 0.62, 0.17, 28]} />
          <BrandMaterial hovered={hovered} dark={index % 2 === 1} />
        </mesh>
      ))}

      <mesh ref={falling} position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.17, 28]} />
        <BrandMaterial hovered={hovered} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */

function Scene({ name, hovered }: { name: string; hovered: boolean }) {
  if (name === "telegram") return <Plane hovered={hovered} />;
  if (name === "funnel") return <Blocks hovered={hovered} />;
  if (name === "money") return <Coins hovered={hovered} />;
  return <Terminal hovered={hovered} />;
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
      camera={{ position: [0, 0, 4.9], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      // Sem movimento, desenha um quadro e para — nada de laço de render.
      frameloop={reduced ? "demand" : "always"}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <directionalLight position={[-4, -2, -3]} intensity={0.8} color={BRAND} />
      <Environment preset="city" />
      <Scene name={name} hovered={hovered && !reduced} />
    </Canvas>
  );
}

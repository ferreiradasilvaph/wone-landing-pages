"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  QuadraticBezierLine,
  RoundedBox,
  type QuadraticBezierLineRef,
} from "@react-three/drei";
import { Vector3, type Group, type Mesh, type MeshStandardMaterial } from "three";

/* --------------------------------------------------------------------------
   A cena, em three.js

   A primeira versão disto era um SVG desenhado à mão. Lia bem, mas era um
   desenho: a caixa não tinha volume de verdade, a corda não tinha espessura e
   cada sombra era um degradê inventado. Com o three — que o projeto já carrega
   para as Premiações e para os ícones do passo a passo, então não entra
   biblioteca nova — a mesma cena passa a ser geometria: a caixa é um sólido com
   seis faces e quina arredondada, a luz é luz, a sombra no chão é projetada, e
   as cordas são linhas de espessura constante em pixel (`Line2`), que é o que
   mantém a corda com o mesmo peso visual em qualquer distância da câmera.

   A lógica não mudou: três cordas, um gancho, uma caixa. Quem manda nas fases
   continua sendo o componente de fora.

   Unidades do mundo: a caixa tem 1,5 de largura. A câmera está em z = 6,2 com
   36° de campo, então cabem ~4 unidades de altura — do trilho (1,9) ao limbo
   (-1,5).
   -------------------------------------------------------------------------- */

const RAIL_Y = 1.9;
/** Centro da manilha pendurada, em repouso e no fundo do mergulho. */
const HOOK_REST = 1.15;
const HOOK_DIVE = -0.72;
/** Raio da manilha: as cordas saem do ponto mais baixo dela. */
const SHACKLE_R = 0.2;

const BOX_W = 1.5;
const BOX_H = 0.92;
const BOX_D = 1.05;
const BOX_REST = -0.3;
/** Onde a caixa espera, no escuro do pé da cena, e para onde ela cai. */
const BOX_LIMBO = -1.5;
const BOX_FALL = -4.2;

/** Os três nós, no topo da caixa: um tripé, que é como carga pesada sobe.

    A ordem segue a das vias no dicionário — webhook à esquerda, reconciliação à
    direita, o botão do chat no fundo. Trocar um nó de lugar aqui troca a corda
    daquela via na cena, e nada mais precisa mudar. */
const KNOTS: readonly [number, number, number][] = [
  [-0.58, BOX_H / 2, 0.34],
  [0.6, BOX_H / 2, 0.32],
  [0.04, BOX_H / 2, -0.4],
];

const BRAND = "#FF7700";
const CUT = "#F87171";

export type CranePhase = "hanging" | "falling" | "gone" | "diving" | "lifting";

type SceneProps = {
  /** Vias cortadas, na ordem do dicionário. */
  down: boolean[];
  /** Via sob o ponteiro: acende a corda. */
  hot: number | null;
  phase: CranePhase;
  reduced: boolean;
};

/** Aproximação exponencial: mesma suavidade em qualquer taxa de quadros. */
function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function Rig({ down, hot, phase, reduced }: SceneProps) {
  const sway = useRef<Group>(null);
  const hook = useRef<Group>(null);
  const cable = useRef<Mesh>(null);
  const box = useRef<Group>(null);
  const ropes = useRef<(QuadraticBezierLineRef | null)[]>([]);
  const stubs = useRef<(QuadraticBezierLineRef | null)[]>([]);

  /* Estado contínuo da animação. Fica em refs porque muda a cada quadro: no
     estado do React seriam 60 renderizações por segundo para nada. */
  const hookY = useRef(HOOK_REST);
  const boxY = useRef(BOX_REST);
  const boxX = useRef(0);
  const boxTilt = useRef(0);
  const fade = useRef(1);
  const fall = useRef(0);

  const start = useMemo(() => new Vector3(), []);
  const end = useMemo(() => new Vector3(), []);
  const mid = useMemo(() => new Vector3(), []);

  const alive = down.filter((isDown) => !isDown).length;

  /* Carga desequilibrada: a caixa pende para o lado das cordas que sobraram. O
     centro dos nós vivos manda na inclinação e no deslocamento lateral. */
  const load = useMemo(() => {
    const live = KNOTS.filter((_, index) => !down[index]);
    if (!live.length) return 0;
    return live.reduce((sum, knot) => sum + knot[0], 0) / live.length;
  }, [down]);

  /* Quanto menos corda, menos barriga: a última fica esticada. */
  const sag = alive >= 3 ? 0.14 : alive === 2 ? 0.09 : 0.04;

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const lambda = reduced ? 1000 : 7;

    /* Alvos da fase */
    const hookTarget = phase === "diving" ? HOOK_DIVE : HOOK_REST;
    const boxTarget =
      phase === "gone" || phase === "diving" ? BOX_LIMBO : BOX_REST;
    const visible = phase !== "gone" && phase !== "falling";

    hookY.current = damp(hookY.current, hookTarget, lambda, dt);

    if (phase === "falling") {
      /* Queda com gravidade de mentira: acelera e some na escuridão. */
      fall.current += (reduced ? 40 : 9.5) * dt;
      boxY.current -= fall.current * dt;
      boxTilt.current = damp(boxTilt.current, 0.42, 4, dt);
      fade.current = Math.max(0, (boxY.current - BOX_FALL) / 2.4);
      if (boxY.current < BOX_FALL) boxY.current = BOX_FALL;
    } else {
      fall.current = 0;
      boxY.current = damp(boxY.current, boxTarget, lambda, dt);
      boxX.current = damp(boxX.current, load * 0.22, lambda, dt);
      boxTilt.current = damp(boxTilt.current, load * 0.34, lambda, dt);
      /* No mergulho a caixa só reaparece quando o gancho chega nela. */
      const target = visible ? 1 : 0;
      const reach = phase === "diving" ? (hookY.current < -0.3 ? 1 : 0) : target;
      fade.current = damp(fade.current, reach, reduced ? 1000 : 6, dt);
    }

    /* Balanço do conjunto, pendurado no trilho, e um paralaxe de ponteiro que
       faz a cena ter lados — é o que o SVG não conseguia dar. */
    if (sway.current) {
      const t = state.clock.elapsedTime;
      sway.current.rotation.z = reduced ? 0 : Math.sin(t * 0.55) * 0.022;
      sway.current.rotation.y = damp(
        sway.current.rotation.y,
        reduced ? 0 : state.pointer.x * 0.26,
        3,
        dt,
      );
      sway.current.rotation.x = damp(
        sway.current.rotation.x,
        reduced ? 0 : -state.pointer.y * 0.1,
        3,
        dt,
      );
    }

    if (hook.current) hook.current.position.y = hookY.current;

    /* O cabo é um cilindro de uma unidade, esticado entre o trilho e a manilha */
    if (cable.current) {
      const length = RAIL_Y - hookY.current;
      cable.current.scale.y = Math.max(length, 0.01);
      cable.current.position.y = hookY.current + length / 2;
    }

    if (box.current) {
      box.current.position.set(boxX.current, boxY.current, 0);
      box.current.rotation.z = boxTilt.current;
      box.current.visible = fade.current > 0.01;
      box.current.updateMatrix();

      box.current.traverse((child) => {
        const mesh = child as Mesh;
        if (!mesh.isMesh) return;
        const material = mesh.material as MeshStandardMaterial;
        material.transparent = fade.current < 0.999;
        material.opacity = fade.current;
      });
    }

    /* As cordas são recalculadas todo quadro: de onde o gancho está até onde o
       nó foi parar depois da inclinação da caixa. */
    const anchorY = hookY.current - SHACKLE_R;

    KNOTS.forEach((knot, index) => {
      const line = ropes.current[index];
      if (!line) return;

      start.set(0, anchorY, 0);

      if (down[index]) {
        /* Cortada: o toco que ficou no gancho, chicoteando para fora. Para que
           lado ele cai sai do próprio nó, não do índice — assim reordenar as
           cordas lá em cima não desalinha nada aqui. */
        const side = knot[0] > 0.2 ? 1 : knot[0] < -0.2 ? -1 : 0.4;
        const depth = knot[2] < 0 ? -1 : 1;
        end.set(side * 0.22, anchorY - 0.5, 0.1 * depth);
        mid.set(side * 0.18, anchorY - 0.22, 0.04 * depth);
      } else {
        end.set(knot[0], knot[1], knot[2]);
        if (box.current) end.applyMatrix4(box.current.matrix);
        mid.copy(start).add(end).multiplyScalar(0.5);
        mid.y -= sag;
      }

      line.setPoints(start, end, mid);

      /* Largura e cor vão pelo material, e não por propriedade do componente: a
         linha é um `Line2`, cuja espessura é em pixel e vive no material. */
      const material = line.material;
      material.color.set(down[index] ? CUT : BRAND);
      material.linewidth = hot === index && !down[index] ? 4.4 : 3.2;
      material.opacity = down[index] ? 0.8 : 1;
      material.transparent = true;

      /* A ponta que sobrou presa na caixa: nasce no nó e sobe um palmo,
         acompanhando a caixa aonde ela for. */
      const stub = stubs.current[index];
      if (!stub) return;

      stub.visible = down[index];
      if (!down[index]) return;

      start.set(knot[0], knot[1], knot[2]);
      end.set(knot[0] - 0.14, knot[1] + 0.34, knot[2] - 0.06);
      mid.set(knot[0] + 0.05, knot[1] + 0.18, knot[2] - 0.01);

      if (box.current) {
        start.applyMatrix4(box.current.matrix);
        end.applyMatrix4(box.current.matrix);
        mid.applyMatrix4(box.current.matrix);
      }

      stub.setPoints(start, end, mid);
      stub.material.color.set(CUT);
      stub.material.linewidth = 3.2;
      stub.material.opacity = 0.8 * fade.current;
      stub.material.transparent = true;
    });
  });

  return (
    <group ref={sway} position={[0, RAIL_Y, 0]}>
      <group position={[0, -RAIL_Y, 0]}>
        {/* Trilho do teto: é o que faz o gancho estar preso em alguma coisa */}
        <mesh position={[0, RAIL_Y, 0]} castShadow>
          <boxGeometry args={[3.1, 0.1, 0.24]} />
          <meshStandardMaterial color="#2a2a33" roughness={0.6} metalness={0.4} />
        </mesh>

        {/* Cabo */}
        <mesh ref={cable}>
          <cylinderGeometry args={[0.022, 0.022, 1, 8]} />
          <meshStandardMaterial color="#3a3a45" roughness={0.5} metalness={0.5} />
        </mesh>

        {/* Gancho: pino e manilha em U, de onde as três cordas saem */}
        <group ref={hook} position={[0, HOOK_REST, 0]}>
          <mesh rotation={[0, 0, Math.PI]} castShadow>
            <torusGeometry args={[SHACKLE_R, 0.045, 10, 28, Math.PI]} />
            <meshStandardMaterial
              color={BRAND}
              roughness={0.35}
              metalness={0.6}
              emissive={BRAND}
              emissiveIntensity={0.18}
            />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, SHACKLE_R * 2 + 0.09, 10]} />
            <meshStandardMaterial color={BRAND} roughness={0.35} metalness={0.6} />
          </mesh>
        </group>

        {/* As três cordas e, na mesma camada, as pontas cortadas que ficam na
            caixa — todas recalculadas no `useFrame` acima. */}
        {KNOTS.map((knot, index) => (
          <QuadraticBezierLine
            key={index}
            ref={(node) => {
              ropes.current[index] = node;
            }}
            start={[0, HOOK_REST - SHACKLE_R, 0]}
            end={knot}
            color={BRAND}
          />
        ))}

        {KNOTS.map((knot, index) => (
          <QuadraticBezierLine
            key={`stub-${index}`}
            ref={(node) => {
              stubs.current[index] = node;
            }}
            start={knot}
            end={[knot[0] - 0.14, knot[1] + 0.34, knot[2] - 0.06]}
            color={CUT}
            visible={false}
          />
        ))}

        {/* A caixa */}
        <group ref={box} position={[0, BOX_REST, 0]}>
          <RoundedBox args={[BOX_W, BOX_H, BOX_D]} radius={0.05} smoothness={3} castShadow>
            <meshStandardMaterial color="#24242f" roughness={0.85} metalness={0.05} />
          </RoundedBox>

          {/* Fita: uma cinta fina dando a volta na caixa */}
          <mesh>
            <boxGeometry args={[0.13, BOX_H + 0.012, BOX_D + 0.012]} />
            <meshStandardMaterial color="#34343f" roughness={0.75} />
          </mesh>

          {/* Etiqueta de remessa na frente */}
          <mesh position={[0.38, 0.06, BOX_D / 2 + 0.008]}>
            <boxGeometry args={[0.44, 0.3, 0.01]} />
            <meshStandardMaterial color="#45454f" roughness={0.9} />
          </mesh>

          {/* Nós: o ponto em que cada corda morde a caixa */}
          {KNOTS.map((knot, index) => (
            <mesh key={index} position={knot}>
              <sphereGeometry args={[0.055, 12, 10]} />
              <meshStandardMaterial
                color={down[index] ? CUT : BRAND}
                roughness={0.4}
                emissive={down[index] ? CUT : BRAND}
                emissiveIntensity={0.25}
              />
            </mesh>
          ))}

        </group>

        {/* Sombra projetada no chão do limbo: é o que dá altura à caixa.

            Ela estava alta demais — encostava no rótulo "Entregue", que fica
            logo abaixo do canvas, e as duas coisas brigavam. Desceu para o pé
            do enquadramento e ficou menor e mais clara: continua dando chão
            sem subir na linha de texto. */}
        <ContactShadows
          position={[0, -1.88, 0]}
          scale={5.2}
          blur={2.4}
          opacity={0.55}
          far={2.6}
          resolution={256}
          color="#000000"
        />
      </group>
    </group>
  );
}

/**
 * Canvas da cena. Montado só quando a demo das três vias aparece — o
 * `ConfirmationDemo` o carrega com `next/dynamic`, então o three não entra no
 * pacote de quem nunca abre esta aba.
 */
export default function CraneScene(props: SceneProps) {
  const dpr = useMemo<[number, number]>(() => [1, 1.5], []);

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0.05, 6.3], fov: 37 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3.5, 5, 4]} intensity={2.3} />
      {/* Contraluz laranja: separa a caixa do preto sem acender a cena toda */}
      <directionalLight position={[-4, 1.5, -2.5]} intensity={1.1} color={BRAND} />
      <pointLight position={[0, 0.2, 2.6]} intensity={6} distance={8} color="#FFD9B5" />

      <Rig {...props} />
    </Canvas>
  );
}

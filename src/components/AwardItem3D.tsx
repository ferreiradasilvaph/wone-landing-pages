"use client";

import { useLayoutEffect, useRef } from "react";
import { RoundedBox } from "@react-three/drei";
import { InstancedMesh, Object3D } from "three";

/* --------------------------------------------------------------------------
   As joias do Wone Club, em geometria

   Antes eram fotos recortadas em planos. Foto não gira: por mais que o plano
   desse a volta, visto de lado ele era uma linha, e o brilho do metal era o
   brilho do estúdio onde a foto foi tirada — sempre o mesmo, apontando sempre
   para o mesmo lado, enquanto o objeto virava.

   Agora são malhas de verdade, e quem acende é a luz da cena: o mesmo ambiente
   que reflete no acrílico da placa reflete aqui. Girando, o reflexo corre pelo
   metal, que é o que diz "isto é ouro" sem precisar de legenda.

   O desenho é de leitura, não de catálogo: cada peça aparece com menos de 120
   pixels de altura, então o que precisa estar certo é a silhueta — o elo cubano
   da corrente, o volume do anel, a marca no pingente. Detalhe de ourives abaixo
   disso não chega ao olho e só custa quadro.
   -------------------------------------------------------------------------- */

export type ItemKind = "pulseira" | "colar" | "anel";

const PRATA = { color: "#E6EAF2", metalness: 1, roughness: 0.14, envMapIntensity: 2.4 };
const OURO = { color: "#F0BC52", metalness: 1, roughness: 0.17, envMapIntensity: 2.6 };
const OURO_ESCURO = { color: "#1A1712", metalness: 0.9, roughness: 0.4, envMapIntensity: 1.6 };
/** As pedras: claras e lisas, sem refração — a esta escala, brilho basta. */
const DIAMANTE = { color: "#FFFFFF", metalness: 0.2, roughness: 0.02, envMapIntensity: 3 };
const SAFIRA = { color: "#FF8A1E", metalness: 0.35, roughness: 0.06, envMapIntensity: 3 };

/**
 * Corrente de elo cubano.
 *
 * O que faz o elo ser cubano é ele ser achatado e cada um virar noventa graus
 * em relação ao vizinho — a corrente fica compacta e brilha em duas direções.
 * Aqui isso sai de um toro esticado no próprio eixo, com os ímpares tombados.
 *
 * Tudo numa `instancedMesh`: são dezenas de elos por peça e quatro peças em
 * cena, e desenhar isso elo a elo seria jogar fora o orçamento de um quadro.
 */
function Corrente({
  elos,
  raio,
  elo,
  tubo,
  material = PRATA,
}: {
  elos: number;
  raio: number;
  elo: number;
  tubo: number;
  material?: typeof PRATA;
}) {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    const pose = new Object3D();
    for (let i = 0; i < elos; i += 1) {
      const a = (i / elos) * Math.PI * 2;
      pose.position.set(Math.cos(a) * raio, Math.sin(a) * raio, 0);
      /* O eixo X do elo acompanha a tangente da corrente; o giro em X tomba um
         elo sim, outro não. */
      pose.rotation.set(i % 2 ? Math.PI / 2 : 0, 0, a + Math.PI / 2);
      /* Esticado na tangente: elo de corrente é oval, não circunferência. */
      pose.scale.set(1.45, 1, 1);
      pose.updateMatrix();
      mesh.setMatrixAt(i, pose.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [elos, raio]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, elos]}>
      <torusGeometry args={[elo, tubo, 6, 14]} />
      <meshStandardMaterial {...material} />
    </instancedMesh>
  );
}

/**
 * Cravação: a fileira de pedras sobre uma superfície.
 *
 * Octaedros, e não esferas: um octaedro tem oito faces chapadas que pegam a luz
 * em ângulos diferentes e cintilam ao girar, que é o que uma lapidação faz.
 * Esfera lisa devolve um brilho só e parece bolinha de gude.
 */
function Cravacao({
  colunas,
  linhas,
  largura,
  altura,
  z,
  pedra = 0.012,
  material = DIAMANTE,
}: {
  colunas: number;
  linhas: number;
  largura: number;
  altura: number;
  z: number;
  pedra?: number;
  material?: typeof DIAMANTE;
}) {
  const ref = useRef<InstancedMesh>(null);
  const total = colunas * linhas;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    const pose = new Object3D();
    for (let i = 0; i < total; i += 1) {
      const coluna = i % colunas;
      const linha = Math.floor(i / colunas);
      pose.position.set(
        (coluna / (colunas - 1) - 0.5) * largura,
        linhas > 1 ? (linha / (linhas - 1) - 0.5) * altura : 0,
        z,
      );
      pose.rotation.set(0, 0, (i % 3) * 0.4);
      pose.scale.setScalar(1);
      pose.updateMatrix();
      mesh.setMatrixAt(i, pose.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [total, colunas, linhas, largura, altura, z]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, total]}>
      <octahedronGeometry args={[pedra, 0]} />
      <meshStandardMaterial {...material} />
    </instancedMesh>
  );
}

/**
 * A marca Wone em relevo: dois anéis abertos que se entrelaçam.
 *
 * O `arc` do toro é o que abre cada anel — sem ele seriam dois círculos
 * fechados, e a marca perde a abertura que a define. Os dois se cruzam no meio
 * com meio milímetro de diferença em Z, para não disputarem o mesmo plano.
 */
function MarcaWone({
  raio,
  tubo,
  material = OURO,
}: {
  raio: number;
  tubo: number;
  material?: typeof OURO;
}) {
  return (
    <group>
      <mesh position={[-raio * 0.62, 0, 0.004]} rotation={[0, 0, Math.PI * 0.82]}>
        <torusGeometry args={[raio, tubo, 8, 28, Math.PI * 1.36]} />
        <meshStandardMaterial {...material} />
      </mesh>
      <mesh position={[raio * 0.62, 0, -0.004]} rotation={[0, 0, Math.PI * 0.18]}>
        <torusGeometry args={[raio, tubo, 8, 28, Math.PI * 1.36]} />
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
}

/**
 * Pulseira 100K: corrente cubana com a plaquinha cravejada e a marca em ouro.
 *
 * A inclinação de entrada não é enfeite. Uma argola no plano da tela é um
 * círculo — some ao virar de lado e nunca se lê como volta fechada. Tombada,
 * ela mostra a espessura o tempo todo.
 */
function Pulseira() {
  return (
    <group rotation={[0.52, 0, 0]} scale={1.3}>
      <Corrente elos={18} raio={0.34} elo={0.082} tubo={0.031} />

      {/* A plaqueta, na frente da corrente */}
      <group position={[0, -0.33, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <RoundedBox args={[0.34, 0.1, 0.13]} radius={0.028} smoothness={3}>
          <meshStandardMaterial {...PRATA} />
        </RoundedBox>
        <Cravacao colunas={11} linhas={4} largura={0.26} altura={0.08} z={0.07} />
        <group position={[0, 0, 0.078]} scale={0.85}>
          <MarcaWone raio={0.028} tubo={0.011} />
        </group>
      </group>
    </group>
  );
}

/**
 * Colar 500K: a mesma corrente, maior, com o pingente da marca em safiras.
 */
function Colar() {
  return (
    /* Deslocado para cima: o pingente pendura abaixo da corrente, então sem
       isto a peça inteira nasceria fora de centro em relação ao seu eixo — e
       giraria em torno de um ponto que não é o meio dela. */
    <group rotation={[0.46, 0, 0]} scale={1.08} position={[0, 0.17, 0]}>
      <Corrente elos={24} raio={0.34} elo={0.066} tubo={0.024} />

      {/* Argola de ligação, entre a corrente e o pingente */}
      <mesh position={[0, -0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.038, 0.013, 6, 16]} />
        <meshStandardMaterial {...PRATA} />
      </mesh>

      {/* O pingente: a marca em duas camadas — o contorno em metal atrás e a
          safira laranja à frente, saliente o bastante para a cor aparecer. Era
          o contrário, e a pedra sumia dentro do metal. */}
      <group position={[0, -0.54, 0.02]}>
        <MarcaWone raio={0.135} tubo={0.036} material={PRATA} />
        <group position={[0, 0, 0.03]}>
          <MarcaWone raio={0.135} tubo={0.019} material={SAFIRA} />
        </group>
      </group>
    </group>
  );
}

/**
 * Anel 1M: anel de campeonato — aro grosso, mesa alta e a marca no topo.
 */
function Anel() {
  return (
    <group rotation={[0.34, 0, 0]} scale={1.5}>
      {/* O aro, grosso: anel de campeonato não tem aro de aliança */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.072, 12, 36]} />
        <meshStandardMaterial {...OURO} />
      </mesh>

      {/* Os ombros, que engrossam o aro até a cabeça */}
      {[-1, 1].map((lado) => (
        <mesh
          key={lado}
          position={[lado * 0.145, 0.16, 0]}
          rotation={[0, 0, lado * -0.6]}
        >
          <boxGeometry args={[0.1, 0.17, 0.15]} />
          <meshStandardMaterial {...OURO} />
        </mesh>
      ))}

      {/* A cabeça: alta e encorpada, assentada sobre o aro e não flutuando
          acima dele — é o volume dela que diz "campeonato". */}
      <group position={[0, 0.27, 0]} rotation={[-0.2, 0, 0]}>
        <RoundedBox args={[0.3, 0.25, 0.17]} radius={0.035} smoothness={3}>
          <meshStandardMaterial {...OURO} />
        </RoundedBox>

        {/* A mesa escura embutida, onde a marca assenta */}
        <mesh position={[0, 0, 0.078]}>
          <boxGeometry args={[0.23, 0.185, 0.03]} />
          <meshStandardMaterial {...OURO_ESCURO} />
        </mesh>

        <group position={[0, 0, 0.1]}>
          <MarcaWone raio={0.05} tubo={0.018} material={SAFIRA} />
        </group>

        {/* Fileira de pedras na borda de cima da mesa */}
        <Cravacao
          colunas={9}
          linhas={1}
          largura={0.2}
          altura={0}
          z={0.092}
          pedra={0.009}
        />
      </group>
    </group>
  );
}

const MODELOS: Record<ItemKind, () => React.JSX.Element> = {
  pulseira: Pulseira,
  colar: Colar,
  anel: Anel,
};

/** A joia do marco, montada em malha. */
export function AwardItem({ kind }: { kind: ItemKind }) {
  const Modelo = MODELOS[kind];
  return <Modelo />;
}

/** O marco manda um nome de peça que exista? */
export function isItemKind(value: string): value is ItemKind {
  return value in MODELOS;
}

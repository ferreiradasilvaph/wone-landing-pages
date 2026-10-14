"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, Environment, Extrude, Lightformer, RoundedBox } from "@react-three/drei";
import type { MotionValue } from "motion/react";
import { Shape, type Group, type Material, type Mesh, type Object3D } from "three";

/* --------------------------------------------------------------------------
   O palco dos quatro passos — um canvas só

   Eram quatro canvas de ícone de 96px, um por passo, cada um com o seu contexto
   WebGL, o seu `Environment` e o seu laço de render. Quatro sólidos girando no
   lugar diziam "ícone", não "passo".

   Agora as mesmas quatro cenas moram num canvas de ~325px (desktop) na mesma
   origem, e quem decide qual delas está no palco é a rolagem: cada grupo tem um
   peso, dado por uma janela suave em torno do seu passo. Fora da janela o grupo
   é `visible = false` — no máximo DOIS desenham ao mesmo tempo, e só durante a
   passagem de um passo para o outro.

   A geometria é a de antes (avião extrudado, blocos arredondados, maquininha,
   moedas): primitivas e `useFrame`, nenhum arquivo de modelo, nenhuma textura.
   O que mudou é o enredo — antes o cursor acelerava o laço do relógio, agora é a
   rolagem que monta a cena: o avião fecha a volta, os blocos se empilham de
   baixo para cima, o cartão desce até o slot e as moedas sobem na pilha.

   RELÓGIO NENHUM (correção da verificação da E3): as cenas tinham termos de
   tempo — o ângulo do avião somando `t * 0.8`, a moeda caindo em laço de 2,4 s,
   o grupo girando com `Math.sin(t * 0.3)`. Com eles, o canvas desenhava sem
   parar enquanto a seção estivesse à vista (4.032 chamadas de desenho em 2 s
   medidas com o dedo parado): o palco era um quinto relógio, fora do orçamento
   de quatro do plano ("a Wone concentra a rolagem num lugar e o tempo no
   telefone"). Agora toda pose é função da rolagem, o `frameloop` é SEMPRE
   "demand" e quem pede quadro é o progresso — mais a inércia da travessia, que
   se re-agenda até assentar. Parado, o palco custa zero.
   -------------------------------------------------------------------------- */

const BRAND = "#FF7700";
/**
 * Os sólidos escuros das cenas (blocos, maquininha, moeda alternada) eram
 * #1b1b24 sobre a caixa ink-850 (#0f0f14): dois pretos a um degrau de
 * distância, e a verificação mediu que a silhueta não se separava do fundo.
 * #34343f é o primeiro tom que separa — é mais claro que todo o ink da página
 * de propósito: aqui ele é material de objeto, não superfície de interface.
 */
const ARDOSIA = "#34343f";
const PASSOS = 4;

function limita(valor: number, minimo: number, maximo: number) {
  return valor < minimo ? minimo : valor > maximo ? maximo : valor;
}

/** Interpolação suave e independente da taxa de quadros. */
function damp(atual: number, alvo: number, lambda: number, dt: number) {
  return atual + (alvo - atual) * (1 - Math.exp(-lambda * dt));
}

/** Smoothstep: 0 antes de `a`, 1 depois de `b`, com as duas pontas suaves. */
function suave(a: number, b: number, x: number) {
  const t = limita((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Posição contínua da rolagem na seção, de 0 a 4 (um por passo).
 *
 * As pontas ficam em 0,06 e 3,94 porque é onde a janela de peso abre e fecha
 * (ver `peso`): nos extremos o primeiro e o último passo precisam estar com
 * peso cheio, e não a meio caminho de entrar.
 */
function posicao(progresso: number) {
  return limita(progresso * PASSOS, 0.06, PASSOS - 0.06);
}

/**
 * Peso do passo `indice` na posição `pos`: 1 no meio do passo, 0 longe dele.
 *
 * A janela é estreita de propósito. Com a anterior (entrada em -0,25/+0,12 e
 * saída em +0,88/+1,25) a travessia durava 0,24 de passo com os dois grupos em
 * 0,75 de peso cada, e a verificação viu as duas cenas translúcidas
 * sobrepostas (o plano da maquininha por cima dos blocos). Agora o cruzamento
 * dura 0,12 de passo — metade do tempo — e a opacidade cai com o QUADRADO do
 * peso, então no pior instante cada cena está em 0,55 e não em 0,75.
 */
function peso(pos: number, indice: number) {
  return (
    suave(indice - 0.12, indice + 0.06, pos) * (1 - suave(indice + 0.94, indice + 1.12, pos))
  );
}

/** Quanto do passo `indice` já passou, de 0 a 1. */
function avanco(pos: number, indice: number) {
  return limita(pos - indice, 0, 1);
}

type CenaProps = {
  progress: MotionValue<number>;
  indice: number;
};

/**
 * Material laranja da marca, igual nas quatro cenas.
 *
 * `transparent` vem declarado aqui, e não ligado em tempo de execução: trocar
 * `transparent` depois recompila o programa do material — um engasgo visível na
 * primeira troca de passo. Com ele sempre ligado, o palco só mexe em `opacity`.
 */
function BrandMaterial({ dark = false }: { dark?: boolean }) {
  return (
    <meshPhysicalMaterial
      transparent
      color={dark ? ARDOSIA : BRAND}
      emissive={BRAND}
      emissiveIntensity={dark ? 0.1 : 0.26}
      metalness={dark ? 0.45 : 0.75}
      roughness={dark ? 0.45 : 0.22}
      clearcoat={1}
      clearcoatRoughness={0.15}
    />
  );
}

/* --------------------------------------------------------------------------
   1. Conecte seu bot — o avião fecha a volta
   -------------------------------------------------------------------------- */

/** Avião de papel, o mesmo perfil do ícone 2D. */
function planeShape() {
  const forma = new Shape();
  forma.moveTo(-1, 0.25);
  forma.lineTo(1, 0.95);
  forma.lineTo(0.15, -0.95);
  forma.lineTo(-0.05, -0.1);
  forma.lineTo(-1, 0.25);
  return forma;
}

/** Quantas marcas de rastro ficam atrás do avião. */
const RASTRO = 7;

function Plane({ progress, indice }: CenaProps) {
  const orbita = useRef<Group>(null);
  const rastro = useRef<(Mesh | null)[]>([]);
  const forma = useMemo(() => planeShape(), []);

  useFrame(() => {
    const pos = posicao(progress.get());
    // Grupo fora de cena: nem a conta dele é feita.
    if (peso(pos, indice) <= 0.01) return;

    const local = avanco(pos, indice);
    /* A volta é só da rolagem: pouco mais de meia volta no passo, e o raio
       fecha no fim — o avião pousa. O termo de relógio que somava aqui saiu
       (ver o cabeçalho do arquivo). */
    const angulo = local * Math.PI * 1.3;
    const raio = 0.78 - local * 0.2;

    const poe = (a: number, no: Object3D | null) => {
      if (!no) return;
      no.position.set(Math.cos(a) * raio, Math.sin(a) * raio * 0.6, Math.sin(a) * 0.25);
    };

    poe(angulo, orbita.current);
    if (orbita.current) {
      /* O nariz NÃO acompanha a tangente em `y`: medido na caixa de 325px, a
         volta punha o avião de perfil na maior parte do tempo e ele lia como
         uma lasca laranja. Agora ele voa de frente para quem olha e só balança
         na curva — a silhueta de avião de papel fica legível o tempo todo. */
      orbita.current.rotation.set(
        -0.2 + Math.sin(angulo) * 0.1,
        Math.sin(angulo) * 0.35,
        Math.cos(angulo) * 0.15 - 0.1,
      );
    }

    rastro.current.forEach((ponto, ordem) => {
      poe(angulo - (ordem + 1) * 0.17, ponto);
      ponto?.scale.setScalar((1 - ordem / RASTRO) * 0.12);
    });
  });

  return (
    <group>
      <group ref={orbita}>
        <Center>
          <Extrude
            args={[
              forma,
              {
                depth: 0.3,
                bevelEnabled: true,
                bevelSize: 0.05,
                bevelThickness: 0.05,
                bevelSegments: 4,
              },
            ]}
            scale={0.78}
          >
            <BrandMaterial />
          </Extrude>
        </Center>
      </group>

      {Array.from({ length: RASTRO }, (_, ordem) => (
        <mesh
          key={ordem}
          ref={(no) => {
            rastro.current[ordem] = no;
          }}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color={BRAND} transparent opacity={(1 - ordem / RASTRO) * 0.5} />
        </mesh>
      ))}
    </group>
  );
}

/* --------------------------------------------------------------------------
   2. Monte seu funil — os blocos se empilham de baixo para cima
   -------------------------------------------------------------------------- */

const BLOCO_Y = [0.82, 0, -0.82];

/**
 * De quanto acima o bloco cai até encaixar.
 *
 * Era 1,1. A câmera (fov 42 a z=4,2) enxerga até y = tan(21°) × 4,2 = 1,61, e
 * o bloco de cima esperava a sua vez em 0,82 + 1,1 = 1,92: no meio do passo 2
 * só dois dos três blocos estavam em quadro (achado da verificação). Com 0,6 o
 * bloco espera em 1,42, dentro do quadro e ainda longe do chip de estado.
 */
const QUEDA = 0.6;

function Blocks({ progress, indice }: CenaProps) {
  const blocos = useRef<(Group | null)[]>([]);
  const fio = useRef<Mesh>(null);

  useFrame(() => {
    const pos = posicao(progress.get());
    if (peso(pos, indice) <= 0.01) return;

    const local = avanco(pos, indice);

    blocos.current.forEach((bloco, ordem) => {
      if (!bloco) return;
      /* De baixo para cima: o último da lista é o primeiro a encaixar. */
      const vez = BLOCO_Y.length - 1 - ordem;
      const entrada = suave(0.06 + vez * 0.26, 0.36 + vez * 0.26, local);
      bloco.position.y = BLOCO_Y[ordem] + (1 - entrada) * QUEDA;
      bloco.rotation.z = (1 - entrada) * 0.3;
      bloco.scale.setScalar(0.4 + entrada * 0.6);
    });

    /* O fio que liga os três cresce junto com a pilha. */
    if (fio.current) fio.current.scale.y = Math.max(0.001, suave(0.1, 0.95, local));
  });

  return (
    <group>
      <mesh ref={fio} position={[-0.56, 0, -0.14]}>
        <boxGeometry args={[0.07, 1.7, 0.07]} />
        <BrandMaterial />
      </mesh>

      {BLOCO_Y.map((y, ordem) => (
        <group
          key={y}
          position={[0, y, 0]}
          ref={(no) => {
            blocos.current[ordem] = no;
          }}
        >
          <RoundedBox args={[1.6, 0.58, 0.5]} radius={0.1} smoothness={3}>
            <meshPhysicalMaterial
              transparent
              color={ARDOSIA}
              metalness={0.4}
              roughness={0.5}
              clearcoat={0.6}
            />
          </RoundedBox>

          {/* Barra da categoria, igual à dos blocos do editor */}
          <mesh position={[-0.72, 0, 0.19]}>
            <boxGeometry args={[0.12, 0.46, 0.16]} />
            <BrandMaterial />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* --------------------------------------------------------------------------
   3. Conecte seu gateway — o cartão mergulha no slot
   -------------------------------------------------------------------------- */

function Terminal({ progress, indice }: CenaProps) {
  const cartao = useRef<Group>(null);
  const anel = useRef<Mesh>(null);

  useFrame(() => {
    const pos = posicao(progress.get());
    if (peso(pos, indice) <= 0.01) return;

    const local = avanco(pos, indice);

    /* A descida é toda da rolagem (o flutuar de relógio saiu). 0,9 de curso, e
       não 0,82: o cartão precisa ENTRAR na boca do slot — com o curso antigo
       ele parava encostado nela e a leitura "mergulha" não acontecia. */
    const descida = suave(0.08, 0.62, local);
    if (cartao.current) {
      cartao.current.position.y = 1.0 - descida * 0.9;
      cartao.current.rotation.z = (1 - descida) * 0.14;
    }

    /* O anel sai da maquininha quando o cartão chega ao fundo e some depois.
       Só por escala: a opacidade de toda a cena é do palco, que a reescreve a
       cada quadro a partir do peso do passo — se a cena também escrevesse,
       perderia a disputa e o anel nunca apareceria. */
    if (anel.current) {
      const estouro = suave(0.6, 0.82, local) * (1 - suave(0.88, 1, local));
      anel.current.scale.setScalar(estouro * 1.2);
    }
  });

  return (
    /* Inclinada para a frente (era -0,12): assim se vê o tampo da maquininha e
       a boca do slot como boca, e não como um risco no meio de um bloco. */
    <group position={[0, -0.1, 0]} rotation={[0.2, 0.34, 0]}>
      {/* Maquininha */}
      <RoundedBox args={[1.8, 1, 0.95]} radius={0.14} smoothness={3} position={[0, -0.62, 0]}>
        <meshPhysicalMaterial
          transparent
          color={ARDOSIA}
          metalness={0.45}
          roughness={0.45}
          clearcoat={0.7}
        />
      </RoundedBox>

      {/* Boca do slot */}
      <mesh position={[0, -0.14, 0]}>
        <boxGeometry args={[1.3, 0.09, 0.42]} />
        <meshBasicMaterial transparent color="#05050b" />
      </mesh>

      {/* Anel de confirmação. Era um torus DEITADO e de escala 1,9: visto quase
          de topo, lia como aba de chapéu maior que a maquininha (achado da
          verificação). Agora está de pé, de frente para quem olha, à frente do
          corpo (z 0,56, fora dos 0,475 da face) e com teto de 1,2 — um halo que
          sobe do slot. Nasce em escala 0: quem o faz aparecer é o avanço do
          passo, não a opacidade. */}
      <mesh ref={anel} position={[0, -0.12, 0.56]} scale={0}>
        <torusGeometry args={[0.64, 0.05, 8, 32]} />
        <meshBasicMaterial color={BRAND} transparent opacity={0.85} />
      </mesh>

      {/* Cartão */}
      <group ref={cartao} position={[0, 1, 0]}>
        <RoundedBox args={[1.25, 0.8, 0.09]} radius={0.07} smoothness={3}>
          <BrandMaterial />
        </RoundedBox>
        {/* Chip */}
        <mesh position={[-0.32, 0.1, 0.06]}>
          <boxGeometry args={[0.26, 0.2, 0.03]} />
          <meshPhysicalMaterial transparent color="#2a2a33" metalness={0.9} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

/* --------------------------------------------------------------------------
   4. Venda e acompanhe — as moedas sobem na pilha
   -------------------------------------------------------------------------- */

const PILHA_Y = [-0.74, -0.46, -0.18];

function Coins({ progress, indice }: CenaProps) {
  const pilha = useRef<(Mesh | null)[]>([]);

  useFrame(() => {
    const pos = posicao(progress.get());
    if (peso(pos, indice) <= 0.01) return;

    const local = avanco(pos, indice);

    /* Uma moeda por terço do passo: a pilha é o progresso da venda. A quarta
       moeda, que caía em laço de 2,4 s, saiu com os relógios — ela era a peça
       que mantinha o canvas desenhando com a página parada. */
    pilha.current.forEach((moeda, ordem) => {
      if (!moeda) return;
      const entrada = suave(0.05 + ordem * 0.24, 0.3 + ordem * 0.24, local);
      moeda.position.y = PILHA_Y[ordem] + (1 - entrada) * 1.2;
      moeda.scale.setScalar(0.5 + entrada * 0.5);
      moeda.rotation.x = (1 - entrada) * 1.8;
    });
  });

  return (
    <group rotation={[-0.2, 0, 0]}>
      {PILHA_Y.map((y, ordem) => (
        <mesh
          key={y}
          position={[0, y, 0]}
          ref={(no) => {
            pilha.current[ordem] = no;
          }}
        >
          <cylinderGeometry args={[0.66, 0.66, 0.18, 28]} />
          <BrandMaterial dark={ordem % 2 === 1} />
        </mesh>
      ))}
    </group>
  );
}

/* --------------------------------------------------------------------------
   O palco: quatro grupos na mesma origem, pesados pela rolagem
   -------------------------------------------------------------------------- */

/* A ordem é a do dicionário (`howItWorks.steps`): bot, funil, gateway, venda. */
const CENAS = [Plane, Blocks, Terminal, Coins];

/** Um material do grupo, com a opacidade que ele tem em repouso. */
type Pintura = { material: Material; base: number };

/**
 * Colhe os materiais do grupo uma vez. `traverse` por quadro custaria caro, e
 * guardar a opacidade de origem é o que deixa o rastro do avião manter o seu
 * degrau de transparência quando o grupo inteiro esmaece.
 */
function colhePinturas(raiz: Object3D) {
  const pinturas: Pintura[] = [];
  raiz.traverse((no) => {
    const material = (no as Mesh).material;
    if (!material) return;
    for (const item of Array.isArray(material) ? material : [material]) {
      pinturas.push({ material: item, base: item.opacity });
    }
  });
  return pinturas;
}

/** Perto o bastante do alvo para que não valha mais um quadro. */
function assentou(atual: number, alvo: number) {
  return Math.abs(atual - alvo) < 0.002;
}

function Palco({
  progress,
  reduzido,
  onPintado,
}: {
  progress: MotionValue<number>;
  reduzido: boolean;
  onPintado: () => void;
}) {
  const grupos = useRef<(Group | null)[]>([]);
  const pinturas = useRef<(Pintura[] | null)[]>([null, null, null, null]);
  const pintou = useRef(false);
  const invalidate = useThree((estado) => estado.invalidate);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const pos = posicao(progress.get());
    /* Com `frameloop="demand"` ninguém desenha o quadro seguinte sozinho: se a
       inércia da travessia ainda não assentou, o próprio palco pede mais um. É
       isso que dá movimento contínuo durante a troca de passo e silêncio total
       quando ela termina. */
    let movendo = false;

    for (let indice = 0; indice < PASSOS; indice += 1) {
      const grupo = grupos.current[indice];
      if (!grupo) continue;

      const w = peso(pos, indice);
      grupo.visible = w > 0.01;
      if (!grupo.visible) continue;

      pinturas.current[indice] ??= colhePinturas(grupo);
      /* w², não w: no instante do cruzamento os dois grupos valem 0,74 de peso,
         e com a opacidade linear as duas cenas apareciam uma por dentro da
         outra. Ao quadrado, cada uma fica em 0,55 — e no meio do passo, com w=1,
         nada muda. */
      const alfa = w * w;
      for (const { material, base } of pinturas.current[indice] ?? []) {
        material.opacity = base * alfa;
      }

      /* A cena que sai encolhe, afunda, recua e se vira; a que entra faz o
         contrário. O recuo em z é o que separa as duas na travessia: antes elas
         cruzavam no mesmo plano e os sólidos se interpenetravam. */
      const escalaAlvo = 0.76 + 0.24 * w;
      const alturaAlvo = (1 - w) * -0.3;
      const fundoAlvo = (1 - w) * -0.8;
      const giroAlvo = (1 - w) * 0.7;

      if (reduzido) {
        /* Movimento reduzido: a pose do passo à vista, posta direto. */
        grupo.scale.setScalar(escalaAlvo);
        grupo.position.set(0, alturaAlvo, fundoAlvo);
        grupo.rotation.y = giroAlvo;
      } else {
        if (
          !assentou(grupo.scale.x, escalaAlvo) ||
          !assentou(grupo.position.y, alturaAlvo) ||
          !assentou(grupo.position.z, fundoAlvo) ||
          !assentou(grupo.rotation.y, giroAlvo)
        ) {
          movendo = true;
        }
        grupo.scale.setScalar(damp(grupo.scale.x, escalaAlvo, 9, dt));
        grupo.position.y = damp(grupo.position.y, alturaAlvo, 9, dt);
        grupo.position.z = damp(grupo.position.z, fundoAlvo, 9, dt);
        grupo.rotation.y = damp(grupo.rotation.y, giroAlvo, 5, dt);
      }
    }

    if (movendo) invalidate();

    /* O ícone 2D só sai depois de um quadro DESENHADO — e este aviso sai daqui,
       e não do `onCreated` do canvas: com `frameloop="demand"` existe canvas
       criado antes de existir quadro, e apagar o ícone ali deixava a caixa
       vazia por um instante. Um `setState`, uma vez. */
    if (!pintou.current) {
      pintou.current = true;
      onPintado();
    }
  });

  return (
    <>
      {CENAS.map((Cena, indice) => (
        <group
          key={indice}
          visible={false}
          ref={(no) => {
            grupos.current[indice] = no;
          }}
        >
          <Cena progress={progress} indice={indice} />
        </group>
      ))}
    </>
  );
}

/**
 * O canvas vive em `frameloop="demand"`: desenha quando alguém pede, e mais
 * nada. Quem pede é a rolagem — cada mudança do progresso vale um quadro —,
 * mais o próprio palco enquanto a travessia não assenta.
 *
 * Fora da tela ninguém assina o progresso: a seção pode estar rolando longe
 * daqui sem custar um quadro.
 */
function Invalidador({
  progress,
  aVista,
}: {
  progress: MotionValue<number>;
  aVista: boolean;
}) {
  const invalidate = useThree((estado) => estado.invalidate);

  useEffect(() => {
    // Um quadro na montagem (e ao voltar à vista) põe a pose em dia.
    invalidate();
    if (!aVista) return;
    return progress.on("change", () => invalidate());
  }, [progress, invalidate, aVista]);

  return null;
}

/**
 * Canvas do palco. Importado por `next/dynamic` com `ssr: false` e montado só
 * quando a seção chega a 400px da viewport (quem decide é o `StepsStage`).
 */
export default function StepStage3D({
  progress,
  aVista,
  onPintado,
}: {
  /** Progresso da rolagem na lista de passos, de 0 a 1. */
  progress: MotionValue<number>;
  /** `false` quando a seção saiu da tela: ninguém pede quadro. */
  aVista: boolean;
  /** Chamado no primeiro quadro desenhado, para apagar o ícone 2D da caixa. */
  onPintado: () => void;
}) {
  /* O ambiente (tamanho de tela e movimento reduzido) é lido por `matchMedia`
     DENTRO de um efeito, nunca no primeiro render (regra 6) — e `antialias` é
     atributo de criação do contexto, então o canvas espera essa medida. Um
     quadro sem canvas não deixa buraco: o ícone 2D do palco está na caixa. */
  const [ambiente, setAmbiente] = useState<{ grande: boolean; reduzido: boolean } | null>(null);

  useEffect(() => {
    const telaGrande = window.matchMedia("(min-width: 640px)");
    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    /* Assinar as duas consultas, como nas outras seções que andam: trocar a
       preferência de movimento passa a valer na hora (a travessia perde a
       inércia), e girar o telefone corrige o `dpr`. O `antialias` não: é
       atributo de criação do contexto e fica com o que valia quando o canvas
       nasceu. */
    const sincroniza = () =>
      setAmbiente({ grande: telaGrande.matches, reduzido: semMovimento.matches });

    sincroniza();
    telaGrande.addEventListener("change", sincroniza);
    semMovimento.addEventListener("change", sincroniza);
    return () => {
      telaGrande.removeEventListener("change", sincroniza);
      semMovimento.removeEventListener("change", sincroniza);
    };
  }, []);

  if (!ambiente) return null;

  return (
    /* A cena é ilustração: quem conta os quatro passos para o leitor de tela é
       a lista ao lado. */
    <div aria-hidden className="absolute inset-0">
      <Canvas
        /* `dpr` no piso abaixo de 640: o custo de preencher o canvas em tela
           retina de telefone é o que fazia a seção engasgar na versão de quatro
           ícones. Acima de 640, 1,5 é o teto medido. */
        dpr={ambiente.grande ? [1, 1.5] : [1, 1]}
        /* Enquadramento medido na caixa de 325px (1440): a 4,6 a cena ocupava
           60% da altura e a caixa parecia grande demais para ela; a 4,2 as
           quatro cenas enchem ~75% sem encostar na borda arredondada. */
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        gl={{ antialias: ambiente.grande, alpha: true }}
        /* Sempre "demand": nenhuma cena tem vida própria, então quadro só
           existe quando a rolagem (ou a inércia da travessia) pede. */
        frameloop="demand"
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 5]} intensity={2.4} />
        <directionalLight position={[-4, -2, -3]} intensity={0.8} color={BRAND} />

        {/* Ambiente de reflexo próprio, em 64px e renderizado uma vez só — sem
            HDR de CDN, sem conversão PMREM a cada montagem. Agora é UM para as
            quatro cenas, no lugar de um por ícone. */}
        <Environment resolution={64} frames={1}>
          <Lightformer intensity={2.4} color="#FFF4E8" position={[2, 3, 4]} scale={6} />
          <Lightformer intensity={1.2} color={BRAND} position={[-4, -1, -3]} scale={8} />
          <Lightformer intensity={0.5} color="#20202a" position={[0, -4, 1]} scale={10} />
        </Environment>

        <Invalidador progress={progress} aVista={aVista} />
        <Palco progress={progress} reduzido={ambiente.reduzido} onPintado={onPintado} />
      </Canvas>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import {
  SRGBColorSpace,
  TextureLoader,
  type Group,
  type MeshBasicMaterial,
  type Texture,
} from "three";

const PLAQUE = { w: 2.2, h: 2.9, d: 0.34 };
/** Quanto dura a passagem de uma placa para a outra, em segundos. */
const CROSSFADE_S = 0.55;

/* --------------------------------------------------------------------------
   A arte de cada placa

   Antes a troca de prêmio passava pelo molde: a imagem nova começava a carregar,
   o componente caía no `Suspense` e o acrílico vazio com os anéis aparecia no
   meio do caminho. Era o "leve delay onde aparece o molde original".

   Agora a textura é carregada à parte e só entra em cena quando está pronta —
   até lá, a placa anterior continua à vista. Quando a nova chega, as duas se
   cruzam em meio segundo. O molde vazio só aparece antes da primeira arte da
   sessão, e as imagens são pré-carregadas pelo carrossel assim que a seção se
   aproxima, então nem essa costuma ser vista.
   -------------------------------------------------------------------------- */

/** Texturas já carregadas, por caminho: voltar a um prêmio não recarrega nada. */
const CACHE = new Map<string, Texture>();

/**
 * Tamanho do plano que mostra a arte, no estilo `object-fit: contain`.
 *
 * Era `cover`: a arte preenchia a face e o excedente era cortado, que é o certo
 * quando a imagem é só a estampa e o acrílico está em volta, feito de malha.
 * Com as fotos novas a imagem É a placa inteira, recortada — cortar o excedente
 * passaria a serrar a borda do próprio acrílico. Então agora ela cabe inteira,
 * e é o plano que muda de proporção, nunca a imagem.
 */
function planeSize(
  texture: Texture,
  maxW = PLAQUE.w,
  maxH = PLAQUE.h,
): [number, number] {
  const image = texture.image as { width: number; height: number } | undefined;
  if (!image?.width || !image?.height) return [maxW, maxH];

  const ratio = image.width / image.height;
  return ratio > maxW / maxH ? [maxW, maxW / ratio] : [maxH * ratio, maxH];
}

/* --------------------------------------------------------------------------
   Os objetos em volta

   Cada marco traz a joia que o acompanha — a pulseira do 100K, o colar do
   500K, o anel do 1M. A mesma peça aparece quatro vezes, uma em cada canto,
   atrás da placa: lidas juntas, as quatro dizem "isto também chega na sua
   casa" sem precisar de legenda.

   Ficam na mesma `group` da placa, então acompanham o vaivém e ganham
   paralaxe em vez de parecerem adesivos colados no canvas.
   -------------------------------------------------------------------------- */

/**
 * Cantos onde os quatro objetos se posicionam.
 *
 * `fase` desencontra o flutuar de cada um: com o mesmo relógio e a mesma conta,
 * os quatro subiriam e desceriam em formação, que é a única coisa que denuncia
 * na hora que aquilo é código e não um objeto solto no ar.
 */
const ITEM_SPOTS: {
  pos: [number, number, number];
  tilt: number;
  fase: number;
  giro: number;
}[] = [
  { pos: [-1.74, 1.46, -0.6], tilt: 0.07, fase: 0, giro: 1 },
  { pos: [1.74, 1.46, -0.6], tilt: -0.07, fase: 1.9, giro: -0.82 },
  { pos: [-1.74, -1.46, -0.6], tilt: -0.05, fase: 3.4, giro: 0.74 },
  { pos: [1.74, -1.46, -0.6], tilt: 0.05, fase: 5.1, giro: -1.08 },
];

/**
 * O lugar da joia quando ela aparece uma vez só, ao lado da placa.
 *
 * Uma joia solta — o anel na caixa — se repete nos quatro cantos: são quatro
 * vistas do mesmo objeto, e juntas enchem o quadro. Uma joia vestida não: o
 * busto e o pulso já trazem corpo, e quatro corpos em volta de uma placa viram
 * multidão. Um só, do tamanho da placa, divide o quadro em dois assuntos — o
 * troféu e quem o usa.
 */
/**
 * Os dois lugares que a placa e a joia vestida dividem entre si.
 *
 * Não são "o lugar da placa" e "o lugar da joia": são dois postos vagos, e
 * cada uma ocupa um de cada vez. A troca é o que amarra as duas numa cena só
 * — paradas lado a lado, elas eram dois cartazes pendurados no mesmo quadro;
 * revezando o mesmo par de lugares, viram duas peças de uma coisa só.
 */
const POSTO = { esq: -1.2, dir: 1.3 };

const ITEM_SOLO: (typeof ITEM_SPOTS)[number] = {
  pos: [POSTO.dir, 0.04, -0.25],
  tilt: 0.03,
  fase: 0.7,
  giro: 1,
};

/**
 * O compasso do rodízio.
 *
 * `parada` é o tempo em que cada uma fica no seu posto — longo de propósito:
 * a placa traz texto, e texto que anda não se lê. `passo` é a travessia.
 *
 * `frente` e `fundo` são o quanto cada uma sai do plano ao atravessar. Elas
 * se cruzam no meio do caminho, e sem essa diferença de profundidade os dois
 * planos passariam um dentro do outro — o `depthWrite: false` da arte faria o
 * cruzamento virar uma sobreposição confusa, sem dizer qual está na frente.
 * Com ela, uma passa por cima e a outra por baixo, e a cada troca os papéis
 * se invertem.
 *
 * `frente` é bem menor que `fundo` porque vir para a frente aproxima da
 * câmera, e o que se aproxima cresce: 0.7 já dá 11% a mais de tamanho
 * aparente, que é o suficiente para ler como passagem por cima sem que a
 * peça encoste nas bordas do canvas.
 */
const TROCA = { parada: 4.2, passo: 1.6, frente: 0.7, fundo: 1.5 };

/** Começa devagar, acelera, chega devagar. */
function suave(p: number) {
  const q = Math.min(1, Math.max(0, p));
  return q * q * (3 - 2 * q);
}

/**
 * Onde está, neste instante, quem começou a cena no posto `lado`.
 *
 * As duas leem o mesmo relógio e fazem a mesma conta, cada uma com o seu
 * `lado` — então ninguém precisa avisar ninguém de nada. Sem estado
 * compartilhado não há como as duas saírem de sincronia e acabarem as duas no
 * mesmo lugar, que é o único jeito de esta cena quebrar feio.
 */
function posto(t: number, lado: 0 | 1) {
  const ciclo = TROCA.parada + TROCA.passo;
  const voltas = Math.floor(t / ciclo);
  const p = suave((t - voltas * ciclo - TROCA.parada) / TROCA.passo);

  /* A cada volta os dois postos se invertem: quem estava à esquerda na volta
     par está à direita na ímpar. */
  const naEsquerda = (lado + voltas) % 2 === 0;
  const de = naEsquerda ? POSTO.esq : POSTO.dir;
  const para = naEsquerda ? POSTO.dir : POSTO.esq;

  return {
    x: de + (para - de) * p,
    z: Math.sin(Math.PI * p) * (naEsquerda ? TROCA.frente : -TROCA.fundo),
  };
}

/** Quanto a peça cresce sob o cursor. */
const ITEM_HOVER = 1.16;
/**
 * O quadro em que uma foto real cabe.
 *
 * Contido, de propósito: são quatro cópias da mesma peça girando em volta da
 * placa, e quatro chapas grandes no ar disputam com o que elas deveriam estar
 * acompanhando. A placa é que é o assunto.
 */
const FOTO_MAX = { w: 0.6, h: 0.66 };
/**
 * O quadro da joia vestida, que aparece sozinha e precisa encarar a placa.
 *
 * Maior que o da joia solta porque a imagem não é só a joia: ela já vem com o
 * corpo que a veste desenhado em volta, e a peça de metal ocupa menos da
 * metade do quadro. Os dois arquivos são mais altos que largos — 1000×1500 o
 * dorso, 970×1465 o pulso —, então os dois param na altura, e `w` aqui é só o
 * teto que nenhum dos dois alcança.
 *
 * Cresceu de 3 para 3.6 de altura. O corpo tinha de encarar a placa, que tem
 * 2.9: no tamanho antigo o dorso chegava quase ao mesmo, e dois objetos do
 * mesmo tamanho lado a lado não dizem qual deles é o assunto. Agora o corpo é
 * claramente o maior dos dois — ele é quem usa a joia, a placa é o troféu que
 * a acompanha.
 *
 * Não cresce mais que isto porque a altura visível em z = 0 é de pouco mais
 * de 5, e a peça ainda sobe e desce no ar; passando daqui, a cabeça do busto
 * começa a encostar na borda de cima do canvas.
 */
const FOTO_SOLO = { w: 2.42, h: 3.6 };
/** Meia espessura entre as duas faces de uma foto. */
const FOTO_PELE = 0.005;
/**
 * O flutuar de cada objeto.
 *
 * `gira` é a volta contínua da joia solta: ela roda em torno do próprio eixo,
 * como rodaria na mão de alguém. As duas faces costas com costas seguram isso
 * — a imagem nunca some de perfil nem aparece espelhada do outro lado.
 *
 * `olha` é para a joia vestida, que não dá a volta: um busto girando põe a
 * pessoa de costas para quem olha, e a joia some junto. Essa oscila.
 *
 * `sobe` e `balanca` completam — senos de períodos que não se dividem, para a
 * pose nunca se repetir exatamente.
 */
const FLOAT = { sobe: 0.085, balanca: 0.22, olha: 0.32, gira: 0.5 };

/**
 * Um dos quatro objetos.
 *
 * A escala é interpolada quadro a quadro em vez de sair de uma transição CSS —
 * dentro do canvas não existe CSS, e o amortecimento exponencial chega ao mesmo
 * lugar em qualquer taxa de quadros. Quem pediu menos movimento recebe o
 * tamanho final na hora, sem o caminho.
 *
 * Entrar e sair também é tamanho: a peça nasce em zero e cresce, e a do marco
 * anterior encolhe até sumir.
 */
function ItemCard({
  foto,
  spot,
  quadro,
  vestida,
  outgoing,
  reduced,
}: {
  /** A imagem da joia que este canto mostra. */
  foto: Texture;
  spot: (typeof ITEM_SPOTS)[number];
  /** O quadro em que ela cabe: o dos cantos ou o da joia vestida. */
  quadro: { w: number; h: number };
  /** Vestida oscila; solta dá a volta. */
  vestida: boolean;
  outgoing?: boolean;
  reduced: boolean;
}) {
  const pivot = useRef<Group>(null);
  const [hot, setHot] = useState(false);

  /* O cursor é do documento, não do mesh: sair da página com ele em "pointer"
     deixaria a mão pendurada na tela. */
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  useFrame((state, delta) => {
    if (!pivot.current) return;

    /* A travessia entre marcos é feita no tamanho, não na opacidade. Metal
       meio transparente mostra o próprio avesso e vira vidro sujo; encolher
       até sumir mantém a peça sólida do começo ao fim. */
    const target = outgoing ? 0 : hot ? ITEM_HOVER : 1;

    const now = pivot.current.scale.x;
    const step = reduced ? 1 : 1 - Math.exp(-10 * Math.min(delta, 0.05));
    const next = now + (target - now) * step;
    pivot.current.scale.setScalar(next);

    /* Encolheu até sumir: para de ser desenhada. Sem isto a peça que saiu
       continuaria no laço de render para sempre, do tamanho de nada. */
    pivot.current.visible = next > 0.012;
    if (!pivot.current.visible) return;

    /* No ar: a joia solta dá a volta inteira, a vestida oscila. As duas sobem
       e descem e balançam junto, em senos de períodos que não se dividem —
       então a pose nunca se repete exatamente. */
    if (!reduced) {
      const t = state.clock.elapsedTime + spot.fase;
      pivot.current.position.y = spot.pos[1] + Math.sin(t * 0.62) * FLOAT.sobe;
      pivot.current.rotation.y = vestida
        ? Math.sin(t * 0.39 * spot.giro) * FLOAT.olha
        : t * FLOAT.gira * spot.giro;
      pivot.current.rotation.x = Math.sin(t * 0.43) * FLOAT.balanca;

      /* A joia vestida reveza os postos com a placa. O relógio da travessia é
         o limpo, sem a `fase` — essa desencontra o flutuar dos quatro cantos,
         e aqui ela atrasaria a troca em relação à placa, que lê o mesmo
         relógio do outro lado. */
      if (vestida) {
        const lugar = posto(state.clock.elapsedTime, 1);
        pivot.current.position.x = lugar.x;
        pivot.current.position.z = spot.pos[2] + lugar.z;
      }
    }
  });

  return (
    <group
      ref={pivot}
      position={spot.pos}
      rotation={[0, 0, spot.tilt]}
      scale={0}
      onPointerOver={(event) => {
        if (outgoing) return;
        event.stopPropagation();
        setHot(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHot(false);
        document.body.style.cursor = "";
      }}
    >
      {/* Duas faces costas com costas: assim a imagem não some ao virar de
          perfil nem aparece espelhada do outro lado. */}
      <mesh position={[0, 0, FOTO_PELE]}>
        <planeGeometry args={planeSize(foto, quadro.w, quadro.h)} />
        <meshBasicMaterial map={foto} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -FOTO_PELE]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={planeSize(foto, quadro.w, quadro.h)} />
        <meshBasicMaterial map={foto} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Carrega (ou devolve do cache) a arte já enquadrada. Sempre assíncrono. */
function loadArt(src: string) {
  const cached = CACHE.get(src);
  if (cached) return Promise.resolve(cached);

  return new Promise<Texture>((resolve, reject) => {
    new TextureLoader().load(
      src,
      (texture) => {
        texture.colorSpace = SRGBColorSpace;
        CACHE.set(src, texture);
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

/**
 * A arte em cena e a que está saindo.
 *
 * O par só muda quando a nova termina de carregar — é isso que impede o molde
 * vazio de aparecer entre uma placa e outra. Arquivo ausente não derruba nada:
 * o `catch` deixa a placa anterior onde está.
 */
function useArtPair(src?: string) {
  const [pair, setPair] = useState<{ prev: Texture | null; curr: Texture | null }>({
    prev: null,
    curr: null,
  });
  const current = useRef<Texture | null>(null);

  useEffect(() => {
    /* Marco sem imagem — hoje só o 10K, que ainda não tem foto do item. O que
       estava em cena sai pela travessia em vez de ficar pendurado do marco
       anterior. */
    if (!src) {
      if (current.current) {
        const prev = current.current;
        current.current = null;
        setPair({ prev, curr: null });
      }
      return;
    }

    let alive = true;
    loadArt(src)
      .then((texture) => {
        if (!alive || current.current === texture) return;
        const prev = current.current;
        current.current = texture;
        setPair({ prev, curr: texture });
      })
      .catch(() => {
        /* Sem arquivo, sem troca: fica a placa que já estava. */
      });

    return () => {
      alive = false;
    };
  }, [src]);

  return pair;
}

/**
 * A placa em cena, com os quatro objetos em volta.
 *
 * A arte já vem recortada do fundo, e é ela que carrega o acrílico inteiro —
 * bisel, reflexo e volume. O bloco de malha só aparece antes da primeira
 * imagem, como molde.
 */
function Plaque({
  accent,
  art,
  fotos,
  worn,
  spin,
  reduced,
}: {
  accent: string;
  art: { prev: Texture | null; curr: Texture | null };
  fotos: { prev: Texture | null; curr: Texture | null };
  /** A joia e vestida: aparece uma vez so, ao lado da placa. */
  worn: boolean;
  reduced: boolean;
  spin: boolean;
}) {
  const group = useRef<Group>(null);
  /** Tudo o que é a placa, que anda em bloco quando ela troca de posto. */
  const palco = useRef<Group>(null);
  const front = useRef<MeshBasicMaterial>(null);
  const back = useRef<MeshBasicMaterial>(null);
  const fade = useRef(0);

  /* Arte nova em cena: a travessia recomeça do zero. */
  useEffect(() => {
    fade.current = 0;
  }, [art.curr]);

  useFrame((state, delta) => {
    if (group.current) {
      // Vaivém de ±35° em vez de giro completo: a face com a arte fica sempre
      // voltada para quem olha. Num giro de 360° a placa passa boa parte do
      // tempo de perfil, aparecendo como uma lasca.
      const sway = spin ? Math.sin(state.clock.elapsedTime * 0.45) * 0.62 : 0;
      group.current.rotation.y = sway + state.pointer.x * 0.35;
      group.current.rotation.x = -state.pointer.y * 0.18;
    }

    /* O outro lado do rodízio. Quando não há joia vestida para revezar, a
       placa fica no meio do quadro e nada disto roda. */
    if (palco.current && worn && !reduced) {
      const lugar = posto(state.clock.elapsedTime, 0);
      palco.current.position.x = lugar.x;
      palco.current.position.z = lugar.z;
    }

    fade.current = Math.min(1, fade.current + delta / CROSSFADE_S);
    if (front.current) front.current.opacity = fade.current;
    if (back.current) back.current.opacity = 1 - fade.current;
  });

  const hasArt = Boolean(art.curr ?? art.prev);

  return (
    <group ref={group}>
      {/* Tudo o que e a placa anda junto quando ela reveza o quadro com a joia
          vestida: o acrilico, a arte, os aneis do molde e a base. A posicao
          aqui e a do primeiro quadro e a de quem pediu menos movimento; o
          resto do tempo quem manda e o rodizio, la em cima. */}
      <group ref={palco} position={[worn ? POSTO.esq : 0, 0, 0]}>
      {/* O bloco de acrílico, agora só enquanto não há arte.

          Ele existia para ser o corpo da placa, com a estampa aplicada na face.
          As fotos novas já vêm com o acrílico inteiro renderizado e com fundo
          recortado — então o bloco deixou de ser o corpo e virou o que ele
          parecia na tela: um retângulo preto atrás de uma imagem transparente,
          tapando a página. Fora de cena quando há arte, a transparência do PNG
          encosta direto no fundo do site, que é o que se pediu. */}
      {!hasArt && (
        <RoundedBox args={[PLAQUE.w, PLAQUE.h, PLAQUE.d]} radius={0.1} smoothness={6}>
          <meshPhysicalMaterial
            transmission={0.94}
            thickness={1.1}
            roughness={0.12}
            ior={1.46}
            clearcoat={1}
            clearcoatRoughness={0.06}
            attenuationColor={accent}
            attenuationDistance={2.4}
            color="#ffffff"
          />
        </RoundedBox>
      )}

      {/* A placa que sai, um fio atrás da que entra */}
      {art.prev && (
        <mesh position={[0, 0, PLAQUE.d / 2 + 0.01]}>
          <planeGeometry args={planeSize(art.prev)} />
          <meshBasicMaterial
            ref={back}
            map={art.prev}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {art.curr && (
        <mesh position={[0, 0, PLAQUE.d / 2 + 0.012]}>
          <planeGeometry args={planeSize(art.curr)} />
          <meshBasicMaterial
            ref={front}
            map={art.curr}
            transparent
            depthWrite={false}
            opacity={0}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Antes da primeira arte, os anéis da marca em relevo seguram a face. */}
      {!hasArt &&
        [-0.34, 0.34].map((x) => (
          <mesh key={x} position={[x, 0.26, PLAQUE.d / 2]}>
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

      {/* A joia: uma vez ao lado da placa quando é vestida, quatro vezes nos
          cantos quando é a peça solta. A do marco que sai continua em cena até
          a travessia terminar. */}
      {(worn ? [ITEM_SOLO] : ITEM_SPOTS).map((spot, index) => (
        <group key={index}>
          {fotos.prev && (
            <ItemCard
              key={`sai-${fotos.prev.uuid}`}
              foto={fotos.prev}
              spot={spot}
              quadro={worn ? FOTO_SOLO : FOTO_MAX}
              vestida={worn}
              outgoing
              reduced={reduced}
            />
          )}
          {fotos.curr && (
            <ItemCard
              key={`entra-${fotos.curr.uuid}`}
              foto={fotos.curr}
              spot={spot}
              quadro={worn ? FOTO_SOLO : FOTO_MAX}
              vestida={worn}
              reduced={reduced}
            />
          )}
        </group>
      ))}
    </group>
  );
}

/**
 * Canvas da placa. Importado por `next/dynamic` com `ssr: false` no carrossel,
 * e montado só quando a seção se aproxima.
 */
export default function AwardPlaque3D({
  accent,
  image,
  photo,
  worn = false,
  visible = true,
}: {
  accent: string;
  image?: string;
  /** Foto do item fisico do marco, repetida nos quatro cantos. */
  /** Caminho da imagem da joia, quando o marco tem uma. */
  photo?: string;
  /** A joia aparece vestida: uma vez só, dividindo o quadro com a placa. */
  worn?: boolean;
  /** `false` quando a seção saiu da tela: o laço de render para junto. */
  visible?: boolean;
}) {
  const reduced = useReducedMotion();

  /* `dpr` limitado: em telas retina o custo de preencher o canvas com um
     material transmissivo cresce rápido — e no celular ele era o suficiente
     para a placa andar aos tropeços. O componente só roda no cliente
     (`ssr: false`), então ler a largura aqui é seguro. */
  const dpr = useMemo<[number, number]>(
    () => (window.innerWidth < 640 ? [1, 1] : [1, 1.5]),
    [],
  );
  const art = useArtPair(image);
  const fotos = useArtPair(photo || undefined);

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 7.3], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      // Fora da tela, desenha um quadro e para.
      frameloop={reduced || !visible ? "demand" : "always"}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <directionalLight position={[-5, -2, -4]} intensity={0.9} color={accent} />

      {/* Ambiente próprio, em 64 px e renderizado uma vez.

          Era `preset="city"`: um HDR de megabytes vindo de CDN, convertido em
          PMREM a cada montagem. Era parte do engasgo no celular. Os lightformers
          abaixo dão ao acrílico o que refletir sem rede e sem conversão cara. */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={2.6} color="#FFF4E8" position={[3, 4, 5]} scale={7} />
        <Lightformer intensity={1.3} color={accent} position={[-5, -1, -3]} scale={9} />
        <Lightformer intensity={0.5} color="#20202a" position={[0, -5, 2]} scale={12} />
      </Environment>

      <Plaque
        accent={accent}
        art={art}
        fotos={fotos}
        worn={worn && Boolean(photo)}
        spin={!reduced}
        reduced={!!reduced}
      />
    </Canvas>
  );
}

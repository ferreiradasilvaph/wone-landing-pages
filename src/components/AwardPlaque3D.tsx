"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import {
  SRGBColorSpace,
  TextureLoader,
  type Group,
  type Mesh,
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

   Cada marco manda junto a foto do item físico — a pulseira do 100K, o colar
   do 500K, o anel do 1M. A mesma foto aparece quatro vezes, uma em cada canto,
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
const ITEM_SPOTS: { pos: [number, number, number]; tilt: number; fase: number }[] = [
  { pos: [-1.5, 1.34, -0.3], tilt: 0.07, fase: 0 },
  { pos: [1.5, 1.34, -0.3], tilt: -0.07, fase: 1.9 },
  { pos: [-1.5, -1.34, -0.3], tilt: -0.05, fase: 3.4 },
  { pos: [1.5, -1.34, -0.3], tilt: 0.05, fase: 5.1 },
];

const ITEM_MAX = { w: 1.02, h: 0.82 };
/** Quanto o objeto cresce sob o cursor. */
const ITEM_HOVER = 1.16;
/** Amplitudes do flutuar: sobe e desce, vira de leve, inclina de leve. */
const FLOAT = { sobe: 0.085, vira: 0.26, inclina: 0.07 };

/**
 * Um dos quatro objetos.
 *
 * A escala é interpolada quadro a quadro em vez de sair de uma transição CSS —
 * dentro do canvas não existe CSS, e o amortecimento exponencial chega ao mesmo
 * lugar em qualquer taxa de quadros. Quem pediu menos movimento recebe o
 * tamanho final na hora, sem o caminho.
 *
 * A opacidade vem do mesmo contador de travessia da placa: quando o marco
 * muda, os objetos do marco que sai se apagam no compasso da placa que sai.
 */
function ItemCard({
  texture,
  spot,
  fade,
  outgoing,
  reduced,
}: {
  texture: Texture;
  spot: (typeof ITEM_SPOTS)[number];
  fade: { current: number };
  outgoing?: boolean;
  reduced: boolean;
}) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const [hot, setHot] = useState(false);
  const size = useMemo(
    () => planeSize(texture, ITEM_MAX.w, ITEM_MAX.h),
    [texture],
  );

  /* O cursor é do documento, não do mesh: sair da página com ele em "pointer"
     deixaria a mão pendurada na tela. */
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  useFrame((state, delta) => {
    const target = hot && !outgoing ? ITEM_HOVER : 1;

    if (mesh.current) {
      const now = mesh.current.scale.x;
      const step = reduced ? 1 : 1 - Math.exp(-10 * Math.min(delta, 0.05));
      mesh.current.scale.setScalar(now + (target - now) * step);

      /* Solto no ar: sobe e desce devagar, vira um pouco para cada lado e
         inclina junto. São três senos de períodos diferentes — o objeto nunca
         repete exatamente a mesma pose, que é o que tira a cara de laço. O giro
         fica curto de propósito: o plano é de uma face só, e virar demais o
         mostraria de perfil, como uma lasca. */
      if (!reduced) {
        const t = state.clock.elapsedTime + spot.fase;
        mesh.current.position.y = spot.pos[1] + Math.sin(t * 0.62) * FLOAT.sobe;
        mesh.current.rotation.y = Math.sin(t * 0.47) * FLOAT.vira;
        mesh.current.rotation.z = spot.tilt + Math.sin(t * 0.33) * FLOAT.inclina;
      }
    }

    if (material.current) {
      material.current.opacity =
        (outgoing ? 1 - fade.current : fade.current) * (hot && !outgoing ? 1 : 0.9);
    }
  });

  return (
    <mesh
      ref={mesh}
      position={spot.pos}
      rotation={[0, 0, spot.tilt]}
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
      <planeGeometry args={size} />
      <meshBasicMaterial
        ref={material}
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
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
  items,
  spin,
  reduced,
}: {
  accent: string;
  art: { prev: Texture | null; curr: Texture | null };
  items: { prev: Texture | null; curr: Texture | null };
  reduced: boolean;
  spin: boolean;
}) {
  const group = useRef<Group>(null);
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

    fade.current = Math.min(1, fade.current + delta / CROSSFADE_S);
    if (front.current) front.current.opacity = fade.current;
    if (back.current) back.current.opacity = 1 - fade.current;
  });

  const hasArt = Boolean(art.curr ?? art.prev);

  return (
    <group ref={group}>
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

      {/* Os quatro objetos do marco, atrás da placa e em cada canto. Os do
          marco que sai continuam em cena até a travessia terminar. */}
      {items.prev &&
        ITEM_SPOTS.map((spot, index) => (
          <ItemCard
            key={`sai-${index}`}
            texture={items.prev!}
            spot={spot}
            fade={fade}
            outgoing
            reduced={reduced}
          />
        ))}

      {items.curr &&
        ITEM_SPOTS.map((spot, index) => (
          <ItemCard
            key={`entra-${index}`}
            texture={items.curr!}
            spot={spot}
            fade={fade}
            reduced={reduced}
          />
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
 * e montado só quando a seção se aproxima.
 */
export default function AwardPlaque3D({
  accent,
  image,
  item,
  visible = true,
}: {
  accent: string;
  image?: string;
  /** Foto do item fisico do marco, repetida nos quatro cantos. */
  item?: string;
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
  const items = useArtPair(item || undefined);

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 6.4], fov: 38 }}
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
        items={items}
        spin={!reduced}
        reduced={!!reduced}
      />
    </Canvas>
  );
}

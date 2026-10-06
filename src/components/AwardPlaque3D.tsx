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
/** Proporção do plano onde a arte é aplicada. */
const PLANE_RATIO = PLAQUE.w / PLAQUE.h;
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
 * Enquadra como `object-fit: cover` — a arte preenche a placa e o excedente é
 * cortado, em vez de esticar. Sem isso, uma foto em paisagem (1200×896) num
 * plano em retrato sai achatada.
 */
function fitCover(texture: Texture) {
  const image = texture.image as { width: number; height: number } | undefined;
  if (!image?.width || !image?.height) return texture;

  const ratio = image.width / image.height;
  if (ratio > PLANE_RATIO) {
    const scale = PLANE_RATIO / ratio;
    texture.repeat.set(scale, 1);
    texture.offset.set((1 - scale) / 2, 0);
  } else {
    const scale = ratio / PLANE_RATIO;
    texture.repeat.set(1, scale);
    texture.offset.set(0, (1 - scale) / 2);
  }

  texture.needsUpdate = true;
  return texture;
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
        fitCover(texture);
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
    if (!src) return;

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
 * Placa com a arte aplicada na face.
 *
 * O bloco é acrílico translúcido e a arte entra como textura num plano logo à
 * frente — assim a imagem fica nítida e o vidro continua lendo como vidro. O
 * plano recorta a arte no formato da placa, que é o que a faz assentar no
 * preto da página em vez de parecer uma foto colada.
 */
function Plaque({
  accent,
  art,
  spin,
}: {
  accent: string;
  art: { prev: Texture | null; curr: Texture | null };
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
      <RoundedBox args={[PLAQUE.w, PLAQUE.h, PLAQUE.d]} radius={0.1} smoothness={6}>
        {/* Com a arte na frente, o acrílico quase não transmite: o material
            transmissivo compõe num passo próprio e, com valor alto, passa por
            cima da textura e lava as cores da placa. */}
        <meshPhysicalMaterial
          transmission={hasArt ? 0.18 : 0.94}
          thickness={1.1}
          roughness={0.12}
          ior={1.46}
          clearcoat={1}
          clearcoatRoughness={0.06}
          attenuationColor={accent}
          attenuationDistance={2.4}
          color={hasArt ? "#0b0b0f" : "#ffffff"}
        />
      </RoundedBox>

      {/* A placa que sai, um fio atrás da que entra */}
      {art.prev && (
        <mesh position={[0, 0, PLAQUE.d / 2 + 0.01]}>
          <planeGeometry args={[PLAQUE.w * 0.9, PLAQUE.h * 0.9]} />
          <meshBasicMaterial
            ref={back}
            map={art.prev}
            transparent
            toneMapped={false}
          />
        </mesh>
      )}

      {art.curr && (
        <mesh position={[0, 0, PLAQUE.d / 2 + 0.012]}>
          <planeGeometry args={[PLAQUE.w * 0.9, PLAQUE.h * 0.9]} />
          <meshBasicMaterial
            ref={front}
            map={art.curr}
            transparent
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
  );
}

/**
 * Canvas da placa. Importado por `next/dynamic` com `ssr: false` no carrossel,
 * e montado só quando a seção se aproxima.
 */
export default function AwardPlaque3D({
  accent,
  image,
  visible = true,
}: {
  accent: string;
  image?: string;
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

      <Plaque accent={accent} art={art} spin={!reduced} />
    </Canvas>
  );
}

"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, RoundedBox, useTexture } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import type { Group, Texture } from "three";

const PLAQUE = { w: 2.2, h: 2.9, d: 0.34 };

/**
 * Confirma que a arte existe antes de entregá-la ao three.
 *
 * Sem isso, um arquivo ausente faz o `useTexture` lançar dentro do canvas e
 * sujar o console. Aqui o caminho só é usado depois que a imagem carregou de
 * fato; enquanto não carrega — ou se nunca carregar — a placa fica no relevo.
 */
function useReadyImage(src?: string) {
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;

    let alive = true;
    const probe = new window.Image();
    probe.onload = () => {
      if (alive) setLoaded(src);
    };
    probe.src = src;

    return () => {
      alive = false;
    };
  }, [src]);

  return loaded === src ? src : undefined;
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
  texture,
  spin,
}: {
  accent: string;
  texture: Texture | null;
  spin: boolean;
}) {
  const group = useRef<Group>(null);

  useFrame((state) => {
    if (!group.current) return;

    // Vaivém de ±35° em vez de giro completo: a face com a arte fica sempre
    // voltada para quem olha. Num giro de 360° a placa passa boa parte do
    // tempo de perfil, aparecendo como uma lasca.
    const sway = spin ? Math.sin(state.clock.elapsedTime * 0.45) * 0.62 : 0;
    group.current.rotation.y = sway + state.pointer.x * 0.35;
    group.current.rotation.x = -state.pointer.y * 0.18;
  });

  return (
    <group ref={group}>
      <RoundedBox args={[PLAQUE.w, PLAQUE.h, PLAQUE.d]} radius={0.1} smoothness={6}>
        {/* Com a arte na frente, o acrílico quase não transmite: o material
            transmissivo compõe num passo próprio e, com valor alto, passa por
            cima da textura e lava as cores da placa. */}
        <meshPhysicalMaterial
          transmission={texture ? 0.18 : 0.94}
          thickness={1.1}
          roughness={0.12}
          ior={1.46}
          clearcoat={1}
          clearcoatRoughness={0.06}
          attenuationColor={accent}
          attenuationDistance={2.4}
          color={texture ? "#0b0b0f" : "#ffffff"}
        />
      </RoundedBox>

      {texture ? (
        // Arte da placa, encostada na face frontal do bloco
        <mesh position={[0, 0, PLAQUE.d / 2 + 0.012]}>
          <planeGeometry args={[PLAQUE.w * 0.9, PLAQUE.h * 0.9]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} />
        </mesh>
      ) : (
        // Sem a arte, os anéis da marca em relevo seguram a face.
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
        ))
      )}

      {/* Base escura, para a placa parecer apoiada */}
      <mesh position={[0, -1.72, 0]}>
        <cylinderGeometry args={[1.15, 1.3, 0.3, 48]} />
        <meshStandardMaterial color="#0a0a0d" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Proporção do plano onde a arte é aplicada. */
const PLANE_RATIO = PLAQUE.w / PLAQUE.h;

function TexturedPlaque({
  accent,
  src,
  spin,
}: {
  accent: string;
  src: string;
  spin: boolean;
}) {
  // `useTexture` do drei já aplica o color space correto, sem mutar o retorno
  // do hook — que é o que o lint, com razão, não permite.
  const texture = useTexture(src);

  // Enquadra como `object-fit: cover`: a arte preenche a placa e o excedente é
  // cortado, em vez de esticar. Sem isso, uma foto em paisagem (1200×896) num
  // plano em retrato sai achatada. O clone existe porque mexer em `repeat` e
  // `offset` é mutação — no original, viria do hook.
  const fitted = useMemo(() => {
    const copy = texture.clone();
    const image = texture.image as { width: number; height: number } | undefined;
    if (!image?.width || !image?.height) return copy;

    const imageRatio = image.width / image.height;
    if (imageRatio > PLANE_RATIO) {
      const scale = PLANE_RATIO / imageRatio;
      copy.repeat.set(scale, 1);
      copy.offset.set((1 - scale) / 2, 0);
    } else {
      const scale = imageRatio / PLANE_RATIO;
      copy.repeat.set(1, scale);
      copy.offset.set(0, (1 - scale) / 2);
    }

    copy.needsUpdate = true;
    return copy;
  }, [texture]);

  return <Plaque accent={accent} texture={fitted} spin={spin} />;
}

/**
 * Canvas da placa. Importado por `next/dynamic` com `ssr: false` no carrossel,
 * e montado só quando a seção se aproxima.
 */
export default function AwardPlaque3D({
  accent,
  image,
}: {
  accent: string;
  image?: string;
}) {
  const reduced = useReducedMotion();
  // `dpr` limitado: em telas retina o custo de preencher o canvas com um
  // material transmissivo cresce rápido.
  const dpr = useMemo<[number, number]>(() => [1, 1.5], []);
  const ready = useReadyImage(image);

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 6.4], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <directionalLight position={[-5, -2, -4]} intensity={0.9} color={accent} />
      <Environment preset="city" />

      {ready ? (
        <Suspense fallback={<Plaque accent={accent} texture={null} spin={!reduced} />}>
          <TexturedPlaque accent={accent} src={ready} spin={!reduced} />
        </Suspense>
      ) : (
        <Plaque accent={accent} texture={null} spin={!reduced} />
      )}
    </Canvas>
  );
}

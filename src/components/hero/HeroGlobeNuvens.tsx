"use client";

/**
 * AS NUVENS DO PLANETA, NUM ARQUIVO SÓ DELAS.
 *
 * Não é organização: é PESO. O gerador de ruído, os dois shaders e a esfera
 * somam ~1,6 kB gzip, e o celular — que roda a versão leve do globo e nunca
 * monta nuvem nenhuma — baixaria todos eles junto com o chunk do planeta.
 * Num import tardio (ver HeroGlobe3D) o módulo só é pedido no desktop, e o
 * que sobra no chunk compartilhado é exatamente o que o celular usa.
 *
 * Ela registra o próprio useFrame, que roda dentro do mesmo advance() do laço
 * do 2D como todos os outros: nenhum relógio novo, nenhum invalidate.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  DataTexture,
  LinearFilter,
  type Mesh,
  RepeatWrapping,
  RGBAFormat,
  type ShaderMaterial,
  Vector3,
} from "three";

import { cena, GAMA_SRGB, PAIS_NUCLEO } from "./cena";
import { solXYZ } from "./globeMath";
/* --------------------------------------------------------------------------
   AS NUVENS (pedido do dono, 17/10: mais criatividade)

   Uma segunda esfera 0,8% maior que a terra, com ruído procedural, alfa de
   6 a 9%, derivando devagar e SÓ no hemisfério iluminado.

   TEM DE LER COMO VÉU DE ATMOSFERA, NUNCA COMO MANCHA — é a regra do
   pedido, e ela decide dois números: o alfa fica abaixo de 0,09 e a
   frequência fica ALTA (quatro oitavas sobre um retângulo repetido três
   vezes). Mancha é pouca frequência com muito alfa; véu é muita frequência
   com pouco alfa. Quando alguma coisa aqui ler errado, o botão é o alfa.

   256 PIXELS E NÃO 512. O pedido dizia 512², e 512² custa 262 mil amostras
   de quatro oitavas no fio principal, no instante exato em que o canvas 3D
   nasce — medido abaixo de 6 ms a 256 e quatro vezes isso a 512. Com a
   repetição de 3 sobre um disco de 634 px, cada texel de 256 cobre 0,8 px de
   tela: a textura já está acima da resolução que o olho recebe, e os 20 ms
   extras comprariam um detalhe que não chega a existir.
   -------------------------------------------------------------------------- */
const RAIO_NUVEM = 1.008;
const NUVEM_LADO = 256;
const NUVEM_REPETE = 3;
const NUVEM_ALFA = 0.085;
/** Graus por segundo, em sentido contrário ao do sol (que faz 2,4°/s). */
const NUVEM_DERIVA = 0.2;

/**
 * Ruído de valor em quatro oitavas, numa textura que se repete nos dois
 * eixos. A rede de cada oitava é gerada com um gerador DETERMINÍSTICO (o
 * mesmo embaralhamento inteiro da cidade de São Paulo): as nuvens têm de
 * nascer idênticas em toda aba, senão o planeta muda de cara a cada visita
 * e ninguém consegue dizer se é defeito ou desenho.
 */
function texturaNuvem() {
  const lado = NUVEM_LADO;
  const dados = new Uint8Array(lado * lado * 4);
  const campo = new Float32Array(lado * lado);

  const sorteio = (semente: number) => {
    let x = Math.imul(semente ^ 0x9e3779b9, 0x85ebca6b);
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  };
  const suave = (t: number) => t * t * (3 - 2 * t);

  const oitavas: [number, number][] = [
    [4, 0.5],
    [8, 0.26],
    [16, 0.15],
    [32, 0.09],
  ];
  let semente = 1;
  for (const [n, peso] of oitavas) {
    /* A rede da oitava, com a borda REPETIDA: é o que faz a textura emendar
       em si mesma e o RepeatWrapping não desenhar uma costura. */
    const rede = new Float32Array(n * n);
    for (let i = 0; i < n * n; i += 1) rede[i] = sorteio(semente++ * 7919);
    const escala = n / lado;
    for (let y = 0; y < lado; y += 1) {
      const fy = y * escala;
      const y0 = Math.floor(fy);
      const ty = suave(fy - y0);
      const ya = (y0 % n) * n;
      const yb = ((y0 + 1) % n) * n;
      for (let x = 0; x < lado; x += 1) {
        const fx = x * escala;
        const x0 = Math.floor(fx);
        const tx = suave(fx - x0);
        const xa = x0 % n;
        const xb = (x0 + 1) % n;
        const a = rede[ya + xa] + (rede[ya + xb] - rede[ya + xa]) * tx;
        const b = rede[yb + xa] + (rede[yb + xb] - rede[yb + xa]) * tx;
        campo[y * lado + x] += (a + (b - a) * ty) * peso;
      }
    }
  }

  for (let i = 0; i < lado * lado; i += 1) {
    /* O CORTE É O QUE FAZ NUVEM EM VEZ DE NEBLINA: sem ele o ruído cobre a
       esfera inteira por igual e o planeta ganha um véu uniforme, que é só
       uma perda de contraste. Com o corte em 0,52 sobra pouco mais de um
       terço da superfície coberta, em ilhas — que é o que o olho chama de
       nuvem. */
    const v = Math.max(0, (campo[i] - 0.52) / 0.48);
    const c = Math.round(Math.min(1, v * v * (3 - 2 * Math.min(1, v))) * 255);
    const o = i * 4;
    dados[o] = 255;
    dados[o + 1] = 255;
    dados[o + 2] = 255;
    dados[o + 3] = c;
  }

  const t = new DataTexture(dados, lado, lado, RGBAFormat);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

const nuvemVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vLocal;
  varying float vZ;
  void main() {
    vUv = uv;
    vLocal = normalize(position);
    /* z em espaco de CAMERA: o cosseno do angulo ao centro do disco, o
       mesmo que os pontos de terra usam para o volume. */
    vZ = (modelViewMatrix * vec4(position, 0.0)).z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nuvemFrag = /* glsl */ `
  uniform sampler2D uMapa;
  uniform vec3 uCor;
  uniform vec3 uSol;
  uniform float uDeriva;
  uniform float uAlfa;
  uniform float uVela;
  uniform float uGamaAlfa;
  varying vec2 vUv;
  varying vec3 vLocal;
  varying float vZ;
  void main() {
    float n = texture2D(uMapa, vUv * 3.0 + vec2(uDeriva, 0.0)).a;

    /* SO NO HEMISFERIO ILUMINADO, e pelo mesmo produto escalar do
       terminador dos pontos de terra: uma nuvem no lado da noite seria uma
       mancha cinza sobre o unico lugar do planeta que esta escuro. */
    float sol = smoothstep(-0.05, 0.40, dot(vLocal, uSol));

    /* E ELA SOME ANTES DO LIMBO. A esfera das nuvens e 0,8% maior que a
       terra, entao na silhueta ela sobra para fora dos pontos: sem esta
       queda, o planeta ganharia um aro claro de meio pixel exatamente onde
       o halo do CSS ja esta. */
    float borda = smoothstep(0.0, 0.26, vZ);

    float a = n * sol * borda * uAlfa;
    a = pow(a * uVela, uGamaAlfa);
    if (a <= 0.002) discard;
    gl_FragColor = vec4(linearToOutputTexel(vec4(uCor, 1.0)).rgb, a);
  }
`;

export default function HeroGlobeNuvens({ composto }: { composto: boolean }) {
  const no = useRef<Mesh>(null);
  const solDir = useRef(new Vector3(1, 0.31, 0).normalize());
  const solCru = useRef<[number, number, number]>([1, 0, 0]);

  /* A textura e os uniformes nascem UMA vez, como a cena do planeta: refazer
     qualquer um dos dois por render zeraria o que o useFrame escreve. */
  const pecas = useMemo(() => {
    const textura = texturaNuvem();
    return {
      textura,
      uniforms: {
        uMapa: { value: textura },
        uCor: { value: new Color(PAIS_NUCLEO) },
        uSol: { value: new Vector3(1, 0.31, 0).normalize() },
        uDeriva: { value: 0 },
        uAlfa: { value: NUVEM_ALFA },
        uVela: { value: 1 },
        uGamaAlfa: { value: 1 },
      },
    };
  }, []);

  useEffect(() => () => pecas.textura.dispose(), [pecas]);

  useFrame(() => {
    const q = cena();
    const m = no.current?.material as ShaderMaterial | undefined;
    if (!m) return;
    /* O MESMO sol dos pontos de terra, pela mesma função: duas direções de luz
       num planeta só é a definição de um quadro que não fecha. */
    solXYZ(q.tempo, solCru.current);
    const d = solDir.current;
    d.set(solCru.current[0], solCru.current[1], solCru.current[2]);
    m.uniforms.uSol.value = d;
    /* A deriva é em UV e no sentido CONTRÁRIO ao do sol, a 0,2°/s contra os
       2,4°/s dele: as nuvens andam, mas o terminador passa por cima delas. */
    m.uniforms.uDeriva.value = -q.tempo * (NUVEM_DERIVA / 360) * NUVEM_REPETE;
    /* O mesmo véu dos pontos de terra: no mergulho de São Paulo o planeta
       inteiro cede a vez, e a nuvem não pode ficar pairando sobre a cidade. */
    m.uniforms.uVela.value = q.sp.ativo ? q.sp.pontos : 1;
    m.uniforms.uGamaAlfa.value = composto ? GAMA_SRGB : 1;
  });

  return (
    <mesh ref={no} renderOrder={1}>
      <sphereGeometry args={[RAIO_NUVEM, 48, 32]} />
      <shaderMaterial
        vertexShader={nuvemVert}
        fragmentShader={nuvemFrag}
        uniforms={pecas.uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

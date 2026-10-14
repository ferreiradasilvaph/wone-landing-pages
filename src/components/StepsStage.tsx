"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useInView, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useContent } from "@/i18n";
import { Chip } from "@/components/Chip";
import { SegmentProgress } from "@/components/SegmentProgress";
import { StepIcon } from "@/components/StepIcons";

/** O three fica fora do bundle inicial e nunca roda no servidor. */
const StepStage3D = dynamic(() => import("@/components/StepStage3D"), { ssr: false });

const PASSOS = 4;

function limita(valor: number, minimo: number, maximo: number) {
  return valor < minimo ? minimo : valor > maximo ? maximo : valor;
}

/** Qual dos quatro passos está à vista, de 0 a 3. */
function indiceDoPasso(progresso: number) {
  return Math.min(Math.floor(limita(progresso, 0, 1) * PASSOS), PASSOS - 1);
}

/**
 * Quanto do passo à vista já passou, de 0 a 1 — a fração que preenche o
 * segmento ativo da barra.
 *
 * Sai do próprio progresso da rolagem, sem olhar o estado do índice ativo: uma
 * função que lesse `ativo` ficaria presa ao valor do render em que foi criada,
 * e a barra andaria um passo atrasada.
 */
function fracaoDoPasso(progresso: number) {
  const posicao = limita(progresso, 0, 1) * PASSOS;
  return limita(posicao - Math.min(Math.floor(posicao), PASSOS - 1), 0, 1);
}

/**
 * O palco dos quatro passos: uma cena 3D presa ao alto da tela e o "log" dos
 * passos rolando ao lado — o único momento da página acoplado à rolagem.
 *
 * Substituiu a linha do tempo provisória da E1: quatro canvas de 96px (quatro
 * contextos WebGL, um por passo) pendurados num fio vertical. Agora é
 * UM canvas com quatro grupos na mesma origem: a página toda, depois de rolada
 * de ponta a ponta, mantém dois contextos — este palco e a placa de Premiações.
 *
 * O que manda é a posição da rolagem dentro da lista (`useScroll` sobre o
 * `<ol>`), lida como MotionValue:
 *  - o índice ativo sai de `useMotionValueEvent` e só vira `setState` quando
 *    muda de passo (quatro re-renders na seção inteira, não um por quadro);
 *  - a fração do passo vai para a barra de segmentos como MotionValue;
 *  - a cena 3D recebe o MESMO MotionValue e o lê dentro do `useFrame`.
 *
 * O "presa ao alto" é `position: sticky` do CSS — nenhum `preventDefault` em
 * wheel ou touch, nenhum sequestro de rolagem.
 */
export function StepsStage() {
  const { howItWorks } = useContent();
  const passos = howItWorks.steps;

  const palco = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLOListElement>(null);

  const [ativo, setAtivo] = useState(0);
  /* `true` quando o canvas já desenhou o primeiro quadro: é o que apaga o
     ícone 2D que segurava a caixa, em vez de um `setTimeout` adivinhado. */
  const [pintado, setPintado] = useState(false);

  /* Regra 7: o three só monta quando a seção chega a 400px da viewport — e uma
     vez montado, fica (`once`), porque remontar o contexto é mais caro que
     mantê-lo parado. */
  const perto = useInView(palco, { once: true, margin: "400px" });
  /* Este não é `once`: o canvas vive em `frameloop="demand"` e, fora da tela,
     ninguém assina o progresso da rolagem — a seção pode estar rolando longe
     daqui sem custar um quadro. */
  const aVista = useInView(palco, { amount: 0.1 });

  const { scrollYProgress } = useScroll({
    target: log,
    /* O passo troca quando a sua linha cruza 60% da altura da tela: o texto
       está lido quando a cena muda, e não depois. */
    offset: ["start 60%", "end 60%"],
  });

  useMotionValueEvent(scrollYProgress, "change", (progresso) => {
    const indice = indiceDoPasso(progresso);
    // Devolver o mesmo valor é o que impede o re-render a cada quadro.
    setAtivo((atual) => (atual === indice ? atual : indice));
  });

  useEffect(() => {
    /* Recarregar a página no meio da seção (o navegador restaura a rolagem)
       deixava o palco no passo 01: o `useScroll` mede a posição num efeito de
       layout, antes de o assinante acima existir, e aquele primeiro valor não
       chegava a ninguém. Uma leitura na montagem resolve. */
    const sincroniza = () => {
      const indice = indiceDoPasso(scrollYProgress.get());
      setAtivo((atual) => (atual === indice ? atual : indice));
    };
    sincroniza();
  }, [scrollYProgress]);

  const fracao = useTransform(scrollYProgress, fracaoDoPasso);

  const passoAtivo = passos[ativo];
  const contador = howItWorks.stage.counter.replace("{n}", String(ativo + 1));
  const ultimo = ativo === PASSOS - 1;

  const barra = (
    <SegmentProgress
      count={PASSOS}
      active={ativo}
      progress={fracao}
      labelLeft={passoAtivo.title}
      labelRight={contador}
    />
  );

  return (
    /* Abaixo de `lg` isto é um bloco comum: a caixa é `sticky` dentro DELE, e é
       por isso que ela tem curso para andar enquanto os passos passam por baixo.
       Em `lg` vira a grade de 7 colunas — o palco em 4, o log em 3 — e a caixa
       passa a andar dentro da própria coluna, que tem a altura da linha. */
    <div ref={palco} className="lg:grid lg:grid-cols-7 lg:gap-x-8">
      <div className="sticky top-16 z-10 bg-ink-950 pb-5 lg:top-24 lg:col-span-4 lg:self-start lg:bg-transparent lg:pb-0">
        {/* `aspect-square` com largura conhecida: a caixa tem a altura final
            desde o primeiro byte de HTML, montar o canvas não mexe em nada
            (CLS 0). No celular ela ocupa 56vw com teto de 260px — o bastante
            para a cena se ler sem empurrar os passos para fora da tela. */}
        <div className="relative mx-auto aspect-square w-[56vw] max-w-[260px] overflow-hidden rounded-card bg-ink-850 lg:w-full lg:max-w-none">
          {/* O traço 2D do passo à vista segura a caixa no SSR e enquanto o
              three carrega: nunca uma caixa vazia. */}
          <div
            aria-hidden
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
              pintado ? "opacity-0" : "opacity-100"
            }`}
          >
            <span className="block h-40 w-40">
              <StepIcon name={passoAtivo.icon} />
            </span>
          </div>

          {perto ? (
            <StepStage3D
              progress={scrollYProgress}
              aVista={aVista}
              onPintado={() => setPintado(true)}
            />
          ) : null}

          {/* O chip tem fundo de 12% (é o tom do `Chip`, e sobre card parado
              ele mede 11,1:1). Aqui passa cena por trás dele: a pílula opaca
              atrás é o que mantém o contraste no instante em que o objeto
              cruza o canto — medido na travessia a 412 e a 1024. */}
          <span className="absolute top-3 right-3 z-10 inline-flex rounded-full bg-ink-900">
            <Chip tone={ultimo ? "ok" : "warn"}>
              {ultimo ? howItWorks.stage.states.confirmed : howItWorks.stage.states.waiting}
            </Chip>
          </span>
        </div>

        {/* Em `lg` a barra viaja com a caixa; no celular ela fecha a seção
            (abaixo da lista), onde não rouba altura da primeira tela. */}
        <div className="mt-4 hidden lg:block">{barra}</div>
      </div>

      <ol ref={log} className="lg:col-span-3">
        {passos.map((passo, indice) => {
          const atual = indice === ativo;
          return (
            <li
              key={passo.step}
              aria-current={atual ? "step" : undefined}
              /* A altura mínima é o que dá curso à rolagem: 36vh por passo em
                 desktop (≈1.300px de lista a 900 de altura). Ela só existe onde
                 existe a caixa presa ao lado (`lg`); abaixo disso o passo tem a
                 altura do seu texto, senão a seção passava de 2.000px no celular
                 para dizer quatro frases. */
              className="border-t border-line py-5 lg:min-h-[36vh] lg:pb-0"
            >
              <span className="tnum block text-[13px] text-faint">{passo.step}</span>
              <h3
                className={`t-h3 mt-3 transition-colors duration-300 ${
                  atual ? "text-cream" : "text-faint"
                }`}
              >
                {passo.title}
              </h3>
              <p
                className={`mt-2 max-w-[18rem] text-sm leading-[1.5] transition-colors duration-300 ${
                  atual ? "text-muted" : "text-faint"
                }`}
              >
                {passo.description}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 lg:hidden">{barra}</div>
    </div>
  );
}

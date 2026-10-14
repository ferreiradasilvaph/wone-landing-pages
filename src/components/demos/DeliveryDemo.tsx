"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { useContent, useLanguage } from "@/i18n";
import { Chip } from "../Chip";
import { CtaButton } from "../CtaButton";

/** Duração total da simulação — é o número que o título da demo promete. */
const TOTAL_S = 1.2;
/**
 * Em que segundo da corrida cada etapa acende. Não é mais o que o log mostra: o
 * carimbo ao lado de cada linha é a HORA (`step.at`, do dicionário), porque
 * imprimir "1,2 s" na quarta linha devolvia a promessa do título a 60px dela, e
 * a espec dá ao título o único lugar desse número.
 */
const STEP_AT = [0.2, 0.5, 0.8, 1.2];
/** Raio do anel do cronômetro, no sistema de coordenadas do SVG. */
const R = 44;

/**
 * Alvo de toque do botão `object`. A pílula tem 36px de altura e o portão pede
 * 44: o pseudo-elemento de 4px em cima e embaixo leva o alvo aos 44 sem mudar o
 * desenho e sem ocupar espaço no layout — a mesma solução do TextLink do hero,
 * do interruptor da ConfirmationDemo e dos controles do editor de fluxos.
 *
 * Mora aqui, repetido nas três demos que têm botão, porque `cta.ts` é kit e não
 * se toca nesta rodada. Vale subir para o `CTA_OBJECT` (uma linha) e apagar as
 * três cópias.
 */
const ALVO_44 =
  "relative before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']";

/**
 * O caminho do PIX até o convite, na forma do "log" da referência: uma coluna
 * estreita de carimbos de tempo à esquerda e o que aconteceu à direita, com as
 * etapas cumpridas em creme e as que faltam em apagado. O cronômetro fica ao
 * lado, e é ele que mede.
 *
 * O desenho anterior era uma linha do tempo com bolinhas numeradas, fio
 * vertical e um "check" entrando em cada passo — três coisas dizendo a mesma
 * coisa, e 180px mais alta. O log diz o mesmo com texto e ritmo: passo de 44px,
 * sem réguas entre as linhas (a referência também não as tem).
 *
 * O relógio das 03:14 saiu daqui: o subtítulo do painel já diz "um pagamento às
 * 03:14, com ninguém da equipe acordado", e o card repetia a mesma frase dentro
 * da demo. As chaves `clock` e `clockNote` saíram do dicionário junto.
 *
 * QUANDO ELA CORRE: uma vez só, quando o painel chega à metade da vista
 * (`useInView` com `amount: 0.5`, `once`), e depois só pelo botão. É o único
 * relógio automático da seção — as outras três demos esperam clique. Como o
 * tempo vem de `requestAnimationFrame`, com a aba escondida ela não anda: o
 * navegador não entrega quadro nenhum.
 *
 * Título e subtítulo não estão aqui: vivem no cabeçalho do painel, em
 * `Highlights`, igual para as quatro demos.
 */
export function DeliveryDemo() {
  const { highlights } = useContent();
  const { locale } = useLanguage();
  const demo = highlights.demos.delivery;
  const reduced = useReducedMotion();

  const root = useRef<HTMLDivElement>(null);
  const aVista = useInView(root, { amount: 0.5, once: true });

  const [elapsed, setElapsed] = useState(0);
  const [run, setRun] = useState(0);
  /* `run` também destrava a corrida: quem aperta o botão antes de a demo chegar
     à metade da vista (é possível, o painel é alto) vê a simulação do mesmo
     jeito. */
  const correndo = aVista || run > 0;

  useEffect(() => {
    if (!correndo) return;

    // Sem movimento, a simulação salta para o fim no primeiro quadro em vez de
    // correr. O valor precisa continuar vindo do estado: `useReducedMotion` é
    // `null` no servidor e `true` no cliente, e derivá-lo no corpo do
    // componente faria o texto do HTML divergir e quebraria a hidratação.
    const duration = reduced ? 1 : TOTAL_S * 1000;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setElapsed(progress * TOTAL_S);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, run, correndo]);

  const replay = useCallback(() => {
    setElapsed(0);
    setRun((value) => value + 1);
  }, []);

  const finished = elapsed >= TOTAL_S;
  /* Carimbo de tempo: vírgula em português, ponto em inglês — o separador
     acompanha o idioma como o da grade de spec ao lado. */
  const segundos = (value: number) =>
    `${value.toLocaleString(locale === "pt" ? "pt-BR" : "en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} s`;

  return (
    <div
      ref={root}
      className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
    >
      {/* O log. Sem réguas entre as linhas: o passo de 44px já separa, e quatro
          fios aqui dentro brigariam com a borda do painel. */}
      <ol className="min-w-0 flex-1">
        {demo.steps.map((step, index) => {
          const done = elapsed >= STEP_AT[index];

          return (
            <li
              key={step.label}
              className="grid min-h-11 grid-cols-[60px_minmax(0,1fr)] items-center gap-x-3"
            >
              {/* Carimbo: a hora em que o evento entrou no log, como num log de
                  verdade — três linhas no mesmo segundo e a quarta no seguinte,
                  que é a prova de velocidade sem repetir o "1,2 s" do título.
                  Número para gente ler, então Geist com `tnum`: a mono do site
                  vive só dentro de `<code>`. */}
              <span
                className={`tnum text-[13px] font-medium transition-colors duration-300 ${
                  done ? "text-cream" : "text-faint"
                }`}
              >
                {step.at}
              </span>
              <span className="min-w-0 leading-tight">
                <span
                  className={`block text-[13px] font-semibold transition-colors duration-300 ${
                    done ? "text-cream" : "text-faint"
                  }`}
                >
                  {step.label}
                </span>
                <span
                  className={`mt-0.5 block text-[13px] transition-colors duration-300 ${
                    done ? "text-muted" : "text-faint"
                  }`}
                >
                  {step.detail}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {/* Cronômetro à direita. No celular ele deita ao lado do estado e do
          botão em vez de empilhar: são ~110px a menos de altura numa seção que
          precisava encolher. */}
      <div className="flex items-center gap-4 sm:w-[11rem] sm:shrink-0 sm:flex-col sm:gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center sm:h-28 sm:w-28">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke="var(--cream)"
              strokeOpacity="0.1"
              strokeWidth="5"
            />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke="var(--brand)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * R}
              strokeDashoffset={2 * Math.PI * R * (1 - elapsed / TOTAL_S)}
            />
          </svg>
          <span className="tnum relative text-[1.5rem] leading-none font-semibold text-cream">
            {segundos(elapsed)}
          </span>
        </div>

        {/* Estado e ação, na coluna estreita. A caixa do chip tem altura fixa
            para a linha não aparecer do nada e empurrar o botão (CLS 0): ela
            existe desde o primeiro quadro, vazia. */}
        <div className="min-w-0 flex-1 sm:w-full">
          <div className="flex h-7 items-center">
            {finished ? <Chip tone="ok">{demo.done}</Chip> : null}
          </div>

          {/* Botão de produto dentro da demo: o `object` do CtaButton, a mesma
              pílula dos outros ("Pagar com PIX", "Rodar"), nunca um terceiro
              formato inventado aqui. */}
          <CtaButton size="object" onClick={replay} className={`mt-3 w-full ${ALVO_44}`}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {demo.replay}
          </CtaButton>
        </div>
      </div>
    </div>
  );
}

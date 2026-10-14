"use client";

import { useEffect, useRef, useState } from "react";
import { useOnScreen } from "@/lib/useOnScreen";
import { MousePointerClick, Bot, QrCode, CheckCircle2, Target } from "lucide-react";
import { useContent } from "@/i18n";
import { Chip } from "./Chip";

const STEP_ICONS = [MousePointerClick, Bot, QrCode, CheckCircle2, Target];
const STEP_MS = 900;

/**
 * Caminho do dado, do clique no anúncio até o pixel de volta.
 *
 * Os nós acendem em sequência quando o bloco entra na tela, e o traço entre eles
 * se preenche junto — a ideia é o lead *ver* que o rastreio é uma cadeia, não
 * uma lista de logos. É a ÚNICA animação desta seção, e corre uma vez só: o
 * `once: true` do `useOnScreen` não rearma quando a página volta a passar por
 * aqui.
 *
 * O traço era um `motion.span` e virou transição CSS de `height`, como os
 * círculos e os rótulos ao lado, que já eram `transition-colors`. Era o único
 * `import` de `motion/react` nesta seção, e com ele saindo daqui e dos outros
 * doze componentes renderizados no servidor o pacote do motion (42,2 kB
 * transferidos) deixa de entrar no grafo dos 8 scripts baixados antes da
 * primeira pintura — medido em 14/10: FCP −0,42 s, LCP −0,21 s (E-f1).
 *
 * Os detalhes deixaram de ser frase corrida onde já eram outra coisa: os quatro
 * destinos do primeiro nó viraram etiquetas (é uma lista, e lista de nome é
 * chip), e o parâmetro de UTM e o comando do bot viraram `<code>` — valor de
 * máquina é mono, e mono no site existe só dentro de `<code>` (regra 2).
 */
export function TrackingFlow() {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useOnScreen(ref, { once: true, amount: 0.4 });
  const [reduced, setReduced] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const { payments } = useContent();
  const steps = payments.tracking.flow;

  const [animated, setAnimated] = useState(0);

  /* `useReducedMotion` do motion devolve o valor certo já no primeiro render do
     cliente e `false` no do servidor — o que faria este bloco nascer diferente
     dos dois lados. O listener começa igual nos dois e só muda depois da
     montagem (regra 6). */
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /* Aba em segundo plano não gasta a sequência escondida: o relógio para e
     retoma de onde estava quando a aba volta (portão: 0 relógios com a aba
     oculta). */
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === "hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* Um passo por vez, com `setTimeout` reagendado a cada nó em vez de um
     `setInterval` que corre até o fim: assim a condição de parada é a mesma
     linha que decide se o relógio existe, e a aba que vai para segundo plano no
     meio da sequência retoma do nó onde parou, sem relógio aberto enquanto
     esteve escondida. Acesa até o último nó, nenhum relógio é reaberto. */
  useEffect(() => {
    if (!inView || reduced || tabHidden || animated >= steps.length) return;

    const id = window.setTimeout(() => setAnimated((atual) => atual + 1), STEP_MS);
    return () => window.clearTimeout(id);
  }, [inView, reduced, tabHidden, animated, steps.length]);

  // Sem movimento, todos já aparecem acesos — derivado, não via setState num
  // efeito, que dispararia renderização em cascata.
  const lit = reduced && inView ? steps.length : animated;

  return (
    <ol ref={ref} className="relative space-y-1">
      {steps.map((step, index) => {
        const Icon = STEP_ICONS[index] ?? Target;
        const active = index < lit;
        const isLast = index === steps.length - 1;

        return (
          /* `pb-3` e o nó de 32px: cinco nós com chip e `<code>` somavam 341px
             nesta coluna, e era ela que mandava na altura do bloco 2 de
             Pagamentos (medido a 1440). O que encolheu é o respiro e o círculo
             decorativo — nenhum texto desceu de 13px. */
          <li key={step.label} className="relative flex gap-4 pb-3 last:pb-0">
            {/* Trilho entre os nós */}
            {!isLast && (
              <span
                aria-hidden
                className="absolute top-8 left-[0.9375rem] h-[calc(100%-1.5rem)] w-px bg-line"
              >
                <span
                  className="block w-px bg-brand transition-[height] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ height: active ? "100%" : 0 }}
                />
              </span>
            )}

            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${
                active ? "bg-brand text-ink-950" : "bg-ink-800 text-faint"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>

            <div className="min-w-0 pt-1.5">
              <p
                className={`text-sm font-semibold transition-colors duration-500 ${
                  active ? "text-cream" : "text-muted"
                }`}
              >
                {step.label}
              </p>

              {step.detail ? <p className="mt-0.5 text-[13px] text-faint">{step.detail}</p> : null}

              {step.chips.length || step.code ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {step.chips.map((chip) => (
                    <Chip key={chip}>{chip}</Chip>
                  ))}
                  {step.code ? <code>{step.code}</code> : null}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

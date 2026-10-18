"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useOnScreen } from "@/lib/useOnScreen";
import { MousePointerClick, Bot, QrCode, CheckCircle2, Target } from "lucide-react";
import { useContent } from "@/i18n";
import { Chip } from "./Chip";

const STEP_ICONS = [MousePointerClick, Bot, QrCode, CheckCircle2, Target];
const STEP_MS = 900;

/* O CENTRO DO NÓ, em px: metade dos 32px do círculo. O nó é o primeiro filho em
   FLUXO do `<li>` (o trilho é absoluto) e o `<li>` não tem respiro em cima,
   então o centro do primeiro nó cai exactamente em 16 — é o que permite à
   bolinha NASCER no nó 01 sem medir nada, e a primeira medida não virar perna. */
const NO_CENTRO = 16;

/**
 * Caminho do dado, do clique no anúncio até o pixel de volta.
 *
 * Os nós acendem em sequência quando o bloco entra na tela, e o traço entre eles
 * se preenche junto — a ideia é o lead *ver* que o rastreio é uma cadeia, não
 * uma lista de logos. Corre uma vez só: o `once: true` do `useOnScreen` não
 * rearma quando a página volta a passar por aqui.
 *
 * DESDE 18/10 (leva 2) há um VIAJANTE, e ele é a tese do bloco: "servidor a
 * servidor" é sobre o DADO que anda, não sobre a linha que cresce. Duas peças, o
 * MESMO relógio de 900ms que já existia — a bolinha da leva 1 descendo a coluna
 * de nó em nó, e o `utm_source` do passo 01 saindo de casa, pousando ao lado do
 * `/start` do passo 02 e voltando. Só de `lg` para cima e só com movimento
 * permitido; o porquê de cada medida está em `leva2.css`, no bloco "O RASTREIO".
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

  /* O PALCO DOS DOIS VIAJANTES. A `<ol>` continua sendo quem o observador mede e
     quem é `relative` para os `<li>`, mas `<ol>` só aceita `<li>` como filho — e
     a bolinha e o `utm_source` em trânsito são nós absolutos, não itens da
     lista. Então eles moram neste invólucro, que envolve a lista e tem a MESMA
     caixa dela: a `<ol>` não traz margem nem borda, e o `space-y-1` é margem
     ENTRE `<li>`, não em volta. Por isso as medidas relativas ao palco e os
     `offsetTop` relativos à `<ol>` são o mesmo número. */
  const palco = useRef<HTMLDivElement>(null);

  /* Os cinco nós redondos: é no centro deles que a bolinha pousa. */
  const nos = useRef<(HTMLSpanElement | null)[]>([]);
  /* A casa e o pouso do `utm_source`: o `<code>` do passo 01 e a vaga invisível
     que o espera no fim da fileira do passo 02. */
  const utmCasa = useRef<HTMLElement>(null);
  const utmPouso = useRef<HTMLElement>(null);

  /* `lg+` lido depois da montagem, pelo mesmo caminho do `reduced`, e é ele que
     decide se os viajantes são MONTADOS. Abaixo de 1024 esta coluna deixa de
     dividir a largura com as garantias, as fileiras de etiqueta quebram em outra
     ordem e uma medida feita ali daria uma perna errada — e o `utm_source` em
     trânsito é TEXTO, não um ponto decorativo que se pode esconder por CSS. */
  const [grande, setGrande] = useState(false);

  /* Onde a bolinha está, em px do alto da lista. Nasce no centro do primeiro nó
     (ver `NO_CENTRO`): o repouso de toda peça desta leva é o estado final, e o
     estado inicial desta é "parada no nó 01, à espera". */
  const [carroY, setCarroY] = useState(NO_CENTRO);

  /* Onde o `utm_source` em trânsito está: a posição da casa dele no palco
     (`left`/`top`, escritas uma vez) e o deslocamento até o pouso (`dx`/`dy`,
     que é o que a transição de 900ms anima). `null` = ainda não medido. */
  const [utm, setUtm] = useState<{
    left: number;
    top: number;
    dx: number;
    dy: number;
  } | null>(null);

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

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const sync = () => setGrande(query.matches);
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

  /* A condição dos dois viajantes, numa linha só: à vista, com movimento
     permitido e com a coluna na largura em que o percurso existe. */
  const anda = inView && !reduced && grande;

  /* ONDE A BOLINHA PÁRA: no centro do nó que acendeu por último, e no primeiro
     enquanto nada acendeu. A perna é a transição de 900ms LINEAR do CSS, que é o
     mesmo intervalo do relógio dos nós — é o que faz a chegada cair sempre num
     quadro em que um nó acende, e não 200ms antes ou depois. As cinco linhas têm
     alturas diferentes (a primeira tem quatro etiquetas), e é por isso que a
     conta é em pixels MEDIDOS e não em porcentagem.

     `offsetTop` basta, sem `getBoundingClientRect`: o `<li>` é `relative` dentro
     da `<ol>` e o nó é `relative` dentro do `<li>`, então os dois saltos somam a
     distância até o alto da lista. Medido só quando a sequência avança — nunca
     por quadro. */
  useEffect(() => {
    if (!anda) return;

    const no = nos.current[Math.max(0, lit - 1)];
    const li = no?.offsetParent as HTMLElement | null;
    if (!no || !li) return;

    setCarroY(li.offsetTop + no.offsetTop + NO_CENTRO);
  }, [anda, lit]);

  /* O `utm_source` SAI do passo 01 E POUSA no passo 02, que é a história literal
     do rastreio: "UTM e código de venda guardados" é o que o passo 02 diz, e o
     que ele guarda é aquilo. Três instantes, todos derivados do relógio que já
     existia — nenhum relógio novo:

      · `animated` 1 → 2: a perna 1 começa e o viajante recebe o deslocamento até
        o pouso (900ms lineares, o mesmo tempo da bolinha);
      · `animated` 2 → 3: a bolinha segue para o nó 3 e ele volta para casa;
      · antes disso, deslocamento zero — ele espera EM CIMA do original, no mesmo
        pixel e com o mesmo texto, então em repouso não há cópia visível.

     Duas medidas por instante (a casa e o pouso, relativas ao palco) e só quando
     `animated` muda. O original fica onde está: ele é o registro. */
  useEffect(() => {
    if (!anda) return;

    const base = palco.current;
    const casa = utmCasa.current;
    const pouso = utmPouso.current;
    if (!base || !casa || !pouso) return;

    const caixaBase = base.getBoundingClientRect();
    const caixaCasa = casa.getBoundingClientRect();
    const caixaAlvo = animated === 2 ? pouso.getBoundingClientRect() : caixaCasa;

    setUtm({
      left: caixaCasa.left - caixaBase.left,
      top: caixaCasa.top - caixaBase.top,
      dx: caixaAlvo.left - caixaCasa.left,
      dy: caixaAlvo.top - caixaCasa.top,
    });
  }, [anda, animated]);

  /* O texto do viajante e do pouso é o `code` do passo 01 — o mesmo nó do
     dicionário que o original mostra. Nada de literal no componente: o dia em
     que o parâmetro mudar de nome, muda num lugar só. */
  const utmTexto = steps[0]?.code;

  return (
    <div ref={palco} className="relative">
      {/* A BOLINHA DA LEVA 1 DESCENDO A COLUNA, no centro dos nós: `left-4` são
          os 16px do centro do círculo de 32, e a bolinha é um PONTO de caixa
          zero (as quatro cópias penduram nele por margem), então não há nada a
          descontar. `z-20` para passar por cima dos nós, que são `z-10`.

          A cauda aponta para CIMA (`--cy: -5px`): é de lá que ela veio — o mesmo
          contrato do log da Plataforma (`DeliveryDemo`).

          Ela FICA no último nó quando a sequência acaba: o repouso é o estado
          final, aqui como em todas as peças da leva. */}
      {anda ? (
        <span
          aria-hidden
          className="rastro-carro pointer-events-none absolute top-0 left-4 z-20 hidden lg:block"
          style={{ transform: `translateY(${carroY}px)` }}
        >
          <span className="bolinha" style={{ "--cx": "0px", "--cy": "-5px" } as CSSProperties}>
            <i />
            <i />
            <i />
            <i />
          </span>
        </span>
      ) : null}

      {/* O VIAJANTE: uma cópia do `utm_source` em cima do original, que anda até
          o pouso e volta. `left`/`top` vêm da medida; antes dela fica
          transparente, para não aparecer no canto do palco por um quadro. */}
      {anda && utmTexto ? (
        <code
          aria-hidden
          className="rastro-utm pointer-events-none absolute z-20"
          style={{
            left: utm ? utm.left : 0,
            top: utm ? utm.top : 0,
            transform: `translate(${utm?.dx ?? 0}px, ${utm?.dy ?? 0}px)`,
            opacity: utm ? 1 : 0,
          }}
        >
          {utmTexto}
        </code>
      ) : null}

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
                ref={(el) => {
                  nos.current[index] = el;
                }}
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
                    {step.code ? (
                      <code ref={index === 0 ? utmCasa : undefined}>{step.code}</code>
                    ) : null}

                    {/* O POUSO do `utm_source`: uma vaga invisível no FIM da
                        fileira do passo 02. Renderizada sempre, inclusive no
                        servidor e sem movimento — é ela que reserva o espaço desde
                        o primeiro quadro, e é por isso que a chegada do viajante
                        não move uma linha (CLS 0). `invisible` e não `hidden`:
                        precisa ocupar lugar e ter caixa para ser medida.

                        No fim da fila, e não no começo, porque um vão reservado
                        ANTES do `/start` seria um buraco visível para sempre;
                        depois dele, o espaço reservado é a margem direita, que já
                        era vazia. */}
                    {index === 1 && utmTexto ? (
                      <code aria-hidden ref={utmPouso} className="invisible">
                        {utmTexto}
                      </code>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

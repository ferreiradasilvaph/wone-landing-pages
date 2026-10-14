"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { useLanguage, type Locale } from "@/i18n";

const OPTIONS: { code: Locale; label: string }[] = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
];

/**
 * Alternador de idioma. A pílula ativa desliza entre as duas opções com
 * `layoutId`, o mesmo recurso usado no menu do header.
 *
 * A pílula é CREME, não laranja: no header ela fica encostada no botão laranja
 * do CTA, e dois laranjas vizinhos disputam a mesma atenção — o laranja da
 * página é da ação, não do estado de um controle.
 *
 * A pílula já ficou invisível por duas causas somadas, e as duas estão
 * corrigidas aqui — se uma voltar, o rótulo ativo some de novo:
 *
 * 1. Empilhamento (a causa que realmente apagava a pílula). A pílula era um
 *    `absolute inset-0 -z-10` dentro de um `<button class="relative">`. Um
 *    elemento só `relative`, com `z-index: auto` e `isolation: auto`, NÃO cria
 *    contexto de empilhamento: o `-z-10` então não é resolvido dentro do botão,
 *    e sim no contexto mais próximo que existe de verdade — o `<header>` fixo
 *    (`z-[70] transform-gpu`, e transform cria contexto) ou a raiz, no caso do
 *    rodapé. Resultado: a pílula era pintada ATRÁS do `bg-ink-800` do próprio
 *    grupo e nunca aparecia. O rótulo ativo ficava `text-ink-950` (#050506)
 *    sobre ink-800 (#15151c) — contraste medido 1,12:1, ou seja preto sobre
 *    preto, e a página lia como se EN estivesse sempre ativo. Com a pílula
 *    pintada o mesmo rótulo dá 18,4:1 sobre o creme.
 * 2. `layoutId` compartilhado (o que o comentário do commit b0c20d4 culpava —
 *    causa real, mas secundária). O toggle aparece no header e no rodapé; com
 *    o mesmo `layoutId` literal nas duas instâncias o motion trata as pílulas
 *    como um único elemento e uma "voa" para a outra, deixando um dos rótulos
 *    ativos preto sobre preto. Daí o `useId` por instância abaixo.
 *
 * A correção do empilhamento é dupla de propósito, porque cada metade cobre um
 * jeito diferente de a regressão voltar:
 * - `isolate` no botão (`isolation: isolate`) garante que ele seja um contexto
 *   de empilhamento próprio, sem depender de nenhum ancestral;
 * - o rótulo virou um `<span class="relative">`. A pílula já vinha antes dele
 *   no DOM, mas um nó de texto cru é conteúdo em fluxo, que o navegador pinta
 *   ANTES dos descendentes posicionados — era por isso que a pílula cobria o
 *   texto e alguém precisou do `-z-10` para empurrá-la. Posicionando o rótulo,
 *   os dois entram na mesma camada e a ordem de pintura passa a ser pílula →
 *   rótulo por ordem de documento, sem z-index nenhum. Essa metade continua
 *   valendo mesmo que alguém remova o `isolate` depois.
 * Descartado (sem medir no navegador, só pela ordem de pintura acima): trocar
 * o `-z-10` por `z-0` e parar aí. Tira a pílula de trás do grupo, mas mantém o
 * rótulo em fluxo, então a pílula volta a cobrir o texto — o rótulo some de
 * outra maneira. Ordem do DOM é mais barata de ler do que z-index calibrado
 * entre irmãos.
 */
export function LanguageToggle({
  label = "Idioma / Language",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const { locale, setLocale } = useLanguage();
  const pillId = useId();

  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex h-8 items-center rounded-full bg-ink-800 p-0.5 ${className}`}
    >
      {OPTIONS.map((option) => {
        const isActive = locale === option.code;
        return (
          <button
            key={option.code}
            type="button"
            onClick={() => setLocale(option.code)}
            aria-pressed={isActive}
            /* O estado é só tom: pílula + cor do rótulo, sem borda — borda aqui
               mexeria na altura do grupo a cada troca de idioma.
               O alvo de toque chega aos 44px em dois eixos separados, e por
               motivos diferentes: na ALTURA por pseudo-elemento, que estica o
               alvo sem engordar o grupo de 32px; na LARGURA por `min-w`, e não
               por pseudo-elemento, porque os dois botões são vizinhos colados —
               uma folga horizontal invisível de 8px cairia por cima do vizinho
               e, estando depois no DOM, o EN roubaria a borda direita do PT. */
            className={`relative isolate flex h-7 min-w-11 cursor-pointer items-center justify-center rounded-full px-2.5 text-[13px] font-semibold transition-colors before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] ${
              isActive ? "text-ink-950" : "text-muted hover:text-cream"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={`lang-pill-${pillId}`}
                className="absolute inset-0 rounded-full bg-cream"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useLanguage, type Locale } from "@/i18n";

const OPTIONS: { code: Locale; label: string }[] = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
];

/**
 * Alternador de idioma. A pílula ativa desliza entre as duas opções.
 *
 * A pílula é CREME, não laranja: no header ela fica encostada no botão laranja
 * do CTA, e dois laranjas vizinhos disputam a mesma atenção — o laranja da
 * página é da ação, não do estado de um controle.
 *
 * ELA SAIU DO MOTION. Era um `motion.span` com `layoutId` dentro do botão
 * ativo; agora é UM `<span>` absoluto no grupo, deslocado por
 * `transform: translateX()` com transição CSS. O motivo é de carregamento: este
 * componente está na primeira dobra (header) e no rodapé, e o import de
 * `motion/react` aqui era um dos treze que punham o pacote do motion entre os
 * scripts baixados antes da primeira pintura (medido em 14/10: FCP −0,42 s sem
 * ele). O desenho é o mesmo e o DOM ficou com um nó a menos.
 *
 * A troca resolveu de uma vez as duas causas históricas de a pílula ficar
 * invisível, e as duas valem a pena ficar registradas porque eram sutis:
 *
 * 1. Empilhamento. A pílula era um `absolute inset-0 -z-10` dentro de um
 *    `<button class="relative">`. Um elemento só `relative`, com `z-index:
 *    auto`, NÃO cria contexto de empilhamento: o `-z-10` era resolvido no
 *    contexto mais próximo que existe de verdade — o `<header>` fixo
 *    (`z-[70] transform-gpu`) ou a raiz, no rodapé —, e a pílula era pintada
 *    ATRÁS do `bg-ink-800` do próprio grupo. O rótulo ativo ficava
 *    `text-ink-950` sobre ink-800: contraste 1,12:1, preto sobre preto, e a
 *    página lia como se EN estivesse sempre ativo.
 * 2. `layoutId` compartilhado. O toggle aparece no header e no rodapé; com o
 *    mesmo `layoutId` literal nas duas instâncias o motion tratava as pílulas
 *    como um elemento só e uma "voava" para a outra.
 *
 * Agora a pílula é irmã dos botões e vem ANTES deles no DOM, dentro do mesmo
 * contexto: a ordem de pintura é pílula → rótulos por ordem de documento, sem
 * z-index nenhum. E, não havendo elemento compartilhado, não há `layoutId`
 * para colidir — o `useId` por instância deixou de ser necessário.
 *
 * A geometria é medida, não estimada: `p-0.5` (2px) + dois botões de `min-w-11`
 * (44px) = os 92px que o header reserva para este controle. Daí a pílula ter
 * `w-11` e o deslocamento ser `translateX(100%)` — exatamente a largura de um
 * botão. "PT" e "EN" têm 2 caracteres a 13px/600 (~19px de texto + 20px de
 * `px-2.5` = 39px), então é o `min-w` que manda nos dois, e os dois medem
 * igual: a pílula não tem como desalinhar.
 *
 * No PRIMEIRO render o idioma é sempre "pt" (`getServerSnapshot`), então a
 * pílula nasce em `translateX(0)` e a transição não dispara — nada anima na
 * entrada (regra 1).
 */
export function LanguageToggle({
  label = "Idioma / Language",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const { locale, setLocale } = useLanguage();
  const activeIndex = Math.max(
    0,
    OPTIONS.findIndex((option) => option.code === locale),
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={`relative inline-flex h-8 items-center rounded-full bg-ink-800 p-0.5 ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-0.5 left-0.5 h-7 w-11 rounded-full bg-cream transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />

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
            className={`relative flex h-7 min-w-11 cursor-pointer items-center justify-center rounded-full px-2.5 text-[13px] font-semibold transition-colors before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] ${
              isActive ? "text-ink-950" : "text-muted hover:text-cream"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

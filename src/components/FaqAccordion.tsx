"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useContent } from "@/i18n";

/**
 * Acordeão de perguntas, na forma de linha de tabela: régua entre as linhas e
 * nada em volta (a borda externa saiu — o bloco já é delimitado pela própria
 * coluna). Abre uma por vez e anima a altura, para a lista não "saltar" quando
 * o visitante troca de pergunta; a primeira nasce aberta.
 *
 * A pergunta aberta engrossa de 500 para 600 e fica creme: o laranja que ela
 * ganhava disputava com os links de ação da página, e cor em título é privilégio
 * do h1 e da tese. O "+" gira 45° e é o único sinal de estado.
 *
 * A ALTURA ANIMA EM CSS, não no motion. "De 0 a `auto`" não é uma transição que
 * o CSS saiba fazer com `height` — mas sabe fazer com `grid-template-rows`
 * entre `0fr` e `1fr`, que é a mesma coisa dita em grade: a trilha ocupa a
 * altura natural do conteúdo ou nenhuma, e o `overflow-hidden` do filho corta o
 * que sobra no caminho. Mesma duração (0,35 s), mesma curva, mesmo desenho.
 *
 * O motivo é de carregamento: o `import` de `motion/react` aqui era um dos
 * treze em componentes renderizados no servidor, e juntos punham o pacote dele
 * (42,2 kB transferidos / 126,6 kB crus) entre os 8 scripts que o navegador
 * baixa ANTES da primeira pintura — o Lighthouse, que simula 4G, cobra esse
 * download no FCP e no LCP do h1. Medido em 14/10: FCP −0,42 s, LCP −0,21 s,
 * +3 pontos (E-f1).
 *
 * A troca melhorou a acessibilidade de lambuja: o painel deixou de ser montado
 * e desmontado, então `aria-controls` aponta para um id que existe nas sete
 * perguntas, e não só na aberta. As respostas fechadas ficam `aria-hidden` —
 * altura zero esconde do olho, não do leitor de tela.
 */
export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { faq } = useContent();

  return (
    <div className="divide-y divide-line">
      {faq.items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `faq-panel-${index}`;

        return (
          <div key={item.question} className="group">
            <h3>
              {/* py-5 com a linha de 17px passa dos 44px de alvo de toque. */}
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full cursor-pointer items-center justify-between gap-5 py-5 text-left"
              >
                <span
                  className={`text-[17px] leading-snug text-cream ${
                    isOpen ? "font-semibold" : "font-medium"
                  }`}
                >
                  {item.question}
                </span>
                <span
                  aria-hidden
                  className={`flex h-8 w-8 shrink-0 items-center justify-center transition-[transform,color] duration-300 ${
                    isOpen ? "rotate-45 text-brand" : "text-faint group-hover:text-cream"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              aria-hidden={!isOpen}
              className="grid transition-[grid-template-rows,opacity] duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr", opacity: isOpen ? 1 : 0 }}
            >
              <div className="overflow-hidden">
                {/* Sem largura máxima própria: a medida da resposta é a da
                    coluna do acordeão, e o `pr-12` a alinha ao "+". */}
                <p className="pr-12 pb-6 text-[15px] leading-relaxed text-muted">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

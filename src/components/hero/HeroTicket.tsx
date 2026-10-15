import { forwardRef } from "react";
import { Check } from "lucide-react";

import { Chip } from "../Chip";
import { FlagMark } from "../FlagMark";
import type { Pais } from "./paises";

/**
 * O TICKET: o comprovante da venda do país da vez, no pé do palco.
 *
 * Entrou em 15/10 no lugar do telefone — pedido da diretoria do dono, que tirou
 * o aparelho do hero para o planeta ocupar metade da janela. O que o celular
 * dizia em três bolhas de chat (oferta → pagamento aprovado → convite) este
 * card diz em quatro linhas: aprovado, qual plano, quanto na moeda local e por
 * qual método, com a bandeira do país. É a MESMA venda, numa peça de 300×120 em
 * vez de uma de 300×620.
 *
 * Nada aqui é cunhado (regra 4): país, método, símbolo e ISO vêm de
 * `payments.table.countries`, o valor de `highlights.demos.checkout.prices`, o
 * nome do plano de `highlights.demos.checkout.product` e o "Pagamento aprovado"
 * de `phone.approved` — as mesmas chaves que a tabela de Pagamentos e o chat de
 * "Como funciona" usam.
 *
 * O `ref` não é enfeite: é por ele que o `HeroGlobe` acha o alvo do arco. O
 * arco sai do pino aceso e termina na borda deste card, e o card muda de lugar
 * entre o celular e o desktop — medir o nó é o que mantém o fio certo nos dois
 * sem repetir a geometria em dois lugares.
 *
 * A troca de país é um CROSSFADE de 320 ms (`.hero-ticket-in`, montado por
 * `key`), e só depois que o relógio começa a andar: na primeira tela o ticket
 * já nasce pintado pelo servidor, como todo o resto do hero.
 */
export const HeroTicket = forwardRef<
  HTMLDivElement,
  {
    country: Pais;
    /** Nome do plano — `highlights.demos.checkout.product`. */
    product: string;
    /** "Pagamento aprovado" — `phone.approved`. */
    approved: string;
    /** O valor na moeda local, sem símbolo. */
    price: string;
    /** O método que o país usa, escolhido em `paises.ts`. */
    method: string;
    /** `true` só depois de o relógio começar a andar e sem movimento reduzido. */
    animated: boolean;
  }
>(function HeroTicket(
  { country, product, approved, price, method, animated },
  ref,
) {
  return (
    <div
      ref={ref}
      /* `rounded-card` e ink-900 com régua de 1px: é a forma de card do site,
         um degrau acima do ink-950 da seção. Sem sombra e sem blur — o que o
         separa do planeta é o tom, como em toda a página (regra 8). */
      className="rounded-card w-full border border-line bg-ink-900/95 p-4 lg:w-[300px]"
    >
      <div key={country.code} className={animated ? "hero-ticket-in" : undefined}>
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15"
            >
              <Check className="h-3 w-3 text-emerald-400" strokeWidth={3} />
            </span>
            <span className="truncate text-[13px] font-medium text-cream">
              {approved}
            </span>
          </span>
          {/* A bandeira fecha a linha: é o que diz, sem palavra, de que país
              foi esta venda. O nome do país está na linha de status, abaixo do
              palco, e repeti-lo aqui gastaria a largura do valor. */}
          <FlagMark code={country.code} className="h-4 w-6" />
        </div>

        <p className="mt-2.5 text-[13px] leading-snug text-faint">{product}</p>

        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="text-[15px] font-semibold text-cream">
              {country.symbol}
            </span>
            <span className="tnum truncate text-xl font-semibold text-cream">
              {price}
            </span>
            {/* ISO da moeda: valor de máquina, logo `<code>`. */}
            <code>{country.code}</code>
          </span>
          <Chip tone="neutral" className="min-w-0 shrink-0">
            {method}
          </Chip>
        </div>
      </div>
    </div>
  );
});

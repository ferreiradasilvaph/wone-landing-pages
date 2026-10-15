import type { ReactNode } from "react";

/* Tom, nunca contorno: a borda de 1px que a referência usa existe porque o
   fundo dela é claro. Sobre preto, o fundo translúcido já separa. */
const TOM = {
  neutral: "bg-cream/6 text-muted",
  brand: "bg-brand/12 text-brand",
  ok: "bg-emerald-500/12 text-emerald-400",
  warn: "bg-amber-500/12 text-amber-400",
} as const;

export type ChipTone = keyof typeof TOM;

/**
 * Etiqueta curta: método de pagamento, estado de um objeto, nome de evento.
 *
 * `brand` é só para o método principal (o PIX) — mais de um laranja por bloco e
 * o destaque deixa de destacar. `ok` e `warn` são estados de produto e só
 * aparecem dentro de mockup ou demo, nunca em texto editorial da página.
 *
 * `shrink-0` não é zelo: o chip quase sempre é item de uma fila `flex`, e item
 * de flex encolhe por padrão. Sem ele, "Transferência CVU / CBU" — a etiqueta
 * mais longa da tabela de Pagamentos — tinha a pílula comprimida 10px abaixo do
 * próprio texto em QUALQUER largura, e as últimas letras ficavam para fora do
 * fundo arredondado (medido a 320 e a 768 em 15/10). Com ele a pílula mantém o
 * tamanho do que diz, e quem resolve a falta de espaço é o `flex-wrap` da fila,
 * que é o certo: a etiqueta desce de linha inteira em vez de encolher.
 *
 * `mono` põe o conteúdo em `<code>`, que é o único lugar onde a mono do sistema
 * aparece (regra 2). Dentro do chip ela herda cor e tamanho — ver `.chip code`
 * em globals.css.
 */
export function Chip({
  tone = "neutral",
  mono,
  className = "",
  children,
}: {
  tone?: ChipTone;
  mono?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`chip inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ${TOM[tone]}${
        className ? ` ${className}` : ""
      }`}
    >
      {tone === "ok" ? <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" /> : null}
      {mono ? <code>{children}</code> : children}
    </span>
  );
}

/**
 * A chamada para ação do site, numa peça só.
 *
 * Existe uma única família de forma para botão: a pílula laranja chapada do
 * `.btn-solid`. Antes cada lugar montava o seu — o do header era `rounded-full
 * px-5 py-2`, o do hero `rounded-xl px-6 py-3.5`, o da lista de espera `px-8
 * py-4 font-bold` — mesmo laranja, três formatos diferentes, e o designer
 * apontou isso duas vezes. Ficando aqui, não há como ajustar um e esquecer os
 * outros. Os três tamanhos abaixo mudam só o respiro: raio, peso e família são
 * os mesmos.
 *
 *  - `CTA` é o botão da página (hero, submit do formulário);
 *  - `CTA_BAR` é o mesmo botão em altura de barra, para o header;
 *  - `CTA_OBJECT` é o botão DENTRO de um mockup ou de uma demo ("Rodar",
 *    "Pagar com PIX", "Simular de novo"). Existe para que o botão de produto
 *    não divirja: antes ele era inventado em cada demo, em raio e altura
 *    próprios, e a página passava a ter dois sistemas de botão.
 *
 * A seta é ícone (`ArrowRight` do `CtaButton`), nunca um caractere "→" dentro
 * da string do rótulo: caractere não escala com o peso do texto, não respeita
 * `aria-hidden` e vira ruído em leitor de tela.
 *
 * Ação de menos peso NÃO é um segundo botão: é `TEXT_LINK`, o link de texto
 * laranja sublinhado, sem seta (decisão do dono em 14/10) — "Ver como
 * funciona", "Entrar na lista", "ou fale com a gente no Telegram".
 *
 * Nenhuma das constantes declara `display` — quem usa decide entre `inline-flex`
 * e `flex`, que é o que permite escondê-lo com `hidden` sem briga de utilitário.
 */
const BASE = "btn-solid items-center justify-center gap-2 rounded-full font-semibold";

export const CTA = `${BASE} px-6 py-3.5 text-[15px]`;
export const CTA_BAR = `${BASE} px-5 py-2.5 text-sm`;
export const CTA_OBJECT = `${BASE} h-9 px-4 text-[13px]`;

export const TEXT_LINK =
  "inline-flex items-center text-[15px] font-semibold text-brand underline decoration-1 decoration-brand/40 underline-offset-[6px] transition-colors hover:text-brand-soft";

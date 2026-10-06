/**
 * A chamada para ação do site, numa peça só.
 *
 * Existe um único botão no site, e ele é este. Antes cada lugar montava o seu:
 * o do header era `rounded-full px-5 py-2`, o do hero `rounded-xl px-6 py-3.5`,
 * o da lista de espera `px-8 py-4 font-bold` — mesmo laranja, três formatos
 * diferentes, e o designer apontou isso duas vezes. Ficando aqui, não há como
 * ajustar um e esquecer os outros.
 *
 * `CTA` é o tamanho padrão (hero, formulário, cartões de produto) e `CTA_BAR` é
 * o mesmo botão em altura de barra, para o cabeçalho. A única diferença entre os
 * dois é o respiro: raio, peso e família de texto são os mesmos.
 *
 * Nenhum dos dois declara `display` — quem usa decide entre `inline-flex` e
 * `flex`, que é o que permite escondê-lo com `hidden` sem briga de utilitário.
 */
const BASE = "btn-solid items-center justify-center gap-2 rounded-xl font-semibold";

export const CTA = `${BASE} px-6 py-3.5 text-[15px]`;
export const CTA_BAR = `${BASE} px-5 py-2.5 text-sm`;

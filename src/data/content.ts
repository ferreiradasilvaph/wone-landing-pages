/**
 * Dados numéricos da prévia do painel.
 *
 * O conteúdo textual do site mora em `src/i18n/` — aqui ficam só as séries que
 * não mudam com o idioma, para não haver duas fontes de verdade.
 */

/**
 * Curva de faturamento por hora. Valores fixos, ilustrativos — nada é sorteado,
 * para servidor e cliente renderizarem igual.
 */
export const HOURLY_REVENUE = [
  45, 30, 18, 12, 10, 15, 32, 60, 95, 120, 140, 158, 172, 165, 180, 205, 230, 265,
  310, 360, 415, 455, 360, 210,
];

/**
 * Funil de 100 leads. Categorias ordenadas, então a cor é uma rampa de um só
 * tom (laranja), do mais claro ao mais escuro — validada contra a superfície
 * #0f0f14. Os rótulos vêm do dicionário, na mesma ordem.
 */
export const FUNNEL_STEPS = [
  { label: "start", value: 100, color: "#FFC48A" },
  { label: "pix", value: 40, color: "#FF9D45" },
  { label: "paid", value: 16, color: "#FF7700" },
];

"use client";

import { useId } from "react";

/**
 * Bandeiras desenhadas em SVG, por país.
 *
 * Substituem os emoji 🇧🇷🇦🇷🇲🇽🇨🇴🇪🇨🇵🇹🇬🇧, que o Windows não renderiza — lá eles
 * saem como as duas letras do código regional. Em SVG o desenho é o mesmo em
 * qualquer sistema e escala sem perder nitidez.
 *
 * São versões simplificadas: as faixas e os símbolos centrais que identificam
 * cada bandeira, sem os detalhes heráldicos que sumiriam neste tamanho — e
 * bandeira é símbolo nacional, não logotipo de marca, por isso ela pode ser
 * redesenhada assim.
 *
 * A bandeira é estática e não tem estado: a prop `active`, que acendia um
 * brilho varrendo a do país em destaque, saiu com os outros relógios
 * decorativos, e com ela o último lugar onde a escolha se marcava por reflexo —
 * o que marca a escolha é o tom do fundo da linha (regra 8).
 */

function Brasil() {
  return (
    <>
      <rect width="60" height="42" fill="#009B3A" />
      <path d="M30 4 L56 21 L30 38 L4 21 Z" fill="#FEDF00" />
      <circle cx="30" cy="21" r="9.5" fill="#002776" />
      <path
        d="M20.5 18.5 Q30 15.5 39.5 20.5"
        stroke="#fff"
        strokeWidth="2.4"
        fill="none"
      />
    </>
  );
}

function Argentina() {
  return (
    <>
      <rect width="60" height="42" fill="#74ACDF" />
      <rect y="14" width="60" height="14" fill="#fff" />
      <circle cx="30" cy="21" r="4.6" fill="#F6B40E" />
      <circle cx="30" cy="21" r="3.1" fill="#FCD116" />
    </>
  );
}

function Mexico() {
  return (
    <>
      <rect width="20" height="42" fill="#006847" />
      <rect x="20" width="20" height="42" fill="#fff" />
      <rect x="40" width="20" height="42" fill="#CE1126" />
      <circle cx="30" cy="21" r="5.2" fill="none" stroke="#9D6C3B" strokeWidth="1.6" />
      <circle cx="30" cy="21" r="2.1" fill="#9D6C3B" />
    </>
  );
}

function Colombia() {
  return (
    <>
      <rect width="60" height="21" fill="#FCD116" />
      <rect y="21" width="60" height="10.5" fill="#003893" />
      <rect y="31.5" width="60" height="10.5" fill="#CE1126" />
    </>
  );
}

function Equador() {
  return (
    <>
      {/* Tricolor 2:1:1 — o amarelo vale metade da altura. */}
      <rect width="60" height="21" fill="#FFDD00" />
      <rect y="21" width="60" height="10.5" fill="#034EA2" />
      <rect y="31.5" width="60" height="10.5" fill="#EF3340" />
      {/* O brasão é a ÚNICA coisa que separa esta bandeira da colombiana: as
          duas são amarelo-azul-vermelho na mesma proporção, e lado a lado na
          tabela ficariam iguais. Então ele entra, reduzido ao que se lê a 36px:
          o escudo e o arco do condor em cima. Não é desenho heráldico — é a
          marca que diz "não é a Colômbia". */}
      <path
        d="M25 12.5 H35 V21 Q35 27 30 29 Q25 27 25 21 Z"
        fill="#FFFEF2"
        stroke="#1B3A6B"
        strokeWidth="1.1"
      />
      <path d="M24.5 10 Q30 6.5 35.5 10" fill="none" stroke="#1B3A6B" strokeWidth="1.6" />
    </>
  );
}

function Portugal() {
  return (
    <>
      <rect width="24" height="42" fill="#046A38" />
      <rect x="24" width="36" height="42" fill="#DA291C" />
      {/* A esfera armilar e o escudo são um disco amarelo só: é o que se lê a
          36px de largura, e é o que marca a divisa verde/vermelha. */}
      <circle cx="24" cy="21" r="7.4" fill="#FFD100" />
      <circle cx="24" cy="21" r="3.4" fill="#DA291C" />
    </>
  );
}

function ReinoUnido() {
  return (
    <>
      <rect width="60" height="42" fill="#012169" />
      {/* Union Jack simplificada: as diagonais brancas e, mais finas, as
          vermelhas por cima; depois a cruz reta branca e a vermelha. Sem o
          contra-esquartelado (as diagonais vermelhas deslocadas da Saltire),
          que some neste tamanho. */}
      {/* `fill="none"` em todas: são traços abertos, e sem isso o preenchimento
          padrão fecharia os triângulos entre as duas diagonais em preto. */}
      <path d="M0 0 L60 42 M60 0 L0 42" fill="none" stroke="#fff" strokeWidth="8.5" />
      <path d="M0 0 L60 42 M60 0 L0 42" fill="none" stroke="#C8102E" strokeWidth="3.4" />
      <path d="M30 0 V42 M0 21 H60" fill="none" stroke="#fff" strokeWidth="13" />
      <path d="M30 0 V42 M0 21 H60" fill="none" stroke="#C8102E" strokeWidth="7.4" />
    </>
  );
}

/**
 * A chave é o ISO DA MOEDA (o `code` de `payments.table.countries`), não o do
 * país: é o campo que a tabela, a demo e o globo já carregam. O Equador paga em
 * dólar, então sua bandeira entra em `USD` — se um dia a lista ganhar os
 * Estados Unidos, as duas disputam a mesma chave e aí o `code` passa a ser o do
 * país. Os sete são os de 15/10 (pedido da diretoria do dono, com Portugal e
 * Reino Unido): BR, MX, AR, CO, EC, PT, GB.
 */
const FLAGS: Record<string, () => React.ReactElement> = {
  BRL: Brasil,
  ARS: Argentina,
  MXN: Mexico,
  COP: Colombia,
  USD: Equador,
  EUR: Portugal,
  GBP: ReinoUnido,
};

export function FlagMark({
  code,
  className = "h-6 w-9",
}: {
  /** Código da moeda: BRL, ARS, MXN, COP, USD, EUR ou GBP. */
  code: string;
  /** Padrão 36×24, a medida da tabela de Pagamentos. */
  className?: string;
}) {
  const clipId = useId();
  const Flag = FLAGS[code];
  if (!Flag) return null;

  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 overflow-hidden rounded-[3px] ring-1 ring-cream/15 ${className}`}
    >
      <svg viewBox="0 0 60 42" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <clipPath id={clipId}>
          <rect width="60" height="42" rx="2" />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <Flag />
          {/* Dobra do tecido: duas camadas chapadas, uma clara em cima e uma
              escura embaixo, que dão volume sem um único degradê */}
          <path d="M0 0 L60 0 L60 14 L0 30 Z" fill="#fff" fillOpacity="0.1" />
          <path d="M0 42 L60 42 L60 30 L0 16 Z" fill="#000" fillOpacity="0.12" />
        </g>
      </svg>
    </span>
  );
}

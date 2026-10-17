/**
 * Metadados da textura `public/images/sp-noite.webp` — o mapa noturno de São
 * Paulo do hero.
 *
 * GERADO POR `scripts/gera-sp.mjs`. Não edite à mão: rode o script.
 *
 * A geometria é REAL, do OpenStreetMap. Os dados são ODbL, e a licença exige que
 * a atribuição de `ATRIBUICAO` apareça em texto visível na página que mostra a
 * imagem — é por isso que ela é um campo exportado e não um comentário.
 *
 * A TORRE É FICÇÃO. A Wone não tem torre na Avenida Paulista: `torre` é o ponto
 * escolhido para a ilustração 3D da próxima etapa, ao lado do MASP — a
 * 38 m do eixo da avenida nos dados do OSM. Tudo que nascer desse ponto tem
 * de aparecer na interface rotulado como SIMULAÇÃO.
 *
 * A projeção é equiretangular local — a mesma do script, repetida aqui em
 * `projetaSP` para a câmera não refazer a conta de cabeça.
 */

export type PontoSP = {
  /** Como o ponto é chamado na página. */
  readonly nome: string;
  /** O `name` da feição no OpenStreetMap de onde o ponto saiu, quando existe. */
  readonly osm: string | null;
  readonly lat: number;
  readonly lon: number;
  /** Pixel na textura de 2048×2048, com a origem no canto noroeste. */
  readonly px: number;
  readonly py: number;
};

export type MapaSP = {
  readonly textura: string;
  readonly lado: number;
  readonly larguraKm: number;
  readonly metrosPorPixel: number;
  readonly centro: { readonly lat: number; readonly lon: number };
  readonly bbox: {
    readonly norte: number;
    readonly sul: number;
    readonly oeste: number;
    readonly leste: number;
  };
  readonly atribuicao: string;
  readonly torre: {
    readonly nome: string;
    readonly lat: number;
    readonly lon: number;
    readonly px: number;
    readonly py: number;
    readonly ficcao: true;
  };
  readonly pontos: readonly PontoSP[];
};

export const ATRIBUICAO = "© OpenStreetMap contributors";

export const SP_MAPA: MapaSP = {
  textura: "/images/sp-noite.webp",
  lado: 2048,
  larguraKm: 22,
  metrosPorPixel: 10.742188,
  centro: { lat: -23.561, lon: -46.656 },
  bbox: {
    norte: -23.461519,
    sul: -23.660481,
    oeste: -46.763801,
    leste: -46.548199,
  },
  atribuicao: ATRIBUICAO,
  torre: {
    nome: "Torre Wone (simulação)",
    lat: -23.5614,
    lon: -46.6559,
    px: 1024.9,
    py: 1028.1,
    ficcao: true,
  },
  pontos: [
    {
      nome: "Avenida Paulista / MASP",
      osm: "Avenida Paulista",
      lat: -23.561817,
      lon: -46.655932,
      px: 1024.6,
      py: 1032.4,
    },
    {
      nome: "Praça da Sé",
      osm: "Praça da Sé",
      lat: -23.550443,
      lon: -46.633117,
      px: 1241.4,
      py: 915.3,
    },
    {
      nome: "Parque Ibirapuera",
      osm: "Parque Ibirapuera",
      lat: -23.587711,
      lon: -46.658189,
      px: 1003.2,
      py: 1299,
    },
    {
      nome: "Aeroporto de Congonhas",
      osm: "Aeroporto de São Paulo/Congonhas - Deputado Freitas Nobre",
      lat: -23.627446,
      lon: -46.657534,
      px: 1009.4,
      py: 1708,
    },
    {
      nome: "Marginal Tietê",
      osm: "Marginal Tietê (Expressa)",
      lat: -23.516828,
      lon: -46.650002,
      px: 1081,
      py: 569.3,
    },
    {
      nome: "Rio Tietê",
      osm: "Rio Tietê",
      lat: -23.518876,
      lon: -46.667038,
      px: 919.2,
      py: 590.4,
    },
    {
      nome: "Avenida Brigadeiro Faria Lima",
      osm: "Avenida Brigadeiro Faria Lima",
      lat: -23.574763,
      lon: -46.688543,
      px: 714.9,
      py: 1165.7,
    },
    {
      nome: "Rio Pinheiros",
      osm: "Rio Pinheiros",
      lat: -23.590073,
      lon: -46.692526,
      px: 677,
      py: 1323.3,
    },
  ],
};

/** lat/lon → pixel da textura. Fora da caixa o resultado sai fora de [0, lado]. */
export function projetaSP(lat: number, lon: number): { x: number; y: number } {
  const { bbox, lado } = SP_MAPA;
  return {
    x: ((lon - bbox.oeste) / (bbox.leste - bbox.oeste)) * lado,
    y: ((bbox.norte - lat) / (bbox.norte - bbox.sul)) * lado,
  };
}

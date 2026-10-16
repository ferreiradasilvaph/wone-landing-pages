"use client";

import { useContent } from "@/i18n";
import { LanguageToggle } from "./LanguageToggle";
import { TextLink } from "./TextLink";
import { WoneIcon } from "./WoneMark";


/**
 * Link de rodapé: 14px.
 *
 * O passo é 44px no celular (o `py-3` do alvo de toque, sem gap na lista) e 30
 * no desktop (`py-0` mais o `gap-2.5` da coluna). Antes os dois se somavam —
 * `py-3` E `gap-4` —, e o passo saía em 61px: a coluna Produto sozinha media
 * 358px num rodapé de 1.178.
 */
const LINK = "py-3 text-sm text-muted transition-colors hover:text-cream md:py-0";

/** Cabeçalho de coluna: 16px abaixo dele no desktop, 8 no celular (o `py-3`
    do primeiro link já dá o resto). */
const COLUNA = "t-label mb-2 md:mb-4";

/** A lista de links: duas colunas no celular, uma no desktop. */
const LISTA = "grid grid-cols-2 gap-x-4 md:flex md:flex-col md:gap-2.5";

/**
 * Rodapé: marca e idioma à esquerda, três colunas de rótulos à direita, régua e
 * bloco legal.
 *
 * Não há `border-t` no topo: a fronteira com a Lista de espera é a troca de
 * fundo (ink-850 → ink-950), como entre todas as seções da página. A marca
 * d'água de 22vw que ficava aqui saiu — era o maior texto do site, e não dizia
 * nada.
 *
 * As nove integrações vêm em DUAS colunas, e a coluna delas é a mais larga da
 * grade (1.6fr). Em fila única elas eram o que fazia o rodapé: nove nomes a
 * 30px de passo são 290px, contra os 206 da coluna Produto, e no celular a
 * mesma fila punha o rodapé em 1.178px. Nenhuma coluna da Dotfy passa de seis
 * itens; esta é a única da Wone que passa, e dobrada ela volta à altura das
 * outras (cinco linhas).
 *
 * A coluna Empresa é um conjunto de slots: cada endereço que o dono ainda não
 * forneceu é string vazia e não renderiza. Quando NENHUM está preenchido a
 * coluna inteira sai e a grade passa a três — um cabeçalho "EMPRESA" sozinho
 * seria pior do que não ter a coluna.
 */
export function SiteFooter() {
  const { nav, integrations, footer } = useContent();

  const empresa = [
    {
      key: "email",
      href: footer.company.email ? `mailto:${footer.company.email}` : "",
      label: footer.company.labels.email,
      external: false,
    },
    {
      key: "telegram",
      href: footer.company.telegram,
      label: footer.company.labels.telegram,
      external: true,
    },
    {
      key: "terms",
      href: footer.company.terms,
      label: footer.company.labels.terms,
      external: false,
    },
    {
      key: "privacy",
      href: footer.company.privacy,
      label: footer.company.labels.privacy,
      external: false,
    },
  ].filter((item) => item.href !== "");

  return (
    <footer className="bg-ink-950 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`grid gap-8 md:gap-10 ${
            empresa.length > 0
              ? "md:grid-cols-[1.4fr_1fr_1.6fr_1fr]"
              : "md:grid-cols-[1.4fr_1fr_1.6fr]"
          }`}
        >
          <div>
            <WoneIcon className="h-8 w-auto" />
            <p className="mt-4 max-w-[17rem] text-sm leading-relaxed text-muted">
              {footer.tagline}
            </p>
            {/* O rótulo "IDIOMA" saiu: a pílula PT/EN já diz o que faz, e o
                nome continua para quem lê com leitor de tela. */}
            <div className="mt-6">
              <LanguageToggle label={footer.languageLabel} />
            </div>
          </div>

          <nav aria-label={footer.columns.product}>
            <p className={COLUNA}>{footer.columns.product}</p>
            <div className={LISTA}>
              {nav.map((link) => (
                <a key={link.href} href={link.href} className={LINK}>
                  {link.label}
                </a>
              ))}
              {/* O laranja fecha a coluna: é a mesma ação do botão do header,
                  no peso de link (regra 3). O `py-3` o põe no passo dos outros
                  — sem ele o alvo de toque ficaria em 20px. */}
              <TextLink href="#fila-de-espera" className="py-3 md:py-0">
                {footer.listLink}
              </TextLink>
            </div>
          </nav>

          {/* A ÚLTIMA COLUNA ANCORA NA BORDA DIREITA — enquanto for mesmo a
              última, isto é, enquanto Empresa estiver esperando os dados do
              dono.

              Sem isso o rodapé abria 257px de vão entre o fim de "Otimizey" e a
              borda do conteúdo: a grade distribui o espaço de QUATRO colunas
              entre três, cada faixa fica mais larga que o seu texto e o texto se
              encosta à esquerda da sua faixa. Com a primeira coluna presa à
              esquerda e a última à direita, a fileira volta a medir a página
              inteira e a do meio flutua entre as duas — que é como se lê um
              rodapé.

              Quando `footer.company` for preenchido, Empresa volta a ser a
              última e esta âncora sai sozinha. É por isso que ela é condicional
              e não uma classe fixa: o rodapé tem de saber se recompor quando o
              dado chegar, sem ninguém mexer no código. */}
          <div className={empresa.length === 0 ? "md:text-right" : undefined}>
            <p className={COLUNA}>{footer.columns.integrations}</p>
            {/* Nomes, não links: o passo de 30px vale aqui também nos dois
                tamanhos, porque não há nada para tocar. No celular as duas
                colunas dividem a largura; no desktop elas encolhem até o nome
                mais longo ("TikTok Ads"), senão os 454px da coluna abriam 224
                de vão entre "PIX" e "Cartão" e a lista lia como duas. */}
            <div
              className={`grid grid-cols-2 gap-x-4 gap-y-2.5 md:grid-cols-[auto_auto] md:gap-x-10 ${
                empresa.length === 0 ? "md:justify-end" : "md:justify-start"
              }`}
            >
              {integrations.items.map((item) => (
                <span key={item.name} className="flex items-center gap-2 text-sm text-muted">
                  {/* Ponto laranja no lugar do glifo da marca — o dono pediu em
                      15/10 o mesmo tratamento da faixa do hero. */}
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  {item.name}
                </span>
              ))}
            </div>
          </div>

          {empresa.length > 0 && (
            <nav aria-label={footer.columns.company}>
              <p className={COLUNA}>{footer.columns.company}</p>
              <div className={LISTA}>
                {empresa.map((item) => (
                  <a
                    key={item.key}
                    href={item.href}
                    {...(item.external ? { target: "_blank", rel: "noreferrer" } : null)}
                    className={LINK}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </nav>
          )}
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <div className="flex flex-col gap-3 text-[13px] text-faint sm:flex-row sm:justify-between">
            <p>
              {footer.legalEntity && (
                <>
                  <code>{footer.legalEntity}</code>{" "}
                </>
              )}
              {footer.copyright}
            </p>
            <p className="sm:text-right">{footer.disclaimer}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

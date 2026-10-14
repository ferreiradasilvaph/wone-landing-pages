"use client";

import { useContent } from "@/i18n";
import { IntegrationMark } from "./IntegrationMark";
import { LanguageToggle } from "./LanguageToggle";
import { TextLink } from "./TextLink";
import { WoneIcon } from "./WoneMark";

/* O mesmo laranja único da faixa do hero: a cor própria de cada marca não é
   usada em lugar nenhum da página. */
const MARCA = "#FF7700";

/** Link de rodapé: 14px, e no celular o `py-3` leva o alvo aos 44px. */
const LINK = "py-3 text-sm text-muted transition-colors hover:text-cream md:py-0";

/**
 * Rodapé: marca e idioma à esquerda, três colunas de rótulos à direita, régua e
 * bloco legal.
 *
 * Não há `border-t` no topo: a fronteira com a Lista de espera é a troca de
 * fundo (ink-850 → ink-950), como entre todas as seções da página. A marca
 * d'água de 22vw que ficava aqui saiu — era o maior texto do site, e não dizia
 * nada.
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
          className={`grid gap-10 ${
            empresa.length > 0
              ? "md:grid-cols-[1.4fr_1fr_1fr_1fr]"
              : "md:grid-cols-[1.4fr_1fr_1fr]"
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

          <nav aria-label={footer.columns.product} className="flex flex-col gap-4">
            <p className="t-label">{footer.columns.product}</p>
            {nav.map((link) => (
              <a key={link.href} href={link.href} className={LINK}>
                {link.label}
              </a>
            ))}
            <TextLink href="#fila-de-espera">{footer.listLink}</TextLink>
          </nav>

          <div className="flex flex-col gap-4">
            <p className="t-label">{footer.columns.integrations}</p>
            {integrations.items.map((item) => (
              <span key={item.name} className="flex items-center gap-2 text-sm text-muted">
                <IntegrationMark
                  icon={item.icon}
                  name={item.name}
                  color={MARCA}
                  className="h-4 w-4"
                />
                {item.name}
              </span>
            ))}
          </div>

          {empresa.length > 0 && (
            <nav aria-label={footer.columns.company} className="flex flex-col gap-4">
              <p className="t-label">{footer.columns.company}</p>
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
            </nav>
          )}
        </div>

        <div className="mt-14 border-t border-line pt-6">
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

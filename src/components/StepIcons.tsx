/**
 * Ícones das etapas, desenhados em traço laranja na mesma linguagem do ícone da
 * marca: linha de 6 unidades num grid de 100, pontas arredondadas.
 *
 * O `gateway` é um símbolo genérico ocupando o lugar da Dotfy — trocar o corpo
 * dessa função pelo logo oficial é a única alteração necessária quando o
 * arquivo chegar.
 */

const STROKE = {
  stroke: "#FF7700",
  strokeWidth: 6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      {children}
    </svg>
  );
}

/** Avião de papel do Telegram. */
function TelegramIcon() {
  return (
    <Frame>
      <path d="M 88 18 L 12 48 L 42 58 L 88 18" {...STROKE} />
      <path d="M 42 58 L 88 18 L 60 86 L 42 58" {...STROKE} />
      <path d="M 42 58 L 42 80 L 54 68" {...STROKE} />
    </Frame>
  );
}

/** Funil com o fluxo estreitando. */
function FunnelIcon() {
  return (
    <Frame>
      <path d="M 14 20 L 86 20 L 58 54 L 58 84 L 42 74 L 42 54 Z" {...STROKE} />
      <path d="M 30 36 L 70 36" {...STROKE} strokeWidth={4} opacity={0.45} />
    </Frame>
  );
}

/** Lugar reservado para o logo da Dotfy: nós de um gateway de pagamento. */
function GatewayIcon() {
  return (
    <Frame>
      <rect x="14" y="30" width="72" height="44" rx="10" {...STROKE} />
      <path d="M 14 46 L 86 46" {...STROKE} strokeWidth={5} />
      <path d="M 28 62 L 44 62" {...STROKE} strokeWidth={5} />
      <circle cx="70" cy="62" r="5" fill="#FF7700" stroke="none" />
    </Frame>
  );
}

/** Cifrão, para a venda concluída. */
function MoneyIcon() {
  return (
    <Frame>
      <path d="M 50 12 L 50 88" {...STROKE} strokeWidth={5} />
      <path
        d="M 70 32 a 16 14 0 0 0 -20 -10 L 46 22 a 16 14 0 0 0 0 28 l 10 2 a 16 14 0 0 1 0 28 l -4 0 a 16 14 0 0 1 -20 -10"
        {...STROKE}
      />
    </Frame>
  );
}

const ICONS = {
  telegram: TelegramIcon,
  funnel: FunnelIcon,
  gateway: GatewayIcon,
  money: MoneyIcon,
} as const;

export type StepIconName = keyof typeof ICONS;

export function StepIcon({ name }: { name: string }) {
  const Icon = ICONS[name as StepIconName] ?? GatewayIcon;
  return <Icon />;
}

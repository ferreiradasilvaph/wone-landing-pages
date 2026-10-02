export const NAV_LINKS = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Recursos", href: "#recursos" },
  { label: "Pagamentos", href: "#pagamentos" },
  { label: "Prêmios", href: "#premios" },
  { label: "FAQ", href: "#faq" },
];

/** Faixa de integrações exibida logo abaixo do hero. */
export const INTEGRATIONS = [
  { name: "PIX", kind: "Pagamento", dot: "#32D583" },
  { name: "Cartão", kind: "Pagamento", dot: "#FF9D45" },
  { name: "Telegram", kind: "Entrega", dot: "#2AABEE" },
  { name: "Meta Ads", kind: "Rastreio", dot: "#0A7CFF" },
  { name: "TikTok Ads", kind: "Rastreio", dot: "#EE1D52" },
  { name: "Kwai", kind: "Rastreio", dot: "#FF7700" },
  { name: "X Ads", kind: "Rastreio", dot: "#FFFFE3" },
  { name: "UTMify", kind: "Atribuição", dot: "#A78BFA" },
  { name: "Otimizey", kind: "Atribuição", dot: "#22D3EE" },
];

/**
 * Números de destaque. Todos descrevem o produto — nada de métrica de
 * resultado de cliente, que seria promessa sem lastro.
 */
export const HIGHLIGHTS = [
  {
    value: 1.2,
    decimals: 1,
    suffix: "s",
    label: "Do PIX confirmado ao acesso liberado",
  },
  {
    value: 28,
    decimals: 0,
    suffix: "",
    label: "Tipos de bloco no editor visual, 4 deles de IA",
  },
  {
    value: 3,
    decimals: 0,
    suffix: "",
    label: "Caminhos independentes de confirmação de pagamento",
  },
  {
    value: 4,
    decimals: 0,
    suffix: "",
    label: "Países com cobrança em moeda local",
  },
];

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Conecte seu bot",
    description: "Cole o token do @BotFather e pronto. A Wone cuida de manter o bot no ar.",
  },
  {
    step: "02",
    title: "Monte seu funil",
    description: "Preencha o funil pronto em abas ou desenhe o seu no editor visual.",
  },
  {
    step: "03",
    title: "Conecte seu gateway",
    description: "Use a sua conta na processadora. O dinheiro cai direto nela.",
  },
  {
    step: "04",
    title: "Venda e entregue no automático",
    description: "O cliente paga, recebe o acesso na hora e você acompanha tudo no painel.",
  },
];

export const FEATURES = [
  {
    title: "Order bump",
    description: "Ofereça um adicional no checkout, cobrado no mesmo PIX.",
    icon: "ShoppingBag",
  },
  {
    title: "Upsell e downsell",
    description: "Sequências automáticas depois da compra e para quem abandonou.",
    icon: "TrendingUp",
  },
  {
    title: "Packs",
    description: "Venda conteúdos avulsos, com prévia antes da compra.",
    icon: "Boxes",
  },
  {
    title: "Planos flexíveis",
    description: "Mensal, trimestral, semestral, anual ou vitalício.",
    icon: "Calendar",
  },
  {
    title: "Assinatura e renovação",
    description: "Lembretes antes de vencer e remoção automática ao expirar.",
    icon: "RefreshCw",
  },
  {
    title: "PIX livre",
    description: "Deixe o cliente escolher o valor dentro da faixa que você definir.",
    icon: "Sliders",
  },
  {
    title: "Modo de teste",
    description: "Percorra seu funil no Telegram sem gerar cobrança real.",
    icon: "TestTube",
  },
  {
    title: "Remarketing",
    description: "Campanhas segmentadas, com teste A/B e agendamento.",
    icon: "Megaphone",
  },
  {
    title: "Entrega automática",
    description: "Convite único para canal ou grupo, gerado na hora do pagamento.",
    icon: "Zap",
  },
  {
    title: "IA no funil",
    description: "Bots que conversam, classificam e qualificam seus leads.",
    icon: "Bot",
  },
];

export const PRODUCTS = [
  {
    name: "Wone Estático",
    tagline: "O funil pronto. É só preencher.",
    description:
      "Boas-vindas, planos, order bump, upsell, downsell, packs, pagamento, entrega e renovação, organizados em abas. Você preenche, a Wone executa.",
    bullets: [
      "Ideal para começar a vender rápido",
      "Nenhuma lógica para configurar",
      "Funil completo de venda já estruturado",
    ],
    featured: false,
  },
  {
    name: "Wone Fluxos",
    tagline: "Desenhe o funil do seu jeito.",
    description:
      "Um editor visual por blocos, onde você monta a lógica de ponta a ponta: condições, esperas, etiquetas, integrações e inteligência artificial.",
    bullets: [
      "28 tipos de bloco, incluindo 4 de IA",
      "Simulador e modo de teste no próprio painel",
      "Métricas por bloco para saber onde o lead para",
    ],
    featured: true,
  },
];

export const PAYMENT_BENEFITS = [
  "O dinheiro cai na sua conta. Você conecta a sua própria conta na processadora.",
  "Se um gateway cair, o próximo assume. Configure mais de um e não perca venda por instabilidade.",
  'Confirmação em três caminhos: Webhook, reconciliação automática e botão "Verificar pagamento" no chat.',
  "Sem entrega duplicada. Um mesmo pagamento nunca libera o acesso duas vezes.",
  "Venda para fora do Brasil. Cobre na moeda local de Argentina, México e Colômbia.",
  "Processadoras próprias: Pagamentos nacionais e internacionais com moedas locais.",
];

export const TRACKING_BENEFITS = [
  "Meta, TikTok, Kwai, X, UTMify e Otimizey integrados, com envio servidor a servidor.",
  "Página de entrega com Pixel, que melhora a qualidade dos dados dos seus anúncios.",
  "Links rastreáveis com análise de cliques, filtro de robôs e mapa de acessos.",
  "Códigos de venda para medir cada campanha e criativo.",
];

export const ANALYTICS_METRICS = [
  "Faturamento por dia e por hora, para descobrir seu melhor horário de venda",
  "Funil completo: start, PIX gerado e pagamento",
  "LTV e tempo médio até a compra",
  "Taxas de upsell, downsell, order bump e recuperação, com os números por trás de cada uma",
  "Extrato de transações por período, fluxo e gateway",
];

/**
 * Curva de faturamento por hora usada na prévia do painel. Valores fixos,
 * ilustrativos — nada é sorteado, para servidor e cliente renderizarem igual.
 */
export const HOURLY_REVENUE = [
  45, 30, 18, 12, 10, 15, 32, 60, 95, 120, 140, 158, 172, 165, 180, 205, 230, 265,
  310, 360, 415, 455, 360, 210,
];

/**
 * Funil de 100 leads. Categorias ordenadas, então a cor é uma rampa de um só
 * tom (laranja), do mais claro ao mais escuro — validada contra a superfície
 * #0f0f14.
 */
/**
 * Entregas listadas na tela do celular do hero. Valores ilustrativos, alinhados
 * aos que a página já mostra (R$ 197,00 e R$ 142.580,00).
 */
export const PHONE_TRANSACTIONS = [
  { label: "Plano Anual VIP", amount: "R$ 197,00" },
  { label: "Order bump · Pack", amount: "R$ 47,00" },
  { label: "Plano Mensal", amount: "R$ 97,00" },
];

export const FUNNEL_STEPS = [
  { label: "Deram start no bot", value: 100, color: "#FFC48A" },
  { label: "Geraram a chave PIX", value: 40, color: "#FF9D45" },
  { label: "Concluíram a compra", value: 16, color: "#FF7700" },
];

export const SECURITY_ITEMS = [
  {
    title: "Anti-clone de conteúdo",
    description: "O lead não encaminha, não salva e não copia suas mensagens.",
  },
  {
    title: "Verificação em duas etapas (2FA)",
    description: "Proteção extra para o acesso ao painel.",
  },
  {
    title: "Contas isoladas",
    description: "Os dados de cada cliente ficam separados dos demais.",
  },
  {
    title: "Cofre de segredos",
    description: "Suas chaves e credenciais são guardadas cifradas.",
  },
];

/** Marcos e premiações oficiais (Manual de Marca Wone). */
export const PLAQUES = [
  {
    tier: "10K",
    title: "Troféu Bronze • R$ 10.000",
    subtitle: "A validação da primeira escala",
    description:
      "A validação da sua operação e as primeiras centenas de membros retidos na sua comunidade VIP.",
    awardItem: "Pin Oficial Wone Bronze & Certificado de Escala",
    image: "/images/ativo-icone-vidro.jpg",
    accent: "#D97706",
  },
  {
    tier: "100K",
    title: "Placa Acrílico 100K • R$ 100.000",
    subtitle: "Clube dos 6 Dígitos",
    description:
      "Troféu comemorativo em bloco maciço de acrílico cristal facetado com a Raposa Wone oficial 100K. Acompanha a Pulseira Oficial Wone em couro nobre com fecho em titânio.",
    awardItem: "Troféu Acrílico Cristal + Pulseira Oficial em Titânio Wone",
    image: "/images/trofeu-acrilico-100k.jpg",
    accent: "#E4E4E7",
  },
  {
    tier: "500K",
    title: "Placa Cerimonial 500K • R$ 500.000",
    subtitle: "Meio Milhão Faturado",
    description:
      "Troféu em acrílico especial com a Raposa Wone em traje cerimonial e brasão cromado em alto relevo. Acompanha a joia exclusiva: Colar com pingente cravado em safiras laranjas.",
    awardItem: "Troféu 500K High Relief + Colar Cravejado Safira & Diamante",
    image: "/images/trofeu-acrilico-500k.jpg",
    accent: "#EAB308",
  },
  {
    tier: "1M",
    title: "Placa Black Diamond 1M • R$ 1.000.000",
    subtitle: "O Olimpo dos 7 Dígitos",
    description:
      "Troféu monumental Wone 1M para grandes produtores com ecossistemas dominantes. Acompanha o cobiçado Anel de Campeonato Ouro 18k e Titânio Negro gravado '1M WONE BOT'.",
    awardItem: "Troféu Monumental 1M + Anel de Ouro 18k & Titânio Wone 1M Club",
    image: "/images/trofeu-acrilico-1m.jpg",
    accent: "#FF7700",
  },
];

export const FAQS = [
  {
    question: "Preciso saber programar?",
    answer:
      "Não. No Wone Estático você só preenche o funil em abas. No Wone Fluxos você monta a lógica arrastando blocos, sem escrever código.",
  },
  {
    question: "O dinheiro passa pela Wone?",
    answer:
      "Não. Você conecta a sua própria conta na processadora de pagamento e o valor da venda cai direto nela.",
  },
  {
    question: "Quantos bots posso conectar?",
    answer:
      "Você pode conectar vários bots na mesma conta, dentro do limite definido para o seu acesso. Fale com a gente se precisar de mais.",
  },
  {
    question: "Posso vender para fora do Brasil?",
    answer:
      "Sim. A Wone permite cobrar clientes da Argentina, do México e da Colômbia na moeda local, com checkout próprio.",
  },
  {
    question: "O que acontece se um gateway cair?",
    answer:
      "Você pode configurar vários gateways em ordem. Se o primeiro não gerar a cobrança, o próximo assume automaticamente, e o cliente não fica esperando.",
  },
  {
    question: "Como o cliente recebe o acesso?",
    answer:
      "Assim que o pagamento é confirmado, a Wone gera um convite de uso único para o canal ou grupo e envia no chat. Se algo falhar, você é avisado com o motivo e o cliente recebe uma mensagem clara.",
  },
  {
    question: "A Wone é oficial do Telegram?",
    answer:
      "Não. A Wone é uma plataforma independente que usa a API de bots do Telegram.",
  },
];

export const NAV_LINKS = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Recursos", href: "#recursos" },
  { label: "Pagamentos", href: "#pagamentos" },
  { label: "FAQ", href: "#faq" },
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

export const FAQS = [
  {
    question: "Preciso saber programar?",
    answer: "Não. No Wone Estático você só preenche o funil em abas. No Wone Fluxos você monta a lógica arrastando blocos, sem escrever código.",
  },
  {
    question: "O dinheiro passa pela Wone?",
    answer: "Não. Você conecta a sua própria conta na processadora de pagamento e o valor da venda cai direto nela.",
  },
  {
    question: "Quantos bots posso conectar?",
    answer: "Você pode conectar vários bots na mesma conta, dentro do limite definido para o seu acesso. Fale com a gente se precisar de mais.",
  },
  {
    question: "Posso vender para fora do Brasil?",
    answer: "Sim. A Wone permite cobrar clientes da Argentina, do México e da Colômbia na moeda local, com checkout próprio.",
  },
  {
    question: "O que acontece se um gateway cair?",
    answer: "Você pode configurar vários gateways em ordem. Se o primeiro não gerar a cobrança, o próximo assume automaticamente, e o cliente não fica esperando.",
  },
  {
    question: "Como o cliente recebe o acesso?",
    answer: "Assim que o pagamento é confirmado, a Wone gera um convite de uso único para o canal ou grupo e envia no chat. Se algo falhar, você é avisado com o motivo e o cliente recebe uma mensagem clara.",
  },
  {
    question: "A Wone é oficial do Telegram?",
    answer: "Não. A Wone é uma plataforma independente que usa a API de bots do Telegram.",
  },
];
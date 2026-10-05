/**
 * Conteúdo em português. É a fonte da verdade: o tipo `Content` sai daqui e
 * `en.ts` precisa satisfazê-lo, então um campo novo adicionado aqui quebra o
 * build até ser traduzido — é de propósito.
 */
export const pt = {
  nav: [
    { label: "Como funciona", href: "#como-funciona" },
    { label: "Recursos", href: "#recursos" },
    { label: "Pagamentos", href: "#pagamentos" },
    { label: "Prêmios", href: "#premios" },
    { label: "FAQ", href: "#faq" },
  ],

  hero: {
    /**
     * Posicionamento em texto corrido. Era um badge pill com borda, fundo
     * laranja e ponto pulsante — o enfeite que mais entregava "template". Não
     * repete "Telegram", que já está no título.
     */
    context: "Infraestrutura de cobrança, entrega e rastreio",

    /**
     * Título curto e em cor sólida: `titleAccent` é a única palavra em laranja,
     * sem gradiente. As outras duas opções avaliadas, caso se queira testar:
     *   2. "Pagou no PIX, entrou no canal"        — destaque em "PIX"
     *   3. "Telegram que cobra e entrega sozinho" — destaque em "sozinho"
     */
    titleStart: "Venda no Telegram no",
    titleAccent: "automático",

    /**
     * Resultado para o cliente, não lista de features. Opção alternativa:
     *   "Você publica a oferta e a Wone faz o resto: cobra, confirma o
     *    pagamento e libera o acesso ao canal. Você só olha o caixa."
     */
    lead: "Seu cliente paga no PIX ou no cartão e entra no canal em segundos — de madrugada, no fim de semana, sem você aprovar nada.",

    ctaPrimary: "Lista de espera",
    ctaSecondary: "Ver como funciona",

    /** Três fatos verificáveis, em texto simples no lugar das pills. */
    facts: ["Entrega em 1,2s", "Revogação imediata", "Rastreio servidor a servidor"],

    integrationsLabel: "As melhores integrações do mercado",
  },

  integrations: [
    { name: "PIX", kind: "Pagamento", dot: "#32D583" },
    { name: "Cartão", kind: "Pagamento", dot: "#FF9D45" },
    { name: "Telegram", kind: "Entrega", dot: "#2AABEE" },
    { name: "Meta Ads", kind: "Rastreio", dot: "#0A7CFF" },
    { name: "TikTok Ads", kind: "Rastreio", dot: "#EE1D52" },
    { name: "Kwai", kind: "Rastreio", dot: "#FF7700" },
    { name: "X Ads", kind: "Rastreio", dot: "#FFFFE3" },
    { name: "UTMify", kind: "Atribuição", dot: "#A78BFA" },
    { name: "Otimizey", kind: "Atribuição", dot: "#22D3EE" },
  ],

  /**
   * Destaques do produto. Nenhum deles é métrica de resultado de cliente — são
   * características verificáveis da plataforma.
   */
  highlights: {
    eyebrow: "Por dentro da operação",
    title: "O que a Wone faz enquanto você dorme",
    items: [
      {
        icon: "Zap",
        value: 1.2,
        decimals: 1,
        suffix: "s",
        title: "Entrega instantânea",
        description:
          "Do PIX confirmado ao convite no chat. O cliente paga de madrugada e entra no canal na hora, sem você tocar em nada.",
      },
      {
        icon: "Boxes",
        value: 28,
        decimals: 0,
        suffix: "",
        title: "Blocos no editor",
        description:
          "Condições, esperas, etiquetas e integrações para desenhar qualquer funil. Quatro deles são de IA, para conversar e qualificar leads.",
      },
      {
        icon: "ShieldCheck",
        value: 3,
        decimals: 0,
        suffix: "",
        title: "Vias de confirmação",
        description:
          "Webhook, reconciliação automática e o botão “Verificar pagamento” no chat. Se uma falhar, as outras duas garantem a entrega.",
      },
      {
        icon: "Globe",
        value: 4,
        decimals: 0,
        suffix: "",
        title: "Países, moeda local",
        description:
          "Brasil, Argentina, México e Colômbia. O cliente vê o preço na moeda dele e paga pelo método que já usa.",
      },
    ],

    /**
     * Textos das demonstrações que acompanham cada card.
     *
     * Os nomes dos 28 blocos são PROVISÓRIOS — o projeto só registrava "28
     * tipos de bloco, incluindo 4 de IA". Ficam aqui, num só lugar, para
     * revisão sem tocar em componente.
     */
    demos: {
      tabHint: "Clique em um número para ver a demonstração",

      delivery: {
        title: "Do PIX ao acesso, em 1,2 segundo",
        subtitle: "Simulação do que acontece quando um cliente paga de madrugada",
        clock: "03:14",
        clockNote: "Ninguém da sua equipe está acordado",
        replay: "Simular de novo",
        done: "Acesso liberado",
        steps: [
          { label: "PIX confirmado", detail: "A processadora avisa a Wone" },
          { label: "Webhook recebido", detail: "Pagamento conferido e validado" },
          { label: "Link único gerado", detail: "Convite de uso único para o canal" },
          { label: "Convite enviado", detail: "O cliente recebe no chat" },
        ],
      },

      blocks: {
        title: "28 blocos para desenhar qualquer funil",
        subtitle: "Monte um aqui: clique nos blocos, encadeie e rode",
        aiTag: "IA",
        hint: "Clique num bloco para somá-lo ao funil",
        /** Funil de exemplo. Cada nome precisa existir em `categories`. */
        flow: ["Início", "Conversar", "Oferta", "Checkout PIX", "Gerar convite"],
        builder: {
          canvas: "Seu funil",
          empty: "Escolha um bloco abaixo e veja o funil tomar forma.",
          run: "Rodar",
          example: "Exemplo",
          clear: "Limpar o funil",
          remove: "Remover",
          full: "limite da demo",
        },
        categories: [
          {
            name: "Fluxo",
            items: [
              { name: "Início", detail: "Dispara quando o lead dá start no bot" },
              { name: "Mensagem", detail: "Envia um texto ou mídia no chat" },
              { name: "Condição", detail: "Separa o caminho conforme uma regra" },
              { name: "Espera", detail: "Segura o lead por um tempo definido" },
              { name: "Divisão A/B", detail: "Reparte o tráfego entre dois caminhos" },
              { name: "Fim", detail: "Encerra o fluxo para aquele lead" },
            ],
          },
          {
            name: "Conteúdo",
            items: [
              { name: "Texto", detail: "Mensagem com variáveis do lead" },
              { name: "Mídia", detail: "Foto, vídeo, áudio ou documento" },
              { name: "Botões", detail: "Opções clicáveis dentro do chat" },
            ],
          },
          {
            name: "Venda",
            items: [
              { name: "Oferta", detail: "Apresenta um plano com preço" },
              { name: "Order bump", detail: "Adicional cobrado no mesmo PIX" },
              { name: "Upsell", detail: "Oferta maior depois da compra" },
              { name: "Downsell", detail: "Oferta menor para quem recusou" },
              { name: "Checkout PIX", detail: "Gera a chave e aguarda o pagamento" },
              { name: "Checkout cartão", detail: "Cobra no cartão pelo gateway" },
            ],
          },
          {
            name: "Acesso",
            items: [
              { name: "Gerar convite", detail: "Link único para canal ou grupo" },
              { name: "Remover acesso", detail: "Tira o membro ao expirar" },
              { name: "Verificar assinatura", detail: "Confere se o plano está ativo" },
              { name: "Renovação", detail: "Lembra e recobra antes de vencer" },
            ],
          },
          {
            name: "Dados",
            items: [
              { name: "Etiqueta", detail: "Marca o lead para segmentar depois" },
              { name: "Variável", detail: "Guarda um valor no contato" },
              { name: "Salvar resposta", detail: "Registra o que o lead respondeu" },
            ],
          },
          {
            name: "Integração",
            items: [
              { name: "Enviar evento", detail: "Dispara conversão para a Meta ou TikTok" },
              { name: "Chamar API", detail: "Consulta ou envia dados ao seu sistema" },
            ],
          },
          {
            name: "Inteligência artificial",
            items: [
              { name: "Conversar", detail: "Responde em linguagem natural" },
              { name: "Classificar", detail: "Define a intenção da mensagem" },
              { name: "Extrair dados", detail: "Tira nome, e-mail ou cidade do texto" },
              { name: "Qualificar lead", detail: "Pontua quem tem mais chance de comprar" },
            ],
          },
        ],
      },

      confirmation: {
        title: "Três vias independentes até a entrega",
        subtitle: "Desligue uma via e veja o acesso sair pelas outras",
        payment: "Pagamento feito",
        delivered: "Entregue",
        failLabel: "Simular falha",
        offline: "Via fora do ar",
        allDownTitle: "As três ao mesmo tempo não acontece",
        allDown:
          "As vias são independentes: webhook e reconciliação rodam em servidores separados, e o botão no chat é acionado pelo próprio cliente. Este cenário existe aqui só para mostrar o limite.",
        paths: [
          { name: "Webhook", detail: "A processadora avisa na hora do pagamento" },
          { name: "Reconciliação", detail: "A Wone confere os pagamentos em ciclo" },
          { name: "Verificar pagamento", detail: "O cliente confirma pelo botão no chat" },
        ],
      },

      checkout: {
        title: "O mesmo plano, na moeda de cada país",
        subtitle: "Escolha um país e veja o checkout que o cliente enxerga",
        product: "Plano Anual VIP",
        productNote: "Acesso ao canal por 12 meses",
        payWith: "Pagar com",
        disclaimer: "Valores ilustrativos, sem cotação em tempo real.",
        prices: [
          { code: "BRL", display: "197,00" },
          { code: "ARS", display: "38.000" },
          { code: "MXN", display: "650" },
          { code: "COP", display: "155.000" },
        ],
      },
    },
  },

  howItWorks: {
    eyebrow: "Passo a passo",
    title: "Do bot à primeira venda em",
    titleAccent: "4 passos",
    description:
      "Sem planilha, sem conferência manual. Você configura uma vez e a operação roda sozinha.",
    steps: [
      {
        step: "01",
        icon: "telegram",
        title: "Conecte seu bot",
        description:
          "Cole o token do @BotFather e pronto. A Wone cuida de manter o bot no ar.",
      },
      {
        step: "02",
        icon: "funnel",
        title: "Monte seu funil",
        description:
          "Preencha o funil pronto em abas ou desenhe o seu no editor visual.",
      },
      {
        step: "03",
        icon: "gateway",
        title: "Conecte seu gateway",
        description: "Use a sua conta na processadora. O dinheiro cai direto nela.",
      },
      {
        step: "04",
        icon: "money",
        title: "Venda e entregue no automático",
        description:
          "O cliente paga, recebe o acesso na hora e você acompanha tudo no painel.",
      },
    ],
  },

  products: {
    eyebrow: "Dois caminhos",
    title: "Dois jeitos de montar seu funil",
    description: "Escolha o que combina com você. Dá para usar os dois na mesma conta.",
    featuredLabel: "Completo",
    cta: "Solicitar acesso",
    items: [
      {
        name: "Wone Estático",
        tagline: "O funil pronto",
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
        tagline: "Editor visual",
        description:
          "Um editor visual por blocos, onde você monta a lógica de ponta a ponta: condições, esperas, etiquetas, integrações e inteligência artificial.",
        bullets: [
          "28 tipos de bloco, incluindo 4 de IA",
          "Simulador e modo de teste no próprio painel",
          "Métricas por bloco para saber onde o lead para",
        ],
        featured: true,
      },
    ],
  },

  features: {
    eyebrow: "Recursos",
    title: "Tudo o que seu funil precisa para",
    titleAccent: "vender mais",
    description: "Os recursos que fazem a diferença entre uma venda e dezenas.",
    items: [
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
    ],
  },

  payments: {
    eyebrow: "Pagamentos e rastreio",
    title: "Receba com segurança e saiba de onde vem cada venda",
    description:
      "O dinheiro cai na sua conta e cada clique no anúncio volta como dado para a sua campanha.",
    bannerEyebrow: "Do criativo ao caixa",
    bannerTitle: "Cada clique no anúncio volta como dado servidor a servidor.",

    card: {
      title: "Pagamentos",
      headline: "Checkout internacional",
      lead: "Cobre em moeda local e deixe o cliente pagar do jeito que ele já paga no país dele. Sem conversão manual, sem checkout em inglês.",
      countries: [
        { name: "Brasil", method: "PIX e cartão", code: "BRL", symbol: "R$" },
        { name: "Argentina", method: "Cartão local", code: "ARS", symbol: "$" },
        { name: "México", method: "Cartão e SPEI", code: "MXN", symbol: "$" },
        { name: "Colômbia", method: "Cartão e PSE", code: "COP", symbol: "$" },
      ],
      moreLabel: "Mais garantias",
      more: [
        "O dinheiro cai na sua conta. Você conecta a sua própria conta na processadora.",
        "Se um gateway cair, o próximo assume. Configure mais de um e não perca venda por instabilidade.",
        'Confirmação em três caminhos: Webhook, reconciliação automática e botão "Verificar pagamento" no chat.',
        "Sem entrega duplicada. Um mesmo pagamento nunca libera o acesso duas vezes.",
        "Processadoras próprias para pagamentos nacionais e internacionais.",
      ],
    },

    tracking: {
      title: "Rastreamento",
      lead: "Do clique no anúncio até a venda confirmada e o pós-checkout.",
      flow: [
        { label: "Clique no anúncio", detail: "Meta, TikTok, Kwai ou X" },
        { label: "Start no bot", detail: "UTM e código de venda guardados" },
        { label: "PIX gerado", detail: "Evento enviado servidor a servidor" },
        { label: "Venda confirmada", detail: "Conversão atribuída à campanha" },
        { label: "Página de entrega", detail: "Pixel melhora a qualidade dos dados" },
      ],
      benefits: [
        "Meta, TikTok, Kwai, X, UTMify e Otimizey integrados, com envio servidor a servidor.",
        "Links rastreáveis com análise de cliques, filtro de robôs e mapa de acessos.",
        "Códigos de venda para medir cada campanha e criativo.",
      ],
    },
  },

  analytics: {
    eyebrow: "Análises",
    title: "Decida com números, não com",
    titleAccent: "achismo",
    description: "Um painel que mostra a saúde da sua comunidade VIP em tempo real.",
    hint: "Clique em cada métrica para ver o painel correspondente.",
    views: [
      {
        id: "faturamento",
        icon: "BarChart3",
        label: "Faturamento por dia e por hora, para descobrir seu melhor horário de venda",
        short: "Faturamento",
        panelTitle: "Faturamento por hora",
        panelSubtitle: "Amostra ilustrativa de um dia de operação",
      },
      {
        id: "funil",
        icon: "Filter",
        label: "Funil completo: start, PIX gerado e pagamento",
        short: "Funil",
        panelTitle: "Funil de 100 leads",
        panelSubtitle: "Do start no bot até a compra concluída",
      },
      {
        id: "ltv",
        icon: "Users",
        label: "LTV e tempo médio até a compra",
        short: "LTV",
        panelTitle: "Valor por cliente",
        panelSubtitle: "Quanto cada membro deixa ao longo da assinatura",
      },
      {
        id: "taxas",
        icon: "Percent",
        label:
          "Taxas de upsell, downsell, order bump e recuperação, com os números por trás de cada uma",
        short: "Taxas",
        panelTitle: "Taxas do funil",
        panelSubtitle: "Onde cada real a mais é ganho",
      },
      {
        id: "extrato",
        icon: "Receipt",
        label: "Extrato de transações por período, fluxo e gateway",
        short: "Extrato",
        panelTitle: "Extrato de transações",
        panelSubtitle: "Por período, fluxo e gateway",
      },
    ],
    panel: {
      live: "Tempo real",
      accumulated: "acumulado hoje",
      peak: "pico",
      funnelTitle: "Funil de 100 leads",
      funnelNote: "que geraram o PIX e não pagaram entram na recuperação automática.",
      funnelSteps: [
        "Deram start no bot",
        "Geraram a chave PIX",
        "Concluíram a compra",
      ],
      ltvRows: [
        { label: "LTV médio", value: "R$ 486,00" },
        { label: "Tempo até a 1ª compra", value: "14 min" },
        { label: "Permanência média", value: "4,2 meses" },
        { label: "Renovação no vencimento", value: "71%" },
      ],
      rateRows: [
        { label: "Order bump", value: 34 },
        { label: "Upsell", value: 22 },
        { label: "Downsell", value: 11 },
        { label: "Recuperação de PIX", value: 24 },
      ],
      statementRows: [
        { time: "21:47", flow: "Plano Anual VIP", gateway: "Dotfy", value: "R$ 197,00" },
        { time: "21:31", flow: "Order bump · Pack", gateway: "Dotfy", value: "R$ 47,00" },
        { time: "20:58", flow: "Plano Mensal", gateway: "Mercado Pago", value: "R$ 97,00" },
        { time: "20:12", flow: "Plano Trimestral", gateway: "Dotfy", value: "R$ 247,00" },
      ],
      statementHeaders: ["Hora", "Fluxo", "Gateway", "Valor"],
    },
  },

  security: {
    eyebrow: "Segurança",
    title: "Sua operação blindada",
    description: "Conteúdo protegido, acesso controlado e credenciais guardadas em cofre.",
    items: [
      {
        icon: "KeyRound",
        title: "Verificação em duas etapas (2FA)",
        description: "Proteção extra para o acesso ao painel.",
        detail:
          "Além da senha, o painel pede um código que só existe no seu aparelho. Mesmo que alguém descubra sua senha, não entra.",
      },
      {
        icon: "CopySlash",
        title: "Anti-clone de conteúdo",
        description: "O lead não encaminha, não salva e não copia suas mensagens.",
        detail:
          "O conteúdo do canal fica travado contra encaminhamento e cópia. Quem pagou consome; quem não pagou não recebe de graça.",
      },
      {
        icon: "Network",
        title: "Contas isoladas",
        description: "Os dados de cada cliente ficam separados dos demais.",
        detail:
          "Cada conta roda em seu próprio espaço. Nenhum dado seu cruza com o de outro produtor da plataforma.",
      },
      {
        icon: "Vault",
        title: "Cofre de segredos",
        description: "Suas chaves e credenciais são guardadas cifradas.",
        detail:
          "Tokens de bot e chaves de gateway ficam cifrados em repouso. Nem a equipe da Wone lê o conteúdo.",
      },
    ],
  },

  faq: {
    eyebrow: "Dúvidas",
    title: "Perguntas frequentes",
    items: [
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
    ],
  },

  awards: {
    badge: "Milestone Awards",
    title: "Premiações &",
    titleAccent: "reconhecimento",
    description:
      "A cada novo patamar de faturamento no Telegram, o troféu oficial e os itens comemorativos exclusivos chegam na sua casa.",
    progressLabel: "Arraste para percorrer os marcos",
    milestoneLabel: "Marco",
    physicalItem: "Item físico enviado",
    items: [
      {
        tier: "10K",
        image: "/placas/placa-10k.png",
        title: "Troféu Bronze • R$ 10.000",
        subtitle: "A validação da primeira escala",
        description:
          "A validação da sua operação e as primeiras centenas de membros retidos na sua comunidade VIP.",
        awardItem: "Pin Oficial Wone Bronze & Certificado de Escala",
        accent: "#D97706",
      },
      {
        tier: "100K",
        image: "/placas/placa-100k.png",
        title: "Placa Acrílico 100K • R$ 100.000",
        subtitle: "Clube dos 6 Dígitos",
        description:
          "Troféu comemorativo em bloco maciço de acrílico cristal facetado com a Raposa Wone oficial 100K. Acompanha a Pulseira Oficial Wone em couro nobre com fecho em titânio.",
        awardItem: "Troféu Acrílico Cristal + Pulseira Oficial em Titânio Wone",
        accent: "#E4E4E7",
      },
      {
        tier: "500K",
        image: "/placas/placa-500k.png",
        title: "Placa Cerimonial 500K • R$ 500.000",
        subtitle: "Meio Milhão Faturado",
        description:
          "Troféu em acrílico especial com a Raposa Wone em traje cerimonial e brasão cromado em alto relevo. Acompanha a joia exclusiva: colar com pingente cravado em safiras laranjas.",
        awardItem: "Troféu 500K High Relief + Colar Cravejado Safira & Diamante",
        accent: "#EAB308",
      },
      {
        tier: "1M",
        image: "/placas/placa-1m.png",
        title: "Placa Black Diamond 1M • R$ 1.000.000",
        subtitle: "O Olimpo dos 7 Dígitos",
        description:
          "Troféu monumental Wone 1M para grandes produtores com ecossistemas dominantes. Acompanha o cobiçado Anel de Campeonato Ouro 18k e Titânio Negro gravado “1M WONE BOT”.",
        awardItem: "Troféu Monumental 1M + Anel de Ouro 18k & Titânio Wone 1M Club",
        accent: "#FF7700",
      },
    ],
  },

  cta: {
    title: "Pronto para colocar sua comunidade no",
    titleAccent: "piloto automático",
    description:
      "Conecte seu bot, monte seu funil e deixe a infraestrutura Wone cuidar da cobrança, do remarketing e da revogação de acessos.",
    bullets: [
      "Sem cartão para entrar na fila",
      "Convites liberados em levas, por ordem de inscrição",
      "Você recebe o acesso por e-mail",
    ],
  },

  form: {
    name: "Nome",
    namePlaceholder: "Como podemos te chamar",
    email: "E-mail",
    emailPlaceholder: "voce@exemplo.com",
    nationality: "Nacionalidade",
    telegram: "Usuário no Telegram",
    telegramPlaceholder: "@seuusuario",
    phone: "WhatsApp / Telefone",
    phonePlaceholder: "+55 11 90000-0000",
    optional: "(opcional)",
    submit: "Lista de espera",
    sending: "Enviando...",
    disclaimer: "O acesso à plataforma é liberado por convite. Sem spam.",
    successTitle: "Tudo certo, você está na fila.",
    successBody: "Abrimos o Telegram em outra aba. Se ela não apareceu, use o botão abaixo.",
    successNote:
      "Assim que abrirmos uma nova leva de convites, você recebe o acesso por e-mail.",
    openTelegram: "Abrir no Telegram",
    again: "Cadastrar outro contato",
    countries: [
      { code: "BR", label: "Brasil" },
      { code: "AR", label: "Argentina" },
      { code: "MX", label: "México" },
      { code: "CO", label: "Colômbia" },
      { code: "OT", label: "Outro país" },
    ],
  },

  footer: {
    tagline: "Infraestrutura autônoma de monetização para Telegram.",
    navigate: "Navegar",
    access: "Acesso",
    accessBody: "A plataforma é liberada progressivamente por convite.",
    accessCta: "Entrar na lista",
    integrations: "Integrações",
    rights: "© 2026 Wone Bot. Todos os direitos reservados.",
    legal:
      "A Wone é uma plataforma SaaS independente e não possui vínculo corporativo ou endosso do Telegram.",
    language: "Idioma",
  },

  phone: {
    botName: "Wone Bot",
    online: "online",
    approved: "PIX aprovado",
    received: "Recebido no mês",
    /** Valor de partida do acumulado do mês; cada venda que desce soma a ele. */
    monthStart: 142580,
    success: "Sucesso",
    transactions: [
      { label: "Plano Anual VIP", amount: "R$ 197,00", value: 197 },
      { label: "Plano Trimestral", amount: "R$ 147,00", value: 147 },
      { label: "Plano Mensal", amount: "R$ 97,00", value: 97 },
      { label: "Pack avulso", amount: "R$ 67,00", value: 67 },
      { label: "Order bump · Pack", amount: "R$ 57,00", value: 57 },
      { label: "Plano Semestral", amount: "R$ 227,00", value: 227 },
      { label: "Acesso vitalício", amount: "R$ 247,00", value: 247 },
    ],
    ariaLabel:
      "Tela do Wone Bot: um PIX aprovado, R$ 142.580,00 recebidos no mês e entregas com status de sucesso.",
  },
};

/**
 * Sem `as const` de propósito: os campos ficam `string`/`number` em vez de
 * literais, para `en.ts` poder satisfazer o mesmo tipo com outros textos.
 */
export type Content = typeof pt;

/**
 * Conteúdo em português. É a fonte da verdade: o tipo `Content` sai daqui e
 * `en.ts` precisa satisfazê-lo, então um campo novo adicionado aqui quebra o
 * build até ser traduzido — é de propósito.
 */
export const pt = {
  /**
   * O rótulo de cada item é o mesmo substantivo do kicker da seção e do link da
   * coluna Produto do rodapé — a mesma palavra nos três lugares. Os `href`
   * continuam em português nos dois idiomas: são âncoras técnicas, não texto.
   */
  nav: [
    { label: "Como funciona", href: "#como-funciona" },
    { label: "Recursos", href: "#recursos" },
    { label: "Pagamentos", href: "#pagamentos" },
    { label: "Prêmios", href: "#premios" },
    { label: "FAQ", href: "#faq" },
  ],

  hero: {
    /**
     * Kicker da primeira dobra: posicionamento · cobertura, com o ponto-médio
     * entre termos irmãos. Abaixo de `sm` a cobertura não cabe em uma linha de
     * 13px, então entra a versão curta — é a única diferença entre as duas.
     */
    kicker: "Cobrança, entrega e rastreio · Brasil, Argentina, México e Colômbia",
    kickerShort: "Cobrança, entrega e rastreio",

    /**
     * Título curto e em cor sólida: `titleAccent` é a única palavra em laranja,
     * sem gradiente. As outras duas opções avaliadas, caso se queira testar:
     *   2. "Pagou no PIX, entrou no canal"        — destaque em "PIX"
     *   3. "Telegram que cobra e entrega sozinho" — destaque em "sozinho"
     */
    titleStart: "Venda pelo Telegram no",
    titleAccent: "automático",

    /**
     * O lead do dono, quebrado em trechos só para marcar os dois momentos que
     * ganham `<strong>` (o método de pagamento e a entrada no canal). O texto
     * corrido é o mesmo; os objetos viram <strong class="font-medium
     * text-cream"> e nada mais muda de peso na primeira dobra.
     */
    lead: [
      "Seu cliente ",
      { strong: "paga no PIX ou no cartão" },
      " e ",
      { strong: "entra no canal" },
      " em segundos — de madrugada, no fim de semana, sem você aprovar nada.",
    ],

    ctaPrimary: "Lista de espera",
    ctaSecondary: "Ver como funciona",

    /**
     * Três linhas de benefício: valor em creme, descrição em muted, na mesma
     * linha. Os números são os que já existem neste dicionário (4 países, 3
     * vias, 28 blocos); "1,2 s" e "Revogação imediata" saíram por não terem
     * fonte fora do painel rotulado "Simulação".
     */
    benefits: [
      {
        value: "4 países",
        label: "Real, peso argentino, mexicano e colombiano no checkout",
      },
      { value: "3 vias", label: "Webhook, reconciliação e botão no chat até a entrega" },
      { value: "28 blocos", label: "Editor visual de funil, 4 deles de IA" },
    ],

    /** Rótulos do PauseButton que controla o relógio do telefone. */
    pause: { pause: "pausar", play: "retomar" },
  },

  /**
   * As nove integrações, com o rótulo que abre a faixa. O campo `dot` saiu: os
   * glifos passam a ser laranja único (regra 10), então a cor própria de cada
   * marca não é usada em lugar nenhum.
   */
  integrations: {
    title: "Por onde cada venda passa",
    items: [
      { name: "PIX", icon: "pix", kind: "Pagamento" },
      { name: "Cartão", icon: "card", kind: "Pagamento" },
      { name: "Telegram", icon: "telegram", kind: "Entrega" },
      { name: "Meta Ads", icon: "meta", kind: "Rastreio" },
      { name: "TikTok Ads", icon: "tiktok", kind: "Rastreio" },
      { name: "Kwai", icon: "kwai", kind: "Rastreio" },
      { name: "X Ads", icon: "x", kind: "Rastreio" },
      { name: "UTMify", icon: "utmify", kind: "Atribuição" },
      { name: "Otimizey", icon: "otimizey", kind: "Atribuição" },
    ],
  },

  /**
   * Destaques do produto. Nenhum deles é métrica de resultado de cliente — são
   * características verificáveis da plataforma.
   */
  highlights: {
    kicker: "Plataforma",
    title: "O cliente paga. A Wone confere. O convite chega.",
    /* O convite de clique fecha o lead e substitui a dica solta que havia
       acima das abas (regra de copy: o lead absorve o "hint"). */
    lead: "Do pagamento ao acesso, na mesma conta: PIX ou cartão, três vias de confirmação, convite de uso único no chat. Clique num número para ver cada parte rodar.",
    /** Etiqueta de ficção no cabeçalho do painel das demos (regra 4). */
    simulationLabel: "Simulação",
    items: [
      {
        /* "1,2 s" não vive aqui: a grade fica FORA do painel rotulado
           "Simulação", e número de desempenho sem fonte não sai em texto da
           página (regra 4). O 1,2 s continua no título da demo, que mora dentro
           do painel. A figura desta célula é o convite de uso único por
           pagamento, que é fato do produto. */
        icon: "Zap",
        value: 1,
        decimals: 0,
        suffix: "",
        title: "Convite por pagamento",
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
      delivery: {
        title: "Do PIX ao acesso em 1,2 s",
        subtitle: "Simulação de um pagamento às 03:14, com ninguém da equipe acordado.",
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
        title: "28 blocos. Quatro de IA. Monte um funil aqui.",
        subtitle: "Clique nos blocos, encadeie e rode.",
        aiTag: "IA",
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

          /* Editor: paleta, painel de propriedades e rótulos das saídas. */
          palette: "Paleta de blocos",
          properties: "Bloco escolhido",
          noSelection: "Clique num bloco, na paleta ou no canvas, para ver o que ele faz.",
          running: "Executando o funil",
          twoOutputs: "2 saídas",
          /** Rótulos das duas saídas de "Condição" e de "Divisão A/B". */
          branchYes: "sim",
          branchNo: "não",
          branchA: "A",
          branchB: "B",
          fields: {
            inputs: "Entradas",
            outputs: "Saídas",
            next: "Próximo",
            none: "—",
          },
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
        title: "Três vias até a entrega. Desligue uma.",
        subtitle: "O acesso sai pelas outras duas.",
        payment: "Pagamento feito",
        delivered: "Entregue",
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
        title: "O mesmo plano. A moeda de cada país.",
        subtitle:
          "Escolha um país e veja o checkout do cliente. Valores ilustrativos, sem cotação.",
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
    kicker: "Como funciona",
    /**
     * A única tese da página (66/700, três linhas de ≤ 8em). As linhas são
     * separadas porque cada uma ganha a sua cor: creme, creme e laranja — sobre
     * preto, um terceiro degrau em `--faint` leria como desabilitado.
     */
    thesis: ["Cole o token.", "Monte o funil.", "A Wone entrega."],
    lead: "Bot, funil, gateway, venda. Você configura uma vez; a Wone mantém o bot no ar e a operação roda sozinha. Role para ver os quatro passos.",
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
        title: "Venda e acompanhe",
        description:
          "O cliente paga, recebe o acesso na hora e você acompanha tudo no painel.",
      },
    ],

    /**
     * Os dois produtos. Eram uma seção inteira de cards ("Dois caminhos") e
     * viraram os dois bullets com régua desta coluna: os mesmos fatos, sem a
     * pílula "Completo" e sem os dois botões que repetiam o CTA.
     */
    paths: [
      {
        name: "Wone Estático",
        text: "Funil pronto em abas: boas-vindas, planos, order bump, upsell, downsell, packs e renovação. Você preenche, a Wone executa.",
      },
      {
        name: "Wone Fluxos",
        text: "Editor visual com 28 blocos, 4 de IA; simulador e modo de teste no painel; métricas por bloco para ver onde o lead para.",
      },
    ],

    /** Link de texto que fecha a coluna (ação de menos peso, sem seta). */
    listLink: "Entrar na lista",

    /**
     * Legendas do palco 3D. `{n}` é trocado pelo passo à vista; o chip de
     * estado acompanha a cena (laranja-âmbar até o passo 4, verde no fim).
     */
    stage: {
      counter: "{n} de 4",
      states: { waiting: "PIX · aguardando", confirmed: "PIX · confirmado" },
    },
  },

  features: {
    kicker: "Recursos",
    title: "Order bump no mesmo PIX. Renovação antes de vencer.",
    lead: "Planos de mensal a vitalício, packs com prévia, PIX livre e modo de teste sem cobrança real. Dez recursos, um por vez; use as setas.",
    /** Rótulos das setas do carrossel de Recursos. */
    prev: "Recurso anterior",
    next: "Próximo recurso",
    /**
     * Mesmos dez recursos e mesmos fatos de antes; a descrição passa à cadência
     * pergunta-resposta onde a pergunta é a dúvida real de quem vende ("Venceu?
     * Lembrete antes…"). Onde não havia pergunta honesta a fazer, a frase ficou
     * afirmativa: forçar a fórmula nos dez viraria tique.
     */
    items: [
      {
        title: "Order bump",
        description: "O cliente já está pagando? O adicional entra no mesmo PIX, no checkout.",
        icon: "ShoppingBag",
      },
      {
        title: "Upsell e downsell",
        description: "Comprou? Vem a oferta maior. Desistiu? Vem a menor.",
        icon: "TrendingUp",
      },
      {
        title: "Packs",
        description: "Venda conteúdo avulso. O cliente vê a prévia antes de comprar.",
        icon: "Boxes",
      },
      {
        title: "Planos flexíveis",
        description: "Mensal, trimestral, semestral, anual ou vitalício.",
        icon: "Calendar",
      },
      {
        title: "Assinatura e renovação",
        description: "Venceu? Lembrete antes e remoção automática depois.",
        icon: "RefreshCw",
      },
      {
        title: "PIX livre",
        description: "Quanto o cliente quer pagar? Ele escolhe dentro da faixa que você definir.",
        icon: "Sliders",
      },
      {
        title: "Modo de teste",
        description: "Quer conferir antes? Percorra o funil no Telegram sem cobrança real.",
        icon: "TestTube",
      },
      {
        title: "Remarketing",
        description: "Campanhas segmentadas, com teste A/B e agendamento.",
        icon: "Megaphone",
      },
      {
        title: "Entrega automática",
        description: "Pagou? O convite de uso único sai na hora, para canal ou grupo.",
        icon: "Zap",
      },
      {
        title: "IA no funil",
        description: "Quatro blocos de IA conversam, classificam e qualificam seus leads.",
        icon: "Bot",
      },
    ],
  },

  payments: {
    kicker: "Pagamentos",
    /** Texto do dono, em caixa alta: o único H2 que não é frase. */
    title: "Checkout INTERNACIONAL",
    lead: "Real, peso argentino, mexicano e colombiano. O cliente paga como já paga no país dele: PIX, cartão, SPEI ou PSE. O dinheiro cai na sua conta na processadora.",

    /**
     * A tabela de quatro países. Os cabeçalhos são as colunas da Wone — PAÍS ·
     * PAGA COM · MOEDA · PLANO —, não as da referência: o checkout em espanhol
     * é capacidade da processadora, não da Wone, e por isso não vira coluna.
     */
    table: {
      headers: {
        country: "País",
        methods: "Paga com",
        currency: "Moeda",
        plan: "Plano",
      },
      planLabel: "Plano Anual VIP",
      /* Um método por item, não uma frase ("PIX e cartão"): a coluna "Paga com"
         é uma fileira de chips, e montá-los quebrando uma frase traduzida por
         " e " / " and " acoplaria o componente ao idioma. */
      countries: [
        {
          name: "Brasil",
          methods: ["PIX", "Cartão"],
          code: "BRL",
          symbol: "R$",
          currency: "Real",
        },
        {
          name: "Argentina",
          methods: ["Cartão local"],
          code: "ARS",
          symbol: "$",
          currency: "Peso argentino",
        },
        {
          name: "México",
          methods: ["Cartão", "SPEI"],
          code: "MXN",
          symbol: "$",
          currency: "Peso mexicano",
        },
        {
          name: "Colômbia",
          methods: ["Cartão", "PSE"],
          code: "COP",
          symbol: "$",
          currency: "Peso colombiano",
        },
      ],
      /** Notas de rodapé da tabela: à esquerda a ficção, à direita o fato. */
      notes: [
        "Valores ilustrativos, sem cotação em tempo real.",
        "Checkout próprio em cada país, na moeda local.",
      ],
    },

    block2Title: "O dinheiro cai na sua conta. O clique volta como dado.",

    /**
     * As garantias viraram itens numerados em texto. "Confirmação em três
     * caminhos" saiu daqui: é a figura "3" de Highlights, e cada afirmação-chave
     * é dita uma vez só. "Processadoras próprias" segue fora até o dono
     * confirmar.
     */
    guarantees: [
      {
        num: "01",
        term: "Sua conta na processadora",
        text: "O dinheiro cai direto nela; a Wone não passa pelo dinheiro.",
      },
      {
        num: "02",
        term: "Gateway reserva",
        text: "Se um cair, o próximo assume. Configure mais de um.",
      },
      {
        num: "03",
        term: "Sem entrega duplicada",
        text: "Um mesmo pagamento nunca libera o acesso duas vezes.",
      },
    ],

    tracking: {
      title: "Rastreio",
      lead: "Do clique no anúncio à venda confirmada, servidor a servidor. Meta, TikTok, Kwai e X.",
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
    kicker: "Análises",
    title: "Que hora vende mais. Onde o lead para.",
    /* "Tempo real" saiu do lead junto com a pílula do painel: a amostra é
       ilustrativa, e dizer as duas coisas na mesma seção era contradição. */
    lead: "Faturamento por hora, funil, LTV, taxas e extrato, num painel só. Clique numa aba para ver cada um; a amostra é ilustrativa.",
    simulationLabel: "Simulação",
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
        /* Sem "completo": adjetivo de marketing fora das descrições. */
        label: "Cada passo do funil: start, PIX gerado e pagamento",
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
      accumulated: "acumulado hoje",
      peak: "pico",
      funnelNote: "que geraram o PIX e não pagaram entram na recuperação automática.",
      funnelSteps: [
        "Deram start no bot",
        "Geraram a chave PIX",
        "Concluíram a compra",
      ],
      ltvRows: [
        { label: "LTV médio", value: "$486.00" },
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
        { time: "21:47", flow: "Plano Anual VIP", gateway: "Dotfy", value: "$197.00" },
        /* Vírgula, não ponto-médio: aqui são duas linhas de uma venda, não dois
           termos irmãos de um rótulo. */
        { time: "21:31", flow: "Order bump, Pack", gateway: "Dotfy", value: "$47.00" },
        { time: "20:58", flow: "Plano Mensal", gateway: "Mercado Pago", value: "$97.00" },
        { time: "20:12", flow: "Plano Trimestral", gateway: "Dotfy", value: "$247.00" },
      ],
      statementHeaders: ["Hora", "Fluxo", "Gateway", "Valor"],
    },
  },

  /**
   * Segurança não tem lead: sob o título fica o card de detalhe do item ativo.
   * Cada item serve a duas peças — a linha-tabela da esquerda ("termo —
   * complemento", por isso o `summary` começa em minúscula e sem ponto) e o
   * card da direita (`title` + `detail`).
   */
  security: {
    kicker: "Segurança e acesso",
    title: "O conteúdo não sai do canal. As chaves não saem do cofre.",
    items: [
      {
        icon: "KeyRound",
        term: "2FA",
        summary: "código que só existe no seu aparelho",
        title: "Verificação em duas etapas (2FA)",
        detail:
          "Além da senha, o painel pede um código que só existe no seu aparelho. Mesmo que alguém descubra sua senha, não entra.",
      },
      {
        icon: "CopySlash",
        term: "Anti-clone",
        summary: "o lead não encaminha, não salva, não copia",
        title: "Anti-clone de conteúdo",
        detail:
          "O conteúdo do canal fica travado contra encaminhamento e cópia. Quem pagou consome; quem não pagou não recebe de graça.",
      },
      {
        icon: "Network",
        term: "Contas isoladas",
        summary: "nenhum dado cruza com outro produtor",
        title: "Contas isoladas",
        detail:
          "Cada conta roda em seu próprio espaço. Nenhum dado seu cruza com o de outro produtor da plataforma.",
      },
      {
        icon: "Vault",
        term: "Cofre",
        summary: "tokens e chaves cifrados em repouso",
        title: "Cofre de segredos",
        detail:
          "Tokens de bot e chaves de gateway ficam cifrados em repouso. Nem a equipe da Wone lê o conteúdo.",
      },
    ],
  },

  faq: {
    kicker: "FAQ",
    title: "O que todo mundo pergunta antes de entrar na lista.",
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

  /**
   * A vitrine. O marco em dólar saiu dos títulos e virou `milestoneLine`, uma
   * linha própria em .t-label: o título é o nome do objeto, e o '•' que os
   * separava não volta (nenhum bullet em título). As descrições dizem os mesmos
   * fatos sem os superlativos que havia — o objeto já impressiona sozinho.
   */
  awards: {
    kicker: "Prêmios",
    title: "Aos 10 mil dólares, um pin. No milhão, um anel de ouro 18k.",
    lead: "A cada marco de faturamento no Telegram, o troféu e o item do marco chegam na sua casa. Toque num marco para ver.",
    physicalItem: "Item físico enviado",
    items: [
      {
        tier: "10K",
        image: "/placas/placa-10k.webp",
        /** A joia do marco, como imagem. O 10K ainda não tem a sua. */
        photo: "",
        /** Vestida — a foto já vem sobre o dorso ou o pulso desenhado — aparece
            uma vez ao lado da placa; solta, repete nos quatro cantos. */
        photoWorn: false,
        title: "Troféu Bronze 10K",
        milestoneLine: "$10,000 em faturamento",
        subtitle: "A primeira escala",
        description:
          "A sua operação validada e as primeiras centenas de membros na sua comunidade VIP.",
        awardItem: "Pin oficial Wone em bronze + certificado de escala",
        accent: "#D97706",
      },
      {
        tier: "100K",
        image: "/placas/placa-100k.webp",
        photo: "/images/pulseira-100k-vestida.webp",
        photoWorn: true,
        title: "Placa Acrílico 100K",
        milestoneLine: "$100,000 em faturamento",
        subtitle: "Clube dos 6 dígitos",
        description:
          "Troféu em bloco de acrílico cristal facetado com a Raposa Wone 100K. Acompanha a pulseira oficial Wone em titânio.",
        awardItem: "Troféu de acrílico cristal + pulseira oficial em titânio",
        accent: "#E4E4E7",
      },
      {
        tier: "500K",
        image: "/placas/placa-500k.webp",
        photo: "/images/colar-500k-vestido.webp",
        photoWorn: true,
        title: "Placa Cerimonial 500K",
        milestoneLine: "$500,000 em faturamento",
        subtitle: "Meio milhão faturado",
        description:
          "Troféu em acrílico especial com a Raposa Wone em traje cerimonial e brasão cromado em alto relevo. Acompanha o colar com pingente cravejado em safira e diamante.",
        awardItem: "Troféu 500K em alto relevo + colar cravejado em safira e diamante",
        accent: "#EAB308",
      },
      {
        tier: "1M",
        image: "/placas/placa-1m.webp",
        photo: "/images/anel-1m.webp",
        photoWorn: false,
        title: "Placa Black Diamond 1M",
        milestoneLine: "$1,000,000 em faturamento",
        subtitle: "Clube dos 7 dígitos",
        description:
          "Troféu Wone 1M para quem chegou aos sete dígitos no Telegram. Acompanha o anel de campeonato em ouro 18k e titânio negro, gravado “1M WONE BOT”.",
        awardItem: "Troféu 1M + anel de ouro 18k e titânio negro",
        accent: "#FF7700",
      },
    ],
  },

  cta: {
    kicker: "Acesso",
    title: "Entre na lista. A próxima leva sai por ordem de inscrição.",
    lead: "Sem cartão. O acesso é liberado por convite, em levas, e o seu chega por e-mail.",
    /** Lista "termo — complemento", a mesma forma das linhas de Segurança. */
    bullets: [
      { term: "Cadastro", detail: "nome, e-mail e país; Telegram e telefone se quiser" },
      { term: "Levas", detail: "convites por ordem de inscrição" },
      { term: "Convite", detail: "chega por e-mail" },
    ],
    /** Par de fecho ao lado do submit; só renderiza com NEXT_PUBLIC_TELEGRAM_URL. */
    telegramLink: "ou fale com a gente no Telegram",
    success: { title: "Você está na fila." },
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
    sending: "Enviando…",
    disclaimer: "Acesso por convite. Sem spam.",
    successTitle: "Tudo certo, você está na fila.",
    successBody: "Abrimos o Telegram em outra aba. Se não apareceu, use o botão.",
    /**
     * A mesma tela quando o `window.open` devolveu `null` — bloqueador de
     * pop-up. Existe porque `successBody` afirma uma aba que, nesse caso, não
     * abriu; o botão é o mesmo nos dois.
     */
    successBodyManual: "Abra o Telegram pelo botão abaixo.",
    successNote: "Quando a sua leva abrir, o convite chega por e-mail.",
    openTelegram: "Abrir no Telegram",
    again: "Cadastrar outro contato",

    /**
     * Rótulos das nacionalidades. A lista canônica — a que `POST /api/waitlist`
     * aceita — é `NATIONALITIES`, em `src/lib/waitlist.ts`; o que está aqui é a
     * tradução dela, e os cinco códigos têm de ser exatamente os de lá, porque
     * é daqui que o `select` do formulário monta as opções.
     */
    countries: [
      { code: "BR", label: "Brasil" },
      { code: "AR", label: "Argentina" },
      { code: "MX", label: "México" },
      { code: "CO", label: "Colômbia" },
      { code: "OT", label: "Outro país" },
    ],

    /**
     * Erros do cadastro, indexados pelos códigos que `POST /api/waitlist`
     * devolve — e também pelos que o próprio formulário cunha quando valida
     * antes de enviar, que são os mesmos de propósito. O contrato e o porquê de
     * cada código estão em `src/lib/waitlist-errors.ts` — e é de lá que vem o
     * snake_case destas chaves, as únicas do dicionário fora do padrão
     * camelCase: são valores de protocolo, não rótulos de interface.
     *
     * Antes a rota mandava a frase pronta, em português, e o site em inglês
     * respondia em português por cima de um formulário inteiro traduzido. Agora
     * a rota só nomeia o que aconteceu; a frase é escolhida aqui, e o
     * formulário a resolve no render, de modo que trocar de idioma com o erro
     * na tela também troca o erro.
     *
     * `field_too_long` não repete o limite de 120 caracteres de propósito: o
     * número já vive no `maxLength` dos campos e no `MAX_FIELD_LENGTH` da rota,
     * e uma terceira cópia aqui — em dois idiomas — só existiria para
     * desencontrar das outras duas no dia em que o limite mudar.
     */
    errors: {
      name_missing: "Informe seu nome.",
      email_invalid: "Informe um e-mail válido.",
      nationality_invalid: "Selecione uma nacionalidade da lista.",
      invalid_fields: "Confira os campos destacados.",
      field_too_long: "Algum campo passou do tamanho aceito.",
      too_large: "Dados enviados grandes demais.",
      unreadable_body: "Não foi possível ler os dados enviados.",
      rate_limited:
        "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.",
      save_failed:
        "Não foi possível registrar agora. Tente novamente em instantes.",
      network: "Sem conexão com o servidor. Tente novamente.",
      unknown: "Não foi possível enviar. Tente novamente.",
    },
  },

  footer: {
    /** Um posicionamento só, o mesmo do kicker do hero. */
    tagline:
      "Infraestrutura de cobrança, entrega e rastreio para quem vende no Telegram.",
    columns: { product: "Produto", integrations: "Integrações", company: "Empresa" },
    listLink: "Entrar na lista",

    /**
     * Contato e páginas legais. Cada endereço é um slot: string vazia = o dono
     * ainda não forneceu e o item não renderiza — nada de link para página que
     * não existe. Os rótulos ficam prontos para o dia em que chegarem.
     */
    company: {
      email: "",
      telegram: "",
      terms: "",
      privacy: "",
      labels: {
        email: "E-mail",
        telegram: "Telegram",
        terms: "Termos de uso",
        privacy: "Privacidade",
      },
    },
    /** Razão social e CNPJ, quando houver; vazio não renderiza. */
    legalEntity: "",
    copyright: "© 2026 Wone Bot.",
    /** Aviso de não vínculo com o Telegram: texto obrigatório, não reescrever. */
    disclaimer:
      "A Wone é uma plataforma SaaS independente e não possui vínculo corporativo ou endosso do Telegram.",
    /** Só para leitor de tela: a pílula PT/EN perdeu o rótulo visível. */
    languageLabel: "Idioma",
  },

  /**
   * Prova real. O dono tem nomes autorizados e números de operação para pôr
   * aqui; até chegarem, as listas ficam vazias e os blocos não renderizam —
   * inventar um número ou um depoimento é o que a regra 4 proíbe.
   */
  proof: {
    numbers: [] as { value: string; label: string }[],
    names: [] as { name: string; handle: string }[],
  },

  /** Rótulos repetidos em controles de várias seções. */
  ui: {
    pause: "pausar",
    play: "retomar",
    simulation: "Simulação",
    of: "de",
  },

  phone: {
    botName: "Wone Bot",
    online: "online",
    approved: "Pagamento aprovado",
    received: "Recebido nesta simulação",
    /**
     * Zero: o total soma só as vendas que o visitante viu descer na tela. O
     * valor de partida de antes ($142.580) era um faturamento que ninguém mediu.
     */
    monthStart: 0,
    success: "Sucesso",
    transactions: [
      { label: "Plano Anual VIP", amount: "$197.00", value: 197 },
      { label: "Plano Trimestral", amount: "$147.00", value: 147 },
      { label: "Plano Mensal", amount: "$97.00", value: 97 },
      { label: "Pack avulso", amount: "$67.00", value: 67 },
      /* Vírgula, não ponto-médio: é UMA venda que levou order bump e pack, não
         dois termos irmãos de um rótulo (o extrato do painel já foi corrigido
         pelo mesmo motivo). */
      { label: "Order bump, Pack", amount: "$57.00", value: 57 },
      { label: "Plano Semestral", amount: "$227.00", value: 227 },
      { label: "Acesso vitalício", amount: "$247.00", value: 247 },
    ],
    ariaLabel:
      "Simulação da tela do Wone Bot: um pagamento aprovado, o total recebido e entregas com status de sucesso.",
  },
};

/**
 * Sem `as const` de propósito: os campos ficam `string`/`number` em vez de
 * literais, para `en.ts` poder satisfazer o mesmo tipo com outros textos.
 */
export type Content = typeof pt;

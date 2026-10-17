import type { Content } from "./pt";

/**
 * Conteúdo em inglês. O tipo `Content` vem de `pt.ts`, então um campo novo lá
 * quebra o build aqui até ser traduzido.
 */
export const en: Content = {
  nav: [
    { label: "How it works", href: "#como-funciona" },
    { label: "Features", href: "#recursos" },
    { label: "Payments", href: "#pagamentos" },
    { label: "Awards", href: "#premios" },
    { label: "FAQ", href: "#faq" },
  ],

  hero: {
    /** Abaixo de `sm` entra a versão curta; veja `pt.ts`. */
    /* Continente no lugar dos quatro nomes desde 15/10; veja `pt.ts`. */
    kicker: "Billing, delivery and tracking · Brazil, Latin America and Europe",
    kickerShort: "Billing, delivery and tracking",
    kickerReach: "Brazil, Latin America and Europe",

    /**
     * As duas outras opções de título, equivalentes às do `pt.ts`:
     *   2. "They pay, they are in the channel"       — accent on "in"
     *   3. "Telegram that charges and delivers itself" — accent on "itself"
     */
    /** As mesmas três linhas do `pt.ts`, na mesma quebra. */
    titleLines: ["Sell on", "Telegram on"],
    titleAccent: "autopilot",

    /** Os mesmos dois trechos em `<strong>` do `pt.ts`, na mesma ordem. */
    lead: [
      "Your customer ",
      { strong: "pays by card or PIX" },
      " and ",
      { strong: "joins the channel" },
      " in seconds — at 3am, on a weekend, with nothing for you to approve.",
    ],

    ctaPrimary: "Join the waitlist",
    ctaSecondary: "See how it works",

    benefits: [
      {
        /* Sete desde 15/10; veja `pt.ts`. */
        value: "7 countries",
        label: "Local currency: real, pesos, dollar, euro and pound",
      },
      {
        value: "3 paths",
        label: "Webhook, reconciliation and a chat button, all the way to delivery",
      },
      { value: "28 blocks", label: "Visual funnel editor, 4 of them AI" },
    ],
    /* `pause`/`play` do telefone: veja `pt.ts` — são `ui.pause` e `ui.play`. */

    /* O palco do hero. Só rótulo, cidades e a abertura do resumo; país, método,
       símbolo, ISO e valor vêm das mesmas chaves do `pt.ts`. Veja `pt.ts`. */
    stage: {
      label: "International checkout",
      cities: [
        { code: "BRL", city: "São Paulo" },
        { code: "ARS", city: "Buenos Aires" },
        { code: "MXN", city: "Mexico City" },
        { code: "COP", city: "Bogotá" },
        { code: "USD", city: "Quito" },
        { code: "EUR", city: "Lisbon" },
        { code: "GBP", city: "London" },
      ],
      srIntro: "Globe with the simulated checkout in seven countries:",
    },
    /* Os seis fatos viraram fileiras com detalhe e micro-visual; veja `pt.ts`.
       `kind` é valor de máquina — ele escolhe o desenho, não o texto, e por
       isso é o MESMO nos dois idiomas. Os ISO das moedas também não se
       traduzem. */
    aside: {
      title: "What comes with Wone",
      more: "See all features",
      items: [
        {
          kind: "countries",
          label: "Billing in 7 countries",
          detail: "Your customer pays in their own currency.",
          extra: ["BRL", "ARS", "MXN", "COP", "USD", "EUR", "GBP"],
        },
        {
          kind: "methods",
          label: "The local payment method",
          detail: "Checkout opens with what they already use.",
          extra: ["PIX", "Card", "SPEI", "Nequi", "MB WAY"],
        },
        {
          kind: "invite",
          label: "Single-use invite",
          detail: "Delivered in chat, seconds after the payment.",
          extra: ["Your invite: t.me/+…", "~3 s"],
        },
        {
          kind: "confirm",
          label: "Three confirmation paths",
          detail: "Each one independent.",
          extra: ["Webhook", "Reconciliation", "Chat button"],
        },
        {
          kind: "blocks",
          label: "Funnel editor with 28 blocks",
          detail: "You drag blocks, no code.",
          extra: ["4 of them AI"],
        },
        {
          kind: "own",
          label: "Our own integrations",
          detail: "No Stripe in the middle.",
          extra: ["0 middlemen", "fee set per operation"],
        },
      ],
    },
  },

  integrations: {
    title: "Where every sale passes through",
    items: [
      { name: "PIX", icon: "pix", kind: "Payment" },
      { name: "Card", icon: "card", kind: "Payment" },
      { name: "Telegram", icon: "telegram", kind: "Delivery" },
      { name: "Meta Ads", icon: "meta", kind: "Tracking" },
      { name: "TikTok Ads", icon: "tiktok", kind: "Tracking" },
      { name: "Kwai", icon: "kwai", kind: "Tracking" },
      { name: "X Ads", icon: "x", kind: "Tracking" },
      { name: "UTMify", icon: "utmify", kind: "Attribution" },
      { name: "Otimizey", icon: "otimizey", kind: "Attribution" },
    ],
  },

  highlights: {
    kicker: "Platform",
    titleLines: ["The customer pays.", "Wone checks.", "The invite lands."],
    lead: "From payment to access, in the same account: PIX or card, three confirmation paths, a single-use invite in chat. Click a number to watch each part run.",
    simulationLabel: "Simulation",
    /* `icon` e `description` saíram dos quatro: chave morta desde que a E1
       trocou os cards com ícone pela grade de spec. Veja `pt.ts`. */
    items: [
      {
        /* Veja `pt.ts`: o 1,2 s sai da grade e fica no título da demo, dentro
           do painel rotulado "Simulation". */
        value: 1,
        decimals: 0,
        suffix: "",
        title: "One invite per payment",
      },
      {
        value: 28,
        decimals: 0,
        suffix: "",
        title: "Editor blocks",
      },
      {
        value: 3,
        decimals: 0,
        suffix: "",
        title: "Confirmation paths",
      },
      {
        /* Sete desde 15/10: a figura conta as linhas da tabela de Pagamentos —
           veja `pt.ts`. */
        value: 7,
        decimals: 0,
        suffix: "",
        title: "Countries, local currency",
      },
    ],

    demos: {
      delivery: {
        title: "From PIX to access in 1.2 s",
        subtitle: "A simulation of a payment at 3:14 am, with nobody on your team awake.",
        replay: "Run it again",
        done: "Access granted",
        /* `at` é a hora do relógio, não a duração — veja `pt.ts`. Sem o "am" do
           subtítulo: o sufixo não cabe na coluna de 60px do log. */
        steps: [
          { at: "3:14:00", label: "PIX confirmed", detail: "The processor notifies Wone" },
          { at: "3:14:00", label: "Webhook received", detail: "Payment checked and validated" },
          { at: "3:14:00", label: "Single-use link created", detail: "A one-time invite to the channel" },
          { at: "3:14:01", label: "Invite sent", detail: "The customer gets it in chat" },
        ],
      },

      blocks: {
        title: "28 blocks. Four are AI. Build a funnel here.",
        subtitle: "Click the blocks, chain them and run.",
        aiTag: "AI",
        /** Funil de exemplo. Cada nome precisa existir em `categories`. */
        flow: ["Start", "Converse", "Offer", "PIX checkout", "Create invite"],
        builder: {
          canvas: "Your funnel",
          empty: "Pick a block below and watch the funnel take shape.",
          run: "Run",
          example: "Example",
          clear: "Clear the funnel",
          remove: "Remove",
          full: "demo limit",

          palette: "Block palette",
          properties: "Chosen block",
          noSelection: "Click a block, in the palette or on the canvas, to see what it does.",
          running: "Running the funnel",
          twoOutputs: "2 outputs",
          branchYes: "yes",
          branchNo: "no",
          branchA: "A",
          branchB: "B",
          fields: {
            inputs: "Inputs",
            outputs: "Outputs",
            next: "Next",
            none: "—",
          },
        },
        categories: [
          {
            name: "Flow",
            items: [
              { name: "Start", detail: "Fires when the lead starts the bot" },
              { name: "Message", detail: "Sends text or media in the chat" },
              { name: "Condition", detail: "Splits the path based on a rule" },
              { name: "Wait", detail: "Holds the lead for a set time" },
              { name: "A/B split", detail: "Divides traffic between two paths" },
              { name: "End", detail: "Closes the flow for that lead" },
            ],
          },
          {
            name: "Content",
            items: [
              { name: "Text", detail: "Message with the lead's variables" },
              { name: "Media", detail: "Photo, video, audio or document" },
              { name: "Buttons", detail: "Clickable options inside the chat" },
            ],
          },
          {
            name: "Selling",
            items: [
              { name: "Offer", detail: "Presents a plan with its price" },
              { name: "Order bump", detail: "Add-on charged on the same PIX" },
              { name: "Upsell", detail: "A bigger offer after the purchase" },
              { name: "Downsell", detail: "A smaller offer for those who declined" },
              { name: "PIX checkout", detail: "Creates the key and waits for payment" },
              { name: "Card checkout", detail: "Charges the card through the gateway" },
            ],
          },
          {
            name: "Access",
            items: [
              { name: "Create invite", detail: "Single-use link to channel or group" },
              { name: "Revoke access", detail: "Removes the member on expiry" },
              { name: "Check subscription", detail: "Verifies the plan is still active" },
              { name: "Renewal", detail: "Reminds and recharges before expiry" },
            ],
          },
          {
            name: "Data",
            items: [
              { name: "Tag", detail: "Marks the lead for later segmentation" },
              { name: "Variable", detail: "Stores a value on the contact" },
              { name: "Save answer", detail: "Records what the lead replied" },
            ],
          },
          {
            name: "Integration",
            items: [
              { name: "Send event", detail: "Fires a conversion to Meta or TikTok" },
              { name: "Call API", detail: "Reads from or writes to your system" },
            ],
          },
          {
            name: "Artificial intelligence",
            items: [
              { name: "Converse", detail: "Replies in natural language" },
              { name: "Classify", detail: "Determines the message's intent" },
              { name: "Extract data", detail: "Pulls name, email or city from the text" },
              { name: "Qualify lead", detail: "Scores who is most likely to buy" },
            ],
          },
        ],
      },

      confirmation: {
        title: "Three paths to delivery. Switch one off.",
        subtitle: "Access still goes out through the other two.",
        payment: "Payment made",
        delivered: "Delivered",
        offline: "Path offline",
        allDownTitle: "All three at once doesn't happen",
        allDown:
          "The paths are independent: webhook and reconciliation run on separate servers, and the chat button is triggered by the customer. This scenario exists here only to show the limit.",
        paths: [
          { name: "Webhook", detail: "The processor notifies on payment" },
          { name: "Reconciliation", detail: "Wone sweeps payments on a cycle" },
          { name: "Check payment", detail: "The customer confirms via the chat button" },
        ],
      },

      checkout: {
        title: "The same plan. Each country's currency.",
        subtitle:
          "Pick a country and see the customer's checkout. Illustrative amounts, no live rate.",
        product: "Annual VIP Plan",
        productNote: "Channel access for 12 months",
        payWith: "Pay with",
        disclaimer: "Illustrative amounts, not live exchange rates.",
        /* Uma linha por `code` da tabela de Pagamentos — veja `pt.ts`. */
        prices: [
          { code: "BRL", amount: 197 },
          { code: "MXN", amount: 650 },
          { code: "ARS", amount: 38000 },
          { code: "COP", amount: 155000 },
          { code: "USD", amount: 197 },
          { code: "EUR", amount: 180 },
          { code: "GBP", amount: 155 },
        ],
      },
    },
  },

  howItWorks: {
    kicker: "How it works",
    /* A tese são os dois lados da venda — você, o cliente, a Wone —, não mais
       dois dos três passos de configuração. O porquê está em `pt.ts`. */
    thesis: ["You wire it up.", "The buyer pays.", "Wone delivers."],
    lead: "Bot, funnel and gateway: three connections you make once. After that, every sale happens without you. Pick a step and watch both sides — your dashboard and the customer's chat.",
    /* A descrição mora no compartimento abaixo das quatro abas, na largura toda
       do trilho (o porquê está em `pt.ts`): o teto é ~110 caracteres em duas
       linhas, e o inglês é o idioma que chega mais perto dele. `facts` são os
       três fatos do passo, na fileira abaixo do palco — cada um já é afirmado em
       outra seção, dito aqui na voz do passo. */
    steps: [
      {
        step: "01",
        title: "Connect your bot",
        description: "Paste the token from @BotFather. Wone keeps the bot online.",
        facts: [
          {
            term: "Token from @BotFather",
            text: "You paste it once; Wone registers the commands and the webhook.",
          },
          {
            term: "Wone keeps the bot online",
            text: "Nothing to host, nothing to restart by hand.",
          },
          {
            term: "Several bots, one account",
            text: "Within the limit set for your access.",
          },
        ],
      },
      {
        step: "02",
        title: "Build your funnel",
        description: "A ready funnel in tabs or an editor with 28 blocks, 4 of them AI. Same account.",
        facts: [
          {
            term: "A ready funnel in tabs",
            text: "In Wone Static you just fill the funnel in and publish.",
          },
          {
            term: "28 blocks, 4 of them AI",
            text: "In Wone Flows you drag blocks to build the logic, no code.",
          },
          {
            term: "Both paths",
            text: "Wone Static and Wone Flows live in the same account.",
          },
        ],
      },
      {
        step: "03",
        title: "Connect your gateway",
        description: "Your own processor account. Add a backup: if one goes down, the other takes over.",
        facts: [
          {
            term: "The money lands in your account",
            text: "It's your processor account; Wone never touches the money.",
          },
          {
            term: "Backup gateway",
            text: "If the first one fails to charge, the next takes over.",
          },
          {
            /* Sem contagem de países: ver `pt.ts`. */
            term: "Each country's own currency",
            text: "PIX, SPEI, Nequi, MB WAY or card: the local method.",
          },
        ],
      },
      {
        step: "04",
        title: "The sale happens",
        description: "The customer pays, gets the single-use invite and joins the channel. Without you.",
        facts: [
          {
            term: "Single-use invite",
            text: "The same payment never unlocks access twice.",
          },
          {
            term: "Three confirmation paths",
            text: "Webhook, reconciliation and the button in the chat, independent.",
          },
          {
            term: "All in the dashboard",
            text: "Revenue by hour, funnel, LTV, rates and statement.",
          },
        ],
      },
    ],

    /* Só os nomes: são as duas abas do painel no passo 02 (ver `pt.ts`). */
    paths: [{ name: "Wone Static" }, { name: "Wone Flows" }],

    listLink: "Join the list",

    /* Rótulos da sala de operação. Nenhum valor é cunhado aqui, e o valor da
       venda é um só nos dois objetos (`phone.transactions[0].amount`) — ver
       `pt.ts`. */
    demo: {
      counter: "{n} of 4",
      groups: { setup: "You do this once", runtime: "Then, on every sale" },
      announce: "Step {n} of 4: {title}",
      tokenLabel: "Bot token",
      botOnline: "Bot online",
      connected: "Bot connected",
      gatewayMain: "Primary",
      gatewayBackup: "On standby",
      hand: "From here on, it's your customer.",
      inviteSent: "Invite sent",
      statement: "In your statement",

      /* A tela grande: o painel de verdade, rótulo por rótulo dos prints do
         editor. Nomes de tela e estados de UI, nunca afirmação de produto (ver
         `pt.ts`). O logotipo, o nome do usuário e as iniciais do avatar não se
         traduzem; as mensagens do chat vêm em inglês equivalente. */
      panel: {
        wordmark: "wone",
        greeting: "Good afternoon,",
        user: "User",
        date: "October 15, 2026",
        notifications: "2",
        avatar: "PC",

        navGroups: ["Operation", "Build"],
        nav: [
          ["Dashboard", "Clients", "Financial", "Analytics", "Access Map"],
          ["Bots", "Flows", "Conversations", "Remarketing", "Links", "Pages"],
        ],
        billing: "Revenue",

        flowName: "Welcome and good sales",
        counts: "{n} nodes · {e} links",
        countsNew: "{n} new nodes, {e} new links",
        tools: ["Undo", "Redo", "Arrange", "Fit", "Create with AI", "Test", "Metrics", "Delete"],
        nodesPanel: "Nodes",
        history: "History",
        publish: "Publish",
        draftSaved: "Draft saved",
        watermark: "WONE",

        nodeTypes: {
          start: "Start",
          text: "Text",
          ai: "AI Chat",
          charge: "Create charge",
          await: "Await payment",
          deliver: "Deliver access",
          end: "End",
        },
        nodePorts: {
          limit: "limit",
          created: "created",
          paid: "paid",
          expired: "expired",
          delivered: "delivered",
        },
        aiPrompt: "You are the channel's sales assistant. If…",
        aiTuning: "5 messages · thinks 15 s",
        nodeMessages: [
          "Hi! I'm the Wone Bot 👋 Tell me what you're after and I'll show you the right plan.",
          "I've got the right plan for you 👇 VIP Annual: 12 months of channel access for $197.00. Generating your PIX now.",
          "Your PIX expired ⏳ Whenever you want, just send /start and I'll generate another one.",
        ],

        botChecks: ["Token validated", "Commands registered", "Channel linked"],
        webhook: "Webhook active",
        hourly: "Revenue by hour",
        now: "now",
      },

      /* O aparelho do cliente. */
      chat: {
        welcome: "Hi! I'm the Wone Bot. Tap start and I'll show you the plans.",
      },
    },
  },

  features: {
    kicker: "Features",
    title: "Order bump on the same PIX. Renewal before expiry.",
    lead: "Plans from monthly to lifetime, packs with a preview, open PIX and a test mode with no real charges. Ten features, one at a time; use the arrows.",
    prev: "Previous feature",
    next: "Next feature",
    /* Só rótulo: os valores dos mini-mockups vêm de `phone.transactions`. */
    mockup: {
      bump: "Add to order",
      preview: "Preview",
      reminder: "Reminder sent",
      /* Os cinco rótulos das placas que entraram em 15/10; veja `pt.ts`. */
      bought: "Bought",
      declined: "Declined",
      freeAmount: "Whatever the customer picks",
      noCharge: "No real charge",
      abTest: "A/B test",
    },
    items: [
      {
        id: "bump",
        title: "Order bump",
        description: "Already paying? The add-on goes on the same PIX, at checkout.",
      },
      {
        id: "upsell",
        title: "Upsell and downsell",
        description: "Bought? A bigger offer follows. Dropped off? A smaller one does.",
      },
      {
        id: "packs",
        title: "Packs",
        description: "Sell standalone content. The customer sees a preview before buying.",
      },
      {
        id: "plans",
        title: "Flexible plans",
        description: "Monthly, quarterly, six-month, annual or lifetime.",
      },
      {
        id: "subscription",
        title: "Subscription and renewal",
        description: "Expired? A reminder before, automatic removal after.",
      },
      {
        id: "openPix",
        title: "Open PIX",
        description: "How much will they pay? They pick the amount within the range you set.",
      },
      {
        id: "testMode",
        title: "Test mode",
        description: "Want to check first? Walk the funnel on Telegram with no real charge.",
      },
      {
        id: "remarketing",
        title: "Remarketing",
        description: "Segmented campaigns, with A/B testing and scheduling.",
      },
      {
        id: "delivery",
        title: "Automatic delivery",
        description: "Paid? The single-use invite goes out at once, to channel or group.",
      },
      {
        id: "ai",
        title: "AI in the funnel",
        description: "Four AI blocks talk to, classify and qualify your leads.",
      },
    ],
  },

  payments: {
    kicker: "Payments",
    title: "INTERNATIONAL checkout",
    /* Lead refeito em 15/10 — veja `pt.ts`: é o pedido da diretoria do dono
       (integrações próprias, não via Stripe, menores taxas do mercado). */
    lead: "Real, pesos, dollars, euros and pounds. Customers pay the way they already pay at home — PIX, SPEI, Nequi, MB WAY, card. Our own integrations with each payment method, not via Stripe, at the lowest fees on the market.",

    /** Os sete países de 15/10 e os métodos da Dotfy — veja `pt.ts`. */
    table: {
      headers: {
        country: "Country",
        methods: "Pays with",
        currency: "Currency",
        plan: "Plan",
      },
      planLabel: "Annual VIP Plan",
      /* Um método por item — veja `pt.ts`. */
      countries: [
        {
          name: "Brazil",
          /* Nomes de produto ficam como a marca escreve, mesmo em inglês: PIX,
             Pix Automático, MB WAY. Só o que é substantivo comum traduz
             (boleto, dinheiro, cartão). */
          methods: [
            "PIX",
            "Pix Automático",
            "Registered boleto",
            "Card up to 12x · 3DS",
            "Apple Pay",
            "Google Pay",
          ],
          code: "BRL",
          symbol: "R$",
          currency: "Brazilian real",
        },
        {
          name: "Mexico",
          methods: ["SPEI", "Cash at stores"],
          code: "MXN",
          symbol: "$",
          currency: "Mexican peso",
        },
        {
          name: "Argentina",
          methods: ["CVU / CBU transfer", "Cash"],
          code: "ARS",
          symbol: "$",
          currency: "Argentine peso",
        },
        {
          name: "Colombia",
          methods: ["Nequi", "Daviplata", "Bancolombia", "Efecty", "PSE"],
          code: "COP",
          symbol: "$",
          currency: "Colombian peso",
        },
        {
          /* O `code` é a MOEDA, e o Equador paga em dólar — veja `pt.ts`. */
          name: "Ecuador",
          methods: ["Transfer", "Cash"],
          code: "USD",
          symbol: "$",
          currency: "US dollar",
        },
        {
          name: "Portugal",
          methods: ["MB WAY"],
          code: "EUR",
          symbol: "€",
          currency: "Euro",
        },
        {
          name: "United Kingdom",
          methods: ["Card"],
          code: "GBP",
          symbol: "£",
          currency: "Pound sterling",
        },
      ],
      notes: [
        "Illustrative amounts, no live exchange rate.",
        "Your own checkout in each country, in local currency.",
      ],
    },

    block2Title: "The money lands in your account. The click comes back as data.",

    /** "Our own integrations" abre e "Fees made to measure" fecha — veja `pt.ts`. */
    guarantees: [
      {
        num: "01",
        term: "Our own integrations",
        text: "Not via Stripe: Wone integrates straight with each payment method, and the money lands in your account.",
      },
      {
        num: "02",
        term: "Backup gateway",
        text: "If one goes down, the next takes over. Set up more than one.",
      },
      {
        num: "03",
        term: "No double delivery",
        text: "The same payment never grants access twice.",
      },
      {
        num: "04",
        term: "Fees made to measure",
        text: "The lowest fees on the market, tailored to each operation.",
      },
    ],

    tracking: {
      title: "Tracking",
      lead: "From the ad click to the confirmed sale, server to server. Meta, TikTok, Kwai and X.",
      /** Três campos por nó — veja `pt.ts`. */
      flow: [
        { label: "Ad click", detail: "", chips: ["Meta", "TikTok", "Kwai", "X"], code: "utm_source" },
        { label: "Bot start", detail: "UTM and sale code stored", chips: [], code: "/start" },
        { label: "PIX generated", detail: "Event sent server to server", chips: [], code: "" },
        { label: "Sale confirmed", detail: "Conversion attributed to the campaign", chips: [], code: "" },
        { label: "Delivery page", detail: "Pixel improves data quality", chips: [], code: "" },
      ],
    },
  },

  analytics: {
    kicker: "Analytics",
    title: "Which hour sells most. Where leads drop.",
    lead: "Revenue by hour, funnel, LTV, rates and statement, in one dashboard. Click a tab to see each one; the sample is illustrative.",
    simulationLabel: "Simulation",
    /** O aviso das cinco vistas, numa chave só — veja `pt.ts`. */
    sampleNote: "Illustrative sample. No customer data.",
    views: [
      {
        id: "faturamento",
        label: "Revenue by day and by hour, to find your best selling window",
        short: "Revenue",
      },
      {
        id: "funil",
        /* Sem "full": veja `pt.ts`. */
        label: "Every funnel step: start, PIX generated and payment",
        short: "Funnel",
      },
      {
        id: "ltv",
        label: "LTV and average time to purchase, over the subscription",
        short: "LTV",
      },
      {
        id: "taxas",
        label: "Upsell, downsell, order bump and recovery rates, with the numbers behind each",
        short: "Rates",
      },
      {
        id: "extrato",
        label: "Transaction statement by period, flow and gateway",
        short: "Statement",
      },
    ],
    panel: {
      accumulated: "so far today",
      peak: "peak",
      funnelNote: "who generated the PIX and didn't pay enter automatic recovery.",
      funnelSteps: ["Started the bot", "Generated the PIX key", "Completed the purchase"],
      ltvRows: [
        { label: "Average LTV", value: "$486.00" },
        { label: "Time to first purchase", value: "14 min" },
        { label: "Average retention", value: "4.2 months" },
        { label: "Renewal at expiry", value: "71%" },
      ],
      rateRows: [
        { label: "Order bump", value: 34 },
        { label: "Upsell", value: 22 },
        { label: "Downsell", value: 11 },
        { label: "PIX recovery", value: 24 },
      ],
      statementRows: [
        { time: "21:47", flow: "Annual VIP Plan", gateway: "Dotfy", value: "$197.00" },
        { time: "21:31", flow: "Order bump, Pack", gateway: "Dotfy", value: "$47.00" },
        { time: "20:58", flow: "Monthly Plan", gateway: "Mercado Pago", value: "$97.00" },
        { time: "20:12", flow: "Quarterly Plan", gateway: "Dotfy", value: "$247.00" },
      ],
      statementHeaders: ["Time", "Flow", "Gateway", "Amount"],
    },
  },

  security: {
    kicker: "Security and access",
    title: "Content stays in the channel. Keys stay in the vault.",
    items: [
      {
        term: "2FA",
        summary: "a code that only exists on your device",
        title: "Two-factor authentication (2FA)",
        detail:
          "Beyond the password, the dashboard asks for a code that only exists on your device. Even if someone learns your password, they can't get in.",
      },
      {
        term: "Anti-cloning",
        summary: "leads can't forward, save or copy",
        title: "Content anti-cloning",
        detail:
          "Channel content is locked against forwarding and copying. Those who paid consume it; those who didn't don't get it for free.",
      },
      {
        term: "Isolated accounts",
        summary: "no data crosses with another producer",
        title: "Isolated accounts",
        detail:
          "Every account runs in its own space. None of your data ever crosses with another producer's on the platform.",
      },
      {
        term: "Vault",
        summary: "tokens and keys encrypted at rest",
        title: "Secret vault",
        detail:
          "Bot tokens and gateway keys are encrypted at rest. Not even the Wone team reads their contents.",
      },
    ],
  },

  faq: {
    kicker: "FAQ",
    title: "What everyone asks before joining the list.",
    items: [
      {
        question: "Do I need to know how to code?",
        answer:
          "No. In Wone Static you just fill in the funnel in tabs. In Wone Flows you build the logic by dragging blocks, without writing code.",
      },
      {
        question: "Does the money pass through Wone?",
        answer:
          "No. You connect your own payment processor account and the sale amount lands directly in it.",
      },
      {
        question: "How many bots can I connect?",
        answer:
          "You can connect several bots to the same account, within the limit set for your access. Talk to us if you need more.",
      },
      {
        question: "Can I sell outside Brazil?",
        /* Os seis países da tabela de Pagamentos, na ordem dela — veja `pt.ts`. */
        answer:
          "Yes. Wone lets you charge customers in Mexico, Argentina, Colombia, Ecuador, Portugal and the United Kingdom in local currency, with its own checkout.",
      },
      {
        question: "What happens if a gateway goes down?",
        answer:
          "You can set up several gateways in order. If the first doesn't create the charge, the next takes over automatically and the customer isn't left waiting.",
      },
      {
        question: "How does the customer get access?",
        answer:
          "As soon as payment is confirmed, Wone creates a single-use invite to the channel or group and sends it in chat. If anything fails, you're told why and the customer gets a clear message.",
      },
      {
        question: "Is Wone official Telegram software?",
        answer:
          "No. Wone is an independent platform that uses the Telegram bot API.",
      },
    ],
  },

  /** O prefácio da vitrine; os quatro marcos vêm de `awards.items`. */
  awardsPreface: {
    kicker: "What's ahead",
    title: "The road to a million has four stops. Every one of them ships to your door.",
    lead: "Each revenue milestone on Telegram comes with an acrylic trophy and the milestone's item: a pin, a bracelet, a necklace, an 18k gold ring. The full showcase is further down.",
    link: "See the showcase",
  },

  awards: {
    kicker: "Awards",
    title: "At ten thousand dollars, a pin. At a million, an 18k gold ring.",
    lead: "At every revenue milestone on Telegram, the trophy and that milestone's item arrive at your door. Tap a milestone to see it.",
    physicalItem: "Physical item shipped",

    dragHint: "Drag to spin",

    simulator: {
      title: "When does yours arrive?",
      sliderLabel: "Your monthly revenue on Telegram",
      note: "Simple math: the milestone divided by what you make per month.",
      month: "1 month",
      months: "{n} months",
    },
    items: [
      {
        tier: "10K",
        amount: 10000,
        image: "/placas/placa-10k.webp",
        /** A arte IMPRESSA, recortada da ilustração por
            `scripts/recorta-placas.mjs`: é ela que entra dentro do bloco de
            acrílico na cena 3D. O `image` acima continua sendo a ilustração
            inteira do troféu — o fallback 2D, onde não há WebGL. */
        print: "/placas/arte-10k.webp",
        /** A joia do marco, como imagem. O 10K ainda não tem a sua. */
        photo: "",
        /** Vestida — a foto já vem sobre o dorso ou o pulso desenhado — aparece
            uma vez ao lado da placa; solta, repete nos quatro cantos. */
        photoWorn: false,
        title: "The 10K Bronze Trophy",
        milestoneLine: "$10,000 in revenue",
        subtitle: "The first scale",
        description:
          "Your operation validated and the first few hundred members in your VIP community.",
        awardItem: "Official Wone bronze pin + scale certificate",
        accent: "#D97706",
      },
      {
        tier: "100K",
        amount: 100000,
        image: "/placas/placa-100k.webp",
        print: "/placas/arte-100k.webp",
        photo: "/images/pulseira-100k-vestida.webp",
        photoWorn: true,
        title: "The 100K Crystal Plaque",
        milestoneLine: "$100,000 in revenue",
        subtitle: "The 6-figure club",
        description:
          "A trophy in a faceted crystal acrylic block with the 100K Wone Fox. Comes with the official Wone bracelet in titanium.",
        awardItem: "Crystal acrylic trophy + official titanium bracelet",
        accent: "#E4E4E7",
      },
      {
        tier: "500K",
        amount: 500000,
        image: "/placas/placa-500k.webp",
        print: "/placas/arte-500k.webp",
        photo: "/images/colar-500k-vestido.webp",
        photoWorn: true,
        title: "The Half-Million Ceremonial Plaque",
        milestoneLine: "$500,000 in revenue",
        subtitle: "Half a million in revenue",
        description:
          "A special acrylic trophy with the Wone Fox in ceremonial dress and a chrome crest in high relief. Comes with the necklace with a sapphire-and-diamond pendant.",
        awardItem: "500K high-relief trophy + sapphire-and-diamond necklace",
        accent: "#EAB308",
      },
      {
        tier: "1M",
        amount: 1000000,
        image: "/placas/placa-1m.webp",
        print: "/placas/arte-1m.webp",
        photo: "/images/anel-1m.webp",
        photoWorn: false,
        title: "The Million-Dollar Black Diamond Plaque",
        milestoneLine: "$1,000,000 in revenue",
        subtitle: "The 7-figure club",
        description:
          "A Wone 1M trophy for producers who reached seven figures on Telegram. Comes with the championship ring in 18k gold and black titanium, engraved “1M WONE BOT”.",
        awardItem: "1M trophy + 18k gold and black titanium ring",
        accent: "#FF7700",
      },
    ],
  },

  cta: {
    kicker: "Access",
    titleLines: ["You join the list.", "Batches go in order.", "Wone calls you."],
    lead: "No card. Access is invite-only, released in batches, and yours arrives by email.",
    bullets: [
      { term: "Sign-up", detail: "name, email and country; Telegram and phone if you like" },
      { term: "Batches", detail: "invites in sign-up order" },
      { term: "Invite", detail: "arrives by email" },
    ],
    telegramLink: "or talk to us on Telegram",
    success: { title: "You're in line." },
  },

  form: {
    name: "Name",
    namePlaceholder: "What should we call you",
    email: "Email",
    emailPlaceholder: "you@example.com",
    nationality: "Nationality",
    telegram: "Telegram username",
    telegramPlaceholder: "@yourusername",
    phone: "WhatsApp / Phone",
    /** O exemplo aqui NÃO é o brasileiro do `pt.ts`: quem lê o site em inglês
        digita o número do país dele, e um DDI +55 com DDD de São Paulo sugere
        um formato obrigatório que o campo não exige. O 555 é a faixa reservada
        para número fictício, então ninguém liga para alguém por engano. */
    phonePlaceholder: "+1 555 000 0000",
    optional: "(optional)",
    submit: "Join the waitlist",
    sending: "Sending…",
    disclaimer: "Invite-only. No spam.",
    /* O título do sucesso saiu daqui: é `cta.success.title`. Veja `pt.ts`. */
    successBody: "We opened Telegram in another tab. If it didn't appear, use the button.",
    /** Quando o `window.open` foi barrado; veja `pt.ts`. */
    successBodyManual: "Open Telegram using the button below.",
    successNote: "When your batch opens, the invite arrives by email.",
    openTelegram: "Open Telegram",
    again: "Register another contact",

    /**
     * Só os rótulos; a lista canônica de códigos é `NATIONALITIES`, em
     * `src/lib/waitlist.ts`, e tem de bater com os cinco daqui. Veja `pt.ts`.
     */
    countries: [
      { code: "BR", label: "Brazil" },
      { code: "AR", label: "Argentina" },
      { code: "MX", label: "Mexico" },
      { code: "CO", label: "Colombia" },
      { code: "OT", label: "Other country" },
    ],

    /** Chaves = códigos de `src/lib/waitlist-errors.ts`; veja `pt.ts`. */
    errors: {
      name_missing: "Enter your name.",
      email_invalid: "Enter a valid email address.",
      nationality_invalid: "Select a nationality from the list.",
      invalid_fields: "Check the highlighted fields.",
      field_too_long: "One of the fields is longer than allowed.",
      too_large: "The data you sent is too large.",
      unreadable_body: "We couldn't read the data you sent.",
      rate_limited: "Too many attempts in a row. Wait a minute and try again.",
      save_failed: "We couldn't register you right now. Try again in a moment.",
      network: "No connection to the server. Try again.",
      unknown: "We couldn't send it. Try again.",
    },
  },

  footer: {
    tagline: "Billing, delivery and tracking infrastructure for selling on Telegram.",
    columns: { product: "Product", integrations: "Integrations", company: "Company" },
    listLink: "Join the list",

    /** Slots de contato; vazio não renderiza. Veja `pt.ts`. */
    company: {
      email: "",
      telegram: "",
      terms: "",
      privacy: "",
      labels: {
        email: "Email",
        telegram: "Telegram",
        terms: "Terms of use",
        privacy: "Privacy",
      },
    },
    legalEntity: "",
    copyright: "© 2026 Wone Bot.",
    disclaimer:
      "Wone is an independent SaaS platform with no corporate affiliation with, or endorsement from, Telegram.",
    languageLabel: "Language",
  },

  /** Slots de prova real; vazio não renderiza. Veja `pt.ts`. */
  proof: {
    numbers: [],
    names: [],
  },

  ui: {
    pause: "pause",
    play: "play",
    simulation: "Simulation",
    of: "of",
  },

  phone: {
    botName: "Wone Bot",
    online: "online",
    approved: "Payment approved",
    inviteNote: "single-use link",
    /** O campo inerte no pé da tela do telefone do hero — veja `pt.ts`. */
    composer: "Message",
    /* `received`, `monthStart` e `success` saíram com o telefone do hero, que
       virou o chat do cliente — veja `pt.ts`. `transactions` fica. */
    transactions: [
      { label: "Annual VIP Plan", amount: "$197.00", value: 197 },
      { label: "Quarterly Plan", amount: "$147.00", value: 147 },
      { label: "Monthly Plan", amount: "$97.00", value: 97 },
      { label: "Single pack", amount: "$67.00", value: 67 },
      /* Vírgula, não ponto-médio — veja `pt.ts`. */
      { label: "Order bump, Pack", amount: "$57.00", value: 57 },
      { label: "Six-Month Plan", amount: "$227.00", value: 227 },
      { label: "Lifetime access", amount: "$247.00", value: 247 },
    ],
  },
};

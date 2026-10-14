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
    kicker: "Billing, delivery and tracking · Brazil, Argentina, Mexico and Colombia",
    kickerShort: "Billing, delivery and tracking",

    /**
     * As duas outras opções de título, equivalentes às do `pt.ts`:
     *   2. "They pay, they are in the channel"       — accent on "in"
     *   3. "Telegram that charges and delivers itself" — accent on "itself"
     */
    titleStart: "Sell on Telegram on",
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
        value: "4 countries",
        label: "Real and Argentine, Mexican and Colombian pesos at checkout",
      },
      {
        value: "3 paths",
        label: "Webhook, reconciliation and a chat button, all the way to delivery",
      },
      { value: "28 blocks", label: "Visual funnel editor, 4 of them AI" },
    ],

    pause: { pause: "pause", play: "play" },
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
    title: "The customer pays. Wone checks. The invite lands.",
    lead: "From payment to access, in the same account: PIX or card, three confirmation paths, a single-use invite in chat. Click a number to watch each part run.",
    simulationLabel: "Simulation",
    items: [
      {
        /* Veja `pt.ts`: o 1,2 s sai da grade e fica no título da demo, dentro
           do painel rotulado "Simulation". */
        icon: "Zap",
        value: 1,
        decimals: 0,
        suffix: "",
        title: "One invite per payment",
        description:
          "From confirmed PIX to the invite in chat. Your customer pays at 3am and joins the channel right away, with no action from you.",
      },
      {
        icon: "Boxes",
        value: 28,
        decimals: 0,
        suffix: "",
        title: "Editor blocks",
        description:
          "Conditions, waits, tags and integrations to design any funnel. Four of them are AI blocks, to chat with and qualify leads.",
      },
      {
        icon: "ShieldCheck",
        value: 3,
        decimals: 0,
        suffix: "",
        title: "Confirmation paths",
        description:
          "Webhook, automatic reconciliation and a “Check payment” button in chat. If one fails, the other two still deliver.",
      },
      {
        icon: "Globe",
        value: 4,
        decimals: 0,
        suffix: "",
        title: "Countries, local currency",
        description:
          "Brazil, Argentina, Mexico and Colombia. Customers see the price in their own currency and pay the way they already do.",
      },
    ],

    demos: {
      delivery: {
        title: "From PIX to access in 1.2 s",
        subtitle: "A simulation of a payment at 3:14 am, with nobody on your team awake.",
        clock: "03:14",
        clockNote: "Nobody on your team is awake",
        replay: "Run it again",
        done: "Access granted",
        steps: [
          { label: "PIX confirmed", detail: "The processor notifies Wone" },
          { label: "Webhook received", detail: "Payment checked and validated" },
          { label: "Single-use link created", detail: "A one-time invite to the channel" },
          { label: "Invite sent", detail: "The customer gets it in chat" },
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
        prices: [
          { code: "BRL", display: "197.00" },
          { code: "ARS", display: "38,000" },
          { code: "MXN", display: "650" },
          { code: "COP", display: "155,000" },
        ],
      },
    },
  },

  howItWorks: {
    kicker: "How it works",
    thesis: ["Paste the token.", "Build the funnel.", "Wone delivers."],
    lead: "Bot, funnel, gateway, sale. You set it up once; Wone keeps the bot online and the operation runs on its own. Scroll to watch the four steps.",
    steps: [
      {
        step: "01",
        icon: "telegram",
        title: "Connect your bot",
        description:
          "Paste the token from @BotFather and you're done. Wone keeps the bot online.",
      },
      {
        step: "02",
        icon: "funnel",
        title: "Build your funnel",
        description:
          "Fill in the ready-made funnel in tabs, or design your own in the visual editor.",
      },
      {
        step: "03",
        icon: "gateway",
        title: "Connect your gateway",
        description: "Use your own processor account. The money lands straight in it.",
      },
      {
        step: "04",
        icon: "money",
        title: "Sell and follow along",
        description:
          "The customer pays, gets access immediately, and you follow everything from the dashboard.",
      },
    ],

    paths: [
      {
        name: "Wone Static",
        text: "A ready funnel in tabs: welcome, plans, order bump, upsell, downsell, packs and renewal. You fill it in, Wone runs it.",
      },
      {
        name: "Wone Flows",
        text: "A visual editor with 28 blocks, 4 of them AI; simulator and test mode in the dashboard; per-block metrics to see where leads drop.",
      },
    ],

    listLink: "Join the list",

    stage: {
      counter: "{n} of 4",
      states: { waiting: "PIX · pending", confirmed: "PIX · confirmed" },
    },
  },

  features: {
    kicker: "Features",
    title: "Order bump on the same PIX. Renewal before expiry.",
    lead: "Plans from monthly to lifetime, packs with a preview, open PIX and a test mode with no real charges. Ten features, one at a time; use the arrows.",
    prev: "Previous feature",
    next: "Next feature",
    items: [
      {
        title: "Order bump",
        description: "Already paying? The add-on goes on the same PIX, at checkout.",
        icon: "ShoppingBag",
      },
      {
        title: "Upsell and downsell",
        description: "Bought? A bigger offer follows. Dropped off? A smaller one does.",
        icon: "TrendingUp",
      },
      {
        title: "Packs",
        description: "Sell standalone content. The customer sees a preview before buying.",
        icon: "Boxes",
      },
      {
        title: "Flexible plans",
        description: "Monthly, quarterly, six-month, annual or lifetime.",
        icon: "Calendar",
      },
      {
        title: "Subscription and renewal",
        description: "Expired? A reminder before, automatic removal after.",
        icon: "RefreshCw",
      },
      {
        title: "Open PIX",
        description: "How much will they pay? They pick the amount within the range you set.",
        icon: "Sliders",
      },
      {
        title: "Test mode",
        description: "Want to check first? Walk the funnel on Telegram with no real charge.",
        icon: "TestTube",
      },
      {
        title: "Remarketing",
        description: "Segmented campaigns, with A/B testing and scheduling.",
        icon: "Megaphone",
      },
      {
        title: "Automatic delivery",
        description: "Paid? The single-use invite goes out at once, to channel or group.",
        icon: "Zap",
      },
      {
        title: "AI in the funnel",
        description: "Four AI blocks talk to, classify and qualify your leads.",
        icon: "Bot",
      },
    ],
  },

  payments: {
    kicker: "Payments",
    title: "INTERNATIONAL checkout",
    lead: "Real and Argentine, Mexican and Colombian pesos. Customers pay the way they already pay at home: PIX, card, SPEI or PSE. The money lands in your own processor account.",

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
          methods: ["PIX", "Card"],
          code: "BRL",
          symbol: "R$",
          currency: "Brazilian real",
        },
        {
          name: "Argentina",
          methods: ["Local card"],
          code: "ARS",
          symbol: "$",
          currency: "Argentine peso",
        },
        {
          name: "Mexico",
          methods: ["Card", "SPEI"],
          code: "MXN",
          symbol: "$",
          currency: "Mexican peso",
        },
        {
          name: "Colombia",
          methods: ["Card", "PSE"],
          code: "COP",
          symbol: "$",
          currency: "Colombian peso",
        },
      ],
      notes: [
        "Illustrative amounts, no live exchange rate.",
        "Your own checkout in each country, in local currency.",
      ],
    },

    block2Title: "The money lands in your account. The click comes back as data.",

    guarantees: [
      {
        num: "01",
        term: "Your own processor account",
        text: "The money lands straight in it; Wone never touches it.",
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
    ],

    tracking: {
      title: "Tracking",
      lead: "From the ad click to the confirmed sale, server to server. Meta, TikTok, Kwai and X.",
      flow: [
        { label: "Ad click", detail: "Meta, TikTok, Kwai or X" },
        { label: "Bot start", detail: "UTM and sale code stored" },
        { label: "PIX generated", detail: "Event sent server to server" },
        { label: "Sale confirmed", detail: "Conversion attributed to the campaign" },
        { label: "Delivery page", detail: "Pixel improves data quality" },
      ],
      benefits: [
        "Meta, TikTok, Kwai, X, UTMify and Otimizey integrated, sending server to server.",
        "Trackable links with click analysis, bot filtering and an access map.",
        "Sale codes to measure every campaign and creative.",
      ],
    },
  },

  analytics: {
    kicker: "Analytics",
    title: "Which hour sells most. Where leads drop.",
    lead: "Revenue by hour, funnel, LTV, rates and statement, in one dashboard. Click a tab to see each one; the sample is illustrative.",
    simulationLabel: "Simulation",
    views: [
      {
        id: "faturamento",
        icon: "BarChart3",
        label: "Revenue by day and by hour, to find your best selling window",
        short: "Revenue",
        panelTitle: "Revenue by hour",
        panelSubtitle: "Illustrative sample of one day of operation",
      },
      {
        id: "funil",
        icon: "Filter",
        /* Sem "full": veja `pt.ts`. */
        label: "Every funnel step: start, PIX generated and payment",
        short: "Funnel",
        panelTitle: "Funnel of 100 leads",
        panelSubtitle: "From bot start to completed purchase",
      },
      {
        id: "ltv",
        icon: "Users",
        label: "LTV and average time to purchase",
        short: "LTV",
        panelTitle: "Value per customer",
        panelSubtitle: "What each member leaves over the subscription",
      },
      {
        id: "taxas",
        icon: "Percent",
        label: "Upsell, downsell, order bump and recovery rates, with the numbers behind each",
        short: "Rates",
        panelTitle: "Funnel rates",
        panelSubtitle: "Where the extra revenue is earned",
      },
      {
        id: "extrato",
        icon: "Receipt",
        label: "Transaction statement by period, flow and gateway",
        short: "Statement",
        panelTitle: "Transaction statement",
        panelSubtitle: "By period, flow and gateway",
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
        icon: "KeyRound",
        term: "2FA",
        summary: "a code that only exists on your device",
        title: "Two-factor authentication (2FA)",
        detail:
          "Beyond the password, the dashboard asks for a code that only exists on your device. Even if someone learns your password, they can't get in.",
      },
      {
        icon: "CopySlash",
        term: "Anti-cloning",
        summary: "leads can't forward, save or copy",
        title: "Content anti-cloning",
        detail:
          "Channel content is locked against forwarding and copying. Those who paid consume it; those who didn't don't get it for free.",
      },
      {
        icon: "Network",
        term: "Isolated accounts",
        summary: "no data crosses with another producer",
        title: "Isolated accounts",
        detail:
          "Every account runs in its own space. None of your data ever crosses with another producer's on the platform.",
      },
      {
        icon: "Vault",
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
        answer:
          "Yes. Wone lets you charge customers in Argentina, Mexico and Colombia in local currency, with its own checkout.",
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

  awards: {
    kicker: "Awards",
    title: "At ten thousand dollars, a pin. At a million, an 18k gold ring.",
    lead: "At every revenue milestone on Telegram, the trophy and that milestone's item arrive at your door. Tap a milestone to see it.",
    physicalItem: "Physical item shipped",
    items: [
      {
        tier: "10K",
        image: "/placas/placa-10k.webp",
        /** A joia do marco, como imagem. O 10K ainda não tem a sua. */
        photo: "",
        /** Vestida — a foto já vem sobre o dorso ou o pulso desenhado — aparece
            uma vez ao lado da placa; solta, repete nos quatro cantos. */
        photoWorn: false,
        title: "Bronze Trophy 10K",
        milestoneLine: "$10,000 in revenue",
        subtitle: "The first scale",
        description:
          "Your operation validated and the first few hundred members in your VIP community.",
        awardItem: "Official Wone bronze pin + scale certificate",
        accent: "#D97706",
      },
      {
        tier: "100K",
        image: "/placas/placa-100k.webp",
        photo: "/images/pulseira-100k-vestida.webp",
        photoWorn: true,
        title: "100K Acrylic Plaque",
        milestoneLine: "$100,000 in revenue",
        subtitle: "The 6-figure club",
        description:
          "A trophy in a faceted crystal acrylic block with the 100K Wone Fox. Comes with the official Wone bracelet in titanium.",
        awardItem: "Crystal acrylic trophy + official titanium bracelet",
        accent: "#E4E4E7",
      },
      {
        tier: "500K",
        image: "/placas/placa-500k.webp",
        photo: "/images/colar-500k-vestido.webp",
        photoWorn: true,
        title: "500K Ceremonial Plaque",
        milestoneLine: "$500,000 in revenue",
        subtitle: "Half a million in revenue",
        description:
          "A special acrylic trophy with the Wone Fox in ceremonial dress and a chrome crest in high relief. Comes with the necklace with a sapphire-and-diamond pendant.",
        awardItem: "500K high-relief trophy + sapphire-and-diamond necklace",
        accent: "#EAB308",
      },
      {
        tier: "1M",
        image: "/placas/placa-1m.webp",
        photo: "/images/anel-1m.webp",
        photoWorn: false,
        title: "1M Black Diamond Plaque",
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
    title: "Join the list. The next batch goes out in sign-up order.",
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
    successTitle: "All set — you're in the queue.",
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
    received: "Received in this simulation",
    /** Zero: o total soma só o que o visitante viu. Veja `pt.ts`. */
    monthStart: 0,
    success: "Success",
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
    ariaLabel:
      "A simulation of the Wone Bot screen: an approved payment, the running total and deliveries marked as successful.",
  },
};

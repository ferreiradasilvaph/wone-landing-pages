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
    context: "Billing, delivery and tracking infrastructure",

    /**
     * As duas outras opções de título, equivalentes às do `pt.ts`:
     *   2. "They pay, they are in the channel"       — accent on "in"
     *   3. "Telegram that charges and delivers itself" — accent on "itself"
     */
    titleStart: "Sell on Telegram on",
    titleAccent: "autopilot",

    /**
     * Alternative lead:
     *   "You publish the offer and Wone does the rest: it charges, confirms
     *    the payment and grants channel access. You just watch the cash."
     */
    lead: "Your customer pays by card or PIX and joins the channel in seconds — at 3am, on a weekend, with nothing for you to approve.",

    ctaPrimary: "Join the waitlist",
    ctaSecondary: "See how it works",

    facts: ["1.2s delivery", "Instant revocation", "Server-to-server tracking"],

    integrationsLabel: "The best integrations on the market",
  },

  integrations: [
    { name: "PIX", icon: "pix", kind: "Payment", dot: "#32D583" },
    { name: "Card", icon: "card", kind: "Payment", dot: "#FF9D45" },
    { name: "Telegram", icon: "telegram", kind: "Delivery", dot: "#2AABEE" },
    { name: "Meta Ads", icon: "meta", kind: "Tracking", dot: "#0A7CFF" },
    { name: "TikTok Ads", icon: "tiktok", kind: "Tracking", dot: "#EE1D52" },
    { name: "Kwai", icon: "kwai", kind: "Tracking", dot: "#FF7700" },
    { name: "X Ads", icon: "x", kind: "Tracking", dot: "#FFFFE3" },
    { name: "UTMify", icon: "utmify", kind: "Attribution", dot: "#A78BFA" },
    { name: "Otimizey", icon: "otimizey", kind: "Attribution", dot: "#22D3EE" },
  ],

  highlights: {
    eyebrow: "Inside the operation",
    title: "What Wone does while you sleep",
    items: [
      {
        icon: "Zap",
        value: 1.2,
        decimals: 1,
        suffix: "s",
        title: "Instant delivery",
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
      tabHint: "Click a number to see it in action",

      delivery: {
        title: "From PIX to access, in 1.2 seconds",
        subtitle: "A simulation of what happens when a customer pays at 3am",
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
        title: "28 blocks to design any funnel",
        subtitle: "Build one here: click the blocks, chain them and run it",
        aiTag: "AI",
        hint: "Click a block to add it to the funnel",
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
        title: "Three independent paths to delivery",
        subtitle: "Switch one off and watch access go out through the others",
        payment: "Payment made",
        delivered: "Delivered",
        failLabel: "Simulate failure",
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
        title: "The same plan, in each country's currency",
        subtitle: "Pick a country and see the checkout your customer gets",
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
    eyebrow: "Step by step",
    title: "From bot to first sale in",
    titleAccent: "4 steps",
    description:
      "No spreadsheets, no manual checking. Set it up once and the operation runs on its own.",
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
        title: "Sell and deliver automatically",
        description:
          "The customer pays, gets access immediately, and you follow everything from the dashboard.",
      },
    ],
  },

  products: {
    eyebrow: "Two paths",
    title: "Two ways to build your funnel",
    description: "Pick the one that suits you. You can use both in the same account.",
    featuredLabel: "Complete",
    cta: "Request access",
    items: [
      {
        name: "Wone Static",
        tagline: "The ready-made funnel",
        description:
          "Welcome, plans, order bump, upsell, downsell, packs, payment, delivery and renewal, organised in tabs. You fill it in, Wone runs it.",
        bullets: [
          "Ideal for selling quickly",
          "No logic to configure",
          "A complete sales funnel, already structured",
        ],
        featured: false,
      },
      {
        name: "Wone Flows",
        tagline: "Visual editor",
        description:
          "A block-based visual editor where you build the logic end to end: conditions, waits, tags, integrations and artificial intelligence.",
        bullets: [
          "28 block types, 4 of them AI",
          "Simulator and test mode inside the dashboard",
          "Per-block metrics to see where leads drop off",
        ],
        featured: true,
      },
    ],
  },

  features: {
    eyebrow: "Features",
    title: "Everything your funnel needs to",
    titleAccent: "sell more",
    description: "The features that turn one sale into dozens.",
    prev: "Previous feature",
    next: "Next feature",
    items: [
      {
        title: "Order bump",
        description: "Offer an add-on at checkout, charged on the same PIX.",
        icon: "ShoppingBag",
      },
      {
        title: "Upsell and downsell",
        description: "Automatic sequences after purchase and for those who dropped off.",
        icon: "TrendingUp",
      },
      {
        title: "Packs",
        description: "Sell standalone content, with a preview before buying.",
        icon: "Boxes",
      },
      {
        title: "Flexible plans",
        description: "Monthly, quarterly, biannual, annual or lifetime.",
        icon: "Calendar",
      },
      {
        title: "Subscription and renewal",
        description: "Reminders before expiry and automatic removal when it lapses.",
        icon: "RefreshCw",
      },
      {
        title: "Open PIX",
        description: "Let customers choose the amount within the range you define.",
        icon: "Sliders",
      },
      {
        title: "Test mode",
        description: "Walk through your funnel on Telegram without real charges.",
        icon: "TestTube",
      },
      {
        title: "Remarketing",
        description: "Segmented campaigns, with A/B testing and scheduling.",
        icon: "Megaphone",
      },
      {
        title: "Automatic delivery",
        description: "A single-use invite to the channel or group, created on payment.",
        icon: "Zap",
      },
      {
        title: "AI in the funnel",
        description: "Bots that talk, classify and qualify your leads.",
        icon: "Bot",
      },
    ],
  },

  payments: {
    eyebrow: "Payments and tracking",
    title: "Get paid safely and know where every sale comes from",
    description:
      "The money lands in your account and every ad click comes back as data for your campaign.",
    bannerEyebrow: "From creative to cash",
    bannerTitle: "Every ad click returns as server-to-server data.",

    card: {
      title: "Payments",
      headline: "International checkout",
      lead: "Charge in local currency and let customers pay the way they already pay at home. No manual conversion, no English-only checkout.",
      badge: "4 countries · 4 currencies · 1 checkout",
      priceLabel: "The same annual plan, in each country's currency",
      priceNote: "Illustrative amounts, no live exchange rate.",
      currencyLabel: "Local currency",
      methodLabel: "Pays with",
      countries: [
        {
          name: "Brazil",
          method: "PIX and card",
          code: "BRL",
          symbol: "R$",
          currency: "Brazilian real",
        },
        {
          name: "Argentina",
          method: "Local card",
          code: "ARS",
          symbol: "$",
          currency: "Argentine peso",
        },
        {
          name: "Mexico",
          method: "Card and SPEI",
          code: "MXN",
          symbol: "$",
          currency: "Mexican peso",
        },
        {
          name: "Colombia",
          method: "Card and PSE",
          code: "COP",
          symbol: "$",
          currency: "Colombian peso",
        },
      ],
      moreLabel: "More guarantees",
      more: [
        "The money lands in your account. You connect your own processor account.",
        "If one gateway goes down, the next takes over. Set up more than one and never lose a sale to instability.",
        'Confirmation through three paths: webhook, automatic reconciliation and a "Check payment" button in chat.',
        "No duplicate delivery. The same payment never grants access twice.",
        "In-house processors for domestic and international payments.",
      ],
    },

    tracking: {
      title: "Tracking",
      lead: "From the ad click to the confirmed sale and beyond checkout.",
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
    eyebrow: "Analytics",
    title: "Decide with numbers, not",
    titleAccent: "guesswork",
    description: "A dashboard showing the health of your VIP community in real time.",
    hint: "Click any metric to see the matching panel.",
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
        label: "Full funnel: start, PIX generated and payment",
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
        panelSubtitle: "Where every extra real is earned",
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
      live: "Live",
      accumulated: "so far today",
      peak: "peak",
      funnelTitle: "Funnel of 100 leads",
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
        { time: "21:31", flow: "Order bump · Pack", gateway: "Dotfy", value: "$47.00" },
        { time: "20:58", flow: "Monthly Plan", gateway: "Mercado Pago", value: "$97.00" },
        { time: "20:12", flow: "Quarterly Plan", gateway: "Dotfy", value: "$247.00" },
      ],
      statementHeaders: ["Time", "Flow", "Gateway", "Amount"],
    },
  },

  security: {
    eyebrow: "Security",
    title: "Your operation, locked down",
    description: "Protected content, controlled access and credentials kept in a vault.",
    items: [
      {
        icon: "KeyRound",
        title: "Two-factor authentication (2FA)",
        description: "Extra protection for dashboard access.",
        detail:
          "Beyond the password, the dashboard asks for a code that only exists on your device. Even if someone learns your password, they can't get in.",
      },
      {
        icon: "CopySlash",
        title: "Content anti-cloning",
        description: "Leads can't forward, save or copy your messages.",
        detail:
          "Channel content is locked against forwarding and copying. Those who paid consume it; those who didn't don't get it for free.",
      },
      {
        icon: "Network",
        title: "Isolated accounts",
        description: "Each customer's data stays separate from the rest.",
        detail:
          "Every account runs in its own space. None of your data ever crosses with another producer's on the platform.",
      },
      {
        icon: "Vault",
        title: "Secret vault",
        description: "Your keys and credentials are stored encrypted.",
        detail:
          "Bot tokens and gateway keys are encrypted at rest. Not even the Wone team reads their contents.",
      },
    ],
  },

  faq: {
    eyebrow: "Questions",
    title: "Frequently asked questions",
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
          "You can connect several bots to the same account, within the limit set for your plan. Talk to us if you need more.",
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
    badge: "Milestone Awards",
    title: "Awards &",
    titleAccent: "recognition",
    description:
      "With every new revenue milestone on Telegram, the official trophy and exclusive commemorative items arrive at your door.",
    progressLabel: "Drag to move through the milestones",
    milestoneLabel: "Milestone",
    physicalItem: "Physical item shipped",
    items: [
      {
        tier: "10K",
        image: "/placas/placa-10k.png",
        title: "Bronze Trophy • $10,000",
        subtitle: "Proof of the first scale",
        description:
          "Validation of your operation and the first few hundred members retained in your VIP community.",
        awardItem: "Official Wone Bronze Pin & Scale Certificate",
        accent: "#D97706",
      },
      {
        tier: "100K",
        image: "/placas/placa-100k.png",
        title: "100K Acrylic Plaque • $100,000",
        subtitle: "The 6-Figure Club",
        description:
          "Commemorative trophy in a solid faceted crystal acrylic block with the official 100K Wone Fox. Comes with the Official Wone Bracelet in fine leather with a titanium clasp.",
        awardItem: "Crystal Acrylic Trophy + Official Wone Titanium Bracelet",
        accent: "#E4E4E7",
      },
      {
        tier: "500K",
        image: "/placas/placa-500k.png",
        title: "500K Ceremonial Plaque • $500,000",
        subtitle: "Half a Million in Revenue",
        description:
          "Special acrylic trophy with the Wone Fox in ceremonial dress and a chrome crest in high relief. Comes with the exclusive jewel: a necklace with an orange sapphire pendant.",
        awardItem: "500K High Relief Trophy + Sapphire & Diamond Necklace",
        accent: "#EAB308",
      },
      {
        tier: "1M",
        image: "/placas/placa-1m.png",
        title: "1M Black Diamond Plaque • $1,000,000",
        subtitle: "The Olympus of 7 Figures",
        description:
          "Monumental Wone 1M trophy for major producers with dominant ecosystems. Comes with the coveted Championship Ring in 18k gold and black titanium engraved “1M WONE BOT”.",
        awardItem: "Monumental 1M Trophy + 18k Gold & Titanium Wone 1M Club Ring",
        accent: "#FF7700",
      },
    ],
  },

  cta: {
    title: "Ready to put your community on",
    titleAccent: "autopilot",
    description:
      "Connect your bot, build your funnel and let the Wone infrastructure handle billing, remarketing and access revocation.",
    bullets: [
      "No card required to join the queue",
      "Invites released in batches, in sign-up order",
      "You receive access by email",
    ],
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
    phonePlaceholder: "+55 11 90000-0000",
    optional: "(optional)",
    submit: "Join the waitlist",
    sending: "Sending...",
    disclaimer: "Access to the platform is invite-only. No spam.",
    successTitle: "All set — you're in the queue.",
    successBody: "We opened Telegram in another tab. If it didn't appear, use the button below.",
    successNote: "As soon as we open a new batch of invites, you'll get access by email.",
    openTelegram: "Open in Telegram",
    again: "Register another contact",
    countries: [
      { code: "BR", label: "Brazil" },
      { code: "AR", label: "Argentina" },
      { code: "MX", label: "Mexico" },
      { code: "CO", label: "Colombia" },
      { code: "OT", label: "Other country" },
    ],
  },

  footer: {
    tagline: "Autonomous monetization infrastructure for Telegram.",
    navigate: "Navigate",
    access: "Access",
    accessBody: "The platform is released progressively, by invitation.",
    accessCta: "Join the list",
    integrations: "Integrations",
    rights: "© 2026 Wone Bot. All rights reserved.",
    legal:
      "Wone is an independent SaaS platform with no corporate affiliation with, or endorsement from, Telegram.",
    language: "Language",
  },

  phone: {
    botName: "Wone Bot",
    online: "online",
    approved: "Payment approved",
    received: "Received this month",
    /** Valor de partida do acumulado do mês; cada venda que desce soma a ele. */
    monthStart: 142580,
    success: "Success",
    transactions: [
      { label: "Annual VIP Plan", amount: "$197.00", value: 197 },
      { label: "Quarterly Plan", amount: "$147.00", value: 147 },
      { label: "Monthly Plan", amount: "$97.00", value: 97 },
      { label: "Single pack", amount: "$67.00", value: 67 },
      { label: "Order bump · Pack", amount: "$57.00", value: 57 },
      { label: "Biannual Plan", amount: "$227.00", value: 227 },
      { label: "Lifetime access", amount: "$247.00", value: 247 },
    ],
    ariaLabel:
      "Wone Bot screen: an approved payment, $142,580.00 received this month and deliveries marked as successful.",
  },
};

/**
 * UM FATO DO PAINEL DO HERO (`hero.aside.items`), o único item do dicionário
 * com tipo escrito à mão.
 *
 * O motivo é o `kind`: ele escolhe o micro-visual que o `HeroFacts` desenha
 * (bandeiras, chips, bolha de chat, pontos, grade de blocos, traço), e dentro
 * do literal de `pt` a inferência o largaria para `string` — aí o `switch` do
 * componente deixaria de ser exaustivo e um `kind` escrito errado só apareceria
 * na tela, não no build. Com a união literal, trocar "blocks" por "bloks"
 * quebra o `tsc`.
 *
 * `extra` são as etiquetas do micro-visual, NA ORDEM em que ele as desenha, e o
 * que elas significam é por `kind` (cada bloco do `HeroFacts` documenta as
 * suas). Nenhuma delas é número novo: todas repetem o que outra seção da página
 * já afirma.
 */
export type HeroFact = {
  kind: "countries" | "methods" | "invite" | "confirm" | "blocks" | "own";
  /** O que a fileira mostra na lista — a linha clicável de 14px. */
  label: string;
  /** Uma ou duas linhas de 13px na área de detalhe, abaixo da lista. */
  detail: string;
  extra?: string[];
};

/**
 * Os seis fatos, fora do literal de `pt` por causa do tipo acima (é o `const`
 * anotado que mantém `kind` como união). O conteúdo pertence a
 * `hero.aside.items` e se lê junto do resto do hero.
 */
const HERO_FACTS: HeroFact[] = [
  {
    kind: "countries",
    label: "Cobrança em 7 países",
    detail: "O cliente paga na moeda do país dele.",
    /* Os ISO das moedas da tabela de Pagamentos, na ordem dos pinos do globo —
       e são iguais nos dois idiomas, porque ISO não se traduz. */
    extra: ["BRL", "ARS", "MXN", "COP", "USD", "EUR", "GBP"],
  },
  {
    kind: "methods",
    label: "O método de pagamento de lá",
    detail: "O checkout abre com o que ele já usa.",
    /* Um por país, os mesmos de `payments.table.countries`. */
    extra: ["PIX", "Cartão", "SPEI", "Nequi", "MB WAY"],
  },
  {
    kind: "invite",
    label: "Convite de uso único",
    detail: "Entregue no chat, segundos depois do pagamento.",
    /* Primeiro a linha da bolha de chat, depois o rótulo do contador. O "…" é
       o link encurtado de propósito: convite real não entra em página. */
    extra: ["Seu convite: t.me/+…", "~3 s"],
  },
  {
    kind: "confirm",
    /* Os detalhes são CURTOS por medida, não por gosto: a área de detalhe do
       painel tem altura cravada (116px) e, nos 168px úteis de 13rem, cada
       detalhe tem duas linhas de ~24 caracteres antes de o micro-visual deste
       item (três fileiras) não caber mais. Daí "Independentes entre si." em vez
       de repetir os três nomes, que os pontos abaixo já dizem. */
    label: "Três vias de confirmação",
    detail: "Independentes entre si.",
    /* Os três caminhos, na ordem em que os pontos acendem. */
    extra: ["Webhook", "Reconciliação", "Botão no chat"],
  },
  {
    kind: "blocks",
    label: "Editor de funil com 28 blocos",
    detail: "Você arrasta blocos, sem código.",
    /* A legenda dos quatro quadradinhos laranja da grade 7×4. */
    extra: ["4 de IA"],
  },
  {
    kind: "own",
    label: "Integrações próprias",
    detail: "Sem Stripe no meio do caminho.",
    /* As duas linhas que o traço sublinha. */
    extra: ["0 intermediários", "taxa definida por operação"],
  },
];

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
    /* A cobertura virou continente em 15/10, com a tabela passando a sete
       países: nomear Brasil, Argentina, México e Colômbia já não cabia numa
       linha de 13px, e nomear os sete, menos ainda. "Brasil, América Latina e
       Europa" diz a mesma coisa em três termos — e o Brasil fica fora da
       América Latina de propósito, porque é o país de quem lê. */
    kicker: "Cobrança, entrega e rastreio · Brasil, América Latina e Europa",
    kickerShort: "Cobrança, entrega e rastreio",

    /**
     * Título curto e em cor sólida: `titleAccent` é a única palavra em laranja,
     * sem gradiente. As outras duas opções avaliadas, caso se queira testar:
     *   2. "Pagou no PIX, entrou no canal"        — destaque em "PIX"
     *   3. "Telegram que cobra e entrega sozinho" — destaque em "sozinho"
     */
    /**
     * O título em LINHAS, não em texto corrido, desde 15/10: a entrada da home
     * sobe cada linha de dentro da própria janela de recorte (`.ent-linha`), e
     * para isso cada linha precisa ser um elemento. O texto é o mesmo de antes
     * ("Venda pelo Telegram no" + "automático") e a quebra também — era a que o
     * `max-w-[34rem]` já produzia a qualquer largura; agora ela é explícita, e
     * deixou de depender da medida da fonte carregada.
     */
    titleLines: ["Venda pelo", "Telegram no"],
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
        /* Sete desde 15/10, com Equador, Portugal e Reino Unido entrando na
           tabela. A lista de moedas substituiu a de países pelo mesmo motivo do
           kicker: sete nomes não cabem em duas linhas de 13px, e o que o
           visitante precisa saber é que ele cobra na moeda de cada um. */
        value: "7 países",
        label: "Moeda local: real, pesos, dólar, euro e libra",
      },
      { value: "3 vias", label: "Webhook, reconciliação e botão no chat até a entrega" },
      { value: "28 blocos", label: "Editor visual de funil, 4 deles de IA" },
    ],
    /* Os rótulos do PauseButton que comanda o relógio do telefone NÃO moram
       aqui: são `ui.pause` e `ui.play`, criados para os controles repetidos da
       página (o carrossel de Recursos e o de Segurança já os usam). Duas cópias
       do mesmo "pausar" acabariam divergindo na revisão de copy. */

    /**
     * O palco: o globo ocupando a metade esquerda da janela, com o ticket da
     * venda do país da vez no pé. Era o mapa com o telefone na frente, pedido
     * do dono em 14/10; em 15/10 a diretoria tirou o aparelho e mandou o
     * planeta crescer até a metade da tela, com o texto entrando levemente por
     * cima dele.
     *
     * Só três coisas moram aqui — o rótulo do palco, o nome de cada cidade e a
     * frase que abre o resumo para leitor de tela. País, método, símbolo, ISO e
     * valor NÃO: vêm de `payments.table.countries` e de
     * `highlights.demos.checkout.prices`, para o palco e a tabela de Pagamentos
     * nunca divergirem.
     */
    stage: {
      /** Renderizado como `{label} · {ui.simulation}` em `.t-label`. */
      label: "Checkout internacional",
      /**
       * A cidade de cada pino, na chave da MOEDA do país — a mesma de
       * `payments.table.countries` e de `globeMath.CAPITAIS`. São sete desde
       * 15/10; o país, o método e o valor de cada uma continuam vindo da tabela
       * de Pagamentos, não daqui.
       */
      cities: [
        { code: "BRL", city: "São Paulo" },
        { code: "ARS", city: "Buenos Aires" },
        { code: "MXN", city: "Cidade do México" },
        { code: "COP", city: "Bogotá" },
        { code: "USD", city: "Quito" },
        { code: "EUR", city: "Lisboa" },
        { code: "GBP", city: "Londres" },
      ],
      /** Abre o resumo; o resto da frase é montado dos sete países. */
      srIntro: "Globo com o checkout simulado em sete países:",
    },
    /**
     * O painel de fatos ao lado do título (pedido do dono, 15/10: "adicione
     * informações ao lado direito no hero"). Só o que a página já afirma em
     * outras seções — nenhum número novo.
     *
     * 15/10, segunda rodada: os seis itens deixaram de ser frases de uma linha
     * e viraram FILEIRAS que o relógio do hero percorre, cada uma com detalhe e
     * micro-visual próprios (`HeroFacts`). O que era uma frase longa demais
     * para 13rem de largura agora é rótulo curto + detalhe, e o que a frase só
     * dizia (os sete ISO, os cinco métodos, as três vias, os 28 blocos) o
     * painel também DESENHA. Os textos estão em `HERO_FACTS`, no topo do
     * arquivo.
     */
    aside: {
      title: "O que vem com a Wone",
      /** Rodapé do painel: o único link daqui, para a seção de Recursos. */
      more: "Ver todos os recursos",
      items: HERO_FACTS,
    },
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
    /* A grade de spec 2×2 lê quatro campos: `value`, `decimals`, `suffix` e
       `title`. `icon` e `description` saíram — eram dos quatro cards com ícone
       Lucide que a E1 removeu, e nenhum componente os lia mais (chave morta).
       As descrições estão no histórico (commit 1dc6ce0) se voltarem a servir. */
    items: [
      {
        /* "1,2 s" não vive aqui: a grade fica FORA do painel rotulado
           "Simulação", e número de desempenho sem fonte não sai em texto da
           página (regra 4). O 1,2 s continua no título da demo, que mora dentro
           do painel. A figura desta célula é o convite de uso único por
           pagamento, que é fato do produto. */
        value: 1,
        decimals: 0,
        suffix: "",
        title: "Convite por pagamento",
      },
      {
        value: 28,
        decimals: 0,
        suffix: "",
        title: "Blocos no editor",
      },
      {
        value: 3,
        decimals: 0,
        suffix: "",
        title: "Vias de confirmação",
      },
      {
        /* Sete desde 15/10, com Equador, Portugal e Reino Unido: a figura conta
           as linhas de `payments.table.countries`, e os dois números têm de
           bater — é a mesma afirmação em dois lugares da página. */
        value: 7,
        decimals: 0,
        suffix: "",
        title: "Países, moeda local",
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
        /* `clock` e `clockNote` saíram: o relógio dentro da demo repetia, com
           outras palavras, a hora e a frase que já estão no subtítulo acima. */
        replay: "Simular de novo",
        done: "Acesso liberado",
        /* `at` é a HORA da simulação, não a duração do passo: o carimbo trazia
           "1,2 s" de volta a 60px do título, e a espec dá ao título o único
           lugar desse número. Os quatro eventos caem dentro do mesmo segundo do
           relógio — é isso que o log mostra, e a duração quem mede é o
           cronômetro à direita. A hora é a mesma do subtítulo (03:14). */
        steps: [
          { at: "03:14:00", label: "PIX confirmado", detail: "A processadora avisa a Wone" },
          { at: "03:14:00", label: "Webhook recebido", detail: "Pagamento conferido e validado" },
          { at: "03:14:00", label: "Link único gerado", detail: "Convite de uso único para o canal" },
          { at: "03:14:01", label: "Convite enviado", detail: "O cliente recebe no chat" },
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
        /* O mesmo plano nas sete moedas, uma linha por `code` de
           `payments.table.countries`. Os três novos (15/10) são o mesmo plano
           de $197 em cotação ilustrativa — a nota "Valores ilustrativos, sem
           cotação em tempo real." vale para todos e já está dita acima. */
        prices: [
          { code: "BRL", display: "197,00" },
          { code: "MXN", display: "650" },
          { code: "ARS", display: "38.000" },
          { code: "COP", display: "155.000" },
          { code: "USD", display: "197,00" },
          { code: "EUR", display: "180,00" },
          { code: "GBP", display: "155,00" },
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
     *
     * As linhas trocaram em 14/10, no refazimento da seção. A tese antiga
     * ("Cole o token. / Monte o funil. / A Wone entrega.") enumerava DOIS dos
     * três passos de configuração e deixava o gateway de fora: era a primeira
     * de três enumerações competindo no mesmo bloco — tese de 3 linhas, dois
     * caminhos, quatro passos —, e foi o que o dono chamou de confuso. Agora as
     * três linhas são os dois lados da venda (você · o cliente · a Wone), e a
     * enumeração dos passos existe UMA vez, no trilho de abas.
     */
    thesis: ["Você liga tudo.", "O cliente paga.", "A Wone entrega."],
    /* Diz a lógica do produto numa frase — três conexões que se fazem uma vez,
       uma venda que acontece para sempre — e termina ensinando o controle, que
       é o que o visitante precisa saber para usar a demo ao lado. */
    lead: "Bot, funil e gateway: três conexões que você faz uma vez. Depois, a cada venda, tudo acontece sem você. Escolha um passo e veja os dois lados — o seu painel e o chat do cliente.",
    /**
     * Os quatro passos, agora as quatro abas do trilho.
     *
     * `icon` saiu com o palco 3D: o avião de papel, os blocos e a maquininha
     * eram objetos abstratos que não explicavam nada — metade do diagnóstico de
     * 14/10. Os três primeiros são configuração ("você faz uma vez") e o quarto
     * é o desfecho ("depois, a cada venda"); quem marca a dobra 3+1 são as
     * etiquetas de `demo.groups`, não mais quatro passos espaçados em 36vh.
     *
     * A descrição NÃO vive dentro da aba: ela aparece num compartimento de
     * altura fixa logo abaixo das quatro, na largura toda do trilho. A aba tem
     * ~133px a 1440 (seis colunas divididas por quatro), e 14px de texto ali
     * dentro dava 15 caracteres por linha — o teto do compartimento, na largura
     * cheia, é ~110 caracteres em duas linhas.
     *
     * `facts` são os TRÊS fatos do passo, na fileira abaixo do palco. Cada um é
     * um fato que a página já afirma em outra seção (FAQ, garantias de
     * Pagamentos, lead de Análises), dito aqui na voz do passo — nenhum número
     * novo e nenhuma promessa nova entra por este campo.
     */
    steps: [
      {
        step: "01",
        title: "Conecte seu bot",
        description: "Cole o token do @BotFather. A Wone mantém o bot no ar.",
        facts: [
          {
            term: "Token do @BotFather",
            text: "Você cola o token uma vez; a Wone registra os comandos e o webhook.",
          },
          {
            term: "A Wone mantém o bot no ar",
            text: "Nada para hospedar, nada para reiniciar na mão.",
          },
          {
            term: "Vários bots na mesma conta",
            text: "Dentro do limite definido para o seu acesso.",
          },
        ],
      },
      {
        step: "02",
        title: "Monte seu funil",
        /* "28 blocos, 4 de IA" veio de `paths[1].text`, que deixou de existir:
           o fato continua na seção, agora no passo a que ele pertence. */
        description: "Funil pronto em abas ou editor com 28 blocos, 4 de IA. Na mesma conta.",
        facts: [
          {
            term: "Funil pronto em abas",
            text: "No Wone Estático você só preenche o funil e publica.",
          },
          {
            term: "Editor com 28 blocos, 4 de IA",
            text: "No Wone Fluxos você monta a lógica arrastando blocos, sem código.",
          },
          {
            term: "Os dois caminhos",
            text: "Wone Estático e Wone Fluxos vivem na mesma conta.",
          },
        ],
      },
      {
        step: "03",
        title: "Conecte seu gateway",
        description: "Sua conta na processadora. Configure um reserva: se um cair, o outro assume.",
        facts: [
          {
            term: "O dinheiro cai na sua conta",
            text: "É a sua conta na processadora; a Wone não passa pelo dinheiro.",
          },
          {
            term: "Gateway reserva",
            text: "Se o primeiro não gerar a cobrança, o próximo assume.",
          },
          {
            /* Sem contagem de países: a diretoria passou de quatro para sete em
               15/10, e um número cravado aqui envelheceria na primeira mudança
               da tabela de Pagamentos — que é quem conta a lista. */
            term: "A moeda de cada país",
            text: "PIX, SPEI, Nequi, MB WAY ou cartão: o método local de lá.",
          },
        ],
      },
      {
        step: "04",
        title: "A venda acontece",
        /* "Sem você." é o ponto da seção inteira: o passo 04 é o único que não
           pede nada de quem vende, e é por isso que a demo o desenha invertido
           (o chat primeiro, e o fio voltando para o painel). */
        description: "O cliente paga, recebe o convite de uso único e entra no canal. Sem você.",
        facts: [
          {
            term: "Convite de uso único",
            text: "Um mesmo pagamento nunca libera o acesso duas vezes.",
          },
          {
            term: "Três vias de confirmação",
            text: "Webhook, reconciliação e o botão no chat, independentes.",
          },
          {
            term: "Tudo no painel",
            text: "Faturamento por hora, funil, LTV, taxas e extrato.",
          },
        ],
      },
    ],

    /**
     * Os dois produtos. Eram uma seção inteira de cards ("Dois caminhos"),
     * viraram dois bullets com régua desta coluna e agora são só os NOMES: as
     * duas abas do painel no passo 02.
     *
     * `text` saiu porque a lista era a terceira enumeração do bloco, e nenhum
     * fato se perdeu — "28 blocos, 4 de IA" está em `steps[1].description`, e
     * boas-vindas, planos, order bump, upsell, downsell, packs e renovação já
     * são a seção Recursos, item por item. O que sobra aqui é o que o passo 02
     * precisa dizer sem uma palavra: os dois caminhos na mesma conta.
     */
    paths: [{ name: "Wone Estático" }, { name: "Wone Fluxos" }],

    /** Link de texto que fecha a coluna (ação de menos peso, sem seta). */
    listLink: "Entrar na lista",

    /**
     * Rótulos da SALA DE OPERAÇÃO (15/10), o palco que substituiu os dois
     * painéis pequenos lado a lado — "visualmente está ruim... preciso de algo
     * visualmente espetacular", disse o dono. A lógica não mudou (três conexões
     * que você faz uma vez e uma venda que acontece sempre); o que mudou é que
     * agora são DOIS OBJETOS num palco com horizonte: a tela grande do painel,
     * inclinada em perspectiva, e o aparelho do cliente em pé. Nenhum WebGL.
     *
     * São SÓ rótulos. Todo valor que aparece nas duas telas vem de outro bloco
     * deste dicionário — o token do @BotFather, os nós de
     * `highlights.demos.blocks.flow`, o nome do produto de
     * `highlights.demos.checkout`, os gateways e a linha de extrato de
     * `analytics.panel`, a hora de `highlights.demos.delivery` — e nada é
     * cunhado aqui (regra 4).
     *
     * O VALOR da venda é um só na demo, `phone.transactions[0].amount`: a bolha
     * de oferta, o cartão de aprovado e a linha do extrato mostram o mesmo
     * texto. Puxar `checkout.prices[0]` para a bolha punha "R$ 197,00" e
     * "$197.00" na mesma moldura, a seis segundos de distância, para o mesmo
     * plano — a moeda de cada país é assunto da seção Pagamentos, não desta.
     */
    demo: {
      /** `{n}` é o passo escolhido. */
      counter: "{n} de 4",
      /* A dobra 3+1 em duas palavras. É o enxerto que faz a seção se ler
         PARADA: sem tocar em nada, o visitante já sabe o que é trabalho dele e
         o que acontece sem ele. */
      groups: { setup: "Você faz uma vez", runtime: "Depois, a cada venda" },
      /** Região viva: a ilustração é `aria-hidden`, quem narra é esta frase. */
      announce: "Passo {n} de 4: {title}",
      tokenLabel: "Token do bot",
      botOnline: "Bot no ar",
      connected: "Bot conectado",
      funnelNote: "Os dois na mesma conta.",
      gatewayMain: "Principal",
      gatewayBackup: "Em espera",
      /* A régua do passo 04, dentro do chat: é a fronteira entre o que você
         configurou e o que a Wone faz sozinha. */
      hand: "Daqui em diante é o seu cliente.",
      inviteSent: "Convite enviado",
      statement: "Entrou no seu extrato",

      /**
       * A TELA GRANDE da sala de operação. `sides` saiu daqui: cada objeto do
       * palco se nomeia por dentro agora — a tela grande pela aba da janela e o
       * aparelho pelo cabeçalho do chat, como no `PhoneMockup` —, e um rótulo
       * flutuando ao lado de cada um repetia a mesma informação duas vezes.
       *
       * Tudo abaixo é NOME DE TELA e ESTADO DE UI, não afirmação de produto: os
       * valores que aparecem no painel continuam vindo de outros blocos
       * (`highlights.demos.blocks`, `payments.table`, `analytics.panel`, e a
       * série por hora de `src/data/content.ts`).
       */
      panel: {
        /** A aba da janela, ao lado dos três pontos. */
        window: "Painel · Wone",
        /** A tela que o painel abre em cada passo, na ordem dos quatro passos. */
        screens: ["Bots", "Funil", "Pagamentos", "Vendas"],
        /** O checklist do passo 01. É o que a tela mostra, não uma promessa. */
        botChecks: ["Token validado", "Comandos registrados", "Canal vinculado"],
        webhook: "Webhook ativo",
        /* A contagem da paleta do editor, no passo 02. Os dois números já estão
           em `steps[1].description` e na grade de Highlights — nenhum é novo. */
        blocksCount: "28 blocos, 4 de IA",
        /** O gráfico pequeno do passo 04. A série é a mesma de Análises. */
        hourly: "Faturamento por hora",
        /** O carimbo da linha nova do extrato, no alto da lista. */
        now: "agora",
      },

      /** O APARELHO do cliente. */
      chat: {
        /* A primeira mensagem do bot, depois do `/start` do cliente (o comando
           é o de `payments.tracking.flow[1].code`). */
        welcome: "Oi! Sou o Wone Bot. Toque em começar e eu te mostro os planos.",
      },
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
     * Rótulos das placas de simulação que abrem os cards. São SÓ rótulos: todo
     * número que aparece dentro da placa vem de `phone.transactions`, a mesma
     * lista de vendas do telefone do hero, e todo nome de bloco vem de
     * `highlights.demos.blocks`. Nenhum valor é cunhado aqui (regra 4).
     *
     * Desde 15/10 os DEZ cards têm placa, a pedido do dono. Onde não existe
     * número no dicionário, a placa mostra o mecanismo e não um valor: o "PIX
     * livre" é o campo aberto com o símbolo da moeda e o cursor, porque a faixa
     * de valor continua sem fonte.
     */
    mockup: {
      bump: "Adicionar ao pedido",
      preview: "Prévia",
      /* Sem prazo em dias: "renova em 12 dias" era invenção, e o lembrete é o
         fato que o produto garante. */
      reminder: "Lembrete enviado",
      /* Os cinco rótulos que entraram em 15/10, quando o dono pediu a placa de
         simulação nos DEZ cards. Continuam sendo só rótulos: os valores das
         placas novas saem de `phone.transactions`, os nomes de bloco de
         `highlights.demos.blocks` e o símbolo da moeda de
         `payments.table.countries`. */
      /** As duas saídas depois do checkout (upsell e downsell). */
      bought: "Comprou",
      declined: "Recusou",
      /** PIX livre: o campo é aberto, e o número é do cliente — não nosso. */
      freeAmount: "Valor que o cliente escolher",
      /** Modo de teste: o funil roda inteiro e a cobrança não acontece. */
      noCharge: "Sem cobrança real",
      /** Remarketing: o nome do que as duas réguas A/B mostram. */
      abTest: "Teste A/B",
    },
    /**
     * Mesmos dez recursos e mesmos fatos de antes; a descrição passa à cadência
     * pergunta-resposta onde a pergunta é a dúvida real de quem vende ("Venceu?
     * Lembrete antes…"). Onde não havia pergunta honesta a fazer, a frase ficou
     * afirmativa: forçar a fórmula nos dez viraria tique.
     *
     * `id` é o mesmo nos dois idiomas e é o que liga o card ao seu mini-mockup
     * (era `icon`, o nome do ícone Lucide que o card mostrava antes de a forma
     * Operação substituí-lo pela moldura com dado de verdade).
     */
    items: [
      {
        id: "bump",
        title: "Order bump",
        description: "O cliente já está pagando? O adicional entra no mesmo PIX, no checkout.",
      },
      {
        id: "upsell",
        title: "Upsell e downsell",
        description: "Comprou? Vem a oferta maior. Desistiu? Vem a menor.",
      },
      {
        id: "packs",
        title: "Packs",
        description: "Venda conteúdo avulso. O cliente vê a prévia antes de comprar.",
      },
      {
        id: "plans",
        title: "Planos flexíveis",
        description: "Mensal, trimestral, semestral, anual ou vitalício.",
      },
      {
        id: "subscription",
        title: "Assinatura e renovação",
        description: "Venceu? Lembrete antes e remoção automática depois.",
      },
      {
        id: "openPix",
        title: "PIX livre",
        description: "Quanto o cliente quer pagar? Ele escolhe dentro da faixa que você definir.",
      },
      {
        id: "testMode",
        title: "Modo de teste",
        description: "Quer conferir antes? Percorra o funil no Telegram sem cobrança real.",
      },
      {
        id: "remarketing",
        title: "Remarketing",
        description: "Campanhas segmentadas, com teste A/B e agendamento.",
      },
      {
        id: "delivery",
        title: "Entrega automática",
        description: "Pagou? O convite de uso único sai na hora, para canal ou grupo.",
      },
      {
        id: "ai",
        title: "IA no funil",
        description: "Quatro blocos de IA conversam, classificam e qualificam seus leads.",
      },
    ],
  },

  payments: {
    kicker: "Pagamentos",
    /** Texto do dono, em caixa alta: o único H2 que não é frase. */
    title: "Checkout INTERNACIONAL",
    /* Lead refeito em 15/10 por pedido da diretoria do dono, que mandou
       "destacar a parte de que todos os pagamentos serão próprios e com menores
       taxas do mercado" e, nas palavras do diretor, que "não é via Stripe, e
       sim integrações próprias". As três afirmações entram aqui e voltam, uma
       por item, nas garantias — o lead anuncia, a lista detalha. */
    lead: "Real, pesos, dólar, euro e libra. O cliente paga como já paga no país dele — PIX, SPEI, Nequi, MB WAY, cartão. Integrações próprias com cada meio de pagamento, não via Stripe, com as menores taxas do mercado e taxa personalizada por operação.",

    /**
     * A tabela de sete países — os quatro do início mais Equador, Portugal e
     * Reino Unido, que a diretoria pediu em 15/10 ("colocar portugal, reino
     * unido e afins"). Os métodos de cada um são os da Dotfy, que o dono mandou
     * copiar, escritos como a marca escreve (MB WAY, PSE, SPEI).
     *
     * Os cabeçalhos são as colunas da Wone — PAÍS · PAGA COM · MOEDA · PLANO —,
     * não as da referência: o checkout em espanhol é capacidade da
     * processadora, não da Wone, e por isso não vira coluna.
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
          methods: [
            "PIX",
            "Pix Automático",
            "Boleto registrado",
            "Cartão até 12x · 3DS",
            "Apple Pay",
            "Google Pay",
          ],
          code: "BRL",
          symbol: "R$",
          currency: "Real",
        },
        {
          name: "México",
          methods: ["SPEI", "Dinheiro em lojas"],
          code: "MXN",
          symbol: "$",
          currency: "Peso mexicano",
        },
        {
          name: "Argentina",
          methods: ["Transferência CVU / CBU", "Dinheiro"],
          code: "ARS",
          symbol: "$",
          currency: "Peso argentino",
        },
        {
          name: "Colômbia",
          methods: ["Nequi", "Daviplata", "Bancolombia", "Efecty", "PSE"],
          code: "COP",
          symbol: "$",
          currency: "Peso colombiano",
        },
        {
          /* O Equador paga em dólar: o `code` é a MOEDA, e é por ele que a
             bandeira, o globo e o preço se acham. */
          name: "Equador",
          methods: ["Transferência", "Dinheiro"],
          code: "USD",
          symbol: "$",
          currency: "Dólar",
        },
        {
          name: "Portugal",
          methods: ["MB WAY"],
          code: "EUR",
          symbol: "€",
          currency: "Euro",
        },
        {
          name: "Reino Unido",
          methods: ["Cartão"],
          code: "GBP",
          symbol: "£",
          currency: "Libra",
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
     * é dita uma vez só.
     *
     * 15/10: "Integrações próprias" abre a lista e "Taxas sob medida" fecha, as
     * duas mensagens que a diretoria do dono mandou destacar — a primeira é a
     * frase do diretor, literal ("não é via Stripe, e sim integrações
     * próprias"), e por isso a seção a marca em laranja. Ela ficou no lugar de
     * "Sua conta na processadora" e absorveu o que aquele item dizia (o
     * dinheiro cai na sua conta): integração própria com cada meio de pagamento
     * e dinheiro na conta do produtor não se contradizem — é o que a FAQ "O
     * dinheiro passa pela Wone?" também diz.
     */
    guarantees: [
      {
        num: "01",
        term: "Integrações próprias",
        text: "Não é via Stripe: a Wone integra direto com cada meio de pagamento e o dinheiro cai na sua conta.",
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
      {
        num: "04",
        term: "Taxas sob medida",
        text: "As menores taxas do mercado, personalizadas por operação.",
      },
    ],

    tracking: {
      title: "Rastreio",
      lead: "Do clique no anúncio à venda confirmada, servidor a servidor. Meta, TikTok, Kwai e X.",
      /**
       * Cada nó do caminho do dado. Três campos, e os dois últimos podem vir
       * vazios: `chips` são os destinos nominais (viram etiqueta, não frase) e
       * `code` é o valor de máquina do passo — o parâmetro de UTM que o link
       * carrega e o comando que abre a conversa. Só entra em `code` o que é
       * literal e verificável; nome de evento de pixel não está aqui porque
       * nenhum foi confirmado pelo dono.
       */
      flow: [
        { label: "Clique no anúncio", detail: "", chips: ["Meta", "TikTok", "Kwai", "X"], code: "utm_source" },
        { label: "Start no bot", detail: "UTM e código de venda guardados", chips: [], code: "/start" },
        { label: "PIX gerado", detail: "Evento enviado servidor a servidor", chips: [], code: "" },
        { label: "Venda confirmada", detail: "Conversão atribuída à campanha", chips: [], code: "" },
        { label: "Página de entrega", detail: "Pixel melhora a qualidade dos dados", chips: [], code: "" },
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
    /**
     * O aviso que acompanha TODAS as cinco vistas, não só as três que tinham
     * número grande: quem chega pela aba LTV precisa da mesma informação que
     * quem chega pela de Faturamento. Uma chave só, porque é uma frase só —
     * cinco subtítulos quase iguais era o que havia antes.
     */
    sampleNote: "Amostra ilustrativa. Nenhum dado de cliente.",
    /**
     * `short` é o rótulo da aba (cabeçalho de tabela) e `label` é a legenda
     * longa da aba ativa, entre as abas e o painel. O `icon` saiu com os ícones
     * das abas, e `panelTitle`/`panelSubtitle` saíram porque diziam, numa
     * terceira redação, o que a aba e a legenda já dizem.
     */
    views: [
      {
        id: "faturamento",
        label: "Faturamento por dia e por hora, para descobrir seu melhor horário de venda",
        short: "Faturamento",
      },
      {
        id: "funil",
        /* Sem "completo": adjetivo de marketing fora das descrições. */
        label: "Cada passo do funil: start, PIX gerado e pagamento",
        short: "Funil",
      },
      {
        id: "ltv",
        label: "LTV e tempo médio até a compra, ao longo da assinatura",
        short: "LTV",
      },
      {
        id: "taxas",
        label:
          "Taxas de upsell, downsell, order bump e recuperação, com os números por trás de cada uma",
        short: "Taxas",
      },
      {
        id: "extrato",
        label: "Extrato de transações por período, fluxo e gateway",
        short: "Extrato",
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
        term: "2FA",
        summary: "código que só existe no seu aparelho",
        title: "Verificação em duas etapas (2FA)",
        detail:
          "Além da senha, o painel pede um código que só existe no seu aparelho. Mesmo que alguém descubra sua senha, não entra.",
      },
      {
        term: "Anti-clone",
        summary: "o lead não encaminha, não salva, não copia",
        title: "Anti-clone de conteúdo",
        detail:
          "O conteúdo do canal fica travado contra encaminhamento e cópia. Quem pagou consome; quem não pagou não recebe de graça.",
      },
      {
        term: "Contas isoladas",
        summary: "nenhum dado cruza com outro produtor",
        title: "Contas isoladas",
        detail:
          "Cada conta roda em seu próprio espaço. Nenhum dado seu cruza com o de outro produtor da plataforma.",
      },
      {
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
        /* Os seis países de fora da tabela de Pagamentos, na mesma ordem dela:
           a resposta e a tabela contam a mesma lista (15/10, com Equador,
           Portugal e Reino Unido). */
        answer:
          "Sim. A Wone permite cobrar clientes do México, da Argentina, da Colômbia, do Equador, de Portugal e do Reino Unido na moeda local, com checkout próprio.",
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
   * O PREFÁCIO da vitrine, a seção que o dono pediu em 15/10 para o espaço
   * abaixo dos botões do hero. Só texto novo: os quatro marcos que a régua
   * mostra saem de `awards.items`, logo abaixo — nenhum número, nome de troféu
   * ou item físico é cunhado aqui (regra 4).
   *
   * O kicker é o MESMO substantivo do item de navegação e do kicker da vitrine
   * ("Prêmios"), porque é a mesma seção sendo anunciada; o lead termina dizendo
   * onde ela está, que é o trabalho de um prefácio.
   */
  awardsPreface: {
    /* O kicker deixou de ser "Prêmios" em 15/10: com o mesmo rótulo da vitrine,
       o visitante tomava o prefácio pela seção que o nav promete — e, ao clicar
       em "Prêmios", via a página passar por cima de um bloco com o mesmo título
       para parar noutro. Agora o prefácio anuncia um PERCURSO (o que te espera),
       e a vitrine continua dona do nome. */
    kicker: "O que te espera",
    title: "O caminho até o milhão tem quatro paradas. Todas chegam na sua porta.",
    lead: "Cada marco de faturamento no Telegram tem um troféu de acrílico e um item do marco: um pin, uma pulseira, um colar, um anel de ouro 18k. A vitrine completa está mais abaixo.",
    link: "Ver a vitrine",
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
        print: "/placas/arte-100k.webp",
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
        print: "/placas/arte-500k.webp",
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
        print: "/placas/arte-1m.webp",
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
    /* O título do sucesso é `cta.success.title`: ele virou o H2 da seção, na
       coluna da esquerda, e um segundo título aqui diria a mesma coisa duas
       vezes. */
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
    /** A segunda linha da bolha do convite, abaixo de `howItWorks.demo.inviteSent`. */
    inviteNote: "link de uso único",
    /**
     * O texto do campo de digitação no pé da tela do telefone do hero, que
     * entrou em 14/10 quando o aparelho ficou mais alto (268×560 e 300×620). É
     * o placeholder de um chat de verdade — o campo é `<span>`, inerte, e não
     * aceita texto: existe para a tela não terminar num vão de preto embaixo
     * das bolhas.
     */
    composer: "Mensagem",
    /* `received`, `monthStart` e `success` SAÍRAM em 14/10, com o telefone do
       hero: ele deixou de ser painel de caixa ("Recebido nesta simulação", o
       total somado, cada entrega marcada "Sucesso") e virou o chat do cliente,
       que é o que o dono pediu ao pedir a prévia do checkout internacional. No
       chat de um comprador não existe total recebido. `transactions` fica: o
       carrossel de Recursos e o `CustomerChat` de "Como funciona" usam. */
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
  },
};

/**
 * Sem `as const` de propósito: os campos ficam `string`/`number` em vez de
 * literais, para `en.ts` poder satisfazer o mesmo tipo com outros textos.
 */
export type Content = typeof pt;

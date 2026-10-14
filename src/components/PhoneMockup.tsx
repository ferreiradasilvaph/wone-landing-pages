"use client";

import { BatteryMedium, Check, Mic, SignalHigh, Smile, Wifi } from "lucide-react";

import { useContent } from "@/i18n";
import { Chip } from "./Chip";
import { CtaButton } from "./CtaButton";
import { FlagMark } from "./FlagMark";
import { metodoDe, precoDe } from "./hero/paises";
import { WoneIcon } from "./WoneMark";

/**
 * O telefone do palco do hero — agora o CHAT DO CLIENTE, não um painel de
 * caixa.
 *
 * O pedido do dono de 14/10 foi "melhore a imagem do celular, e coloque junto a
 * página principal uma prévia do checkout internacional". As duas metades se
 * resolvem no mesmo objeto: ele melhora como APARELHO (moldura com rim, ilha
 * dinâmica, botões laterais, a sombra `--shadow-device`) e como CONTEÚDO — a
 * tela passa a mostrar a venda acontecendo no país que o mapa está acendendo,
 * com o preço NA MOEDA LOCAL e o método que se usa lá (PIX, cartão local, SPEI,
 * PSE).
 *
 * SAIU o "Recebido nesta simulação" com o total somado. Quem olha esta tela é o
 * lado do COMPRADOR: no chat de um cliente não existe "total recebido". As três
 * chaves que serviam só a ele (`phone.received`, `phone.monthStart`,
 * `phone.success`) saíram do dicionário junto.
 *
 * TRÊS BATIDAS, UM RELÓGIO SÓ
 *
 * `beat` 0 é a oferta, 1 acrescenta "pagamento aprovado", 2 acrescenta o
 * convite; a cada quatro voltas o país muda. O relógio NÃO mora aqui: mora no
 * `Hero`, porque o mesmo passo acende o ping no mapa e troca a linha de status
 * do celular — dois relógios independentes fariam o telefone anunciar um país e
 * o mapa acender outro (foi o defeito que a versão anterior tinha entre o
 * cartão do PIX e a lista de entregas).
 *
 * PROPORÇÃO DE APARELHO DE VERDADE (14/10)
 *
 * O dono pediu "aumente o celular em tamanho (altura) e subsequentemente a
 * seção onde ele se encontra para manter suas proporções". O aparelho era
 * 268×420 e 300×420 — 1:1,57 e 1:1,4, um retângulo atarracado que celular
 * nenhum tem. Agora é 268×560 (1:2,09) e 300×620 (1:2,07) a partir de `xl`,
 * que é a razão de um aparelho atual (um iPhone 15 é 1:2,17). A LARGURA não
 * mudou, e por isso o raio também não: num telefone o arredondamento é função
 * da largura (2,6rem = 42px = 14% de 300, que é a proporção do aparelho real),
 * e mexer nele com a largura parada é que deixaria o raio desproporcional.
 *
 * ALTURAS RESERVADAS, CLS ZERO
 *
 * A tela tem 548px cravados (608 a partir de `xl`) e cada bloco a sua medida:
 * barra de status 30, cabeçalho 49, faixa do país 30, o rodapé do compositor 72
 * e, entre eles, o chat — a ÚNICA faixa elástica da tela (`flex-1`), que é
 * quem absorve os 60px de diferença entre os dois tamanhos. As batidas dentro
 * dela continuam com altura cravada e as que ainda não chegaram ficam MONTADAS
 * e invisíveis (`opacity-0`, nunca `hidden`): a altura não muda em nenhum
 * momento do ciclo, e com a moldura de 5px o aparelho mede 560/620px fixos em
 * qualquer batida.
 *
 * O chat fica ancorado no ALTO, e o vão que sobra embaixo dele é de propósito:
 * é como uma conversa recém-começada se parece de verdade (três mensagens no
 * topo da linha do tempo, o resto do fio vazio e o campo de digitação no pé).
 * Ancorar as bolhas embaixo empurraria a oferta — a única coisa desta tela que
 * PRECISA estar na primeira dobra do celular — uns 70px para baixo.
 *
 * NADA DISTO ANIMA NA ENTRADA
 *
 * `started` nasce `false` no servidor e no primeiro render do cliente, e o
 * primeiro render é o Brasil com as três batidas pintadas. Ele só vira `true`
 * dentro do primeiro avanço do relógio, 2,6 s depois da montagem — e naquele
 * mesmo passo o país muda, então os blocos que ganham a classe de entrada são
 * nós novos, não os que já estavam na tela. O `<h1>` ao lado é o elemento de
 * LCP da página: `opacity: 0` em qualquer coisa visível aqui devolveria os
 * 3 segundos de render delay que a etapa 6 tirou.
 *
 * Sem `motion/react` (saiu em 14/10: 42,2 kB transferidos no caminho crítico,
 * FCP −0,42 s e LCP −0,21 s sem ele). As entradas são `@keyframes
 * phone-beat-in` com `key` por batida — montar é animar.
 */
export function PhoneMockup({
  index,
  beat,
  started,
}: {
  /** Índice em `payments.table.countries`: 0 Brasil, 1 Argentina, 2 México, 3 Colômbia. */
  index: number;
  /** 0 oferta, 1 + aprovado, 2 + convite. */
  beat: number;
  /** `true` só depois de o relógio começar a andar e sem movimento reduzido. */
  started: boolean;
}) {
  const { phone, ui, payments, highlights, howItWorks } = useContent();

  const pais = payments.table.countries[index];
  const checkout = highlights.demos.checkout;
  const metodo = metodoDe(pais);
  const valor = `${pais.symbol} ${precoDe(checkout.prices, pais.code)}`;

  /* As batidas cumpridas. A classe de entrada só entra na batida em que o bloco
     aparece — a `key` muda de "0" para "1" ali e em mais lugar nenhum, então o
     "aprovado" não reanima quando o convite chega. */
  const aprovado = beat >= 1;
  const convite = beat >= 2;

  return (
    <div role="img" aria-label={phone.ariaLabel} className="relative w-fit">
      <div
        aria-hidden
        className="rounded-device relative w-[268px] border border-line-strong bg-gradient-to-b from-ink-750 via-ink-850 to-ink-900 p-[5px] xl:w-[300px]"
        style={{ boxShadow: "var(--shadow-device)" }}
      >
        {/* Botões laterais: 2px de largura, do mesmo degrau de tom da moldura.
            É o detalhe que faz o objeto ler como aparelho e não como cartão
            arredondado — e custa três `<span>` sem imagem nenhuma. */}
        <span className="absolute top-[96px] -left-[2px] h-7 w-[2px] rounded-full bg-ink-700" />
        <span className="absolute top-[132px] -left-[2px] h-7 w-[2px] rounded-full bg-ink-700" />
        <span className="absolute top-[116px] -right-[2px] h-11 w-[2px] rounded-full bg-ink-700" />

        {/* A tela. O rim de 1px em creme a 10% por sombra INTERNA é o que separa
            o vidro da moldura; o degradê fica só na moldura, como matéria do
            aparelho. Sem blur e sem halo (o halo laranja que respirava atrás
            daqui saiu na etapa 6: era o maior blur da primeira dobra). */}
        <div className="phone-screen relative flex h-[548px] flex-col overflow-hidden rounded-[2.15rem] bg-ink-950 shadow-[inset_0_0_0_1px_rgba(255,255,227,0.10)] xl:h-[608px]">
          {/* Barra de status — 30 */}
          <div className="flex h-[30px] items-center justify-between px-5">
            <span className="text-[11px] font-medium text-cream">
              <code>21:47</code>
            </span>
            <span className="flex items-center gap-1 text-cream/70">
              <SignalHigh className="h-3.5 w-3.5" />
              <Wifi className="h-3.5 w-3.5" />
              <BatteryMedium className="h-4 w-4" />
            </span>
          </div>

          {/* Ilha dinâmica, com o furo da câmera recuado à direita. O recorte
              preto sobre a barra de status é o que data o aparelho como atual
              — a bolha de 24px centrada que havia aqui era de 2017. */}
          <span className="absolute top-[9px] left-1/2 flex h-[22px] w-[82px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-800" />
          </span>

          {/* Cabeçalho do chat — 49 */}
          <div className="flex h-[49px] items-center gap-2.5 border-b border-line px-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15">
              <WoneIcon className="h-3.5 w-auto" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-cream">
                {phone.botName}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                {phone.online}
              </span>
            </span>
            {/* A ficção se declara dentro do próprio objeto: a tela é uma
                simulação, e quem olha lê isso no mesmo lugar em que lê o nome
                do bot. O palco repete a palavra no rótulo dele. */}
            <span className="t-label ml-auto shrink-0">{ui.simulation}</span>
          </div>

          {/* Faixa do país — 30. É o que amarra a tela ao ponto que acendeu no
              mapa: a bandeira e o ISO da moeda em que o preço abaixo está. */}
          <div className="flex h-[30px] items-center gap-2 px-4">
            <FlagMark code={pais.code} className="h-[14px] w-5" />
            <span className="text-[11px] font-medium text-cream">{pais.name}</span>
            {/* `ml-auto` não é só alinhamento: ancorado à direita, o ISO não se
                mexe quando o nome do país troca de largura (Brasil → Argentina
                → México → Colômbia). Encostado no nome, ele escorregava alguns
                pixels a cada 5 s — um deslocamento minúsculo, mas deslocamento,
                e a meta desta seção é CLS zero. */}
            <span className="ml-auto text-[11px] text-cream/45">
              <code>{pais.code}</code>
            </span>
          </div>

          {/* Chat — a única faixa elástica da tela (367 nos 548, 427 nos 608).
              `gap-4` (e 6 a partir de `xl`) no lugar dos 8px de antes: a altura
              que o aparelho ganhou vira RESPIRO entre as batidas, não bolha
              esticada — bolha de mensagem não cresce com o tamanho do celular,
              o fio é que mostra mais. */}
          <div className="flex flex-1 flex-col gap-4 px-4 pt-3 xl:gap-6">
            {/* Oferta — 136, 152 a partir de `xl`. `key` no país: trocar de país
                é montar de novo, e montar é animar.
                `flex-col` com o preço em `mt-auto`: a folga da caixa cai ENTRE a
                descrição e o bloco de preço + botão, que é como um cartão de
                checkout se organiza (o que se lê primeiro em cima, o que se
                paga embaixo). Com a folga depois do preço, o botão ficava
                flutuando no meio da caixa. */}
            <div
              key={pais.code}
              className={`rounded-field flex h-[136px] flex-col bg-ink-850 px-3.5 py-3 xl:h-[152px] ${
                started ? "phone-beat-in" : ""
              }`}
            >
              <span className="block text-[12px] leading-4 font-semibold text-cream">
                {checkout.product}
              </span>
              <span className="mt-0.5 block text-[11px] leading-4 text-faint">
                {checkout.productNote}
              </span>
              {/* O preço na moeda DO PAÍS, com o ISO em `<code>` ao lado: é a
                  prova do "checkout internacional" em três palavras. */}
              <span className="mt-auto flex items-baseline">
                <span className="text-[17px] leading-5 font-semibold text-cream">{valor}</span>
                {/* Mesma âncora da faixa do país: o valor muda de largura a cada
                    moeda (R$ 197,00 → $ 155.000), e com o ISO colado nele o
                    código andava na horizontal a cada troca. */}
                <span className="ml-auto text-[11px] text-cream/45">
                  <code>{pais.code}</code>
                </span>
              </span>
              {/* `disabled`: nada focável dentro de uma ilustração (o mesmo que
                  `CustomerChat` e `CheckoutDemo` fazem com o botão de produto). */}
              <CtaButton size="object" disabled className="mt-2 w-full">
                {checkout.payWith} {metodo}
              </CtaButton>
            </div>

            {/* Aprovado — 56 */}
            <div
              key={`${pais.code}-pago-${aprovado ? 1 : 0}`}
              className={`h-[56px] ${aprovado ? (started ? "phone-beat-in" : "") : "opacity-0"}`}
            >
              <span className="rounded-field flex h-full items-center gap-2.5 bg-emerald-500/12 px-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <Check className="h-3.5 w-3.5 stroke-[3] text-emerald-400" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[12px] font-medium text-emerald-400">
                    {phone.approved}
                  </span>
                  <span className="block truncate text-[11px] text-cream/60">{valor}</span>
                </span>
              </span>
            </div>

            {/* Convite — 60. O chip fica EMBAIXO, não ao lado: a 268px a tela
                tem 200px úteis dentro da bolha, e "Convite enviado" com o chip
                "Acesso liberado" na mesma linha dá 220 — o `truncate` comeria
                justamente o que a bolha existe para dizer. */}
            <div
              key={`${pais.code}-convite-${convite ? 1 : 0}`}
              className={`h-[60px] ${convite ? (started ? "phone-beat-in" : "") : "opacity-0"}`}
            >
              <span className="rounded-field flex h-full flex-col justify-center gap-0.5 bg-ink-850 px-3">
                <span className="truncate text-[11px] leading-4">
                  <span className="font-medium text-cream">{howItWorks.demo.inviteSent}</span>
                  <span className="text-faint"> · {phone.inviteNote}</span>
                </span>
                <Chip tone="ok" className="w-max">
                  {highlights.demos.delivery.done}
                </Chip>
              </span>
            </div>
          </div>

          {/* Rodapé da tela — 72 cravados: 12 de respiro, o campo de 36 e os 24
              que sobram para a barra de gesto (que mora absoluta nos últimos
              12). É o que o telefone mais alto ganhou de útil: sem o campo de
              digitação, a tela terminava num vão de 130px de preto embaixo das
              bolhas e lia como painel cortado, não como chat.
              INERTE de propósito — `<span>`, não `<input>`: isto é ilustração
              (o pai é `role="img"`, tudo aqui é `aria-hidden`), e um campo de
              verdade seria focável, apareceria na navegação por teclado e
              convidaria a digitar numa tela que não responde. */}
          <div className="flex h-[72px] items-start gap-2 border-t border-line px-3 pt-3">
            <span className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-ink-850 px-3.5">
              <span className="truncate text-[13px] text-faint">{phone.composer}</span>
              <Smile className="ml-auto h-4 w-4 shrink-0 text-cream/35" />
            </span>
            {/* O microfone no mesmo creme-sobre-laranja-a-15% do avatar do bot
                lá em cima: é o único par de cores de "controle" da tela, e
                repeti-lo aqui fecha a moldura do chat sem inventar um terceiro
                tom. */}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15">
              <Mic className="h-4 w-4 text-brand" />
            </span>
          </div>

          {/* Barra de gesto, nos últimos 12px do rodapé */}
          <span className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-cream/25" />
        </div>
      </div>
    </div>
  );
}

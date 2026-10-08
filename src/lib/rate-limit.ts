/**
 * Freio de mão da rota pública.
 *
 * `/api/waitlist` aceita POST de qualquer um, sem autenticação — que é o que
 * uma lista de espera precisa ser. O que faltava era um limite: um laço de
 * `curl` enche o destino de cadastros falsos de graça, e nenhum deles custa
 * mais do que um pedido HTTP.
 *
 * A contagem é em memória, de propósito. O site roda num container só atrás do
 * Easypanel, então um `Map` no processo cobre o caso real sem acrescentar Redis
 * à infraestrutura. Se um dia houver mais de uma réplica, cada uma passa a ter
 * o seu próprio limite — o teto efetivo multiplica pelo número de réplicas, e
 * aí vale trocar isto por um contador compartilhado.
 *
 * Reiniciar o container zera a contagem. Também de propósito: o limite existe
 * para conter abuso barato, não para ser um registro durável.
 */

/** Tamanho da janela deslizante. */
const WINDOW_MS = 60_000;
/**
 * Quantos pedidos um mesmo endereço pode mandar dentro da janela.
 *
 * Dez, e não dois: o limite conta todo POST, inclusive os que o servidor
 * recusa por e-mail inválido. Quem digita errado três vezes e corrige na quarta
 * é gente, não robô, e não pode esbarrar num muro por causa disso. Dez por
 * minuto continua sendo um nada perto do que um script faz.
 */
const MAX_HITS = 10;
/**
 * Teto de quem não dá para identificar — todos no mesmo balde.
 *
 * Em produção o endereço sempre vem (o Cloudflare põe `cf-connecting-ip`, o
 * proxy do Easypanel põe `x-forwarded-for`), então este caminho é o do
 * desenvolvimento local e o de uma eventual configuração torta de proxy. Se
 * esse balde usasse o limite de cima, uma troca de proxy transformaria a lista
 * de espera inteira em dez cadastros por minuto para o site todo — o remédio
 * matando mais que a doença. Alto o suficiente para não atrapalhar um dia de
 * lançamento, baixo o suficiente para não ser porta escancarada.
 */
const MAX_SHARED_HITS = 60;
/** Teto de endereços guardados, para o Map não virar um vazamento de memória. */
const MAX_KEYS = 5_000;
/** Chave de quem chegou sem endereço identificável. */
const UNKNOWN = "desconhecido";

const hits = new Map<string, number[]>();

/**
 * Endereço de quem está chamando.
 *
 * Atrás do Cloudflare, `cf-connecting-ip` é o único cabeçalho que o visitante
 * não consegue forjar — a borda o reescreve. `x-forwarded-for` serve de reserva
 * para quando o site é servido direto, e aí só o primeiro endereço interessa:
 * os seguintes são proxies no caminho.
 */
export function clientAddress(request: Request): string {
  const direct = request.headers.get("cf-connecting-ip");
  if (direct) return direct;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return UNKNOWN;
}

/** Já passou do limite? Conta esta chamada quando ainda não passou. */
export function rateLimited(key: string): boolean {
  const now = Date.now();
  const ceiling = key === UNKNOWN ? MAX_SHARED_HITS : MAX_HITS;
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);

  if (recent.length >= ceiling) {
    /* Regrava a janela podada mesmo ao barrar: sem isto, quem insiste mantém
       para sempre os carimbos antigos na memória. */
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

  /* Faxina preguiçosa: só quando o Map cresce além do teto, e só do que já
     expirou. Um `setInterval` global custaria mais do que isso resolve. */
  if (hits.size > MAX_KEYS) {
    for (const [address, times] of hits) {
      if (times.every((at) => now - at >= WINDOW_MS)) hits.delete(address);
    }
  }

  return false;
}

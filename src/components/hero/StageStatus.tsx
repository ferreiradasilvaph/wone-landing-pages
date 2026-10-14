import { Chip } from "../Chip";
import { FlagMark } from "../FlagMark";

/**
 * Quem nomeia o país da vez abaixo de 1420px.
 *
 * A 1024 e a 412 os rótulos dos pings somem: lá o aparelho ocupa quase todo o
 * palco (e no celular o mapa fica ATRÁS dele, esmaecido), e quatro caixas de
 * texto sobre o mapa cruzariam a moldura. Desde 14/10 isso vale até 1419: com o
 * telefone mais alto o mapa ficou maior, e abaixo de 1420 não cabem os 354px
 * que separam o ponto do México do de São Paulo entre a moldura e a borda da
 * janela (veja `CountryTag`). Esta linha entra no lugar — bandeira, país e o
 * mesmo chip de método · valor local —, ao lado do "pausar", e troca com o
 * relógio do telefone.
 *
 * 44px de altura CRAVADOS, porque o texto troca a cada 5 s: medida reservada é
 * o que mantém o CLS em zero (a linha de "Brasil" e a de "Colômbia" não têm a
 * mesma largura nem o mesmo número de dígitos).
 *
 * `aria-hidden`: ela duplica, em forma visual, o resumo que o palco já entrega
 * em `sr-only`. Uma região viva aqui trocaria de texto a cada 5 s e
 * interromperia a leitura do `<h1>` para sempre.
 */
export function StageStatus({
  code,
  name,
  chip,
}: {
  code: string;
  name: string;
  chip: string;
}) {
  return (
    <div aria-hidden className="flex h-11 min-w-0 flex-1 items-center gap-2 min-[1420px]:hidden">
      <FlagMark code={code} className="h-4 w-6" />
      {/* Largura CRAVADA, e não `auto`: os quatro nomes não têm o mesmo
          comprimento (Brasil, Argentina, México, Colômbia), e com a caixa
          ajustada ao texto o chip ao lado escorregava na horizontal a cada
          troca — deslocamento de layout, que esta seção não pode ter. 68px
          cabem o mais longo dos dois idiomas ("Argentina", 63px em 13px/Geist)
          e deixam o chip da Argentina (o mais largo, 164) caber inteiro nos
          370px úteis de uma tela de 412; `truncate` é a rede de segurança caso
          a fonte caia para uma substituta mais larga. */}
      <span className="w-[68px] shrink-0 truncate text-[13px] font-medium text-cream">{name}</span>
      <Chip tone="neutral" className="min-w-0 truncate">
        {chip}
      </Chip>
    </div>
  );
}

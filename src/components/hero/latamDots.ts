/**
 * GERADO — NÃO EDITE À MÃO. Rode `node scripts/gera-mapa.mjs`.
 *
 * O mapa pontilhado da América Latina do palco do hero, atendendo ao pedido do
 * dono de 14/10 (uma prévia do checkout internacional na página principal, com
 * um mapa como o da referência). Os pontos vêm da máscara de terra de
 * `src/components/demos/landMask.ts` — o mesmo dado do globo 3D da demo de
 * checkout —, varrida em tempo de build para não custar nada no cliente.
 *
 * Projeção: equiretangular, longitude -120° a -30°, latitude 34° a -58°.
 * Passo da grade: 1° (4 unidades de viewBox entre pontos vizinhos).
 * Escala: 4 unidades de viewBox por grau → viewBox "0 0 360 368".
 *
 * `LATAM_RUNS` são os trechos de terra contínua, desenhados com
 * `stroke-dasharray="0 4"` e `stroke-linecap="round"`: o tracejado reinicia em
 * cada subcaminho, então cada trecho vira uma fileira de pontos na grade.
 * `LATAM_DOTS` são as células isoladas, em subcaminhos de comprimento zero
 * (`h0`) numa path SEM `dasharray` — com ele o Chrome pode descartá-las.
 *
 * Tamanho: 1261 + 122 = 1383 caracteres (112 trechos, 14 pontos isolados).
 */

/** O viewBox que as duas paths abaixo pressupõem. Razão 0.978. */
export const LATAM_VIEWBOX = "0 0 360 368";

/** Vão entre dois pontos vizinhos, em unidades de viewBox: o gap do tracejado. */
export const LATAM_GAP = 4;

/** Trechos de terra contínua — `stroke-dasharray="0 4"`. */
export const LATAM_RUNS =
  "M8 0H160M16 4H156M24 8H152M28 12H152M32 16H96M116 16H120M148 16H152M32 20H92M148 20H152M20 24H28M36 24H88M148 24H156M20 28H28M36 28H88M148 28H156M44 32H88M48 36H84M52 40H84M56 44H84M156 44H160M60 48H88M164 48H168M56 52H88M120 52H128M172 52H176M60 56H92M116 56H128M188 56H196M64 60H96M108 60H124M184 60H204M76 64H124M84 68H124M108 72H140M112 76H144M120 80H140M132 84H144M136 88H140M136 92H144M180 92H188M200 92H212M224 92H232M144 96H152M180 96H188M200 96H232M144 100H156M168 100H236M168 104H240M172 108H244M168 112H264M172 116H268M172 120H272M164 124H272M164 128H276M160 132H276M160 136H280M156 140H296M156 144H296M160 148H320M156 152H324M156 156H336M156 160H336M160 164H336M160 168H336M164 172H332M168 176H332M172 180H328M172 184H324M180 188H320M180 192H320M180 196H320M180 200H320M200 204H320M200 208H316M200 212H316M200 216H316M200 220H312M200 224H308M200 228H296M200 232H288M200 236H288M200 240H280M200 244H280M200 248H280M200 252H276M192 256H276M192 260H272M200 264H268M192 268H264M192 272H244M252 272H264M188 276H248M188 280H248M184 284H248M188 288H240M188 292H228M184 296H228M184 300H220M184 304H224M188 308H220M184 312H220M180 316H208M180 320H208M180 324H212M180 328H208M180 332H204M180 336H200M180 340H200M236 340H244M184 344H196M184 348H204M192 352H212";

/** Células de terra isoladas — mesma path, sem `dasharray`. */
export const LATAM_DOTS =
  "M16 8h0M16 12h0M20 16h0M24 20h0M32 32h0M156 32h0M32 36h0M144 44h0M212 60h0M188 88h0M160 96h0M156 104h0M304 144h0M204 356h0";

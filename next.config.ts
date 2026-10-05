import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* `experimental.inlineCss` foi testado e revertido.
     Ele injeta o CSS da rota no <head> e remove o único recurso bloqueante da
     página (12,7 kB custando 157 ms). O problema é o que entra no lugar: o
     documento saltou de 21,8 kB para 57,6 kB transferidos, porque o CSS deixa
     de ser um arquivo com cache próprio e viaja dentro do HTML a cada visita.
     No 4G simulado do Lighthouse o FCP subiu de 1,28 s para 1,42 s. Trocar 157
     ms de bloqueio por 36 kB no caminho crítico é prejuízo. */
};

export default nextConfig;

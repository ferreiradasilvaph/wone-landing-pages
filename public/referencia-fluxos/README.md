# referencia-fluxos

Pasta de **referência visual e de comportamento** para a demo do editor de fluxos
da landing (`src/components/demos/FlowEditorDemo.tsx`).

Coloque aqui o frontend dos fluxos da plataforma. O que interessa:

- componentes do canvas, do nó e da aresta (geometria, raio, espaçamento);
- a tabela de cor e ícone por categoria de bloco;
- os nomes reais dos blocos e das categorias;
- o painel de propriedades (quais campos aparecem por tipo de bloco).

O que **não** deve vir para cá, nem para a landing:

- código de backend, handlers, migrations, filas;
- clientes de API, chaves, `.env`, token, credencial de qualquer tipo;
- dados de cliente real.

## Esta pasta é ignorada pelo git

O `.gitignore` do projeto ignora todo o conteúdo daqui (só este README é
versionado), para que o código da plataforma não entre no repositório da landing
num `git add`. A demo da landing é 100% mockada e não importa nada desta pasta
em tempo de build — ela serve para eu ler e reproduzir o visual.

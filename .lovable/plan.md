# Mapa da Inovação em motorinovacao.com.br/mapa

Três coisas: tirar a comprovação de extração da página pública, criar a página `/mapa` dentro do site (fim do HTML solto) e fazer o mapa ler os dados direto da base, sem arquivo intermediário.

## 1. Página pública limpa

Remover a seção "Mapa da Inovação — Comprovação de Extração" de `/conceito`. Ela reaparece dentro de `/mapa`, num painel recolhido ("Comprovação de extração — 21/24 bases"), que o visitante abre se quiser conferir a procedência.

## 2. Nova página `/mapa`

Mapa sóbrio, sem camadas de satélite nem blocos de rua: apenas o contorno do Brasil com as divisões dos 27 estados, em tons claros, e os pontos por cima. Estado com mais registros fica levemente mais escuro, então já se lê a concentração antes de qualquer clique.

Coluna lateral fixa à esquerda, com filtros que funcionam de verdade (todos combinam entre si e atualizam o mapa na hora):

- Busca por nome ou cidade
- Base de origem, com a contagem ao lado de cada uma (StartupBase, OpenAlex, Observatório CGEE/MCTI, LISP, SINAPAD…)
- Tipo de instituição
- Estado (lista, e também clicando no estado no mapa)
- Botão "limpar filtros" e o total de pontos visíveis sempre à vista

Clicar num ponto abre a ficha: nome, tipo, cidade/UF, base de origem, link da fonte. Abaixo da lateral, exportar o recorte filtrado em CSV (com fonte e fonte_url em cada linha, como já é a regra).

Cabeçalho institucional igual ao resto do site (UFPR/PPGPP, Pesquisa Colaborativa do Mapa da Inovação) e a data da última coleta.

## 3. Integração automática com a base

A página consulta a base de locais de pesquisa a cada acesso — nada de lista congelada dentro do arquivo. Quando uma nova ingestão entra na base, o mapa mostra no acesso seguinte. Para ser rápido: uma única consulta enxuta (só os campos que o mapa usa), cache em memória durante a sessão e desenho dos pontos agrupado, de forma que os ~5.700 pontos apareçam sem travar. Enquanto carrega, aparece o esqueleto do mapa; se a consulta falhar, aparece o erro real — sem dado inventado.

Link "Mapa" no menu do site.

## Detalhes técnicos

- `src/pages/Mapa.tsx` + rota `/mapa` em `src/App.tsx`; link no `Header.tsx`.
- Mapa em SVG com `react-simple-maps` (ou projeção d3-geo direta) usando a malha de UFs do IBGE (`servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=intermediaria`), cacheada em `public/` como GeoJSON estático para não depender da API em runtime. Sem tiles.
- Dados via `fetchResearchLocations` de `src/lib/researchLocations.ts` (mantém a regra de `fonte`/`fonte_url`), com `select` reduzido e filtro client-side; React Query com `staleTime` alto.
- Pontos como `<circle>` projetados, raio fixo pequeno; renderização em canvas se o SVG passar de ~4k nós.
- Reuso de `toCsv`/`downloadLocations` para exportação; `safeHttpUrl` em todo link externo.
- `BASES_MAPA`, `PILAR_COR` e `MapaExtracaoSection` saem de `src/pages/Conceito.tsx` para `src/components/mapa/ComprovacaoExtracao.tsx`, sem alterar conteúdo.
- Publicação em `motorinovacao.com.br/mapa` pelo publish normal do projeto.

## Fora do escopo

Nenhuma mudança na busca, nos painéis das personas ou no banco. O HTML solto deixa de ser necessário, mas não será apagado dos Arquivos.

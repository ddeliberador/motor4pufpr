# ADR-0002 — Mapa da Inovação em MapLibre GL (WebGL)
Data: 2026-10-21  
Status: aceita e implementada (branch `mapa-maplibre`)  
Decidido por: Décio Dalton Deliberador Filho

## Contexto

O `MapaBrasil` era um SVG montado à mão (`viewBox` manipulado para zoom e
arrasto, projeção de Mercator própria, 27 `<path>` das UFs e um nó de DOM para
cada marcador, antena, datacenter e usina). Funciona para centenas de pontos,
mas trava ao ligar camadas densas (22 mil usinas da ANEEL, antenas do
OpenCelliD) e não tem como descer ao nível municipal sem criar milhares de
nós. Cada toggle de camada remontava a árvore inteira.

A referência usada para pensar a melhoria foi o Global Election Simulator
(globalelectionsimulator.com/brazil): React + Vite, polígonos dos 5.570
municípios desenhados em canvas pelo Leaflet, fundo vetorial por MapLibre GL
sobre tiles da OpenFreeMap, geometria municipal fatiada por UF e carregada sob
demanda, dados separados da geometria e unidos no navegador pelo código IBGE.

## Decisão

1. **Motor de renderização**: MapLibre GL puro (sem Leaflet), tudo na GPU.
   Cada camada do Motor vira uma *layer* nativa, ligada e desligada por
   `visibility`; os dados entram por `setData` em fontes GeoJSON.
2. **Mesma interface de props**: `MapaBrasil` mantém o contrato anterior
   (pontos, UFs, layers 1 a 7, âncoras PBIA, visão regional). A única mudança
   é a camada de interação EMBRAPII, que deixa de ser um `sobreposicao` em SVG
   e passa a ser a prop `interacao` (arcos agregados + unidades), desenhada
   pelo próprio mapa.
3. **Fundo sóbrio por padrão**: sem tiles, só o contorno das UFs sobre a cor do
   tema, como antes. O usuário pode trocar para Claro/Escuro (OpenFreeMap,
   sem chave) ou Satélite (Esri World Imagery); a escolha fica no
   `localStorage`. A CSP do `index.html` libera `tiles.openfreemap.org` e
   `server.arcgisonline.com`.
4. **Malha municipal sob demanda**: `public/br-mun/{código IBGE da UF}.geojson`
   (27 arquivos, 3 MB no total, geometria simplificada a ~12% dos vértices,
   5 casas decimais, propriedades `id` e `name`). Carregada quando o zoom passa
   de 5,5 para as UFs visíveis, com cache em memória. Fonte: malha IBGE via
   tbrugz/geodata-br, simplificada com mapshaper.
5. **Clusters por categoria** usam o cluster nativo do MapLibre (uma fonte por
   categoria), com o contador desenhado como imagem.
6. **Sem dependência de servidor de glifos**: ícones Material Symbols, badges
   de cluster e rótulos regionais são rasterizados em canvas e registrados com
   `map.addImage`. Assim o modo sóbrio funciona mesmo sem rede externa.
7. **Exportação PNG** pelo botão do mapa (`preserveDrawingBuffer`).

## Consequências

- Dezenas de milhares de pontos sem custo de DOM; toggles de camada instantâneos.
- Abre caminho para coropléticos municipais e para animar a régua de tempo
  recolorindo polígonos, sem baixar geometria de novo.
- Um coroplético municipal só deve ser ligado para bases que de fato têm dado
  municipal real; pintar 5.570 municípios com bases incompletas daria uma
  aparência de cobertura que o projeto não tem.
- `demo-mapa/` é um harness visual com dados sintéticos
  (`npm run demo:mapa`), útil para testar o mapa sem Supabase.

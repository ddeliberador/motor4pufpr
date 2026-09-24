# Remover "Métricas do cruzamento" e corrigir a Listagem filtrada para as Camadas de IA

## Resposta à pergunta
Não. Em "Camadas no mapa", só quatro itens são das Camadas de IA:
- Usina de energia → Layer 1
- Cabo submarino e Backhaul municipal → Layer 2
- Datacenter → Layer 3

Os outros itens são atores do SNI e vêm das bases da pesquisa: Universidade, Instituto/ICT, Laboratório, Startup, Supercomputação, EMBRAPII/NIT, Incubadora/parque/hub e Não classificado.

## O que será feito

1. **Remover "Métricas do cruzamento"**: sai o botão da barra e o painel. Ficam só "Listagem filtrada" e "Políticas", e abrir um fecha o outro.

2. **Datacenters (e as demais camadas de IA) visíveis na lista**
   - Causa provável: a lista mostra os itens em páginas. Os locais das camadas de IA ficam no fim, depois dos cerca de 6 mil locais do SNI. Por isso não aparecem na primeira página.
   - Correção: se o usuário marcar só algumas categorias em "Camadas no mapa", como Datacenter, a lista mostra só essas categorias, a partir do topo.
   - Com todas as categorias marcadas, os locais das camadas de IA ligadas aparecem primeiro, agrupados por layer.
   - Antes de corrigir, vou reproduzir o problema no navegador para confirmar a causa.

3. **"Camadas no mapa" dividida em dois blocos**
   - "Atores do SNI" (as bases da pesquisa)
   - "Camadas de IA", com o selo da layer ao lado: L1 Usinas, L2 Cabos, L2 Backhaul, L3 Datacenters
   - Marcar um item de IA liga a layer correspondente. Desligar a layer desmarca o item, para que os dois controles não fiquem contraditórios.

4. **Validação no navegador** (computador e celular): ligar a Layer 3 e marcar Datacenter, conferir os datacenters no topo da lista e a contagem "X selecionados de Y". Repetir com usinas, cabos e backhaul.

## Detalhes técnicos
- `Mapa.tsx`: remover o estado `metricas`, o botão, o render de `MetricasCruzamento` e o `metricasItens`. Manter o arquivo do componente sem uso ou apagá-lo, se não houver outras referências.
- Ordenação de `selecionados` antes de passar à `ListaFiltrados`: infraestrutura (L1/L2/L3) antes do SNI.
- `tipos.ts`: adicionar o campo `layer?: "L1" | "L2" | "L3"` em `Categoria`, para agrupar a sidebar.
- Sincronizar `camadas` com `layer1Ativa`, `layer2Ativa`/`l2Cabos`/`l2Backhaul` e `layer3Ativa` nos dois sentidos.

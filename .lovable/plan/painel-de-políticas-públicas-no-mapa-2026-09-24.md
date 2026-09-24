# Painel de políticas públicas no Mapa

## Implementação

- Adicionar a curadoria fornecida em `public/politicas-layers.json`, preservando fontes, valores e links por layer.
- Criar o painel flutuante com carregamento do arquivo público, estados de carregamento/erro, agrupamento por layer, expansão inline, recolhimento e fechamento.
- Integrar o painel à página do Mapa: detectar L1, L2, L3 e L7 ativas, exibir o controle “Políticas” apenas nesse estado e permitir reabrir após fechar.
- Manter SNI sempre incluída quando houver alguma Camada de IA ativa, sem alterar dados, filtros ou renderização das camadas existentes.

## Ajustes de interface

- Posicionar o painel sobre o canto inferior direito da área do mapa e preservar a legenda no canto esquerdo.
- Em telas menores, limitar largura e altura ao espaço disponível para evitar sobreposição incoerente.
- Usar os controles e tokens visuais existentes, com rótulos acessíveis nos botões de recolher e fechar.

## Validação

- Verificar compilação e erros do preview.
- Testar no navegador: ativar uma layer, abrir/recolher/fechar/reabrir o painel, expandir uma política e confirmar o link externo.

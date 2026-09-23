# Implementar Layers 1 e 3 no Mapa

## Objetivo
Adicionar Energia (ANEEL) e Infraestrutura Lógica (PeeringDB) às Camadas de IA, desligadas por padrão, carregadas somente ao serem ativadas e desenhadas abaixo dos marcadores SNI.

## Implementação
- Acrescentar os tipos `UsinaAneel` e `Datacenter` ao módulo de dados das camadas.
- Criar estados e carregamento lazy independente para ANEEL e PeeringDB, com falhas explícitas no console e encerramento correto do estado de carregamento.
- Transformar os placeholders das Layers 1 e 3 em checkboxes funcionais; manter Layers 4–6 como “em breve”.
- Passar os novos dados ao mapa e renderizar usinas como círculos por fonte/tamanho de potência e datacenters como quadrados amarelos, sempre abaixo dos pontos SNI.
- Substituir a legenda exclusiva da Layer 2 por uma legenda dinâmica das camadas ativas.
- Liberar apenas os domínios públicos necessários na política de conexão da página.

## Validação
- Confirmar respostas reais e formatos das APIs públicas.
- Verificar no navegador ativações separadas e simultâneas, estados de carregamento, símbolos e legenda.
- Validar desktop e mobile, sem alterar filtros, seleção ou marcadores SNI existentes.

## Observação técnica
Os identificadores das usinas serão estáveis e derivados do tipo/atributos/posição, evitando chaves aleatórias entre carregamentos. Se a API oficial divergir dos IDs ou campos fornecidos, será adotado o esquema real validado, mantendo o mesmo resultado visual e informacional.

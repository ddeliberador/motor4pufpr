# Fontes de Dados para Enriquecimento do Motor4PUFPR

## 1. IBGE (SIDRA e Indicadores)
- **Produção Industrial, Comércio, Serviços, Agropecuária**
  - API SIDRA: https://sidra.ibge.gov.br/home/api
  - Exemplo: Produção Industrial Mensal (Tabela 3653)
    - Endpoint: https://sidra.ibge.gov.br/geratabela?format=json&name=t3653
- **Mercado de Trabalho (PNAD Contínua)**
  - API: https://servicodados.ibge.gov.br/api/v2/indicadores/4094
  - Indicadores: ocupação, desemprego, rendimento
- **PIB por setor e região**
  - API: https://servicodados.ibge.gov.br/api/v2/indicadores/5938
- **Indicadores de Inovação e Tecnologia**
  - Pesquisa de Inovação (PINTEC)

## 2. CNPq/CAPES
- **Bolsas por área do conhecimento**
  - CNPq: http://dadosabertos.cnpq.br/
  - CAPES: https://dadosabertos.capes.gov.br/
- **Projetos de pesquisa financiados**
- **Distribuição de pesquisadores por área/região**

## 3. Ministério do Trabalho (RAIS/CAGED)
- **Vagas abertas/fechadas por setor**
- **Salários médios por ocupação**
- **Movimentação do emprego formal**
  - CAGED: https://pdet.mte.gov.br/novo-caged
  - RAIS: http://pdet.mte.gov.br/rais

## 4. Outras Fontes
- **ComexStat (Exportação/Importação):** https://comexstat.mdic.gov.br/pt/api
- **Startups/Inovação:** https://dados.gov.br/dataset/startups
- **Portais de emprego:** LinkedIn, Indeed, etc (scraping ou APIs públicas)

---

## Sugestão de Integração e Cruzamento
- Relacionar produção industrial (IBGE) com vagas de emprego (CAGED/RAIS) e bolsas de pesquisa (CNPq/CAPES)
- Identificar setores com maior crescimento de produção e demanda por profissionais
- Mapear regiões com maior concentração de pesquisa, produção e emprego
- Utilizar séries históricas para prever tendências de demanda produtiva

---

## Exemplos de Endpoints
- Produção industrial mensal (IBGE):
  - https://servicodados.ibge.gov.br/api/v2/conjuntos/3653/valor/PR?periodo=202401
- Emprego formal (CAGED):
  - https://pdet.mte.gov.br/novo-caged
- Bolsas de pesquisa (CNPq):
  - http://dadosabertos.cnpq.br/

---

## Observações
- Sempre verificar a documentação oficial das APIs para parâmetros e formatos atualizados.
- Para dados não disponíveis via API, considerar download de datasets ou scraping autorizado.

---

Este documento serve como referência inicial para enriquecer o Motor4PUFPR com dados públicos relevantes à demanda produtiva.
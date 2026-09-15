# Comprovação de Extração — 24 Bases Integradas do Mapa da Inovação

Planilha Excel única, com uma aba por base, para envio à professora Eunice Liu como comprovação de que cada base integrada responde e devolve dados reais.

## As 24 bases (conforme o catálogo oficial do Mapa)

Pilar 1 — P,D&I: MCTI Indicadores, SIDRA/IBGE, INPI/RPI, OpenAlex
Pilar 2 — Atores/Capital Humano: INEP Censo, CAPES/Sucupira, DATANIT/FORMICT, Receita Federal CNPJ, StartupBase, Lattes/LattesData
Pilar 3 — Financiamento: Editais Finep/CNPq/CAPES, FAPs (BV-FAPESP), CVM Dados Abertos, ABVCAP, Lei do Bem, PNCP
Pilar 4 — Infraestrutura: Anatel, DATASUS/SISAB, ANTT/ANAC, IBGE PNAD, Ipeadata, Portal da Transparência
Transversal: dados.gov.br, BrasilAPI

## Como a extração será feita

Cada base é consultada ao vivo, com o recorte que dá o retorno mais rico e verificável (tema de inovação/tecnologia, Paraná quando a base aceita filtro territorial, competência/edição mais recente disponível). Nada de dado simulado: se uma base falhar, a aba registra a falha com o erro e o horário — a comprovação inclui o que funcionou e o que não funcionou.

## Estrutura da planilha

**Aba "Índice"** — uma linha por base: nº, nome da base, pilar, endereço consultado, consulta feita, situação (respondeu / falhou), nº de registros retornados, data e hora da extração (UTC-3), autenticação exigida.

**24 abas, uma por base** — cada uma com um cabeçalho de identificação fixo:
- Base, pilar, órgão/mantenedor
- Endereço exato consultado (URL/endpoint)
- Parâmetros da consulta
- Data e hora da extração
- Situação e quantidade de registros
- Em seguida, a tabela com os registros retornados (amostra de até 200 linhas por aba, com o total real declarado no cabeçalho)

Cabeçalhos em negrito, colunas dimensionadas, fonte Arial, identificação institucional UFPR — Doutorado em Políticas Públicas / Mapa da Inovação no topo de cada aba.

## Detalhes técnicos

- Script Python temporário (httpx + openpyxl) executado no sandbox, chamando as APIs públicas diretamente — mesma lógica dos conectores em `backend/app/connectors/`, sem depender da chave do backend Railway.
- Bases sem API REST (INPI/RPI, CAPES, INEP, StartupBase, ABVCAP, Lei do Bem, DATANIT, FAPESP, MCTI) são extraídas pela via real que o conector usa: pacote XML da RPI, CKAN/CSV, ou curadoria documentada — a aba deixa explícito o tipo de acesso.
- Restrições já conhecidas e que serão registradas como tal se ocorrerem: `dados.gov.br` exige chave gov.br; Transferegov responde 403 (não está entre as 24).
- Cada página da planilha é inspecionada antes da entrega (conversão para imagem) para conferir layout, texto cortado e ordenação.
- Arquivo final salvo em Arquivos: `comprovacao-extracao-24-bases-mapa-inovacao.xlsx`.
- Registro da extração no Diário de Construção (categoria integração externa, marcado como Mapa da Inovação), sem outras alterações no app.

## Fora do escopo

Nenhuma mudança de interface, de busca ou de banco além da entrada no Diário.

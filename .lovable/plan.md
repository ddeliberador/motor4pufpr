# Camada permanente de locais de pesquisa (research_locations)

Nova camada de dados que existe independente de busca: um cadastro nacional de universidades, ICTs, institutos e unidades EMBRAPII, alimentado por ingestões e sempre carregando a fonte de origem de cada registro.

## O que eu confirmei nas fontes oficiais antes de escrever isto

- **INEP (fonte primária confirmada):** `https://download.inep.gov.br/microdados/microdados_censo_da_educacao_superior_2024.zip`, listado na própria página de microdados do INEP (gov.br/inep). O pacote contém o cadastro de IES com UF e código IBGE de município. Não vou usar o espelho da prefeitura do Recife que aparecia nas buscas. **Ressalva:** o download do INEP deu timeout a partir deste ambiente; a ingestão vai rodar pelo backend/função e, se o arquivo não vier, eu aviso em vez de gravar resultado parcial.
- **MCTI/FORMICT:** existe a base aberta consolidada (`formict_anobase_2024.xlsx`), mas eu abri o arquivo: o CNPJ vem mascarado (`00.XXX.XXX/0001.XX`) e **não há razão social** — é inútil para cadastrar locais. A única lista nominal é a de **ICTs não respondentes** (PDF oficial, ano-base 2024, com CNPJ + razão social). Vou usar essa, marcando em cada registro `{"lista_parcial": true, "motivo": "apenas ICTs não respondentes do FORMICT ano-base 2024"}`, e cruzar o CNPJ com o conector BrasilAPI que já existe para obter município/UF.
- **EMBRAPII:** a lista de ~91 unidades **não existe** nesta conversa nem no código do projeto (procurei em ambos), e o site da EMBRAPII respondeu 503 agora. Vou tentar novamente no momento da ingestão; se não vier, registro zero e te aviso — não vou inventar unidades nem estados.
- **OpenAlex:** já temos o padrão pronto em `layer-knowledge` (instituições brasileiras com `geo.region`, `geo.city`, latitude e longitude reais).

## Banco de dados

Tabela `research_locations`: nome, tipo, uf, municipio, latitude, longitude, fonte, fonte_url, cnpj, data_coleta, raw_metadata (jsonb), além de id/created_at/updated_at.

- Leitura pública (qualquer visitante).
- Escrita apenas por serviço interno (ingestões) — usuário final não escreve.
- Chave única por (fonte, nome, uf) para a ingestão poder rodar de novo sem duplicar.
- Índices por uf, fonte e tipo.

## Ingestões

Uma função de backend `locations-ingest`, chamada com o nome da fonte, cobrindo as quatro:

1. **openalex** — varre as instituições brasileiras do OpenAlex (mesmo padrão já usado), grava nome, cidade, UF, lat/lon, `fonte_url` = URL do registro OpenAlex da instituição.
2. **embrapii** — tenta a página oficial de unidades; sem cidade/coordenada confiável, grava só UF e município nulo. `fonte_url` = página de unidades.
3. **inep_censo_superior** — baixa o ZIP oficial, lê o cadastro de IES, traduz o código IBGE de município para nome, grava cada IES. `fonte_url` = URL do ZIP.
4. **mcti_formict** — lê o PDF de ICTs não respondentes, extrai CNPJ + razão social, consulta BrasilAPI para município/UF, grava com a marca de lista parcial.

Cada registro recebe `data_coleta` e o registro original completo em `raw_metadata`.

## Exportação

Um utilitário único de exportação (CSV e JSON) usado por qualquer tela ou download dessa camada, com `fonte` e `fonte_url` como colunas obrigatórias em toda linha — não há caminho de exportação sem elas.

## Entrega

Rodo as quatro ingestões uma vez e te informo a contagem por fonte, e explicitamente qual falhou e por quê (INEP indisponível, PDF do MCTI ilegível, EMBRAPII sem lista), sem preencher lacuna com estimativa.

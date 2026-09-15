# Filtros granulares por base no Mapa

Objetivo: a coluna lateral do `/mapa` passa a ter um bloco de filtros **por base**, que aparece quando aquela base está selecionada. Só entram filtros com dado real; nada é inventado.

## O que já dá para filtrar hoje (dado real na base)

| Base | Filtros |
|---|---|
| StartupBase (3.310) | Setor/segmento, Estado, Município |
| OpenAlex (1.971) | Tipo de instituição (universidade, empresa, hospital, governo, sem fins de lucro, arquivo, agência de fomento), Estado, Município |
| LISP Brasil (108) | Poder/esfera (Executivo, Legislativo, Ministério Público, Tribunal de Contas, Defensoria, Universidade), Nível federativo (Federal/Estadual/Municipal), Ano de criação |
| EMBRAPII (95) | Tipo de instituição (Universidade Federal, Instituto Privado, SENAI etc.), Região, Estado |
| Observatório CGEE (351) | Tipo de unidade (hub de inovação, laboratório de inovação, laboratório de pesquisa, unidade EMBRAPII) |
| FORMICT (121) | Estado, Município |
| SINAPAD (10) | Instituição-sede, ativo/inativo |

## Enriquecimento com coleta real (para chegar na granularidade pedida)

1. **OpenAlex — Domínio, Campo, Subcampo e Tópico.** A API oficial devolve esses quatro níveis por instituição (`topics` com `domain`/`field`/`subfield`). Coleta em lotes de 50 instituições (~40 chamadas), guardando o domínio, o campo e os 5 tópicos principais de cada instituição. Vira quatro filtros encadeados.
2. **EMBRAPII — Competência tecnológica.** A API oficial das unidades traz as competências (`tech_skills`) e linhas de atuação de cada unidade. Coleta as 95 unidades + os nomes das competências. Vira filtro de competência (Segurança Cibernética, 5G/6G, Agricultura Digital etc., exatamente como a EMBRAPII classifica).
3. **FORMICT — Natureza administrativa e tipo de ICT.** Vem da natureza jurídica oficial do CNPJ (Fundação Federal, Autarquia Estadual, Associação Privada sem fins lucrativos, S.A. etc.), consultada uma vez para os 121 CNPJs. Vira dois filtros.

Os dados enriquecidos são gravados na própria base (dentro dos metadados de cada registro), com a fonte e a data da coleta — assim o mapa continua consultando só a base, sem chamada externa a cada acesso.

## O que NÃO existe em fonte pública hoje (não será criado)

Estes campos foram pedidos mas nenhuma fonte oficial os publica de forma aberta e reaproveitável. Ficam registrados como pendência no Diário, com o próximo passo de cada um:

- StartupBase: estágio de maturidade (ideação/tração/scale-up), modelo de negócio (B2B, B2C, SaaS, marketplace) e tecnologia principal — o mapeamento público da ABStartups só divulga o segmento.
- Observatório CGEE: tema da solução, status de maturidade, abrangência e parcerias — o endpoint de laboratórios do observatório saiu do ar (404) e a versão coletada não trazia esses campos.
- FORMICT: área de conhecimento e TRL — o relatório aberto do MCTI não publica isso por ICT.
- LISP: tipo de laboratório e área de atuação — o mapeamento consolidado não distingue.
- SINAPAD: tipo de recurso, área de aplicação e porte computacional — não publicados de forma estruturada (10 centros; possível levantamento manual futuro).

## Detalhes técnicos

- Coleta em scripts pontuais no sandbox (httpx/psql), gravando em `raw_metadata` de `research_locations` via migração/insert protegido; falha explícita, sem dado simulado.
- `src/pages/Mapa.tsx`: novo componente `src/components/mapa/FiltrosPorBase.tsx` com os grupos por base, todos multisseleção, entrando no resumo de "filtros aplicados", no CSV e no PDF.
- Facetas derivadas dos registros carregados (contagem ao lado de cada opção), no mesmo padrão dos filtros atuais.
- Entrada no Diário de Construção (Mapa da Inovação) com as coletas feitas e as lacunas.

# Mapeamento de Bases — Motor da Inovação × Mapa da Inovação
**Data do diagnóstico:** 21/09/2026  
**Medido em:** tabela `research_locations` (Supabase) + conectores `backend/app/connectors/`  
**Total de bases mapeadas:** 29  
**Autoria:** Décio Dalton Deliberador Filho · UFPR/PPGPP

---

## Contexto

O Motor da Inovação e o Mapa da Inovação compartilham a mesma infraestrutura, mas consomem as bases de dados de formas diferentes:

- **Motor de busca:** recebe uma consulta em linguagem natural, aciona as APIs em tempo real e retorna resultados contextualizados por perfil (Gestor, Empresa, Pesquisador, Universidade). As bases alimentam a camada de inteligência — não ficam armazenadas como locais.
- **Mapa da Inovação:** exibe locais georreferenciados de atores do SNI (startups, ICTs, universidades, laboratórios) armazenados na tabela `research_locations`. Alimentado por ingestão periódica via Edge Functions.

O diagnóstico identificou que 607 registros de atores relevantes estão **visíveis no Mapa mas invisíveis na busca do Motor** — o usuário que busca "laboratório de inovação pública" ou "supercomputação" não encontra esses atores nos resultados.

---

## 🔵 Bases exclusivas do Motor

Alimentam a busca inteligente e os painéis por perfil. Não geram registros em `research_locations` — retornam contexto, não locais.

| Base | Conector Python | O que traz ao Motor |
|------|----------------|---------------------|
| INPI / RPI | `inpi_rpi.py` | Patentes, marcas e programas de computador por IPC e depositante |
| PNCP | `pncp.py` (Edge Function) | Pregões e contratos públicos abertos por UF e CNAE |
| Portal da Transparência | `transparencia.py` | Convênios federais vigentes por UF e órgão |
| IPEAData | `ipea.py` | Séries macroeconômicas: PIB, câmbio, juros, balança |
| SIDRA / IBGE | `sidra.py` (Edge Function) | PINTEC, PNAD Contínua, CAGED, séries setoriais |
| CAPES / Sucupira | `capes_sucupira.py` | Programas de pós-graduação, bolsas, discentes |
| Anatel | `anatel.py` | Cobertura móvel e banda larga por município |
| SISAB / Datasus | `sisab.py` | Cobertura de Atenção Primária à Saúde por UF/município |
| ANTT / ANAC | `antt_anac.py` | Infraestrutura de transporte rodoviário e aéreo |
| CVM Dados Abertos | `cvm_dados.py` | Companhias abertas, fundos de investimento (FIP/FIEE) |
| Lei do Bem / MCTI | `lei_do_bem.py` | Incentivo fiscal P&D + calculadora de benefício |
| ABVCAP | `abvcap.py` | Mercado de Private Equity e Venture Capital |
| BV-FAPESP | `fapesp_bv.py` | Projetos de pesquisa (PIPE, PITE, Temático, Regular) |
| Lattes / LattesData | `lattes.py` | Pesquisadores e grupos de pesquisa CNPq |
| PNAD Contínua | `pnad_sidra.py` | Ocupação e emprego por setor via SIDRA v3 |
| BrasilAPI / CNPJ | `brasilapi.py` | Enriquecimento de cadastro empresarial por CNPJ |
| MCTI Indicadores CT&I | `mcti_indicadores.py` | Indicadores nacionais de P&D (% PIB, pesquisadores, patentes) |
| Editais Finep / CNPq | `editais_fomento.py` | Chamadas abertas de fomento com prazo e elegibilidade |

---

## 🟢 Bases compartilhadas

Presentes tanto no Mapa (registros em `research_locations`) quanto no Motor de busca (contexto e enriquecimento).

| Base | Fonte em `research_locations` | Registros | Uso no Motor |
|------|------------------------------|-----------|--------------|
| **OpenAlex** | `openalex` | 1.972 | Produção científica por tema, instituição e país |
| **ABStartups / StartupBase** | `abstartups_2025` | 3.310 | Ecossistema de startups por UF e setor |
| **MCTI / FORMICT** | `mcti_formict` | 125 | NITs e ICTs para parceria empresa-universidade |

**Total compartilhado:** 5.407 registros

**Atenção — item INT-10 no backlog:** investigar se `abstartups_2025` (Mapa) e o conector `startupbase.py` (Motor) consomem a mesma base ou versões complementares. Risco de duplicata conceitual.

---

## 🟠 Bases exclusivas do Mapa

Geram registros em `research_locations` e aparecem no Mapa, mas **não chegam ao Motor de busca**. Atores relevantes ficam invisíveis quando o usuário pesquisa por tema.

| Base | Fonte em `research_locations` | Registros | Tipo de ator | Problema de qualidade |
|------|------------------------------|-----------|--------------|----------------------|
| **OTD / CGEE** | `otd_cgee` | 393 | Laboratórios, ICTs, observatórios | Sem CNPJ em maioria; sobreposição com `embrapii` (INATEL/MG e Instituto Atlântico/CE) |
| **LISP Brasil** | `lisp_brasil_mapeamento` | 108 | Laboratórios de inovação do setor público | Sem URL individual (90%); coordenadas por centroide de município |
| **EMBRAPII** | `embrapii` | 96 | Unidades credenciadas EMBRAPII | **Zero coordenadas** — todos os 96 registros sem lat/lng; score médio 32,9 |
| **SINAPAD** | `sinapad` | 10 | Centros de supercomputação | Base estática; atualização manual |

**Total exclusivo do Mapa:** 607 registros

### Por que isso importa para a tese

Esses 607 atores são precisamente os que interessam para análise de política pública de inovação — laboratórios públicos (LISP), unidades de pesquisa aplicada (EMBRAPII), infraestrutura crítica (SINAPAD) e o catálogo do observatório de tecnologias digitais do MCTI (OTD/CGEE). Não aparecerem na busca inteligente é uma lacuna estrutural do SNI digital, não só do Motor.

---

## Ações planejadas

Ver `docs/backlog/backlog.md` itens INT-06 a INT-10.

| Item | Ação | Estado |
|------|------|--------|
| INT-06 | Expor OTD/CGEE ao Motor de busca | independente |
| INT-07 | Expor LISP Brasil ao Motor de busca | independente |
| INT-08 | Expor EMBRAPII ao Motor de busca | bloqueado por QLD-02 (sem coord real) |
| INT-09 | Expor SINAPAD ao Motor de busca | independente |
| INT-10 | Investigar abstartups_2025 vs startupbase | independente |

---

## Como verificar

```sql
-- Confirmar fontes e registros no Gold
SELECT fonte, COUNT(*) as registros, ROUND(AVG(quality_score),1) as score_medio
FROM research_locations
GROUP BY fonte
ORDER BY registros DESC;

-- Verificar EMBRAPII sem coordenadas
SELECT COUNT(*) FROM research_locations
WHERE fonte = 'embrapii' AND (latitude IS NULL OR longitude IS NULL);
-- deve retornar 96

-- Sobreposição OTD/CGEE × EMBRAPII
SELECT nome_norm, fontes FROM (
  SELECT lower(regexp_replace(trim(nome), '\s+', ' ', 'g')) as nome_norm,
         array_agg(DISTINCT fonte ORDER BY fonte) as fontes
  FROM research_locations
  WHERE fonte IN ('embrapii', 'otd_cgee')
  GROUP BY nome_norm
  HAVING COUNT(DISTINCT fonte) > 1
) t;
-- deve retornar INATEL e Instituto Atlântico
```

---

*Motor da Inovação · UFPR · PPGPP · Doutorado em Políticas Públicas (2025–2028)*  
*Doutorando: Décio Dalton Deliberador Filho · Orientador: Prof. Walter Tadahiro Shima*

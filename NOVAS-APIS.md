# Novas APIs Integradas ao Motor 4P UFPR

## 📚 APIs de Bolsas de Estudo

### 1. CAPES (Coordenação de Aperfeiçoamento de Pessoal de Nível Superior)
**Arquivo:** `backend/app/connectors/capes.py`

**Funcionalidades:**
- Busca programas de pós-graduação (Mestrado/Doutorado)
- Lista bolsas ativas por área de conhecimento
- Informações sobre instituições e notas dos programas
- Quantidade de bolsas disponíveis por programa

**Dados Retornados:**
- Nome do programa
- Instituição
- Nível (Mestrado/Doutorado/Pós-doc)
- Área de avaliação
- Nota CAPES
- Bolsas disponíveis
- Valor mensal
- Duração em meses

**Endpoint Base:** `https://dadosabertos.capes.gov.br/api`

---

### 2. International Scholarships (Bolsas Internacionais)
**Arquivo:** `backend/app/connectors/scholarships.py`

**Funcionalidades:**
- Agrega bolsas de múltiplas fontes internacionais
- Bolsas na Europa (Erasmus+, DAAD, Chevening)
- Bolsas nos EUA (Fulbright, Humphrey)
- Bolsas globais (UNESCO, World Bank)

**Dados Retornados:**
- Nome do programa
- Instituição/Organização
- País/Região
- Nível (Master/PhD/Postdoc)
- Campo de estudo
- Valor anual
- Duração
- Prazo de inscrição
- Link para aplicação

**Fontes Incluídas:**
- 🇪🇺 Erasmus Mundus
- 🇩🇪 DAAD (Alemanha)
- 🇬🇧 Chevening (Reino Unido)
- 🇺🇸 Fulbright
- 🌍 UNESCO
- 🏦 World Bank

---

## 🎓 APIs Educacionais

### 3. INEP (Instituto Nacional de Estudos e Pesquisas Educacionais)
**Arquivo:** `backend/app/connectors/inep.py`

**Funcionalidades:**
- Busca instituições de ensino superior por área
- Lista cursos de graduação e pós-graduação
- Informações sobre qualidade (ENADE)
- Filtros por estado e cidade

**Dados Retornados:**
- Nome da instituição
- Sigla
- Tipo (Pública/Privada)
- Estado/Cidade
- Cursos oferecidos
- Notas ENADE
- Possui pós-graduação

---

## 💻 APIs de Tecnologia

### 4. GitHub API
**Arquivo:** `backend/app/connectors/github.py`

**Funcionalidades:**
- Busca projetos open source relacionados ao tema
- Filtra por linguagem de programação
- Ordena por relevância (stars)
- Mostra atividade e licenciamento

**Dados Retornados:**
- Nome do projeto
- Descrição
- Linguagem principal
- Número de stars e forks
- Issues abertas
- Tópicos/tags
- Licença
- Data de criação/atualização
- URL do repositório

**API Base:** `https://api.github.com`

---

## 🔄 Como Integrar ao Sistema

### 1. Backend (FastAPI)

Adicione os novos conectores ao motor de busca em `backend/app/services/incidence_engine.py`:

```python
from app.connectors import (
    CNPqConnector,
    OpenAlexConnector,
    CAPESConnector,
    InternationalScholarshipsConnector,
    INEPConnector,
    GitHubConnector
)

# No método de busca
capes = CAPESConnector()
scholarships = InternationalScholarshipsConnector()
inep = INEPConnector()
github = GitHubConnector()

# Executar buscas em paralelo
results = await asyncio.gather(
    capes.search_scholarships(term),
    scholarships.search_international_scholarships(term, field),
    inep.search_institutions(term),
    github.search_projects(term)
)
```

### 2. Frontend (React)

Adicione novas seções no `MvpEngine.tsx`:

```tsx
{/* Bolsas de Estudo */}
<div>
  <h3>Bolsas de Estudo Disponíveis</h3>
  <div className="grid">
    {/* CAPES - Brasil */}
    {/* Bolsas Internacionais */}
  </div>
</div>

{/* Projetos Open Source */}
<div>
  <h3>Projetos GitHub Relacionados</h3>
  {/* Lista de projetos */}
</div>
```

---

## 📊 Próximas APIs Sugeridas

### Educação e Pesquisa:
- **Plataforma Lattes XML** - Currículos completos de pesquisadores
- **Plataforma Nilo Peçanha** - Rede Federal de Educação Profissional
- **BDTD (Biblioteca Digital de Teses e Dissertações)**
- **SciELO API** - Publicações científicas América Latina

### Fomento e Financiamento:
- **FAPESP API** - Projetos financiados em São Paulo
- **FAPERJ API** - Projetos no Rio de Janeiro
- **CNPq Chamadas** - Editais abertos de financiamento

### Inovação e Startups:
- **StartupBase Brasil** - Ecossistema de startups
- **ANPEI** - Associação Nacional de P&D
- **WIPO API** - Propriedade intelectual internacional

### Internacional:
- **Europe PMC** - Publicações científicas europeias
- **arXiv API** - Preprints científicos
- **Crossref API** - Metadados de publicações
- **ORCID API** - Identificação de pesquisadores

---

## 🚀 Status de Implementação

✅ **Implementado:**
- CAPES Connector
- International Scholarships Connector
- INEP Connector
- GitHub Connector

⏳ **Em Mock/Desenvolvimento:**
- Endpoints reais das APIs precisam ser confirmados
- Alguns conectores usam dados mock até validação das APIs oficiais

🔄 **Próximos Passos:**
1. Validar endpoints oficiais das APIs
2. Implementar autenticação onde necessário
3. Adicionar cache para otimização
4. Criar testes unitários
5. Integrar ao frontend
6. Documentar APIs no Swagger

---

## 📝 Notas Importantes

- Algumas APIs podem requerer autenticação/API keys
- Dados mock foram adicionados para desenvolvimento
- Verificar limites de rate limiting de cada API
- Implementar cache para reduzir chamadas
- Adicionar tratamento de erros robusto

---

## 🔗 Links Úteis

- [Portal Dados Abertos CAPES](https://dadosabertos.capes.gov.br/)
- [INEP Dados Abertos](http://portal.inep.gov.br/dados-abertos)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Erasmus+ Scholarships](https://erasmus-plus.ec.europa.eu/)
- [Fulbright Program](https://foreign.fulbrightonline.org/)

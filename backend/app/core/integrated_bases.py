"""
Bases públicas integradas ao Motor4PUFPR
Atualize este arquivo sempre que uma nova base for integrada!

Total: 40 bases (28 originais + 12 novas inspiradas pelo BR/ACC World Open Graph)
"""
INTEGRATED_PUBLIC_BASES = [
    # ============================
    # DIMENSÃO CIENTÍFICA
    # ============================
    {"id": "cnpq", "name": "CNPq", "description": "Diretório de Grupos de Pesquisa", "icon": "database", "url": "http://dgp.cnpq.br/", "dimension": "científica"},
    {"id": "capes", "name": "CAPES", "description": "Bolsas e programas de pós-graduação", "icon": "scholarship", "url": "https://dadosabertos.capes.gov.br/", "dimension": "científica"},
    {"id": "openalex", "name": "OpenAlex", "description": "Artigos científicos, autores e instituições globais", "icon": "database", "url": "https://openalex.org/", "dimension": "científica"},
    {"id": "inep", "name": "INEP", "description": "Censo Escolar, ENEM, ENADE — instituições e cursos", "icon": "scholarship", "url": "http://portal.inep.gov.br/", "dimension": "científica"},
    {"id": "fnde", "name": "FNDE", "description": "Repasses educacionais por programa e região", "icon": "scholarship", "url": "https://www.fnde.gov.br/", "dimension": "científica"},

    # ============================
    # DIMENSÃO TECNOLÓGICA
    # ============================
    {"id": "inpi", "name": "INPI", "description": "Patentes e classificação IPC/CPC", "icon": "file", "url": "https://busca.inpi.gov.br/", "dimension": "tecnológica"},
    {"id": "github", "name": "GitHub", "description": "Projetos open source e repositórios de código", "icon": "database", "url": "https://github.com/", "dimension": "tecnológica"},

    # ============================
    # DIMENSÃO PRODUTIVA
    # ============================
    {"id": "ibge", "name": "IBGE/SIDRA", "description": "Produção industrial, PIB, IPCA, PIM-PF, PMC, PNAD, Censo, POF, Geociências", "icon": "chart", "url": "https://sidra.ibge.gov.br/", "dimension": "produtiva"},
    {"id": "comexstat", "name": "ComexStat", "description": "Exportações e importações por NCM", "icon": "chart", "url": "https://comexstat.mdic.gov.br/", "dimension": "produtiva"},
    {"id": "ipeadata", "name": "IPEAData", "description": "Séries históricas de indicadores socioeconômicos", "icon": "chart", "url": "http://www.ipeadata.gov.br/", "dimension": "produtiva"},
    {"id": "brasilapi_cnpj", "name": "CNPJ/Receita", "description": "Dados cadastrais de empresas por CNAE, porte e região", "icon": "building", "url": "https://brasilapi.com.br/", "dimension": "produtiva"},
    {"id": "rais_caged", "name": "RAIS/CAGED", "description": "Emprego formal por setor CNAE, ocupação, salário, movimentação", "icon": "chart", "url": "https://pdet.mte.gov.br/", "dimension": "produtiva"},
    {"id": "aneel", "name": "ANEEL", "description": "Geração distribuída, P&D regulado no setor elétrico", "icon": "energy", "url": "https://dadosabertos.aneel.gov.br/", "dimension": "produtiva"},
    {"id": "anp", "name": "ANP", "description": "Petróleo, gás, biocombustíveis e P&D obrigatório", "icon": "energy", "url": "https://dados.gov.br/", "dimension": "produtiva"},
    {"id": "bcb", "name": "Banco Central", "description": "Selic, câmbio, PTAX, crédito, reservas, base monetária, IBC-Br, PIX", "icon": "chart", "url": "https://dadosabertos.bcb.gov.br/", "dimension": "produtiva"},
    {"id": "cvm", "name": "CVM", "description": "Companhias abertas, formulário referência, fundos, fatos relevantes", "icon": "chart", "url": "https://dados.cvm.gov.br/", "dimension": "produtiva"},
    {"id": "anatel", "name": "ANATEL", "description": "Telecomunicações, banda larga, infraestrutura digital", "icon": "energy", "url": "https://informacoes.anatel.gov.br/", "dimension": "produtiva"},
    {"id": "anvisa", "name": "ANVISA", "description": "Registro de medicamentos, produtos para saúde, cosméticos", "icon": "file", "url": "https://dados.gov.br/", "dimension": "produtiva"},

    # ============================
    # DIMENSÃO INSTITUCIONAL
    # ============================
    {"id": "finep", "name": "Finep", "description": "Instrumentos e chamadas públicas de fomento", "icon": "government", "url": "https://www.finep.gov.br/", "dimension": "institucional"},
    {"id": "pncp", "name": "ComprasNet/PNCP", "description": "Licitações e contratações públicas federais", "icon": "government", "url": "https://pncp.gov.br/", "dimension": "institucional"},
    {"id": "transparencia", "name": "Portal da Transparência", "description": "Convênios, despesas, sanções (CEIS/CNEP/CEPIM/CEAF)", "icon": "government", "url": "https://portaldatransparencia.gov.br/", "dimension": "institucional"},
    {"id": "siconfi", "name": "Tesouro/SICONFI", "description": "Finanças públicas de estados e municípios", "icon": "chart", "url": "https://siconfi.tesouro.gov.br/", "dimension": "institucional"},
    {"id": "dou", "name": "DOU", "description": "Diário Oficial da União — portarias, editais, chamadas federais", "icon": "file", "url": "https://www.in.gov.br/", "dimension": "institucional"},
    {"id": "querido_diario", "name": "Querido Diário", "description": "Diários oficiais municipais — editais e chamadas locais", "icon": "file", "url": "https://queridodiario.ok.org.br/", "dimension": "institucional"},
    {"id": "dados_gov", "name": "Portal Dados Abertos", "description": "Catálogo central de datasets do governo federal", "icon": "database", "url": "https://dados.gov.br/", "dimension": "institucional"},
    {"id": "tcu", "name": "TCU", "description": "Auditorias, acórdãos, avaliação de políticas públicas de CT&I", "icon": "government", "url": "https://portal.tcu.gov.br/", "dimension": "institucional"},
    {"id": "ibama", "name": "IBAMA", "description": "Embargos ambientais, licenciamento, SINAFLOR", "icon": "file", "url": "https://dados.gov.br/", "dimension": "institucional"},
    {"id": "inpe_deter", "name": "INPE DETER/PRODES", "description": "Alertas de desmatamento e monitoramento ambiental", "icon": "chart", "url": "http://terrabrasilis.dpi.inpe.br/", "dimension": "institucional"},

    # ============================
    # NOVAS BASES (BR/ACC World Open Graph)
    # ============================

    # --- Corporativo Profundo ---
    {"id": "cnpj_qsa", "name": "CNPJ/QSA", "description": "Quadro societário completo — razão social, sócios, capital social, CNAE", "icon": "building", "url": "https://arquivos.receitafederal.gov.br/dados/cnpj/", "dimension": "produtiva"},
    {"id": "b3", "name": "B3", "description": "Negociações de ações e derivativos, mercado de capitais", "icon": "chart", "url": "https://www.b3.com.br/", "dimension": "produtiva"},

    # --- Saúde ---
    {"id": "datasus", "name": "DATASUS", "description": "Internações (SIH), óbitos (SIM), nascidos vivos (SINASC), CNES, SINAN, TabNet", "icon": "chart", "url": "https://datasus.saude.gov.br/", "dimension": "produtiva"},
    {"id": "ans", "name": "ANS", "description": "Saúde suplementar — operadoras, beneficiários, reclamações", "icon": "chart", "url": "https://www.ans.gov.br/", "dimension": "produtiva"},

    # --- Eleitoral/Político ---
    {"id": "tse", "name": "TSE", "description": "Candidaturas, prestação de contas, bens declarados, filiados, resultados eleitorais", "icon": "government", "url": "https://dadosabertos.tse.jus.br/", "dimension": "institucional"},
    {"id": "siop", "name": "SIOP", "description": "Orçamento federal, LOA, emendas parlamentares, execução orçamentária", "icon": "government", "url": "https://siop.planejamento.gov.br/", "dimension": "institucional"},

    # --- Judiciário ---
    {"id": "datajud", "name": "DataJud/CNJ", "description": "Processos judiciais, movimentações, partes, decisões, Justiça em Números", "icon": "government", "url": "https://datajud.cnj.jus.br/", "dimension": "institucional"},

    # --- Ambiental Expandido ---
    {"id": "ana", "name": "ANA", "description": "Recursos hídricos — outorgas, bacias, monitoramento, reservatórios", "icon": "chart", "url": "https://dadosabertos.ana.gov.br/", "dimension": "institucional"},

    # --- Transporte/Infraestrutura ---
    {"id": "transportes", "name": "Transportes", "description": "ANTT, ANAC, DNIT, DENATRAN, PRF — concessões, frota, acidentes, infraestrutura", "icon": "chart", "url": "https://dados.gov.br/", "dimension": "produtiva"},

    # --- Previdência ---
    {"id": "previdencia", "name": "INSS/PREVIC", "description": "Benefícios previdenciários, aposentadorias, pensões, fundos de pensão", "icon": "chart", "url": "https://dadosabertos.dataprev.gov.br/", "dimension": "produtiva"},

    # --- Agregador ---
    {"id": "basedosdados", "name": "Base dos Dados", "description": "Agregador com datasets tratados e normalizados — CNPJ, RAIS, PIB, saúde, educação, eleições", "icon": "database", "url": "https://basedosdados.org/", "dimension": "produtiva"},
]

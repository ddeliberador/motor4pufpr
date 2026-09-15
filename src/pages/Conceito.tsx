import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Zap, BookOpen, Microscope, Factory, Building2, Globe,
  ArrowRight, Database, BarChart3, Network, Target,
  AlertTriangle, TrendingUp, Layers, GitBranch,
  CheckCircle2, XCircle, Clock, ExternalLink
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UfprLogo from "@/components/UfprLogo";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const layers = [
  {
    icon: Microscope,
    title: "Conhecimento",
    color: "from-blue-500 to-cyan-500",
    sources: ["OpenAlex", "CAPES", "CNPq", "Scielo"],
    outputs: ["Densidade científica", "Concentração institucional", "Especialização temática"],
  },
  {
    icon: GitBranch,
    title: "Tecnologia",
    color: "from-violet-500 to-purple-500",
    sources: ["INPI", "RAIS/CAGED", "GitHub", "Embrapii"],
    outputs: ["TRL estimado", "Ciência → Patente", "Base produtiva associada"],
  },
  {
    icon: Building2,
    title: "Política",
    color: "from-amber-500 to-orange-500",
    sources: ["PNCP", "Transparência", "SICONFI", "FNDCT"],
    outputs: ["Intensidade instrumental", "Capacidade fiscal", "Efetividade do gasto"],
  },
  {
    icon: Globe,
    title: "Internacional",
    color: "from-emerald-500 to-teal-500",
    sources: ["COMEX", "OpenAlex", "WIPO", "BCB"],
    outputs: ["Dependência externa", "Competitividade", "Inserção global"],
  },
];

const indices = [
  { code: "GT", name: "Gargalo de Tradução", desc: "Ciência sem aplicação prática", layers: "1 × 2 × 3", icon: AlertTriangle, alert: "critical" },
  { code: "CD", name: "Dependência Externa", desc: "Produção científica estrangeira dominante", layers: "4 × 1", icon: TrendingUp, alert: "warning" },
  { code: "AUE", name: "Articulação U-E", desc: "Instituições de pesquisa presentes em contratos", layers: "1 × 3", icon: Network, alert: "normal" },
  { code: "EI", name: "Efetividade Instrumental", desc: "Relação gasto público vs output", layers: "3 × 1", icon: Target, alert: "warning" },
];

const personas = [
  { key: "pesquisador", icon: Microscope, label: "Pesquisador", deliverables: ["3 agendas estratégicas", "3 parceiros potenciais", "3 fontes de financiamento"] },
  { key: "universidade", icon: BookOpen, label: "Universidade", deliverables: ["Índice de Conversão Estrutural", "Áreas fortes e frágeis", "3 parcerias estratégicas"] },
  { key: "empresa", icon: Factory, label: "Empresa", deliverables: ["3 parceiros acadêmicos", "3 instrumentos disponíveis", "Diagnóstico de dependência"] },
  { key: "governo", icon: Building2, label: "Governo", deliverables: ["Investir / Reestruturar / Criar / Reduzir", "Setores críticos", "Alavancas prioritárias"] },
];

// ── Dados reais extraídos em 15/09/2026 17:21–17:30 (UTC-3) ──
const BASES_MAPA = [
  // Pilar 1 — P,D&I
  {
    n: 1, pilar: "1. P,D&I", fonte: "MCTI — Indicadores Nacionais de CT&I",
    orgao: "MCTI", acesso: "Painel/relatórios", auth: "Pública",
    registros: 21, status: "ok" as const,
    endpoint: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/indicadores",
    nota: "Painel de Indicadores CT&I do MCTI + Indicadores CT&I 2025 em PDF.",
  },
  {
    n: 2, pilar: "1. P,D&I", fonte: "API SIDRA (IBGE)",
    orgao: "IBGE", acesso: "API REST", auth: "Pública",
    registros: 1224, status: "ok" as const,
    endpoint: "https://servicodados.ibge.gov.br/api/v3/agregados",
    nota: "Catálogo v3: 58 tabelas PINTEC + séries PNAD Contínua anual/mensal/trimestral.",
  },
  {
    n: 3, pilar: "1. P,D&I", fonte: "INPI — Patentes, marcas, programas de computador",
    orgao: "INPI", acesso: "Feed XML/TXT semanal", auth: "Pública",
    registros: 1442, status: "ok" as const,
    endpoint: "https://revistas.inpi.gov.br/txt/P{edicao}.zip",
    nota: "RPI edição 2906: 1.442 classificações IPC lidas. Top: A61K (farmacêutica, 106), H04W (telco, 104).",
  },
  {
    n: 4, pilar: "1. P,D&I", fonte: "OpenAlex",
    orgao: "OpenAlex", acesso: "API REST", auth: "Polite pool (e-mail)",
    registros: 20212, status: "ok" as const,
    endpoint: "https://api.openalex.org/works",
    nota: "Artigos com afiliação brasileira (2024–2026) sobre política de inovação.",
  },
  // Pilar 2 — Atores/Capital Humano
  {
    n: 5, pilar: "2. Atores", fonte: "INEP — Censo da Educação Superior",
    orgao: "INEP", acesso: "Microdados anuais", auth: "Pública",
    registros: 30, status: "ok" as const,
    endpoint: "https://www.gov.br/inep/.../microdados/censo-da-educacao-superior",
    nota: "30 arquivos ZIP (1995–2024) — último: microdados_censo_da_educacao_superior_2024.zip.",
  },
  {
    n: 6, pilar: "2. Atores", fonte: "CAPES — Plataforma Sucupira",
    orgao: "CAPES", acesso: "CKAN + CSV", auth: "Pública",
    registros: 80, status: "ok" as const,
    endpoint: "https://dadosabertos.capes.gov.br/api/3/action/package_search",
    nota: "80 datasets: programas, docentes, discentes, bolsistas, teses — períodos 2004–2024.",
  },
  {
    n: 7, pilar: "2. Atores", fonte: "DATANIT / FORMICT (NITs)",
    orgao: "MCTI", acesso: "Relatórios/datasets", auth: "Pública",
    registros: 199, status: "ok" as const,
    endpoint: "https://www.gov.br/mcti/pt-br/@@search?SearchableText=FORMICT",
    nota: "Busca no portal MCTI por FORMICT — relatórios da política de PI nas ICTs (base do DATANIT).",
  },
  {
    n: 8, pilar: "2. Atores", fonte: "Receita Federal — Dados Abertos CNPJ",
    orgao: "Receita Federal", acesso: "Arquivos CSV em lote", auth: "Pública",
    registros: 0, status: "falha" as const,
    endpoint: "https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/",
    nota: "Repositório recusou conexão: Connection reset by peer. Integrado via BrasilAPI (base 24).",
  },
  {
    n: 9, pilar: "2. Atores", fonte: "StartupBase (ABStartups)",
    orgao: "ABStartups", acesso: "Base ingerida no Motor", auth: "Leitura pública",
    registros: 3310, status: "ok" as const,
    endpoint: "research_locations (Motor DB)",
    nota: "3.310 startups geocodificadas do Mapeamento ABStartups 2025 já integradas ao banco do Motor.",
  },
  {
    n: 10, pilar: "2. Atores", fonte: "CNPq — Plataforma Lattes / LattesData",
    orgao: "CNPq / Ibict", acesso: "API REST (Dataverse)", auth: "Pública",
    registros: 0, status: "falha" as const,
    endpoint: "https://lattesdata.cnpq.br/api/search",
    nota: "HTTP 503 — LattesData indisponível no momento da extração. Conector e rotas alternativas documentados.",
  },
  // Pilar 3 — Financiamento
  {
    n: 11, pilar: "3. Financiamento", fonte: "Finep / CNPq — Editais de fomento",
    orgao: "Finep, CNPq", acesso: "Extração HTML ao vivo", auth: "Pública",
    registros: 28, status: "ok" as const,
    endpoint: "finep.gov.br/chamadas-publicas + memoria2.cnpq.br",
    nota: "28 categorias de chamadas vigentes extraídas ao vivo dos portais Finep e CNPq.",
  },
  {
    n: 12, pilar: "3. Financiamento", fonte: "FAPs estaduais — BV-FAPESP",
    orgao: "FAPESP", acesso: "Extração HTML (sem API)", auth: "Pública",
    registros: 24, status: "ok" as const,
    endpoint: "https://bv.fapesp.br/pt/",
    nota: "24 auxílios e bolsas extraídos — PIPE, PITE, Temático, Regular. +200k projetos desde 1992.",
  },
  {
    n: 13, pilar: "3. Financiamento", fonte: "CVM — Dados Abertos",
    orgao: "CVM", acesso: "CKAN + CSV/ZIP", auth: "Pública",
    registros: 10, status: "ok" as const,
    endpoint: "https://dados.cvm.gov.br/api/3/action/package_search",
    nota: "10 datasets: CIA_ABERTA CAD, DFP, FCA, FRE, ITR, IPE, VLMO, CGVN, RECOMPRA, EMISSORES.",
  },
  {
    n: 14, pilar: "3. Financiamento", fonte: "ABVCAP",
    orgao: "ABVCAP", acesso: "Extração HTML/PDF", auth: "Pública",
    registros: 18, status: "ok" as const,
    endpoint: "https://www.abvcap.com.br/",
    nota: "18 itens: +230 fundos ativos, +340B capital, +4500 empresas em portfólio, 24 anos de mercado.",
  },
  {
    n: 15, pilar: "3. Financiamento", fonte: "Lei do Bem (MCTI / Receita Federal)",
    orgao: "MCTI", acesso: "Relatórios", auth: "Pública",
    registros: 199, status: "ok" as const,
    endpoint: "https://www.gov.br/mcti/pt-br/@@search?SearchableText=Lei+do+Bem",
    nota: "Dados ano-base 2024 (pub. 16/07/2026): 4.252 empresas · R$51,6bi P&D · R$11,98bi renúncia fiscal.",
  },
  {
    n: 16, pilar: "3. Financiamento", fonte: "PNCP — Contratações Públicas",
    orgao: "Governo Federal", acesso: "API REST", auth: "Pública",
    registros: 7771, status: "ok" as const,
    endpoint: "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao",
    nota: "7.771 pregões eletrônicos publicados nos últimos 45 dias. Filtro por UF ativo.",
  },
  // Pilar 4 — Infraestrutura
  {
    n: 17, pilar: "4. Infraestrutura", fonte: "Anatel — Dados Abertos",
    orgao: "Anatel", acesso: "Dataset/painel", auth: "Pública",
    registros: 61, status: "ok" as const,
    endpoint: "https://www.gov.br/anatel/pt-br/dados/dados-abertos",
    nota: "61 conjuntos: cobertura móvel, banda larga fixa, qualidade, densidade, backhaul por município.",
  },
  {
    n: 18, pilar: "4. Infraestrutura", fonte: "DATASUS / SISAB (Atenção Primária)",
    orgao: "Ministério da Saúde", acesso: "API REST", auth: "Pública",
    registros: 398, status: "ok" as const,
    endpoint: "https://relatorioaps-prd.saude.gov.br/cobertura/aps",
    nota: "398 municípios do PR — competência 12/2025. Curitiba: 59% cobertura APS (181 equipes, 1,8M hab.).",
  },
  {
    n: 19, pilar: "4. Infraestrutura", fonte: "ANTT / ANAC",
    orgao: "ANTT, ANAC", acesso: "CKAN + índice", auth: "Pública",
    registros: 117, status: "ok" as const,
    endpoint: "dados.antt.gov.br + sistemas.anac.gov.br/dadosabertos/",
    nota: "117 conjuntos: 100 ANTT (concessões, RNTRC, MONITRIIP) + 17 ANAC (aeródromos, voos, VOO).",
  },
  {
    n: 20, pilar: "4. Infraestrutura", fonte: "IBGE — PNAD Contínua (SIDRA)",
    orgao: "IBGE", acesso: "API REST", auth: "Pública",
    registros: 4, status: "ok" as const,
    endpoint: "https://servicodados.ibge.gov.br/api/v3/agregados/6318/...",
    nota: "Tabela 6318 — últimos 4 trimestres: 175.181k pessoas (202604) → 175.510k (202607).",
  },
  {
    n: 21, pilar: "4. Infraestrutura", fonte: "Ipea — Ipeadata",
    orgao: "Ipea", acesso: "API OData4", auth: "Pública",
    registros: 3605, status: "ok" as const,
    endpoint: "http://www.ipeadata.gov.br/api/odata4/Metadados",
    nota: "3.605 séries macroeconômicas. PIB mensal BCB último valor: R$1.167.869M (jul/2026).",
  },
  {
    n: 22, pilar: "4. Infraestrutura", fonte: "Portal da Transparência",
    orgao: "CGU", acesso: "API REST", auth: "Chave de API",
    registros: 11, status: "ok" as const,
    endpoint: "https://api.portaldatransparencia.gov.br/api-de-dados/convenios",
    nota: "11 convênios federais em Curitiba (1º trim. 2026) — maior: SEIL/PR R$25,6M (infraestrutura).",
  },
  // Transversal
  {
    n: 23, pilar: "Transversal", fonte: "dados.gov.br (CGU)",
    orgao: "CGU", acesso: "API REST", auth: "Chave gov.br",
    registros: 0, status: "falha" as const,
    endpoint: "https://dados.gov.br/dados/api/publico/conjuntos-dados",
    nota: "HTTP 401 com todos os formatos de chave tentados. Solicitação de novo token gov.br em andamento.",
  },
  {
    n: 24, pilar: "Transversal", fonte: "BrasilAPI (CNPJ / MinhaReceita)",
    orgao: "BrasilAPI / Receita Federal", acesso: "API REST", auth: "Pública",
    registros: 5, status: "ok" as const,
    endpoint: "https://brasilapi.com.br/api/cnpj/v1/{cnpj}",
    nota: "UFPR confirmada: CNPJ 75.095.679/0001-49, CNAE 8531700, CURITIBA/PR. CNPq e Finep validados.",
  },
];

const PILAR_COR: Record<string, string> = {
  "1. P,D&I": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "2. Atores": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "3. Financiamento": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "4. Infraestrutura": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Transversal": "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function MapaExtracaoSection() {
  const [filtro, setFiltro] = useState<string>("todos");
  const [expandida, setExpandida] = useState<number | null>(null);

  const pilares = ["todos", "1. P,D&I", "2. Atores", "3. Financiamento", "4. Infraestrutura", "Transversal"];
  const filtradas = filtro === "todos" ? BASES_MAPA : BASES_MAPA.filter(b => b.pilar === filtro);

  const ok = BASES_MAPA.filter(b => b.status === "ok").length;
  const falha = BASES_MAPA.filter(b => b.status === "falha").length;
  const totalRegistros = BASES_MAPA.reduce((s, b) => s + b.registros, 0);

  return (
    <section className="py-20 bg-muted/20 border-t border-border">
      <div className="max-w-5xl mx-auto px-6">
        {/* Cabeçalho */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold mb-2">Mapa da Inovação — Comprovação de Extração</h2>
          <p className="text-muted-foreground mb-1">
            Extração ao vivo realizada em <strong className="text-foreground">15/09/2026 às 17:21–17:30 (UTC-3)</strong>.
            Nenhum dado simulado — falhas registradas como ocorridas.
          </p>
          <p className="text-xs text-muted-foreground">
            Pesquisa colaborativa · Doutorando: Décio Dalton Deliberador Filho · Orientador: Walter Tadahiro Shima · UFPR/PPGPP
          </p>

          {/* Counters */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{ok}<span className="text-base text-muted-foreground">/{BASES_MAPA.length}</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">bases responderam</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalRegistros.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">registros retornados</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{falha}</p>
              <p className="text-xs text-muted-foreground mt-0.5">falhas registradas</p>
            </div>
          </div>
        </div>

        {/* Filtros por pilar */}
        <div className="flex flex-wrap gap-2 mb-6">
          {pilares.map(p => (
            <button key={p} onClick={() => setFiltro(p)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                filtro === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : p === "todos" ? "bg-card border-border text-muted-foreground hover:text-foreground"
                  : `${PILAR_COR[p]} border`
              }`}>
              {p === "todos" ? `Todas (${BASES_MAPA.length})` : p}
            </button>
          ))}
        </div>

        {/* Lista de bases */}
        <div className="space-y-2">
          {filtradas.map(base => (
            <div key={base.n}
              className={`border rounded-xl overflow-hidden transition-all ${
                base.status === "falha" ? "border-red-500/20 bg-red-500/3" : "border-border bg-card"
              }`}>
              {/* Linha resumo (sempre visível) */}
              <button onClick={() => setExpandida(expandida === base.n ? null : base.n)}
                className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  {/* Número */}
                  <span className="text-xs font-mono text-muted-foreground w-5 flex-shrink-0">{String(base.n).padStart(2, "0")}</span>

                  {/* Status */}
                  {base.status === "ok"
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  }

                  {/* Nome */}
                  <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">{base.fonte}</span>

                  {/* Pilar badge */}
                  <span className={`hidden sm:inline text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${PILAR_COR[base.pilar]}`}>
                    {base.pilar}
                  </span>

                  {/* Registros */}
                  <span className={`text-xs font-mono flex-shrink-0 ${base.status === "falha" ? "text-red-400" : "text-primary"}`}>
                    {base.status === "falha" ? "falha" : `${base.registros.toLocaleString("pt-BR")} reg.`}
                  </span>
                </div>
              </button>

              {/* Detalhe expandido */}
              {expandida === base.n && (
                <div className="border-t border-border/50 px-4 py-3 space-y-2 bg-muted/20">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-0.5">Órgão</p>
                      <p className="text-foreground font-medium">{base.orgao}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Acesso</p>
                      <p className="text-foreground">{base.acesso}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Autenticação</p>
                      <p className="text-foreground">{base.auth}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Registros</p>
                      <p className={`font-mono font-bold ${base.status === "falha" ? "text-red-400" : "text-primary"}`}>
                        {base.status === "falha" ? "0 (falha)" : base.registros.toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Endpoint consultado</p>
                    <p className="text-xs font-mono text-foreground/70 break-all">{base.endpoint}</p>
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-xs ${base.status === "falha" ? "bg-red-500/8 text-red-300" : "bg-primary/5 text-muted-foreground"}`}>
                    {base.nota}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-6">
          Extração automatizada pelo Motor da Inovação · Plataforma de pesquisa UFPR/PPGPP · 15/09/2026
        </p>
      </div>
    </section>
  );
}


const Conceito = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* HERO */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/3 blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <UfprLogo className="w-20 h-20 mx-auto mb-8 opacity-80" />
          </motion.div>

          <motion.h1
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Motor da Inovação
            <span className="block text-2xl md:text-3xl font-normal text-muted-foreground mt-3">
              Diagnóstico Estrutural do Sistema Nacional de Inovação
            </span>
          </motion.h1>

          <motion.p
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Uma infraestrutura computacional pública que traduz objetos tecnológicos 
            em redes verificáveis de incidência, cruzando <strong className="text-foreground">ciência</strong>, 
            {" "}<strong className="text-foreground">tecnologia</strong>, <strong className="text-foreground">política</strong> e 
            {" "}<strong className="text-foreground">inserção internacional</strong> para gerar diagnósticos estruturais orientados à decisão.
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Acessar o Motor
            </Link>
            <a
              href="#arquitetura"
              className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <Layers className="w-4 h-4" />
              Ver arquitetura
            </a>
          </motion.div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="py-20 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-6">
              O problema estrutural
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-muted-foreground leading-relaxed mb-8">
              O Brasil possui dados sobre ciência (CNPq, CAPES), patentes (INPI), indústria (IBGE), 
              comércio exterior (COMEX) e fomento (Finep, BNDES). Mas <strong className="text-foreground">não existe 
              uma infraestrutura pública</strong> capaz de cruzar essas bases a partir de um objeto tecnológico 
              e gerar diagnóstico de sistema.
            </motion.p>

            <motion.div variants={fadeUp} custom={2} className="bg-card border border-border rounded-2xl p-8">
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                {["Objeto tecnológico", "Tradução", "Rede de incidência", "Gargalos", "Instrumentos", "Decisão"].map((step, i) => (
                  <span key={i} className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-lg font-medium ${i === 0 ? 'bg-primary text-primary-foreground' : i === 5 ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground'}`}>
                      {step}
                    </span>
                    {i < 5 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 4 CAMADAS */}
      <section id="arquitetura" className="py-20 bg-muted/30 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">
              4 Camadas Analíticas
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Cada camada consulta bases públicas reais, normaliza os dados e calcula outputs estruturados. 
              Os índices são cruzados entre camadas.
            </motion.p>

            <div className="grid md:grid-cols-2 gap-6">
              {layers.map((layer, i) => (
                <motion.div
                  key={layer.title}
                  variants={fadeUp}
                  custom={i + 2}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${layer.color} flex items-center justify-center`}>
                      <layer.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold">{layer.title}</h3>
                  </div>

                  <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Fontes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {layer.sources.map((s) => (
                        <span key={s} className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">{s}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Outputs calculados</p>
                    <ul className="space-y-1">
                      {layer.outputs.map((o) => (
                        <li key={o} className="text-sm text-foreground flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ÍNDICES CRUZADOS */}
      <section className="py-20 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">
              Índices Cruzados
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Calculados cruzando múltiplas camadas — não apenas uma base isolada. 
              Permitem uma leitura computacional da política industrial.
            </motion.p>

            <div className="grid sm:grid-cols-2 gap-4">
              {indices.map((idx, i) => (
                <motion.div
                  key={idx.code}
                  variants={fadeUp}
                  custom={i + 2}
                  className="bg-card border border-border rounded-2xl p-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      idx.alert === "critical" ? "bg-red-500/10 text-red-500" :
                      idx.alert === "warning" ? "bg-amber-500/10 text-amber-500" :
                      "bg-primary/10 text-primary"
                    }`}>
                      <idx.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-mono text-lg font-bold text-foreground">{idx.code}</p>
                      <p className="text-xs text-muted-foreground">{idx.name}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{idx.desc}</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Camadas: <span className="font-mono">{idx.layers}</span>
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* PERSONAS */}
      <section className="py-20 bg-muted/30 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">
              Entrega por Persona
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              O mesmo diagnóstico estrutural, com trilhas prescritivas diferentes. 
              Cada persona recebe entregas concretas orientadas à sua decisão.
            </motion.p>

            <div className="grid sm:grid-cols-2 gap-6">
              {personas.map((p, i) => (
                <motion.div key={p.key} variants={fadeUp} custom={i + 2}>
                  <Link
                    to={`/${p.key}`}
                    className="block bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <p.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{p.label}</h3>
                      <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
                    </div>
                    <ul className="space-y-2">
                      {p.deliverables.map((d) => (
                        <li key={d} className="text-sm text-muted-foreground flex items-center gap-2">
                          <BarChart3 className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* PERGUNTA CENTRAL */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-10 md:p-16">
              <Database className="w-10 h-10 text-primary mx-auto mb-6" />
              <p className="text-xl md:text-2xl text-foreground leading-relaxed font-serif italic">
                "Como infraestruturas computacionais públicas podem ampliar a capacidade do Brasil 
                de coordenar ciência, tecnologia e política industrial?"
              </p>
              <p className="text-sm text-muted-foreground mt-6">
                Tese de Doutorado em Políticas Públicas — UFPR
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* REFERÊNCIAS TEÓRICAS */}
      <section className="py-16 bg-muted/30 border-t border-border">
        <div className="max-w-3xl mx-auto px-6">
          <h3 className="text-lg font-semibold text-center mb-8">Fundamento Teórico</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Sistemas Nacionais de Inovação (Lundvall)",
              "Trajetórias tecnológicas (Nelson & Winter)",
              "Capacidade estatal e coordenação (Evans)",
              "Missões e Estado empreendedor (Mazzucato)",
            ].map((ref) => (
              <div key={ref} className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl">
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{ref}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-foreground font-medium mt-8">
            O Motor da Inovação operacionaliza teoria econômica como infraestrutura pública.
          </p>
        </div>
      </section>

      <MapaExtracaoSection />

      <Footer />
    </div>
  );
};

export default Conceito;

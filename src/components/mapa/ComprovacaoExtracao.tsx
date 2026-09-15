import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

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
export default MapaExtracaoSection;

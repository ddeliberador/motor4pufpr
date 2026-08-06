import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function safeFetch(url: string, options?: RequestInit, timeoutMs = 15000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, ...options });
    if (!res.ok) { console.warn(`${res.status}: ${url}`); return null; }
    return await res.json();
  } catch (e) {
    console.warn(`fetch error: ${e instanceof Error ? e.message : e}`);
    return null;
  } finally { clearTimeout(t); }
}

// ─── Curadoria estática de linhas de financiamento ───
function getLinhasFinanciamento(uf: string) {
  const FAP_BY_UF: Record<string, { nome: string; sigla: string; url: string; descricao: string }> = {
    "SP": { nome: "Fundação de Amparo à Pesquisa do Estado de São Paulo", sigla: "FAPESP", url: "https://fapesp.br/chamadas", descricao: "Chamadas para empresas: PIPE (até R$ 2M), PAPPE, PITE para parcerias empresa-universidade" },
    "PR": { nome: "Fundação Araucária de Apoio ao Desenvolvimento Científico do Paraná", sigla: "Fundação Araucária", url: "https://www.fappr.pr.gov.br", descricao: "Chamadas para pesquisa e inovação no Paraná — parceria com SETI/PR" },
    "MG": { nome: "Fundação de Amparo à Pesquisa do Estado de Minas Gerais", sigla: "FAPEMIG", url: "https://fapemig.br/pt/editais", descricao: "Chamadas para P&D empresarial em MG — incluindo PAPPE Subvenção" },
    "RJ": { nome: "Fundação Carlos Chagas Filho de Amparo à Pesquisa do Estado do Rio de Janeiro", sigla: "FAPERJ", url: "https://www.faperj.br/?id=3.2.3", descricao: "Chamadas para inovação empresarial e parceria empresa-universidade no RJ" },
    "RS": { nome: "Fundação de Amparo à Pesquisa do Estado do Rio Grande do Sul", sigla: "FAPERGS", url: "https://fapergs.rs.gov.br/editais", descricao: "Chamadas para P&D e inovação no RS" },
    "SC": { nome: "Fundação de Amparo à Pesquisa e Inovação do Estado de Santa Catarina", sigla: "FAPESC", url: "https://www.fapesc.sc.gov.br/editais-abertos", descricao: "Chamadas para empresas e ICTs em SC" },
    "BA": { nome: "Fundação de Amparo à Pesquisa do Estado da Bahia", sigla: "FAPESB", url: "https://www.fapesb.ba.gov.br/editais", descricao: "Chamadas para P&D e inovação na Bahia" },
    "PE": { nome: "Fundação de Amparo à Ciência e Tecnologia do Estado de Pernambuco", sigla: "FACEPE", url: "https://www.facepe.br/chamadas-publicadas", descricao: "Chamadas para inovação e parceria empresa-universidade em PE" },
    "CE": { nome: "Fundação Cearense de Apoio ao Desenvolvimento Científico e Tecnológico", sigla: "FUNCAP", url: "https://www.funcap.ce.gov.br/editais", descricao: "Chamadas para P&D empresarial no Ceará" },
    "GO": { nome: "Fundação de Amparo à Pesquisa do Estado de Goiás", sigla: "FAPEG", url: "https://www.fapeg.go.gov.br/editais-abertos", descricao: "Chamadas para inovação e pesquisa aplicada em Goiás" },
    "AM": { nome: "Fundação de Amparo à Pesquisa do Estado do Amazonas", sigla: "FAPEAM", url: "https://www.fapeam.am.gov.br/editais", descricao: "Chamadas para P&D e inovação no Amazonas — ZFM" },
    "DF": { nome: "Fundação de Apoio à Pesquisa do Distrito Federal", sigla: "FAPDF", url: "https://www.fap.df.gov.br/editais", descricao: "Chamadas para pesquisa e inovação no DF" },
  };

  const linhasFederais = [
    {
      tipo: "financiamento" as const,
      titulo: "Finep — Subvenção Econômica a Projetos de P&D",
      orgao: "Finep / MCTI",
      descricao: "Recursos a fundo perdido (sem devolução) para empresas inovadoras. Até R$ 10M por projeto. Foco em inovação tecnológica com risco tecnológico e mercadológico.",
      valor_max: "R$ 10M por projeto",
      prazo: "Chamadas periódicas — verificar portal",
      prazo_urgencia: "normal" as const,
      url: "https://www.finep.gov.br/chamadas-publicas",
      cnpj_elegivel: "Qualquer porte",
      regime_tributario: "Qualquer",
      tags: ["subvenção", "sem devolução", "P&D"],
    },
    {
      tipo: "financiamento" as const,
      titulo: "Finep — Crédito para Inovação (FNDCT)",
      orgao: "Finep / MCTI",
      descricao: "Financiamento reembolsável com juros abaixo do mercado (TJLP + spread) para desenvolvimento de produtos, processos e serviços inovadores.",
      valor_max: "Sem limite definido",
      prazo: "Janelas abertas — contato via Finep regional",
      prazo_urgencia: "normal" as const,
      url: "https://www.finep.gov.br/apoio-e-financiamento-2/programas-e-linhas",
      cnpj_elegivel: "Empresas nacionais",
      regime_tributario: "Qualquer",
      tags: ["crédito", "TJLP", "inovação"],
    },
    {
      tipo: "financiamento" as const,
      titulo: "BNDES Inovação — Crédito para P&D e Inovação",
      orgao: "BNDES",
      descricao: "Financiamento a partir de 6% a.a. para projetos de P&D, aquisição de máquinas e equipamentos, e implantação de processos inovadores. Prazo de até 10 anos.",
      valor_max: "Até R$ 150M (grandes projetos via BNDES direto)",
      prazo: "Linha permanente — solicitação contínua",
      prazo_urgencia: "normal" as const,
      url: "https://www.bndes.gov.br/inovacao",
      cnpj_elegivel: "Micro, pequena, média e grande empresa",
      regime_tributario: "Qualquer",
      tags: ["crédito", "BNDES", "até 10 anos"],
    },
    {
      tipo: "financiamento" as const,
      titulo: "EMBRAPII — Co-financiamento de P&D Empresa-ICT",
      orgao: "EMBRAPII",
      descricao: "A EMBRAPII aporta até 1/3 do valor do projeto (sem devolução). Empresa aporta 1/3 e ICT parceira aporta 1/3. Projetos de TRL 4–6 (desenvolvimento aplicado). Contrato tripartite empresa-ICT-EMBRAPII.",
      valor_max: "Sem limite — proporcional ao projeto",
      prazo: "Adesão contínua via unidades EMBRAPII credenciadas",
      prazo_urgencia: "normal" as const,
      url: "https://embrapii.org.br/empresas",
      cnpj_elegivel: "Qualquer porte",
      regime_tributario: "Qualquer",
      tags: ["co-financiamento", "ICT", "TRL 4-6"],
    },
    {
      tipo: "parceria" as const,
      titulo: "Encomenda Tecnológica — Marco Legal CT&I",
      orgao: "MCTI / Ministérios setoriais",
      descricao: "O governo contrata empresa para desenvolver solução que ainda não existe. Pagamento garantido pelo poder público. Risco tecnológico da empresa, não financeiro. Previsto no Art. 20 da Lei 10.973/2004.",
      valor_max: "Definido por edital",
      prazo: "Conforme editais — verificar PNCP",
      prazo_urgencia: "normal" as const,
      url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/legislacao/leis/encomenda-tecnologica",
      cnpj_elegivel: "Empresas com capacidade técnica comprovada",
      regime_tributario: "Qualquer",
      tags: ["governo", "encomenda", "risco tecnológico"],
    },
    {
      tipo: "incentivo" as const,
      titulo: "Lei do Bem — Dedução de 60–80% do P&D no IR",
      orgao: "MCTI / Receita Federal",
      descricao: "Empresas em Lucro Real deduzem de 60% a 80% dos gastos com P&D do Imposto de Renda. Automático, sem aprovação prévia. Entrega do formulário FORMP&D até 31/agosto. Em 2024: 4.252 empresas, R$ 51,6bi deduzidos.",
      valor_max: "Sem limite — proporcional ao investimento em P&D",
      prazo: "Regime permanente — entrega FORMP&D: 31/08 de cada ano",
      prazo_urgencia: "normal" as const,
      url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem",
      cnpj_elegivel: "Empresas em Lucro Real",
      regime_tributario: "Lucro Real",
      tags: ["fiscal", "IR", "dedução", "automático"],
    },
    {
      tipo: "incentivo" as const,
      titulo: "Startup Brasil — Aceleração com Aporte até R$ 200k",
      orgao: "MCTI / Softex",
      descricao: "Programa de aceleração para startups de base tecnológica. Aporte de até R$ 200k (não reembolsável) + mentoria intensiva + conexão com investidores. Seleção periódica por chamada pública.",
      valor_max: "R$ 200k por startup",
      prazo: "Chamadas periódicas — verificar portal",
      prazo_urgencia: "normal" as const,
      url: "https://www.startupbrasil.org.br",
      cnpj_elegivel: "Startups de base tecnológica",
      regime_tributario: "Qualquer",
      tags: ["startup", "aceleração", "aporte"],
    },
    {
      tipo: "parceria" as const,
      titulo: "InovAtiva Brasil — Aceleração Gratuita MDIC/SEBRAE",
      orgao: "MDIC / SEBRAE",
      descricao: "Maior programa de aceleração gratuito do Brasil. Mentoria intensiva, Demo Day com investidores, conexão com mercado. Mais de 15.000 startups aceleradas. Inscrições duas vezes por ano.",
      valor_max: "Gratuito (sem aporte financeiro direto)",
      prazo: "Inscrições 2x por ano — verificar portal",
      prazo_urgencia: "normal" as const,
      url: "https://www.inovativabrasil.com.br",
      cnpj_elegivel: "Startups de qualquer setor",
      regime_tributario: "Qualquer",
      tags: ["gratuito", "aceleração", "mentoria"],
    },
  ];

  const fapEstadual = uf && FAP_BY_UF[uf] ? [{
    tipo: "financiamento" as const,
    titulo: `${FAP_BY_UF[uf].sigla} — Chamadas para empresas em ${uf}`,
    orgao: FAP_BY_UF[uf].nome,
    descricao: FAP_BY_UF[uf].descricao,
    valor_max: "Varia por chamada",
    prazo: "Verificar portal da agência",
    prazo_urgencia: "normal" as const,
    url: FAP_BY_UF[uf].url,
    cnpj_elegivel: `Empresas do estado ${uf}`,
    regime_tributario: "Qualquer",
    tags: ["estadual", "FAP", uf],
    destaque_local: true,
  }] : [];

  return [...fapEstadual, ...linhasFederais];
}

// ─── Pregões abertos no PNCP ───
async function fetchPregoesAbertos(query: string, uf: string, searchTerms: string[]) {
  const resultados: any[] = [];
  const seen = new Set<string>();
  const termos = [query, ...searchTerms.slice(0, 2)];
  const ufParam = uf ? `&ufSigla=${uf}&esferaId=E,M,F` : "";

  for (const termo of termos.slice(0, 3)) {
    const data = await safeFetch(
      `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?tamanhoPagina=8&pagina=1&q=${encodeURIComponent(termo)}&situacao=em_andamento${ufParam}`,
      {}, 15000
    );
    const items: any[] = Array.isArray(data) ? data : (data?.data || data?.content || []);
    for (const item of items) {
      const id = item.id || item.numeroCompra || String(item.objetoCompra || "").slice(0, 30);
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const dataFim = item.dataEncerramentoProposta || item.dataFim || item.dataPublicacao;
      let diasRestantes: number | null = null;
      let prazoUrgencia: "urgente" | "proximo" | "normal" = "normal";
      if (dataFim) {
        const diff = (new Date(dataFim).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        diasRestantes = Math.ceil(diff);
        if (diasRestantes <= 15) prazoUrgencia = "urgente";
        else if (diasRestantes <= 60) prazoUrgencia = "proximo";
      }

      resultados.push({
        tipo: "pregao",
        titulo: (item.objetoCompra || item.objeto || "Contratação pública").slice(0, 120),
        orgao: item.orgaoEntidade?.razaoSocial || item.nomeUnidade || "",
        valor: item.valorTotalEstimado || 0,
        modalidade: item.modalidadeNome || item.modalidade || "",
        data_publicacao: item.dataPublicacao?.slice(0, 10) || "",
        data_encerramento: dataFim?.slice(0, 10) || null,
        dias_restantes: diasRestantes,
        prazo_urgencia: prazoUrgencia,
        uf: item.unidadeOrgao?.ufSigla || item.uf || uf || "",
        url: item.linkSistemaOrigem || `https://pncp.gov.br/app/editais`,
        numero: item.numeroCompra || "",
      });
    }
  }

  return resultados
    .sort((a, b) => {
      const urgOrder: Record<string, number> = { urgente: 0, proximo: 1, normal: 2 };
      return urgOrder[a.prazo_urgencia] - urgOrder[b.prazo_urgencia];
    })
    .slice(0, 10);
}

// ─── Chamadas abertas no dados.gov.br ───
async function fetchChamadasAbertas(query: string) {
  const data = await safeFetch(
    `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " chamada edital inovação empresa 2025 2026")}&rows=6&sort=metadata_modified+desc`
  );
  return (data?.result?.results || []).map((pkg: any) => ({
    tipo: "edital",
    titulo: pkg.title || "",
    orgao: pkg.organization?.title || "",
    descricao: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
    data_publicacao: pkg.metadata_modified?.slice(0, 10) || "",
    prazo_urgencia: "normal" as const,
  })).filter((p: any) => p.titulo);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { query, search_terms, uf } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    console.log(`Layer Oportunidades: ${query} | UF: ${uf || "nacional"}`);
    const start = Date.now();

    const [pregoesAbertos, chamadasAbertas] = await Promise.all([
      fetchPregoesAbertos(query, uf || "", search_terms || []),
      fetchChamadasAbertas(query),
    ]);

    const linhasFinanciamento = getLinhasFinanciamento(uf || "");

    return new Response(JSON.stringify({
      pregoes_abertos: pregoesAbertos,
      linhas_financiamento: linhasFinanciamento,
      chamadas_abertas: chamadasAbertas,
      contexto: {
        query,
        uf: uf || null,
        total_pregoes: pregoesAbertos.length,
        pregoes_urgentes: pregoesAbertos.filter((p) => p.prazo_urgencia === "urgente").length,
        pregoes_proximos: pregoesAbertos.filter((p) => p.prazo_urgencia === "proximo").length,
      },
      sources: ["PNCP", "dados.gov.br", "Curadoria Motor da Inovação"],
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("layer-oportunidades error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

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

const FAP_BY_UF: Record<string, { nome: string; sigla: string; url: string; descricao: string }> = {
  "SP": { nome: "Fundação de Amparo à Pesquisa do Estado de São Paulo", sigla: "FAPESP", url: "https://fapesp.br/chamadas", descricao: "Chamadas para empresas: PIPE (até R$ 2M), PAPPE, PITE para parcerias empresa-universidade" },
  "PR": { nome: "Fundação Araucária", sigla: "Fundação Araucária", url: "https://www.fappr.pr.gov.br", descricao: "Chamadas para pesquisa e inovação no Paraná — parceria com SETI/PR" },
  "MG": { nome: "Fundação de Amparo à Pesquisa do Estado de Minas Gerais", sigla: "FAPEMIG", url: "https://fapemig.br/pt/editais", descricao: "Chamadas para P&D empresarial em MG — incluindo PAPPE Subvenção" },
  "RJ": { nome: "Fundação Carlos Chagas Filho de Amparo à Pesquisa do RJ", sigla: "FAPERJ", url: "https://www.faperj.br/?id=3.2.3", descricao: "Chamadas para inovação empresarial e parceria empresa-universidade no RJ" },
  "RS": { nome: "Fundação de Amparo à Pesquisa do Estado do Rio Grande do Sul", sigla: "FAPERGS", url: "https://fapergs.rs.gov.br/editais", descricao: "Chamadas para P&D e inovação no RS" },
  "SC": { nome: "Fundação de Amparo à Pesquisa e Inovação de Santa Catarina", sigla: "FAPESC", url: "https://www.fapesc.sc.gov.br/editais-abertos", descricao: "Chamadas para empresas e ICTs em SC" },
  "BA": { nome: "Fundação de Amparo à Pesquisa do Estado da Bahia", sigla: "FAPESB", url: "https://www.fapesb.ba.gov.br/editais", descricao: "Chamadas para P&D e inovação na Bahia" },
  "PE": { nome: "Fundação de Amparo à Ciência e Tecnologia de Pernambuco", sigla: "FACEPE", url: "https://www.facepe.br/chamadas-publicadas", descricao: "Chamadas para inovação e parceria empresa-universidade em PE" },
  "CE": { nome: "Fundação Cearense de Apoio ao Desenvolvimento Científico e Tecnológico", sigla: "FUNCAP", url: "https://www.funcap.ce.gov.br/editais", descricao: "Chamadas para P&D empresarial no Ceará" },
  "GO": { nome: "Fundação de Amparo à Pesquisa do Estado de Goiás", sigla: "FAPEG", url: "https://www.fapeg.go.gov.br/editais-abertos", descricao: "Chamadas para inovação e pesquisa aplicada em Goiás" },
  "AM": { nome: "Fundação de Amparo à Pesquisa do Estado do Amazonas", sigla: "FAPEAM", url: "https://www.fapeam.am.gov.br/editais", descricao: "Chamadas para P&D e inovação no Amazonas — ZFM" },
  "DF": { nome: "Fundação de Apoio à Pesquisa do Distrito Federal", sigla: "FAPDF", url: "https://www.fap.df.gov.br/editais", descricao: "Chamadas para pesquisa e inovação no DF" },
};

function getLinhasFinanciamento(uf: string) {

  // ─── Editais reais abertos em 2026 com verba concreta ───
  const editaisAbertos2026 = [
    {
      tipo: "financiamento",
      titulo: "Finep Tecnologias Digitais — R$ 300M em subvenção",
      orgao: "Finep / MCTI · Mais Inovação Brasil",
      descricao: "Subvenção econômica (sem devolução) para empresas que desenvolvem IA, proteção digital, plataformas e sistemas inovadores. Projetos individuais ou em rede com ICT parceira. Empresas com fins lucrativos, comprovando atuação em P&D.",
      valor_total: "R$ 300.000.000",
      valor_por_projeto: "Sem limite definido — varia por projeto",
      valor_max: "R$ 300M no total do edital",
      prazo: "30/09/2026 — ou até esgotar os recursos",
      prazo_urgencia: "proximo",
      data_encerramento: "2026-09-30",
      dias_restantes: Math.ceil((new Date("2026-09-30").getTime() - Date.now()) / 86400000),
      url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/noticias/2026/04/edital-de-r-300-milhoes-apoia-empresas-no-desenvolvimento-de-tecnologias-digitais-avancadas",
      cnpj_elegivel: "Empresas brasileiras com fins lucrativos + parceria com ICT",
      regime_tributario: "Qualquer",
      tags: ["subvenção", "sem devolução", "IA", "digital", "300M", "2026"],
      destaque: true,
    },
    {
      tipo: "financiamento",
      titulo: "Finep NIB — R$ 3,3 bilhões em 10 editais temáticos",
      orgao: "Finep / Nova Indústria Brasil / MCTI",
      descricao: "Pacote de 10 editais de subvenção econômica alinhados às 6 missões da Nova Indústria Brasil: transição energética, transformação mineral, saúde, agroindústria, transformação digital e defesa. TRL aceito até nível 9. Reserva mínima de 30% para regiões Norte, Nordeste e Centro-Oeste.",
      valor_total: "R$ 3.300.000.000 (soma dos 10 editais)",
      valor_por_projeto: "Varia por edital — verificar chamada específica",
      valor_max: "R$ 3,3bi somando os 10 editais",
      prazo: "Prazos variados por edital — verificar portal Finep",
      prazo_urgencia: "normal",
      data_encerramento: null,
      dias_restantes: null,
      url: "https://www.finep.gov.br/chamadas-publicas",
      cnpj_elegivel: "Empresas brasileiras com fins lucrativos",
      regime_tributario: "Qualquer",
      tags: ["subvenção", "NIB", "Nova Indústria", "3.3bi", "temático", "2026"],
      destaque: true,
    },
    {
      tipo: "financiamento",
      titulo: "BNDES + Finep — Centros de P&D e Inovação",
      orgao: "BNDES / Finep / Nova Indústria Brasil",
      descricao: "Chamada pública para atrair, implantar ou expandir Centros de P&D no Brasil. Recursos mistos (reembolsável e não reembolsável). Empresas nacionais e estrangeiras que formalizem CNPJ no Brasil. Engloba laboratórios, plantas piloto e plantas de demonstração. Alinhado às 6 missões da NIB.",
      valor_total: "Não divulgado — por aprovação de projeto",
      valor_por_projeto: "Definido por proposta aprovada",
      valor_max: "Definido por proposta aprovada",
      prazo: "Inscrições abertas — verificar BNDES",
      prazo_urgencia: "normal",
      data_encerramento: null,
      dias_restantes: null,
      url: "https://www.bndes.gov.br/wps/portal/site/home/onde-atuamos/inovacao/chamada-publica-para-selecao-de-propostas-centros-de-pesquisa-desenvolvimento-tecnologico-e-inovacao",
      cnpj_elegivel: "Empresas nacionais e estrangeiras (com CNPJ BR)",
      regime_tributario: "Qualquer",
      tags: ["P&D", "BNDES", "Finep", "laboratório", "planta piloto"],
    },
    {
      tipo: "financiamento",
      titulo: "Finep Startups IA — Subvenção para startups de IA",
      orgao: "Finep / MCTI / PBIA",
      descricao: "Edital específico para startups que desenvolvem soluções de Inteligência Artificial. Parte do Plano Brasileiro de Inteligência Artificial (PBIA — R$ 23bi até 2028). Subvenção econômica sem devolução para startups deep tech.",
      valor_total: "Parte dos R$ 23bi do PBIA",
      valor_por_projeto: "Verificar edital — contato: drin@finep.gov.br",
      valor_max: "Parte dos R$ 23bi do PBIA",
      prazo: "Verificar chamada ativa — portal Finep",
      prazo_urgencia: "normal",
      data_encerramento: null,
      dias_restantes: null,
      url: "http://www.finep.gov.br/chamadas-publicas/chamadapublica/676",
      cnpj_elegivel: "Startups de IA — empresas com fins lucrativos",
      regime_tributario: "Qualquer",
      tags: ["startup", "IA", "PBIA", "deep tech", "subvenção"],
    },
    {
      tipo: "financiamento",
      titulo: "BNDES Inovação — Crédito a partir de 6% a.a.",
      orgao: "BNDES",
      descricao: "Financiamento reembolsável para P&D, aquisição de máquinas e equipamentos inovadores e implantação de processos. Prazo de até 10 anos. Linha permanente — sem necessidade de chamada específica. Para todos os portes via agentes financeiros credenciados.",
      valor_total: "Linha permanente",
      valor_por_projeto: "Até R$ 150M (BNDES direto) · Sem limite via agentes",
      valor_max: "Até R$ 150M (BNDES direto)",
      prazo: "Linha permanente — solicitação contínua",
      prazo_urgencia: "normal",
      data_encerramento: null,
      dias_restantes: null,
      url: "https://www.bndes.gov.br/inovacao",
      cnpj_elegivel: "Micro, pequena, média e grande empresa",
      regime_tributario: "Qualquer",
      tags: ["crédito", "BNDES", "6% a.a.", "até 10 anos", "permanente"],
    },
    {
      tipo: "financiamento",
      titulo: "Finep Crédito — TJLP para projetos de inovação",
      orgao: "Finep / MCTI",
      descricao: "Financiamento reembolsável com taxa TJLP + spread reduzido. Para desenvolvimento de produtos, processos e serviços inovadores. Empresas de médio e grande porte. Contato via Finep regional.",
      valor_total: "Linha permanente",
      valor_por_projeto: "A partir de R$ 5M (Finep direto)",
      valor_max: "A partir de R$ 5M (Finep direto)",
      prazo: "Janelas abertas — contato via escritório Finep regional",
      prazo_urgencia: "normal",
      data_encerramento: null,
      dias_restantes: null,
      url: "https://www.finep.gov.br/apoio-e-financiamento-2/programas-e-linhas",
      cnpj_elegivel: "Empresas de médio e grande porte",
      regime_tributario: "Qualquer",
      tags: ["crédito", "TJLP", "reembolsável", "Finep"],
    },
    {
      tipo: "financiamento",
      titulo: "EMBRAPII — 1/3 do projeto sem devolução",
      orgao: "EMBRAPII",
      descricao: "A EMBRAPII financia 1/3 do projeto (sem devolução). Empresa entra com 1/3 e a ICT credenciada com 1/3. TRL 4–6. Processo: empresa contacta unidade EMBRAPII credenciada no seu setor → proposta técnica → contrato tripartite. Sem editais — adesão contínua.",
      valor_total: "Proporcional ao projeto",
      valor_por_projeto: "Sem teto — depende da unidade EMBRAPII",
      valor_max: "1/3 do valor do projeto, sem teto",
      prazo: "Adesão contínua — sem prazo de inscrição",
      prazo_urgencia: "normal",
      data_encerramento: null,
      dias_restantes: null,
      url: "https://embrapii.org.br/empresas",
      cnpj_elegivel: "Qualquer empresa com projeto de P&D aplicado",
      regime_tributario: "Qualquer",
      tags: ["EMBRAPII", "co-financiamento", "sem edital", "TRL 4-6", "1/3 grátis"],
    },
    {
      tipo: "incentivo",
      titulo: "Lei do Bem — até 80% do P&D deduzido do IR",
      orgao: "MCTI / Receita Federal",
      descricao: "Empresas em Lucro Real deduzem 60–80% dos gastos com P&D diretamente do IRPJ/CSLL. Automático — sem aprovação prévia. Entrega do formulário FORMP&D ao MCTI até 31/agosto de cada ano. Em 2024: 4.252 empresas usaram, deduzindo R$ 11,98bi do IR.",
      valor_total: "R$ 11,98 bilhões deduzidos em 2024 (4.252 empresas)",
      valor_por_projeto: "60–80% dos gastos com P&D — sem teto",
      valor_max: "60–80% dos gastos com P&D — sem teto",
      prazo: "Regime permanente — FORMP&D: até 31/08 de cada ano",
      prazo_urgencia: "normal",
      data_encerramento: null,
      dias_restantes: null,
      url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem",
      cnpj_elegivel: "Empresas em Lucro Real",
      regime_tributario: "Lucro Real",
      tags: ["fiscal", "IR", "automático", "4252 empresas", "sem aprovação"],
    },
    {
      tipo: "parceria",
      titulo: "Encomenda Tecnológica — governo paga para você desenvolver",
      orgao: "MCTI / Ministérios setoriais",
      descricao: "O Estado contrata empresa para criar solução que ainda não existe. O risco tecnológico é da empresa — o risco financeiro é zero (governo paga). Previsto no Art. 20 da Lei 10.973/2004. Diferente de licitação: o governo aceita que o produto pode não funcionar.",
      valor_total: "Definido por edital",
      valor_por_projeto: "Verificar PNCP — filtro 'encomenda tecnológica'",
      valor_max: "Definido por edital",
      prazo: "Conforme editais — verificar PNCP",
      prazo_urgencia: "normal",
      data_encerramento: null,
      dias_restantes: null,
      url: "https://pncp.gov.br/app/editais?q=encomenda+tecnologica",
      cnpj_elegivel: "Empresas com capacidade técnica comprovada",
      regime_tributario: "Qualquer",
      tags: ["encomenda", "risco zero", "governo paga", "Marco Legal CT&I"],
    },
    {
      tipo: "parceria",
      titulo: "InovAtiva Brasil — aceleração gratuita + Demo Day",
      orgao: "MDIC / SEBRAE",
      descricao: "Maior programa de aceleração gratuito do Brasil. 3 meses de mentoria intensiva, Demo Day com investidores nacionais e internacionais, conexão com mercado. 15.000+ startups aceleradas. Inscrições duas vezes por ano.",
      valor_total: "Gratuito (valor da mentoria estimado em R$ 50k+)",
      valor_por_projeto: "Sem aporte financeiro direto",
      valor_max: "Gratuito — sem aporte direto",
      prazo: "Inscrições 2x por ano — verificar portal",
      prazo_urgencia: "normal",
      data_encerramento: null,
      dias_restantes: null,
      url: "https://www.inovativabrasil.com.br",
      cnpj_elegivel: "Startups de qualquer setor com produto mínimo",
      regime_tributario: "Qualquer",
      tags: ["gratuito", "aceleração", "Demo Day", "15000 aceleradas"],
    },
  ];

  // FAP estadual quando há UF
  const fapEstadual = uf && FAP_BY_UF[uf] ? [{
    tipo: "financiamento",
    titulo: `${FAP_BY_UF[uf].sigla} — Chamadas abertas em ${uf}`,
    orgao: FAP_BY_UF[uf].nome,
    descricao: FAP_BY_UF[uf].descricao,
    valor_total: "Varia por chamada",
    valor_por_projeto: "Verificar portal da agência",
    valor_max: "Varia por chamada",
    prazo: "Verificar portal da agência",
    prazo_urgencia: "normal",
    data_encerramento: null,
    dias_restantes: null,
    url: FAP_BY_UF[uf].url,
    cnpj_elegivel: `Empresas do estado ${uf}`,
    regime_tributario: "Qualquer",
    tags: ["estadual", "FAP", uf, "regional"],
    destaque_local: true,
  }] : [];

  // FAPESP em destaque especial para SP (chamadas específicas abertas)
  const fapespExtra = uf === "SP" ? [{
    tipo: "financiamento",
    titulo: "FAPESP PIPE — até R$ 2M para startups de SP",
    orgao: "FAPESP",
    descricao: "Programa PIPE: Fase 1 até R$ 300k para prova de conceito; Fase 2 até R$ 2M para desenvolvimento; Fase 3 até R$ 1M para escalonamento. FAPESP abriu credenciamento de incubadoras em 2026 para apoiar empresas PIPE. Sem devolução.",
    valor_total: "Varia por fase — até R$ 2M na Fase 2",
    valor_por_projeto: "Fase 1: R$ 300k · Fase 2: R$ 2M · Fase 3: R$ 1M",
    valor_max: "Até R$ 2M (Fase 2)",
    prazo: "Chamadas contínuas — submissão a qualquer momento",
    prazo_urgencia: "normal",
    data_encerramento: null,
    dias_restantes: null,
    url: "https://fapesp.br/pipe",
    cnpj_elegivel: "Pequenas empresas com sede em SP",
    regime_tributario: "Qualquer",
    tags: ["PIPE", "FAPESP", "SP", "startup", "até 2M", "sem devolução"],
    destaque_local: true,
  }] : [];

  return [...fapEstadual, ...fapespExtra, ...editaisAbertos2026];
}


async function fetchPregoesAbertos(query: string, uf: string, searchTerms: string[]) {
  const resultados: any[] = [];
  const seen = new Set<string>();
  const termos = [query, ...searchTerms.slice(0, 2)];
  const ufParam = uf ? `&ufSigla=${uf}` : "";

  for (const termo of termos.slice(0, 3)) {
    const data = await safeFetch(
      `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?tamanhoPagina=8&pagina=1&q=${encodeURIComponent(termo)}${ufParam}`,
      {}, 15000
    );
    const items: any[] = Array.isArray(data) ? data : (data?.data || data?.content || []);
    for (const item of items) {
      const id = item.id || item.numeroCompra || String(item.objetoCompra || "").slice(0, 30);
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const dataFim = item.dataEncerramentoProposta || item.dataFim;
      let diasRestantes: number | null = null;
      let prazoUrgencia = "normal";
      if (dataFim) {
        const diff = (new Date(dataFim).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        diasRestantes = Math.ceil(diff);
        if (diasRestantes > 0 && diasRestantes <= 15) prazoUrgencia = "urgente";
        else if (diasRestantes > 0 && diasRestantes <= 60) prazoUrgencia = "proximo";
      }

      resultados.push({
        tipo: "pregao",
        titulo: (item.objetoCompra || item.objeto || "Contratação pública").slice(0, 120),
        orgao: item.orgaoEntidade?.razaoSocial || "",
        valor: item.valorTotalEstimado || 0,
        modalidade: item.modalidadeNome || "",
        data_publicacao: (item.dataPublicacao || "").slice(0, 10),
        data_encerramento: dataFim ? dataFim.slice(0, 10) : null,
        dias_restantes: diasRestantes,
        prazo_urgencia: prazoUrgencia,
        uf: item.unidadeOrgao?.ufSigla || uf || "",
        url: item.linkSistemaOrigem || "https://pncp.gov.br/app/editais",
      });
    }
  }

  return resultados
    .sort((a, b) => {
      const o: Record<string, number> = { urgente: 0, proximo: 1, normal: 2 };
      return (o[a.prazo_urgencia] ?? 2) - (o[b.prazo_urgencia] ?? 2);
    })
    .slice(0, 10);
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

    const pregoesAbertos = await fetchPregoesAbertos(query, uf || "", search_terms || []);
    const linhasFinanciamento = getLinhasFinanciamento(uf || "");

    return new Response(JSON.stringify({
      pregoes_abertos: pregoesAbertos,
      linhas_financiamento: linhasFinanciamento,
      contexto: {
        query, uf: uf || null,
        total_pregoes: pregoesAbertos.length,
        pregoes_urgentes: pregoesAbertos.filter((p: any) => p.prazo_urgencia === "urgente").length,
        pregoes_proximos: pregoesAbertos.filter((p: any) => p.prazo_urgencia === "proximo").length,
        total_verba_disponivel: "R$ 3,6bi+ em subvenção Finep 2026 + crédito BNDES permanente",

      },
      sources: ["PNCP", "Curadoria Motor da Inovação"],
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("layer-oportunidades error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

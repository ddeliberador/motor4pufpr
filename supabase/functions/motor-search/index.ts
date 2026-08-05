import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RAILWAY_API_URL = Deno.env.get("RAILWAY_API_URL") || "https://motor4pufpr-production.up.railway.app/api/v1";

interface OntologyMapping {
  query: string;
  ncm_codes: Array<{ code: string; description: string }>;
  cnae_codes: Array<{ code: string; description: string }>;
  ipc_codes: Array<{ code: string; description: string }>;
  cnpq_areas: Array<{ code: string; name: string }>;
  cbo_codes: Array<{ code: string; description: string; area?: string }>;
  search_terms: string[];
  confidence: number;
}

// Busca tradução ontológica do backend Python (NCM, CNAE, IPC, CNPq)
async function fetchOntologyMapping(query: string): Promise<OntologyMapping | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000); // 10s max
  try {
    const res = await fetch(`${RAILWAY_API_URL}/ontology/translate`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      console.warn(`OntologyEngine ${res.status} — usando busca por texto`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn("OntologyEngine indisponível:", e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function invokeLayer(name: string, body: Record<string, any>): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`Layer ${name} failed: ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`Layer ${name} error:`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ===== CROSS-LAYER INDICES =====
// GT: Gap Tecnológico (knowledge ⨉ technology ⨉ policy)
// CD: Dependência Comercial (international)
// AUE: Alinhamento U-E (knowledge ⨉ policy)
// EI: Efetividade Instrumental (policy ⨉ knowledge)
function computeCrossLayerIndices(knowledge: any, technology: any, policy: any, international: any) {
  const totalPapersBR = knowledge?.total_papers || 0;
  const totalPapersGlobal = knowledge?.total_papers_global || totalPapersBR;
  const repos = technology?.github_repos?.length || 0;
  const totalContracts = policy?.total_contracts || 0;
  const totalConvenios = policy?.total_convenios || 0;
  const totalPatentDatasets = technology?.patent_datasets?.length || 0;

  // GT — Gap de Tradução Científica (0-100, normalizado em log)
  let gt_value = 0;
  let gt_confidence: "high" | "medium" | "low" = "low";
  let gt_basis = "";

  const applicationSignals = repos + totalContracts + totalConvenios + totalPatentDatasets;

  if (totalPapersBR === 0) {
    gt_value = 0;
    gt_basis = "sem dados de produção científica";
  } else if (applicationSignals === 0) {
    const brSharePct = totalPapersGlobal > 0 ? (totalPapersBR / totalPapersGlobal) * 100 : 0;
    gt_value = Math.round(Math.max(0, Math.min(100, 100 - brSharePct * 2)));
    gt_confidence = "low";
    gt_basis = "estimado via share BR/global (sem dados de aplicação)";
  } else {
    const ratio = totalPapersBR / applicationSignals;
    const logRatio = Math.log10(Math.max(ratio, 0.01));
    gt_value = Math.round(Math.min(100, Math.max(0, 25 + logRatio * 25)));
    gt_confidence = totalContracts > 0 ? "high" : "medium";
    gt_basis = `${totalPapersBR} papers BR / ${applicationSignals} sinais de aplicação`;
  }

  const gt_alert = gt_value > 70 ? "critical" : gt_value > 45 ? "warning" : "normal";

  // CD — Concentração de Dependência Científica Internacional
  const cd_value = international?.dependency_index || 0;
  const cd_alert = cd_value > 70 ? "critical" : cd_value > 50 ? "warning" : "normal";
  const cd_confidence: "high" | "medium" | "low" = international?.countries_with_coauthorship > 3 ? "high" : "medium";

  // AUE — Alinhamento Universidade-Empresa (score composto de sinais)
  let aue_value = 0;
  let aue_confidence: "high" | "medium" | "low" = "low";
  let aue_basis = "";

  const hasScientificBase = totalPapersBR > 0;
  const hasInstruments = (totalContracts + totalConvenios) > 0;
  const hasOpenCode = repos > 2;
  const hasIntlNetwork = (international?.countries_with_coauthorship || 0) > 5;
  const hasFunding = (knowledge?.papers || []).some((p: any) => (p.grants || []).length > 0);

  const aueSignals = [
    hasScientificBase ? 20 : 0,
    hasInstruments ? 25 : 0,
    hasOpenCode ? 20 : 0,
    hasIntlNetwork ? 20 : 0,
    hasFunding ? 15 : 0,
  ];
  aue_value = aueSignals.reduce((a, b) => a + b, 0);

  if (hasInstruments) {
    aue_confidence = "high";
    aue_basis = `${totalContracts + totalConvenios} instrumentos + ${aueSignals.filter(s => s > 0).length - 1} outros sinais`;
  } else if (hasScientificBase && (hasOpenCode || hasIntlNetwork)) {
    aue_confidence = "medium";
    aue_basis = "sem instrumentos públicos — estimado por sinais alternativos";
  } else {
    aue_confidence = "low";
    aue_basis = "dados insuficientes para articulação U-E";
  }

  const aue_alert = aue_value < 20 ? "critical" : aue_value < 40 ? "warning" : "normal";

  // EI — Efetividade Instrumental (TRL × instrumentos)
  let ei_value = 0;
  let ei_confidence: "high" | "medium" | "low" = "low";
  let ei_basis = "";

  const trl = technology?.trl_estimate || 2;
  const instrumentCount = totalContracts + totalConvenios;
  const totalInstrumentalValue = policy?.total_instrumental_value || 0;

  if (totalPapersBR === 0) {
    ei_value = 0;
    ei_basis = "sem dados de produção científica";
  } else if (instrumentCount === 0 && totalInstrumentalValue === 0) {
    ei_value = trl <= 3 ? 30 : trl <= 5 ? 15 : 5;
    ei_confidence = "low";
    ei_basis = `TRL ${trl} sem instrumentos públicos identificados`;
  } else if (totalInstrumentalValue > 0) {
    const ratio = totalInstrumentalValue / Math.max(instrumentCount, 1);
    const logScore = Math.min(100, Math.round(Math.log10(ratio) * 20 + 50));
    const trlAlignment = Math.abs(trl - 5) < 3 ? 1.0 : 0.8;
    ei_value = Math.round(Math.min(100, Math.max(0, logScore * trlAlignment)));
    ei_confidence = "high";
    ei_basis = `R$ ${(totalInstrumentalValue / 1e6).toFixed(1)}M em ${instrumentCount} instrumentos`;
  } else {
    const countScore = instrumentCount <= 2 ? 30 : instrumentCount <= 5 ? 50 : 65;
    ei_value = Math.round(countScore * (trl / 9));
    ei_confidence = "medium";
    ei_basis = `${instrumentCount} instrumentos identificados (sem valor financeiro)`;
  }

  const ei_alert = ei_value < 30 ? "critical" : ei_value < 55 ? "warning" : "normal";

  return {
    gt: {
      value: gt_value,
      label: "Gap de Tradução",
      description: "Distância entre produção científica e aplicação tecnológica no campo",
      formula: "log10(papers_BR / sinais_de_aplicação) × 25 + 25",
      basis: gt_basis,
      confidence: gt_confidence,
      layers_used: ["knowledge", "technology", "policy"],
      alert_level: gt_alert,
    },
    cd: {
      value: cd_value,
      label: "Dependência Científica",
      description: "% da produção com origem fora do Brasil (coautorias OpenAlex)",
      formula: "(papers_estrangeiros / total_coautorias) × 100",
      basis: `${international?.countries_with_coauthorship || 0} países com coautoria identificados`,
      confidence: cd_confidence,
      layers_used: ["international", "knowledge"],
      alert_level: cd_alert,
    },
    aue: {
      value: aue_value,
      label: "Articulação U-E",
      description: "Score composto de sinais de articulação entre academia e aplicação",
      formula: "Σ sinais: produção + instrumentos + código aberto + rede intl. + financiamento",
      basis: aue_basis,
      confidence: aue_confidence,
      layers_used: ["knowledge", "technology", "policy"],
      alert_level: aue_alert,
    },
    ei: {
      value: ei_value,
      label: "Efetividade Instrumental",
      description: "Alinhamento entre maturidade tecnológica (TRL) e instrumentos públicos disponíveis",
      formula: "alinhamento TRL × intensidade instrumental",
      basis: ei_basis,
      confidence: ei_confidence,
      layers_used: ["policy", "technology", "knowledge"],
      alert_level: ei_alert,
    },
  };
}

function computePersonaInsights(
  persona: string,
  knowledge: any,
  technology: any,
  policy: any,
  international: any,
  indices: any,
  entityContext?: any
): Record<string, any> {
  const k = knowledge || {};
  const t = technology || {};
  const p = policy || {};
  const i = international || {};

  const papers = k.total_papers || 0;
  const papersGlobal = k.total_papers_global || papers;
  const brShare = papersGlobal > 0 ? (papers / papersGlobal) * 100 : 0;
  const institutions = Object.entries(k.institutions || {}).sort((a: any, b: any) => b[1] - a[1]);
  const topInstitution = institutions[0]?.[0] || null;
  const topInstitutionCount = (institutions[0]?.[1] as number) || 0;
  const concepts = (k.concepts || []).map((c: any) => c.name);
  const repos = t.github_repos || [];
  const trl = t.trl_estimate || 2;
  const contracts = p.contracts || [];
  const convenios = p.convenios || [];
  const sanctions = p.sanctions || [];
  const grants = (k.papers || []).flatMap((paper: any) => paper.grants || []).filter((g: any) => g.funder);
  const funders: string[] = [...new Set(grants.map((g: any) => g.funder as string))].slice(0, 5);

  // Conceitos com poucos papers (< 20% do total) = nicho potencial
  const nichoConcepts = (k.concepts || []).filter((c: any) => c.count < papers * 0.2).map((c: any) => c.name).slice(0, 3);

  // Instituições com papers mas sem contrato = isoladas academicamente
  const institutionNames = institutions.map(([name]) => name.toLowerCase());
  const contractOrgans = contracts.map((c: any) => (c.organ || "").toLowerCase());
  const isolatedInstitutions = institutionNames.filter((name: string) =>
    !contractOrgans.some((o: string) => o.includes(name.slice(0, 12)) || name.includes(o.slice(0, 12)))
  ).slice(0, 3);

  const totalInstrumentalValue = (p.total_contract_value || 0) + (p.total_convenio_value || 0);
  const depIndex = i.dependency_index || 0;

  if (persona === "pesquisador") {
    const saturationLevel = papers > 5000 ? "saturado" : papers > 500 ? "em crescimento" : "emergente";
    const hasOpenAccessGap = (k.papers || []).filter((pp: any) => !pp.is_open_access).length > (k.papers || []).length * 0.5;
    const topCoauthorCountry = (k.international || []).filter((c: any) => c.country_code !== "BR")[0];
    const conversionRatio = contracts.length > 0 ? Math.round(papers / contracts.length) : null;

    return {
      saturation: {
        level: saturationLevel,
        papers_br: papers,
        papers_global: papersGlobal,
        br_share_pct: brShare.toFixed(1),
        signal: papers > 5000
          ? `Campo saturado com ${papers.toLocaleString("pt-BR")} papers globais — diferenciação é essencial`
          : papers < 200
          ? `Campo emergente com apenas ${papers} papers — oportunidade de pioneirismo`
          : `Campo em crescimento com ${papers.toLocaleString("pt-BR")} papers — espaço para especialização`,
      },
      nicho: {
        concepts: nichoConcepts,
        signal: nichoConcepts.length > 0
          ? `Subáreas com baixa competição: ${nichoConcepts.join(", ")}`
          : "Campo uniforme — busque cruzamentos interdisciplinares",
      },
      funding: {
        funders_found: funders,
        has_capes: funders.some((f) => f.toLowerCase().includes("capes") || f.toLowerCase().includes("coordenação de aperfeiçoamento")),
        has_cnpq: funders.some((f) => f.toLowerCase().includes("cnpq") || f.toLowerCase().includes("conselho nacional")),
        has_fapesp: funders.some((f) => f.toLowerCase().includes("fapesp")),
        has_international: funders.some((f) => !f.toLowerCase().includes("brasil") && !f.toLowerCase().includes("brazil")),
        signal: funders.length > 0
          ? `Financiadores identificados nos papers: ${funders.slice(0, 3).join(", ")}`
          : "Nenhum financiador identificado nos metadados — verifique editais abertos no CNPq e CAPES",
      },
      collaboration: {
        top_country: topCoauthorCountry?.country_code || null,
        top_country_count: topCoauthorCountry?.count || 0,
        isolated_groups: isolatedInstitutions,
        signal: topCoauthorCountry
          ? `Principal parceiro internacional: ${topCoauthorCountry.country_code} (${topCoauthorCountry.count} coautorias)`
          : "Sem coautorias internacionais identificadas",
      },
      open_access_gap: hasOpenAccessGap,
      translation_gap: {
        ratio: conversionRatio,
        signal: conversionRatio && conversionRatio > 20
          ? `${conversionRatio} papers para cada contrato público — alto potencial de pesquisa aplicada`
          : conversionRatio === null
          ? "Sem contratos públicos para comparar"
          : "Relação equilibrada entre pesquisa e aplicação",
      },
    };
  }

  if (persona === "universidade") {
    const entityName = entityContext?.entityName || "";
    const myInstitutionData = entityName
      ? institutions.find(([name]) => name.toLowerCase().includes(entityName.toLowerCase().slice(0, 10)))
      : null;
    const myRank = myInstitutionData ? institutions.indexOf(myInstitutionData) + 1 : null;
    const myPapers = (myInstitutionData?.[1] as number) || 0;
    const myContracts = entityName
      ? contracts.filter((c: any) => c.organ?.toLowerCase().includes(entityName.toLowerCase().slice(0, 10))).length
      : 0;
    const conversionIndex = myPapers > 0 && myContracts > 0 ? (myContracts / myPapers * 100).toFixed(1) : "0";

    return {
      positioning: {
        entity: entityName || null,
        rank: myRank,
        papers: myPapers,
        total_institutions: institutions.length,
        leader: topInstitution,
        leader_papers: topInstitutionCount,
        gap_to_leader: myPapers > 0 ? topInstitutionCount - myPapers : null,
        signal: myRank
          ? `${entityName} está em ${myRank}º lugar com ${myPapers} papers (líder: ${topInstitution} com ${topInstitutionCount})`
          : `Líder nacional: ${topInstitution} com ${topInstitutionCount} papers`,
      },
      conversion: {
        index: conversionIndex,
        papers: myPapers,
        contracts: myContracts,
        signal: myPapers > 0
          ? myContracts > 0
            ? `Índice de conversão: ${conversionIndex}% (${myContracts} contratos para ${myPapers} papers)`
            : `Baixa conversão: ${myPapers} papers sem contratos públicos identificados — gap U-E crítico`
          : "Busque pela sua instituição para calcular o índice de conversão",
      },
      strategic_areas: {
        strong: concepts.slice(0, 3),
        emerging: nichoConcepts,
        signal: concepts.length > 0
          ? `Áreas com maior produção: ${concepts.slice(0, 3).join(", ")}`
          : "Sem dados de especialização",
      },
      isolated_groups: isolatedInstitutions,
      funding_gap: {
        total_instruments: contracts.length + convenios.length,
        total_value: totalInstrumentalValue,
        signal: totalInstrumentalValue > 0
          ? `R$ ${(totalInstrumentalValue / 1e6).toFixed(1)}M em instrumentos disponíveis neste campo`
          : "Nenhum instrumento público identificado — campo sem financiamento governamental direto",
      },
    };
  }

  if (persona === "empresa") {
    const makeOrBuy = trl >= 7 ? "buy" : trl >= 4 ? "hybrid" : "research";
    const makeOrBuyLabel = makeOrBuy === "buy"
      ? "COMPRAR/LICENCIAR — tecnologia madura disponível no mercado"
      : makeOrBuy === "hybrid"
      ? "PARCERIA P&D — tecnologia em desenvolvimento, busque ICT parceira"
      : "P&D PRÓPRIO OU ENCOMENDADO — campo ainda básico, risco alto para compra";
    const bestPartner = institutions.find(([name]) =>
      contractOrgans.some((o: string) => o.includes(name.toLowerCase().slice(0, 10)))
    );

    return {
      make_or_buy: {
        decision: makeOrBuy,
        trl: trl,
        label: makeOrBuyLabel,
        signal: makeOrBuyLabel,
      },
      best_partner: {
        institution: bestPartner?.[0] || topInstitution,
        papers: (bestPartner?.[1] as number) || topInstitutionCount,
        has_contract_history: !!bestPartner,
        signal: bestPartner
          ? `${bestPartner[0]} tem ${bestPartner[1]} papers E histórico de contratos públicos — parceira ideal`
          : topInstitution
          ? `${topInstitution} lidera com ${topInstitutionCount} papers mas sem histórico de contratos — parceria acadêmica pura`
          : "Nenhum grupo de P&D identificado",
      },
      market_size: {
        contracts: contracts.length,
        value: totalInstrumentalValue,
        signal: totalInstrumentalValue > 0
          ? `Mercado público de R$ ${(totalInstrumentalValue / 1e6).toFixed(1)}M em ${contracts.length + convenios.length} instrumentos`
          : "Mercado público ainda não estabelecido — campo pré-comercial",
      },
      dependency_risk: {
        index: depIndex,
        critical: depIndex > 60,
        signal: depIndex > 60
          ? `Risco crítico: ${depIndex}% da produção científica é estrangeira — dependência tecnológica alta`
          : depIndex > 30
          ? `Risco moderado: ${depIndex}% de dependência externa — monitorar cadeias de fornecimento`
          : "Baixa dependência externa — campo com capacidade nacional relevante",
      },
      open_tech: {
        repos: repos.length,
        top_stars: repos[0]?.stars || 0,
        signal: repos.length > 0
          ? `${repos.length} repositórios open source disponíveis — base de código reutilizável`
          : "Sem tecnologia open source identificada — desenvolvimento será do zero",
      },
      sanctions_alert: sanctions.length > 0
        ? `Atenção: ${sanctions.length} empresa(s) sancionada(s) neste campo (CEIS)`
        : null,
    };
  }

  if (persona === "governo") {
    const ufDist = p.uf_distribution || {};
    const ufsWithPresence = Object.keys(ufDist).length;
    const totalUFs = 27;
    const coverage = Math.round((ufsWithPresence / totalUFs) * 100);
    const topUF = Object.entries(ufDist).sort((a: any, b: any) => b[1] - a[1])[0];
    const hasRegionalConcentration = ufsWithPresence > 0 && ufsWithPresence < 8;
    const instrumentEfficiency = contracts.length > 0 && papers > 0
      ? Math.round(papers / contracts.length)
      : null;

    const verdictByTrl = trl <= 3 ? "INVESTIR EM P&D BÁSICO" : trl <= 5 ? "CRIAR INSTRUMENTO DE PROTÓTIPO" : trl <= 7 ? "REESTRUTURAR — ampliar escala" : "REDUZIR SUBSÍDIO — mercado maduro";
    const verdictByGT = indices.gt?.value > 70 ? "CRIAR NOVO INSTRUMENTO DE TRANSFERÊNCIA TECNOLÓGICA" : null;
    const verdictByAUE = indices.aue?.value < 20 ? "REESTRUTURAR — criar mecanismo de articulação U-E" : null;
    const verdictByCD = depIndex > 60 ? "INVESTIR — reduzir dependência estratégica" : null;

    return {
      prescription: {
        primary: verdictByTrl,
        secondary: [verdictByGT, verdictByAUE, verdictByCD].filter(Boolean),
        trl_justification: `TRL ${trl} (${t.trl_label}) → ${verdictByTrl}`,
      },
      territorial: {
        ufs_with_presence: ufsWithPresence,
        coverage_pct: coverage,
        top_uf: topUF?.[0] || null,
        top_uf_contracts: (topUF?.[1] as number) || 0,
        regional_concentration: hasRegionalConcentration,
        signal: hasRegionalConcentration
          ? `Alta concentração: ${ufsWithPresence} UFs com contratos de ${totalUFs} — ${totalUFs - ufsWithPresence} estados sem acesso`
          : ufsWithPresence > 0
          ? `Distribuição moderada: ${ufsWithPresence} UFs cobertas (${coverage}%)`
          : "Sem dados territoriais — configure TRANSPARENCIA_API_KEY",
      },
      instrument_effectiveness: {
        papers_per_contract: instrumentEfficiency,
        total_value: totalInstrumentalValue,
        signal: instrumentEfficiency && instrumentEfficiency > 50
          ? `${instrumentEfficiency} papers por contrato — alto gap de tradução, instrumentos não convergem com pesquisa`
          : instrumentEfficiency
          ? `${instrumentEfficiency} papers por contrato — relação razoável`
          : "Sem dados para calcular efetividade",
      },
      dependency_alert: {
        index: depIndex,
        critical: depIndex > 60,
        signal: depIndex > 60
          ? `ALERTA ESTRATÉGICO: ${depIndex}% da produção científica é estrangeira — risco soberano`
          : null,
      },
      capacity: {
        institutions: institutions.length,
        leader: topInstitution,
        leader_papers: topInstitutionCount,
        signal: `${institutions.length} instituições ativas — líder: ${topInstitution || "não identificado"}`,
      },
    };
  }

  return {};
}



Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, selectedCnaes, persona = "pesquisador", uf, uf_nome, municipio, municipio_ibge } = await req.json();
    const location = { uf: uf || "", uf_nome: uf_nome || "", municipio: municipio || "", municipio_ibge: municipio_ibge || "" };
    const hasLocation = !!uf;
    console.log(`Localização: ${hasLocation ? `${municipio || uf}` : "nacional"}`);
    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Motor 4P Orchestrator: ${query}`);
    const start = Date.now();

    // STEP 0: Tradução ontológica (NCM, CNAE, IPC, CNPq)
    const ontology = await fetchOntologyMapping(query);
    if (ontology) {
      console.log(`Ontologia: ${ontology.ncm_codes?.length || 0} NCM, ${ontology.cnae_codes?.length || 0} CNAE, ${ontology.ipc_codes?.length || 0} IPC — confiança ${ontology.confidence}`);
    }

    const searchTerms: string[] = ontology?.search_terms?.length ? ontology.search_terms : [query];
    const ncmCodes = ontology?.ncm_codes || [];
    const ipcCodes = (ontology?.ipc_codes || []).map((c) => c.code);
    // CNAEs selecionados pelo usuário têm prioridade sobre os inferidos
    const cnaeCodes: string[] = Array.isArray(selectedCnaes) && selectedCnaes.length > 0
      ? selectedCnaes
      : (ontology?.cnae_codes || []).map((c) => c.code);
    const cboCodes = ontology?.cbo_codes || [];

    // STEP 1: Knowledge layer first (other layers depend on it)
    const knowledge = await invokeLayer("layer-knowledge", { query, search_terms: searchTerms, location });

    // STEP 2: Remaining 3 layers in parallel, passing knowledge + ontology data
    const [technology, policy, international, sidra, market, patents, programs, cnpq, policies] = await Promise.all([
      invokeLayer("layer-technology", {
        query,
        knowledge_papers: knowledge?.papers?.length || 0,
        knowledge_total_papers: knowledge?.total_papers || 0,
        search_terms: searchTerms,
        ipc_codes: ipcCodes,
        cbo_codes: cboCodes,
      }),
      invokeLayer("layer-policy", {
        query,
        knowledge_total_papers: knowledge?.total_papers || 0,
        search_terms: searchTerms,
        cnae_codes: cnaeCodes,
        location,
      }),
      invokeLayer("layer-international", {
        query,
        knowledge_international: knowledge?.international || [],
        knowledge_total_papers: knowledge?.total_papers || 0,
        ncm_codes: ncmCodes,
      }),
      invokeLayer("layer-sidra", {
        query,
        cnae_codes: cnaeCodes,
        cnpq_areas: ontology?.cnpq_areas || [],
        persona: "all",
        location,
      }),
      invokeLayer("market-analysis", {
        query,
        search_terms: searchTerms,
        ipc_codes: ipcCodes,
        ncm_codes: ncmCodes,
        knowledge_total_papers: knowledge?.total_papers || 0,
      }),
      invokeLayer("layer-patents", {
        query,
        ipc_codes: ipcCodes,
      }),
      invokeLayer("layer-programs", {
        query,
        cnae_codes: cnaeCodes,
      }),
      invokeLayer("layer-cnpq", {
        query,
        cnpq_areas: ontology?.cnpq_areas || [],
      }),
      invokeLayer("layer-policies", {
        query,
        cnpq_areas: ontology?.cnpq_areas || [],
      }),
    ]);


    // STEP 3: Cross-layer indices
    const indices = computeCrossLayerIndices(knowledge, technology, policy, international);

    // Sobrescreve TRL heurístico com dado real da EPO quando disponível
    if (patents?.trl_from_patents) {
      (technology as any).trl_from_patents = patents.trl_from_patents;
    }

    // Oportunidade derivada do GT (só disponível após o cálculo dos índices)
    if (market && Array.isArray(market.opportunities)) {
      const gtValue = indices?.gt?.value ?? 0;
      const papersBR = knowledge?.total_papers || 0;
      if (papersBR > 0 && gtValue > 60) {
        market.opportunities.push({
          title: "Base científica sem tradução comercial",
          evidence: `${papersBR} publicações brasileiras no tema, mas o Gap de Tradução está em ${gtValue}/100 — conhecimento disponível e pouco apropriado pelo mercado.`,
          metric: `GT ${gtValue}/100 · ${papersBR} papers BR`,
          source: "OpenAlex + índices Motor 4P",
          severity: "alta",
        });
      }
    }

    // STEP 4: Persona-specific insights (deterministic, pre-calculated)
    const personaInsights = computePersonaInsights(
      "pesquisador", // será sobrescrito pelo motor-analysis por persona
      knowledge, technology, policy, international, indices
    );


    // Aggregate stats
    const stats = {
      papers: knowledge?.total_papers || 0,
      institutions: Object.keys(knowledge?.institutions || {}).length,
      countries: knowledge?.international?.length || 0,
      contracts: policy?.total_contracts || 0,
      convenios: policy?.total_convenios || 0,
      gazettes: policy?.gazettes?.length || 0,
      datasets: (knowledge?.capes_datasets?.length || 0) + (knowledge?.inep_datasets?.length || 0) +
        (technology?.patent_datasets?.length || 0) + (technology?.employment_datasets?.length || 0) +
        (policy?.funding_datasets?.length || 0) + (policy?.tcu_datasets?.length || 0) +
        (international?.comex_datasets?.length || 0),
      github_repos: technology?.github_repos?.length || 0,
      sanctions: policy?.sanctions?.length || 0,
      macro_indicators: international?.macro_indicators?.filter((m: any) => m.value !== null).length || 0,
      ipeadata_series: international?.ipeadata_series?.length || 0,
    };

    // Aggregate sources
    const allSources = [
      ...(knowledge?.sources || []),
      ...(technology?.sources || []),
      ...(policy?.sources || []),
      ...(international?.sources || []),
      ...(sidra?.sources || []),
      ...(market?.sources || []),
      ...(patents?.sources || []),
      ...(programs?.nova_industria?.sources || []),
      ...(programs?.pbia?.sources || []),
      ...(programs?.fomento?.sources || []),
      ...(cnpq?.sources || []),
      ...(policies?.sources || []),


    ];
    const uniqueSources = [...new Set(allSources)];

    const processingTime = Date.now() - start;

    // Gera oportunidades por perfil com base nos dados reais
    function gerarOportunidades(persona: string, dados: any) {
      const k = dados.layers?.knowledge || {};
      const t = dados.layers?.technology || {};
      const pol = dados.layers?.policy || {};
      const cnpqL = dados.layers?.cnpq || {};
      const idx = dados.indices || {};
      const totalPapers = k.total_papers || 0;
      const trl = t.trl_estimate || 1;
      const temPatentes = ((dados.layers?.patents?.patents || []).length || 0) > 0;
      const temContratos = (pol.contracts || []).length > 0;
      const temConvenios = (pol.convenios || []).length > 0;
      const saldoCaged = t.caged_data?.nacional?.total_saldo || 0;
      const temModalidadesBolsa = (cnpqL.modalidades || []).length > 0;
      const topInst = Object.entries(k.institutions || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map(([n]) => n);

      if (persona === "pesquisador") {
        const ops: any[] = [];
        if (totalPapers < 500) {
          ops.push({ emoji: "\u{1F331}", titulo: "Campo emergente — oportunidade de pioneirismo", descricao: `Apenas ${totalPapers} artigos foram publicados sobre este tema no Brasil. Isso indica baixa concorrência científica e alta chance de se tornar referência nacional rapidamente.`, acao: "Publique nos próximos 12 meses para ocupar posição de liderança", urgencia: "alta" });
        } else if (totalPapers > 5000) {
          ops.push({ emoji: "\u{1F50D}", titulo: "Campo saturado — busque o nicho", descricao: `Com ${totalPapers.toLocaleString("pt-BR")} artigos publicados, o tema central está competitivo. A estratégia mais eficiente é mapear sub-temas ainda pouco explorados dentro deste campo.`, acao: "Use os pesquisadores listados para identificar sub-temas emergentes", urgencia: "media" });
        }
        if (trl <= 4 && totalPapers > 100) {
          ops.push({ emoji: "\u{1F52C}", titulo: "Pesquisa madura sem aplicação industrial", descricao: `TRL ${trl} indica que há base científica sólida mas pouca industrialização. Isso cria oportunidade para pesquisa translacional — conectar ciência com empresa via contratos de parceria.`, acao: "Contate as ICTs listadas e proponha projeto de P&D aplicado", urgencia: "media" });
        }
        if (temModalidadesBolsa) {
          ops.push({ emoji: "\u{1F4B0}", titulo: "Bolsas de pesquisa disponíveis no CNPq", descricao: "Existem modalidades de bolsa CNPq ativas para este campo. A bolsa DTI-A conecta pesquisadores a empresas; a PQ é para produtividade em pesquisa; a Universal financia projetos sem vínculo empresarial.", acao: "Acesse o portal CNPq e verifique editais abertos para sua área", url: "https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/programas/programas-de-bolsas", urgencia: "baixa" });
        }
        const internacionalCount = (k.international || []).filter((c: any) => c.country_code !== "BR").length;
        if (internacionalCount < 3 && totalPapers > 50) {
          ops.push({ emoji: "\u{1F30D}", titulo: "Baixa colaboração internacional — oportunidade de destaque", descricao: "O tema tem poucos parceiros internacionais identificados. Pesquisadores com coautorias estrangeiras têm maior fator de impacto e acesso a editais bilaterais CNPq-CAPES.", acao: "Identifique grupos nos países líderes e proponha coautoria", urgencia: "baixa" });
        }
        return ops.slice(0, 3);
      }

      if (persona === "empresa") {
        const ops: any[] = [];
        if (trl >= 7) {
          ops.push({ emoji: "\u{1F680}", titulo: "Tecnologia madura — momento de adotar", descricao: `TRL ${trl} indica que a tecnologia já foi demonstrada em escala real. O risco de adoção é baixo. Empresas que entram agora ainda pegam a curva de crescimento antes da massificação.`, acao: "Avalie fornecedores e parceiros ICT para implementação nos próximos 6 meses", urgencia: "alta" });
        } else if (trl <= 4) {
          ops.push({ emoji: "\u{1F91D}", titulo: "Tecnologia em desenvolvimento — entre no P&D agora", descricao: `TRL ${trl} significa que a tecnologia ainda está sendo desenvolvida. Empresas que investem em P&D neste estágio via contratos com ICTs constroem vantagem competitiva e direito de preferência sobre resultados.`, acao: "Contrate uma ICT via Marco Legal CT&I para co-desenvolver a tecnologia", urgencia: "media" });
        }
        ops.push({ emoji: "\u{1F4B0}", titulo: "Lei do Bem — deduza até 80% dos custos de P&D", descricao: "Empresas no regime de Lucro Real que investem em pesquisa e desenvolvimento podem deduzir entre 60% e 80% desses gastos do Imposto de Renda. Em 2024, mais de 4.200 empresas usaram este benefício.", acao: "Use a calculadora abaixo para estimar sua dedução fiscal", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem", urgencia: "media" });
        if (temPatentes) {
          ops.push({ emoji: "\u{1F50F}", titulo: "Verifique patentes antes de investir", descricao: "Existem patentes identificadas neste campo. Antes de desenvolver ou lançar produto, mapeie quais tecnologias estão protegidas para evitar disputas de propriedade intelectual.", acao: "Consulte o INPI e o EPO para verificar o portfólio de patentes relevantes", url: "https://www.gov.br/inpi/pt-br", urgencia: "alta" });
        }
        return ops.slice(0, 3);
      }

      if (persona === "governo") {
        const ops: any[] = [];
        const gt = idx.gt?.value ?? 50;
        const ei = idx.ei?.value ?? 50;
        if (gt > 70) {
          ops.push({ emoji: "\u{1F3ED}", titulo: "Excesso de pesquisa sem industrialização — lacuna crítica", descricao: `O índice de tradução (${gt}/100) indica que há muito conhecimento científico sendo produzido, mas ele não está chegando ao mercado. Isso representa desperdício de investimento público em P&D.`, acao: "Crie programa de encomenda tecnológica para empresas âncora no setor", urgencia: "alta" });
        }
        if (ei < 40) {
          ops.push({ emoji: "\u{1F3AF}", titulo: "Instrumentos existentes com baixo impacto", descricao: `O índice de efetividade (${ei}/100) sugere que os instrumentos públicos atuais — editais, convênios, subvenções — estão gerando pouco resultado neste campo. É preciso revisar o desenho dos instrumentos.`, acao: "Realize avaliação de impacto dos convênios MCTI nos últimos 3 anos e redesenhe o instrumento", urgencia: "alta" });
        }
        if (temContratos) {
          ops.push({ emoji: "\u{1F4CB}", titulo: "Compras públicas como instrumento de política", descricao: "Há contratos públicos identificados neste tema. O governo pode usar poder de compra para estimular a produção nacional — encomendas tecnológicas criam mercado garantido e reduzem o risco do investimento privado em P&D.", acao: "Estruture edital de encomenda tecnológica com requisito de conteúdo nacional", urgencia: "media" });
        }
        if (saldoCaged < 0) {
          ops.push({ emoji: "\u{1F477}", titulo: "Mercado de trabalho retraindo — sinal de desinvestimento", descricao: "O saldo de empregos formais no setor está negativo. Isso pode indicar que empresas estão saindo do mercado ou reduzindo operações — um sinal precoce de que a política industrial precisa de atenção.", acao: "Acione SENAI e SESI para programa emergencial de requalificação profissional no setor", urgencia: "alta" });
        }
        return ops.slice(0, 3);
      }

      if (persona === "universidade") {
        const ops: any[] = [];
        if (topInst.length > 0) {
          ops.push({ emoji: "\u{1F3C6}", titulo: "Posicionamento no ranking nacional", descricao: "A análise de publicações identifica as instituições líderes neste campo. Saber onde você está no ranking é o primeiro passo para definir uma estratégia de nicho ou de disputa pela liderança.", acao: "Compare sua produção com a das 3 instituições líderes listadas na aba Produção Científica", urgencia: "media" });
        }
        ops.push({ emoji: "\u{1F4BB}", titulo: "Lei da Informática — fonte de P&D obrigatória para ICTs", descricao: "Empresas de TIC são obrigadas por lei a investir 5% do faturamento em P&D com ICTs credenciadas. Credenciar-se como ICT receptora da Lei da Informática abre um fluxo permanente de recursos privados para pesquisa.", acao: "Inicie o processo de credenciamento junto ao MCTI/SEPIN", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/sepin/lei-de-informatica", urgencia: "alta" });
        if (temConvenios) {
          ops.push({ emoji: "\u{1F4DD}", titulo: "Convênios com o MCTI disponíveis neste tema", descricao: "Existem convênios do Ministério de Ciência e Tecnologia relacionados a este campo. Esses instrumentos permitem que universidades recebam recursos federais para realizar projetos de pesquisa e extensão.", acao: "Contate o setor de convênios da sua pró-reitoria de pesquisa e verifique a elegibilidade", url: "https://portaltransparencia.gov.br/convenios", urgencia: "media" });
        }
        return ops.slice(0, 3);
      }

      return [];
    }

    const result = {
      query,
      layers: {
        knowledge: knowledge || { papers: [], total_papers: 0, institutions: {}, international: [], concepts: [], density: 0, concentration: 0, specialization: 0 },
        technology: technology || { github_repos: [], patent_datasets: [], employment_datasets: [], tech_density: 0, trl_estimate: 2, trl_label: "Sem dados" },
        policy: policy || { contracts: [], convenios: [], sanctions: [], gazettes: [], total_instrumental_value: 0, instrumental_intensity: 0, fiscal_capacity: {}, uf_distribution: {} },
        international: international || { country_distribution: {}, macro_indicators: [], ipeadata_series: [], comex_datasets: [], dependency_index: 0, br_share: 0, global_insertion: 0 },
        sidra: sidra || { pintec: null, cempre: null, pos_graduacao: null, pib_setorial: null, graduacao: null, sources: [] },
        market: market || { patents: { holders: [], available: false, reason: "Camada indisponível" }, market: { suppliers: [], available: false }, trade: { items: [], available: false }, opportunities: [], sources: [] },
        patents: patents || { available: false, patents: [], applicants: [], trend: [], br_share: null, trl_from_patents: null, sources: [] },
        programs: programs || { nova_industria: { disponivel: false }, pbia: { disponivel: false }, fomento: { disponivel: false }, context: {} },
        cnpq: cnpq || { datasets: [], chamadas: [], convenios: null, modalidades: [], sources: [] },
        policies: policies || { politicas: { federal: [], estadual_sp: [], municipal: [] }, gazettes_mencoes: [], editais_inovacao: [], sources: [] },


      },
      indices,
      persona_insights: personaInsights,
      stats,
      ontology: ontology
        ? {
            ncm_codes: ontology.ncm_codes || [],
            cnae_codes: ontology.cnae_codes || [],
            ipc_codes: ontology.ipc_codes || [],
            cnpq_areas: ontology.cnpq_areas || [],
            cbo_codes: ontology.cbo_codes || [],
            search_terms: ontology.search_terms || [],
            confidence: ontology.confidence ?? 0,
            available: true,
          }
        : { ncm_codes: [], cnae_codes: [], ipc_codes: [], cnpq_areas: [], search_terms: [query], confidence: 0, available: false },
      meta: {
        processing_time_ms: processingTime,
        sources: uniqueSources,
        source_count: uniqueSources.length,
        ontology_used: !!ontology,
      },
    };

    (result as any).oportunidades = gerarOportunidades(persona, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Motor search orchestrator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

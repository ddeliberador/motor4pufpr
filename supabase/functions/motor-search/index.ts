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
  const totalPapers = knowledge?.total_papers || 0;
  const totalContracts = policy?.total_contracts || 0;
  const totalConvenios = policy?.total_convenios || 0;
  const totalRepos = technology?.github_repos?.length || 0;

  // GT — Gap Tecnológico: knowledge × technology × policy
  const translationDenom = totalContracts + totalConvenios + totalRepos;
  const gt_value = translationDenom > 0
    ? Math.min(100, Math.round((totalPapers / translationDenom) * 10))
    : totalPapers > 0 ? 100 : 0;
  const gt_alert = gt_value > 70 ? "critical" : gt_value > 40 ? "warning" : "normal";

  // CD — Dependência Comercial: international (with knowledge context)
  const cd_value = international?.dependency_index || 0;
  const cd_alert = cd_value > 60 ? "critical" : cd_value > 40 ? "warning" : "normal";

  // AUE — Alinhamento U-E: knowledge × policy
  const institutionNames = Object.keys(knowledge?.institutions || {}).map((n: string) => n.toLowerCase());
  const contractOrgans = (policy?.contracts || []).map((c: any) => (c.organ || "").toLowerCase());
  const convenioProponents = (policy?.convenios || []).map((c: any) => (c.proponent || "").toLowerCase());
  const allInstrumental = [...contractOrgans, ...convenioProponents];
  let matchCount = 0;
  for (const inst of institutionNames) {
    if (allInstrumental.some((o: string) => o.includes(inst.slice(0, 15)) || inst.includes(o.slice(0, 15)))) {
      matchCount++;
    }
  }
  const aue_value = institutionNames.length > 0
    ? Math.round((matchCount / institutionNames.length) * 100)
    : 0;
  const aue_alert = aue_value < 20 ? "critical" : aue_value < 40 ? "warning" : "normal";

  // EI — Efetividade Instrumental: policy × knowledge
  const totalInstrumentalValue = policy?.total_instrumental_value || 0;
  const ei_value = translationDenom > 0 && totalInstrumentalValue > 0
    ? Math.min(100, Math.round(Math.log10(totalInstrumentalValue / translationDenom) * 20 + 50))
    : 0;
  const ei_alert = ei_value < 40 ? "critical" : ei_value < 60 ? "warning" : "normal";

  return {
    gt: {
      value: gt_value,
      label: "Gap Tecnológico",
      description: "Proporção ciência vs aplicação — quanto maior, mais ciência sem tradução prática",
      formula: "papers / (contratos + convênios + repos) × 10",
      layers_used: ["knowledge", "technology", "policy"],
      alert_level: gt_alert,
    },
    cd: {
      value: cd_value,
      label: "Dependência Externa",
      description: "% da produção científica fora do Brasil",
      formula: "(papers_estrangeiros / total_papers) × 100",
      layers_used: ["international", "knowledge"],
      alert_level: cd_alert,
    },
    aue: {
      value: aue_value,
      label: "Articulação U-E",
      description: "% de instituições científicas presentes também em contratos/convênios",
      formula: "(instituições_com_match / total_instituições) × 100",
      layers_used: ["knowledge", "policy"],
      alert_level: aue_alert,
    },
    ei: {
      value: ei_value,
      label: "Efetividade Instrumental",
      description: "Relação entre valor financeiro e volume de instrumentos públicos",
      formula: "log10(valor_total / qtd_instrumentos) × 20 + 50",
      layers_used: ["policy", "knowledge"],
      alert_level: ei_alert,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, selectedCnaes } = await req.json();
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

    // STEP 1: Knowledge layer first (other layers depend on it)
    const knowledge = await invokeLayer("layer-knowledge", { query, search_terms: searchTerms });

    // STEP 2: Remaining 3 layers in parallel, passing knowledge + ontology data
    const [technology, policy, international] = await Promise.all([
      invokeLayer("layer-technology", {
        query,
        knowledge_papers: knowledge?.papers?.length || 0,
        knowledge_total_papers: knowledge?.total_papers || 0,
        search_terms: searchTerms,
        ipc_codes: ipcCodes,
      }),
      invokeLayer("layer-policy", {
        query,
        knowledge_total_papers: knowledge?.total_papers || 0,
        search_terms: searchTerms,
        cnae_codes: cnaeCodes,
      }),
      invokeLayer("layer-international", {
        query,
        knowledge_international: knowledge?.international || [],
        knowledge_total_papers: knowledge?.total_papers || 0,
        ncm_codes: ncmCodes,
      }),
    ]);

    // STEP 3: Cross-layer indices
    const indices = computeCrossLayerIndices(knowledge, technology, policy, international);

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
    ];
    const uniqueSources = [...new Set(allSources)];

    const processingTime = Date.now() - start;

    const result = {
      query,
      layers: {
        knowledge: knowledge || { papers: [], total_papers: 0, institutions: {}, international: [], concepts: [], density: 0, concentration: 0, specialization: 0 },
        technology: technology || { github_repos: [], patent_datasets: [], employment_datasets: [], tech_density: 0, trl_estimate: 2, trl_label: "Sem dados" },
        policy: policy || { contracts: [], convenios: [], sanctions: [], gazettes: [], total_instrumental_value: 0, instrumental_intensity: 0, fiscal_capacity: {}, uf_distribution: {} },
        international: international || { country_distribution: {}, macro_indicators: [], ipeadata_series: [], comex_datasets: [], dependency_index: 0, br_share: 0, global_insertion: 0 },
      },
      indices,
      stats,
      meta: {
        processing_time_ms: processingTime,
        sources: uniqueSources,
        source_count: uniqueSources.length,
      },
    };

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

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

interface PersonaConfig {
  questions: string[];
  context: string;
  outputFocus: string;
}

const PERSONA_CONFIG: Record<string, PersonaConfig> = {
  pesquisador: {
    questions: [
      "Onde há bolsas e financiamento para pesquisa neste tema?",
      "Quem pesquisa isso no Brasil e no mundo?",
      "Onde estão as lacunas científicas e nichos de fronteira?",
    ],
    context: "pesquisador acadêmico brasileiro buscando oportunidades de pesquisa e publicação",
    outputFocus: "Mapa de saturação temática, cross entre publicações e ausência de patente, áreas com financiamento alto e produção baixa, nichos de fronteira. Entregas obrigatórias: 3 agendas estratégicas numeradas, 3 parceiros potenciais com justificativa, 3 fontes de financiamento com valores estimados.",
  },
  universidade: {
    questions: [
      "Onde estamos posicionados e como nos comparamos com outras instituições?",
      "Estamos convertendo pesquisa em inovação e captando recursos?",
      "Quais parcerias estratégicas são prioritárias agora?",
    ],
    context: "gestor universitário avaliando posicionamento institucional e estratégia de captação",
    outputFocus: "Índice de Conversão Estrutural (papers → patentes → contratos), áreas fortes e frágeis, heatmap de áreas emergentes, gap U-E. Entregas obrigatórias: Índice de Conversão calculado, 3 parcerias estratégicas com empresa ou órgão específico, 2 áreas para investir e 1 para desinvestir.",
  },
  empresa: {
    questions: [
      "Qual a maturidade tecnológica do campo e quem são os líderes?",
      "Que financiamento e incentivos públicos estão disponíveis?",
      "Quais universidades ou grupos de pesquisa podem resolver meu problema?",
    ],
    context: "empresário avaliando viabilidade de investimento em P&D e busca de parcerias",
    outputFocus: "TRL estimado com sinais concretos, matching empresa↔grupo de pesquisa, mapa de patentes por setor, risco de dependência externa. Entregas obrigatórias: TRL com justificativa por sinal, 3 parceiros acadêmicos com área de especialização, 3 instrumentos de apoio com links/valores, diagnóstico de make-or-buy.",
  },
  governo: {
    questions: [
      "Onde investir e qual região ou setor está mais atrasado?",
      "Qual o grau de dependência externa neste tema e os riscos estratégicos?",
      "Os instrumentos públicos existentes estão funcionando?",
    ],
    context: "formulador de política pública avaliando prioridades de investimento e efetividade de instrumentos",
    outputFocus: "Mapa de capacidades por território (UF), alertas de dependência externa crítica, diagnóstico de efetividade do gasto público, ranking de densidade inovativa por região. PRESCRITIVO obrigatório: para cada área identificada, dizer INVESTIR / REESTRUTURAR / CRIAR NOVO INSTRUMENTO / REDUZIR com justificativa nos dados.",
  },
};

async function callLovableGateway(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const res = await fetch(LOVABLE_GATEWAY, {
      method: "POST", signal: controller.signal,
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
        temperature: 0.15, max_tokens: 3000,
      }),
    });
    if (!res.ok) throw new Error(`Lovable Gateway ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropicAPI(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST", signal: controller.signal,
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text || "";
  } finally {
    clearTimeout(timer);
  }
}

function buildSystemPrompt(personaKey: string, pq: PersonaConfig, indices: any, layers: any, entityContext: any, searchData: any): string {
  let entityStr = "";
  if (entityContext?.entityName) {
    if (personaKey === "universidade") entityStr = `\nENTIDADE: "${entityContext.entityName}". Verifique se aparece nos dados e posicione em relação às demais.`;
    else if (personaKey === "empresa") entityStr = `\nENTIDADE: "${entityContext.entityName}". Situe no ecossistema: parceiros acadêmicos, concorrentes, instrumentos disponíveis.`;
    else if (personaKey === "governo") {
      const loc = entityContext.location || "";
      entityStr = `\nESCOPO: Governo ${entityContext.govLevel || "federal"}${loc ? ` — ${loc}` : ""}. Priorize dados de ${loc || "todo o Brasil"}.`;
    }
  }
  const gt = indices.gt || {}, cd = indices.cd || {}, aue = indices.aue || {}, ei = indices.ei || {};
  const k = layers.knowledge || {}, t = layers.technology || {}, p = layers.policy || {}, i = layers.international || {};

  return `Você é o Motor 4P — sistema de inteligência estratégica do sistema de inovação brasileiro.

PERSONA: ${pq.context}.${entityStr}
FOCO: ${pq.outputFocus}

━━━ ÍNDICES ESTRATÉGICOS CRUZADOS ━━━
• GT — Gap de Tradução: ${gt.value ?? "N/D"}/100 ${gt.alert_level === "critical" ? "🚨 CRÍTICO" : gt.alert_level === "warning" ? "⚠️ ALERTA" : "✓"}
  Fórmula: ${gt.formula || "papers / (contratos + convênios + repos) × 10"} | Camadas: ${gt.layers_used?.join(" × ") || "1×2×3"}
• CD — Dependência Externa: ${cd.value ?? "N/D"}% ${cd.alert_level === "critical" ? "🚨 CRÍTICO" : cd.alert_level === "warning" ? "⚠️ ALERTA" : "✓"} | Camadas: ${cd.layers_used?.join(" × ") || "4×1"}
• AUE — Articulação U-E: ${aue.value ?? "N/D"}% ${aue.alert_level === "critical" ? "🚨 CRÍTICO — baixíssima articulação" : aue.alert_level === "warning" ? "⚠️ ALERTA" : "✓"} | Camadas: ${aue.layers_used?.join(" × ") || "1×3"}
• EI — Efetividade Instrumental: ${ei.value ?? "N/D"}/100 ${ei.alert_level === "critical" ? "🚨 CRÍTICO" : ei.alert_level === "warning" ? "⚠️ ALERTA" : "✓"} | Camadas: ${ei.layers_used?.join(" × ") || "3×1"}

━━━ DADOS POR CAMADA ━━━
Camada 1 — Conhecimento: ${k.total_papers || 0} papers BR | densidade=${k.density || 0} | HHI=${k.concentration || 0} | especialização=${k.specialization || 0}%
  Conceitos: ${(k.concepts || []).slice(0, 5).map((c: any) => c.name).join(", ") || "n/d"}
  Instituições: ${Object.entries(k.institutions || {}).slice(0, 5).map(([n, v]) => `${n}(${v})`).join(", ") || "n/d"}
Camada 2 — Tecnologia: ${t.github_repos?.length || 0} repos | estrelas=${t.total_stars || 0} | TRL=${t.trl_estimate || "?"}(${t.trl_label || "?"})
  Linguagens: ${Object.entries(t.language_distribution || {}).slice(0, 4).map(([k, v]) => `${k}(${v})`).join(", ") || "n/d"}
Camada 3 — Política: ${p.total_contracts || 0} contratos(R$${((p.total_contract_value || 0) / 1e6).toFixed(1)}M) | ${p.total_convenios || 0} convênios(R$${((p.total_convenio_value || 0) / 1e6).toFixed(1)}M)
  UFs: ${JSON.stringify(p.uf_distribution || {})} | intensidade=${p.instrumental_intensity || 0}
Camada 4 — Internacional: dependência=${i.dependency_index || 0}% | share BR=${i.br_share || 0}% | inserção=${i.global_insertion || 0}% | países=${i.countries_with_coauthorship || 0}

Fontes: ${searchData.meta?.sources?.join(", ") || "múltiplas"}

━━━ ESTRUTURA DA RESPOSTA ━━━
## 1. ${pq.questions[0]}
[resposta]
## 2. ${pq.questions[1]}
[resposta]
## 3. ${pq.questions[2]}
[resposta]

REGRAS:
1. USE GT/CD/AUE/EI com valores concretos
2. CITE NÚMEROS dos dados (papers, contratos, repos, valores em R$)
3. CRUZE camadas — explique quando dado de uma camada ilumina outra
4. PRESCREVA — termine cada seção com 2-3 ações concretas numeradas
5. **negrito** para alertas e números-chave
6. GT>70 → alerte gap de tradução | CD>60 → dependência estratégica | AUE<20 → desarticulação U-E`;
}

function buildUserMessage(searchData: any, layers: any): string {
  const k = layers.knowledge || {}, t = layers.technology || {}, p = layers.policy || {}, i = layers.international || {};
  return `Análise para "${searchData.query}" — ${searchData.meta?.source_count || "múltiplas"} fontes:\n\n${JSON.stringify({
    query: searchData.query, stats: searchData.stats, indices: searchData.indices,
    top_papers: (k.papers || []).slice(0, 8).map((p: any) => ({ title: p.title, year: p.year, citations: p.citations, authors: p.authors?.slice(0, 2).map((a: any) => `${a.name}(${a.institution})`), journal: p.journal })),
    institutions: k.institutions, concepts: k.concepts?.slice(0, 10),
    github_repos: t.github_repos?.slice(0, 5).map((r: any) => ({ name: r.name, stars: r.stars, language: r.language })),
    trl: { estimate: t.trl_estimate, label: t.trl_label, signals: t.trl_signals },
    contracts: (p.contracts || []).slice(0, 6).map((c: any) => ({ object: c.object?.slice(0, 100), organ: c.organ, value: c.value, uf: c.uf })),
    convenios: (p.convenios || []).slice(0, 4),
    macro: (i.macro_indicators || []).filter((m: any) => m.value !== null).map((m: any) => ({ name: m.name, value: m.value, unit: m.unit, variation: m.variation })),
    countries: i.country_distribution,
  }, null, 0)}`;
}

function parseThreeSections(text: string): string[] {
  const idxs: number[] = [];
  for (const p of [/##\s*1\./, /##\s*2\./, /##\s*3\./]) {
    const m = text.match(p);
    if (m && m.index !== undefined) idxs.push(m.index);
  }
  if (idxs.length === 3) return [
    text.slice(idxs[0], idxs[1]).replace(/^##\s*1\.[^\n]*\n?/, "").trim(),
    text.slice(idxs[1], idxs[2]).replace(/^##\s*2\.[^\n]*\n?/, "").trim(),
    text.slice(idxs[2]).replace(/^##\s*3\.[^\n]*\n?/, "").trim(),
  ];
  return text.split(/\n##\s+/).filter(Boolean).slice(0, 3).map(s => s.replace(/^\d+\.\s*[^\n]*\n?/, "").trim());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { searchData, persona, entityContext } = await req.json();
    if (!searchData) return new Response(JSON.stringify({ error: "searchData is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!LOVABLE_API_KEY && !ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "Configure LOVABLE_API_KEY ou ANTHROPIC_API_KEY nos Secrets do Supabase." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const personaKey = persona || "pesquisador";
    const pq = PERSONA_CONFIG[personaKey] || PERSONA_CONFIG.pesquisador;
    const indices = searchData.indices || {};
    const layers = searchData.layers || {};

    const systemPrompt = buildSystemPrompt(personaKey, pq, indices, layers, entityContext, searchData);
    const userMessage = buildUserMessage(searchData, layers);

    console.log(`Motor analysis: "${searchData.query}" | persona=${personaKey} | GT=${indices.gt?.value} | CD=${indices.cd?.value}`);

    let analysisText = "";
    let providerUsed = "";

    if (LOVABLE_API_KEY) {
      try { analysisText = await callLovableGateway(systemPrompt, userMessage, LOVABLE_API_KEY); providerUsed = "lovable"; }
      catch (e) { console.warn("Lovable falhou, tentando Anthropic:", e instanceof Error ? e.message : e); }
    }

    if (!analysisText && ANTHROPIC_API_KEY) {
      try { analysisText = await callAnthropicAPI(systemPrompt, userMessage, ANTHROPIC_API_KEY); providerUsed = "anthropic"; }
      catch (e) { throw new Error("Ambos os provedores falharam: " + (e instanceof Error ? e.message : e)); }
    }

    if (!analysisText) throw new Error("Nenhuma resposta gerada.");

    return new Response(JSON.stringify({
      analysis: analysisText, sections: parseThreeSections(analysisText),
      questions: pq.questions, persona: personaKey, provider: providerUsed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Motor analysis error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

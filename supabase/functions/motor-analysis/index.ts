import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface PersonaQuestions {
  questions: string[];
  context: string;
  outputFocus: string;
}

const PERSONA_QUESTIONS: Record<string, PersonaQuestions> = {
  pesquisador: {
    questions: [
      "Onde há bolsas e financiamento para pesquisa neste tema?",
      "Quem pesquisa isso no Brasil e no mundo?",
      "Onde estão as lacunas científicas e nichos de fronteira?",
    ],
    context: "pesquisador acadêmico brasileiro buscando oportunidades de pesquisa e publicação",
    outputFocus: "Mapa de saturação temática, cross entre publicações e ausência de patente, áreas com financiamento alto e produção baixa, nichos de fronteira. Entregas: 3 agendas estratégicas, 3 parceiros potenciais, 3 fontes de financiamento.",
  },
  universidade: {
    questions: [
      "Onde estamos posicionados e como nos comparamos?",
      "Estamos captando recursos e convertendo pesquisa em inovação?",
      "Quais parcerias estratégicas são possíveis?",
    ],
    context: "gestor universitário avaliando posicionamento institucional",
    outputFocus: "Índice de Conversão Estrutural, áreas fortes e frágeis, heatmap de áreas emergentes, empresas da região com baixa interação U-E. Entregas: Índice de Conversão, 3 parcerias estratégicas sugeridas.",
  },
  empresa: {
    questions: [
      "Qual a maturidade tecnológica e quem lidera?",
      "Qual financiamento e incentivo está disponível?",
      "Quem resolve meu problema? Onde tem tecnologia aplicável?",
    ],
    context: "empresário avaliando viabilidade e concorrência",
    outputFocus: "Matching empresa↔grupo de pesquisa, TRL estimado, patentes disponíveis por setor, universidades com histórico de cooperação. Entregas: 3 parceiros acadêmicos, 3 instrumentos disponíveis, diagnóstico de dependência externa.",
  },
  governo: {
    questions: [
      "Onde investir e qual região está atrasada?",
      "Estamos dependentes do exterior neste tema?",
      "Os instrumentos públicos estão funcionando?",
    ],
    context: "formulador de política pública avaliando investimentos e efetividade",
    outputFocus: "Mapa de capacidades por território, lacunas tecnológicas, alertas de dependência externa, ranking de densidade inovativa. PRESCRITIVO: Investir / Reestruturar / Criar novo instrumento / Reduzir. Setores críticos e alavancas prioritárias.",
  },
};

// Tenta Lovable Gateway primeiro, depois Anthropic como fallback
async function callAI(systemPrompt: string, userContent: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  // Tentativa 1: Lovable Gateway
  if (LOVABLE_API_KEY) {
    try {
      const res = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: 0.15,
          max_tokens: 3000,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      } else if (res.status === 429) {
        throw new Error("Rate limit exceeded");
      } else if (res.status === 402) {
        throw new Error("Créditos esgotados");
      }
      console.warn("Lovable Gateway failed, trying fallback...");
    } catch (err) {
      // Re-throw rate limit / credits errors
      if (err instanceof Error && (err.message === "Rate limit exceeded" || err.message === "Créditos esgotados")) {
        throw err;
      }
      console.warn("Lovable Gateway error:", err);
    }
  }

  // Tentativa 2: Anthropic API (fallback)
  if (ANTHROPIC_API_KEY) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
          temperature: 0.15,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text;
        if (text) return text;
      }
      console.warn("Anthropic fallback also failed:", res.status);
    } catch (err) {
      console.warn("Anthropic fallback error:", err);
    }
  }

  if (!LOVABLE_API_KEY && !ANTHROPIC_API_KEY) {
    throw new Error("AI not configured — configure LOVABLE_API_KEY ou ANTHROPIC_API_KEY");
  }

  throw new Error("Erro na análise — ambos provedores falharam");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchData, persona, entityContext } = await req.json();
    if (!searchData) {
      return new Response(JSON.stringify({ error: "searchData is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const personaKey = persona || "pesquisador";
    const pq = PERSONA_QUESTIONS[personaKey] || PERSONA_QUESTIONS.pesquisador;
    const indices = searchData.indices || {};
    const layers = searchData.layers || {};

    // Build entity context string for personalized analysis
    let entityStr = "";
    if (entityContext?.entityName) {
      if (personaKey === "universidade") {
        entityStr = `\nENTIDADE: A universidade "${entityContext.entityName}". POSICIONE esta universidade em relação às demais instituições nos dados. Identifique se ela aparece nos papers, contratos ou convênios. Compare seu posicionamento relativo.`;
      } else if (personaKey === "empresa") {
        entityStr = `\nENTIDADE: A empresa "${entityContext.entityName}". SITUE esta empresa no ecossistema de inovação. Identifique parceiros acadêmicos potenciais, concorrentes, e instrumentos públicos relevantes para ela.`;
      } else if (personaKey === "governo") {
        const level = entityContext.govLevel || "federal";
        const loc = entityContext.location || "";
        entityStr = `\nENTIDADE: Governo ${level}${loc ? ` — ${loc}` : ""}. FOQUE a análise na perspectiva deste ente federativo. Priorize dados territoriais relevantes para ${loc || "o Brasil"}, identifique lacunas regionais e instrumentos disponíveis nesta esfera.`;
      }
    }

    const systemPrompt = `Você é o Motor 4P — analista estratégico PRESCRITIVO de inovação.

CONTEXTO: ${pq.context}.${entityStr}
FOCO DE OUTPUT: ${pq.outputFocus}

ÍNDICES CRUZADOS (calculados cruzando múltiplas camadas):
- GT (Gargalo de Tradução): ${indices.gt?.value ?? "N/A"}/100 — ${indices.gt?.description || ""} [Camadas: ${indices.gt?.layers_used?.join(", ") || "?"}] ${indices.gt?.alert_level === "critical" ? "🚨 CRÍTICO" : indices.gt?.alert_level === "warning" ? "⚠️ ALERTA" : ""}
- CD (Dependência Externa): ${indices.cd?.value ?? "N/A"}% — ${indices.cd?.description || ""} [Camadas: ${indices.cd?.layers_used?.join(", ") || "?"}]  ${indices.cd?.alert_level === "critical" ? "🚨 CRÍTICO" : indices.cd?.alert_level === "warning" ? "⚠️ ALERTA" : ""}
- AUE (Articulação U-E): ${indices.aue?.value ?? "N/A"}% — ${indices.aue?.description || ""} [Camadas: ${indices.aue?.layers_used?.join(", ") || "?"}] ${indices.aue?.alert_level === "critical" ? "🚨 CRÍTICO" : indices.aue?.alert_level === "warning" ? "⚠️ ALERTA" : ""}
- EI (Efetividade Instrumental): ${indices.ei?.value ?? "N/A"}/100 — ${indices.ei?.description || ""} [Camadas: ${indices.ei?.layers_used?.join(", ") || "?"}] ${indices.ei?.alert_level === "critical" ? "🚨 CRÍTICO" : indices.ei?.alert_level === "warning" ? "⚠️ ALERTA" : ""}
- Distribuição UF: ${JSON.stringify(layers.policy?.uf_distribution || {})}

DADOS POR CAMADA:
- Camada 1 (Conhecimento): ${layers.knowledge?.total_papers || 0} papers BR, ${layers.knowledge?.total_papers_global || "?"} papers globais, densidade=${layers.knowledge?.density || 0}, concentração=${layers.knowledge?.concentration || 0}, especialização=${layers.knowledge?.specialization || 0}
- Camada 2 (Tecnologia): ${layers.technology?.github_repos?.length || 0} repos, TRL=${layers.technology?.trl_estimate || "?"} (${layers.technology?.trl_label || "?"}), densidade_tech=${layers.technology?.tech_density || 0}, stars=${layers.technology?.total_stars || 0}
- Camada 3 (Política): ${layers.policy?.total_contracts || 0} contratos (R$ ${((layers.policy?.total_contract_value || 0) / 1e6).toFixed(1)}M), ${layers.policy?.total_convenios || 0} convênios (R$ ${((layers.policy?.total_convenio_value || 0) / 1e6).toFixed(1)}M), intensidade=${layers.policy?.instrumental_intensity || 0}, efetividade=${layers.policy?.spending_effectiveness || 0}
- Camada 4 (Internacional): dependência=${layers.international?.dependency_index || 0}%, share BR=${layers.international?.br_share || 0}%, inserção global=${layers.international?.global_insertion || 0}%, ${layers.international?.countries_with_coauthorship || 0} países com coautoria

Fontes: ${searchData.meta?.sources?.join(", ") || "diversas"} (${searchData.meta?.source_count || "?"} fontes).

ESTRUTURA — Responda EXATAMENTE estas 3 questões:
## 1. ${pq.questions[0]}
## 2. ${pq.questions[1]}
## 3. ${pq.questions[2]}

REGRAS INVIOLÁVEIS:
1. Cada resposta DEVE referenciar os ÍNDICES CRUZADOS e explicar DE QUAIS CAMADAS vem o cálculo
2. Cada resposta DEVE citar FONTES ESPECÍFICAS com NÚMEROS
3. Cada resposta DEVE ter CRUZAMENTOS entre camadas (ex: "GT de ${indices.gt?.value || "?"} cruza Camada 1 (${layers.knowledge?.total_papers || 0} papers) com Camada 3 (${layers.policy?.total_contracts || 0} contratos)")
4. NUNCA descreva — PRESCREVA: termine cada seção com 2-3 AÇÕES CONCRETAS numeradas
5. Use **negrito** para números e alertas críticos
6. Se GT > 70: ALERTE sobre gap de tradução
7. Se CD > 60: ALERTE sobre dependência externa
8. Se AUE < 20: ALERTE sobre desarticulação universidade-empresa`;

    const dataSummary = JSON.stringify({
      query: searchData.query,
      stats: searchData.stats,
      indices: searchData.indices,
      knowledge_top10: (layers.knowledge?.papers || []).slice(0, 10).map((p: any) => ({
        title: p.title, year: p.year, citations: p.citations,
        authors: p.authors?.slice(0, 2), journal: p.journal,
      })),
      knowledge_institutions: layers.knowledge?.institutions,
      knowledge_concepts: layers.knowledge?.concepts?.slice(0, 10),
      knowledge_resolved: layers.knowledge?.resolved_institutions,
      technology_repos: layers.technology?.github_repos?.slice(0, 5),
      technology_trl: { estimate: layers.technology?.trl_estimate, label: layers.technology?.trl_label, signals: layers.technology?.trl_signals },
      technology_languages: layers.technology?.language_distribution,
      policy_contracts: (layers.policy?.contracts || []).slice(0, 8).map((c: any) => ({
        object: c.object?.slice(0, 120), organ: c.organ, value: c.value, uf: c.uf,
      })),
      policy_convenios: (layers.policy?.convenios || []).slice(0, 5),
      policy_sanctions: (layers.policy?.sanctions || []).slice(0, 3),
      policy_gazettes_count: layers.policy?.gazettes?.length || 0,
      international_macro: (layers.international?.macro_indicators || []).map((m: any) => ({
        name: m.name, value: m.value, unit: m.unit, variation: m.variation,
      })),
      international_countries: layers.international?.country_distribution,
      international_ipeadata_count: layers.international?.ipeadata_series?.length || 0,
    }, null, 0);

    console.log(`Motor analysis: ${searchData.query} (persona: ${personaKey}, GT=${indices.gt?.value}, CD=${indices.cd?.value})`);

    const analysisText = await callAI(systemPrompt, `Dados de ${searchData.meta?.source_count || "múltiplas"} bases sobre "${searchData.query}":\n\n${dataSummary}`);

    const sections = parseThreeSections(analysisText, pq.questions);

    return new Response(JSON.stringify({
      analysis: analysisText,
      sections,
      questions: pq.questions,
      persona: personaKey,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Motor analysis error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Rate limit") ? 429 : message.includes("Créditos") ? 402 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseThreeSections(text: string, questions: string[]): string[] {
  const sections: string[] = [];
  const patterns = [/##\s*1\./, /##\s*2\./, /##\s*3\./];
  const indices: number[] = [];
  for (const p of patterns) {
    const match = text.match(p);
    if (match && match.index !== undefined) indices.push(match.index);
  }
  if (indices.length === 3) {
    sections.push(text.slice(indices[0], indices[1]).replace(/^##\s*1\.[^\n]*\n?/, "").trim());
    sections.push(text.slice(indices[1], indices[2]).replace(/^##\s*2\.[^\n]*\n?/, "").trim());
    sections.push(text.slice(indices[2]).replace(/^##\s*3\.[^\n]*\n?/, "").trim());
  } else {
    const parts = text.split(/\n##\s+/).filter(Boolean);
    for (let i = 0; i < 3; i++) {
      const part = parts[i] || "";
      sections.push(part.replace(/^\d+\.\s*[^\n]*\n?/, "").trim());
    }
  }
  return sections;
}

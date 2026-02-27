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
    outputFocus: "Mapa de saturação temática, cross entre publicações e ausência de patente, áreas com financiamento alto e produção baixa, nichos de fronteira.",
  },
  universidade: {
    questions: [
      "Onde estamos posicionados e como nos comparamos?",
      "Estamos captando recursos e convertendo pesquisa em inovação?",
      "Quais parcerias estratégicas são possíveis?",
    ],
    context: "gestor universitário avaliando posicionamento institucional",
    outputFocus: "Heatmap de áreas emergentes, empresas da região com baixa interação U-E, patentes sem exploração, índice de conversão pesquisa→inovação.",
  },
  empresa: {
    questions: [
      "Qual a maturidade tecnológica e quem lidera?",
      "Qual financiamento e incentivo está disponível?",
      "Quem resolve meu problema? Onde tem tecnologia aplicável?",
    ],
    context: "empresário avaliando viabilidade e concorrência",
    outputFocus: "Matching empresa↔grupo de pesquisa, patentes disponíveis por setor, universidades com histórico de cooperação, projetos públicos com possibilidade de parceria.",
  },
  governo: {
    questions: [
      "Onde investir e qual região está atrasada?",
      "Estamos dependentes do exterior neste tema?",
      "Os instrumentos públicos estão funcionando?",
    ],
    context: "formulador de política pública avaliando investimentos e efetividade",
    outputFocus: "Mapa de capacidades por território, lacunas tecnológicas (setor com papers mas zero contrato), alertas de dependência externa, ranking de densidade inovativa. PRESCRITIVO: diga O QUE FAZER, não apenas o que existe.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchData, persona } = await req.json();
    if (!searchData) {
      return new Response(JSON.stringify({ error: "searchData is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const personaKey = persona || "pesquisador";
    const pq = PERSONA_QUESTIONS[personaKey] || PERSONA_QUESTIONS.pesquisador;
    const indices = searchData.strategic_indices || {};

    const systemPrompt = `Você é o Motor 4P — analista estratégico PRESCRITIVO de inovação.

CONTEXTO: ${pq.context}.
FOCO DE OUTPUT: ${pq.outputFocus}

ÍNDICES COMPUTADOS (já calculados dos dados reais):
- Gargalo de Tradução (GT): ${indices.gt?.value ?? "N/A"}/100 — ${indices.gt?.description || ""}
- Dependência Externa (CD): ${indices.cd?.value ?? "N/A"}% — ${indices.cd?.description || ""}
- Articulação U-E (AUE): ${indices.aue?.value ?? "N/A"}% — ${indices.aue?.description || ""}
- Efetividade Instrumental (EI): ${indices.ei?.value ?? "N/A"}/100 — ${indices.ei?.description || ""}
- Distribuição UF: ${JSON.stringify(indices.uf_distribution || {})}

Fontes: ${searchData.meta?.sources?.join(", ") || "diversas"}.

ESTRUTURA — Responda EXATAMENTE estas 3 questões:
## 1. ${pq.questions[0]}
## 2. ${pq.questions[1]}
## 3. ${pq.questions[2]}

REGRAS INVIOLÁVEIS:
1. Cada resposta DEVE referenciar os ÍNDICES COMPUTADOS acima e explicar o que significam
2. Cada resposta DEVE citar FONTES ESPECÍFICAS com NÚMEROS (ex: "OpenAlex: ${searchData.stats?.papers || 0} papers")
3. Cada resposta DEVE ter CRUZAMENTOS (ex: "GT de ${indices.gt?.value || "?"} indica muita ciência mas pouca aplicação — ${searchData.stats?.contracts || 0} contratos vs ${searchData.stats?.papers || 0} papers")
4. NUNCA descreva — PRESCREVA: termine cada seção com 2-3 AÇÕES CONCRETAS numeradas
5. Use **negrito** para números e alertas críticos
6. Se GT > 70: ALERTE sobre gap de tradução
7. Se CD > 60: ALERTE sobre dependência externa
8. Se AUE < 20: ALERTE sobre desarticulação universidade-empresa`;

    const dataSummary = JSON.stringify({
      query: searchData.query,
      stats: searchData.stats,
      strategic_indices: searchData.strategic_indices,
      papers_top10: (searchData.scientific?.papers || []).slice(0, 10).map((p: any) => ({
        title: p.title, year: p.year, citations: p.citations,
        authors: p.authors?.slice(0, 2), journal: p.journal,
      })),
      institutions_ranking: searchData.scientific?.by_institution,
      international_comparison: searchData.scientific?.international?.slice(0, 10),
      github_repos: searchData.technological?.github_repos?.slice(0, 5),
      macro_indicators: (searchData.productive?.macro_indicators || []).map((m: any) => ({
        name: m.name, value: m.value, unit: m.unit, variation: m.variation,
      })),
      contracts_top8: (searchData.institutional?.public_contracts || []).slice(0, 8).map((c: any) => ({
        object: c.object?.slice(0, 120), organ: c.organ, value: c.value, uf: c.uf,
      })),
      convenios: searchData.institutional?.transparencia?.convenios?.slice(0, 5),
      sanctions: searchData.institutional?.transparencia?.sanctions?.slice(0, 3),
      open_datasets: (searchData.institutional?.open_datasets || []).slice(0, 5).map((d: any) => ({
        title: d.title, organization: d.organization,
      })),
    }, null, 0);

    console.log(`Motor analysis: ${searchData.query} (persona: ${personaKey}, GT=${indices.gt?.value}, CD=${indices.cd?.value})`);

    const aiResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dados de ${searchData.meta?.source_count || "múltiplas"} bases sobre "${searchData.query}":\n\n${dataSummary}` },
        ],
        temperature: 0.15,
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Erro na análise" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices?.[0]?.message?.content || "";
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

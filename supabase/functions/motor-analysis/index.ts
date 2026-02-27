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
}

const PERSONA_QUESTIONS: Record<string, PersonaQuestions> = {
  pesquisador: {
    questions: [
      "Onde há bolsas e financiamento para pesquisa neste tema?",
      "Quem pesquisa isso no Brasil e no mundo?",
      "Onde publicar e quem já patenteou?",
    ],
    context: "pesquisador acadêmico brasileiro buscando oportunidades de pesquisa, colaboração e publicação",
  },
  universidade: {
    questions: [
      "Onde estamos posicionados e como nos comparamos?",
      "Estamos captando recursos e patenteando neste tema?",
      "Quais parcerias estratégicas são possíveis?",
    ],
    context: "gestor universitário avaliando posicionamento institucional, captação de recursos e parcerias",
  },
  empresa: {
    questions: [
      "Qual a maturidade tecnológica e quem lidera?",
      "Qual financiamento e incentivo está disponível?",
      "Quais os riscos e oportunidades de mercado?",
    ],
    context: "empresário/empreendedor avaliando viabilidade, concorrência e oportunidades de mercado",
  },
  governo: {
    questions: [
      "Onde investir e qual região está atrasada?",
      "Estamos dependentes do exterior neste tema?",
      "Os instrumentos públicos estão funcionando?",
    ],
    context: "formulador de política pública avaliando investimentos, lacunas regionais e efetividade de políticas",
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

    const systemPrompt = `Você é o Motor 4P — analista estratégico de inovação que cruza dados de 21+ bases públicas brasileiras.

CONTEXTO: Você está respondendo para um ${pq.context}.

A busca retornou dados REAIS das seguintes bases: ${searchData.meta?.sources?.join(", ") || "diversas"}.

ESTRUTURA OBRIGATÓRIA — Responda EXATAMENTE estas 3 questões, cada uma como seção:

## 1. ${pq.questions[0]}
## 2. ${pq.questions[1]}
## 3. ${pq.questions[2]}

REGRAS:
1. Cada resposta DEVE citar FONTES ESPECÍFICAS (ex: "OpenAlex mostra...", "No PNCP há...", "BCB indica...")
2. Cada resposta DEVE conter NÚMEROS CONCRETOS dos dados fornecidos
3. NUNCA invente dados — use APENAS o JSON abaixo
4. Priorize CRUZAMENTOS entre fontes (ex: "Há X papers mas apenas Y licitações — gap de tradução")
5. Seja DIRETO e OBJETIVO — zero enrolação, zero introduções genéricas
6. Termine cada seção com 1-2 AÇÕES CONCRETAS que o usuário pode tomar agora
7. Use negrito para destacar números e nomes importantes`;

    // Build data summary
    const dataSummary = JSON.stringify({
      query: searchData.query,
      stats: searchData.stats,
      meta: searchData.meta,
      papers_top10: (searchData.scientific?.papers || []).slice(0, 10).map((p: any) => ({
        title: p.title, year: p.year, citations: p.citations,
        authors: p.authors?.slice(0, 2), journal: p.journal, concepts: p.concepts,
      })),
      institutions_ranking: searchData.scientific?.by_institution,
      international_comparison: searchData.scientific?.international?.slice(0, 10),
      capes_datasets: searchData.scientific?.capes_datasets?.slice(0, 3),
      github_repos: searchData.technological?.github_repos?.slice(0, 5),
      macro_indicators: (searchData.productive?.macro_indicators || []).map((m: any) => ({
        name: m.name, value: m.value, unit: m.unit, variation: m.variation,
      })),
      ipeadata_series: (searchData.productive?.ipeadata_series || []).slice(0, 6).map((s: any) => ({
        name: s.name, lastValue: s.lastValue, theme: s.theme,
      })),
      aneel_datasets: searchData.productive?.aneel_datasets?.slice(0, 3),
      cvm_datasets: searchData.productive?.cvm_datasets?.slice(0, 3),
      contracts_top8: (searchData.institutional?.public_contracts || []).slice(0, 8).map((c: any) => ({
        object: c.object?.slice(0, 120), organ: c.organ, value: c.value, uf: c.uf, date: c.date,
      })),
      convenios: searchData.institutional?.transparencia?.convenios?.slice(0, 5),
      sanctions: searchData.institutional?.transparencia?.sanctions?.slice(0, 3),
      gazettes_sample: (searchData.institutional?.official_gazettes || []).slice(0, 3).map((g: any) => ({
        territory: g.territory, state: g.state, date: g.date,
      })),
      open_datasets: (searchData.institutional?.open_datasets || []).slice(0, 5).map((d: any) => ({
        title: d.title, organization: d.organization,
      })),
      tcu_datasets: searchData.institutional?.tcu_datasets?.slice(0, 3),
      ibama_datasets: searchData.institutional?.ibama_datasets?.slice(0, 3),
    }, null, 0);

    console.log(`Motor analysis for: ${searchData.query} (persona: ${personaKey}, sources: ${searchData.meta?.source_count})`);

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
          { role: "user", content: `Dados brutos de ${searchData.meta?.source_count || "múltiplas"} bases públicas sobre "${searchData.query}":\n\n${dataSummary}` },
        ],
        temperature: 0.2,
        max_tokens: 2500,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Erro na análise de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices?.[0]?.message?.content || "";

    // Parse the 3 sections from the response
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
  // Try to split by ## 1., ## 2., ## 3.
  const sections: string[] = [];
  const patterns = [
    /##\s*1\./,
    /##\s*2\./,
    /##\s*3\./,
  ];

  const indices: number[] = [];
  for (const p of patterns) {
    const match = text.match(p);
    if (match && match.index !== undefined) {
      indices.push(match.index);
    }
  }

  if (indices.length === 3) {
    sections.push(text.slice(indices[0], indices[1]).replace(/^##\s*1\.[^\n]*\n?/, "").trim());
    sections.push(text.slice(indices[1], indices[2]).replace(/^##\s*2\.[^\n]*\n?/, "").trim());
    sections.push(text.slice(indices[2]).replace(/^##\s*3\.[^\n]*\n?/, "").trim());
  } else {
    // Fallback: split by any ## headers
    const parts = text.split(/\n##\s+/).filter(Boolean);
    for (let i = 0; i < 3; i++) {
      const part = parts[i] || "";
      sections.push(part.replace(/^\d+\.\s*[^\n]*\n?/, "").trim());
    }
  }

  return sections;
}

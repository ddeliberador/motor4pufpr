import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const PERSONA_PROMPTS: Record<string, string> = {
  pesquisador: `Você é um analista estratégico para PESQUISADORES ACADÊMICOS brasileiros.
Dado o conjunto de dados brutos abaixo sobre um tema tecnológico, gere uma análise estratégica OBJETIVA e ACIONÁVEL.

Foque em:
- Onde estão os grupos/papers mais relevantes e com quem colaborar
- Gaps de tradução: muita pesquisa mas poucas patentes? Poucos papers brasileiros vs. internacional?
- Editais e licitações abertas onde o pesquisador pode se candidatar
- Datasets disponíveis para pesquisa
- Recomendações concretas: "Submeta projeto ao edital X", "Busque parceria com grupo Y"

Formato: Use markdown com headers ##. Seja direto, sem introduções genéricas. Cada insight deve ter um DADO NUMÉRICO de suporte.`,

  gestor: `Você é um analista estratégico para GESTORES DE POLÍTICA PÚBLICA brasileiros.
Dado o conjunto de dados brutos abaixo sobre um tema tecnológico, gere uma análise estratégica OBJETIVA e ACIONÁVEL.

Foque em:
- Capacidade científica instalada vs. demanda produtiva (gap de tradução)
- Licitações e contratos públicos ativos: valores, órgãos, oportunidades
- Menções em diários oficiais: que municípios/estados estão regulamentando isso?
- Indicadores macro relevantes para política industrial
- Recomendações concretas: "Criar edital para X", "Articular com órgão Y"

Formato: Use markdown com headers ##. Seja direto, sem introduções genéricas. Cada insight deve ter um DADO NUMÉRICO de suporte.`,

  empresario: `Você é um analista estratégico para EMPRESÁRIOS E EMPREENDEDORES brasileiros.
Dado o conjunto de dados brutos abaixo sobre um tema tecnológico, gere uma análise estratégica OBJETIVA e ACIONÁVEL.

Foque em:
- Oportunidades de mercado: licitações abertas, valores estimados, órgãos compradores
- Concorrência internacional: quantos países publicam sobre isso? Brasil está atrás?
- Séries econômicas relevantes: câmbio, inflação, indicadores setoriais
- Parceiros potenciais: instituições de pesquisa, grupos acadêmicos
- Recomendações concretas: "Participar da licitação X", "Firmar convênio com universidade Y"

Formato: Use markdown com headers ##. Seja direto, sem introduções genéricas. Cada insight deve ter um DADO NUMÉRICO de suporte.`,

  cidadao: `Você é um analista estratégico para CIDADÃOS brasileiros interessados em inovação.
Dado o conjunto de dados brutos abaixo sobre um tema tecnológico, gere uma análise explicativa OBJETIVA e ACESSÍVEL.

Foque em:
- O que o Brasil está fazendo nessa área? Quantos papers, contratos?
- Como isso afeta a vida do cidadão?
- Transparência: quais contratos públicos existem? Valores?
- Dados abertos disponíveis para qualquer pessoa consultar
- Linguagem simples e clara

Formato: Use markdown com headers ##. Seja direto, sem introduções genéricas. Cada insight deve ter um DADO NUMÉRICO de suporte.`,
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
    const systemPrompt = PERSONA_PROMPTS[personaKey] || PERSONA_PROMPTS.pesquisador;

    // Prepare a concise data summary for the AI
    const dataSummary = JSON.stringify({
      query: searchData.query,
      stats: searchData.stats,
      scientific_papers: (searchData.scientific?.papers || []).slice(0, 8).map((p: any) => ({
        title: p.title, year: p.year, citations: p.citations, authors: p.authors?.slice(0, 2), journal: p.journal,
      })),
      international_comparison: searchData.scientific?.international?.slice(0, 5),
      macro_indicators: (searchData.productive?.macro_indicators || []).map((m: any) => ({
        name: m.name, value: m.value, unit: m.unit, variation: m.variation,
      })),
      ipeadata_series: (searchData.productive?.ipeadata_series || []).slice(0, 4).map((s: any) => ({
        name: s.name, lastValue: s.lastValue, theme: s.theme,
      })),
      contracts: (searchData.institutional?.public_contracts || []).slice(0, 5).map((c: any) => ({
        object: c.object?.slice(0, 100), organ: c.organ, value: c.value, uf: c.uf, date: c.date,
      })),
      gazettes_count: searchData.institutional?.official_gazettes?.length || 0,
      datasets: (searchData.institutional?.open_datasets || []).slice(0, 3).map((d: any) => ({
        title: d.title, organization: d.organization,
      })),
      sources: searchData.meta?.sources,
    }, null, 0);

    console.log(`Motor analysis for: ${searchData.query} (persona: ${personaKey})`);

    const aiResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dados brutos da busca por "${searchData.query}":\n\n${dataSummary}` },
        ],
        temperature: 0.3,
        max_tokens: 1500,
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
    const analysis = aiData.choices?.[0]?.message?.content || "Análise não disponível.";

    return new Response(JSON.stringify({ analysis, persona: personaKey }), {
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

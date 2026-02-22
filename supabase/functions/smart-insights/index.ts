import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, searchData, persona, selectedCnaes } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um motor de recomendação para o Sistema Nacional de Inovação brasileiro. Analise os dados fornecidos e gere insights acionáveis.

IMPORTANTE: Responda EXCLUSIVAMENTE com um JSON válido no formato abaixo, sem markdown, sem explicações, apenas o JSON:
{
  "insights": [
    {
      "type": "opportunity" | "warning" | "match" | "trend",
      "title": "título curto e direto",
      "description": "descrição em 1-2 frases com dados concretos",
      "score": 0.0-1.0,
      "source": "fonte do dado"
    }
  ]
}

Tipos de insight:
- "opportunity": oportunidade identificada (bolsa, financiamento, parceria)
- "warning": alerta ou gargalo (concentração, dependência, lacuna)
- "match": match entre camadas (grupo + instrumento, pesquisador + empresa)
- "trend": tendência identificada nos dados

Gere entre 4 e 8 insights. Priorize insights relevantes para a persona: ${persona}.
Para pesquisador: foco em bolsas, grupos complementares, tendências de publicação.
Para universidade: foco em captação, posicionamento, parcerias estratégicas.
Para empresa: foco em maturidade tecnológica, concorrência, financiamento.
Para governo: foco em lacunas regionais, efetividade de instrumentos, dependência.`;

    const userPrompt = buildInsightPrompt(query, searchData, selectedCnaes);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit excedido" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    // Parse JSON from response, handling markdown code blocks
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { insights: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("smart-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildInsightPrompt(
  query: string,
  searchData: Record<string, any> | undefined,
  selectedCnaes: Array<{ code: string; description: string }> | undefined
): string {
  let prompt = `Objeto tecnológico: "${query}"\n\n`;
  
  if (selectedCnaes?.length) {
    prompt += `CNAEs: ${selectedCnaes.map(c => `${c.code} - ${c.description}`).join("; ")}\n\n`;
  }

  if (searchData) {
    if (searchData.stats) {
      prompt += `Stats: ${searchData.stats.groups} grupos, ${searchData.stats.patents} patentes, ${searchData.stats.instruments} instrumentos, ${searchData.stats.companies} empresas, ${searchData.stats.international} países\n\n`;
    }
    if (searchData.scientific?.length) {
      prompt += `Grupos (amostra): ${searchData.scientific.slice(0, 8).map((g: any) => `${g.name} (${g.institution}, ${g.state})`).join("; ")}\n\n`;
    }
    if (searchData.institutional?.length) {
      prompt += `Instrumentos: ${searchData.institutional.map((i: any) => `${i.name} (${i.type}, ${i.status}${i.value ? ` — ${i.value}` : ''})`).join("; ")}\n\n`;
    }
    if (searchData.international?.length) {
      prompt += `Internacional: ${searchData.international.map((i: any) => `${i.country}: ${i.institutions} inst, ${i.patents} pat`).join("; ")}\n\n`;
    }
    if (searchData.indicators) {
      const ind = searchData.indicators;
      prompt += `Indicadores: C2T=${ind.c2t?.value}, GT=${ind.gt?.value}, P2C=${ind.p2c?.value}, CD=${ind.cd?.value}\n\n`;
    }
    if (searchData.scholarships?.total) {
      prompt += `Bolsas: ${searchData.scholarships.total} encontradas\n\n`;
    }
  }

  return prompt;
}

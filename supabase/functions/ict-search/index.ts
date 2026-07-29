import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!ANTHROPIC_API_KEY && !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Nenhuma chave de IA configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `Você é um especialista no Sistema Nacional de Inovação brasileiro.
Sua tarefa é identificar os principais ICTs (Institutos de Ciência e Tecnologia), centros de pesquisa, laboratórios e grupos universitários brasileiros que pesquisam ativamente o tema fornecido.

Responda EXCLUSIVAMENTE com JSON válido, sem markdown, no formato:
{
  "overview": "parágrafo de 2-3 frases contextualizando o ecossistema brasileiro de P&D neste tema",
  "icts": [
    {
      "name": "nome completo da instituição",
      "acronym": "sigla se houver",
      "type": "instituto federal" | "universidade" | "centro de pesquisa" | "empresa pública" | "instituto privado",
      "city": "cidade",
      "state": "UF",
      "focus": "especialidade específica no tema (1 frase)",
      "url": "URL oficial verificável",
      "ministerio": "órgão de vinculação se relevante"
    }
  ],
  "networks": [
    {
      "name": "nome da rede ou programa",
      "description": "o que reúne ou financia (1 frase)",
      "url": "URL verificável"
    }
  ]
}

Regras:
- Inclua apenas ICTs que REALMENTE existem e atuam no tema — não invente
- Priorize: unidades MCTI, EMBRAPII, universidades federais com laboratórios conhecidos
- Máximo 8 ICTs e 4 redes
- URLs devem ser reais e verificáveis (gov.br, edu.br, org.br)
- Se não houver ICTs conhecidos para o tema, retorne icts: [] e explique no overview`;

    const userPrompt = `Tema tecnológico: "${query}"\n\nIdentifique os principais ICTs brasileiros que pesquisam ativamente este tema.`;

    let responseText = "";

    // Tenta Anthropic com web_search primeiro
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
            model: "claude-haiku-4-5-20251001",
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
            tools: [{ type: "web_search_20250305", name: "web_search" }],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const textBlocks = data.content?.filter((b: any) => b.type === "text") || [];
          responseText = textBlocks.map((b: any) => b.text).join("");
        }
      } catch (e) {
        console.warn("Anthropic with web_search failed:", e);
      }
    }

    // Fallback: Lovable Gateway sem web_search
    if (!responseText && LOVABLE_API_KEY) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || "";
      }
    }

    if (!responseText) throw new Error("Nenhum provedor de IA respondeu");

    let cleaned = responseText.trim();
    if (cleaned.includes("```")) cleaned = cleaned.replace(/```(?:json)?\n?/g, "").replace(/```/g, "");
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta não contém JSON válido");

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ict-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido", icts: [], networks: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

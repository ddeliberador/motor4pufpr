import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, scenario, searchData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um simulador de política pública para o Sistema Nacional de Inovação brasileiro. Você tem profundo conhecimento em:

- Política industrial e de inovação
- Instrumentos de fomento (Finep, BNDES, Embrapii, CAPES, CNPq)
- Sistemas regionais de inovação
- Economia da inovação (Mazzucato, Freeman, Lundvall)
- Catch-up tecnológico e missões orientadas

Dado um cenário hipotético ("E se...?"), você deve:
1. **Diagnóstico Atual**: Estado atual baseado nos dados
2. **Cenário Proposto**: Análise da intervenção sugerida
3. **Impacto Estimado**: Projeções qualitativas e quantitativas (quando possível)
4. **Riscos e Barreiras**: O que pode dar errado
5. **Benchmarks Internacionais**: Casos similares em outros países
6. **Recomendação**: Ação concreta para o gestor público

Use dados concretos dos resultados da busca. Seja objetivo e evite generalidades.
Estruture com ## para cada seção. Use **negrito** para destaques.`;

    const userPrompt = `Objeto tecnológico: "${query}"

**CENÁRIO DE SIMULAÇÃO:**
${scenario}

**DADOS DA BUSCA:**
${JSON.stringify(searchData?.stats || {})}

**Grupos de pesquisa:** ${searchData?.scientific?.length || 0} encontrados
**Patentes:** ${searchData?.technological?.length || 0} encontradas
**Instrumentos:** ${JSON.stringify(searchData?.institutional?.map((i: any) => `${i.name} (${i.status})`) || [])}
**Internacional:** ${JSON.stringify(searchData?.international?.map((i: any) => `${i.country}: ${i.institutions} inst`) || [])}
**Indicadores:** C2T=${searchData?.indicators?.c2t?.value || 'N/A'}, GT=${searchData?.indicators?.gt?.value || 'N/A'}, P2C=${searchData?.indicators?.p2c?.value || 'N/A'}, CD=${searchData?.indicators?.cd?.value || 'N/A'}

Com base nesses dados, simule o impacto do cenário proposto.`;

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
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit excedido" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("policy-simulator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

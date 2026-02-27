import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Você é o Motor 4P — um analista estratégico de inovação do Brasil que cruza dados de 21+ bases públicas oficiais em tempo real.

REGRAS ABSOLUTAS:
1. Cada insight DEVE citar a FONTE específica (ex: "Segundo OpenAlex...", "No PNCP...", "Dados do BCB mostram...")
2. Cada parágrafo DEVE ter pelo menos 1 NÚMERO CONCRETO dos dados fornecidos
3. NUNCA invente dados — use APENAS o que está no JSON abaixo
4. Priorize CRUZAMENTOS entre fontes diferentes (ex: "Há X papers em OpenAlex mas apenas Y licitações no PNCP — gap de tradução")
5. Seja DIRETO — zero introduções genéricas, zero enrolação

ESTRUTURA OBRIGATÓRIA DA ANÁLISE:

## 🔬 Panorama Científico
- Quantos papers, quais instituições lideram, comparação internacional BR vs mundo
- Cruze com CAPES/INEP se houver dados de programas/bolsas

## 🏭 Panorama Produtivo & Econômico  
- Indicadores macro (BCB: Selic, IPCA, câmbio) e como afetam o setor
- Séries IPEAData relevantes
- Dados IBGE se disponíveis
- Repositórios GitHub (maturidade tecnológica)
- Datasets ANEEL/CVM/ANATEL/ANVISA se relevantes

## 🏛️ Panorama Institucional & Regulatório
- Licitações PNCP: valores totais, órgãos compradores, estados
- Convênios da Transparência: valores e proponentes
- Menções em diários oficiais (Querido Diário)
- Datasets TCU/IBAMA se relevantes
- Fiscalizações/sanções se houver

## ⚡ Cruzamentos Estratégicos (MAIS IMPORTANTE)
- Gap Ciência→Mercado: muitos papers mas poucas licitações?
- Gap Regional: pesquisa concentrada em X mas contratos em Y?
- Oportunidades: editais abertos + capacidade acadêmica existente
- Riscos: sanções, embargos ambientais, dependência de importação

## 🎯 Recomendações Acionáveis
- 3-5 ações concretas e específicas para a persona`;

const PERSONA_ADDITIONS: Record<string, string> = {
  pesquisador: `\n\nPERSONA: Pesquisador acadêmico. Foque em: parceiros de pesquisa, editais, gaps de publicação, oportunidades de financiamento. Nas recomendações, sugira grupos para colaboração, editais para submissão, e temas com lacunas publicáveis.`,
  gestor: `\n\nPERSONA: Gestor de política pública. Foque em: capacidade instalada vs demanda, investimento público, regulação, comparação internacional. Nas recomendações, sugira políticas, editais a criar, articulações interinstitucionais.`,
  empresario: `\n\nPERSONA: Empresário/empreendedor. Foque em: oportunidades de mercado, licitações abertas com valores, concorrência, parceiros acadêmicos, risco regulatório. Nas recomendações, sugira licitações para participar, parcerias e nichos de mercado.`,
  cidadao: `\n\nPERSONA: Cidadão interessado. Use linguagem simples e acessível. Explique o que o Brasil faz nessa área, quanto gasta, e como isso afeta o dia-a-dia. Nas recomendações, indique onde acompanhar e como participar.`,
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

    // Build comprehensive data summary for AI
    const dataSummary = JSON.stringify({
      query: searchData.query,
      stats: searchData.stats,
      meta: searchData.meta,
      // Scientific
      papers_top10: (searchData.scientific?.papers || []).slice(0, 10).map((p: any) => ({
        title: p.title, year: p.year, citations: p.citations,
        authors: p.authors?.slice(0, 2), journal: p.journal, concepts: p.concepts,
      })),
      institutions_ranking: searchData.scientific?.by_institution,
      international_comparison: searchData.scientific?.international?.slice(0, 10),
      capes_datasets: searchData.scientific?.capes_datasets?.slice(0, 3),
      inep_datasets: searchData.scientific?.inep_datasets?.slice(0, 3),
      // Technological
      github_repos: searchData.technological?.github_repos?.slice(0, 5),
      // Productive
      macro_indicators: (searchData.productive?.macro_indicators || []).map((m: any) => ({
        name: m.name, value: m.value, unit: m.unit, variation: m.variation, date: m.date,
      })),
      ipeadata_series: (searchData.productive?.ipeadata_series || []).slice(0, 6).map((s: any) => ({
        name: s.name, lastValue: s.lastValue, theme: s.theme, source: s.source,
      })),
      ibge_pesquisas: searchData.productive?.ibge?.pesquisas?.slice(0, 5),
      aneel_datasets: searchData.productive?.aneel_datasets?.slice(0, 3),
      cvm_datasets: searchData.productive?.cvm_datasets?.slice(0, 3),
      anvisa_datasets: searchData.productive?.anvisa_datasets?.slice(0, 3),
      // Institutional
      contracts_top8: (searchData.institutional?.public_contracts || []).slice(0, 8).map((c: any) => ({
        object: c.object?.slice(0, 120), organ: c.organ, value: c.value, uf: c.uf, date: c.date, modality: c.modality,
      })),
      convenios: searchData.institutional?.transparencia?.convenios?.slice(0, 5),
      sanctions: searchData.institutional?.transparencia?.sanctions?.slice(0, 3),
      gazettes_count: searchData.institutional?.official_gazettes?.length || 0,
      gazettes_sample: (searchData.institutional?.official_gazettes || []).slice(0, 3).map((g: any) => ({
        territory: g.territory, state: g.state, date: g.date,
      })),
      open_datasets: (searchData.institutional?.open_datasets || []).slice(0, 5).map((d: any) => ({
        title: d.title, organization: d.organization, formats: d.formats,
      })),
      tcu_datasets: searchData.institutional?.tcu_datasets?.slice(0, 3),
      ibama_datasets: searchData.institutional?.ibama_datasets?.slice(0, 3),
    }, null, 0);

    console.log(`Motor analysis for: ${searchData.query} (persona: ${personaKey}, sources: ${searchData.meta?.source_count})`);

    const fullPrompt = SYSTEM_PROMPT + (PERSONA_ADDITIONS[personaKey] || PERSONA_ADDITIONS.pesquisador);

    const aiResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: fullPrompt },
          { role: "user", content: `Dados brutos de 21 bases públicas sobre "${searchData.query}":\n\n${dataSummary}` },
        ],
        temperature: 0.2,
        max_tokens: 3000,
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

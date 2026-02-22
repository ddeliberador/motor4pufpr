import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchOpenAlexAbstracts(query: string, limit = 30): Promise<string[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://api.openalex.org/works?search=${encoded}&per_page=${limit}&sort=cited_by_count:desc&select=title,abstract_inverted_index&filter=type:article,language:en|pt`;

  const resp = await fetch(url, {
    headers: { "User-Agent": "Motor4P/1.0 (mailto:motor4p@ufpr.br)" },
  });

  if (!resp.ok) {
    console.error("OpenAlex error:", resp.status);
    return [];
  }

  const data = await resp.json();
  const abstracts: string[] = [];

  for (const work of data.results || []) {
    const title = work.title || "";
    let abstractText = "";

    // Reconstruct abstract from inverted index
    if (work.abstract_inverted_index) {
      const positions: [string, number][] = [];
      for (const [word, indices] of Object.entries(work.abstract_inverted_index)) {
        for (const idx of indices as number[]) {
          positions.push([word, idx]);
        }
      }
      positions.sort((a, b) => a[1] - b[1]);
      abstractText = positions.map((p) => p[0]).join(" ");
    }

    if (title && abstractText) {
      abstracts.push(`**${title}**\n${abstractText}`);
    }
  }

  return abstracts;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch real abstracts from OpenAlex
    const abstracts = await fetchOpenAlexAbstracts(query, 30);

    if (abstracts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum artigo encontrado no OpenAlex para esta consulta." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const abstractsBlock = abstracts
      .map((a, i) => `[${i + 1}] ${a}`)
      .join("\n\n");

    const systemPrompt = `Você é um especialista em revisão sistemática de literatura científica. Sua tarefa é analisar abstracts de artigos publicados e identificar LACUNAS DE PESQUISA reais — ou seja, perguntas não respondidas, contradições entre estudos, contextos não explorados, metodologias não aplicadas e oportunidades de investigação original.

REGRAS:
- Baseie-se EXCLUSIVAMENTE nos abstracts fornecidos
- Identifique 4 a 6 lacunas concretas e acionáveis
- Para cada lacuna, cite pelo menos 1 artigo (pelo número) que evidencia a lacuna
- Use linguagem clara e direta, acessível a pesquisadores
- Foque em lacunas que um pesquisador brasileiro poderia explorar

FORMATO DE RESPOSTA (use exatamente este formato markdown):

## 🔍 Lacunas de Pesquisa: [tema]

Análise baseada em ${abstracts.length} artigos mais citados no OpenAlex.

### 1. [Título da lacuna]
[Descrição da lacuna em 2-3 frases, explicando o que falta na literatura]
- **Evidência:** [Artigo X] aborda Y, mas não investiga Z
- **Oportunidade:** [Sugestão concreta de investigação]

### 2. [Título da lacuna]
...

## 💡 Sugestão de Projeto
[Uma proposta concreta de projeto de pesquisa que explore a lacuna mais promissora, em 3-4 frases]`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Analise os seguintes ${abstracts.length} abstracts sobre "${query}" e identifique lacunas de pesquisa:\n\n${abstractsBlock}`,
            },
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes para análise de IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("research-gaps error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

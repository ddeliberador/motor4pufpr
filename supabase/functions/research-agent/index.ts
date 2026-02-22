import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `Você é um agente pesquisador especializado em análise de ecossistemas de inovação brasileiros. Você possui profundo conhecimento das seguintes bases públicas:

- **CNPq** (Diretório de Grupos de Pesquisa): grupos, pesquisadores, áreas do conhecimento
- **INPI** (Instituto Nacional da Propriedade Industrial): patentes, marcas, desenhos industriais
- **OpenAlex**: artigos científicos, citações, colaborações internacionais
- **COMEX Stat**: exportações e importações por NCM
- **Finep / BNDES / Embrapii**: instrumentos de fomento, editais, financiamentos
- **CAPES**: bolsas, programas de pós-graduação
- **INEP**: dados educacionais, cursos superiores

Sua missão é analisar os dados brutos de uma busca sobre um objeto tecnológico e fornecer uma análise estratégica estruturada.`;

const personaPrompts: Record<string, string> = {
  pesquisador: `${BASE_SYSTEM_PROMPT}

Você está atendendo um PESQUISADOR. Foque em:
1. **Estratégia de Pesquisa**: Onde estão os grupos mais ativos? Quais áreas são promissoras?
2. **Fontes de Financiamento**: Bolsas CAPES, CNPq, FAPESP e outras agências
3. **Parceiros Ideais**: Grupos complementares, colaborações internacionais
4. **Gaps Tecnológicos**: Onde há pesquisa mas não há patentes? Onde há oportunidade?
5. **Tendências Globais**: Publicações, citações, colaborações internacionais

Estruture como um plano de ação para o pesquisador: ## Cenário Atual, ## Oportunidades de Pesquisa, ## Fontes de Financiamento, ## Parceiros Potenciais, ## Recomendações.`,

  universidade: `${BASE_SYSTEM_PROMPT}

Você está atendendo uma UNIVERSIDADE/INSTITUIÇÃO. Foque em:
1. **Posicionamento Institucional**: Ranking da instituição na área, forças e fraquezas
2. **Captação de Recursos**: Instrumentos públicos disponíveis, editais abertos
3. **Patentes por Departamento**: Volume e qualidade da produção tecnológica
4. **Parcerias Estratégicas**: Nacionais e internacionais, empresas e outras universidades
5. **Investimento Estratégico**: Onde investir para maximizar impacto

Estruture como relatório de inteligência institucional: ## Diagnóstico Institucional, ## Captação de Recursos, ## Parcerias Estratégicas, ## Áreas de Investimento, ## Recomendações.`,

  empresa: `${BASE_SYSTEM_PROMPT}

Você está atendendo um EMPRESÁRIO/EMPRESA. Foque em:
1. **Maturidade Tecnológica**: TRL estimado, estado da arte
2. **Concorrência**: Empresas líderes, patentes estratégicas, market share
3. **Riscos e Oportunidades**: Barreiras de entrada, janelas de oportunidade
4. **Financiamento**: Linhas Finep, BNDES, Embrapii, subvenção econômica
5. **Parceiros Acadêmicos**: Universidades e grupos de pesquisa líderes

Estruture como relatório de inteligência competitiva: ## Análise de Mercado, ## Maturidade Tecnológica, ## Concorrência, ## Financiamento Disponível, ## Recomendações Estratégicas.`,

  governo: `${BASE_SYSTEM_PROMPT}

Você está atendendo um GESTOR PÚBLICO/GOVERNO. Foque em:
1. **Diagnóstico Regional**: Distribuição por estado, concentração vs dispersão
2. **Lacunas de Investimento**: Onde há pesquisa mas não há financiamento? Onde há demanda mas não há capacitação?
3. **Dependência Internacional**: Quanto o Brasil depende do exterior nessa tecnologia?
4. **Efetividade dos Instrumentos**: Os instrumentos públicos estão gerando resultados?
5. **Impacto Potencial**: Correlação entre investimento e resultados (patentes, publicações)

Estruture como diagnóstico de política pública: ## Panorama Nacional, ## Distribuição Regional, ## Dependência Externa, ## Efetividade dos Instrumentos, ## Recomendações de Política.`,
};

const defaultPrompt = `${BASE_SYSTEM_PROMPT}

Você deve:
1. **Diagnóstico do Cenário**: Avaliar o estado atual do ecossistema
2. **Cruzamento de Dados**: Identificar conexões entre as camadas
3. **Lacunas e Gargalos**: Onde há pesquisa mas não há produção?
4. **Oportunidades Estratégicas**: Nichos promissores, parcerias potenciais
5. **Recomendações**: Sugestões concretas

Use linguagem clara e objetiva. Estruture com ## Diagnóstico, ## Cruzamento de Dados, ## Lacunas e Gargalos, ## Oportunidades, ## Recomendações.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, searchData, selectedCnaes, persona } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = persona && personaPrompts[persona] ? personaPrompts[persona] : defaultPrompt;
    const userPrompt = buildUserPrompt(query, searchData, selectedCnaes);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Erro no gateway de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("research-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildUserPrompt(
  query: string,
  searchData: Record<string, unknown> | undefined,
  selectedCnaes: Array<{ code: string; description: string }> | undefined
): string {
  let prompt = `Analise o ecossistema de inovação brasileiro para o objeto tecnológico: "${query}"\n\n`;

  if (selectedCnaes && selectedCnaes.length > 0) {
    prompt += `**CNAEs selecionados:** ${selectedCnaes.map((c) => `${c.code} - ${c.description}`).join("; ")}\n\n`;
  }

  if (searchData) {
    const d = searchData as Record<string, any>;

    if (d.stats) {
      prompt += `**Estatísticas gerais:** ${d.stats.groups || 0} grupos de pesquisa, ${d.stats.patents || 0} patentes, ${d.stats.instruments || 0} instrumentos de fomento, ${d.stats.companies || 0} empresas, ${d.stats.international || 0} países com incidência\n\n`;
    }

    if (d.scientific && d.scientific.length > 0) {
      prompt += `**Grupos de pesquisa (amostra):**\n`;
      d.scientific.slice(0, 10).forEach((g: any) => {
        prompt += `- ${g.name} (${g.institution}, ${g.state}) — ${g.area}${g.international ? ` [Internacional: ${g.international}]` : ""}\n`;
      });
      prompt += "\n";
    }

    if (d.technological && d.technological.length > 0) {
      prompt += `**Patentes (amostra):**\n`;
      d.technological.slice(0, 5).forEach((p: any) => {
        prompt += `- ${p.title} — ${p.applicant} (${p.year})${p.international ? ` [${p.international}]` : ""}\n`;
      });
      prompt += "\n";
    }

    if (d.institutional && d.institutional.length > 0) {
      prompt += `**Instrumentos de fomento:**\n`;
      d.institutional.forEach((i: any) => {
        prompt += `- ${i.name} (${i.type}, ${i.status})${i.value ? ` — ${i.value}` : ""}\n`;
      });
      prompt += "\n";
    }

    if (d.international && d.international.length > 0) {
      prompt += `**Incidência internacional:**\n`;
      d.international.forEach((i: any) => {
        prompt += `- ${i.country}: ${i.institutions} instituições, ${i.patents} patentes — ${i.relevance}\n`;
      });
      prompt += "\n";
    }

    if (d.indicators) {
      const ind = d.indicators;
      prompt += `**Indicadores estruturais:**\n`;
      prompt += `- C2T (Ciência→Tecnologia): ${ind.c2t?.value ?? "N/A"} — ${ind.c2t?.description ?? ""}\n`;
      prompt += `- GT (Gargalo de Tradução): ${ind.gt?.value ?? "N/A"} — ${ind.gt?.description ?? ""}\n`;
      prompt += `- P2C (Política→Capacidade): ${ind.p2c?.value ?? "N/A"} — ${ind.p2c?.description ?? ""}\n`;
      prompt += `- CD (Concentração/Dependência): ${ind.cd?.value ?? "N/A"} — ${ind.cd?.description ?? ""}\n`;
      prompt += "\n";
    }
  }

  prompt += `Com base nesses dados, forneça sua análise estratégica completa.`;

  return prompt;
}

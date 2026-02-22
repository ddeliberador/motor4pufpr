import { useState, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://jtoeinerhvxxgoeicrif.supabase.co`;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const AGENT_URL = `${SUPABASE_URL}/functions/v1/research-agent`;

export function useResearchAgent() {
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (
      query: string,
      searchData: Record<string, unknown>,
      selectedCnaes: Array<{ code: string; description: string }>,
      persona?: string
    ) => {
      setIsAnalyzing(true);
      setAnalysis("");
      setError(null);

      try {
        const resp = await fetch(AGENT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ query, searchData, selectedCnaes, persona }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => null);
          throw new Error(errData?.error || `Erro ${resp.status}`);
        }

        if (!resp.body) throw new Error("Sem stream disponível");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                accumulated += content;
                setAnalysis(accumulated);
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        // flush
        if (buffer.trim()) {
          for (let raw of buffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                accumulated += content;
                setAnalysis(accumulated);
              }
            } catch { /* ignore */ }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        setError(msg);
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setAnalysis("");
    setError(null);
  }, []);

  return { analysis, isAnalyzing, error, analyze, reset };
}

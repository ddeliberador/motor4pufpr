import { useState, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://jtoeinerhvxxgoeicrif.supabase.co`;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

interface Insight {
  type: "opportunity" | "warning" | "match" | "trend";
  title: string;
  description: string;
  score?: number;
  source?: string;
}

export function useSmartInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = useCallback(
    async (
      query: string,
      searchData: Record<string, unknown>,
      persona: string,
      selectedCnaes: Array<{ code: string; description: string }>
    ) => {
      setIsLoading(true);
      setError(null);
      setInsights([]);

      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/smart-insights`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ query, searchData, persona, selectedCnaes }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => null);
          throw new Error(errData?.error || `Erro ${resp.status}`);
        }

        const data = await resp.json();
        setInsights(data.insights || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { insights, isLoading, error, generateInsights };
}

export function usePolicySimulator() {
  const [simulation, setSimulation] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback(
    async (
      query: string,
      scenario: string,
      searchData: Record<string, unknown>
    ) => {
      setIsSimulating(true);
      setSimulation("");
      setError(null);

      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/policy-simulator`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ query, scenario, searchData }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => null);
          throw new Error(errData?.error || `Erro ${resp.status}`);
        }

        if (!resp.body) throw new Error("Sem stream");

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
                setSimulation(accumulated);
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally {
        setIsSimulating(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setSimulation("");
    setError(null);
  }, []);

  return { simulation, isSimulating, error, simulate, reset };
}

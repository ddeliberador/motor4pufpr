import { useEffect, useState } from "react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { DashboardView } from "./DashboardView";

type DashboardRow = { id: string; title: string; description: string | null };

/** Lista os painéis marcados como públicos e exibe o selecionado. */
export function PaineisPublicados() {
  const [paineis, setPaineis] = useState<DashboardRow[]>([]);
  const [ativo, setAtivo] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await supabase
        .from("custom_dashboards")
        .select("id, title, description")
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      if (!vivo) return;
      const lista = (data ?? []) as unknown as DashboardRow[];
      setPaineis(lista);
      setAtivo(lista[0]?.id ?? null);
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, []);

  if (carregando || paineis.length === 0) return null;

  const atual = paineis.find((p) => p.id === ativo) ?? paineis[0];

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-3">Painéis publicados</h2>
      {paineis.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {paineis.map((p) => (
            <button
              key={p.id}
              onClick={() => setAtivo(p.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs border transition",
                p.id === atual.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {p.title}
            </button>
          ))}
        </div>
      )}
      <DashboardView dashboardId={atual.id} titulo={atual.title} descricao={atual.description} />
    </section>
  );
}

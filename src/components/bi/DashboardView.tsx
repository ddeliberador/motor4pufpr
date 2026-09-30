import { useEffect, useState } from "react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SavedChart, type SavedChartRow } from "./SavedChart";

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export type DashboardItemRow = {
  id: string;
  chart_id: string;
  largura: string;
  ordem: number;
};

/** Exibe um dashboard montado: grid de gráficos salvos com filtro global de estado. */
export function DashboardView({
  dashboardId, titulo, descricao, onRemoverItem,
}: {
  dashboardId: string;
  titulo?: string;
  descricao?: string | null;
  onRemoverItem?: (itemId: string) => void;
}) {
  const [itens, setItens] = useState<(DashboardItemRow & { chart: SavedChartRow })[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [uf, setUf] = useState<string>("todos");

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    (async () => {
      const { data, error } = await supabase
        .from("dashboard_items")
        .select("id, chart_id, largura, ordem, custom_charts(*)")
        .eq("dashboard_id", dashboardId)
        .order("ordem");
      if (!ativo) return;
      if (error) { setItens([]); setCarregando(false); return; }
      const lista = (data ?? [])
        .map((r) => {
          const row = r as unknown as DashboardItemRow & { custom_charts: SavedChartRow | null };
          return row.custom_charts ? { ...row, chart: row.custom_charts } : null;
        })
        .filter(Boolean) as (DashboardItemRow & { chart: SavedChartRow })[];
      setItens(lista);
      setCarregando(false);
    })();
    return () => { ativo = false; };
  }, [dashboardId]);

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          {titulo && <h2 className="text-lg font-semibold">{titulo}</h2>}
          {descricao && <p className="text-sm text-muted-foreground mt-0.5">{descricao}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Estado</span>
          <Select value={uf} onValueChange={setUf}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {uf !== "todos" && (
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          Exibindo dados de {uf}. Gráficos de bases sem coluna de estado permanecem com o total nacional.
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando painel…</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum gráfico adicionado a este painel.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {itens.map((it) => (
            <div
              key={it.id}
              className={cn("rounded-lg border border-border bg-card p-4 relative", it.largura === "full" && "md:col-span-2")}
            >
              {onRemoverItem && (
                <button
                  onClick={() => onRemoverItem(it.id)}
                  title="Remover do painel"
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
              <SavedChart chart={it.chart} ufFiltro={uf === "todos" ? null : uf} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

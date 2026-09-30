import { useCallback, useEffect, useState } from "react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ChartBuilder } from "./ChartBuilder";
import { SavedChart, type SavedChartRow } from "./SavedChart";
import { DashboardView } from "./DashboardView";
import { getDataset, metricLabel } from "@/lib/bi/datasets";
import { toSpec } from "./SavedChart";

type DashboardRow = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
};

export function BiStudioTab({ userId }: { userId: string }) {
  const [charts, setCharts] = useState<SavedChartRow[]>([]);
  const [dashboards, setDashboards] = useState<DashboardRow[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [recarregar, setRecarregar] = useState(0);

  const carregar = useCallback(async () => {
    const [c, d] = await Promise.all([
      supabase.from("custom_charts").select("*").order("created_at", { ascending: false }),
      supabase.from("custom_dashboards").select("*").order("created_at", { ascending: false }),
    ]);
    if (c.error) toast.error(c.error.message);
    if (d.error) toast.error(d.error.message);
    setCharts((c.data ?? []) as unknown as SavedChartRow[]);
    const lista = (d.data ?? []) as unknown as DashboardRow[];
    setDashboards(lista);
    setSelecionado((prev) => prev && lista.some((x) => x.id === prev) ? prev : lista[0]?.id ?? null);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const excluirGrafico = async (id: string) => {
    if (!confirm("Excluir este gráfico? Ele sai também dos painéis onde aparece.")) return;
    const { error } = await supabase.from("custom_charts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setCharts((p) => p.filter((x) => x.id !== id));
    setRecarregar((n) => n + 1);
  };

  const alternarPublico = async (c: SavedChartRow) => {
    const { error } = await supabase.from("custom_charts").update({ is_public: !c.is_public }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setCharts((p) => p.map((x) => x.id === c.id ? { ...x, is_public: !c.is_public } : x));
  };

  const criarDashboard = async (title: string, description: string, is_public: boolean) => {
    const { data, error } = await supabase.from("custom_dashboards")
      .insert({ user_id: userId, title, description: description || null, is_public })
      .select().single();
    if (error) return toast.error(error.message);
    const novo = data as unknown as DashboardRow;
    setDashboards((p) => [novo, ...p]);
    setSelecionado(novo.id);
    toast.success("Painel criado.");
  };

  const excluirDashboard = async (id: string) => {
    if (!confirm("Excluir este painel?")) return;
    const { error } = await supabase.from("custom_dashboards").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setDashboards((p) => p.filter((x) => x.id !== id));
    setSelecionado(null);
  };

  const alternarPublicoDashboard = async (dash: DashboardRow) => {
    const { error } = await supabase.from("custom_dashboards").update({ is_public: !dash.is_public }).eq("id", dash.id);
    if (error) return toast.error(error.message);
    setDashboards((p) => p.map((x) => x.id === dash.id ? { ...x, is_public: !dash.is_public } : x));
  };

  const adicionarAoDashboard = async (chartId: string, dashboardId: string, largura: string) => {
    const { error } = await supabase.from("dashboard_items").insert({
      user_id: userId, dashboard_id: dashboardId, chart_id: chartId, largura, ordem: Date.now() % 100000,
    });
    if (error) return toast.error(error.message);
    toast.success("Gráfico adicionado ao painel.");
    setRecarregar((n) => n + 1);
  };

  const removerItem = async (itemId: string) => {
    const { error } = await supabase.from("dashboard_items").delete().eq("id", itemId);
    if (error) return toast.error(error.message);
    setRecarregar((n) => n + 1);
  };

  const dashAtual = dashboards.find((x) => x.id === selecionado) ?? null;

  return (
    <Tabs defaultValue="construtor">
      <TabsList>
        <TabsTrigger value="construtor">Construtor de gráficos</TabsTrigger>
        <TabsTrigger value="biblioteca">Biblioteca ({charts.length})</TabsTrigger>
        <TabsTrigger value="paineis">Painéis ({dashboards.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="construtor" className="mt-4">
        <ChartBuilder userId={userId} onSaved={carregar} />
      </TabsContent>

      <TabsContent value="biblioteca" className="mt-4">
        {charts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum gráfico salvo ainda. Monte um no construtor e clique em “Salvar gráfico”.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {charts.map((c) => {
              const spec = toSpec(c);
              return (
                <div key={c.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{c.title}</div>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-mono">{getDataset(c.dataset_key)?.label ?? c.dataset_key}</Badge>
                        <Badge variant="outline" className="text-[10px] font-mono">{c.x_column}</Badge>
                        <Badge variant="outline" className="text-[10px] font-mono">{metricLabel(spec)}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Switch checked={c.is_public} onCheckedChange={() => alternarPublico(c)} /> público
                      </label>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => excluirGrafico(c.id)}>
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </Button>
                    </div>
                  </div>
                  <SavedChart chart={c} altura={220} />
                  <div className="mt-2 flex items-center gap-2">
                    <Select onValueChange={(v) => adicionarAoDashboard(c.id, v, "half")}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Adicionar a um painel" /></SelectTrigger>
                      <SelectContent>
                        {dashboards.length === 0 && <SelectItem value="__none" disabled>crie um painel primeiro</SelectItem>}
                        {dashboards.map((dd) => <SelectItem key={dd.id} value={dd.id}>{dd.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="paineis" className="mt-4">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <Select value={selecionado ?? ""} onValueChange={setSelecionado}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Selecione um painel" /></SelectTrigger>
            <SelectContent>
              {dashboards.map((dd) => <SelectItem key={dd.id} value={dd.id}>{dd.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <NovoDashboardDialog onSubmit={criarDashboard} />
          {dashAtual && (
            <>
              <label className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
                <Switch checked={dashAtual.is_public} onCheckedChange={() => alternarPublicoDashboard(dashAtual)} />
                Publicar na página Análise
              </label>
              <Button variant="ghost" size="sm" onClick={() => excluirDashboard(dashAtual.id)}>
                <span className="material-symbols-outlined text-[16px] mr-1">delete</span> Excluir painel
              </Button>
            </>
          )}
        </div>

        {dashAtual ? (
          <DashboardView
            key={`${dashAtual.id}-${recarregar}`}
            dashboardId={dashAtual.id}
            titulo={dashAtual.title}
            descricao={dashAtual.description}
            onRemoverItem={removerItem}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Crie um painel e depois adicione gráficos da biblioteca.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}

function NovoDashboardDialog({ onSubmit }: { onSubmit: (t: string, d: string, p: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", is_public: false });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><span className="material-symbols-outlined text-[16px] mr-1">add</span> Novo painel</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo painel</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
            Publicar na página Análise
          </label>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            if (!form.title.trim()) return;
            onSubmit(form.title.trim(), form.description, form.is_public);
            setOpen(false);
            setForm({ title: "", description: "", is_public: false });
          }}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useMemo, useState } from "react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Database, Pencil, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn, safeHttpUrl } from "@/lib/utils";
import { useCatalogo, carregarCatalogo, detalhesDe, type CatalogoBase } from "@/lib/catalogo";
import type { Database as DB } from "@/integrations/supabase/types";

type Caminho = DB["public"]["Enums"]["caminho_consumo"];
const CAMINHOS: { value: Caminho; label: string }[] = [
  { value: "gold_tabela", label: "Tabela oficial (Gold)" },
  { value: "funcao_mapa", label: "Função do Mapa" },
  { value: "snapshot_publico", label: "Arquivo público (snapshot)" },
  { value: "api_cliente", label: "API externa consultada no navegador" },
  { value: "funcao_motor", label: "Função do Motor" },
];
const USOS = [
  { value: "motor", label: "Motor" },
  { value: "mapa", label: "Mapa" },
  { value: "bi", label: "Construtor de gráficos" },
];

type Rascunho = Partial<CatalogoBase> & { colunasTexto?: string };

function paraRascunho(b: CatalogoBase | null): Rascunho {
  if (!b) return { chave: "", nome: "", ativa: true, usos: [], situacao: "Ativa", colunasTexto: "[]" };
  return { ...b, colunasTexto: JSON.stringify(b.colunas ?? [], null, 2) };
}

export function CatalogoFontesTab({ canEdit }: { canEdit: boolean }) {
  const { bases, erro, recarregar } = useCatalogo();
  const [usoFiltro, setUsoFiltro] = useState("all");
  const [pilarFiltro, setPilarFiltro] = useState("all");
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [editando, setEditando] = useState<{ original: CatalogoBase | null; r: Rascunho } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const lista = bases ?? [];
  const pilares = useMemo(() => Array.from(new Set(lista.map((b) => b.pilar).filter(Boolean))) as string[], [lista]);
  const filtradas = lista.filter((b) =>
    (usoFiltro === "all" || b.usos.includes(usoFiltro)) && (pilarFiltro === "all" || b.pilar === pilarFiltro));
  const ativas = lista.filter((b) => b.ativa).length;

  const salvar = async () => {
    if (!editando) return;
    const r = editando.r;
    if (!r.chave?.trim() || !r.nome?.trim()) return toast.error("Chave e nome são obrigatórios.");
    let colunas: unknown;
    try { colunas = JSON.parse(r.colunasTexto || "[]"); if (!Array.isArray(colunas)) throw new Error(); }
    catch { return toast.error("Colunas: use uma lista JSON, ex.: [{\"name\":\"uf\",\"label\":\"uf\",\"kind\":\"dimension\"}]"); }
    const row = {
      chave: r.chave.trim(), nome: r.nome.trim(), mantenedor: r.mantenedor || null, nacionalidade: r.nacionalidade || null,
      uso: r.uso || null, nota: r.nota || null, licenca: r.licenca || null, url: r.url || null,
      situacao: r.situacao || "Ativa", ativa: r.ativa ?? true, usos: r.usos ?? [], pilar: r.pilar || null,
      camada_mapa: r.camada_mapa || null, caminho_consumo: (r.caminho_consumo || null) as Caminho | null,
      alvo: r.alvo || null, colunas: colunas as DB["public"]["Tables"]["catalogo_bases"]["Insert"]["colunas"],
      proximo_passo: r.proximo_passo || null,
    };
    setSalvando(true);
    const q = editando.original
      ? supabase.from("catalogo_bases").update(row).eq("id", editando.original.id)
      : supabase.from("catalogo_bases").insert(row);
    const { error } = await q;
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Catálogo atualizado.");
    await carregarCatalogo(true).catch(() => null);
    recarregar();
    setEditando(null);
  };

  const alternarAtiva = async (b: CatalogoBase) => {
    const { error } = await supabase.from("catalogo_bases").update({ ativa: !b.ativa }).eq("id", b.id);
    if (error) return toast.error(error.message);
    await carregarCatalogo(true).catch(() => null);
    recarregar();
  };

  if (erro) return <p role="alert" className="text-sm text-destructive py-8 text-center">Erro ao carregar o catálogo: {erro}</p>;
  if (!bases) return <p className="text-sm text-muted-foreground py-8 text-center">Carregando catálogo de bases…</p>;

  const set = (patch: Rascunho) => setEditando((e) => e && { ...e, r: { ...e.r, ...patch } });

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg p-4 bg-card">
        <p className="text-sm text-muted-foreground">
          Catálogo único de bases: é a fonte da verdade da página Bases, do Mapa, do Motor e do construtor de gráficos.
          Uma base desativada aqui deixa de ser usada nesses lugares.
        </p>
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <Badge variant="outline" className="gap-1"><Database className="w-3 h-3" /> {lista.length} bases</Badge>
          <Badge variant="secondary">{ativas} ativas</Badge>
          <Badge variant="outline">{lista.length - ativas} desativadas</Badge>
          {canEdit && (
            <Button size="sm" className="ml-auto" onClick={() => setEditando({ original: null, r: paraRascunho(null) })}>
              <Plus className="w-4 h-4 mr-1" /> Nova base
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={usoFiltro} onValueChange={setUsoFiltro}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os usos</SelectItem>
            {USOS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={pilarFiltro} onValueChange={setPilarFiltro}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os pilares</SelectItem>
            {pilares.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center">{filtradas.length} de {lista.length} bases</span>
      </div>

      <div className="space-y-2">
        {filtradas.map((b) => {
          const aberto = !!abertos[b.id];
          const url = b.url ? safeHttpUrl(b.url) : null;
          const cf = detalhesDe(b).catalogo_fontes;
          return (
            <Card key={b.id} className={cn("overflow-hidden", !b.ativa && "opacity-60")}>
              <button className="w-full text-left" onClick={() => setAbertos((p) => ({ ...p, [b.id]: !aberto }))}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {aberto ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                    <CardTitle className="text-sm font-medium">{b.nome}</CardTitle>
                    {b.usos.map((u) => <Badge key={u} variant="outline" className="text-[10px]">{USOS.find((x) => x.value === u)?.label ?? u}</Badge>)}
                    {b.camada_mapa && <Badge variant="outline" className="text-[10px]">{b.camada_mapa}</Badge>}
                    <Badge variant={b.ativa ? "secondary" : "destructive"} className="text-[10px] ml-auto">
                      {b.ativa ? b.situacao : "Desativada"}
                    </Badge>
                  </div>
                </CardHeader>
              </button>
              {aberto && (
                <CardContent className="px-4 pb-4 pt-0 space-y-3 text-sm">
                  <p className="text-xs text-muted-foreground font-mono">{b.chave}</p>
                  {b.mantenedor && <div><p className="text-xs font-semibold text-muted-foreground">Mantenedor</p><p>{b.mantenedor}</p></div>}
                  {b.uso && <div><p className="text-xs font-semibold text-muted-foreground">Uso</p><p>{b.uso}</p></div>}
                  {cf?.dados_chave && <div><p className="text-xs font-semibold text-muted-foreground">Dados-chave</p><p>{cf.dados_chave}</p></div>}
                  {b.tipo_acesso && <div><p className="text-xs font-semibold text-muted-foreground">Tipo de acesso</p><p>{b.tipo_acesso}</p></div>}
                  {b.caminho_consumo && (
                    <div><p className="text-xs font-semibold text-muted-foreground">Caminho de consumo</p>
                      <p>{CAMINHOS.find((c) => c.value === b.caminho_consumo)?.label} · <span className="font-mono text-xs">{b.alvo}</span></p></div>
                  )}
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1 break-all">
                      {b.url} <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                  {cf?.status_pesquisa && <div><p className="text-xs font-semibold text-muted-foreground">Status da pesquisa</p><p className="whitespace-pre-wrap">{cf.status_pesquisa}</p></div>}
                  {b.proximo_passo && <div><p className="text-xs font-semibold text-muted-foreground">Próximo passo</p><p className="whitespace-pre-wrap">{b.proximo_passo}</p></div>}
                  {Array.isArray(b.colunas) && b.colunas.length > 0 && (
                    <div><p className="text-xs font-semibold text-muted-foreground">Colunas no construtor</p>
                      <p className="font-mono text-xs">{(b.colunas as { name: string }[]).map((c) => c.name).join(", ")}</p></div>
                  )}
                  {canEdit && (
                    <div className="flex gap-2 items-center">
                      <Button variant="outline" size="sm" onClick={() => setEditando({ original: b, r: paraRascunho(b) })}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                      </Button>
                      <Label className="flex items-center gap-2 text-xs">
                        <Switch checked={b.ativa} onCheckedChange={() => alternarAtiva(b)} aria-label="Base ativa" /> Ativa
                      </Label>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editando?.original ? editando.original.nome : "Nova base"}</DialogTitle>
          </DialogHeader>
          {editando && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Chave</Label><Input value={editando.r.chave ?? ""} disabled={!!editando.original} onChange={(e) => set({ chave: e.target.value })} /></div>
              <div><Label>Nome</Label><Input value={editando.r.nome ?? ""} onChange={(e) => set({ nome: e.target.value })} /></div>
              <div><Label>Mantenedor</Label><Input value={editando.r.mantenedor ?? ""} onChange={(e) => set({ mantenedor: e.target.value })} /></div>
              <div><Label>Nacionalidade</Label><Input value={editando.r.nacionalidade ?? ""} onChange={(e) => set({ nacionalidade: e.target.value })} /></div>
              <div><Label>Link</Label><Input value={editando.r.url ?? ""} onChange={(e) => set({ url: e.target.value })} /></div>
              <div><Label>Licença</Label><Input value={editando.r.licenca ?? ""} onChange={(e) => set({ licenca: e.target.value })} /></div>
              <div><Label>Situação</Label><Input value={editando.r.situacao ?? ""} onChange={(e) => set({ situacao: e.target.value })} /></div>
              <div><Label>Pilar</Label><Input value={editando.r.pilar ?? ""} onChange={(e) => set({ pilar: e.target.value })} /></div>
              <div className="col-span-2"><Label>Uso</Label><Textarea rows={2} value={editando.r.uso ?? ""} onChange={(e) => set({ uso: e.target.value })} /></div>
              <div className="col-span-2 flex gap-4 items-center">
                <Label>Usada em:</Label>
                {USOS.map((u) => (
                  <label key={u.value} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={editando.r.usos?.includes(u.value)} onCheckedChange={(v) =>
                      set({ usos: v ? [...(editando.r.usos ?? []), u.value] : (editando.r.usos ?? []).filter((x) => x !== u.value) })} />
                    {u.label}
                  </label>
                ))}
                <label className="flex items-center gap-1.5 text-sm ml-auto">
                  <Switch checked={editando.r.ativa ?? true} onCheckedChange={(v) => set({ ativa: v })} /> Ativa
                </label>
              </div>
              <div><Label>Camada do Mapa</Label><Input placeholder="L1 … L7" value={editando.r.camada_mapa ?? ""} onChange={(e) => set({ camada_mapa: e.target.value })} /></div>
              <div>
                <Label>Caminho de consumo</Label>
                <Select value={editando.r.caminho_consumo ?? ""} onValueChange={(v) => set({ caminho_consumo: v as Caminho })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{CAMINHOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Alvo (tabela, camada da função ou arquivo)</Label><Input value={editando.r.alvo ?? ""} onChange={(e) => set({ alvo: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Colunas oferecidas no construtor (JSON)</Label>
                <Textarea rows={6} className="font-mono text-xs" value={editando.r.colunasTexto ?? "[]"} onChange={(e) => set({ colunasTexto: e.target.value })} />
              </div>
              <div className="col-span-2"><Label>Próximo passo</Label><Textarea rows={2} value={editando.r.proximo_passo ?? ""} onChange={(e) => set({ proximo_passo: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

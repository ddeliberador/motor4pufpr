import { useEffect, useMemo, useState, useCallback } from "react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Database, Pencil, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn, safeHttpUrl } from "@/lib/utils";

export type Fonte = {
  id: string;
  pilar: string;
  subpilar: string | null;
  fonte: string;
  dados_chave: string | null;
  tipo_acesso: string | null;
  endpoint_url: string | null;
  autenticacao: string | null;
  status_pesquisa: string | null;
  proximo_passo: string | null;
  ordem: number;
};

type StatusClasse = "testado" | "integrado" | "confirmado" | "bloqueado" | "a_validar";

export function classificarStatus(status: string | null): StatusClasse {
  const s = (status || "").toLowerCase();
  if (s.includes("não funcional") || s.includes("bloquead")) return "bloqueado";
  if (s.includes("já integrado") || s.includes("já usado")) return "integrado";
  if (s.includes("testado em produção")) return "testado";
  if (s.includes("confirmado") || s.includes("investigado") || s.includes("conhecido")) return "confirmado";
  return "a_validar";
}

const STATUS_META: Record<StatusClasse, { label: string; cls: string }> = {
  testado: { label: "Testado em produção", cls: "bg-green-600 text-white" },
  integrado: { label: "Já integrado", cls: "bg-blue-600 text-white" },
  confirmado: { label: "Confirmado/Conhecido", cls: "bg-teal-600 text-white" },
  bloqueado: { label: "Bloqueado/Com falha", cls: "bg-destructive text-destructive-foreground" },
  a_validar: { label: "A validar", cls: "bg-amber-500 text-white" },
};

const FILTROS: { value: StatusClasse | "all"; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "testado", label: "Testado em produção" },
  { value: "integrado", label: "Já integrado" },
  { value: "confirmado", label: "Confirmado/Conhecido" },
  { value: "bloqueado", label: "Bloqueado/Com falha" },
  { value: "a_validar", label: "A validar" },
];

export function CatalogoFontesTab({ canEdit }: { canEdit: boolean }) {
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [loading, setLoading] = useState(true);
  const [pilarFilter, setPilarFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [editando, setEditando] = useState<Fonte | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editProximo, setEditProximo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("mapa_inovacao_fontes")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) toast.error("Erro ao carregar catálogo: " + error.message);
    else setFontes((data || []) as Fonte[]);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const pilares = useMemo(() => Array.from(new Set(fontes.map((f) => f.pilar))), [fontes]);

  const filtradas = useMemo(() => fontes.filter((f) => {
    if (pilarFilter !== "all" && f.pilar !== pilarFilter) return false;
    if (statusFilter !== "all" && classificarStatus(f.status_pesquisa) !== statusFilter) return false;
    return true;
  }), [fontes, pilarFilter, statusFilter]);

  const contagem = useMemo(() => {
    const c: Record<StatusClasse, number> = { testado: 0, integrado: 0, confirmado: 0, bloqueado: 0, a_validar: 0 };
    fontes.forEach((f) => { c[classificarStatus(f.status_pesquisa)] += 1; });
    return c;
  }, [fontes]);

  const abrirEdicao = (f: Fonte) => {
    setEditando(f);
    setEditStatus(f.status_pesquisa || "");
    setEditProximo(f.proximo_passo || "");
  };

  const salvar = async () => {
    if (!editando) return;
    setSalvando(true);
    const { error } = await (supabase as any)
      .from("mapa_inovacao_fontes")
      .update({ status_pesquisa: editStatus, proximo_passo: editProximo })
      .eq("id", editando.id);
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Fonte atualizada.");
    setFontes((p) => p.map((x) => x.id === editando.id ? { ...x, status_pesquisa: editStatus, proximo_passo: editProximo } : x));
    setEditando(null);
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Carregando catálogo de fontes…</p>;

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg p-4 bg-card">
        <p className="text-sm text-muted-foreground">
          Controle mestre das fontes de dados da <strong>Pesquisa Colaborativa do Mapa de Inovação</strong> (doutorado).
          Cada conector testado no Motor da Inovação corresponde a uma linha deste catálogo.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="outline" className="gap-1"><Database className="w-3 h-3" /> {fontes.length} fontes</Badge>
          {(Object.keys(STATUS_META) as StatusClasse[]).map((k) => (
            <Badge key={k} className={cn("gap-1", STATUS_META[k].cls)}>{STATUS_META[k].label}: {contagem[k]}</Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={pilarFilter} onValueChange={setPilarFilter}>
          <SelectTrigger className="w-[240px]"><SelectValue placeholder="Pilar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os pilares</SelectItem>
            {pilares.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[240px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {FILTROS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center">{filtradas.length} de {fontes.length} fontes</span>
      </div>

      {pilares.filter((p) => pilarFilter === "all" || p === pilarFilter).map((pilar) => {
        const doPilar = filtradas.filter((f) => f.pilar === pilar);
        if (doPilar.length === 0) return null;
        return (
          <div key={pilar}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">{pilar} <span className="font-normal">({doPilar.length})</span></h3>
            <div className="space-y-2">
              {doPilar.map((f) => {
                const classe = classificarStatus(f.status_pesquisa);
                const aberto = !!abertos[f.id];
                const url = f.endpoint_url ? safeHttpUrl(f.endpoint_url) : null;
                return (
                  <Card key={f.id} className="overflow-hidden">
                    <button
                      className="w-full text-left"
                      onClick={() => setAbertos((p) => ({ ...p, [f.id]: !aberto }))}
                    >
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {aberto ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                          <CardTitle className="text-sm font-medium">{f.fonte}</CardTitle>
                          {f.subpilar && <Badge variant="outline" className="text-[10px]">{f.subpilar}</Badge>}
                          <Badge className={cn("text-[10px] ml-auto", STATUS_META[classe].cls)}>{STATUS_META[classe].label}</Badge>
                        </div>
                      </CardHeader>
                    </button>
                    {aberto && (
                      <CardContent className="px-4 pb-4 pt-0 space-y-3 text-sm">
                        {f.dados_chave && <div><p className="text-xs font-semibold text-muted-foreground">Dados-chave</p><p>{f.dados_chave}</p></div>}
                        {f.tipo_acesso && <div><p className="text-xs font-semibold text-muted-foreground">Tipo de acesso</p><p>{f.tipo_acesso}</p></div>}
                        {f.endpoint_url && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground">Endpoint / URL</p>
                            {url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1 break-all">
                                {f.endpoint_url} <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            ) : <p className="break-all">{f.endpoint_url}</p>}
                          </div>
                        )}
                        {f.autenticacao && <div><p className="text-xs font-semibold text-muted-foreground">Autenticação</p><p>{f.autenticacao}</p></div>}
                        {f.status_pesquisa && <div><p className="text-xs font-semibold text-muted-foreground">Status da pesquisa</p><p className="whitespace-pre-wrap">{f.status_pesquisa}</p></div>}
                        {f.proximo_passo && <div><p className="text-xs font-semibold text-muted-foreground">Próximo passo</p><p className="whitespace-pre-wrap">{f.proximo_passo}</p></div>}
                        {canEdit && (
                          <Button variant="outline" size="sm" onClick={() => abrirEdicao(f)}>
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Atualizar status / próximo passo
                          </Button>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{editando?.fonte}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cf-status">Status da pesquisa</Label>
              <Textarea id="cf-status" rows={5} value={editStatus} onChange={(e) => setEditStatus(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cf-proximo">Próximo passo</Label>
              <Textarea id="cf-proximo" rows={4} value={editProximo} onChange={(e) => setEditProximo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

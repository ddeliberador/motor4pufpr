import { useCallback, useEffect, useState } from "react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Plus, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type BuildLogEntry = {
  id: string;
  data: string;
  categoria: string;
  titulo: string;
  descricao: string | null;
  fonte: string | null;
  dificuldade: string | null;
  resolucao: string | null;
};

const CATEGORIAS = [
  { value: "fonte_de_dado", label: "Fonte de dado" },
  { value: "decisao_arquitetura", label: "Decisão de arquitetura" },
  { value: "obstaculo_institucional", label: "Obstáculo institucional" },
  { value: "correcao_bug", label: "Correção de bug" },
  { value: "integracao_externa", label: "Integração externa" },
];

const catLabel = (c: string) => CATEGORIAS.find((x) => x.value === c)?.label ?? c;

const catStyle: Record<string, string> = {
  fonte_de_dado: "bg-blue-600 text-white border-transparent",
  decisao_arquitetura: "bg-violet-600 text-white border-transparent",
  obstaculo_institucional: "bg-amber-600 text-white border-transparent",
  correcao_bug: "bg-rose-600 text-white border-transparent",
  integracao_externa: "bg-teal-600 text-white border-transparent",
};

const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export function BuildLogTab({ canEdit }: { canEdit: boolean }) {
  const [entries, setEntries] = useState<BuildLogEntry[]>([]);
  const [filter, setFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("build_log")
      .select("*")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setEntries((data ?? []) as BuildLogEntry[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addEntry = async (form: Omit<BuildLogEntry, "id">) => {
    const { data, error } = await supabase.from("build_log").insert(form).select().single();
    if (error) return toast.error(error.message);
    setEntries((p) => [data as BuildLogEntry, ...p]);
    toast.success("Entrada registrada no diário.");
  };

  const removeEntry = async (id: string) => {
    if (!confirm("Excluir esta entrada do diário?")) return;
    const { error } = await supabase.from("build_log").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setEntries((p) => p.filter((e) => e.id !== id));
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const M = 40;
      const W = doc.internal.pageSize.getWidth() - M * 2;
      const H = doc.internal.pageSize.getHeight();
      let y = M;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Diário de Construção do Artefato — Motor da Inovação", M, y);
      y += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(
        doc.splitTextToSize(
          "Registro metodológico de construção do artefato, organizado segundo a lógica da Design Science Research (DSR): cada entrada documenta a fonte de dado, a decisão de projeto, a dificuldade encontrada e a respectiva resolução ao longo dos ciclos de desenvolvimento e avaliação.",
          W,
        ),
        M,
        y,
      );
      y += 46;
      doc.setFontSize(8);
      doc.text(
        `Exportado em ${new Date().toLocaleDateString("pt-BR")} · ${sorted.length} entradas · PPGPP/UFPR`,
        M,
        y,
      );
      y += 18;

      const line = (label: string, value: string | null, bold = false) => {
        if (!value) return;
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(bold ? 10.5 : 9);
        const text = doc.splitTextToSize(label ? `${label}: ${value}` : value, W);
        const need = text.length * (bold ? 13 : 11);
        if (y + need > H - M) { doc.addPage(); y = M; }
        doc.text(text, M, y);
        y += need;
      };

      sorted.forEach((e, i) => {
        if (y > H - M - 60) { doc.addPage(); y = M; }
        y += 8;
        doc.setDrawColor(210);
        doc.line(M, y - 6, M + W, y - 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text(`${fmtDate(e.data)} · ${catLabel(e.categoria).toUpperCase()}`, M, y);
        y += 13;
        line("", `${i + 1}. ${e.titulo}`, true);
        y += 2;
        line("Descrição", e.descricao);
        line("Fonte", e.fonte);
        line("Dificuldade", e.dificuldade);
        line("Resolução", e.resolucao);
        y += 6;
      });

      doc.save("diario-de-construcao-motor-da-inovacao.pdf");
    } catch (err) {
      toast.error("Falha ao gerar o PDF.");
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const sorted = entries;
  const filtered = filter === "all" ? sorted : sorted.filter((e) => e.categoria === filter);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[240px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={exporting || sorted.length === 0}>
            <Download className="w-4 h-4" /> {exporting ? "Gerando…" : "Exportar para apêndice"}
          </Button>
          {canEdit && <EntryDialog onSubmit={addEntry} />}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        {filtered.length} de {sorted.length} entradas · registro auditável, leitura pública para fins de citação acadêmica.
      </p>

      <div className="relative pl-5 border-l border-border space-y-3">
        {filtered.map((e) => (
          <div key={e.id} className="relative">
            <span className="absolute -left-[26px] top-4 w-2.5 h-2.5 rounded-full bg-border ring-4 ring-background" />
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{fmtDate(e.data)}</span>
                      <Badge className={cn("text-[10px]", catStyle[e.categoria])}>{catLabel(e.categoria)}</Badge>
                    </div>
                    <div className="font-semibold mt-1.5">{e.titulo}</div>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeEntry(e.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {e.descricao && <p className="text-sm text-muted-foreground mt-2">{e.descricao}</p>}
                <div className="mt-3 space-y-1.5 text-xs">
                  {e.fonte && <Field label="Fonte" value={e.fonte} />}
                  {e.dificuldade && <Field label="Dificuldade" value={e.dificuldade} />}
                  {e.resolucao && <Field label="Resolução" value={e.resolucao} />}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-6">Nenhuma entrada nesta categoria.</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-semibold text-muted-foreground shrink-0">{label}:</span>
      <span className="text-muted-foreground/90">{value}</span>
    </div>
  );
}

function EntryDialog({ onSubmit }: { onSubmit: (e: Omit<BuildLogEntry, "id">) => void }) {
  const [open, setOpen] = useState(false);
  const empty = {
    data: new Date().toISOString().slice(0, 10),
    categoria: "fonte_de_dado",
    titulo: "",
    descricao: "",
    fonte: "",
    dificuldade: "",
    resolucao: "",
  };
  const [form, setForm] = useState(empty);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> Nova entrada</Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova entrada no diário</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          <div><Label>Fonte</Label><Input value={form.fonte} onChange={(e) => setForm({ ...form, fonte: e.target.value })} /></div>
          <div><Label>Dificuldade</Label><Textarea value={form.dificuldade} onChange={(e) => setForm({ ...form, dificuldade: e.target.value })} /></div>
          <div><Label>Resolução</Label><Textarea value={form.resolucao} onChange={(e) => setForm({ ...form, resolucao: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!form.titulo || !form.data) return toast.error("Data e título são obrigatórios.");
              onSubmit({
                data: form.data,
                categoria: form.categoria,
                titulo: form.titulo,
                descricao: form.descricao || null,
                fonte: form.fonte || null,
                dificuldade: form.dificuldade || null,
                resolucao: form.resolucao || null,
              });
              setOpen(false);
              setForm(empty);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { Trash2, Pencil, Mail, Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface Feedback {
  id: string;
  created_at: string;
  type: "duvida" | "correcao" | "sugestao";
  message: string;
  context_query: string | null;
  context_persona: string | null;
  email: string | null;
  status: "novo" | "em_analise" | "publicado" | "arquivado";
  faq_question: string | null;
  faq_answer: string | null;
}

const STATUS_LABEL: Record<Feedback["status"], string> = {
  novo: "Novo", em_analise: "Em análise", publicado: "Publicado", arquivado: "Arquivado",
};
const statusBadge = (s: string) => {
  if (s === "publicado") return "bg-green-600 text-white";
  if (s === "em_analise") return "bg-amber-500 text-white";
  if (s === "novo") return "bg-blue-600 text-white";
  return "bg-muted text-muted-foreground";
};
const TYPE_LABEL: Record<Feedback["type"], string> = {
  duvida: "Dúvida", correcao: "Correção de dado", sugestao: "Sugestão",
};
const PERSONA_LABEL: Record<string, string> = {
  pesquisador: "Pesquisador", universidade: "Universidade", empresa: "Empresa", governo: "Governo",
};

export function FeedbackTab({ onNewCountChange }: { onNewCountChange?: (n: number) => void }) {
  const [items, setItems] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("community_feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Erro ao carregar sugestões"); return; }
    const rows = (data as Feedback[]) || [];
    setItems(rows);
    onNewCountChange?.(rows.filter((r) => r.status === "novo").length);
  }, [onNewCountChange]);

  useEffect(() => { load(); }, [load]);

  const update = async (id: string, patch: Partial<Feedback>) => {
    const { error } = await supabase.from("community_feedback").update(patch).eq("id", id);
    if (error) { toast.error("Erro ao salvar"); return false; }
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, ...patch } : i));
      onNewCountChange?.(next.filter((r) => r.status === "novo").length);
      return next;
    });
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("community_feedback").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      onNewCountChange?.(next.filter((r) => r.status === "novo").length);
      return next;
    });
  };

  const visible = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as Feedback["status"][]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {items.length} recebidas · {items.filter((i) => i.status === "novo").length} novas · {items.filter((i) => i.status === "publicado").length} publicadas no FAQ
        </p>
      </div>

      {visible.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma sugestão neste filtro.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {visible.map((f) => (
            <Card key={f.id} className={cn(f.status === "novo" && "border-l-4 border-l-blue-600")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{TYPE_LABEL[f.type]}</Badge>
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", statusBadge(f.status))}>{STATUS_LABEL[f.status]}</span>
                    <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={f.status} onValueChange={(v) => update(f.id, { status: v as Feedback["status"] })}>
                      <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABEL) as Feedback["status"][]).map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FaqEditDialog item={f} onSave={(patch) => update(f.id, patch)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(f.id)} aria-label="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm mt-3 whitespace-pre-line">{f.message}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                  {f.context_query && (
                    <span className="inline-flex items-center gap-1"><SearchIcon className="w-3 h-3" /> Tema: <strong className="text-foreground">{f.context_query}</strong></span>
                  )}
                  {f.context_persona && <span>Perspectiva: {PERSONA_LABEL[f.context_persona] || f.context_persona}</span>}
                  {f.email && (
                    <a href={`mailto:${f.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail className="w-3 h-3" /> {f.email}</a>
                  )}
                </div>

                {(f.faq_question || f.faq_answer) && (
                  <div className="mt-3 rounded-md bg-muted/50 p-3 text-xs space-y-1">
                    <p><span className="font-semibold">Pergunta FAQ:</span> {f.faq_question || <em className="text-muted-foreground">não definida</em>}</p>
                    <p className="whitespace-pre-line"><span className="font-semibold">Resposta:</span> {f.faq_answer || <em className="text-muted-foreground">não definida</em>}</p>
                    {f.status === "publicado" && (!f.faq_question || !f.faq_answer) && (
                      <p className="text-amber-600">Só aparece no FAQ público quando pergunta e resposta estiverem preenchidas.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FaqEditDialog({ item, onSave }: { item: Feedback; onSave: (p: Partial<Feedback>) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(item.faq_question || "");
  const [a, setA] = useState(item.faq_answer || "");
  const [status, setStatus] = useState<Feedback["status"]>(item.status);

  useEffect(() => {
    if (open) { setQ(item.faq_question || ""); setA(item.faq_answer || ""); setStatus(item.status); }
  }, [open, item]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8"><Pencil className="w-3.5 h-3.5 mr-1" /> FAQ</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Preparar entrada do FAQ</DialogTitle></DialogHeader>
        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground whitespace-pre-line max-h-32 overflow-auto">
          <span className="font-semibold text-foreground">Mensagem original:</span> {item.message}
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Pergunta (reescrita para publicação)</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: Por que a busca por X retorna poucos resultados?" />
          </div>
          <div className="space-y-1.5">
            <Label>Resposta</Label>
            <Textarea value={a} onChange={(e) => setA(e.target.value)} rows={6} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Feedback["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as Feedback["status"][]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={async () => {
              const ok = await onSave({ faq_question: q.trim() || null, faq_answer: a.trim() || null, status });
              if (ok) { toast.success("Salvo"); setOpen(false); }
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

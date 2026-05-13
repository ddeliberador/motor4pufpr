import { useEffect, useState, useRef } from "react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { FileText, FileType, Trash2, Upload, BookOpenCheck } from "lucide-react";
import { toast } from "sonner";
import { DocumentReader } from "./DocumentReader";

type Doc = {
  id: string;
  title: string;
  file_path: string;
  file_type: "pdf" | "md";
  citation_authors: string | null;
  citation_year: number | null;
  citation_title: string | null;
  citation_publisher: string | null;
  citation_doi: string | null;
};

export function AuthorDocumentsPanel({
  authorId,
  authorName,
  userId,
}: {
  authorId: string;
  authorName: string;
  userId: string;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [openDoc, setOpenDoc] = useState<Doc | null>(null);

  const load = async () => {
    const { data } = await supabase.from("research_documents").select("*").eq("author_id", authorId).order("created_at");
    setDocs((data ?? []) as Doc[]);
  };

  useEffect(() => { load(); }, [authorId]);

  const deleteDoc = async (d: Doc) => {
    if (!confirm("Excluir este documento e todos os destaques?")) return;
    await supabase.storage.from("research-docs").remove([d.file_path]);
    await supabase.from("research_documents").delete().eq("id", d.id);
    setDocs((p) => p.filter((x) => x.id !== d.id));
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Documentos ({docs.length})</span>
        <UploadDialog authorId={authorId} authorName={authorName} userId={userId} onUploaded={load} />
      </div>
      <div className="space-y-1">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center gap-2 text-xs group">
            {d.file_type === "pdf" ? <FileText className="w-3 h-3 text-red-500 shrink-0" /> : <FileType className="w-3 h-3 text-blue-500 shrink-0" />}
            <button className="flex-1 text-left truncate hover:underline" onClick={() => setOpenDoc(d)}>
              {d.title}
            </button>
            <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => setOpenDoc(d)}>
              <BookOpenCheck className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => deleteDoc(d)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
      <DocumentReader doc={openDoc} userId={userId} onClose={() => setOpenDoc(null)} />
    </div>
  );
}

function UploadDialog({
  authorId,
  authorName,
  userId,
  onUploaded,
}: {
  authorId: string;
  authorName: string;
  userId: string;
  onUploaded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    citation_authors: authorName,
    citation_year: "",
    citation_title: "",
    citation_publisher: "",
    citation_doi: "",
  });

  const submit = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error("Selecione um arquivo");
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "pdf" && ext !== "md") return toast.error("Apenas PDF ou MD");
    if (file.size > 25 * 1024 * 1024) return toast.error("Máx. 25 MB");

    setBusy(true);
    const path = `${userId}/${authorId}/${Date.now()}_${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("research-docs").upload(path, file);
    if (upErr) { setBusy(false); return toast.error(upErr.message); }

    const { error } = await supabase.from("research_documents").insert({
      user_id: userId,
      author_id: authorId,
      title: form.title || file.name,
      file_path: path,
      file_type: ext as "pdf" | "md",
      citation_authors: form.citation_authors || null,
      citation_year: form.citation_year ? parseInt(form.citation_year) : null,
      citation_title: form.citation_title || null,
      citation_publisher: form.citation_publisher || null,
      citation_doi: form.citation_doi || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Documento adicionado");
    setOpen(false);
    setForm({ title: "", citation_authors: authorName, citation_year: "", citation_title: "", citation_publisher: "", citation_doi: "" });
    onUploaded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"><Upload className="w-3 h-3 mr-1" />Anexar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Anexar PDF ou Markdown</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Arquivo (.pdf ou .md, até 25 MB)</Label>
            <Input ref={fileRef} type="file" accept=".pdf,.md,application/pdf,text/markdown" />
          </div>
          <div>
            <Label>Título de exibição</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: National Systems of Innovation" />
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Referência bibliográfica</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Autor(es)</Label>
                <Input value={form.citation_authors} onChange={(e) => setForm({ ...form, citation_authors: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Ano</Label>
                <Input type="number" value={form.citation_year} onChange={(e) => setForm({ ...form, citation_year: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">DOI</Label>
                <Input value={form.citation_doi} onChange={(e) => setForm({ ...form, citation_doi: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Título da obra</Label>
                <Input value={form.citation_title} onChange={(e) => setForm({ ...form, citation_title: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Editora / Periódico</Label>
                <Input value={form.citation_publisher} onChange={(e) => setForm({ ...form, citation_publisher: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>{busy ? "Enviando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

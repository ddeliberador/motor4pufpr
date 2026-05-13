import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import ReactMarkdown from "react-markdown";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Trash2, Download, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

type Highlight = {
  id: string;
  color: string;
  text: string;
  note: string | null;
  page: number | null;
  created_at: string;
};

const COLORS = [
  { id: "yellow", bg: "bg-yellow-200", ring: "ring-yellow-500" },
  { id: "green", bg: "bg-green-200", ring: "ring-green-500" },
  { id: "blue", bg: "bg-blue-200", ring: "ring-blue-500" },
  { id: "pink", bg: "bg-pink-200", ring: "ring-pink-500" },
];

function buildCitation(d: Doc) {
  const parts: string[] = [];
  if (d.citation_authors) parts.push(d.citation_authors.toUpperCase() + ".");
  if (d.citation_title) parts.push(d.citation_title + ".");
  if (d.citation_publisher) parts.push(d.citation_publisher + ",");
  if (d.citation_year) parts.push(String(d.citation_year) + ".");
  if (d.citation_doi) parts.push("DOI: " + d.citation_doi);
  return parts.join(" ").trim() || d.title;
}

export function DocumentReader({
  doc,
  userId,
  onClose,
}: {
  doc: Doc | null;
  userId: string;
  onClose: () => void;
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [mdContent, setMdContent] = useState<string>("");
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [color, setColor] = useState("yellow");
  const [pendingNote, setPendingNote] = useState<string>("");
  const [pendingHighlightId, setPendingHighlightId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doc) {
      setFileUrl(null);
      setMdContent("");
      setHighlights([]);
      return;
    }
    (async () => {
      const { data } = await supabase.storage.from("research-docs").createSignedUrl(doc.file_path, 3600);
      if (data?.signedUrl) {
        if (doc.file_type === "md") {
          const txt = await fetch(data.signedUrl).then((r) => r.text());
          setMdContent(txt);
        } else {
          setFileUrl(data.signedUrl);
        }
      }
      const { data: hl } = await supabase
        .from("research_highlights")
        .select("*")
        .eq("document_id", doc.id)
        .order("created_at");
      setHighlights((hl ?? []) as Highlight[]);
    })();
  }, [doc]);

  const captureSelection = useCallback(async () => {
    if (!doc) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (!text || text.length < 2) return;
    const { data, error } = await supabase
      .from("research_highlights")
      .insert({
        user_id: userId,
        document_id: doc.id,
        color,
        text,
        page: doc.file_type === "pdf" ? page : null,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setHighlights((p) => [...p, data as Highlight]);
    setPendingHighlightId((data as Highlight).id);
    setPendingNote("");
    sel.removeAllRanges();
    toast.success("Destaque salvo");
  }, [doc, userId, color, page]);

  const saveNote = async () => {
    if (!pendingHighlightId) return;
    await supabase.from("research_highlights").update({ note: pendingNote || null }).eq("id", pendingHighlightId);
    setHighlights((p) => p.map((h) => (h.id === pendingHighlightId ? { ...h, note: pendingNote || null } : h)));
    setPendingHighlightId(null);
    setPendingNote("");
  };

  const deleteHighlight = async (id: string) => {
    await supabase.from("research_highlights").delete().eq("id", id);
    setHighlights((p) => p.filter((h) => h.id !== id));
  };

  const exportMarkdown = () => {
    if (!doc) return;
    const lines: string[] = [];
    lines.push(`# Destaques — ${doc.title}\n`);
    lines.push(`> ${buildCitation(doc)}\n`);
    highlights.forEach((h, i) => {
      lines.push(`\n## ${i + 1}. ${h.color.toUpperCase()}${h.page ? ` · p. ${h.page}` : ""}`);
      lines.push(`\n> ${h.text.replace(/\n/g, "\n> ")}\n`);
      if (h.note) lines.push(`\n*${h.note}*\n`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${doc.title.replace(/[^\w]+/g, "_")}_destaques.md`;
    a.click();
  };

  const exportBibtex = () => {
    if (!doc) return;
    const key = (doc.citation_authors || "ref").split(/[\s,]+/)[0].toLowerCase() + (doc.citation_year || "");
    const bib = `@book{${key},
  author    = {${doc.citation_authors || ""}},
  title     = {${doc.citation_title || doc.title}},
  publisher = {${doc.citation_publisher || ""}},
  year      = {${doc.citation_year || ""}},
  doi       = {${doc.citation_doi || ""}}
}`;
    const blob = new Blob([bib], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${key}.bib`;
    a.click();
  };

  if (!doc) return null;

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] p-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base truncate">{doc.title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={exportMarkdown}><Download className="w-3 h-3 mr-1" />MD</Button>
              <Button size="sm" variant="outline" onClick={exportBibtex}><Download className="w-3 h-3 mr-1" />BibTeX</Button>
              <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex min-h-0">
          {/* Reader pane */}
          <div className="flex-1 flex flex-col min-w-0 border-r">
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
              <span className="text-xs text-muted-foreground mr-2">Cor do destaque:</span>
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={cn("w-6 h-6 rounded-full ring-offset-2", c.bg, color === c.id && "ring-2", c.ring)}
                  aria-label={c.id}
                />
              ))}
              <Button size="sm" variant="default" className="ml-auto" onClick={captureSelection}>
                Destacar seleção
              </Button>
              {doc.file_type === "pdf" && numPages > 0 && (
                <div className="flex items-center gap-1 ml-2">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-mono">{page}/{numPages}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPage((p) => Math.min(numPages, p + 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div ref={containerRef} className="p-6 flex justify-center">
                {doc.file_type === "pdf" && fileUrl && (
                  <Document file={fileUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                    <Page pageNumber={page} width={Math.min(900, (containerRef.current?.clientWidth ?? 800) - 40)} />
                  </Document>
                )}
                {doc.file_type === "md" && (
                  <article className="prose prose-sm dark:prose-invert max-w-3xl">
                    <ReactMarkdown>{mdContent}</ReactMarkdown>
                  </article>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Highlights pane */}
          <aside className="w-[340px] shrink-0 flex flex-col bg-muted/20">
            <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Destaques ({highlights.length})
            </div>
            {pendingHighlightId && (
              <div className="p-3 border-b bg-background">
                <Textarea
                  placeholder="Adicionar nota ao destaque…"
                  value={pendingNote}
                  onChange={(e) => setPendingNote(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <div className="flex gap-2 mt-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => { setPendingHighlightId(null); setPendingNote(""); }}>Pular</Button>
                  <Button size="sm" onClick={saveNote}>Salvar nota</Button>
                </div>
              </div>
            )}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {highlights.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Selecione texto no documento e clique em "Destacar seleção".
                  </p>
                )}
                {highlights.map((h) => {
                  const c = COLORS.find((x) => x.id === h.color)!;
                  return (
                    <div key={h.id} className="border rounded-md p-2 bg-background">
                      <div className="flex items-start gap-2">
                        <span className={cn("inline-block w-2 h-2 rounded-full mt-1.5 shrink-0", c.bg)} />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm leading-snug", c.bg, "px-1 rounded")}>{h.text}</p>
                          {h.note && <p className="text-xs italic text-muted-foreground mt-1">{h.note}</p>}
                          {h.page && <Badge variant="outline" className="mt-1 text-[10px]">p. {h.page}</Badge>}
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteHighlight(h.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

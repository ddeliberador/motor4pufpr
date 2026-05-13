import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Plus, Trash2, LogOut, BookOpen, Lightbulb, FileText } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { cn } from "@/lib/utils";

type Author = { id: string; name: string; main_work: string | null; thematic_area: string | null; status: string; notes: string | null };
type Theme = { id: string; name: string; keywords: string | null; progress: number; notes: string | null };
type Article = { id: string; title: string; venue: string | null; status: string; due_date: string | null; notes: string | null };

const AUTHOR_SEED: Omit<Author, "id">[] = [
  { name: "Lundvall", main_work: "National Systems of Innovation (1992)", thematic_area: "SNI clássico", status: "pending", notes: null },
  { name: "Nelson", main_work: "National Innovation Systems (1993)", thematic_area: "SNI clássico", status: "pending", notes: null },
  { name: "Freeman", main_work: "Technology Policy and Economic Performance", thematic_area: "SNI clássico", status: "pending", notes: null },
  { name: "Carlota Perez", main_work: "Technological Revolutions and Financial Capital", thematic_area: "SNI clássico", status: "pending", notes: null },
  { name: "Pavitt", main_work: "Sectoral patterns of technical change", thematic_area: "SNI clássico", status: "pending", notes: null },
  { name: "Cassiolato", main_work: "SNI Brasil — fragmentação e descoordenação", thematic_area: "SNI Brasil", status: "pending", notes: null },
  { name: "Suzigan", main_work: "Política industrial e sistemas de inovação", thematic_area: "SNI Brasil", status: "pending", notes: null },
  { name: "Eduardo Albuquerque", main_work: "Science and technology in catching-up countries", thematic_area: "SNI Brasil", status: "pending", notes: null },
  { name: "Renato Garcia", main_work: "Sistemas locais de inovação", thematic_area: "SNI Brasil", status: "pending", notes: null },
];

const THEME_SEED: Omit<Theme, "id">[] = [
  { name: "Sistemas Nacionais de Inovação", keywords: "NIS, SNI, coordenação, integração", progress: 10, notes: null },
  { name: "Fragmentação do SNI brasileiro", keywords: "descoordenação, política industrial, gargalos", progress: 5, notes: null },
  { name: "Política industrial + SNI", keywords: "Nova Indústria, PBIA, BNDES", progress: 5, notes: null },
  { name: "Motor 4P como protótipo de coordenação", keywords: "APIs públicas, dados abertos, coordenação digital", progress: 20, notes: null },
];

const ARTICLE_SEED: Omit<Article, "id">[] = [
  { title: "Artigo a definir — Evento 2025", venue: "a definir", status: "idea", due_date: null, notes: null },
];

const AUTHOR_NEXT: Record<string, string> = { pending: "reading", reading: "done", done: "pending" };
const ARTICLE_NEXT: Record<string, string> = { idea: "in_progress", in_progress: "submitted", submitted: "published", published: "idea" };

const authorBorder = (s: string) =>
  s === "done" ? "border-l-4 border-l-[hsl(var(--success,142_76%_36%))]"
  : s === "reading" ? "border-l-4 border-l-amber-500"
  : "border-l-4 border-l-muted-foreground/40";

const articleBadge = (s: string) => {
  if (s === "published") return "bg-green-600 text-white";
  if (s === "submitted") return "bg-blue-600 text-white";
  if (s === "in_progress") return "bg-amber-500 text-white";
  return "bg-muted text-muted-foreground";
};

const articleLabel: Record<string, string> = { idea: "Ideia", in_progress: "Em andamento", submitted: "Submetido", published: "Publicado" };
const authorLabel: Record<string, string> = { pending: "Pendente", reading: "Lendo", done: "Lido" };
const ARTICLE_ORDER: Record<string, number> = { published: 0, submitted: 1, in_progress: 2, idea: 3 };

export default function GestaoPesquisa() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [areaFilter, setAreaFilter] = useState<string>("all");

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [a, t, ar] = await Promise.all([
      supabase.from("research_authors").select("*").order("created_at"),
      supabase.from("research_themes").select("*").order("created_at"),
      supabase.from("research_articles").select("*").order("created_at"),
    ]);
    let auth = (a.data ?? []) as Author[];
    let th = (t.data ?? []) as Theme[];
    let ar2 = (ar.data ?? []) as Article[];

    // Seed if empty
    if (auth.length === 0) {
      const { data } = await supabase.from("research_authors").insert(
        AUTHOR_SEED.map((s) => ({ ...s, user_id: user.id }))
      ).select();
      auth = (data ?? []) as Author[];
    }
    if (th.length === 0) {
      const { data } = await supabase.from("research_themes").insert(
        THEME_SEED.map((s) => ({ ...s, user_id: user.id }))
      ).select();
      th = (data ?? []) as Theme[];
    }
    if (ar2.length === 0) {
      const { data } = await supabase.from("research_articles").insert(
        ARTICLE_SEED.map((s) => ({ ...s, user_id: user.id }))
      ).select();
      ar2 = (data ?? []) as Article[];
    }
    setAuthors(auth);
    setThemes(th);
    setArticles(ar2);
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // ---------- Author handlers ----------
  const cycleAuthor = async (a: Author) => {
    const next = AUTHOR_NEXT[a.status] ?? "pending";
    await supabase.from("research_authors").update({ status: next }).eq("id", a.id);
    setAuthors((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: next } : x)));
  };
  const deleteAuthor = async (id: string) => {
    if (!confirm("Excluir este autor?")) return;
    await supabase.from("research_authors").delete().eq("id", id);
    setAuthors((prev) => prev.filter((x) => x.id !== id));
  };
  const addAuthor = async (data: Omit<Author, "id">) => {
    if (!user) return;
    const { data: row, error } = await supabase.from("research_authors").insert({ ...data, user_id: user.id }).select().single();
    if (error) return toast.error(error.message);
    setAuthors((p) => [...p, row as Author]);
  };

  // ---------- Theme handlers ----------
  const updateThemeProgress = async (id: string, progress: number) => {
    setThemes((p) => p.map((t) => (t.id === id ? { ...t, progress } : t)));
    await supabase.from("research_themes").update({ progress }).eq("id", id);
  };
  const deleteTheme = async (id: string) => {
    if (!confirm("Excluir este tema?")) return;
    await supabase.from("research_themes").delete().eq("id", id);
    setThemes((p) => p.filter((x) => x.id !== id));
  };
  const addTheme = async (data: Omit<Theme, "id">) => {
    if (!user) return;
    const { data: row, error } = await supabase.from("research_themes").insert({ ...data, user_id: user.id }).select().single();
    if (error) return toast.error(error.message);
    setThemes((p) => [...p, row as Theme]);
  };

  // ---------- Article handlers ----------
  const cycleArticle = async (a: Article) => {
    const next = ARTICLE_NEXT[a.status] ?? "idea";
    await supabase.from("research_articles").update({ status: next }).eq("id", a.id);
    setArticles((p) => p.map((x) => (x.id === a.id ? { ...x, status: next } : x)));
  };
  const deleteArticle = async (id: string) => {
    if (!confirm("Excluir esta produção?")) return;
    await supabase.from("research_articles").delete().eq("id", id);
    setArticles((p) => p.filter((x) => x.id !== id));
  };
  const addArticle = async (data: Omit<Article, "id">) => {
    if (!user) return;
    const { data: row, error } = await supabase.from("research_articles").insert({ ...data, user_id: user.id }).select().single();
    if (error) return toast.error(error.message);
    setArticles((p) => [...p, row as Article]);
  };

  const areas = Array.from(new Set(authors.map((a) => a.thematic_area).filter(Boolean))) as string[];
  const filteredAuthors = areaFilter === "all" ? authors : authors.filter((a) => a.thematic_area === areaFilter);
  const sortedArticles = [...articles].sort((a, b) => (ARTICLE_ORDER[a.status] ?? 9) - (ARTICLE_ORDER[b.status] ?? 9));

  const metrics = {
    totalAuthors: authors.length,
    doneAuthors: authors.filter((a) => a.status === "done").length,
    totalArticles: articles.length,
    publishedArticles: articles.filter((a) => a.status === "published").length,
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-wide pt-24 pb-16 max-w-6xl mx-auto px-4">
        {/* Section header */}
        <div className="border border-border rounded-lg p-6 mb-6 bg-card">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Gestão da Pesquisa</h1>
              <p className="text-sm text-muted-foreground mt-1">
                PPGPP · UFPR · Tecnologia, Regulação e Sociedade · 2025–2029
              </p>
              <p className="text-xs text-muted-foreground mt-2">{user.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <MetricCard label="Autores cadastrados" value={metrics.totalAuthors} />
            <MetricCard label="Autores lidos" value={metrics.doneAuthors} />
            <MetricCard label="Total de produções" value={metrics.totalArticles} />
            <MetricCard label="Publicadas" value={metrics.publishedArticles} />
          </div>
        </div>

        <Tabs defaultValue="authors">
          <TabsList>
            <TabsTrigger value="authors"><BookOpen className="w-4 h-4 mr-1" /> Autores</TabsTrigger>
            <TabsTrigger value="themes"><Lightbulb className="w-4 h-4 mr-1" /> Temas</TabsTrigger>
            <TabsTrigger value="articles"><FileText className="w-4 h-4 mr-1" /> Artigos</TabsTrigger>
          </TabsList>

          {/* AUTHORS */}
          <TabsContent value="authors" className="mt-4">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Área temática" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as áreas</SelectItem>
                  {areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <AuthorDialog onSubmit={addAuthor} />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAuthors.map((a) => (
                <Card key={a.id} className={cn("cursor-pointer transition hover:bg-muted/30", authorBorder(a.status))} onClick={() => cycleAuthor(a)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{a.name}</div>
                        {a.thematic_area && <div className="text-xs text-muted-foreground mt-0.5">{a.thematic_area}</div>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); deleteAuthor(a.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {a.main_work && <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{a.main_work}</p>}
                    {a.notes && <p className="text-xs mt-2 text-muted-foreground/80 italic line-clamp-2">{a.notes}</p>}
                    <Badge variant="outline" className="mt-3 text-xs">{authorLabel[a.status]}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* THEMES */}
          <TabsContent value="themes" className="mt-4">
            <div className="flex justify-end mb-4">
              <ThemeDialog onSubmit={addTheme} />
            </div>
            <div className="space-y-3">
              {themes.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{t.name}</div>
                        {t.keywords && <div className="text-xs text-muted-foreground mt-1">{t.keywords}</div>}
                        {t.notes && <div className="text-xs text-muted-foreground/80 mt-2 italic">{t.notes}</div>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTheme(t.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Slider
                        value={[t.progress]}
                        onValueChange={(v) => updateThemeProgress(t.id, v[0])}
                        min={0} max={100} step={5}
                        className="flex-1"
                      />
                      <Progress value={t.progress} className="w-32 h-2" />
                      <span className="text-xs font-mono w-10 text-right">{t.progress}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ARTICLES */}
          <TabsContent value="articles" className="mt-4">
            <div className="flex justify-end mb-4">
              <ArticleDialog onSubmit={addArticle} />
            </div>
            <div className="space-y-2">
              {sortedArticles.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{a.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {a.venue || "—"} {a.due_date && `· ${new Date(a.due_date).toLocaleDateString("pt-BR")}`}
                      </div>
                      {a.notes && <div className="text-xs text-muted-foreground/80 mt-1 italic">{a.notes}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => cycleArticle(a)} className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", articleBadge(a.status))}>
                        {articleLabel[a.status]}
                      </button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteArticle(a.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function AuthorDialog({ onSubmit }: { onSubmit: (a: Omit<Author, "id">) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", main_work: "", thematic_area: "", status: "pending", notes: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> Adicionar autor</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo autor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Obra principal</Label><Input value={form.main_work} onChange={(e) => setForm({ ...form, main_work: e.target.value })} /></div>
          <div><Label>Área temática</Label><Input value={form.thematic_area} onChange={(e) => setForm({ ...form, thematic_area: e.target.value })} /></div>
          <div><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => { if (!form.name) return; onSubmit({ ...form, main_work: form.main_work || null, thematic_area: form.thematic_area || null, notes: form.notes || null }); setOpen(false); setForm({ name: "", main_work: "", thematic_area: "", status: "pending", notes: "" }); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThemeDialog({ onSubmit }: { onSubmit: (t: Omit<Theme, "id">) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", keywords: "", progress: 0, notes: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> Adicionar tema</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo tema</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Palavras-chave</Label><Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} /></div>
          <div><Label>Progresso ({form.progress}%)</Label><Slider value={[form.progress]} onValueChange={(v) => setForm({ ...form, progress: v[0] })} min={0} max={100} step={5} /></div>
          <div><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => { if (!form.name) return; onSubmit({ ...form, keywords: form.keywords || null, notes: form.notes || null }); setOpen(false); setForm({ name: "", keywords: "", progress: 0, notes: "" }); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArticleDialog({ onSubmit }: { onSubmit: (a: Omit<Article, "id">) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", venue: "", status: "idea", due_date: "", notes: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> Adicionar produção</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova produção</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Venue / evento</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="idea">Ideia</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="submitted">Submetido</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          <div><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => { if (!form.title) return; onSubmit({ ...form, venue: form.venue || null, due_date: form.due_date || null, notes: form.notes || null }); setOpen(false); setForm({ title: "", venue: "", status: "idea", due_date: "", notes: "" }); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

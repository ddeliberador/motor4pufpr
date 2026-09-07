import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { HelpCircle, AlertTriangle, Lightbulb, Search, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type FaqType = "duvida" | "correcao" | "sugestao";
interface FaqEntry { id: string; type: FaqType; faq_question: string; faq_answer: string; created_at: string }

const TYPE_META: Record<FaqType, { label: string; icon: typeof HelpCircle; desc: string }> = {
  duvida: { label: "Dúvidas", icon: HelpCircle, desc: "Perguntas frequentes sobre o funcionamento do Motor da Inovação." },
  correcao: { label: "Correções de dados", icon: AlertTriangle, desc: "Esclarecimentos sobre dados, fontes e limitações identificadas pela comunidade." },
  sugestao: { label: "Sugestões", icon: Lightbulb, desc: "Melhorias propostas pela comunidade e o que foi feito a respeito." },
};
const TYPE_ORDER: FaqType[] = ["duvida", "correcao", "sugestao"];

export default function Faq() {
  const [params] = useSearchParams();
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [type, setType] = useState<FaqType>("sugestao");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = "FAQ e Sugestões | Motor da Inovação";
    (async () => {
      const { data, error } = await supabase
        .from("faq_public")
        .select("id,type,faq_question,faq_answer,created_at")
        .order("created_at", { ascending: false });
      if (error) toast.error("Não foi possível carregar o FAQ.");
      setEntries((data as FaqEntry[]) || []);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? entries.filter((e) => `${e.faq_question} ${e.faq_answer}`.toLowerCase().includes(q))
      : entries;
    return TYPE_ORDER.map((t) => ({ type: t, items: filtered.filter((e) => e.type === t) })).filter((g) => g.items.length > 0);
  }, [entries, search]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) { toast.error("Escreva uma mensagem um pouco mais detalhada."); return; }
    setSending(true);
    const context_query = params.get("q") || sessionStorage.getItem("motor4p_query") || null;
    const context_persona = params.get("persona") || sessionStorage.getItem("motor4p_persona") || null;
    const { error } = await supabase.from("community_feedback").insert({
      type,
      message: message.trim(),
      email: email.trim() || null,
      context_query,
      context_persona,
    });
    setSending(false);
    if (error) { toast.error("Não foi possível enviar. Tente novamente."); return; }
    setSent(true);
    setMessage(""); setEmail("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="panel-container flex-1 pt-24 pb-12 md:pt-28">
        <div className="max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Base de conhecimento e sugestões</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Respostas às dúvidas mais comuns, correções de dados reportadas e melhorias propostas pela comunidade.
            O Motor da Inovação é um projeto aberto: sua contribuição ajuda a aprimorar a ferramenta.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8 mt-8 items-start">
          <section>
            <div className="relative mb-6">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar no FAQ…" className="pl-9" aria-label="Buscar no FAQ" />
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : grouped.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
                {entries.length === 0
                  ? "Ainda não há entradas publicadas. Envie a primeira dúvida ou sugestão ao lado."
                  : "Nenhuma entrada corresponde à sua busca."}
              </CardContent></Card>
            ) : (
              <div className="space-y-8">
                {grouped.map(({ type: t, items }) => {
                  const Icon = TYPE_META[t].icon;
                  return (
                    <div key={t}>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-primary" />
                        <h2 className="text-lg font-semibold">{TYPE_META[t].label}</h2>
                        <span className="text-xs text-muted-foreground">({items.length})</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{TYPE_META[t].desc}</p>
                      <div className="space-y-3">
                        {items.map((e) => (
                          <details key={e.id} className="group rounded-lg border border-border bg-card p-4">
                            <summary className="cursor-pointer font-medium text-sm list-none flex justify-between gap-3">
                              <span>{e.faq_question}</span>
                              <span className="text-muted-foreground group-open:rotate-180 transition-transform">⌄</span>
                            </summary>
                            <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">{e.faq_answer}</p>
                            <p className="mt-2 text-[11px] text-muted-foreground/70">
                              Publicado em {new Date(e.created_at).toLocaleDateString("pt-BR")}
                            </p>
                          </details>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="lg:sticky lg:top-24">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Send className="w-4 h-4" /> Enviar dúvida, correção ou sugestão</CardTitle>
              </CardHeader>
              <CardContent>
                {sent ? (
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-primary mb-3" />
                    <p className="font-medium">Recebemos sua sugestão, obrigado!</p>
                    <p className="text-xs text-muted-foreground mt-1">As contribuições são analisadas e, quando pertinentes, publicadas nesta página.</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setSent(false)}>Enviar outra</Button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="fb-type">Tipo</Label>
                      <Select value={type} onValueChange={(v) => setType(v as FaqType)}>
                        <SelectTrigger id="fb-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="duvida">Dúvida</SelectItem>
                          <SelectItem value="correcao">Correção de dado</SelectItem>
                          <SelectItem value="sugestao">Sugestão</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="fb-msg">Mensagem</Label>
                      <Textarea id="fb-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={4000} required
                        placeholder="Descreva sua dúvida, o dado que parece incorreto ou a melhoria que gostaria de ver." />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="fb-email">E-mail <span className="text-muted-foreground font-normal">(opcional — só se quiser resposta)</span></Label>
                      <Input id="fb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.br" />
                    </div>
                    <Button type="submit" className="w-full" disabled={sending}>{sending ? "Enviando…" : "Enviar"}</Button>
                    <p className="text-[11px] text-muted-foreground">
                      Sua mensagem e e-mail são visíveis apenas ao mantenedor do projeto. Nada é publicado sem revisão.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}

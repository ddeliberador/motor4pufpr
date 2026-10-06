import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetchAll";

interface Ator { id: string; nome: string; tipo: string; municipio: string | null; uf: string | null }

// Categorias com as mesmas cores dos gráficos da Análise.
export const CATEGORIAS = [
  { id: "universidade", nome: "Universidades", cor: "#34d399", icone: "school", re: /universidade/i },
  { id: "ict", nome: "ICTs", cor: "#60a5fa", icone: "biotech", re: /\bICT\b|ciência e tecnologia/i },
  { id: "instituto", nome: "Institutos", cor: "#a78bfa", icone: "account_balance", re: /instituto|INCT/i },
  { id: "startup", nome: "Startups", cor: "#f472b6", icone: "rocket_launch", re: /startup/i },
  { id: "embrapii", nome: "EMBRAPII", cor: "#fb923c", icone: "handshake", re: /embrapii/i },
  { id: "laboratorio", nome: "Laboratórios", cor: "#2dd4bf", icone: "science", re: /laborat|supercomput|centro de pesquisa/i },
  { id: "habitat", nome: "Habitats", cor: "#facc15", icone: "hub", re: /incubadora|parque|hub/i },
] as const;
const OUTROS = { id: "outros", nome: "Outros", cor: "#94a3b8", icone: "more_horiz" };
const ORDEM_CLASSIF = ["embrapii", "startup", "universidade", "ict", "instituto", "laboratorio", "habitat"];

export function categoriaDe(tipo: string): string {
  for (const id of ORDEM_CLASSIF) if (CATEGORIAS.find(c => c.id === id)!.re.test(tipo || "")) return id;
  return "outros";
}

const titulo = (s: string) => s === s.toUpperCase()
  ? s.toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()).replace(/\b(De|Da|Do|Das|Dos|E)\b/g, m => m.toLowerCase())
  : s;

interface Props {
  uf?: string; titulo: string; subtitulo?: string; cor: string;
  categoriaInicial?: string; onClose: () => void;
}

export default function AtoresDrawer({ uf, titulo: tit, subtitulo, cor, categoriaInicial, onClose }: Props) {
  const [atores, setAtores] = useState<Ator[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<string>(categoriaInicial || "todos");
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(60);

  useEffect(() => {
    let q = supabase.from("research_locations").select("id, nome, tipo, municipio, uf").not("nome", "is", null);
    if (uf) q = q.eq("uf", uf);
    fetchAll<Ator>(q).then(setAtores).catch(e => setErro(String(e.message || e)));
  }, [uf]);

  const comCat = useMemo(() => (atores || []).map(a => ({ ...a, cat: categoriaDe(a.tipo) })), [atores]);
  const abas = useMemo(() => {
    const ct: Record<string, number> = {};
    comCat.forEach(a => { ct[a.cat] = (ct[a.cat] || 0) + 1; });
    return [...CATEGORIAS, OUTROS].filter(c => ct[c.id]).map(c => ({ ...c, total: ct[c.id] }));
  }, [comCat]);

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return comCat
      .filter(a => aba === "todos" || a.cat === aba)
      .filter(a => !b || a.nome.toLowerCase().includes(b) || (a.municipio || "").toLowerCase().includes(b))
      .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
  }, [comCat, aba, busca]);

  const corDe = (id: string) => [...CATEGORIAS, OUTROS].find(c => c.id === id)?.cor || OUTROS.cor;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-foreground/30 backdrop-blur-[2px]" />
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-border bg-background shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="shrink-0 border-b border-border p-5" style={{ background: cor + "12" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: cor }}>Atores do SNI</p>
              <h3 className="mt-0.5 text-2xl font-extrabold text-foreground">{tit}</h3>
              {subtitulo && <p className="mt-0.5 text-sm text-muted-foreground">{subtitulo}</p>}
            </div>
            <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <span className="material-symbols-outlined text-xl leading-none">close</span>
            </button>
          </div>
          {atores && <p className="mt-3 text-3xl font-extrabold tabular-nums" style={{ color: cor }}>
            {atores.length.toLocaleString("pt-BR")} <span className="text-sm font-medium text-muted-foreground">atores</span></p>}
        </div>

        {/* Abas por categoria */}
        {atores && (
          <div className="shrink-0 border-b border-border p-3">
            <div className="flex flex-wrap gap-1.5">
              {[{ id: "todos", nome: "Todos", cor, icone: "apps", total: atores.length }, ...abas].map(c => {
                const ativo = aba === c.id;
                return (
                  <button key={c.id} onClick={() => { setAba(c.id); setLimite(60); }}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${ativo ? "shadow-sm" : "border-border text-muted-foreground hover:bg-muted"}`}
                    style={ativo ? { borderColor: c.cor, background: c.cor + "20", color: "hsl(var(--foreground))" } : {}}>
                    <span className="material-symbols-outlined text-sm leading-none" style={{ color: c.cor, fontVariationSettings: '"FILL" 1' }}>{c.icone}</span>
                    {c.nome}
                    <span className="rounded-full px-1.5 text-[10px] tabular-nums" style={{ background: c.cor + "30" }}>{c.total.toLocaleString("pt-BR")}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative mt-3">
              <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-muted-foreground">search</span>
              <input value={busca} onChange={e => { setBusca(e.target.value); setLimite(60); }} placeholder="Buscar por nome ou município"
                className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-3 text-sm outline-none focus:border-primary" />
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-3">
          {erro ? <p className="p-4 text-sm text-destructive">Falha ao carregar: {erro}</p>
          : !atores ? <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          : !lista.length ? <p className="p-6 text-center text-sm text-muted-foreground">Nenhum ator encontrado.</p>
          : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {lista.slice(0, limite).map(a => (
                <li key={a.id} className="flex items-start gap-3 px-3 py-2.5">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: corDe(a.cat) }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-foreground">{titulo(a.nome)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.municipio ? titulo(a.municipio) : "Município não informado"}{a.uf && !uf ? ` · ${a.uf}` : ""}
                      <span className="mx-1">·</span>{a.tipo.split(";")[0]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {lista.length > limite && (
            <button onClick={() => setLimite(l => l + 100)} className="mt-3 w-full rounded-lg border border-border py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">
              Mostrar mais ({(lista.length - limite).toLocaleString("pt-BR")} restantes)
            </button>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          {lista.length.toLocaleString("pt-BR")} na seleção · <a href="/mapa" className="font-semibold text-primary hover:underline">ver no Mapa</a>
        </div>
      </aside>
    </div>
  );
}

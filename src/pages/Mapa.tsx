// /mapa — Mapa da Inovação: leitura direta da base de locais de pesquisa,
// sem lista congelada em arquivo. Mapa sóbrio (contorno + UFs) e coluna lateral
// com filtros funcionais.

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Download, ChevronDown, ExternalLink, MapPin, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MapaBrasil, { type Ponto } from "@/components/mapa/MapaBrasil";
import MapaExtracaoSection from "@/components/mapa/ComprovacaoExtracao";
import { CATEGORIAS, categorizar, fonteLabel, type CategoriaKey } from "@/components/mapa/tipos";
import { safeSupabase } from "@/lib/supabaseClient";
import { downloadLocations, type ResearchLocation } from "@/lib/researchLocations";
import { safeHttpUrl } from "@/lib/utils";

const COLUNAS =
  "id,nome,tipo,uf,municipio,latitude,longitude,fonte,fonte_url,cnpj,data_coleta";

/** Busca paginada — a base tem mais linhas do que o limite por requisição. */
async function carregarLocais(): Promise<ResearchLocation[]> {
  const passo = 1000;
  const todos: ResearchLocation[] = [];
  for (let de = 0; de < 20000; de += passo) {
    const { data, error } = await safeSupabase
      .from("research_locations")
      .select(COLUNAS)
      .order("id", { ascending: true })
      .range(de, de + passo - 1);
    if (error) throw error;
    const lote = (data || []) as unknown as ResearchLocation[];
    todos.push(...lote);
    if (lote.length < passo) break;
  }
  return todos;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function Mapa() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["research_locations", "mapa"],
    queryFn: carregarLocais,
    staleTime: 30 * 60 * 1000,
  });

  const [busca, setBusca] = useState("");
  // Conjuntos de SELEÇÃO: vazio = tudo visível; com itens = só os selecionados.
  const [fontesSel, setFontesSel] = useState<Set<string>>(new Set());
  const [catsSel, setCatsSel] = useState<Set<CategoriaKey>>(new Set());
  const [ufsSel, setUfsSel] = useState<Set<string>>(new Set());
  const [selecao, setSelecao] = useState<{ pontos: Ponto[]; total: number } | null>(null);
  const [verComprovacao, setVerComprovacao] = useState(false);

  const locais = data || [];

  const comCategoria = useMemo(
    () => locais.map((l) => ({ ...l, categoria: categorizar(l.tipo) })),
    [locais],
  );

  const filtrados = useMemo(() => {
    const q = norm(busca.trim());
    return comCategoria.filter((l) => {
      if (fontesSel.size && !fontesSel.has(l.fonte)) return false;
      if (catsSel.size && !catsSel.has(l.categoria)) return false;
      if (ufsSel.size && (!l.uf || !ufsSel.has(l.uf))) return false;
      if (q && !norm(`${l.nome} ${l.municipio || ""}`).includes(q)) return false;
      return true;
    });
  }, [comCategoria, busca, fontesSel, catsSel, ufsSel]);

  const pontos: Ponto[] = useMemo(
    () =>
      filtrados
        .filter((l) => l.latitude != null && l.longitude != null)
        .map((l) => ({
          id: l.id,
          nome: l.nome,
          latitude: Number(l.latitude),
          longitude: Number(l.longitude),
          categoria: l.categoria,
        })),
    [filtrados],
  );

  const contagemPorUf = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of filtrados) if (l.uf) c[l.uf] = (c[l.uf] || 0) + 1;
    return c;
  }, [filtrados]);

  const contagemFonte = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of comCategoria) c[l.fonte] = (c[l.fonte] || 0) + 1;
    return c;
  }, [comCategoria]);

  const contagemCat = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of comCategoria) c[l.categoria] = (c[l.categoria] || 0) + 1;
    return c;
  }, [comCategoria]);

  const ufs = useMemo(
    () => [...new Set(locais.map((l) => l.uf).filter(Boolean))].sort() as string[],
    [locais],
  );

  const ultimaColeta = useMemo(() => {
    const d = locais.map((l) => l.data_coleta).filter(Boolean).sort();
    return d.length ? new Date(d[d.length - 1]).toLocaleDateString("pt-BR") : null;
  }, [locais]);

  const limpar = () => {
    setBusca("");
    setFontesSel(new Set());
    setCatsSel(new Set());
    setUfsSel(new Set());
    setSelecao(null);
  };

  const temFiltro = busca || fontesSel.size || catsSel.size || ufsSel.size;

  useEffect(() => {
    setSelecao(null);
  }, [busca, ufsSel, fontesSel, catsSel]);

  const alternar = <T,>(set: Set<T>, v: T, apply: (s: Set<T>) => void) => {
    const novo = new Set(set);
    novo.has(v) ? novo.delete(v) : novo.add(v);
    apply(novo);
  };

  const detalhados = selecao
    ? selecao.pontos
        .map((p) => filtrados.find((l) => l.id === p.id))
        .filter(Boolean) as (ResearchLocation & { categoria: CategoriaKey })[]
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="pt-16">
        {/* Cabeçalho institucional */}
        <div className="border-b border-border px-6 py-5">
          <div className="container-wide">
            <h1 className="text-2xl font-bold tracking-tight">
              Mapa da Inovação — Brasil
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Motor da Inovação · UFPR/PPGPP · Pesquisa Colaborativa do Mapa da Inovação
              {ultimaColeta && ` · última coleta em ${ultimaColeta}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:h-[calc(100vh-9.5rem)] lg:flex-row">
          {/* Coluna lateral de filtros */}
          <aside className="w-full shrink-0 overflow-y-auto border-b border-border bg-muted/20 p-5 lg:w-80 lg:border-b-0 lg:border-r">
            <div className="space-y-6">
              {/* Total + limpar */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold leading-none">
                    {filtrados.length.toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    de {locais.length.toLocaleString("pt-BR")} registros
                  </p>
                </div>
                {temFiltro ? (
                  <button
                    onClick={limpar}
                    className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-3 w-3" /> limpar filtros
                  </button>
                ) : null}
              </div>

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome ou cidade"
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>

              {/* Estado */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Estado
                </p>
                <select
                  value={uf || ""}
                  onChange={(e) => setUf(e.target.value || null)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">Todos os estados</option>
                  {ufs.map((u) => (
                    <option key={u} value={u}>
                      {u} ({(contagemPorUf[u] || 0).toLocaleString("pt-BR")})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipos (com ícone = legenda do mapa) */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo de instituição
                </p>
                <div className="space-y-1">
                  {CATEGORIAS.map((c) => {
                    const Icone = c.icon;
                    const ativo = !catsOff.has(c.key);
                    return (
                      <button
                        key={c.key}
                        onClick={() => alternar(catsOff, c.key, setCatsOff)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                          ativo ? "bg-card" : "opacity-40"
                        } hover:bg-muted`}
                      >
                        <Icone className={`h-4 w-4 shrink-0 ${c.cor}`} strokeWidth={1.9} />
                        <span className="flex-1 truncate">{c.label}</span>
                        <span className="font-mono text-muted-foreground">
                          {(contagemCat[c.key] || 0).toLocaleString("pt-BR")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bases de origem */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Base de origem
                </p>
                <div className="space-y-1">
                  {Object.entries(contagemFonte)
                    .sort((a, b) => b[1] - a[1])
                    .map(([f, n]) => {
                      const ativo = !fontesOff.has(f);
                      return (
                        <button
                          key={f}
                          onClick={() => alternar(fontesOff, f, setFontesOff)}
                          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                            ativo ? "bg-card" : "opacity-40"
                          } hover:bg-muted`}
                        >
                          <span className="flex-1 truncate">{fonteLabel(f)}</span>
                          <span className="font-mono text-muted-foreground">
                            {n.toLocaleString("pt-BR")}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Exportação */}
              <button
                onClick={() => downloadLocations(filtrados, "csv")}
                disabled={!filtrados.length}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar recorte em CSV
              </button>

              {/* Ficha do ponto/agrupamento selecionado */}
              {detalhados.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold">
                      {selecao!.total > detalhados.length
                        ? `${detalhados.length} de ${selecao!.total} neste ponto`
                        : `${detalhados.length} selecionado(s)`}
                    </p>
                    <button onClick={() => setSelecao(null)} aria-label="fechar">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {detalhados.map((l) => {
                      const href = safeHttpUrl(l.fonte_url);
                      return (
                        <div key={l.id} className="border-b border-border/50 pb-2 last:border-0">
                          <p className="text-xs font-medium leading-snug">{l.nome}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {l.tipo} · {l.municipio || "—"}/{l.uf || "—"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Base: {fonteLabel(l.fonte)}
                          </p>
                          {href && (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                            >
                              fonte <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Mapa */}
          <section className="relative min-h-[70vh] flex-1 bg-background p-4">
            {isLoading && (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando os registros da base…
                </div>
              </div>
            )}

            {error && (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <p className="text-sm text-destructive">
                  Falha ao consultar a base de locais de pesquisa:{" "}
                  {(error as Error).message}
                </p>
              </div>
            )}

            {!isLoading && !error && (
              <>
                <MapaBrasil
                  pontos={pontos}
                  ufSelecionada={uf}
                  contagemPorUf={contagemPorUf}
                  onSelecionarUf={setUf}
                  onSelecionarCluster={(pontos, total) => setSelecao({ pontos, total })}
                />
                <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-[11px] text-muted-foreground">
                  <MapPin className="mr-1 inline h-3 w-3" />
                  {pontos.length.toLocaleString("pt-BR")} pontos georreferenciados · clique num
                  estado para aproximar, num ícone para ver a ficha
                </p>
              </>
            )}
          </section>
        </div>

        {/* Comprovação de extração (recolhida) */}
        <div className="border-t border-border">
          <div className="container-wide px-6 py-4">
            <button
              onClick={() => setVerComprovacao((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${verComprovacao ? "rotate-180" : ""}`}
              />
              Comprovação de extração — 21/24 bases
            </button>
          </div>
          {verComprovacao && <MapaExtracaoSection />}
        </div>
      </main>

      <Footer />
    </div>
  );
}

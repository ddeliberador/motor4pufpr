// /mapa — Mapa da Inovação: leitura direta da base de locais de pesquisa,
// sem lista congelada em arquivo. Mapa sóbrio (contorno + UFs), coluna lateral
// com filtros funcionais e lista exportável dos registros filtrados.

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, X, ExternalLink, MapPin, Loader2, Database, Filter, BarChart3, List,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MapaBrasil, { type Ponto } from "@/components/mapa/MapaBrasil";

import ListaFiltrados from "@/components/mapa/ListaFiltrados";
import FiltrosPorBase from "@/components/mapa/FiltrosPorBase";
import { FILTROS, resumoFiltros, type SelecaoFiltros } from "@/components/mapa/filtrosBase";
import { fetchLocationEnrichment } from "@/lib/locationEnrichment";
import { CATEGORIAS, categorizar, fonteLabel, type CategoriaKey } from "@/components/mapa/tipos";
import { safeSupabase } from "@/lib/supabaseClient";
import { type ResearchLocation } from "@/lib/researchLocations";
import { safeHttpUrl } from "@/lib/utils";
import PainelDataLake from "@/components/mapa/PainelDataLake";
import MetricasCruzamento from "@/components/mapa/MetricasCruzamento";
import { canonizar, passaLake, resumoLake, type SelecaoLake } from "@/components/mapa/dataLake";

const COLUNAS =
  "id,nome,tipo,uf,municipio,latitude,longitude,fonte,fonte_url,cnpj,data_coleta,raw_metadata";

const REGIAO_POR_UF: Record<string, string> = {
  AC: "Norte", AM: "Norte", AP: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste",
  PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};
const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];

/** Facetas de tipo: "ICT; Unidade Embrapii" vira ["ICT", "Unidade Embrapii"]. */
const facetasTipo = (tipo: string) =>
  tipo.split(";").map((t) => t.trim()).filter(Boolean);

const segmentoDe = (l: ResearchLocation) =>
  typeof l.raw_metadata?.segmento === "string" ? (l.raw_metadata.segmento as string) : null;

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

  const { data: enrData } = useQuery({
    queryKey: ["location_enrichment", "mapa"],
    queryFn: fetchLocationEnrichment,
    staleTime: 30 * 60 * 1000,
  });
  const enriquecimento = enrData || {};


  const [busca, setBusca] = useState("");
  // Conjuntos de SELEÇÃO: vazio = tudo visível; com itens = só os selecionados.
  const [fontesSel, setFontesSel] = useState<Set<string>>(new Set());
  const [catsSel, setCatsSel] = useState<Set<CategoriaKey>>(new Set());
  const [ufsSel, setUfsSel] = useState<Set<string>>(new Set());
  const [regioesSel, setRegioesSel] = useState<Set<string>>(new Set());
  const [tiposSel, setTiposSel] = useState<Set<string>>(new Set());
  const [segmentosSel, setSegmentosSel] = useState<Set<string>>(new Set());
  const [soEmbrapii, setSoEmbrapii] = useState(false);
  const [granular, setGranular] = useState<SelecaoFiltros>({});
  const [selecao, setSelecao] = useState<{ pontos: Ponto[]; total: number } | null>(null);
  const [pontoSelecionadoId, setPontoSelecionadoId] = useState<string | null>(null);
  // Modo de leitura: data lake cruzado (interseção entre eixos) ou bases de origem.
  const [modo, setModo] = useState<"lake" | "bases">("lake");
  const [lakeSel, setLakeSel] = useState<SelecaoLake>({});
  const [metricas, setMetricas] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);

  const locais = data || [];

  const comCategoria = useMemo(
    () => locais.map((l) => ({ ...l, categoria: categorizar(l.tipo) })),
    [locais],
  );

  // Esquema canônico: traduz cada registro para os eixos comuns às 7 bases.
  const comCanon = useMemo(
    () =>
      comCategoria.map((l) => ({ ...l, canon: canonizar(l, enriquecimento[l.id] || {}) })),
    [comCategoria, enriquecimento],
  );

  const totalBases = useMemo(
    () => new Set(locais.map((l) => l.fonte)).size,
    [locais],
  );

  // Combinação por SOMA: cada grupo de filtro marcado adiciona seus registros
  // à exibição (união). Só a busca por texto restringe o resultado.
  const filtradosBases = useMemo(() => {
    const q = norm(busca.trim());
    const grupos: ((l: (typeof comCanon)[number]) => boolean)[] = [];
    if (fontesSel.size) grupos.push((l) => fontesSel.has(l.fonte));
    if (catsSel.size) grupos.push((l) => catsSel.has(l.categoria));
    if (ufsSel.size) grupos.push((l) => !!l.uf && ufsSel.has(l.uf));
    if (regioesSel.size)
      grupos.push((l) => !!l.uf && regioesSel.has(REGIAO_POR_UF[l.uf] || ""));
    if (tiposSel.size)
      grupos.push((l) => facetasTipo(l.tipo).some((t) => tiposSel.has(t)));
    if (segmentosSel.size)
      grupos.push((l) => segmentosSel.has(segmentoDe(l) || ""));
    if (soEmbrapii) grupos.push((l) => /embrapii/i.test(l.tipo));
    for (const def of FILTROS) {
      const escolhidos = granular[def.id];
      if (!escolhidos || escolhidos.size === 0) continue;
      grupos.push((l) =>
        def.valores(l, enriquecimento[l.id] || {}).some((v) => escolhidos.has(v)),
      );
    }
    return comCanon.filter((l) => {
      if (q && !norm(`${l.nome} ${l.municipio || ""}`).includes(q)) return false;
      if (grupos.length === 0) return true;
      return grupos.some((g) => g(l));
    });
  }, [comCanon, busca, fontesSel, catsSel, ufsSel, regioesSel, tiposSel, segmentosSel, soEmbrapii, granular, enriquecimento]);

  // Data Lake Cruzado: interseção entre eixos canônicos (E), somando dentro
  // de cada eixo (OU). A busca por texto restringe em qualquer modo.
  const filtradosLake = useMemo(() => {
    const q = norm(busca.trim());
    return comCanon.filter((l) => {
      if (q && !norm(`${l.nome} ${l.municipio || ""}`).includes(q)) return false;
      if (ufsSel.size && !(l.uf && ufsSel.has(l.uf))) return false;
      return passaLake(l.canon, lakeSel);
    });
  }, [comCanon, busca, ufsSel, lakeSel]);

  const filtrados = modo === "lake" ? filtradosLake : filtradosBases;

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

  const contagemRegiao = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of comCategoria) {
      const r = l.uf ? REGIAO_POR_UF[l.uf] : null;
      if (r) c[r] = (c[r] || 0) + 1;
    }
    return c;
  }, [comCategoria]);

  const contagemTipo = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of comCategoria)
      for (const t of facetasTipo(l.tipo)) c[t] = (c[t] || 0) + 1;
    return c;
  }, [comCategoria]);

  const contagemSegmento = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of comCategoria) {
      const s = segmentoDe(l);
      if (s) c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [comCategoria]);

  const totalEmbrapii = useMemo(
    () => comCategoria.filter((l) => /embrapii/i.test(l.tipo)).length,
    [comCategoria],
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
    setRegioesSel(new Set());
    setTiposSel(new Set());
    setSegmentosSel(new Set());
    setSoEmbrapii(false);
    setGranular({});
    setLakeSel({});
    setSelecao(null);
  };

  const granularAtivo = Object.values(granular).some((s) => s.size > 0);
  const lakeAtivo = Object.values(lakeSel).some((s) => s.size > 0);

  const temFiltro =
    modo === "lake"
      ? !!busca || ufsSel.size > 0 || lakeAtivo
      : !!busca || fontesSel.size > 0 || catsSel.size > 0 || ufsSel.size > 0 ||
        regioesSel.size > 0 || tiposSel.size > 0 || segmentosSel.size > 0 ||
        soEmbrapii || granularAtivo;

  const filtrosAtivos = useMemo(() => {
    const f: string[] = [];
    if (busca.trim()) f.push(`busca "${busca.trim()}"`);
    if (modo === "lake") {
      if (ufsSel.size) f.push(`estado: ${[...ufsSel].sort().join(", ")}`);
      f.push(...resumoLake(lakeSel));
      return f;
    }
    if (regioesSel.size) f.push(`região: ${[...regioesSel].join(", ")}`);
    if (ufsSel.size) f.push(`estado: ${[...ufsSel].sort().join(", ")}`);
    if (catsSel.size)
      f.push(
        `tipo: ${[...catsSel]
          .map((k) => CATEGORIAS.find((c) => c.key === k)?.label || k)
          .join(", ")}`,
      );
    if (tiposSel.size) f.push(`tipo detalhado: ${[...tiposSel].join(", ")}`);
    if (segmentosSel.size) f.push(`segmento: ${[...segmentosSel].join(", ")}`);
    if (soEmbrapii) f.push("somente unidades EMBRAPII");
    if (fontesSel.size)
      f.push(`base de origem: ${[...fontesSel].map(fonteLabel).join(", ")}`);
    f.push(...resumoFiltros(granular));
    return f;
  }, [modo, lakeSel, busca, regioesSel, ufsSel, catsSel, tiposSel, segmentosSel, soEmbrapii, fontesSel, granular]);

  useEffect(() => {
    setSelecao(null);
    setPontoSelecionadoId(null);
  }, [modo, lakeSel, busca, ufsSel, fontesSel, catsSel, regioesSel, tiposSel, segmentosSel, soEmbrapii, granular]);

  // Seleção no mapa espelha na listagem: abre o painel da lista
  useEffect(() => {
    if (pontoSelecionadoId) {
      setListaAberta(true);
      setMetricas(false);
    }
  }, [pontoSelecionadoId]);

  const alternar = <T,>(set: Set<T>, v: T, apply: (s: Set<T>) => void) => {
    const novo = new Set(set);
    novo.has(v) ? novo.delete(v) : novo.add(v);
    apply(novo);
  };

  const detalhados = useMemo(() => {
    if (selecao)
      return selecao.pontos
        .map((p) => filtrados.find((l) => l.id === p.id))
        .filter(Boolean) as (ResearchLocation & { categoria: CategoriaKey })[];
    if (pontoSelecionadoId) {
      const l = filtrados.find((l) => l.id === pontoSelecionadoId);
      return l ? [l] : [];
    }
    return [];
  }, [selecao, pontoSelecionadoId, filtrados]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="pt-16">
        {/* Cabeçalho institucional */}
        <div className="border-b border-border px-4 py-3 sm:px-6 sm:py-4 lg:py-5">
          <div className="w-full">
            <h1 className="text-lg font-bold tracking-tight sm:text-xl lg:text-2xl">
              Mapa da Inovação — Brasil
            </h1>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:mt-1 sm:text-sm">
              Motor da Inovação · UFPR/PPGPP · Pesquisa Colaborativa do Mapa da Inovação
              {ultimaColeta && (
                <span className="block sm:inline"> última coleta em {ultimaColeta}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:h-[calc(100vh-9.5rem)] lg:flex-row">
          {/* Coluna lateral de filtros */}
          <aside className="w-full shrink-0 overflow-y-auto border-b border-border bg-muted/20 p-5 lg:w-80 lg:border-b-0 lg:border-r">
            <div className="space-y-6">
              {/* Modo de leitura */}
              <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
                {([
                  { key: "lake" as const, label: "Data Lake Cruzado", icone: Database },
                  { key: "bases" as const, label: "Bases de Origem", icone: Filter },
                ]).map(({ key, label, icone: Icone }) => (
                  <button
                    key={key}
                    onClick={() => setModo(key)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      modo === key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icone className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

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
                  onChange={(e) => {
                    const v = e.target.value;
                    setBusca(v);
                    if (v.trim()) {
                      setListaAberta(true);
                      setMetricas(false);
                    }
                  }}
                  placeholder="Nome ou cidade"
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>

              {modo === "lake" ? (
                <>
                  {/* Estado (recorte territorial dentro do cruzamento) */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Estado (UF)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {ufs.map((u) => {
                        const ativo = ufsSel.has(u);
                        return (
                          <button
                            key={u}
                            onClick={() => alternar(ufsSel, u, setUfsSel)}
                            className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                              ativo
                                ? "border-primary bg-primary/15 text-foreground"
                                : "border-border bg-card hover:bg-muted"
                            } ${ufsSel.size > 0 && !ativo ? "opacity-40" : ""}`}
                          >
                            {u}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <PainelDataLake
                    itens={comCanon}
                    selecao={lakeSel}
                    onChange={(id, valores) =>
                      setLakeSel((prev) => ({ ...prev, [id]: valores }))
                    }
                    intersecao={filtrados.length}
                    bases={totalBases}
                  />
                </>
              ) : (
                <>
              {/* Região */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Região
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {REGIOES.map((r) => {
                    const ativo = regioesSel.has(r);
                    const esmaecido = regioesSel.size > 0 && !ativo;
                    return (
                      <button
                        key={r}
                        onClick={() => alternar(regioesSel, r, setRegioesSel)}
                        className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                          ativo
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border bg-card hover:bg-muted"
                        } ${esmaecido ? "opacity-40" : ""}`}
                      >
                        {r} ({(contagemRegiao[r] || 0).toLocaleString("pt-BR")})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Estado */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Estado
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ufs.map((u) => {
                    const ativo = ufsSel.has(u);
                    const esmaecido = ufsSel.size > 0 && !ativo;
                    return (
                      <button
                        key={u}
                        onClick={() => alternar(ufsSel, u, setUfsSel)}
                        className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                          ativo
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border bg-card hover:bg-muted"
                        } ${esmaecido ? "opacity-40" : ""}`}
                      >
                        {u}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipos (com ícone = legenda do mapa) */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo de instituição
                </p>
                <div className="space-y-1">
                  {CATEGORIAS.map((c) => {
                    const Icone = c.icon;
                    const ativo = catsSel.has(c.key);
                    const esmaecido = catsSel.size > 0 && !ativo;
                    return (
                      <button
                        key={c.key}
                        onClick={() => alternar(catsSel, c.key, setCatsSel)}
                        className={`flex w-full items-center gap-2.5 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
                          ativo
                            ? "border-primary bg-primary/15"
                            : "border-transparent bg-card"
                        } ${esmaecido ? "opacity-40" : ""}`}
                      >
                        <span
                          className={`material-symbols-outlined shrink-0 text-base leading-none ${c.cor}`}
                          aria-hidden
                        >
                          {Icone}
                        </span>
                        <span className="flex-1 truncate">{c.label}</span>
                        <span className="font-mono text-muted-foreground">
                          {(contagemCat[c.key] || 0).toLocaleString("pt-BR")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipo de instituição (detalhado) */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo de instituição (detalhado)
                </p>
                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {Object.entries(contagemTipo)
                    .sort((a, b) => b[1] - a[1])
                    .map(([t, n]) => {
                      const ativo = tiposSel.has(t);
                      const esmaecido = tiposSel.size > 0 && !ativo;
                      return (
                        <button
                          key={t}
                          onClick={() => alternar(tiposSel, t, setTiposSel)}
                          className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
                            ativo
                              ? "border-primary bg-primary/15"
                              : "border-transparent bg-card"
                          } ${esmaecido ? "opacity-40" : ""}`}
                        >
                          <span className="flex-1 truncate">{t}</span>
                          <span className="font-mono text-muted-foreground">
                            {n.toLocaleString("pt-BR")}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Unidades EMBRAPII (atalho) */}
              <button
                onClick={() => setSoEmbrapii((v) => !v)}
                className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                  soEmbrapii
                    ? "border-primary bg-primary/15"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                <span className="flex-1">Somente unidades EMBRAPII</span>
                <span className="font-mono text-muted-foreground">
                  {totalEmbrapii.toLocaleString("pt-BR")}
                </span>
              </button>

              {/* Filtros detalhados por base (checkbox, lista suspensa ou opção única) */}
              <FiltrosPorBase
                itens={comCategoria}
                enriquecimento={enriquecimento}
                selecao={granular}
                fontesSel={fontesSel}
                onChange={(id, valores) =>
                  setGranular((prev) => ({ ...prev, [id]: valores }))
                }
              />


              {/* Bases de origem */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Base de origem
                </p>
                <div className="space-y-1">
                  {Object.entries(contagemFonte)
                    .sort((a, b) => b[1] - a[1])
                    .map(([f, n]) => {
                      const ativo = fontesSel.has(f);
                      const esmaecido = fontesSel.size > 0 && !ativo;
                      return (
                        <button
                          key={f}
                          onClick={() => alternar(fontesSel, f, setFontesSel)}
                          className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
                            ativo
                              ? "border-primary bg-primary/15"
                              : "border-transparent bg-card"
                          } ${esmaecido ? "opacity-40" : ""}`}
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
                </>
              )}

              {/* Ficha do ponto/agrupamento selecionado */}
              {detalhados.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold">
                      {selecao && selecao.total > detalhados.length
                        ? `${detalhados.length} de ${selecao.total} neste ponto`
                        : `${detalhados.length} local selecionado`}
                    </p>
                    <button
                      onClick={() => {
                        setSelecao(null);
                        setPontoSelecionadoId(null);
                      }}
                      aria-label="fechar"
                    >
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
            {/* Barra do cruzamento */}
            {!isLoading && !error && (
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-2 py-1 text-[11px] font-semibold text-background">
                    <Database className="h-3 w-3" />
                    {modo === "lake" ? "Data Lake C,T&I" : "Bases de origem"}
                  </span>
                  <span>
                    <strong className="font-semibold text-foreground">
                      {filtrados.length.toLocaleString("pt-BR")}
                    </strong>{" "}
                    de {locais.length.toLocaleString("pt-BR")} entidades
                  </span>
                </p>
                <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
                  <button
                    onClick={() => {
                      setListaAberta((v) => !v);
                      setMetricas(false);
                    }}
                    aria-pressed={listaAberta}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                      listaAberta
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    Listagem filtrada
                  </button>
                  <button
                    onClick={() => {
                      setMetricas((v) => !v);
                      setListaAberta(false);
                    }}
                    aria-pressed={metricas}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                      metricas
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    Métricas do cruzamento
                  </button>
                </div>
              </div>
            )}

            {metricas && !isLoading && !error && (
              <MetricasCruzamento
                itens={filtrados}
                total={locais.length}
                onFechar={() => setMetricas(false)}
              />
            )}

            {listaAberta && !isLoading && !error && (
              <ListaFiltrados
                itens={filtrados}
                filtrosAtivos={filtrosAtivos}
                total={locais.length}
                aberto={listaAberta}
                onFechar={() => setListaAberta(false)}
                pontoSelecionadoId={pontoSelecionadoId}
                onSelecionarPonto={setPontoSelecionadoId}
              />
            )}

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
                  ufSelecionada={ufsSel.size === 1 ? [...ufsSel][0] : null}
                  ufsSelecionadas={ufsSel}
                  contagemPorUf={contagemPorUf}
                  onSelecionarUf={(u) => u && alternar(ufsSel, u, setUfsSel)}
                  onSelecionarCluster={(pontos, total) => setSelecao({ pontos, total })}
                  pontoSelecionadoId={pontoSelecionadoId}
                  onSelecionarPonto={setPontoSelecionadoId}
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

      </main>

      <Footer />
    </div>
  );
}

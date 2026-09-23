// /mapa — Mapa da Inovação: leitura direta da base de locais de pesquisa,
// sem lista congelada em arquivo. Mapa sóbrio (contorno + UFs), coluna lateral
// com filtros funcionais e lista exportável dos registros filtrados.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, X, ExternalLink, MapPin, Loader2, Filter, BarChart3, List, Database,
  SlidersHorizontal,
} from "lucide-react";
import Header from "@/components/Header";
import MapaBrasil, { type Ponto } from "@/components/mapa/MapaBrasil";

import ListaFiltrados from "@/components/mapa/ListaFiltrados";
import FiltrosPorBase from "@/components/mapa/FiltrosPorBase";
import { FILTROS, resumoFiltros, type SelecaoFiltros } from "@/components/mapa/filtrosBase";
import { fetchLocationEnrichment } from "@/lib/locationEnrichment";
import { CATEGORIAS, categorizar, fonteLabel, type CategoriaKey } from "@/components/mapa/tipos";
import { safeSupabase } from "@/lib/supabaseClient";
import { type ResearchLocation } from "@/lib/researchLocations";
import { safeHttpUrl } from "@/lib/utils";
import MetricasCruzamento from "@/components/mapa/MetricasCruzamento";
import PainelDataLake from "@/components/mapa/PainelDataLake";
import { canonizar, passaLake, resumoLake, type SelecaoLake } from "@/components/mapa/dataLake";
import { Button } from "@/components/ui/button";
import {
  type DadosCabos,
  type Datacenter,
  type UsinaAneel,
} from "@/components/mapa/caboSubmarino";

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
  // Defesa: descarta coordenadas fora do território nacional (dado incorreto na fonte).
  return todos.filter(
    (l) =>
      l.latitude == null ||
      l.longitude == null ||
      (l.longitude >= -74.2 && l.longitude <= -33.6 && l.latitude <= 5.6 && l.latitude >= -34.0),
  );
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
  const [modo, setModo] = useState<"bases" | "lake">("bases");
  const [lakeSel, setLakeSel] = useState<SelecaoLake>({});
  const [selecao, setSelecao] = useState<{ pontos: Ponto[]; total: number } | null>(null);
  const [pontoSelecionadoId, setPontoSelecionadoId] = useState<string | null>(null);
  const [metricas, setMetricas] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);
  // Camadas de dados exibidas no mapa (todas ligadas por padrão).
  const [camadas, setCamadas] = useState<Set<CategoriaKey>>(
    () => new Set(CATEGORIAS.map((c) => c.key)),
  );
  const [filtrosMobileAbertos, setFiltrosMobileAbertos] = useState(false);
  // Camadas de IA — desligadas por padrão e carregadas somente quando ativadas.
  const [layer1Ativa, setLayer1Ativa] = useState(false);
  const [layer1Carregando, setLayer1Carregando] = useState(false);
  const [dadosUsinas, setDadosUsinas] = useState<UsinaAneel[] | null>(null);
  const [erroLayer1, setErroLayer1] = useState<string | null>(null);
  const [layer2Ativa, setLayer2Ativa] = useState(false);
  const [layer2Carregando, setLayer2Carregando] = useState(false);
  const [dadosCabos, setDadosCabos] = useState<DadosCabos | null>(null);
  const [layer3Ativa, setLayer3Ativa] = useState(false);
  const [layer3Carregando, setLayer3Carregando] = useState(false);
  const [dadosDCs, setDadosDCs] = useState<Datacenter[] | null>(null);
  const [erroLayer3, setErroLayer3] = useState<string | null>(null);

  useEffect(() => {
    if (!layer1Ativa || dadosUsinas) return;
    setLayer1Carregando(true);
    setErroLayer1(null);
    safeSupabase.functions.invoke("map-infrastructure", { body: { layer: "energy" } })
      .then(({ data: resposta, error: falha }) => {
        if (falha) throw falha;
        if (!resposta || !Array.isArray(resposta.data)) {
          throw new Error("resposta inválida da ANEEL");
        }
        setDadosUsinas(resposta.data as UsinaAneel[]);
      })
      .catch((err) => {
        const mensagem = err instanceof Error ? err.message : "falha desconhecida";
        console.error("Layer 1 — ANEEL indisponível:", err);
        setErroLayer1(mensagem);
      })
      .finally(() => setLayer1Carregando(false));
  }, [layer1Ativa, dadosUsinas]);

  // Busca snapshot local dos cabos somente quando a camada for ligada (lazy load).
  useEffect(() => {
    if (!layer2Ativa || dadosCabos) return;
    setLayer2Carregando(true);
    fetch("/submarine-cablemap/data.json")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as DadosCabos;
      })
      .then((d) => setDadosCabos(d))
      .catch((err) => {
        console.warn("Cabos submarinos indisponíveis:", err);
      })
      .finally(() => setLayer2Carregando(false));
  }, [layer2Ativa, dadosCabos]);

  useEffect(() => {
    if (!layer3Ativa || dadosDCs) return;
    setLayer3Carregando(true);
    setErroLayer3(null);
    safeSupabase.functions.invoke("map-infrastructure", { body: { layer: "datacenters" } })
      .then(async ({ data: resposta, error: falha }) => {
        if (!falha && resposta && Array.isArray(resposta.data)) return resposta.data as Datacenter[];
        console.warn("PeeringDB ao vivo indisponível; usando snapshot público validado:", falha);
        const snapshot = await fetch("/peeringdb-br.json");
        if (!snapshot.ok) throw falha || new Error(`snapshot PeeringDB: HTTP ${snapshot.status}`);
        const salvo = await snapshot.json();
        if (!Array.isArray(salvo.data)) throw new Error("snapshot PeeringDB inválido");
        return salvo.data as Datacenter[];
      })
      .then((datacenters) => setDadosDCs(datacenters))
      .catch((err) => {
        const mensagem = err instanceof Error ? err.message : "falha desconhecida";
        console.error("Layer 3 — PeeringDB indisponível:", err);
        setErroLayer3(mensagem);
      })
      .finally(() => setLayer3Carregando(false));
  }, [layer3Ativa, dadosDCs]);

  // Camadas de equipamento físico (usinas, datacenters) entram como locais do
  // mapa: somam na contagem, na lista filtrada e nas métricas.
  const locaisInfra = useMemo(() => {
    const extras: ResearchLocation[] = [];
    if (layer1Ativa && dadosUsinas) {
      for (const u of dadosUsinas) {
        if (u.latitude == null || u.longitude == null) continue;
        extras.push({
          id: `aneel-${u.id}`,
          nome: u.nome,
          tipo: `Usina ${u.tipo}`,
          uf: u.uf || null,
          municipio: u.municipio || null,
          latitude: u.latitude,
          longitude: u.longitude,
          fonte: "aneel_siga",
          fonte_url: "https://dadosabertos.aneel.gov.br/dataset/siga-sistema-de-informacoes-de-geracao-da-aneel",
          cnpj: null,
          data_coleta: null,
          raw_metadata: {
            potencia_kw: u.potencia_kw ?? null,
            combustivel: u.combustivel ?? null,
            situacao: u.situacao ?? null,
          },
        } as unknown as ResearchLocation);
      }
    }
    if (layer3Ativa && dadosDCs) {
      for (const dc of dadosDCs) {
        if (dc.latitude == null || dc.longitude == null) continue;
        extras.push({
          id: `peeringdb-${dc.id}`,
          nome: dc.nome,
          tipo: "Datacenter",
          uf: dc.uf || null,
          municipio: dc.cidade || null,
          latitude: dc.latitude,
          longitude: dc.longitude,
          fonte: "peeringdb",
          fonte_url: dc.website || "https://www.peeringdb.com/",
          cnpj: null,
          data_coleta: null,
          raw_metadata: { org: dc.org ?? null, redes: dc.redes ?? null },
        } as unknown as ResearchLocation);
      }
    }
    return extras;
  }, [layer1Ativa, dadosUsinas, layer3Ativa, dadosDCs]);

  const locais = useMemo(
    () => [...(data || []), ...locaisInfra],
    [data, locaisInfra],
  );

  const comCategoria = useMemo(
    () => locais.map((l) => ({ ...l, categoria: categorizar(l.tipo) })),
    [locais],
  );

  const comCanon = useMemo(
    () => comCategoria.map((l) => ({ ...l, canon: canonizar(l, enriquecimento[l.id] || {}) })),
    [comCategoria, enriquecimento],
  );

  const totalBases = useMemo(
    () => new Set(locais.map((l) => l.fonte)).size,
    [locais],
  );

  // Combinação por SOMA: cada grupo de filtro marcado adiciona seus registros
  // à exibição (união). Só a busca por texto restringe o resultado.
  const filtrados = useMemo(() => {
    const q = norm(busca.trim());
    if (modo === "lake") {
      return comCanon.filter((l) => {
        if (q && !norm(`${l.nome} ${l.municipio || ""}`).includes(q)) return false;
        return passaLake(l.canon, lakeSel);
      });
    }
    const grupos: ((l: (typeof comCategoria)[number]) => boolean)[] = [];
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
    return comCategoria.filter((l) => {
      if (q && !norm(`${l.nome} ${l.municipio || ""}`).includes(q)) return false;
      if (grupos.length === 0) return true;
      return grupos.some((g) => g(l));
    });
  }, [comCategoria, comCanon, busca, fontesSel, catsSel, ufsSel, regioesSel, tiposSel, segmentosSel, soEmbrapii, granular, enriquecimento, modo, lakeSel]);

  const pontos: Ponto[] = useMemo(
    () =>
      filtrados
        .filter(
          (l) =>
            l.latitude != null && l.longitude != null && camadas.has(l.categoria),
        )
        .map((l) => ({
          id: l.id,
          nome: l.nome,
          latitude: Number(l.latitude),
          longitude: Number(l.longitude),
          categoria: l.categoria,
        })),
    [filtrados, camadas],
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

  const metricasItens = useMemo(
    () => filtrados.map((l) => ({ ...l, canon: canonizar(l, enriquecimento[l.id] || {}) })),
    [filtrados, enriquecimento],
  );

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
    !!busca || fontesSel.size > 0 || catsSel.size > 0 || ufsSel.size > 0 ||
    regioesSel.size > 0 || tiposSel.size > 0 || segmentosSel.size > 0 ||
    soEmbrapii || granularAtivo || lakeAtivo;

  const filtrosAtivos = useMemo(() => {
    const f: string[] = [];
    if (busca.trim()) f.push(`busca "${busca.trim()}"`);
    if (modo === "lake") {
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
  }, [busca, regioesSel, ufsSel, catsSel, tiposSel, segmentosSel, soEmbrapii, fontesSel, granular, modo, lakeSel]);

  useEffect(() => {
    setSelecao(null);
    setPontoSelecionadoId(null);
  }, [busca, ufsSel, fontesSel, catsSel, regioesSel, tiposSel, segmentosSel, soEmbrapii, granular, modo, lakeSel]);

  // Seleção no mapa espelha na listagem: abre o painel da lista
  useEffect(() => {
    if (pontoSelecionadoId) {
      setListaAberta(true);
      setMetricas(false);
    }
  }, [pontoSelecionadoId]);

  // Clique num ícone que agrupa vários locais sobrepostos: abre a listagem
  // recortada apenas nesse grupo, para escolher qual local ver.
  useEffect(() => {
    if (selecao) {
      setListaAberta(true);
      setMetricas(false);
    }
  }, [selecao]);

  const grupoIds = useMemo(
    () => (selecao ? new Set(selecao.pontos.map((p) => p.id)) : null),
    [selecao],
  );

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

        <div className="flex flex-col lg:h-[calc(100vh-4rem)] lg:flex-row">
          {/* Coluna lateral de filtros */}
          <aside
            className={`${
              filtrosMobileAbertos ? "fixed inset-0 z-50 flex" : "hidden"
            } w-full flex-col overflow-y-auto border-border bg-background p-5 lg:static lg:z-auto lg:flex lg:w-80 lg:shrink-0 lg:border-r lg:bg-muted/20`}
            aria-label="Filtros do mapa"
          >
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
                <div className="flex items-center gap-2">
                  {temFiltro ? (
                    <button
                      onClick={limpar}
                      className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-3 w-3" /> limpar filtros
                    </button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setFiltrosMobileAbertos(false)}
                    aria-label="Fechar filtros"
                  >
                    <X />
                  </Button>
                </div>
              </div>

              {/* Seletor de modo */}
              <div className="flex rounded-lg border border-border bg-card p-0.5">
                <button
                  onClick={() => setModo("bases")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    modo === "bases"
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Bases de origem
                </button>
                <button
                  onClick={() => setModo("lake")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    modo === "lake"
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Database className="h-3.5 w-3.5" />
                  Data Lake Cruzado
                </button>
              </div>

              {/* Camadas de dados exibidas no mapa */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Camadas no mapa
                  </p>
                  <button
                    onClick={() =>
                      setCamadas(
                        camadas.size === CATEGORIAS.length
                          ? new Set()
                          : new Set(CATEGORIAS.map((c) => c.key)),
                      )
                    }
                    className="text-[11px] text-primary hover:underline"
                  >
                    {camadas.size === CATEGORIAS.length ? "nenhuma" : "todas"}
                  </button>
                </div>
                <div className="space-y-1">
                  {CATEGORIAS.map((c) => (
                    <label
                      key={c.key}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-card px-2 py-1.5 text-xs transition-colors hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={camadas.has(c.key)}
                        onChange={() => alternar(camadas, c.key, setCamadas)}
                        className="h-3.5 w-3.5 shrink-0 accent-primary"
                      />
                      <span
                        className={`material-symbols-outlined shrink-0 text-base leading-none ${c.cor}`}
                        aria-hidden
                      >
                        {c.icon}
                      </span>
                      <span className="flex-1 truncate">{c.label}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Controla apenas a exibição no mapa; a listagem segue os filtros.
                </p>
              </div>

              {/* Camadas de IA */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Camadas de IA
                  </p>
                </div>
                <div className="space-y-1">
                  {/* Layers 1–3 — infraestrutura de IA */}
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-card px-2 py-1.5 text-xs transition-colors hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={layer1Ativa}
                      onChange={() => setLayer1Ativa((v) => !v)}
                      className="h-3.5 w-3.5 shrink-0 accent-pink-500"
                    />
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-pink-400" aria-hidden />
                    <span className="flex-1 truncate">Layer 1 — Energia</span>
                    {layer1Carregando && <span className="text-[10px] text-muted-foreground">carregando…</span>}
                  </label>
                  {erroLayer1 && layer1Ativa && (
                    <p className="px-2 text-[10px] text-destructive">ANEEL indisponível: {erroLayer1}</p>
                  )}
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-card px-2 py-1.5 text-xs transition-colors hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={layer2Ativa}
                      onChange={() => setLayer2Ativa((v) => !v)}
                      className="h-3.5 w-3.5 shrink-0 accent-orange-500"
                    />
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-orange-400" aria-hidden />
                    <span className="flex-1 truncate">Layer 2 — Infraestrutura Física</span>
                    {layer2Carregando && <span className="text-[10px] text-muted-foreground">carregando…</span>}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-card px-2 py-1.5 text-xs transition-colors hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={layer3Ativa}
                      onChange={() => setLayer3Ativa((v) => !v)}
                      className="h-3.5 w-3.5 shrink-0 accent-yellow-500"
                    />
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-yellow-400" aria-hidden />
                    <span className="flex-1 truncate">Layer 3 — Infraestrutura Lógica</span>
                    {layer3Carregando && <span className="text-[10px] text-muted-foreground">carregando…</span>}
                  </label>
                  {erroLayer3 && layer3Ativa && (
                    <p className="px-2 text-[10px] text-destructive">PeeringDB indisponível: {erroLayer3}</p>
                  )}
                  {/* Layer 4, 5, 6 — em breve */}
                  {["Layer 4 — Modelos", "Layer 5 — Aplicações", "Layer 6 — Pesquisa"].map((l) => (
                    <div key={l} className="flex items-center gap-2.5 rounded-lg border border-transparent bg-card/50 px-2 py-1.5 text-xs opacity-40">
                      <span className="h-3.5 w-3.5 shrink-0 rounded border border-border" />
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-muted" aria-hidden />
                      <span className="flex-1 truncate">{l}</span>
                      <span className="text-[10px] text-muted-foreground">em breve</span>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Infraestrutura de IA no Brasil. Desligadas por padrão.
                </p>
              </div>

              {modo === "bases" && (<>

              {/* Busca */}
              <div className="relative hidden lg:block">
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
              </>)}

              {modo === "lake" && (
                <PainelDataLake
                  itens={comCanon}
                  selecao={lakeSel}
                  onChange={(id, vals) => setLakeSel((prev) => ({ ...prev, [id]: vals }))}
                />
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

              <Button
                type="button"
                className="sticky bottom-0 w-full lg:hidden"
                onClick={() => setFiltrosMobileAbertos(false)}
              >
                Ver {filtrados.length.toLocaleString("pt-BR")} no mapa
              </Button>
            </div>
          </aside>

          {/* Mapa */}
          <section className="relative flex h-[calc(100dvh-9.75rem)] min-h-[34rem] flex-1 flex-col overflow-hidden bg-background p-3 sm:p-4 lg:h-auto lg:min-h-0">
            <div className="mb-3 flex gap-2 lg:hidden">
              <div className="relative min-w-0 flex-1">
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
                  className="h-11 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <Button
                type="button"
                className="h-11 shrink-0 px-3"
                onClick={() => setFiltrosMobileAbertos(true)}
              >
                <SlidersHorizontal />
                Filtros{filtrosAtivos.length ? ` (${filtrosAtivos.length})` : ""}
              </Button>
            </div>

            {/* Barra do cruzamento */}
            {!isLoading && !error && (
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="hidden items-center gap-1.5 rounded-md bg-foreground px-2 py-1 text-[11px] font-semibold text-background sm:inline-flex">
                    {modo === "lake" ? (
                      <><Database className="h-3 w-3" /> Data Lake Cruzado</>
                    ) : (
                      <><Filter className="h-3 w-3" /> Bases de origem</>
                    )}
                  </span>
                  <span className="whitespace-nowrap">
                    <strong className="font-semibold text-foreground">
                      {filtrados.length.toLocaleString("pt-BR")}
                    </strong>{" "}
                    de {locais.length.toLocaleString("pt-BR")} entidades
                  </span>
                </p>
                <div className="inline-flex shrink-0 items-center rounded-lg border border-border bg-card p-0.5">
                  <button
                    onClick={() => {
                      setListaAberta((v) => !v);
                      setMetricas(false);
                    }}
                    aria-pressed={listaAberta}
                    title="Listagem filtrada"
                    aria-label="Listagem filtrada"
                    className={`flex h-8 w-9 items-center justify-center rounded-md text-[11px] font-medium transition-colors sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5 ${
                      listaAberta
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Listagem filtrada</span>
                  </button>
                  <button
                    onClick={() => {
                      setMetricas((v) => !v);
                      setListaAberta(false);
                    }}
                    aria-pressed={metricas}
                    title="Métricas do cruzamento"
                    aria-label="Métricas do cruzamento"
                    className={`flex h-8 w-9 items-center justify-center rounded-md text-[11px] font-medium transition-colors sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5 ${
                      metricas
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Métricas do cruzamento</span>
                  </button>
                </div>
              </div>
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
              <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                <div className="relative min-w-0 flex-1 overflow-hidden bg-background transition-[width] duration-300">
                  <MapaBrasil
                    pontos={pontos}
                    ufSelecionada={ufsSel.size === 1 ? [...ufsSel][0] : null}
                    ufsSelecionadas={ufsSel}
                    contagemPorUf={contagemPorUf}
                    onSelecionarUf={(u) => u && alternar(ufsSel, u, setUfsSel)}
                    onSelecionarCluster={(pontos, total) => setSelecao({ pontos, total })}
                    pontoSelecionadoId={pontoSelecionadoId}
                    onSelecionarPonto={setPontoSelecionadoId}
                    grupoIds={grupoIds}
                    layer2Ativa={layer2Ativa}
                    dadosCabos={dadosCabos}
                  />
                  <p className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 text-center text-[11px] text-muted-foreground sm:block">
                    <MapPin className="mr-1 inline h-3 w-3" />
                    {pontos.length.toLocaleString("pt-BR")} pontos georreferenciados · clique num
                    estado para aproximar, num ícone para ver a ficha
                  </p>
                </div>
                {metricas && (
                  <MetricasCruzamento
                    itens={metricasItens}
                    total={locais.length}
                    onFechar={() => setMetricas(false)}
                  />
                )}
                {listaAberta && (
                  <ListaFiltrados
                     itens={grupoIds ? filtrados.filter((l) => grupoIds.has(l.id)) : filtrados.filter((l) => camadas.has(l.categoria))}
                     filtrosAtivos={filtrosAtivos}
                     total={locais.length}
                     aberto={listaAberta}
                     onFechar={() => setListaAberta(false)}
                     pontoSelecionadoId={pontoSelecionadoId}
                     onSelecionarPonto={setPontoSelecionadoId}
                     grupoTotal={selecao?.total ?? null}
                     onLimparGrupo={() => setSelecao(null)}
                   />
                )}
              </div>
            )}
          </section>
        </div>

      </main>
    </div>
  );
}

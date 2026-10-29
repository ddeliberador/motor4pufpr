import PbiaEixos, { CATEGORIAS_POR_EIXO } from "@/components/mapa/PbiaEixos";
// /mapa — Mapa da Inovação: leitura direta da base de locais de pesquisa,
// sem lista congelada em arquivo. Mapa sóbrio (contorno + UFs), coluna lateral
// com filtros funcionais e lista exportável dos registros filtrados.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, MultiPolygon, Point, Polygon } from "geojson";
import { useCatalogo, inativaNoCatalogo } from "@/lib/catalogo";
import { geocodeLote } from "@/utils/geocodeMunicipio";
import { useQuery } from "@tanstack/react-query";
import {
  Search, X, ExternalLink, Loader2, Filter, List, Database,
  SlidersHorizontal,
} from "lucide-react";
import Header from "@/components/Header";
import MapaBrasil, { type AncoraPbia, type Ponto, type MapaBrasilHandle, type MunicipioClicado, type TransporteMapa, CORES_TRANSPORTE, FUNDOS, type FundoId, type CoropleticoMunicipal as Coro } from "@/components/mapa/MapaBrasil";
import { PainelEstado, PainelMunicipio, atoresDoMunicipio, type AtorDoPainel } from "@/components/mapa/PaineisLocais";
import { normalizarNome } from "@/lib/paineisLocais";
import { useCamadasAtores, camadasDoRegistro } from "@/lib/camadasAtores";
import { GavetaInferior } from "@/components/GavetaInferior";
import { useIsMobile } from "@/hooks/use-mobile";
import { ESTADOS } from "@/lib/sistemasEstaduais";
import { bboxDaFeature, carregarGeojson } from "@/components/mapa/maplibre/geo";
import MunicipiosDaCamada, { type SelecaoMunicipal } from "@/components/mapa/MunicipiosDaCamada";
import { CORES_COROPLETICO, CORTES_SINTESE_CORES } from "@/components/mapa/MapaBrasil";
import {
  CORTES_SINTESE, INDICADORES_MUNICIPAIS, type CamadaIa, anoDoPeriodo, cortesQuantis, formatarValor, periodoAteAno, porDezMilHabitantes, rotuloPeriodo,
  usePeriodosMunicipais, usePopulacaoMunicipal, useSinteseMunicipal, useValoresMunicipais,
} from "@/lib/seriesMunicipais";
import PainelConfiguracoes, { type ConfiguracoesMapa } from "@/components/mapa/PainelConfiguracoes";
import { definirTema, temaAtual } from "@/lib/tema";

import ListaFiltrados from "@/components/mapa/ListaFiltrados";
import FiltrosPorBase from "@/components/mapa/FiltrosPorBase";
import { FILTROS, resumoFiltros, type SelecaoFiltros } from "@/components/mapa/filtrosBase";
import { fetchLocationEnrichment } from "@/lib/locationEnrichment";
import { CATEGORIAS, CATEGORIA_MAP, categorizar, fonteLabel, type CategoriaKey } from "@/components/mapa/tipos";
import { safeSupabase } from "@/lib/supabaseClient";
import { type ResearchLocation } from "@/lib/researchLocations";
import { safeHttpUrl } from "@/lib/utils";
import PainelDataLake from "@/components/mapa/PainelDataLake";
import PainelPoliticas from "@/components/mapa/PainelPoliticas";
import { agregarArcos, TIPOS_INTERACAO, TIPO_PADRAO, tipoPorId, HELICE_ROTULO, DIMENSAO_ROTULO, ORIGEM_NACIONAL, type FluxoUf, type UnidadeEmbrapii, type ArcoAgregado } from "@/components/mapa/CamadaInteracao";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetchAll";
import { TEC_IA } from "@/lib/interacao";
import type { EnriquecimentoLayers } from "@/components/mapa/caboSubmarino";
import { cruzarLayersComAtores } from "@/utils/cruzarLayers";
import { canonizar, passaLake, resumoLake, type SelecaoLake } from "@/components/mapa/dataLake";
import { Button } from "@/components/ui/button";
import { REGIAO_POR_UF, REGIOES, ROTULO_REGIAO, UFS_POR_REGIAO, type Regiao } from "@/lib/regioes";
import { INDICADORES_REGIONAIS, base100, base100Uf, corCrescimento, corRegiao, formatarValorRegional, formatarVariacao, useSerieRegional, variacaoPct } from "@/lib/seriesRegionais";
import Evolucao, { type Recorte } from "@/components/mapa/Evolucao";
import { useCatalogoSeries, serieDisponivel } from "@/lib/catalogoSeries";
import BarraTempo, { type SerieTempo } from "@/components/mapa/BarraTempo";
import type { VisaoRegionalMapa } from "@/components/mapa/MapaBrasil";
import {
  type AntenaERB,
  type BackhaulMunicipio,
  type DadosCabos,
  type Datacenter,
  type UsinaAneel,
} from "@/components/mapa/caboSubmarino";

const COLUNAS =
  "id,nome,tipo,uf,municipio,latitude,longitude,fonte,fonte_url,cnpj,data_coleta,raw_metadata";


// Subtipos de geração da ANEEL (SIGA), conforme SigTipoGeracao,
// agrupados por fonte de geração para o filtro da Layer 1.
const GRUPOS_USINA = [
  { key: "hidreletrica", label: "Hidrelétrica", tipos: ["UHE", "PCH", "CGH"] },
  { key: "solar", label: "Solar", tipos: ["UFV"] },
  { key: "eolica", label: "Eólica", tipos: ["EOL"] },
  { key: "termica", label: "Térmica", tipos: ["UTE"] },
  { key: "nuclear", label: "Nuclear", tipos: ["UTN"] },
];
const TODOS_TIPOS_USINA = GRUPOS_USINA.flatMap((g) => g.tipos);

/** Facetas de tipo: "ICT; Unidade Embrapii" vira ["ICT", "Unidade Embrapii"]. */
const facetasTipo = (tipo: string) =>
  tipo.split(";").map((t) => t.trim()).filter(Boolean);

const segmentoDe = (l: ResearchLocation) =>
  typeof l.raw_metadata?.segmento === "string" ? (l.raw_metadata.segmento as string) : null;

type AtorLocalizado = { cnpj: string; precisao: "endereco" | "cep" | "municipio"; latitude: number | null; longitude: number | null; fonte_coordenada: string | null; capturado_em: string | null };

/**
 * Atores com CNPJ recebem a coordenada do cadastro (CEP ou endereço) no lugar do
 * centro do município; precisão 'municipio' só preenche quem não tem coordenada.
 * A coordenada antiga fica guardada em coord_cnpj. Falha na leitura mantém as originais.
 */
async function aplicarCoordenadasCnpj(locais: ResearchLocation[]) {
  const com = locais.filter((l) => l.cnpj);
  if (!com.length) return;
  let atores: AtorLocalizado[];
  try {
    atores = await fetchAll<AtorLocalizado>(
      supabase.from("vw_atores_localizados").select("cnpj,precisao,latitude,longitude,fonte_coordenada,capturado_em").order("cnpj"),
    );
  } catch { return; }
  const porCnpj = new Map(atores.map((a) => [a.cnpj, a]));
  for (const l of com) {
    const a = porCnpj.get(String(l.cnpj).replace(/\D/g, ""));
    if (!a || a.latitude == null || a.longitude == null) continue;
    if (a.precisao === "municipio" && l.latitude != null && l.longitude != null) continue;
    l.coord_cnpj = { precisao: a.precisao, capturado_em: a.capturado_em, fonte: a.fonte_coordenada, latitude_anterior: l.latitude, longitude_anterior: l.longitude };
    l.latitude = a.latitude;
    l.longitude = a.longitude;
  }
}

/**
 * Busca paginada — a base tem mais linhas do que o limite por requisição. A primeira
 * página traz a contagem total e as demais vêm em paralelo, em vez de uma após a outra.
 */
async function carregarLocais(): Promise<ResearchLocation[]> {
  const passo = 1000;
  const pagina = (de: number) => safeSupabase.from("research_locations").select(COLUNAS, de === 0 ? { count: "exact" } : undefined)
    .order("id", { ascending: true }).range(de, de + passo - 1);
  const primeira = await pagina(0);
  if (primeira.error) throw primeira.error;
  const todos = [...((primeira.data || []) as unknown as ResearchLocation[])];
  const total = Math.min(primeira.count ?? 0, 20000);
  const restantes = [];
  for (let de = passo; de < total; de += passo) restantes.push(pagina(de));
  for (const r of await Promise.all(restantes)) {
    if (r.error) throw r.error;
    todos.push(...((r.data || []) as unknown as ResearchLocation[]));
  }
  await aplicarCoordenadasCnpj(todos);
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

type InfraLayer = "energy" | "antennas" | "backhaul" | "datacenters";

// Vínculo equipamento → política pública, apenas onde a curadoria
// (public/politicas-layers.json, campo conexao_mapa) cita o equipamento.
function politicasDoEquipamento(
  tipo: "usina" | "datacenter" | "backhaul" | "cabo",
  detalhe = "",
): string | null {
  const p: string[] = [];
  const d = detalhe.toLowerCase();
  if (tipo === "usina") {
    const t = detalhe.toUpperCase();
    if (t === "EOL" || t === "PCH") p.push("PROINFA — Programa de Incentivo às Fontes Alternativas");
    if (t === "UHE" || t === "EOL" || t === "UFV") p.push("Novo PAC — Eixo Energia");
  }
  if (tipo === "datacenter") p.push("PBIA — Plano Brasileiro de Inteligência Artificial");
  if (tipo === "backhaul") {
    p.push("FUST — Fundo de Universalização dos Serviços de Telecom");
    p.push("ENEC — Estratégia Nacional de Escolas Conectadas");
  }
  if (tipo === "cabo" && (d.includes("norte conectado") || d.includes("infovia"))) {
    p.push("Programa Norte Conectado (PAC 01 + PAC 02 + PAIS)");
    p.push("Leilão 5G — Compromissos de Cobertura ANATEL");
  }
  return p.length ? p.join("; ") : null;
}
type InfraPayload = {
  data?: unknown[];
  failures?: Array<{ fonte?: string; error?: string }>;
  source?: string;
  ano?: string;
};
type InfraResponse = {
  data?: InfraPayload | null;
  error?: unknown;
};

// React pode montar a página mais de uma vez em desenvolvimento. Mantemos uma
// única chamada por camada durante a sessão para não consumir o limite da função.
const requisicoesInfra = new Map<InfraLayer, Promise<InfraResponse>>();

function buscarInfraestrutura(layer: InfraLayer): Promise<InfraResponse> {
  const existente = requisicoesInfra.get(layer);
  if (existente) return existente;

  const requisicao = safeSupabase.functions
    .invoke("map-infrastructure", { body: { layer } })
    .then(({ data, error }) => {
      // Falhas não ficam em cache: permite nova tentativa depois.
      if (error) requisicoesInfra.delete(layer);
      return { data: data as InfraPayload | null, error };
    })
    .catch((error: unknown) => {
      requisicoesInfra.delete(layer);
      return { error };
    });
  requisicoesInfra.set(layer, requisicao);
  return requisicao;
}

function mensagemFalhaInfra(falha: unknown): string {
  if (falha && typeof falha === "object") {
    const contexto = "context" in falha ? falha.context : null;
    if (contexto && typeof contexto === "object" && "status" in contexto && contexto.status === 429) {
      return "Limite temporário de consultas atingido. Tente novamente em alguns minutos.";
    }
    if ("message" in falha && typeof falha.message === "string") return falha.message;
  }
  return "fonte temporariamente indisponível";
}

// Lugar na URL: #parana (estado) ou #curitiba-pr (município), em minúsculas sem acento.
export const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const UF_POR_SLUG: Record<string, string> = Object.fromEntries(Object.entries(ESTADOS).map(([uf, nome]) => [slug(nome), uf]));
function lerLugarDaUrl(): { tipo: "uf"; uf: string } | { tipo: "municipio"; uf: string; slug: string } | null {
  const h = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (!h) return null;
  if (UF_POR_SLUG[h]) return { tipo: "uf", uf: UF_POR_SLUG[h] };
  const m = h.match(/^(.+)-([a-z]{2})$/);
  if (m && ESTADOS[m[2].toUpperCase()]) return { tipo: "municipio", uf: m[2].toUpperCase(), slug: m[1] };
  return null;
}
function escreverLugarNaUrl(lugar: { tipo: "uf"; uf: string } | { tipo: "municipio"; uf: string; nome: string } | null) {
  const hash = !lugar ? "" : lugar.tipo === "uf" ? `#${slug(ESTADOS[lugar.uf] ?? lugar.uf)}` : `#${slug(lugar.nome)}-${lugar.uf.toLowerCase()}`;
  const url = `${window.location.pathname}${window.location.search}${hash}`;
  if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.pushState(null, "", url);
}

// Modos do mapa: uma pergunta por vez; cada modo mostra só o que lhe diz respeito.
type Aba = "camadas" | "evolucao" | "interacao";
// Atores do SNI: os mesmos pontos lidos por camada de IA, por tipo de instituição ou só a infraestrutura.
type Agrupamento = "camadas" | "tipo" | "infra";
const CATS_INFRA = new Set<CategoriaKey>(["energia", "datacenter", "cabo", "backhaul"]);
const CATS_PONTO_INFRA = new Set<CategoriaKey>(["energia", "datacenter", "cabo", "backhaul", "supercomputacao"]);
const ABAS: { id: Aba; rotulo: string; icone: string; titulo: string }[] = [
  { id: "camadas", rotulo: "Atores do SNI", icone: "hub", titulo: "Atores e infraestrutura do sistema de inovação, por camada de IA, tipo ou infraestrutura" },
  { id: "evolucao", rotulo: "Evolução", icone: "timeline", titulo: "Séries históricas por região, estado ou município, com a barra de tempo" },
  { id: "interacao", rotulo: "Quem coopera", icone: "share", titulo: "Interações entre ICTs, empresas e governo" },
];
const CHAVE_CONFIG = "mapa-inovacao-config";
const CAMADA_POR_INFRA: Partial<Record<CategoriaKey, CamadaIa>> = { energia: "L1", cabo: "L2", backhaul: "L2", datacenter: "L3", supercomputacao: "L2" };
const URL_ISSUES = "https://github.com/ddeliberador/motor4pufpr/issues/new";

function lerMunModoDaUrl(): "sintese" | "indicador" | "nenhum" {
  const q = new URLSearchParams(window.location.search);
  if (q.get("coro") === "nenhum") return "nenhum";
  if (q.get("coro")) return "indicador";
  return "sintese";
}
function lerMunSelDaUrl(): SelecaoMunicipal | null {
  const q = new URLSearchParams(window.location.search);
  const c = q.get("coro");
  return c && c !== "nenhum" && INDICADORES_MUNICIPAIS.some((i) => i.id === c) ? { indicador: c, segmento: q.get("seg") || "" } : null;
}
function lerAbaDaUrl(): Aba {
  const v = new URLSearchParams(window.location.search).get("aba");
  if (v === "regional" || v === "lugar") return "evolucao";
  return ABAS.some((a) => a.id === v) ? (v as Aba) : "camadas";
}
function lerConfigSalva(): ConfiguracoesMapa {
  const base: ConfiguracoesMapa = { tema: temaAtual(), fundo: "sobrio", mostrarNomes: true, malhaMunicipal: true };
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_CONFIG) || "{}") as Partial<ConfiguracoesMapa>;
    const fundoUrl = new URLSearchParams(window.location.search).get("fundo");
    const fundo = FUNDOS.some((f) => f.id === fundoUrl) ? (fundoUrl as FundoId) : FUNDOS.some((f) => f.id === salvo.fundo) ? (salvo.fundo as FundoId) : "sobrio";
    return { ...base, ...salvo, fundo, tema: temaAtual() };
  } catch { return base; }
}

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
  // "Quem" unifica desenhar e filtrar: as categorias marcadas (camadas) também filtram a listagem.
  // Conjunto vazio = sem filtro (todas marcadas).
  const [ufsSel, setUfsSel] = useState<Set<string>>(new Set());
  const [ufFoco, setUfFoco] = useState<string | null>(null);
  const [regioesSel, setRegioesSel] = useState<Set<string>>(new Set());
  const [tiposSel, setTiposSel] = useState<Set<string>>(new Set());
  const [segmentosSel, setSegmentosSel] = useState<Set<string>>(new Set());
  const [soEmbrapii, setSoEmbrapii] = useState(false);
  const [soPbia, setSoPbia] = useState(false);
  // Camada temática: interações entre atores (tabela interacoes, catálogo em CamadaInteracao). Não é uma das 7 camadas de IA.
  const [interAtiva, setInterAtiva] = useState(false);
  const [interTipos, setInterTipos] = useState<Set<string>>(() => {
    const v = new URLSearchParams(window.location.search).get("inter");
    const ids = (v ?? "").split(",").filter((id) => tipoPorId(id));
    return new Set(ids.length ? ids : [TIPO_PADRAO]);
  });
  const [interCatalogo, setInterCatalogo] = useState<Record<string, { lacos: number; ano_min: number | null; ano_max: number | null }> | null>(null);
  const [interFluxos, setInterFluxos] = useState<FluxoUf[] | null>(null);
  const [interUnidades, setInterUnidades] = useState<UnidadeEmbrapii[] | null>(null);
  const [interErro, setInterErro] = useState<string | null>(null);
  const [interAno, setInterAno] = useState<number | null>(null); // null = acumulado
  const [interTecs, setInterTecs] = useState<Set<string>>(new Set());
  const [interSel, setInterSel] = useState<{ arco?: ArcoAgregado; unidade?: UnidadeEmbrapii } | null>(null);
  const [granular, setGranular] = useState<SelecaoFiltros>({});
  const [modo, setModo] = useState<"bases" | "lake">("bases");
  const [lakeSel, setLakeSel] = useState<SelecaoLake>({});
  const [selecao, setSelecao] = useState<{ pontos: Ponto[]; total: number } | null>(null);
  const [pontoSelecionadoId, setPontoSelecionadoId] = useState<string | null>(null);
  // Painel do lugar clicado: estado (zoom nacional) ou município (zoom municipal).
  const [painelLocal, setPainelLocal] = useState<{ tipo: "uf"; uf: string } | ({ tipo: "municipio" } & MunicipioClicado) | null>(null);
  const movel = useIsMobile();
  // Alguma camada ligada? Lido no clique do estado para acender as sete só quando o mapa está vazio.
  const algumaLayerRef = useRef(false);
  const setLayersTodas = (f: (todas: boolean) => boolean) => f(algumaLayerRef.current);
  // Navegação por lugar: Brasil → estado → município, com a câmera voando a cada nível,
  // trilho sobre o mapa e o lugar na URL (#parana, #curitiba-pr) para compartilhar e para o
  // botão voltar do navegador subir um nível.
  const ORDEM_UFS = useMemo(() => REGIOES.flatMap((r) => [...UFS_POR_REGIAO[r]].sort((a, b) => (ESTADOS[a] ?? a).localeCompare(ESTADOS[b] ?? b, "pt-BR"))), []);
  const irParaUf = useCallback((uf: string | null, opcoes?: { semHistorico?: boolean }) => {
    setInterSel(null);
    if (!uf) { setPainelLocal(null); setUfFoco(null); setUfsSel(new Set()); mapaRef.current?.enquadrarUf(null); }
    else {
      setPainelLocal({ tipo: "uf", uf }); setUfFoco(uf); setUfsSel(new Set([uf])); mapaRef.current?.enquadrarUf(uf);
      // Ao entrar num estado, as sete camadas acendem se nenhuma estava ligada (o Brasil abre vazio).
      setLayersTodas((todas) => { if (!todas) [setLayer1Ativa, setLayer2Ativa, setLayer3Ativa, setLayer4Ativa, setLayer5Ativa, setLayer6Ativa, setLayer7Ativa].forEach((f) => f(true)); return true; });
    }
    if (!opcoes?.semHistorico) escreverLugarNaUrl(uf ? { tipo: "uf", uf } : null);
  }, []);
  const irParaMunicipio = useCallback((m: MunicipioClicado, opcoes?: { semHistorico?: boolean; lonLat?: [number, number] }) => {
    setInterSel(null);
    setPainelLocal({ tipo: "municipio", ...m });
    setUfFoco(m.uf); setUfsSel(new Set([m.uf]));
    mapaRef.current?.enquadrarMunicipio(m.ibge);
    if (!opcoes?.semHistorico) escreverLugarNaUrl({ tipo: "municipio", ...m });
  }, []);
  const voltarUmNivel = useCallback(() => {
    if (painelLocal?.tipo === "municipio") irParaUf(painelLocal.uf);
    else irParaUf(null);
  }, [painelLocal, irParaUf]);
  // Lugar vindo da URL ao abrir, e botão voltar do navegador.
  useEffect(() => {
    let vivo = true;
    const aplicar = async (semHistorico: boolean) => {
      const lugar = lerLugarDaUrl();
      if (!lugar) { if (painelLocalRef.current) irParaUf(null, { semHistorico: true }); return; }
      if (lugar.tipo === "uf") { irParaUf(lugar.uf, { semHistorico }); return; }
      const pontos = await carregarGeojson<FeatureCollection<Point, { id: string; name: string; uf: string }>>("/br-mun-pontos.geojson").catch(() => null);
      if (!vivo || !pontos) return;
      const f = pontos.features.find((x) => x.properties.uf === lugar.uf && slug(x.properties.name) === lugar.slug);
      if (!f) { irParaUf(lugar.uf, { semHistorico }); return; }
      irParaMunicipio({ ibge: String(f.properties.id), nome: f.properties.name, uf: lugar.uf }, { semHistorico });
      // A malha da UF pode ainda não estar carregada: tenta enquadrar de novo quando chegar.
      setTimeout(() => mapaRef.current?.enquadrarMunicipio(String(f.properties.id)), 1500);
    };
    const t = setTimeout(() => aplicar(true), 800);
    const onPop = () => aplicar(true);
    window.addEventListener("popstate", onPop);
    return () => { vivo = false; clearTimeout(t); window.removeEventListener("popstate", onPop); };
  }, [irParaUf, irParaMunicipio]);
  const painelLocalRef = useRef(painelLocal); painelLocalRef.current = painelLocal;
  const [listaAberta, setListaAberta] = useState(false);
  const [painelPoliticasAberto, setPainelPoliticasAberto] = useState(false);
  // Visão regional: macrorregiões coloridas pela série histórica + régua do tempo.
  const [visaoRegional, setVisaoRegional] = useState(false);
  // Recorte do modo Evolução: regiões ou estados pintam as UFs; municípios pinta a malha municipal.
  const [recorte, setRecorte] = useState<Recorte>(() => (new URLSearchParams(window.location.search).get("recorte") as Recorte) || "regioes");
  const catalogoSeriesQ = useCatalogoSeries();
  // Evolução: ver o valor do ano ou o crescimento desde o ano-base (destaca quem mais cresceu).
  const [verCrescimento, setVerCrescimento] = useState(() => new URLSearchParams(window.location.search).get("ver") === "crescimento");
  const [indicadorRegionalId, setIndicadorRegionalId] = useState(INDICADORES_REGIONAIS[0].id);
  // Só séries com dado: se a escolhida não existe no banco, vai para a primeira que existe.
  useEffect(() => {
    const cat = catalogoSeriesQ.data;
    if (!cat) return;
    if (!serieDisponivel(cat, indicadorRegionalId, "uf")) {
      const primeiro = INDICADORES_REGIONAIS.find((i) => serieDisponivel(cat, i.id, "uf"));
      if (primeiro) setIndicadorRegionalId(primeiro.id);
    }
  }, [catalogoSeriesQ.data, indicadorRegionalId]);
  const [idxAnoRegional, setIdxAnoRegional] = useState(0);
  const [regiaoFoco, setRegiaoFoco] = useState<Regiao | null>(null);
  // Camada de transporte da visão regional (public/transporte): ligada ao entrar na aba Regional.
  const [transporte, setTransporte] = useState<TransporteMapa>({ rodovias: true, ferrovias: true, portos: true, aeroportos: true });
  // Camadas de dados exibidas no mapa (todas ligadas por padrão).
  const [camadas, setCamadas] = useState<Set<CategoriaKey>>(
    () => new Set(CATEGORIAS.map((c) => c.key)),
  );
  const catsSel = useMemo<Set<CategoriaKey>>(
    () => (CATEGORIAS.every((c) => camadas.has(c.key)) ? new Set() : new Set(camadas)),
    [camadas],
  );
  const [filtrosMobileAbertos, setFiltrosMobileAbertos] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [colunaMovelAberta, setColunaMovelAberta] = useState(false);
  // Abas da barra superior (uma por intenção de uso); cada uma mostra só o que lhe diz respeito.
  const [aba, setAba] = useState<Aba>(() => lerAbaDaUrl());
  const [configAberta, setConfigAberta] = useState(false);
  // Coluna lateral recolhível: o mapa é o protagonista; a coluna abre quando se precisa dela.
  const [colunaAberta, setColunaAberta] = useState<boolean>(() => { try { return localStorage.getItem("mapa-coluna") !== "fechada"; } catch { return true; } });
  useEffect(() => { try { localStorage.setItem("mapa-coluna", colunaAberta ? "aberta" : "fechada"); } catch { /* sem armazenamento */ } }, [colunaAberta]);
  const secaoMapaRef = useRef<HTMLElement>(null);
  const alternarTelaCheia = () => {
    const el = secaoMapaRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };
  const [config, setConfig] = useState<ConfiguracoesMapa>(lerConfigSalva);
  const mapaRef = useRef<MapaBrasilHandle>(null);
  // Nível municipal das Camadas de IA: "sintese" (média das camadas), um indicador de uma camada, ou nada.
  const [munModo, setMunModo] = useState<"sintese" | "indicador" | "nenhum">(() => lerMunModoDaUrl());
  const [munSel, setMunSel] = useState<SelecaoMunicipal | null>(() => lerMunSelDaUrl());
  const [normalizarMun, setNormalizarMun] = useState<boolean>(() => new URLSearchParams(window.location.search).get("pop") === "1");
  // Ano em foco da barra de série histórica (null = o mais recente). Vale para todas as visões temporais ao mesmo tempo.
  const [anoFoco, setAnoFoco] = useState<number | null>(null);
  const [interAcumulado, setInterAcumulado] = useState(true);
  // Camadas de IA — desligadas por padrão. Os locais físicos são pré-carregados
  // para que o total represente sempre o universo completo; a renderização só
  // ocorre quando a camada correspondente é ativada.
  const [layer1Ativa, setLayer1Ativa] = useState(false);
  const [layer1Carregando, setLayer1Carregando] = useState(false);
  const [dadosUsinas, setDadosUsinas] = useState<UsinaAneel[] | null>(null);
  // Subtipos de usina selecionados (vazio = todos os tipos).
  const [tiposUsina, setTiposUsina] = useState<Set<string>>(new Set());
  // Busca de usina pelo nome (ex.: Itaipu) e usina destacada no mapa.
  const [usinaSel, setUsinaSel] = useState<UsinaAneel | null>(null);
  const usinasEncontradas = useMemo(() => {
    const q = busca.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (q.length < 3 || !dadosUsinas) return [] as UsinaAneel[];
    return dadosUsinas.filter((u) => u.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q)).slice(0, 6);
  }, [busca, dadosUsinas]);
  const [erroLayer1, setErroLayer1] = useState<string | null>(null);
  const [layer2Ativa, setLayer2Ativa] = useState(false);
  const [layer2Carregando, setLayer2Carregando] = useState(false);
  const [dadosCabos, setDadosCabos] = useState<DadosCabos | null>(null);
  // Sub-camadas da Layer 2 — cada uma com estado e carregamento independentes.
  const [l2Cabos, setL2Cabos] = useState(false);
  const [l2Antenas, setL2Antenas] = useState(false);
  const [l2Backhaul, setL2Backhaul] = useState(false);
  const [dadosAntenas, setDadosAntenas] = useState<AntenaERB[] | null>(null);
  const [antenaCarregando, setAntenaCarregando] = useState(false);
  const [erroAntenas, setErroAntenas] = useState<string | null>(null);
  const [dadosBackhaul, setDadosBackhaul] = useState<BackhaulMunicipio[] | null>(null);
  const [backhaulCarregando, setBackhaulCarregando] = useState(false);
  const [erroBackhaul, setErroBackhaul] = useState<string | null>(null);
  const [layer3Ativa, setLayer3Ativa] = useState(false);
  // Registros fora de qualquer regra de camada: contados e ligáveis, nunca escondidos em silêncio.
  const [semCamadaAtiva, setSemCamadaAtiva] = useState(false);
  const [agrupamento, setAgrupamento] = useState<Agrupamento>(() => {
    const v = new URLSearchParams(window.location.search).get("agrupar");
    return v === "tipo" || v === "infra" ? v : "camadas";
  });
  const camadasAtoresQ = useCamadasAtores();
  const [layer3Carregando, setLayer3Carregando] = useState(false);
  const [dadosDCs, setDadosDCs] = useState<Datacenter[] | null>(null);
  const [erroLayer3, setErroLayer3] = useState<string | null>(null);
  // Layer 7 — Governança: sem fetch externo por ora; controla apenas visibilidade.
  const [layer7Ativa, setLayer7Ativa] = useState(false);
  // PBIA ancorado na Layer 7: eixo ativo, destaque de atores e âncoras georreferenciadas.
  const [pbiaEixo, setPbiaEixo] = useState<number | null>(null);
  const [pbiaCor, setPbiaCor] = useState<string | null>(null);
  const [pbiaDestacar, setPbiaDestacar] = useState(false);
  const [pbiaAncorasAtivas, setPbiaAncorasAtivas] = useState(true);
  const [pbiaAncoras, setPbiaAncoras] = useState<AncoraPbia[] | null>(null);
  const [ancoraSel, setAncoraSel] = useState<AncoraPbia | null>(null);

  useEffect(() => {
    if (!layer7Ativa || pbiaAncoras) return;
    fetch("/pbia-ancoras.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => setPbiaAncoras(d.ancoras ?? []))
      .catch(() => setPbiaAncoras([]));
  }, [layer7Ativa, pbiaAncoras]);

  // Catálogo de bases = fonte da verdade: camada desativada lá não carrega nem aparece aqui.
  const { bases: catalogo } = useCatalogo();
  const offCat = useCallback((k: string) => inativaNoCatalogo(catalogo, k), [catalogo]);
  const CAMADAS_CATALOGO: [string, string][] = [
    ["l1_usinas", "L1 Energia"], ["l2_cabos", "L2 Cabos"], ["l2_antenas", "L2 Antenas"],
    ["conectividade_municipios", "L2 Backhaul"], ["l3_datacenters", "L3 Datacenters"],
    ["l4_modelos", "L4 Modelos"], ["l5_contratos_ia", "L5 Contratos de IA"],
    ["l6_producao", "L6 Produção científica"], ["l7_politicas", "Políticas (L1–L7)"],
  ];
  const desativadasCatalogo = CAMADAS_CATALOGO.filter(([k]) => offCat(k)).map(([, n]) => n);
  // Layers 4, 5, 6, 7 — enriquecimento de atores existentes
  const [layer4Ativa, setLayer4Ativa] = useState(false);
  const [layer5Ativa, setLayer5Ativa] = useState(false);
  const [layer6Ativa, setLayer6Ativa] = useState(false);
  algumaLayerRef.current = layer1Ativa || layer2Ativa || layer3Ativa || layer4Ativa || layer5Ativa || layer6Ativa || layer7Ativa;
  const [enriquecimentoLayers, setEnriquecimentoLayers] = useState<EnriquecimentoLayers>({});
  const [layersEnrCarregando, setLayersEnrCarregando] = useState(false);
  const [erroLayersEnr, setErroLayersEnr] = useState<string | null>(null);

  const layersIaAtivas = useMemo(() => {
    const ativas: string[] = [];
    if (layer1Ativa) ativas.push("L1");
    if (layer2Ativa) ativas.push("L2");
    if (layer3Ativa) ativas.push("L3");
    if (layer4Ativa) ativas.push("L4");
    if (layer5Ativa) ativas.push("L5");
    if (layer6Ativa) ativas.push("L6");
    if (layer7Ativa) ativas.push("L7");
    return ativas;
  }, [layer1Ativa, layer2Ativa, layer3Ativa, layer4Ativa, layer5Ativa, layer6Ativa, layer7Ativa]);

  useEffect(() => {
    if (offCat("l1_usinas")) setLayer1Ativa(false);
    if (offCat("l2_cabos")) setL2Cabos(false);
    if (offCat("l2_antenas")) setL2Antenas(false);
    if (offCat("conectividade_municipios")) setL2Backhaul(false);
    if (offCat("l3_datacenters")) setLayer3Ativa(false);
    if (offCat("l4_modelos")) setLayer4Ativa(false);
    if (offCat("l5_contratos_ia")) setLayer5Ativa(false);
    if (offCat("l6_producao")) setLayer6Ativa(false);
    if (offCat("l7_politicas")) setLayer7Ativa(false);
  }, [offCat, layer1Ativa, l2Cabos, l2Antenas, l2Backhaul, layer3Ativa, layer4Ativa, layer5Ativa, layer6Ativa, layer7Ativa]);

  useEffect(() => {
    if (!catalogo || offCat("l1_usinas")) return;
    if (dadosUsinas) return;
    setLayer1Carregando(true);
    setErroLayer1(null);
    buscarInfraestrutura("energy")
      .then(({ data: resposta, error: falha }) => {
        if (falha) {
          setErroLayer1(mensagemFalhaInfra(falha));
          console.warn("Layer 1 — consulta indisponível:", mensagemFalhaInfra(falha));
          return;
        }
        if (!resposta || !Array.isArray(resposta.data)) {
          throw new Error("resposta inválida da ANEEL");
        }
        if (resposta.data.length === 0 && resposta.failures?.length) {
          const msg = `ANEEL indisponível: ${resposta.failures.map((f) => f.error).join("; ")}`;
          setErroLayer1(msg);
          console.warn("Layer 1 —", msg);
          return;
        }
        setDadosUsinas(resposta.data as UsinaAneel[]);
      })
      .catch((err) => {
        const mensagem = err instanceof Error ? err.message : "falha desconhecida";
        console.error("Layer 1 — ANEEL indisponível:", err);
        setErroLayer1(mensagem);
      })
      .finally(() => setLayer1Carregando(false));
  }, [dadosUsinas, catalogo, offCat]);

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

  // Layer 2b — Antenas: dump OpenCelliD (grade 0,1°) + ERBs licenciadas ANATEL (por município).
  // Snapshots reais gerados a partir das fontes oficiais; falhas por fonte ficam visíveis.
  useEffect(() => {
    if (!layer2Ativa || !l2Antenas || dadosAntenas) return;
    setAntenaCarregando(true);
    setErroAntenas(null);
    const obter = (url: string) =>
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        return r.json();
      });
    Promise.allSettled([obter("/opencellid-br.json"), obter("/anatel-erb-br.json")])
      .then(([ocid, anatel]) => {
        const lista: AntenaERB[] = [];
        const erros: string[] = [];
        if (ocid.status === "fulfilled" && Array.isArray(ocid.value?.grade)) {
          for (const g of ocid.value.grade as { lat: number; lon: number; LTE: number; NR: number; outros: number }[]) {
            const celulas = g.LTE + g.NR + g.outros;
            lista.push({
              id: `ocid-${g.lat}-${g.lon}`, lat: g.lat, lon: g.lon, mcc: "724", net: "",
              radio: g.NR > 0 ? "NR" : "LTE", fonte: "opencellid", celulas,
              operadora: `OpenCelliD · ${celulas} células (4G ${g.LTE}, 5G ${g.NR}, outras ${g.outros})`,
            });
          }
        } else erros.push(`OpenCelliD: ${ocid.status === "rejected" ? String(ocid.reason) : "formato inválido"}`);
        if (anatel.status === "fulfilled" && Array.isArray(anatel.value?.municipios)) {
          for (const m of anatel.value.municipios as { ibge: string; municipio: string; uf: string; lat: number; lon: number; estacoes: number; operadoras: Record<string, number> }[]) {
            lista.push({
              id: `anatel-${m.ibge}`, lat: m.lat, lon: m.lon, mcc: "724", net: "", radio: "LICENCIADA",
              fonte: "anatel", celulas: m.estacoes, uf: m.uf, municipio: m.municipio,
              operadora: `ANATEL · ${m.estacoes} ERBs licenciadas em ${m.municipio}/${m.uf} — ${Object.entries(m.operadoras).map(([o, n]) => `${o} ${n}`).join(", ")}`,
            });
          }
        } else erros.push(`ANATEL: ${anatel.status === "rejected" ? String(anatel.reason) : "formato inválido"}`);
        if (erros.length) {
          console.warn("Layer 2b — falhas:", erros);
          setErroAntenas(erros.join(" · "));
        }
        setDadosAntenas(lista);
      })
      .finally(() => setAntenaCarregando(false));
  }, [layer2Ativa, l2Antenas, dadosAntenas]);

  // Layer 2c — Backhaul por município (ANATEL dados abertos). Lazy load.
  useEffect(() => {
    if (!layer2Ativa || !l2Backhaul || dadosBackhaul) return;
    setBackhaulCarregando(true);
    setErroBackhaul(null);
    buscarInfraestrutura("backhaul")
      .then(async ({ data: resposta, error: falha }) => {
        if (falha) {
          setErroBackhaul(mensagemFalhaInfra(falha));
          console.warn("Layer 2c — consulta indisponível:", mensagemFalhaInfra(falha));
          return;
        }
        if (!resposta || !Array.isArray(resposta.data) || resposta.data.length === 0) {
          throw new Error("ANATEL respondeu sem municípios");
        }
        const lista = resposta.data as BackhaulMunicipio[];
        const listaComCoord = await geocodeLote(lista).catch((e) => {
          console.error("QLD-02: geocodificação do backhaul falhou; usando coordenadas do servidor", e);
          return lista;
        });
        setDadosBackhaul(listaComCoord);
      })
      .catch((err) => {
        const mensagem = err instanceof Error ? err.message : "falha desconhecida";
        console.error("Layer 2c — ANATEL backhaul indisponível:", err);
        setErroBackhaul(mensagem);
      })
      .finally(() => setBackhaulCarregando(false));
  }, [layer2Ativa, l2Backhaul, dadosBackhaul]);


  useEffect(() => {
    if (!catalogo || offCat("l3_datacenters")) return;
    if (dadosDCs) return;
    setLayer3Carregando(true);
    setErroLayer3(null);
    buscarInfraestrutura("datacenters")
      .then(async ({ data: resposta, error: falha }) => {
        if (!falha && resposta && Array.isArray(resposta.data) && resposta.data.length > 0) {
          return resposta.data as Datacenter[];
        }
        console.warn(
          "PeeringDB ao vivo indisponível; usando snapshot público validado:",
          falha || resposta?.failures,
        );
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
  }, [dadosDCs, catalogo, offCat]);

  // Camadas de equipamento físico (usinas, datacenters, cabos, backhaul) entram
  // como locais do mapa: somam na contagem, na lista filtrada e nas métricas.
  // Cada item recebe as políticas públicas da curadoria que o citam
  // explicitamente em `conexao_mapa` (public/politicas-layers.json).
  const locaisInfraTotais = useMemo(() => {
    const extras: ResearchLocation[] = [];
    if (dadosUsinas) {
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
            politicas_publicas: politicasDoEquipamento("usina", u.tipo),
          },
        } as unknown as ResearchLocation);
      }
    }
    if (dadosDCs) {
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
          raw_metadata: {
            org: dc.org ?? null,
            redes: dc.redes ?? null,
            politicas_publicas: politicasDoEquipamento("datacenter"),
          },
        } as unknown as ResearchLocation);
      }
    }
    if (dadosBackhaul) {
      for (const b of dadosBackhaul) {
        if (b.latitude == null || b.longitude == null) continue;
        extras.push({
          id: `anatel-backhaul-${b.uf}-${b.municipio}`,
          nome: b.municipio,
          tipo: b.temBackhaul ? "Backhaul (fibra óptica)" : "Backhaul (outros meios)",
          uf: b.uf || null,
          municipio: b.municipio || null,
          latitude: b.latitude,
          longitude: b.longitude,
          fonte: "anatel_backhaul",
          fonte_url: "https://www.anatel.gov.br/dadosabertos/paineis_de_dados/infraestrutura/mapeamento_rede_transporte.zip",
          cnpj: null,
          data_coleta: null,
          raw_metadata: {
            tem_backhaul: b.temBackhaul,
            meio: b.tipo ?? null,
            politicas_publicas: politicasDoEquipamento("backhaul"),
          },
        } as unknown as ResearchLocation);
      }
    }
    if (dadosCabos) {
      const pontos = new Map(dadosCabos.points.map((p) => [p.id, p]));
      // Cabos: um item por cabo, posicionado na primeira aterragem brasileira.
      for (const cabo of dadosCabos.cables) {
        const aterragens = (cabo.landing_point_ids || [])
          .map((id) => pontos.get(id))
          .filter((p): p is NonNullable<typeof p> => !!p);
        const ref = aterragens[0];
        if (!ref) continue;
        extras.push({
          id: `cabo-${cabo.id}`,
          nome: cabo.name,
          tipo: "Cabo submarino",
          uf: null,
          municipio: ref.name.split(",")[0] || null,
          latitude: ref.latitude,
          longitude: ref.longitude,
          fonte: "telegeography",
          fonte_url: `https://www.submarinecablemap.com/submarine-cable/${cabo.id}`,
          cnpj: null,
          data_coleta: null,
          raw_metadata: {
            aterragens_brasil: aterragens.map((p) => p.name).join("; "),
            politicas_publicas: politicasDoEquipamento("cabo", cabo.name),
          },
        } as unknown as ResearchLocation);
      }
      for (const p of dadosCabos.points) {
        extras.push({
          id: `landing-${p.id}`,
          nome: `Estação de aterragem — ${p.name}`,
          tipo: "Cabo submarino (aterragem)",
          uf: null,
          municipio: p.name.split(",")[0] || null,
          latitude: p.latitude,
          longitude: p.longitude,
          fonte: "telegeography",
          fonte_url: "https://www.submarinecablemap.com/",
          cnpj: null,
          data_coleta: null,
          raw_metadata: {
            cabos: dadosCabos.cables
              .filter((c) => c.landing_point_ids?.includes(p.id))
              .map((c) => c.name).join("; ") || null,
            politicas_publicas: politicasDoEquipamento("cabo", p.name),
          },
        } as unknown as ResearchLocation);
      }
    }
    return extras;
  }, [dadosUsinas, dadosDCs, dadosBackhaul, dadosCabos]);

  const locaisInfra = useMemo(
    () => locaisInfraTotais.filter((local) => {
      if (local.fonte === "aneel_siga") {
        const tipo = local.tipo.replace("Usina ", "");
        return layer1Ativa && (tiposUsina.size === 0 || tiposUsina.has(tipo));
      }
      if (local.fonte === "peeringdb") return layer3Ativa;
      if (local.fonte === "anatel_backhaul") return layer2Ativa && l2Backhaul;
      if (local.fonte === "telegeography") return layer2Ativa && l2Cabos;
      return false;
    }),
    [locaisInfraTotais, layer1Ativa, tiposUsina, layer3Ativa, layer2Ativa, l2Backhaul, l2Cabos],
  );

  // Contagem de usinas por subtipo, para o filtro da Layer 1.
  const contagemTipoUsina = useMemo(() => {
    const c: Record<string, number> = {};
    for (const u of dadosUsinas || []) c[u.tipo] = (c[u.tipo] || 0) + 1;
    return c;
  }, [dadosUsinas, catalogo, offCat]);

  const locais = useMemo(
    () => [...(data || []), ...locaisInfra],
    [data, locaisInfra],
  );

  // O denominador é o universo carregado e não diminui ao ocultar camadas,
  // selecionar subtipos ou aplicar filtros.
  const totalLocais = (data?.length || 0) + locaisInfraTotais.length;

  // Cruzamento das Layers 4–7 com os atores carregados (SNI + infraestrutura).
  useEffect(() => {
    if (!data || (!layer4Ativa && !layer5Ativa && !layer6Ativa && !layer7Ativa)) {
      setEnriquecimentoLayers({});
      setErroLayersEnr(null);
      return;
    }
    let cancelado = false;
    setLayersEnrCarregando(true);
    setErroLayersEnr(null);
    cruzarLayersComAtores([...data, ...locaisInfraTotais], {
      l4: layer4Ativa, l5: layer5Ativa, l6: layer6Ativa, l7: layer7Ativa,
    })
      .then(({ resultado, falhas }) => {
        if (cancelado) return;
        setEnriquecimentoLayers(resultado);
        if (falhas.length) {
          console.error("[Mapa] Cruzamento Layers 4–7:", falhas);
          setErroLayersEnr(falhas.join(" · "));
        }
      })
      .catch((e) => !cancelado && setErroLayersEnr(e instanceof Error ? e.message : "falha desconhecida"))
      .finally(() => !cancelado && setLayersEnrCarregando(false));
    return () => { cancelado = true; };
  }, [data, locaisInfraTotais, layer4Ativa, layer5Ativa, layer6Ativa, layer7Ativa]);

  const contagemEnr = useMemo(() => {
    const vs = Object.values(enriquecimentoLayers);
    return {
      l4: vs.filter((v) => v.l4).length, l5: vs.filter((v) => v.l5).length,
      l6: vs.filter((v) => v.l6).length, l7: vs.filter((v) => v.l7).length,
    };
  }, [enriquecimentoLayers]);

  // Toda linha do mapa pertence a uma camada de IA: atores pela classificação do banco
  // (camadasAtores), infraestrutura pela própria natureza (usina L1, cabo/backhaul L2, datacenter L3).
  const comCategoria = useMemo(
    () => locais.map((l) => {
      const categoria = categorizar(l.tipo);
      const cls = camadasDoRegistro(l.id, l.tipo, camadasAtoresQ.data);
      const camadaIa: CamadaIa | null = cls?.principal ?? CAMADA_POR_INFRA[categoria] ?? null;
      return { ...l, categoria, camadaIa, camadasIa: cls?.camadas ?? (camadaIa ? [camadaIa] : []) };
    }),
    [locais, camadasAtoresQ.data],
  );
  const contagemSemCamada = useMemo(() => comCategoria.filter((l) => !l.camadaIa).length, [comCategoria]);
  // Quantos registros de cada camada há no lugar em foco (Brasil, estado ou município): a coluna lê esse recorte.
  const contagemCamadaLugar = useMemo(() => {
    const out: Record<CamadaIa, number> = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0, L7: 0 };
    const nomeMun = painelLocal?.tipo === "municipio" ? normalizarNome(painelLocal.nome) : null;
    for (const l of comCategoria) {
      if (painelLocal && l.uf !== painelLocal.uf) continue;
      if (nomeMun && normalizarNome(l.municipio) !== nomeMun) continue;
      for (const c of l.camadasIa) out[c] += 1;
    }
    return out;
  }, [comCategoria, painelLocal]);
  const contagemCategoriaLugar = useMemo(() => {
    const out: Partial<Record<CategoriaKey, number>> = {};
    const nomeMun = painelLocal?.tipo === "municipio" ? normalizarNome(painelLocal.nome) : null;
    for (const l of comCategoria) {
      if (painelLocal && l.uf !== painelLocal.uf) continue;
      if (nomeMun && normalizarNome(l.municipio) !== nomeMun) continue;
      out[l.categoria] = (out[l.categoria] ?? 0) + 1;
    }
    return out;
  }, [comCategoria, painelLocal]);
  const ContagemCamada = ({ c }: { c: CamadaIa }) => (
    <span className="shrink-0 font-mono text-[10px] text-muted-foreground" title={painelLocal ? "registros neste lugar" : "registros no Brasil"}>{contagemCamadaLugar[c].toLocaleString("pt-BR")}</span>
  );

  // Atores no formato dos painéis de estado/município (todas as bases carregadas, sem os filtros da coluna).
  const atoresPainel: AtorDoPainel[] = useMemo(
    () => comCategoria.map((l) => ({ id: l.id, nome: l.nome, categoria: l.categoria, municipio: l.municipio ?? null, uf: l.uf ?? null, latitude: l.latitude == null ? null : Number(l.latitude), longitude: l.longitude == null ? null : Number(l.longitude) })),
    [comCategoria],
  );

  const comCanon = useMemo(
    () => comCategoria.map((l) => ({ ...l, canon: canonizar(l, enriquecimento[l.id] || {}) })),
    [comCategoria, enriquecimento],
  );

  const totalBases = useMemo(
    () => new Set(locais.map((l) => l.fonte)).size,
    [locais],
  );

  // Combinação previsível: opções dentro do mesmo grupo somam, enquanto grupos
  // diferentes se cruzam (ex.: Paraná + Datacenter = datacenters no Paraná).
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
      return grupos.every((g) => g(l));
    });
  }, [comCategoria, comCanon, busca, fontesSel, catsSel, ufsSel, regioesSel, tiposSel, segmentosSel, soEmbrapii, granular, enriquecimento, modo, lakeSel]);

  // Atores vinculados às Layers 4–7 ativas entram sempre, mesmo com a
  // categoria SNI desmarcada em "Camadas no mapa".
  // Um ponto entra quando alguma das suas camadas está ligada; sem camada, só com "Sem camada" ligado.
  const selecionados = useMemo(() => {
    const ativa: Record<CamadaIa, boolean> = { L1: layer1Ativa, L2: layer2Ativa, L3: layer3Ativa, L4: layer4Ativa, L5: layer5Ativa, L6: layer6Ativa, L7: layer7Ativa };
    if (agrupamento === "tipo") return filtrados.filter((l) => !CATS_INFRA.has(l.categoria) && camadas.has(l.categoria));
    if (agrupamento === "infra") return filtrados.filter((l) => CATS_PONTO_INFRA.has(l.categoria) && l.camadasIa.some((c) => ativa[c]));
    return filtrados.filter((l) => (l.camadasIa.length ? l.camadasIa.some((c) => ativa[c]) : semCamadaAtiva));
  }, [filtrados, layer1Ativa, layer2Ativa, layer3Ativa, layer4Ativa, layer5Ativa, layer6Ativa, layer7Ativa, semCamadaAtiva, agrupamento, camadas]);

  // Destaque PBIA: com um eixo ativo, restringe os pontos às categorias de atores
  // associadas àquele eixo (curadoria Motor 4P).
  const catsEixoPbia = useMemo(
    () => (layer7Ativa && pbiaDestacar && pbiaEixo ? new Set(CATEGORIAS_POR_EIXO[pbiaEixo] ?? []) : null),
    [layer7Ativa, pbiaDestacar, pbiaEixo],
  );

  const pbiaEixoLabel = useMemo(
    () => (layer7Ativa && pbiaDestacar && pbiaEixo ? `PBIA Eixo ${pbiaEixo}` : null),
    [layer7Ativa, pbiaDestacar, pbiaEixo],
  );

  const pontos: Ponto[] = useMemo(
    () =>
      selecionados
        .filter((l) => l.latitude != null && l.longitude != null)
        .filter((l) => !catsEixoPbia || catsEixoPbia.has(l.categoria))
        .map((l) => ({
          id: l.id,
          nome: l.nome,
          latitude: Number(l.latitude),
          longitude: Number(l.longitude),
          categoria: l.categoria,
        })),
    [selecionados, catsEixoPbia],
  );

  // Âncoras PBIA visíveis no mapa entram na listagem como registros próprios,
  // para a lista sempre espelhar o que está plotado (mesmo com o SNI desligado).
  const pbiaItens = useMemo(() => {
    if (!layer7Ativa) return [];
    const visiveis = pbiaEixo
      ? (pbiaAncoras ?? []).filter((a) => a.eixo === pbiaEixo)
      : pbiaAncorasAtivas
        ? (pbiaAncoras ?? [])
        : [];
    return visiveis.map((a) => ({
      id: a.id,
      nome: a.nome,
      tipo: "Infraestrutura âncora PBIA",
      uf: a.uf ?? null,
      municipio: a.municipio ?? null,
      latitude: a.latitude,
      longitude: a.longitude,
      fonte: "pbia_cgee",
      fonte_url: a.url ?? "",
      cnpj: null,
      data_coleta: "",
      categoria: "pbia" as CategoriaKey,
      raw_metadata: {
        eixo_pbia: `Eixo ${a.eixo}`,
        entidade: a.entidade,
        status: a.status,
        entrega_2026: a.entrega_2026,
        descricao: a.descricao,
        capacidade: a.capacidade,
        recurso: a.recurso_detalhe,
        camadas_ia: a.layers?.join(", "),
      },
    }));
  }, [layer7Ativa, pbiaEixo, pbiaAncoras, pbiaAncorasAtivas]);

  const contagemPorUf = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of selecionados) if (l.uf) c[l.uf] = (c[l.uf] || 0) + 1;
    return c;
  }, [selecionados]);

  // Recorte geográfico efetivo compartilhado pelo mapa-base e pelas camadas
  // de infraestrutura. Vazio significa Brasil inteiro.
  const ufsFiltroAtivas = useMemo(() => {
    const resultado = new Set(ufsSel);
    if (regioesSel.size > 0) {
      for (const [uf, regiao] of Object.entries(REGIAO_POR_UF)) {
        if (regioesSel.has(regiao)) resultado.add(uf);
      }
    }
    return resultado;
  }, [ufsSel, regioesSel]);

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

  // Categorias que são atores do SNI (bases de pesquisa)
  const CATEGORIAS_SNI: CategoriaKey[] = [
    "universidade", "instituto", "laboratorio", "startup",
    "supercomputacao", "embrapii", "habitat", "governo", "outro",
  ];
  // Categorias que são infraestrutura das Camadas de IA
  const CATEGORIAS_INFRA: CategoriaKey[] = ["energia", "datacenter", "backhaul", "cabo"];
  const semLayer = { layer: "", layerAtiva: false, setLayerAtiva: () => {} };
  const INFRA_LAYER_MAP: Record<CategoriaKey, { layer: string; layerAtiva: boolean; setLayerAtiva: (v: boolean) => void }> = {
    pbia: { layer: "L7", layerAtiva: layer7Ativa, setLayerAtiva: setLayer7Ativa },
    energia: { layer: "L1", layerAtiva: layer1Ativa, setLayerAtiva: setLayer1Ativa },
    datacenter: { layer: "L3", layerAtiva: layer3Ativa, setLayerAtiva: setLayer3Ativa },
    backhaul: {
      layer: "L2", layerAtiva: layer2Ativa && l2Backhaul,
      setLayerAtiva: (v) => { if (v) setLayer2Ativa(true); setL2Backhaul(v); },
    },
    cabo: {
      layer: "L2", layerAtiva: layer2Ativa && l2Cabos,
      setLayerAtiva: (v) => { if (v) setLayer2Ativa(true); setL2Cabos(v); },
    },
    universidade: semLayer, instituto: semLayer, laboratorio: semLayer, startup: semLayer,
    supercomputacao: semLayer, embrapii: semLayer, habitat: semLayer, governo: semLayer, outro: semLayer,
  };

  // Listagem: atores vinculados às Layers 4-7 primeiro; depois infraestrutura
  // (Layers 1-3); por fim os demais atores do SNI.
  const selecionadosOrdenados = useMemo(() => {
    const temEnr = layer4Ativa || layer5Ativa || layer6Ativa || layer7Ativa;
    if (!temEnr && !layer1Ativa && !layer2Ativa && !layer3Ativa) return selecionados;
    const PRIORIDADE: Partial<Record<CategoriaKey, number>> = {
      energia: 1, datacenter: 2, cabo: 3, backhaul: 4,
    };
    const temVinculo = (id: string) => {
      const v = enriquecimentoLayers[id];
      if (!v) return false;
      return (layer4Ativa && v.l4) || (layer5Ativa && v.l5) || (layer6Ativa && v.l6) || (layer7Ativa && v.l7);
    };
    return [...selecionados].sort((a, b) => {
      const pa = temEnr && temVinculo(a.id) ? 0 : (PRIORIDADE[a.categoria] ?? 99);
      const pb = temEnr && temVinculo(b.id) ? 0 : (PRIORIDADE[b.categoria] ?? 99);
      return pa - pb;
    });
  }, [selecionados, layer1Ativa, layer2Ativa, layer3Ativa, layer4Ativa, layer5Ativa, layer6Ativa, layer7Ativa, enriquecimentoLayers]);

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

  // "Limpar tudo": zera filtros, seleções, camadas de IA e o PBIA de uma vez.
  useEffect(() => {
    if (!interAtiva || interFluxos) return;
    Promise.all([
      fetchAll<FluxoUf>(supabase.from("vw_interacao_fluxo_uf_tipos").select("fonte,tipo,ano,tecnologia,origem_uf,origem_lat,origem_lon,destino_uf,destino_lat,destino_lon,lacos,projetos,destinos,valor_rateado")),
      fetchAll<UnidadeEmbrapii>(supabase.from("vw_embrapii_unidades_mapa").select("*")),
      supabase.from("vw_interacao_catalogo").select("fonte,tipo,lacos,ano_min,ano_max").then(({ data, error }) => { if (error) throw error; return data ?? []; }),
    ]).then(([f, u, c]) => {
      setInterFluxos(f); setInterUnidades(u);
      const cat: Record<string, { lacos: number; ano_min: number | null; ano_max: number | null }> = {};
      for (const r of c as { fonte: string; tipo: string; lacos: number | string; ano_min: number | null; ano_max: number | null }[]) {
        const k = `${r.fonte}:${r.tipo}`;
        const atual = cat[k] ?? { lacos: 0, ano_min: null, ano_max: null };
        cat[k] = {
          lacos: atual.lacos + Number(r.lacos ?? 0),
          ano_min: atual.ano_min == null ? r.ano_min : r.ano_min == null ? atual.ano_min : Math.min(atual.ano_min, r.ano_min),
          ano_max: atual.ano_max == null ? r.ano_max : r.ano_max == null ? atual.ano_max : Math.max(atual.ano_max, r.ano_max),
        };
      }
      setInterCatalogo(cat);
    }).catch((e) => setInterErro((e as Error).message));
  }, [interAtiva, interFluxos]);
  // Linhas dos tipos ligados; tecnologias e anos derivam só delas.
  const interFluxosTipos = useMemo(() => (interFluxos ?? []).filter((r) => interTipos.has(`${r.fonte}:${r.tipo}`)), [interFluxos, interTipos]);
  const interTecnologias = useMemo(
    () => [...new Set(interFluxosTipos.map((r) => r.tecnologia).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [interFluxosTipos],
  );
  const interAnos = useMemo(() => {
    const a = interFluxosTipos.map((r) => r.ano).filter((x): x is number => x != null);
    return a.length ? [Math.min(...a), Math.max(...a)] : [2014, 2026];
  }, [interFluxosTipos]);
  const interArcos = useMemo(() => agregarArcos(interFluxosTipos.filter((r) =>
    (interAno == null || r.ano === interAno) && (interTecs.size === 0 || (r.tecnologia != null && interTecs.has(r.tecnologia))))), [interFluxosTipos, interAno, interTecs]);
  const interComUnidades = useMemo(() => [...interTipos].some((id) => tipoPorId(id)?.comUnidades), [interTipos]);
  const interTiposSel = useMemo(() => TIPOS_INTERACAO.filter((t) => interTipos.has(t.id)), [interTipos]);

  const indicadorRegional =
    INDICADORES_REGIONAIS.find((i) => i.id === indicadorRegionalId) ?? INDICADORES_REGIONAIS[0];
  const serieRegionalQ = useSerieRegional(indicadorRegional.id, visaoRegional);
  const anosRegionais = useMemo(() => serieRegionalQ.data?.serie.anos ?? [], [serieRegionalQ.data]);
  // Ao trocar de indicador, a régua começa no ano mais recente.
  useEffect(() => {
    setIdxAnoRegional(Math.max(0, anosRegionais.length - 1));
  }, [anosRegionais]);
  const anoRegional = anosRegionais.length ? anosRegionais[Math.min(idxAnoRegional, anosRegionais.length - 1)] : null;

  // Centro de cada UF (bbox do contorno) para o número de cada estado ficar sobre o estado.
  const [centroUf, setCentroUf] = useState<Record<string, [number, number]>>({});
  useEffect(() => {
    carregarGeojson<FeatureCollection<Polygon | MultiPolygon, { sigla: string }>>("/br-uf.geojson")
      .then((d) => setCentroUf(Object.fromEntries(d.features.map((f) => { const b = bboxDaFeature(f); return [f.properties.sigla, [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] as [number, number]]; }))))
      .catch(() => undefined);
  }, []);
  const regionalMapa = useMemo<VisaoRegionalMapa | null>(() => {
    if (!visaoRegional) return null;
    const serie = serieRegionalQ.data?.serie;
    const linha = serie && anoRegional != null ? serie.celulas[anoRegional] : null;
    const preenchimento: Record<string, string> = {};
    const dica: Record<string, string> = {};
    const un = indicadorRegional.unidade;
    const emAno = anoRegional != null ? ` em ${anoRegional}` : "";
    // Crescimento: variação desde o primeiro ano com valor nos dez anteriores (mesma regra do base 100).
    // Os três que mais cresceram ganham destaque (▲, verde, rótulo maior) a cada ano da animação.
    const destaqueCor = "#34d399";
    if (recorte === "estados") {
      const ufs = REGIOES.flatMap((r) => UFS_POR_REGIAO[r].map((uf) => ({ uf, r, v: linha?.[r]?.porUf[uf] ?? null })));
      const cres = new Map(ufs.map(({ uf }) => { const b = serie && anoRegional != null ? base100Uf(serie, anoRegional, uf) : null; return [uf, b ? { pct: variacaoPct(b.indice), base: b.anoBase } : null]; }));
      const maxUf = Math.max(0, ...ufs.map((x) => x.v ?? 0));
      const maxPct = Math.max(0, ...[...cres.values()].map((c) => c?.pct ?? 0));
      const top = new Set([...cres.entries()].filter(([, c]) => c && c.pct > 0).sort((a, b) => b[1]!.pct - a[1]!.pct).slice(0, 3).map(([uf]) => uf));
      for (const { uf, v } of ufs) {
        const c = cres.get(uf);
        preenchimento[uf] = verCrescimento ? corCrescimento(c?.pct ?? null, maxPct) : corRegiao(v, maxUf);
        dica[uf] = `${ESTADOS[uf] ?? uf} · ${v == null ? "sem dado" : `${formatarValorRegional(v)} ${un}`}${emAno}` + (c ? `\n${formatarVariacao(c.pct)} desde ${c.base}` : "");
      }
      return {
        preenchimento, dica,
        destaque: new Set(ufFoco ? [ufFoco] : []),
        rotulos: ufs.filter(({ uf }) => centroUf[uf]).map(({ uf, v }) => {
          const c = cres.get(uf);
          const realce = verCrescimento && top.has(uf);
          return {
            lon: centroUf[uf][0], lat: centroUf[uf][1],
            titulo: `${realce ? "▲ " : ""}${uf}`,
            valor: verCrescimento ? (c ? formatarVariacao(c.pct) : "") : v == null ? "" : formatarValorRegional(v),
            ativo: ufFoco === uf, tamanho: realce ? 12 : 10, cor: realce ? destaqueCor : undefined,
          };
        }),
        onSelecionarUf: (uf: string) => setUfFoco((atual) => (atual === uf ? null : uf)),
      };
    }
    const cresR = new Map(REGIOES.map((r) => { const b = serie && anoRegional != null ? base100(serie, anoRegional, r) : null; return [r, b ? { pct: variacaoPct(b.indice), base: b.anoBase } : null]; }));
    const maxPctR = Math.max(0, ...[...cresR.values()].map((c) => c?.pct ?? 0));
    const topR = [...cresR.entries()].filter(([, c]) => c && c.pct > 0).sort((a, b) => b[1]!.pct - a[1]!.pct)[0]?.[0];
    for (const r of REGIOES) {
      const c = linha?.[r];
      const g = cresR.get(r);
      for (const uf of UFS_POR_REGIAO[r]) {
        preenchimento[uf] = verCrescimento ? corCrescimento(g?.pct ?? null, maxPctR) : corRegiao(c?.valor ?? null, serie?.maximo ?? 0);
        const vUf = c?.porUf[uf];
        dica[uf] = `${r} · ${formatarValorRegional(c?.valor ?? null)} ${un}${emAno}` + (g ? ` (${formatarVariacao(g.pct)} desde ${g.base})` : "") +
          `\n${uf}: ${vUf == null ? "sem dado" : formatarValorRegional(vUf)}`;
      }
    }
    return {
      preenchimento,
      dica,
      destaque: new Set(regiaoFoco ? UFS_POR_REGIAO[regiaoFoco] : []),
      rotulos: REGIOES.map((r) => {
        const g = cresR.get(r);
        const realce = verCrescimento && topR === r;
        return {
          lon: ROTULO_REGIAO[r][0],
          lat: ROTULO_REGIAO[r][1],
          titulo: `${realce ? "▲ " : ""}${r}`,
          valor: verCrescimento ? (g ? formatarVariacao(g.pct) : "sem base") : linha ? formatarValorRegional(linha[r].valor) : "",
          ativo: regiaoFoco === r,
          cor: realce ? destaqueCor : undefined,
        };
      }),
      onSelecionarUf: (uf: string) => {
        const r = REGIAO_POR_UF[uf];
        if (r) setRegiaoFoco((atual) => (atual === r ? null : r));
      },
    };
  }, [visaoRegional, serieRegionalQ.data, anoRegional, regiaoFoco, indicadorRegional.unidade, recorte, ufFoco, verCrescimento, centroUf]);

  // A aba Regional liga a visão regional; sair dela desliga. A aba Interação liga a camada EMBRAPII ao entrar.
  useEffect(() => {
    if (aba === "evolucao" && recorte !== "municipios") {
      setVisaoRegional(true);
      setListaAberta(false);
      setPainelPoliticasAberto(false);
      setUfFoco(null);
    } else {
      setVisaoRegional(false);
    }
    if (aba === "interacao") setInterAtiva(true);
  }, [aba, recorte]);

  useEffect(() => {
    definirTema(config.tema);
    try { localStorage.setItem(CHAVE_CONFIG, JSON.stringify(config)); } catch { /* sem armazenamento */ }
  }, [config]);

  // Estado vindo de um link compartilhado (ver linkDoMapa), lido uma vez.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const uf = q.get("uf");
    if (uf && /^[A-Z]{2}$/.test(uf)) { setUfsSel(new Set([uf])); setUfFoco(uf); }
    const cat = q.get("cat");
    if (cat) setCamadas(new Set(cat.split(",").filter((k) => k in CATEGORIA_MAP) as CategoriaKey[]));
    const l = new Set((q.get("l") || "").split(",").filter(Boolean));
    if (l.size) {
      setLayer1Ativa(l.has("1")); setLayer2Ativa(l.has("2")); setLayer3Ativa(l.has("3"));
      setLayer4Ativa(l.has("4")); setLayer5Ativa(l.has("5")); setLayer6Ativa(l.has("6")); setLayer7Ativa(l.has("7"));
    }
  }, []);

  const linkDoMapa = () => {
    const q = new URLSearchParams();
    q.set("aba", aba);
    if (aba === "camadas" && agrupamento !== "camadas") q.set("agrupar", agrupamento);
    if (aba === "evolucao") { q.set("recorte", recorte); if (verCrescimento) q.set("ver", "crescimento"); }
    if (ufFoco) q.set("uf", ufFoco);
    q.set("cat", [...camadas].join(","));
    const l = [layer1Ativa, layer2Ativa, layer3Ativa, layer4Ativa, layer5Ativa, layer6Ativa, layer7Ativa].map((v, i) => (v ? String(i + 1) : "")).filter(Boolean);
    if (l.length) q.set("l", l.join(","));
    if (config.fundo !== "sobrio") q.set("fundo", config.fundo);
    if (munModo === "nenhum") q.set("coro", "nenhum");
    else if (munModo === "indicador" && munSel) { q.set("coro", munSel.indicador); if (munSel.segmento) q.set("seg", munSel.segmento); }
    if (normalizarMun) q.set("pop", "1");
    if (anoFoco != null) q.set("ano", String(anoFoco));
    if (aba === "interacao") q.set("inter", [...interTipos].join(","));
    return `${window.location.origin}${window.location.pathname}?${q.toString()}`;
  };

  const nomeArquivo = () => `mapa-inovacao-${aba}${ufFoco ? `-${ufFoco}` : ""}${anoFoco != null ? `-${anoFoco}` : ""}`;
  const salvarPng = async () => {
    const url = await mapaRef.current?.imagemPng();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = `${nomeArquivo()}.png`; a.click();
  };
  const salvarPdf = async () => {
    const url = await mapaRef.current?.imagemPng();
    if (!url) return;
    const { jsPDF } = await import("jspdf");
    const img = new Image();
    await new Promise<void>((ok) => { img.onload = () => ok(); img.src = url; });
    const pdf = new jsPDF({ orientation: img.width >= img.height ? "landscape" : "portrait", unit: "px", format: [img.width, img.height] });
    pdf.addImage(url, "PNG", 0, 0, img.width, img.height);
    pdf.text(`Mapa da Inovação · Motor da Inovação (UFPR/PPGPP) · ${new Date().toLocaleDateString("pt-BR")}`, 12, img.height - 12);
    pdf.save(`${nomeArquivo()}.pdf`);
  };

  // ---------------------------------------------------------------- nível municipal
  const munAtivo = aba === "evolucao" && recorte === "municipios" && munModo !== "nenhum";
  const sintese = useSinteseMunicipal(anoFoco, normalizarMun, munAtivo && munModo === "sintese");
  const munDef = munModo === "indicador" && munSel ? INDICADORES_MUNICIPAIS.find((i) => i.id === munSel.indicador) ?? null : null;
  const munPeriodosQ = usePeriodosMunicipais(munAtivo && munDef ? munDef.id : null, munSel?.segmento ?? "");
  const munPeriodos = useMemo(() => munPeriodosQ.data ?? [], [munPeriodosQ.data]);
  const munPeriodo = periodoAteAno(munPeriodos, anoFoco);
  const munValoresQ = useValoresMunicipais(munAtivo && munDef && munPeriodo ? munDef.id : null, munSel?.segmento ?? "", munPeriodo?.periodo ?? null);
  const munPopQ = usePopulacaoMunicipal(munAtivo && normalizarMun && !!munDef?.normalizavel);

  const coropletico = useMemo<Coro | null>(() => {
    if (!munAtivo) return null;
    if (munModo === "sintese") {
      if (!sintese.camadas.length) return null;
      const rotuloCamadas = sintese.camadas.map((c) => `${c.camada} ${rotuloPeriodo(c.periodo, c.granularidade)}`).join(" · ");
      return {
        valores: sintese.valores, cortes: CORTES_SINTESE, cores: CORTES_SINTESE_CORES,
        rotulo: `Síntese das camadas (${sintese.camadas.length} de 7)${normalizarMun ? " · por habitante" : ""} · ${rotuloCamadas}`,
        formatar: (v) => `${v.toFixed(0)} / 100`,
      };
    }
    if (!munDef || !munPeriodo || !munValoresQ.data) return null;
    const normalizado = normalizarMun && munDef.normalizavel && !!munPopQ.data;
    const valores = normalizado ? porDezMilHabitantes(munValoresQ.data, munPopQ.data!.valores) : munValoresQ.data;
    const cortes = cortesQuantis(valores);
    const seg = munDef.segmentos.find((x) => x.id === (munSel?.segmento ?? ""))?.rotulo;
    return {
      valores, cortes, cores: CORES_COROPLETICO.slice(0, cortes.length + 1),
      rotulo: `${munDef.rotulo}${seg && munSel?.segmento ? ` · ${seg}` : ""} · ${rotuloPeriodo(munPeriodo.periodo, munPeriodo.granularidade)}${normalizado ? " · por 10 mil hab." : ""}`,
      formatar: (v) => formatarValor(v, munDef.unidade, normalizado),
    };
  }, [munAtivo, munModo, sintese, munDef, munPeriodo, munValoresQ.data, munPopQ.data, normalizarMun, munSel]);

  // ---------------------------------------------------------------- eixo de tempo único
  // Anos de entrada em operação das usinas (Layer 1), de 1950 ao mais recente.
  const anosUsinas = useMemo(() => {
    const anos = (dadosUsinas ?? []).map((u) => u.ano_operacao).filter((a): a is number => a != null && a >= 1950);
    if (!anos.length) return [] as number[];
    const [min, max] = [Math.min(...anos), Math.max(...anos)];
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [dadosUsinas]);
  const anosInteracao = useMemo(
    () => (interAtiva && interFluxos ? Array.from({ length: interAnos[1] - interAnos[0] + 1 }, (_, i) => interAnos[0] + i) : []),
    [interAtiva, interFluxos, interAnos],
  );
  const anosMunicipais = useMemo(() => {
    if (!munAtivo) return [] as number[];
    if (munModo === "sintese") return sintese.anos;
    return [...new Set(munPeriodos.map((p) => anoDoPeriodo(p.periodo)))].sort((a, b) => a - b);
  }, [munAtivo, munModo, sintese.anos, munPeriodos]);

  // União dos anos de tudo que está ligado; a barra percorre esse eixo e cada visão lê o seu recorte.
  const anosEixo = useMemo(() => {
    const todos = new Set<number>();
    if (visaoRegional) anosRegionais.forEach((a) => todos.add(a));
    else {
      anosMunicipais.forEach((a) => todos.add(a));
      if (aba === "interacao") anosInteracao.forEach((a) => todos.add(a));
      if (layer1Ativa) anosUsinas.forEach((a) => todos.add(a));
    }
    return [...todos].sort((a, b) => a - b);
  }, [visaoRegional, anosRegionais, anosMunicipais, aba, anosInteracao, layer1Ativa, anosUsinas]);
  const anoEfetivo = anosEixo.length ? (anoFoco != null && anosEixo.includes(anoFoco) ? anoFoco : anosEixo[anosEixo.length - 1]) : null;
  const ultimoAno = anosEixo.length ? anosEixo[anosEixo.length - 1] : null;

  // Recortes derivados do ano em foco.
  useEffect(() => {
    if (!anosRegionais.length || anoEfetivo == null) return;
    let idx = anosRegionais.length - 1;
    for (let i = 0; i < anosRegionais.length; i++) if (anosRegionais[i] <= anoEfetivo) idx = i;
    setIdxAnoRegional(idx);
  }, [anoEfetivo, anosRegionais]);
  useEffect(() => {
    if (!anosInteracao.length) return;
    setInterAno(interAcumulado || anoEfetivo == null ? null : Math.min(Math.max(anoEfetivo, anosInteracao[0]), anosInteracao[anosInteracao.length - 1]));
  }, [interAcumulado, anoEfetivo, anosInteracao]);
  const anoMaximoUsinas = layer1Ativa && anoEfetivo != null && ultimoAno != null && anoEfetivo < ultimoAno ? anoEfetivo : null;

  const serieTempo: SerieTempo | null = anosEixo.length ? {
    rotulos: anosEixo,
    indice: anoEfetivo != null ? anosEixo.indexOf(anoEfetivo) : anosEixo.length - 1,
    onIndice: (i) => setAnoFoco(anosEixo[i]),
    titulo: visaoRegional ? `${indicadorRegional.rotulo} · ${indicadorRegional.unidade} · por ${recorte === "estados" ? "estado" : "região"}`
      : [coropletico?.rotulo.split(" · ")[0], aba === "interacao" && anosInteracao.length ? (interTiposSel.length === 1 ? interTiposSel[0].rotulo.toLowerCase() : "interações entre atores") : null, layer1Ativa && anosUsinas.length ? "usinas em operação" : null].filter(Boolean).join(" + "),
    acumulado: aba === "interacao" && anosInteracao.length ? { ativo: interAcumulado, onAlternar: setInterAcumulado } : undefined,
  } : null;
  const motivoSemSerie = visaoRegional ? "carregando a série regional…"
    : sintese.carregando || munPeriodosQ.isLoading ? "carregando as séries municipais…"
    : munModo !== "nenhum" && !anosMunicipais.length ? "as séries municipais ainda não foram coletadas (Gestão da Pesquisa → Coletas); a Layer 1 ganha anos quando as usinas carregarem"
    : aba === "camadas" ? "ligue a L1 Energia (usinas por ano de operação) ou veja Como está cada lugar e Comparar regiões"
    : "ligue uma camada com série (municípios, usinas ou interações)";

  const municipiosDaCamada = (camada: CamadaIa) => ({
    camada,
    selecao: munSel && INDICADORES_MUNICIPAIS.find((i) => i.id === munSel.indicador)?.camada === camada ? munSel : null,
    onSelecionar: (sel: SelecaoMunicipal | null) => { setMunSel(sel); setMunModo(sel ? "indicador" : "sintese"); },
    cobertura: munDef && munDef.camada === camada && munPeriodo ? { municipios: munPeriodo.municipios, periodo: rotuloPeriodo(munPeriodo.periodo, munPeriodo.granularidade) } : null,
    carregando: munDef?.camada === camada && (munPeriodosQ.isLoading || munValoresQ.isLoading),
  });

  const limpar = () => {
    setAba("camadas");
    setAnoFoco(null);
    setMunModo("sintese");
    setMunSel(null);
    setVisaoRegional(false);
    setRegiaoFoco(null);
    setInterAtiva(false);
    setInterSel(null);
    setBusca("");
    setFontesSel(new Set());
    setUfsSel(new Set());
    setUfFoco(null);
    setRegioesSel(new Set());
    setTiposSel(new Set());
    setSegmentosSel(new Set());
    setSoEmbrapii(false);
    setSoPbia(false);
    setGranular({});
    setLakeSel({});
    setSelecao(null);
    setPontoSelecionadoId(null);
    setPainelLocal(null);
    escreverLugarNaUrl(null);
    setTiposUsina(new Set());
    setUsinaSel(null);
    // Volta ao estado de abertura do mapa: Brasil sem pontos; as camadas acendem ao entrar num estado.
    setLayer1Ativa(false);
    setLayer2Ativa(false);
    setLayer3Ativa(false);
    setSemCamadaAtiva(false);
    irParaUf(null);
    setLayer4Ativa(false);
    setLayer5Ativa(false);
    setLayer6Ativa(false);
    setLayer7Ativa(false);
    setPbiaEixo(null);
    setPbiaCor(null);
    setPbiaDestacar(false);
    setAncoraSel(null);
    setL2Cabos(false);
    setL2Antenas(false);
    setL2Backhaul(false);
    setListaAberta(false);
    setPainelPoliticasAberto(false);
    setCamadas(new Set(CATEGORIAS.map((c) => c.key)));
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
    if (pbiaEixoLabel) f.push(pbiaEixoLabel);
    return f;
  }, [busca, regioesSel, ufsSel, catsSel, tiposSel, segmentosSel, soEmbrapii, fontesSel, granular, modo, lakeSel, pbiaEixoLabel]);

  useEffect(() => {
    setSelecao(null);
    setPontoSelecionadoId(null);
  }, [busca, ufsSel, fontesSel, catsSel, regioesSel, tiposSel, segmentosSel, soEmbrapii, granular, modo, lakeSel, camadas, tiposUsina, l2Cabos, l2Antenas, l2Backhaul, layer1Ativa, layer2Ativa, layer3Ativa, layer4Ativa, layer5Ativa, layer6Ativa, layer7Ativa]);

  // Seleção no mapa espelha na listagem: abre o painel da lista
  useEffect(() => {
    if (pontoSelecionadoId) {
      setListaAberta(true);
      setPainelPoliticasAberto(false);
    }
  }, [pontoSelecionadoId]);

  // Clique num ícone que agrupa vários locais sobrepostos: abre a listagem
  // recortada apenas nesse grupo, para escolher qual local ver.
  useEffect(() => {
    if (selecao) {
      setListaAberta(true);
      setPainelPoliticasAberto(false);
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
        .map((p) => selecionados.find((l) => l.id === p.id))
        .filter(Boolean) as (ResearchLocation & { categoria: CategoriaKey })[];
    if (pontoSelecionadoId) {
      const l = selecionados.find((l) => l.id === pontoSelecionadoId);
      return l ? [l] : [];
    }
    return [];
  }, [selecao, pontoSelecionadoId, selecionados]);

  // Filtros do mapa (Buscar, Mais filtros, Fonte dos dados): abrem pelo botão Filtros da barra do mapa.
  const painelFiltros = (
    <div className="space-y-4 p-4">
        {/* Buscar: uma caixa só, para atores e usinas (quando a Layer 1 está ligada). */}
        {!visaoRegional && (
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => {
                  const v = e.target.value;
                  setBusca(v);
                  if (v.trim()) { setListaAberta(true); setPainelPoliticasAberto(false); }
                }}
                placeholder={layer1Ativa ? "Ator, cidade ou usina" : "Ator ou cidade"}
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            {busca.trim().length >= 3 && layer1Ativa && usinasEncontradas.length > 0 && (
              <div className="mt-1 rounded-lg border border-border bg-card p-1">
                <p className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">Usinas</p>
                {usinasEncontradas.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setUsinaSel(u);
                      setTiposUsina((atual) => {
                        if (atual.size === 0 || atual.has(u.tipo)) return atual;
                        const novo = new Set(atual); novo.delete("__nenhum__"); novo.add(u.tipo); return novo;
                      });
                    }}
                    className={`flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-[11px] hover:bg-muted ${usinaSel?.id === u.id ? "bg-pink-500/15" : ""}`}
                  >
                    <span className="material-symbols-outlined text-sm leading-none text-pink-500" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden>bolt</span>
                    <span className="flex-1 truncate">{u.nome}</span>
                    <span className="text-muted-foreground">{u.tipo} · {u.uf}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}


        {/* Mais filtros: tipo bruto e filtros por base, recolhidos. */}
        <details className="rounded-lg border border-border bg-card/60 px-2 py-1.5" open={tiposSel.size > 0 || Object.values(granular).some((v) => v && v.size > 0)}>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mais filtros</summary>
          <div className="mt-2 space-y-4">
        {/* Tipo, como vem da base */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tipo, como vem da base
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

          </div>
        </details>

        {/* Fonte dos dados: modo de leitura e bases, no rodapé. */}
        <details className="rounded-lg border border-border bg-card/60 px-2 py-1.5" open={fontesSel.size > 0 || modo === "lake"}>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fonte dos dados</summary>
          <div className="mt-2 space-y-3">
            <div className="flex rounded-lg border border-border bg-card p-0.5">
              <button onClick={() => setModo("bases")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${modo === "bases" ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <Filter className="h-3.5 w-3.5" /> Bases de origem
              </button>
              <button onClick={() => setModo("lake")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${modo === "lake" ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <Database className="h-3.5 w-3.5" /> Data Lake Cruzado
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">Bases de origem filtra pela fonte de cada registro; Data Lake Cruzado usa a classificação canônica do Motor, que cruza as fontes.</p>

        {modo === "bases" && (<>

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
          </div>
        </details>

    </div>
  );
  const colunaFiltros = (
          <aside
            className={`${movel ? "flex w-full flex-col p-4" : `hidden w-full flex-col overflow-y-auto border-border bg-background p-3 lg:static lg:z-auto lg:order-2 lg:shrink-0 lg:border-l lg:bg-muted/20 ${colunaAberta ? "lg:flex lg:w-[22rem]" : "lg:hidden"}`}`}
            aria-label="Lugar e camadas"
          >
            <div className="space-y-4">
              {/* O lugar em foco: Brasil, estado ou município. A coluna inteira lê esse recorte. */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {!painelLocal && (<>
                    <p className="text-base font-bold leading-tight">Brasil</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {aba === "evolucao" ? "Escolha o recorte e a série; a barra no rodapé do mapa percorre os anos."
                        : <><strong className="font-semibold text-foreground">{selecionados.length.toLocaleString("pt-BR")}</strong> de {totalLocais.toLocaleString("pt-BR")} registros no mapa · clique num estado para aproximar</>}
                    </p>
                  </>)}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {aba !== "evolucao" && (
                    <button type="button" onClick={() => { setListaAberta((v) => !v); setPainelPoliticasAberto(false); setConfigAberta(false); }} aria-pressed={listaAberta} title="Listagem do que está no mapa" aria-label="Listagem"
                      className={`toque flex h-8 w-8 items-center justify-center rounded-md border border-border ${listaAberta ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                      <List className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {layersIaAtivas.length > 0 && aba !== "evolucao" && (
                    <button type="button" onClick={() => { setPainelPoliticasAberto((v) => !v); setListaAberta(false); setConfigAberta(false); }} aria-pressed={painelPoliticasAberto} title="Políticas públicas por camada" aria-label="Políticas"
                      className={`toque flex h-8 w-8 items-center justify-center rounded-md border border-border ${painelPoliticasAberto ? "bg-violet-500/15 text-violet-400" : "text-muted-foreground hover:bg-muted"}`}>
                      <span className="material-symbols-outlined text-base leading-none" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden>policy</span>
                    </button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={limpar} title="Voltar ao estado de abertura" className="h-8 gap-1 px-2 text-xs">
                    <X className="h-3.5 w-3.5" /> Limpar
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={() => setFiltrosMobileAbertos(false)} aria-label="Fechar">
                    <X />
                  </Button>
                </div>
              </div>
              {painelLocal && !visaoRegional && (
                <nav aria-label="Lugar" className="flex max-w-full items-center gap-1 rounded-lg border border-border bg-card px-1.5 py-1 text-xs">
                  <button type="button" onClick={voltarUmNivel} aria-label="Voltar um nível" className="toque flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted">
                    <span className="material-symbols-outlined text-base leading-none" aria-hidden>arrow_back</span>
                  </button>
                  <button type="button" onClick={() => irParaUf(null)} className="rounded px-1 text-muted-foreground hover:bg-muted hover:text-foreground">Brasil</button>
                  <span className="text-muted-foreground">›</span>
                  <button type="button" onClick={() => irParaUf(painelLocal.uf)} className={`truncate rounded px-1 ${painelLocal.tipo === "uf" ? "font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{ESTADOS[painelLocal.uf] ?? painelLocal.uf}</button>
                  {painelLocal.tipo === "municipio" && (<><span className="text-muted-foreground">›</span><span className="truncate px-1 font-semibold">{painelLocal.nome}</span></>)}
                </nav>
              )}
              {painelLocal?.tipo === "uf" && !visaoRegional && (
                <PainelEstado
                  uf={painelLocal.uf}
                  anoFoco={anoEfetivo}
                  atores={atoresPainel.filter((a) => a.uf === painelLocal.uf)}
                  usinas={(dadosUsinas ?? []).filter((u) => u.uf === painelLocal.uf)}
                  datacenters={(dadosDCs ?? []).filter((d) => d.uf === painelLocal.uf)}
                  backhaul={(dadosBackhaul ?? []).filter((b) => b.uf === painelLocal.uf)}
                  sintese={munAtivo && munModo === "sintese" ? sintese.valores : null}
                  onFechar={() => irParaUf(null)}
                  onEnquadrar={() => mapaRef.current?.enquadrarUf(painelLocal.uf)}
                  onAbrirMunicipio={(m) => irParaMunicipio(m)}
                  onSelecionarPonto={(id) => setPontoSelecionadoId(id)}
                  embutido
                  onVizinho={(dir) => { const i = ORDEM_UFS.indexOf(painelLocal.uf); irParaUf(ORDEM_UFS[(i + dir + ORDEM_UFS.length) % ORDEM_UFS.length]); }}
                />
              )}
              {painelLocal?.tipo === "municipio" && !visaoRegional && (() => { const m = painelLocal; const nomeN = normalizarNome(m.nome); return (
                <PainelMunicipio
                  municipio={m}
                  anoFoco={anoEfetivo}
                  atores={atoresDoMunicipio(atoresPainel, m.nome, m.uf)}
                  usinas={(dadosUsinas ?? []).filter((u) => u.uf === m.uf && normalizarNome(u.municipio) === nomeN)}
                  datacenters={(dadosDCs ?? []).filter((d) => d.uf === m.uf && normalizarNome(d.cidade) === nomeN)}
                  backhaul={(dadosBackhaul ?? []).find((b) => b.uf === m.uf && normalizarNome(b.municipio) === nomeN) ?? null}
                  antenas={dadosAntenas ? dadosAntenas.filter((a) => a.uf === m.uf && normalizarNome(a.municipio) === nomeN).length : null}
                  sintese={munAtivo && munModo === "sintese" ? sintese.valores[m.ibge] ?? null : null}
                  onFechar={() => irParaUf(m.uf)}
                  onEnquadrar={() => mapaRef.current?.enquadrarMunicipio(m.ibge)}
                  embutido
                  onAbrirEstado={(uf) => irParaUf(uf)}
                  onSelecionarPonto={(id) => setPontoSelecionadoId(id)}
                />
              ); })()}
              {!painelLocal && aba === "camadas" && agrupamento === "camadas" && !layersIaAtivas.length && !layer1Ativa && !layer2Ativa && !layer3Ativa && (
                <p className="rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
                  O mapa abre sem pontos. Ligue uma camada abaixo para ver o que existe, ou clique num estado: ao entrar nele as sete camadas acendem.
                </p>
              )}


              {aba === "camadas" && (<>
              {/* Camadas de IA */}
              <div>
                {/* Agrupamento: como ler os mesmos atores. Cada um mostra os seus filtros. */}
                <div className="mb-2 flex rounded-lg border border-border bg-card p-0.5" role="tablist" aria-label="Agrupar por">
                  {([["camadas", "Camadas de IA"], ["tipo", "Tipo de ator"], ["infra", "Infraestrutura"]] as [Agrupamento, string][]).map(([id, rotulo]) => (
                    <button key={id} type="button" role="tab" aria-selected={agrupamento === id} onClick={() => setAgrupamento(id)}
                      className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium ${agrupamento === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{rotulo}</button>
                  ))}
                </div>
                <div className="space-y-1">
                  {desativadasCatalogo.length > 0 && (
                    <p role="status" className="rounded-md bg-muted px-2 py-1.5 text-[11px] text-muted-foreground">
                      Desativadas no Catálogo de Bases: {desativadasCatalogo.join(", ")}.
                    </p>
                  )}
                  {agrupamento === "tipo" && (<>
                    {CATEGORIAS.filter((c) => !CATS_INFRA.has(c.key)).map((c) => {
                      const n = contagemCategoriaLugar[c.key] ?? 0;
                      if (!n && !camadas.has(c.key)) return null;
                      return (
                        <label key={c.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-card px-2 py-1.5 text-xs hover:bg-muted">
                          <input type="checkbox" checked={camadas.has(c.key)} onChange={() => alternar(camadas, c.key, setCamadas)} className="h-3.5 w-3.5 shrink-0 accent-primary" />
                          <span className={`material-symbols-outlined shrink-0 text-base leading-none ${c.cor}`} style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden>{c.icon}</span>
                          <span className="flex-1 truncate">{c.label}</span>
                          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{n.toLocaleString("pt-BR")}</span>
                        </label>
                      );
                    })}
                  </>)}
                  {agrupamento !== "tipo" && (<>
                  {/* Layers 1–3 — infraestrutura de IA */}
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-card px-2 py-1.5 text-xs transition-colors hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={layer1Ativa}
                      onChange={() => {
                        const novo = !layer1Ativa;
                        setLayer1Ativa(novo);
                        setCamadas((prev) => {
                          const n = new Set(prev);
                          if (novo) n.add("energia"); else n.delete("energia");
                          return n;
                        });
                      }}
                      className="h-3.5 w-3.5 shrink-0 accent-pink-500"
                    />
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-pink-400" aria-hidden />
                    <span className="flex-1 truncate">L1 · Energia</span>
                    <ContagemCamada c="L1" />
                    {layer1Carregando && <span className="text-[10px] text-muted-foreground">carregando…</span>}
                  </label>
                  {erroLayer1 && layer1Ativa && (
                    <p className="px-2 text-[10px] text-destructive">ANEEL indisponível: {erroLayer1}</p>
                  )}
                  {layer1Ativa && <MunicipiosDaCamada {...municipiosDaCamada("L1")} />}
                  {layer1Ativa && dadosUsinas && dadosUsinas.length > 0 && (
                    <div className="ml-6 space-y-0.5 border-l border-border pl-2">
                      <div className="flex items-center justify-between pr-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Tipo de geração
                        </span>
                        {tiposUsina.size > 0 && (
                          <button
                            onClick={() => setTiposUsina(new Set())}
                            className="text-[10px] text-primary hover:underline"
                          >
                            todas
                          </button>
                        )}
                      </div>
                      {GRUPOS_USINA.map((g) => {
                        const n = g.tipos.reduce((s, t) => s + (contagemTipoUsina[t] || 0), 0);
                        if (!n) return null;
                        const marcado =
                          tiposUsina.size === 0 || g.tipos.every((t) => tiposUsina.has(t));
                        return (
                          <label
                            key={g.key}
                            className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[11px] hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() =>
                                setTiposUsina((atual) => {
                                  // Conjunto vazio = todos marcados.
                                  const novo =
                                    atual.size === 0 ? new Set(TODOS_TIPOS_USINA) : new Set(atual);
                                  if (marcado) g.tipos.forEach((t) => novo.delete(t));
                                  else g.tipos.forEach((t) => novo.add(t));
                                  // Se todos voltaram a ficar marcados, volta ao estado "todos" (vazio).
                                  if (novo.size === TODOS_TIPOS_USINA.length) return new Set();
                                  // Se nenhum ficou marcado, sentinela para não confundir com "todos".
                                  if (novo.size === 0) return new Set(["__nenhum__"]);
                                  return novo;
                                })
                              }
                              className="h-3 w-3 shrink-0 accent-pink-500"
                            />
                            <span className="flex-1 truncate">{g.label}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {n.toLocaleString("pt-BR")}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {/* Layer 2 — Infraestrutura Física, com sub-camadas */}
                  <div>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-card px-2 py-1.5 text-xs transition-colors hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={layer2Ativa}
                        onChange={() => {
                        const novo = !layer2Ativa;
                        setLayer2Ativa(novo);
                        setCamadas((prev) => {
                          const n = new Set(prev);
                          if (novo) {
                            if (l2Cabos) n.add("cabo");
                            if (l2Backhaul) n.add("backhaul");
                          } else {
                            n.delete("backhaul");
                            n.delete("cabo");
                          }
                          return n;
                        });
                      }}
                        className="h-3.5 w-3.5 shrink-0 accent-orange-500"
                      />
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-orange-400" aria-hidden />
                      <span className="flex-1 truncate">L2 · Infraestrutura Física</span>
                    <ContagemCamada c="L2" />
                      {layer2Carregando && <span className="text-[10px] text-muted-foreground">carregando…</span>}
                    </label>
                    {layer2Ativa && <MunicipiosDaCamada {...municipiosDaCamada("L2")} />}
                    {layer2Ativa && (
                      <div className="ml-6 mt-0.5 space-y-0.5 border-l border-border pl-2">
                        {/* 2a — Cabos submarinos */}
                        <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[11px] hover:bg-muted">
                          <input
                            type="checkbox"
                            checked={l2Cabos}
                            onChange={() => {
                              const novo = !l2Cabos;
                              setL2Cabos(novo);
                              setCamadas((prev) => {
                                const n = new Set(prev);
                                if (novo) n.add("cabo"); else n.delete("cabo");
                                return n;
                              });
                            }}
                            className="h-3 w-3 shrink-0 accent-orange-500"
                          />
                          <span className="h-1.5 w-4 shrink-0 rounded bg-orange-400" aria-hidden />
                          <span className="flex-1 truncate">Cabos submarinos</span>
                          {dadosCabos && (
                            <span className="text-[10px] text-muted-foreground">
                              {(dadosCabos.cables?.length ?? 0).toLocaleString("pt-BR")} cabos
                            </span>
                          )}
                        </label>
                        {/* 2b — Antenas 4G/5G */}
                        <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[11px] hover:bg-muted">
                          <input
                            type="checkbox"
                            checked={l2Antenas}
                            onChange={() => setL2Antenas((v) => !v)}
                            className="h-3 w-3 shrink-0 accent-orange-500"
                          />
                          <span className="h-2 w-2 shrink-0 rounded-full border border-orange-400 bg-orange-300" aria-hidden />
                          <span className="flex-1 truncate">Antenas 4G / 5G</span>
                          {antenaCarregando ? (
                            <span className="text-[10px] text-muted-foreground">carregando…</span>
                          ) : dadosAntenas && dadosAntenas.length > 0 ? (
                            <span className="text-[10px] text-muted-foreground">
                              {dadosAntenas.filter((a) => a.fonte === "anatel").reduce((s, a) => s + (a.celulas ?? 0), 0).toLocaleString("pt-BR")} ERBs ANATEL
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">ANATEL · OpenCelliD</span>
                          )}
                        </label>
                        {l2Antenas && erroAntenas && (
                          <p className="px-1 text-[10px] text-destructive">
                            Fonte indisponível: {erroAntenas}
                          </p>
                        )}
                        {/* 2c — Backhaul por município */}
                        <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[11px] hover:bg-muted">
                          <input
                            type="checkbox"
                            checked={l2Backhaul}
                            onChange={() => {
                              const novo = !l2Backhaul;
                              setL2Backhaul(novo);
                              setCamadas((prev) => {
                                const n = new Set(prev);
                                if (novo) n.add("backhaul"); else n.delete("backhaul");
                                return n;
                              });
                            }}
                            className="h-3 w-3 shrink-0 accent-orange-500"
                          />
                          <span className="h-2 w-2 shrink-0 rounded bg-amber-500" aria-hidden />
                          <span className="flex-1 truncate">Backhaul por município</span>
                          {backhaulCarregando ? (
                            <span className="text-[10px] text-muted-foreground">carregando…</span>
                          ) : dadosBackhaul ? (
                            <span className="text-[10px] text-muted-foreground">
                              {dadosBackhaul.length.toLocaleString("pt-BR")} mun.
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">ANATEL</span>
                          )}
                        </label>
                        {l2Backhaul && erroBackhaul && (
                          <p className="px-1 text-[10px] text-destructive">
                            ANATEL indisponível: {erroBackhaul}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-card px-2 py-1.5 text-xs transition-colors hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={layer3Ativa}
                      onChange={() => {
                        const novo = !layer3Ativa;
                        setLayer3Ativa(novo);
                        setCamadas((prev) => {
                          const n = new Set(prev);
                          if (novo) n.add("datacenter"); else n.delete("datacenter");
                          return n;
                        });
                      }}
                      className="h-3.5 w-3.5 shrink-0 accent-yellow-500"
                    />
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-yellow-400" aria-hidden />
                    <span className="flex-1 truncate">L3 · Infraestrutura Lógica</span>
                    <ContagemCamada c="L3" />
                    {layer3Carregando && <span className="text-[10px] text-muted-foreground">carregando…</span>}
                  </label>
                  {erroLayer3 && layer3Ativa && (
                    <p className="px-2 text-[10px] text-destructive">PeeringDB indisponível: {erroLayer3}</p>
                  )}
                  {layer3Ativa && <MunicipiosDaCamada {...municipiosDaCamada("L3")} />}
                  </>)}
                  {agrupamento === "infra" && (
                    <div className="mt-1 rounded-lg border border-border bg-card/60 p-2">
                      <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transporte</p>
                          {([
                            ["rodovias", "Rodovias", "road", "Natural Earth 1:10m (traçado principal)"],
                            ["ferrovias", "Ferrovias", "train", "Natural Earth 1:10m"],
                            ["portos", "Portos organizados", "anchor", "ANTAQ · posição aproximada"],
                            ["aeroportos", "Aeroportos (grandes e médios)", "flight", "OurAirports"],
                          ] as [keyof TransporteMapa, string, string, string][]).map(([k, rotulo, icone, fonte]) => (
                            <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-xs hover:bg-muted">
                              <input type="checkbox" checked={transporte[k]} onChange={(e) => setTransporte((t) => ({ ...t, [k]: e.target.checked }))} className="h-3.5 w-3.5 shrink-0" style={{ accentColor: CORES_TRANSPORTE[k] }} />
                              <span className="material-symbols-outlined shrink-0 text-base leading-none" style={{ color: CORES_TRANSPORTE[k] }} aria-hidden>{icone}</span>
                              <span className="flex-1">{rotulo}</span>
                              <span className="text-[10px] text-muted-foreground">{fonte}</span>
                            </label>
                          ))}
                    </div>
                  )}
                  {agrupamento === "camadas" && (<>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-card px-2 py-1.5 text-xs transition-colors hover:bg-muted">
                    <input type="checkbox" checked={layer4Ativa} onChange={() => setLayer4Ativa((v) => !v)}
                      className="h-3.5 w-3.5 shrink-0 accent-green-500" />
                    <span className="material-symbols-outlined shrink-0 text-base leading-none text-green-400"
                      style={{ fontVariationSettings: '"FILL" 1' }}>model_training</span>
                    <span className="flex-1 truncate">L4 · Modelos</span>
                    <ContagemCamada c="L4" />
                    {layersEnrCarregando && layer4Ativa && <span className="text-[10px] text-muted-foreground">cruzando…</span>}
                    {!layersEnrCarregando && layer4Ativa && (
                      <span className="text-[10px] text-muted-foreground">{contagemEnr.l4.toLocaleString("pt-BR")} atores</span>
                    )}
                  </label>
                  {layer4Ativa && <MunicipiosDaCamada {...municipiosDaCamada("L4")} />}
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-card px-2 py-1.5 text-xs transition-colors hover:bg-muted">
                    <input type="checkbox" checked={layer5Ativa} onChange={() => setLayer5Ativa((v) => !v)}
                      className="h-3.5 w-3.5 shrink-0 accent-teal-500" />
                    <span className="material-symbols-outlined shrink-0 text-base leading-none text-teal-400"
                      style={{ fontVariationSettings: '"FILL" 1' }}>rocket_launch</span>
                    <span className="flex-1 truncate">L5 · Aplicações</span>
                    <ContagemCamada c="L5" />
                    {layersEnrCarregando && layer5Ativa && <span className="text-[10px] text-muted-foreground">cruzando…</span>}
                    {!layersEnrCarregando && layer5Ativa && (
                      <span className="text-[10px] text-muted-foreground">{contagemEnr.l5.toLocaleString("pt-BR")} atores</span>
                    )}
                  </label>
                  {layer5Ativa && <MunicipiosDaCamada {...municipiosDaCamada("L5")} />}
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-card px-2 py-1.5 text-xs transition-colors hover:bg-muted">
                    <input type="checkbox" checked={layer6Ativa} onChange={() => setLayer6Ativa((v) => !v)}
                      className="h-3.5 w-3.5 shrink-0 accent-cyan-500" />
                    <span className="material-symbols-outlined shrink-0 text-base leading-none text-cyan-400"
                      style={{ fontVariationSettings: '"FILL" 1' }}>science</span>
                    <span className="flex-1 truncate">L6 · Pesquisa</span>
                    <ContagemCamada c="L6" />
                    {layersEnrCarregando && layer6Ativa && <span className="text-[10px] text-muted-foreground">cruzando…</span>}
                    {!layersEnrCarregando && layer6Ativa && (
                      <span className="text-[10px] text-muted-foreground">{contagemEnr.l6.toLocaleString("pt-BR")} atores</span>
                    )}
                  </label>
                  {layer6Ativa && <MunicipiosDaCamada {...municipiosDaCamada("L6")} />}
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-card px-2 py-1.5 text-xs transition-colors hover:bg-muted">
                    <input type="checkbox" checked={layer7Ativa} onChange={() => setLayer7Ativa((v) => !v)}
                      className="h-3.5 w-3.5 shrink-0 accent-violet-500" />
                    <span className="material-symbols-outlined shrink-0 text-base leading-none text-violet-400"
                      style={{ fontVariationSettings: '"FILL" 1' }}>policy</span>
                    <span className="flex-1 truncate">L7 · Governança</span>
                    <ContagemCamada c="L7" />
                    {layersEnrCarregando && layer7Ativa && <span className="text-[10px] text-muted-foreground">cruzando…</span>}
                    {!layersEnrCarregando && layer7Ativa && (
                      <span className="text-[10px] text-muted-foreground">{contagemEnr.l7.toLocaleString("pt-BR")} atores</span>
                    )}
                  </label>
                  {layer7Ativa && <MunicipiosDaCamada {...municipiosDaCamada("L7")} />}
                  {layer7Ativa && (
                    <PbiaEixos
                      eixoSelecionado={pbiaEixo}
                      onSelecionarEixo={(n, cor) => { setPbiaEixo(n); setPbiaCor(cor ?? null); if (n === null) setPbiaDestacar(false); }}
                      destacarAtores={pbiaDestacar}
                      onDestacarAtores={setPbiaDestacar}
                      mostrarAncoras={pbiaAncorasAtivas}
                      onMostrarAncoras={setPbiaAncorasAtivas}
                      onAbrirPoliticas={() => setPainelPoliticasAberto(true)}
                      atoresDoEixo={pontos.length}
                      ancoras={pbiaAncoras}
                      onSelecionarAncora={setAncoraSel}
                    />
                  )}
                  {erroLayersEnr && (layer4Ativa || layer5Ativa || layer6Ativa || layer7Ativa) && (
                    <p className="px-2 text-[10px] text-destructive">Cruzamento: {erroLayersEnr}</p>
                  )}
                  </>)}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {agrupamento === "camadas" ? "Todo ponto do mapa pertence a uma camada, pela classificação do banco (Análise → Como classificamos)."
                    : agrupamento === "tipo" ? "Os mesmos atores, pelo tipo de instituição. Infraestrutura fica no agrupamento ao lado."
                    : "Energia, conectividade, datacenters e transporte. A evolução no tempo destes ativos está no modo Evolução."}
                </p>
              </div>
              </>)}

              {/* Sem camada: o que a classificação do banco ainda não alcança; visível, nunca escondido. */}
              {aba === "camadas" && agrupamento === "camadas" && (
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted">
                  <input type="checkbox" checked={semCamadaAtiva} onChange={(e) => setSemCamadaAtiva(e.target.checked)} className="h-3.5 w-3.5 shrink-0 accent-muted-foreground" />
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-muted-foreground/60" aria-hidden />
                  <span className="flex-1 truncate">Sem camada (fora das regras)</span>
                  <span className="font-mono text-[10px]">{contagemSemCamada.toLocaleString("pt-BR")}</span>
                </label>
              )}


              {aba === "interacao" && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interação entre atores</p>
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    Laços entre ICTs e universidades, empresas e governo, agregados por UF de origem e destino. Ligue um ou mais tipos; cada um tem a sua cor. Clique num arco ou numa unidade para ver os números.
                  </p>
                  <div className="mt-2 rounded-lg border border-border bg-card/60 p-2">
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-xs hover:bg-muted">
                      <input type="checkbox" checked={interAtiva} onChange={() => { setInterAtiva((v) => !v); setInterSel(null); }}
                        className="h-3.5 w-3.5 shrink-0 accent-amber-500" />
                      <span className="material-symbols-outlined shrink-0 text-base leading-none text-amber-500" style={{ fontVariationSettings: '"FILL" 1' }}>share</span>
                      <span className="flex-1 font-semibold">Mostrar interações no mapa</span>
                      {interAtiva && !interFluxos && !interErro && <span className="text-[10px] text-muted-foreground">carregando…</span>}
                    </label>
                    {interErro && <p className="px-1 text-[10px] text-destructive">Falha: {interErro}</p>}
                    {interAtiva && (
                      <div className="mt-1 space-y-0.5 border-t border-border pt-1.5">
                        {(["acao", "recurso", "resultado"] as const).map((dim) => (
                          <div key={dim}>
                            <p className="px-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{DIMENSAO_ROTULO[dim]}</p>
                            {TIPOS_INTERACAO.filter((t) => t.dimensao === dim).map((t) => {
                              const n = interCatalogo?.[t.id]?.lacos ?? 0;
                              const semDado = interCatalogo != null && n === 0;
                              const ligado = interTipos.has(t.id);
                              return (
                                <label key={t.id} title={t.descricao}
                                  className={`flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 text-[11px] hover:bg-muted ${semDado ? "opacity-50" : ""}`}>
                                  <input type="checkbox" checked={ligado} disabled={semDado}
                                    onChange={() => { setInterTipos((s) => { const x = new Set(s); if (!x.delete(t.id)) x.add(t.id); return x; }); setInterSel(null); setInterTecs(new Set()); }}
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ accentColor: t.cor }} />
                                  <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: t.cor }} />
                                  <span className="min-w-0 flex-1">
                                    <span className="block leading-tight">{t.rotulo}</span>
                                    <span className="block text-[10px] text-muted-foreground">
                                      {HELICE_ROTULO[t.origem]} → {HELICE_ROTULO[t.destino]}
                                      {interCatalogo && (n > 0
                                        ? ` · ${n.toLocaleString("pt-BR")} laços · ${interCatalogo[t.id]?.ano_min ?? "?"}–${interCatalogo[t.id]?.ano_max ?? "?"}`
                                        : t.planejado ? ` · sem dado ainda: ${t.planejado}` : " · sem dado")}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                    {interAtiva && interFluxos && (
                      <div className="space-y-2 px-1 pt-2 text-[11px]">
                        {interTiposSel.length === 1 && <p className="text-muted-foreground">{interTiposSel[0].descricao}</p>}
                        {interTiposSel.length === 0 && <p className="text-muted-foreground">Nenhum tipo ligado: marque pelo menos um acima.</p>}
                        <p className="text-muted-foreground">Ano: <b className="text-foreground">{interAno ?? "acumulado"}</b> · percorra os anos na barra de série histórica, acima do mapa.</p>
                        {interTecnologias.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {interTecnologias.includes(TEC_IA) && (
                              <button onClick={() => setInterTecs(new Set([TEC_IA]))}
                                className={`rounded-full border px-2 py-0.5 font-bold ${interTecs.size === 1 && interTecs.has(TEC_IA) ? "border-amber-500 bg-amber-500/20" : "border-amber-500/50"}`}>Somente IA</button>
                            )}
                            <button onClick={() => setInterTecs(new Set())}
                              className={`rounded-full border px-2 py-0.5 ${interTecs.size === 0 ? "border-foreground/40 bg-muted" : "border-border"}`}>Todas</button>
                            {interTecnologias.map((t) => (
                              <button key={t} onClick={() => setInterTecs((s) => { const x = new Set(s); if (!x.delete(t)) x.add(t); return x; })}
                                className={`rounded-full border px-2 py-0.5 ${interTecs.has(t) ? "border-foreground/40 bg-muted text-foreground" : "border-border text-muted-foreground"}`}>{t}</button>
                            ))}
                          </div>
                        )}
                        <div className="space-y-0.5 text-muted-foreground">
                          <p><span className="inline-block h-1 w-4 rounded bg-foreground/60 align-middle" /> arco: UF de origem → UF de destino (espessura = laços; cor = tipo)</p>
                          <p><span className="inline-block h-2.5 w-2.5 rounded-full border border-foreground/60 bg-foreground/20 align-middle" /> círculo na capital: laços dentro da UF ou de origem nacional (governo federal, desafio nacional)</p>
                          {interComUnidades && <p><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 align-middle" /> unidade EMBRAPII (tamanho = projetos) · <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-amber-500 align-middle" /> posição aproximada. Unidades não variam com ano/tecnologia.</p>}
                          <p>{interArcos.length.toLocaleString("pt-BR")} pares de UF no filtro.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {aba === "evolucao" && (
                <div className="space-y-3">
                  <Evolucao
                    recorte={recorte} onRecorte={setRecorte}
                    catalogo={catalogoSeriesQ.data} catalogoCarregando={catalogoSeriesQ.isLoading}
                    indicador={indicadorRegional} onIndicador={(id) => setIndicadorRegionalId(id)}
                    dados={serieRegionalQ.data} carregando={serieRegionalQ.isLoading} ano={anoRegional}
                    regiaoFoco={regiaoFoco} onRegiaoFoco={setRegiaoFoco}
                    ufFoco={ufFoco} onUfFoco={(uf) => setUfFoco(uf)}
                    munModo={munModo} munSel={munSel} onMunicipios={(modo, sel) => { setMunModo(modo); setMunSel(sel); }}
                    normalizar={normalizarMun} onNormalizar={setNormalizarMun}
                    sinteseCamadas={sintese.camadas.map((c) => c.camada)} sinteseCarregando={sintese.carregando}
                    crescimento={verCrescimento} onCrescimento={setVerCrescimento}
                  />
                </div>
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
                          {l.fonte === "entes_estaduais" && (() => {
                            const m = (l.raw_metadata || {}) as Record<string, unknown>;
                            const aprox = String(m.coordenada || "").includes("aproximada");
                            return (
                              <div className="mt-0.5 space-y-0.5 text-[11px] text-muted-foreground">
                                {m.sigla ? <p>Sigla: <span className="text-foreground">{String(m.sigla)}</span></p> : null}
                                {m.rede ? <p>Rede: {String(m.rede)}</p> : null}
                                {m.peeringdb_nome ? <p>Opera o ponto de troca de tráfego <span className="text-foreground">{String(m.peeringdb_nome)}</span> (PeeringDB)</p> : null}
                                {aprox && <p className="italic">Posição aproximada: sede municipal da capital.</p>}
                              </div>
                            );
                          })()}
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
                Ver {selecionados.length.toLocaleString("pt-BR")} no mapa
              </Button>
            </div>
          </aside>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="pt-16">
        {/* Cabeçalho institucional */}


        <div className="flex flex-col lg:h-[calc(100vh-4rem)] lg:flex-row">
          {/* Coluna lateral de filtros */}
          {/* Coluna de filtros: lateral no desktop; no celular vai para uma gaveta inferior (abaixo). */}
          {!movel && colunaFiltros}

          {/* Mapa */}
          <section ref={secaoMapaRef} className="relative flex h-[calc(100dvh-7.75rem)] min-h-[28rem] flex-none flex-col overflow-hidden bg-background p-2 lg:h-auto lg:min-h-0 lg:flex-1">
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
                      setPainelPoliticasAberto(false);
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
              <Button type="button" variant="outline" className="h-11 shrink-0 px-3" onClick={() => setColunaMovelAberta(true)} aria-label="Lugar e camadas">
                <span className="material-symbols-outlined text-base leading-none" aria-hidden>layers</span>
              </Button>
            </div>
            {movel && (<>
              <GavetaInferior aberta={filtrosMobileAbertos} onAberta={setFiltrosMobileAbertos} alturas={[0.6, 0.96]} titulo="Filtros">
                {painelFiltros}
              </GavetaInferior>
              <GavetaInferior aberta={colunaMovelAberta || !!painelLocal} onAberta={(v) => { setColunaMovelAberta(v); if (!v && painelLocal) irParaUf(null); }} semBloqueio alturas={[0.22, 0.55, 0.94]} cabecalho={<span className="sr-only">Lugar e camadas</span>}>
                {colunaFiltros}
              </GavetaInferior>
            </>)}

            {/* Barra superior: abas por intenção + painéis à direita (no espírito do Global Election Simulator) */}
            {(
              <div className="mb-2 flex flex-nowrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setColunaAberta((v) => !v)}
                  title={colunaAberta ? "Recolher a coluna do lugar" : "Abrir a coluna do lugar"}
                  aria-label={colunaAberta ? "Recolher coluna" : "Abrir coluna"}
                  aria-pressed={colunaAberta}
                  className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
                >
                  <span className="material-symbols-outlined text-base leading-none" aria-hidden>{colunaAberta ? "right_panel_close" : "right_panel_open"}</span>
                </button>
                <div className="flex min-w-0 shrink items-center gap-1 overflow-x-auto rounded-lg border border-border bg-card p-0.5 [scrollbar-width:none]">
                  {ABAS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAba(a.id)}
                      aria-pressed={aba === a.id}
                      title={a.titulo}
                      className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                        aba === a.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base leading-none" aria-hidden>{a.icone}</span>
                      <span className={aba === a.id ? "inline" : "hidden sm:inline"}>{a.rotulo}</span>
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                {/* Filtros (Buscar, Mais filtros, Fonte): popover no desktop, gaveta no celular. */}
                {aba !== "evolucao" && <button type="button" onClick={() => setFiltrosAbertos((v) => !v)} aria-pressed={filtrosAbertos} aria-label="Filtros"
                  className={`hidden h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[11px] font-medium lg:flex ${filtrosAtivos.length ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros{filtrosAtivos.length ? ` (${filtrosAtivos.length})` : ""}
                </button>}
                <span className={`${aba === "evolucao" ? "hidden" : "hidden xl:inline"} whitespace-nowrap text-xs text-muted-foreground`} title={`${pontos.length.toLocaleString("pt-BR")} pontos georreferenciados${ultimaColeta ? ` · última coleta em ${ultimaColeta}` : ""} · clique num estado para aproximar, num ícone para ver a ficha · aproxime para ver os municípios`}>
                  <strong className="font-semibold text-foreground">{selecionados.length.toLocaleString("pt-BR")}</strong> de {totalLocais.toLocaleString("pt-BR")}
                </span>
                <div className="inline-flex shrink-0 items-center rounded-lg border border-border bg-card p-0.5">
                  <button
                    onClick={() => { setConfigAberta((v) => !v); setListaAberta(false); setPainelPoliticasAberto(false); }}
                    aria-pressed={configAberta}
                    title="Configurações do mapa"
                    aria-label="Configurações do mapa"
                    className={`flex h-8 w-9 items-center justify-center rounded-md transition-colors sm:h-auto sm:px-2.5 sm:py-1.5 ${
                      configAberta ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base leading-none" aria-hidden>settings</span>
                  </button>
                  <button
                    onClick={alternarTelaCheia}
                    title="Mapa em tela cheia (Esc para sair)"
                    aria-label="Mapa em tela cheia"
                    className="flex h-8 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted sm:h-auto sm:px-2.5 sm:py-1.5"
                  >
                    <span className="material-symbols-outlined text-base leading-none" aria-hidden>fullscreen</span>
                  </button>
                </div>
              </div>
            )}

            {filtrosAbertos && !movel && (
              <div className="absolute right-3 top-14 z-40 max-h-[70vh] w-[22rem] overflow-y-auto rounded-lg border border-border bg-card shadow-xl" role="dialog" aria-label="Filtros">
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtros</p>
                  <button type="button" onClick={() => setFiltrosAbertos(false)} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
                {painelFiltros}
              </div>
            )}
            {/* O mapa aparece de imediato; os registros da base chegam depois e entram como pontos.
                Carregamento e falha são avisos sobre o mapa, não substituem o mapa. */}
            {(
              <div className={`relative flex min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-background shadow-sm ${visaoRegional ? "flex-col sm:flex-row" : ""}`}>
                {isLoading && (
                  <div className="pointer-events-none absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs text-muted-foreground shadow backdrop-blur">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando os registros da base…
                  </div>
                )}
                {!!error && (
                  <div className="absolute left-1/2 top-3 z-30 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg border border-destructive/40 bg-card/95 px-3 py-2 text-xs text-destructive shadow backdrop-blur">
                    Falha ao consultar a base de locais de pesquisa: {(error as Error).message}
                  </div>
                )}
                <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-background transition-[width] duration-300">
                  <MapaBrasil
                    ref={mapaRef}
                    fundo={config.fundo}
                    mostrarNomes={config.mostrarNomes}
                    malhaMunicipal={config.malhaMunicipal}
                    coropletico={coropletico}
                    pontos={aba === "evolucao" ? [] : pontos}
                    regional={regionalMapa}
                    transporte={aba === "camadas" && agrupamento === "infra" ? transporte : null}
                    ufSelecionada={ufFoco}
                    ufsSelecionadas={ufsSel}
                    ufsFiltroAtivas={ufsFiltroAtivas}
                    contagemPorUf={contagemPorUf}
                    onSelecionarUf={(u) => irParaUf(painelLocal?.tipo === "uf" && painelLocal.uf === u ? null : u)}
                    onSelecionarMunicipio={(m) => irParaMunicipio(m)}
                    onSelecionarCluster={(pontos, total) => setSelecao({ pontos, total })}
                    pontoSelecionadoId={pontoSelecionadoId}
                    onSelecionarPonto={setPontoSelecionadoId}
                    grupoIds={grupoIds}
                    layer1Ativa={layer1Ativa && agrupamento !== "tipo"}
                    dadosUsinas={dadosUsinas}
                    tiposUsina={tiposUsina}
                    anoMaximoUsinas={anoMaximoUsinas}
                    usinaDestaque={usinaSel}
                    layer2Ativa={layer2Ativa && agrupamento !== "tipo"}
                    dadosCabos={dadosCabos}
                    l2Cabos={l2Cabos}
                    l2Antenas={l2Antenas}
                    dadosAntenas={dadosAntenas}
                    l2Backhaul={l2Backhaul}
                    dadosBackhaul={dadosBackhaul}
                    layer3Ativa={layer3Ativa && agrupamento !== "tipo"}
                    dadosDCs={dadosDCs}
                    layer7Ativa={layer7Ativa && agrupamento === "camadas"}
                    layer4Ativa={layer4Ativa && agrupamento === "camadas"}
                    layer5Ativa={layer5Ativa && agrupamento === "camadas"}
                    layer6Ativa={layer6Ativa && agrupamento === "camadas"}
                    enriquecimentoLayers={enriquecimentoLayers}
                    ancorasPbia={layer7Ativa && agrupamento === "camadas" ? (pbiaEixo ? (pbiaAncoras ?? []).filter((a) => a.eixo === pbiaEixo) : pbiaAncorasAtivas ? pbiaAncoras : null) : null}
                    corEixoPbia={layer7Ativa ? pbiaCor : null}
                    onSelecionarAncora={setAncoraSel}
                    interacao={interAtiva && interFluxos ? {
                      arcos: interArcos, unidades: interComUnidades ? (interUnidades ?? []) : [],
                      onArco: (a) => { setInterSel({ arco: a }); setPainelLocal(null); }, onUnidade: (u) => { setInterSel({ unidade: u }); setPainelLocal(null); },
                    } : null}
                  />
                  {interSel && (
                    <div className="absolute right-3 top-3 z-20 w-72 rounded-lg border border-border bg-card p-3 text-xs shadow-lg">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        {(() => { const t = interSel.arco ? tipoPorId(interSel.arco.tipoId) : TIPOS_INTERACAO[0]; const cor = t?.cor ?? "#f59e0b"; return (
                          <span className="rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ borderColor: `${cor}66`, color: cor }}>{interSel.unidade ? "Unidade EMBRAPII" : t?.rotulo}</span>
                        ); })()}
                        <button onClick={() => setInterSel(null)} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">✕</button>
                      </div>
                      {interSel.unidade && (() => { const u = interSel.unidade; return (
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">{u.unidade_embrapii ?? u.sigla}</p>
                          <p className="text-muted-foreground">{u.tipo_instituicao ?? "—"} · {[u.cidade, u.uf].filter(Boolean).join("/")}</p>
                          <p>Status: <b>{u.status_credenciamento ?? "—"}</b></p>
                          <p>Projetos: <b>{Number(u.projetos ?? 0).toLocaleString("pt-BR")}</b> · Empresas atendidas: <b>{Number(u.empresas ?? 0).toLocaleString("pt-BR")}</b></p>
                          <p>UFs alcançadas: <b>{u.ufs_alcancadas ?? "—"}</b></p>
                          <p>Valor total (IPCA): <b>{Number(u.valor_total_ipca ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</b></p>
                          {u.coordenada_aproximada && <p className="mt-1 rounded bg-muted px-2 py-1 text-muted-foreground">Posição aproximada: o ponto está na capital da UF, não no endereço da unidade.</p>}
                        </div>); })()}
                      {interSel.arco && (() => { const a = interSel.arco; const t = tipoPorId(a.tipoId); return (
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">{a.origem} → {a.destino}{a.origem === a.destino ? " (dentro da UF)" : a.origem === ORIGEM_NACIONAL ? " (origem nacional)" : ""}</p>
                          {t && <p className="text-muted-foreground">{HELICE_ROTULO[t.origem]} → {HELICE_ROTULO[t.destino]} · {DIMENSAO_ROTULO[t.dimensao].toLowerCase()}</p>}
                          <p>Laços: <b>{a.lacos.toLocaleString("pt-BR")}</b> · Projetos: <b>{a.projetos.toLocaleString("pt-BR")}</b></p>
                          <p>{t?.rotuloDestinos ?? "Destinos"}: <b>{a.destinos.toLocaleString("pt-BR")}</b>{interAno == null || interTecs.size !== 1 ? <span className="text-muted-foreground"> (soma por ano e tecnologia; o mesmo ator pode contar mais de uma vez)</span> : null}</p>
                          {a.valor > 0 && <p>Valor rateado (IPCA): <b>{a.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</b></p>}
                          <p className="text-muted-foreground">{interAno ?? "Acumulado"} · {interTecs.size === 0 ? "todas as tecnologias" : [...interTecs].join(", ")}</p>
                        </div>); })()}
                    </div>
                  )}
                  {/* Barra de série histórica: fixa em todos os modos (quando a visão não tem tempo, diz o motivo). */}
                  <div className="absolute bottom-3 left-1/2 z-20 w-[min(40rem,calc(100%-7rem))] -translate-x-1/2">
                    <BarraTempo serie={serieTempo} motivoSemSerie={motivoSemSerie} />
                  </div>
                  {configAberta && (
                    <PainelConfiguracoes
                      config={config}
                      onConfig={setConfig}
                      onFechar={() => setConfigAberta(false)}
                      linkDoMapa={linkDoMapa}
                      onSalvarPng={salvarPng}
                      onSalvarPdf={salvarPdf}
                      urlIssues={URL_ISSUES}
                    />
                  )}
                </div>
                {listaAberta && (
                  <ListaFiltrados
                     itens={[...((grupoIds ? selecionadosOrdenados.filter((l) => grupoIds.has(l.id)) : selecionadosOrdenados).filter((l) => !catsEixoPbia || catsEixoPbia.has(l.categoria))), ...pbiaItens]}
                     filtrosAtivos={filtrosAtivos}
                     total={totalLocais}
                     aberto={listaAberta}
                     onFechar={() => setListaAberta(false)}
                     pontoSelecionadoId={pontoSelecionadoId}
                     onSelecionarPonto={(id) => {
                       if (id && id.startsWith("ancora-")) {
                         const a = (pbiaAncoras ?? []).find((x) => x.id === id);
                         if (a) setAncoraSel(a);
                         return;
                       }
                       setPontoSelecionadoId(id);
                     }}
                     grupoTotal={selecao?.total ?? null}
                     onLimparGrupo={() => setSelecao(null)}
                     enriquecimentoLayers={enriquecimentoLayers}
                     layer4Ativa={layer4Ativa}
                     layer5Ativa={layer5Ativa}
                     layer6Ativa={layer6Ativa}
                     layer7Ativa={layer7Ativa}
                     ufSelecionada={ufsSel.size === 1 ? [...ufsSel][0] : null}
                    />
                )}
                {ancoraSel && (
                  <div className="absolute inset-0 z-30 flex" role="dialog" aria-label="Infraestrutura âncora PBIA">
                    <div className="flex-1 bg-black/40" onClick={() => setAncoraSel(null)} />
                    <aside className="w-full max-w-sm overflow-y-auto border-l border-border bg-background p-4 shadow-xl">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <span className="rounded border border-violet-500/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-400">
                          Âncora PBIA · Eixo {ancoraSel.eixo}
                        </span>
                        <button onClick={() => setAncoraSel(null)} className="text-xs text-muted-foreground hover:text-foreground">fechar</button>
                      </div>
                      <h3 className="text-sm font-semibold">{ancoraSel.nome}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[ancoraSel.entidade, [ancoraSel.municipio, ancoraSel.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ")}
                      </p>
                      {ancoraSel.layers && ancoraSel.layers.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {ancoraSel.layers.map((l) => (
                            <span key={l} className="rounded border border-violet-500/40 px-1 text-[10px] font-bold text-violet-300">{l}</span>
                          ))}
                        </div>
                      )}
                      {ancoraSel.descricao && (
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{ancoraSel.descricao}</p>
                      )}
                      <div className="mt-3 space-y-1 text-xs">
                        {ancoraSel.status && <p><strong>Status da ação:</strong> {ancoraSel.status}</p>}
                        {ancoraSel.capacidade && <p><strong>Capacidade / infraestrutura:</strong> {ancoraSel.capacidade}</p>}
                        {typeof ancoraSel.recurso_brl === "number" && (
                          <p><strong>Recurso vinculado:</strong> R$ {(ancoraSel.recurso_brl / 1_000_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} bi</p>
                        )}
                        {ancoraSel.recurso_detalhe && <p><strong>Financiamento:</strong> {ancoraSel.recurso_detalhe}</p>}
                        {ancoraSel.entrega_2026 && <p><strong>Entrega prevista 2026:</strong> {ancoraSel.entrega_2026}</p>}
                      </div>
                      {ancoraSel.acoes_nomes && ancoraSel.acoes_nomes.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ações vinculadas</p>
                          <ul className="mt-1 space-y-1 text-xs">
                            {ancoraSel.acoes_nomes.map((a) => <li key={a}>• {a}</li>)}
                          </ul>
                        </div>
                      )}
                      <div className="mt-4 space-y-1 text-[11px]">
                        <a href="/analise?cenario=3" className="block text-primary hover:underline">Ver Cenário 3 — Governança e Investimento</a>
                        <a href="https://pbia.cgee.org.br/resultados" target="_blank" rel="noreferrer" className="block text-primary hover:underline">Painel PBIA (CGEE)</a>
                        {ancoraSel.url && <a href={ancoraSel.url} target="_blank" rel="noreferrer" className="block text-primary hover:underline">Site da instituição</a>}
                        <p className="pt-1 text-muted-foreground">Vínculo ação × instalação: curadoria Motor 4P (UFPR/PPGPP).</p>
                      </div>
                    </aside>
                  </div>
                )}
                {layersIaAtivas.length > 0 && painelPoliticasAberto && (
                  <PainelPoliticas
                    layersAtivas={layersIaAtivas}
                    onFechar={() => setPainelPoliticasAberto(false)}
                    ufsSelecionadas={[...ufsSel]}
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

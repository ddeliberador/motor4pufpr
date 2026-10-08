// Edge Function: embrapii-sync
// Motor da Inovação · camada de interação · fonte EMBRAPII
//
// 1. Consulta o painel público da EMBRAPII (Power BI publicado na web, base SRInfo)
// 2. Grava as tabelas brutas embrapii_* (upsert + remoção do que sumiu da fonte)
// 3. Chama public.embrapii_derivar_interacoes() para montar as arestas em `interacoes`
// 4. Calcula métricas de rede (componentes, maior componente, HHI, densidade)
// 5. Registra a extração em embrapii_extracoes
//
// Chamada restrita: exige Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>.

import { createClient } from "npm:@supabase/supabase-js@2";

const PBI_URL =
  "https://wabi-brazil-south-b-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true";
const RESOURCE_KEY = "e1e03b0a-6dd0-465a-968d-49a2ef52967e";
const MODEL_ID = 8422191;
const DATASET_ID = "f273926c-a8c0-4d89-9963-8912ce20b038";
const REPORT_ID = "390e3fba-afdf-4358-b3d9-9973dd6bc222";
const WINDOW = 30000;
const LOTE = 500;
const MIN_PROJETOS = 1000; // trava de segurança: não sobrescreve a base com extração parcial
const JANELAS: [number, number][] = [[2014, 2018], [2019, 2022], [2023, 2026]];

type Row = Record<string, unknown>;

// Campos coletados. Ficam de fora, de propósito: contatos pessoais (LGPD),
// descrições internas de projeto e faturamento das empresas.
const CAMPOS = {
  ue_unidades_embrapii: [
    "co_unidade", "unidade_embrapii", "sigla", "tipo_instituicao", "uf", "cidade",
    "data_assinatura_plano_acao", "status_credenciamento", "data_descredenciamento",
    "latitude", "longitude", "competencia_tecnica", "vertical",
  ],
  ue_portfolio_projetos: [
    "cod_projeto", "dt_contrato", "dt_inicio", "dt_termino", "proj_status", "proj_titulo_publico",
    "ue_codigo", "ue_sigla", "ue_uf", "ue_tipo_instituicao",
    "fin_parceiro", "fin_modalidade_financiamento", "fin_sebrae",
    "vlr_ipca_embrapii", "vlr_ipca_empresa", "vlr_ipca_sebrae", "vlr_ipca_ue", "vlr_ipca_total",
    "cl_tipo_projeto", "cl_trl_inicial", "cl_trl_final", "cl_areaaplic_n1", "cl_techab_n1", "cl_techab_n2",
    "cl_nib_n1", "pi_n", "empresas_n_empresas", "me_n", "me_n_aceitas", "log_data_extracao_dados",
  ],
  ue_projetos_empresas: [
    "pk_cod_id", "cod_projeto", "empresa_cnpj", "empresa_nome", "empresa_uf", "empresa_municipio",
    "empresa_regiao", "empresa_porte", "empresa_cnae", "empresa_cnae_descricao", "empresa_data_abertura",
    "empresa_n_projetos_contratados", "_empresa_primeiro_contrato",
  ],
  ue_pedidos_pi: [
    "id_pedido", "cod_projeto", "tipo_pedido", "pais_emissor", "dat_pedido",
    "percentual_direito_ue", "ue_codigo", "ue_uf", "proj_status",
  ],
} as const;

// ------------------------------------------------------------------ Power BI

async function pbiTabela(entity: string, cols: readonly string[]): Promise<Row[]> {
  const select = cols.map((c) => ({
    Column: { Expression: { SourceRef: { Source: "t" } }, Property: c },
    Name: c,
  }));
  const body = {
    version: "1.0.0",
    queries: [{
      Query: {
        Commands: [{
          SemanticQueryDataShapeCommand: {
            Query: { Version: 2, From: [{ Name: "t", Entity: entity, Type: 0 }], Select: select },
            Binding: {
              Primary: { Groupings: [{ Projections: cols.map((_, i) => i) }] },
              DataReduction: { DataVolume: 4, Primary: { Window: { Count: WINDOW } } },
              Version: 1,
            },
            ExecutionMetricsKind: 1,
          },
        }],
      },
      QueryId: "",
      ApplicationContext: { DatasetId: DATASET_ID, Sources: [{ ReportId: REPORT_ID }] },
    }],
    cancelQueries: [],
    modelId: MODEL_ID,
  };
  const r = await fetch(PBI_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/plain, */*",
      "Content-Type": "application/json;charset=UTF-8",
      "X-PowerBI-ResourceKey": RESOURCE_KEY,
      "ActivityId": crypto.randomUUID(),
      "RequestId": crypto.randomUUID(),
      "Origin": "https://app.powerbi.com",
      "Referer": "https://app.powerbi.com/",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Power BI ${entity}: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
  return decodeDsr(await r.json(), [...cols]);
}

// Descomprime o formato DSR: R = bitmask de colunas repetidas da linha anterior,
// Ø = bitmask de nulos, DN = índice em ValueDicts.
export function decodeDsr(resp: any, names: string[]): Row[] {
  const ds = resp?.results?.[0]?.result?.data?.dsr?.DS?.[0];
  if (!ds) throw new Error("Resposta inesperada do Power BI: " + JSON.stringify(resp).slice(0, 500));
  const dicts: Record<string, unknown[]> = ds.ValueDicts ?? {};
  const linhas: any[] = ds.PH?.[0]?.DM0 ?? [];
  let schema: any[] = [];
  let prev: unknown[] = [];
  const out: Row[] = [];
  for (const row of linhas) {
    if (row.S) schema = row.S;
    const rep: number = row.R ?? 0;
    const nul: number = row["Ø"] ?? 0;
    const vals: unknown[] = row.C ?? [];
    let k = 0;
    const atual: unknown[] = [];
    for (let i = 0; i < schema.length; i++) {
      let v: unknown;
      if ((rep >> i) & 1) v = prev[i];
      else if ((nul >> i) & 1) v = null;
      else {
        v = vals[k++];
        const dn = schema[i].DN;
        if (dn && typeof v === "number") v = dicts[dn][v];
      }
      atual.push(v);
    }
    prev = atual;
    const obj: Row = {};
    names.forEach((n, i) => (obj[n] = atual[i]));
    out.push(obj);
  }
  if (out.length >= WINDOW || ds.RT) throw new Error(`Resultado truncado em ${names[0]}; fatiar a consulta.`);
  return out;
}

// ------------------------------------------------------------------ limpeza de valores

const vazio = (v: unknown) => v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
const txt = (v: unknown) => (vazio(v) ? null : String(v).trim() || null);
const int = (v: unknown) => (vazio(v) ? null : Math.round(Number(v)));
const num = (v: unknown) => (vazio(v) ? null : Math.round(Number(v) * 100) / 100);
const coord = (v: unknown) => (vazio(v) || Number(v) === 0 ? null : Number(v));
const cnpj = (v: unknown) => (vazio(v) ? null : String(v).replace(/\D/g, "") || null);
export function data(v: unknown): string | null {
  if (vazio(v)) return null;
  if (typeof v === "string" && /^-?\d+(\.0)?$/.test(v.trim())) v = Number(v);
  if (typeof v === "number") return new Date(v).toISOString().slice(0, 10); // ms desde 1970
  return String(v).slice(0, 10);
}

function transformar(raw: Record<string, Row[]>, carimbo: string) {
  const unidades = raw.ue_unidades_embrapii.map((r) => ({
    co_unidade: int(r.co_unidade), unidade_embrapii: txt(r.unidade_embrapii), sigla: txt(r.sigla),
    tipo_instituicao: txt(r.tipo_instituicao), uf: txt(r.uf), cidade: txt(r.cidade),
    data_assinatura_plano_acao: data(r.data_assinatura_plano_acao),
    status_credenciamento: txt(r.status_credenciamento), data_descredenciamento: data(r.data_descredenciamento),
    latitude: coord(r.latitude), longitude: coord(r.longitude),
    competencia_tecnica: txt(r.competencia_tecnica), vertical: txt(r.vertical), atualizado_em: carimbo,
  }));
  const projetos = raw.ue_portfolio_projetos.map((r) => ({
    cod_projeto: txt(r.cod_projeto), dt_contrato: data(r.dt_contrato), dt_inicio: data(r.dt_inicio),
    dt_termino: data(r.dt_termino), proj_status: txt(r.proj_status), proj_titulo_publico: txt(r.proj_titulo_publico),
    ue_codigo: int(r.ue_codigo), ue_sigla: txt(r.ue_sigla), ue_uf: txt(r.ue_uf),
    ue_tipo_instituicao: txt(r.ue_tipo_instituicao), fin_parceiro: txt(r.fin_parceiro),
    fin_modalidade_financiamento: txt(r.fin_modalidade_financiamento), fin_sebrae: txt(r.fin_sebrae),
    vlr_ipca_embrapii: num(r.vlr_ipca_embrapii), vlr_ipca_empresa: num(r.vlr_ipca_empresa),
    vlr_ipca_sebrae: num(r.vlr_ipca_sebrae), vlr_ipca_ue: num(r.vlr_ipca_ue), vlr_ipca_total: num(r.vlr_ipca_total),
    cl_tipo_projeto: txt(r.cl_tipo_projeto), cl_trl_inicial: int(r.cl_trl_inicial), cl_trl_final: int(r.cl_trl_final),
    cl_areaaplic_n1: txt(r.cl_areaaplic_n1), cl_techab_n1: txt(r.cl_techab_n1), cl_techab_n2: txt(r.cl_techab_n2),
    cl_nib_n1: txt(r.cl_nib_n1), pi_n: int(r.pi_n), empresas_n_empresas: int(r.empresas_n_empresas),
    me_n: int(r.me_n), me_n_aceitas: int(r.me_n_aceitas), log_data_extracao_dados: data(r.log_data_extracao_dados),
    atualizado_em: carimbo,
  }));
  const projetoEmpresa = raw.ue_projetos_empresas.map((r) => ({
    pk_cod_id: int(r.pk_cod_id), cod_projeto: txt(r.cod_projeto), empresa_cnpj: cnpj(r.empresa_cnpj),
    empresa_nome: txt(r.empresa_nome), empresa_uf: txt(r.empresa_uf), empresa_municipio: txt(r.empresa_municipio),
    empresa_regiao: txt(r.empresa_regiao), empresa_porte: txt(r.empresa_porte), empresa_cnae: txt(r.empresa_cnae),
    empresa_cnae_descricao: txt(r.empresa_cnae_descricao), empresa_data_abertura: data(r.empresa_data_abertura),
    empresa_n_projetos_contratados: int(r.empresa_n_projetos_contratados),
    empresa_primeiro_contrato: txt(r._empresa_primeiro_contrato), atualizado_em: carimbo,
  }));
  const pedidosPi = raw.ue_pedidos_pi.map((r) => ({
    id_pedido: int(r.id_pedido), cod_projeto: txt(r.cod_projeto), tipo_pedido: txt(r.tipo_pedido),
    pais_emissor: txt(r.pais_emissor), dat_pedido: data(r.dat_pedido),
    percentual_direito_ue: num(r.percentual_direito_ue), ue_codigo: int(r.ue_codigo), ue_uf: txt(r.ue_uf),
    proj_status: txt(r.proj_status), atualizado_em: carimbo,
  }));
  return { unidades, projetos, projetoEmpresa, pedidosPi };
}

// ------------------------------------------------------------------ métricas de rede

export function metricasRede(
  projetos: { cod_projeto: string | null; dt_contrato: string | null; ue_codigo: number | null; cl_techab_n1: string | null }[],
  projetoEmpresa: { cod_projeto: string | null; empresa_cnpj: string | null }[],
  carimbo: string,
) {
  const proj = new Map(projetos.map((p) => [p.cod_projeto, p]));
  const laços = projetoEmpresa.flatMap((pe) => {
    const p = proj.get(pe.cod_projeto);
    if (!p || !p.dt_contrato) return [];
    return [{ o: `embrapii_ue:${p.ue_codigo}`, d: `cnpj:${pe.empresa_cnpj}`, ano: Number(p.dt_contrato.slice(0, 4)), tec: p.cl_techab_n1 }];
  });
  const anos = [...new Set(laços.map((l) => l.ano))].sort((a, b) => a - b);
  const janelas: [number, number][] = [...JANELAS, ...anos.map((a) => [a, a] as [number, number]), [anos[0], anos[anos.length - 1]]];
  const recortes = ["todos", ...[...new Set(laços.map((l) => l.tec).filter(Boolean))].sort() as string[]];
  const vistos = new Set<string>();
  const out: Row[] = [];
  for (const recorte of recortes) {
    const base = recorte === "todos" ? laços : laços.filter((l) => l.tec === recorte);
    for (const [ini, fim] of janelas) {
      const chave = `${recorte}|${ini}|${fim}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      const sub = base.filter((l) => l.ano >= ini && l.ano <= fim);
      if (!sub.length) continue;
      const pai = new Map<string, string>();
      const achar = (x: string): string => {
        let r = x;
        while (pai.get(r) !== r) r = pai.get(r)!;
        let y = x;
        while (pai.get(y) !== r) { const z = pai.get(y)!; pai.set(y, r); y = z; }
        return r;
      };
      const arestas = new Set<string>();
      for (const l of sub) {
        if (!pai.has(l.o)) pai.set(l.o, l.o);
        if (!pai.has(l.d)) pai.set(l.d, l.d);
        arestas.add(`${l.o}\u0000${l.d}`);
        const a = achar(l.o), b = achar(l.d);
        if (a !== b) pai.set(a, b);
      }
      const tamanhos = new Map<string, number>();
      for (const n of pai.keys()) { const r = achar(n); tamanhos.set(r, (tamanhos.get(r) ?? 0) + 1); }
      const nos = pai.size;
      const origens = new Map<string, number>();
      for (const l of sub) origens.set(l.o, (origens.get(l.o) ?? 0) + 1);
      const hhi = [...origens.values()].reduce((s, c) => s + (c / sub.length) ** 2, 0);
      const nDest = new Set(sub.map((l) => l.d)).size;
      out.push({
        fonte: "embrapii", tipo: "cooperacao_pdi", recorte, ano_inicio: ini, ano_fim: fim,
        nos, arestas: arestas.size, componentes: tamanhos.size,
        maior_componente_pct: Math.round((Math.max(...tamanhos.values()) / nos) * 1e4) / 1e4,
        hhi_origem: Math.round(hhi * 1e4) / 1e4,
        densidade: Math.round((arestas.size / (origens.size * nDest)) * 1e8) / 1e8,
        calculado_em: carimbo,
      });
    }
  }
  return out;
}

// ------------------------------------------------------------------ handler

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const syncKey = Deno.env.get("EMBRAPII_SYNC_KEY") || "";
  const okSync = syncKey !== "" && req.headers.get("x-sync-key") === syncKey;
  const okService = req.headers.get("Authorization") === `Bearer ${serviceKey}`;
  if (!okSync && !okService) {
    return new Response(JSON.stringify({ erro: "não autorizado" }), { status: 401 });
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } });
  const carimbo = new Date().toISOString();
  const log: Record<string, unknown> = {};
  try {
    const raw: Record<string, Row[]> = {};
    for (const [entity, cols] of Object.entries(CAMPOS)) raw[entity] = await pbiTabela(entity, cols);
    const t = transformar(raw, carimbo);
    if (t.projetos.length < MIN_PROJETOS) throw new Error(`Só ${t.projetos.length} projetos; carga abortada.`);

    const upsert = async (tabela: string, linhas: Row[], onConflict: string) => {
      for (let i = 0; i < linhas.length; i += LOTE) {
        const { error } = await sb.from(tabela).upsert(linhas.slice(i, i + LOTE), { onConflict });
        if (error) throw new Error(`${tabela}: ${error.message}`);
      }
      log[tabela] = linhas.length;
    };
    await upsert("embrapii_unidades", t.unidades, "co_unidade");
    await upsert("embrapii_projetos", t.projetos, "cod_projeto");
    await upsert("embrapii_projeto_empresa", t.projetoEmpresa, "pk_cod_id");
    await upsert("embrapii_pedidos_pi", t.pedidosPi, "id_pedido");

    for (const tabela of ["embrapii_pedidos_pi", "embrapii_projeto_empresa", "embrapii_projetos", "embrapii_unidades"]) {
      const { error } = await sb.from(tabela).delete().lt("atualizado_em", carimbo);
      if (error) throw new Error(`limpeza ${tabela}: ${error.message}`);
    }

    const { data: nInteracoes, error: eRpc } = await sb.rpc("embrapii_derivar_interacoes");
    if (eRpc) throw new Error(`derivar interacoes: ${eRpc.message}`);
    log.interacoes = nInteracoes;

    const metricas = metricasRede(t.projetos, t.projetoEmpresa, carimbo);
    await sb.from("interacao_metricas_rede").delete().eq("fonte", "embrapii");
    await upsert("interacao_metricas_rede", metricas, "fonte,tipo,recorte,ano_inicio,ano_fim");

    await sb.from("embrapii_extracoes").insert({
      extraido_em: carimbo,
      fonte: "embrapii.org.br/dados (Power BI publicado na web, base SRInfo)",
      metodo: "Edge Function embrapii-sync via endpoint público querydata do Power BI",
      linhas: log,
    });
    return new Response(JSON.stringify({ ok: true, extraido_em: carimbo, linhas: log }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, erro: String(e), parcial: log }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});

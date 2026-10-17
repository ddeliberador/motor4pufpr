// Coleta de cadastro CNPJ (Receita via BrasilAPI) para os CNPJs que o Motor já
// conhece, seguida de geocodificação por CEP (BrasilAPI CEP v2) com queda para
// o município. Chamada pelo pg_cron com a chave do Vault (x-coleta-key).
// Lote limitado a ~120 s, ritmo inicial de 2 req/s, espera em 429, retomada
// pela fila (cnpj_fila) e trava em ingest_jobs.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { clienteServico, finalizarColeta, iniciarColeta, registrarFoto } from "../_shared/temporal.ts";

const VERSAO = "coleta-cnpj-v1-2026-10";
const JOB = "coleta-cnpj";
const ORCAMENTO_MS = 120_000;
const UA = { Accept: "application/json", "User-Agent": "Motor4PUFPR/1.0 (motorinovacao.com.br)" };
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && v !== null && v !== "" ? n : null; };

/** Limitador compartilhado por CNPJ e CEP; dobra o intervalo a cada 429. */
class Ritmo {
  intervalo = 500; ultima = 0; vistos429 = 0;
  async buscar(url: string): Promise<Response> {
    for (let tentativa = 0; ; tentativa++) {
      // Reserva o próximo horário antes de dormir: vale para vários trabalhadores.
      const slot = Math.max(Date.now(), this.ultima + this.intervalo);
      this.ultima = slot;
      if (slot > Date.now()) await dormir(slot - Date.now());
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) });
      if (r.status !== 429 || tentativa >= 2) return r;
      this.vistos429++;
      this.intervalo = Math.min(this.intervalo * 2, 8000);
      const ra = Number(r.headers.get("retry-after"));
      await r.body?.cancel();
      await dormir(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 10_000);
    }
  }
}

type Municipio = { lat: number; lon: number; fonte: string };

async function carregarMunicipios(sb: SupabaseClient) {
  const porNome = new Map<string, Municipio>();
  const porIbge = new Map<string, Municipio>();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from("infra_backhaul_municipio").select("codigo_ibge,municipio,uf,latitude,longitude").order("codigo_ibge").range(de, de + 999);
    if (error) throw new Error(`infra_backhaul_municipio: ${error.message}`);
    for (const m of data ?? []) {
      const v = { lat: m.latitude, lon: m.longitude, fonte: "IBGE (sede municipal, infra_backhaul_municipio)" };
      porIbge.set(String(m.codigo_ibge), v);
      porNome.set(`${norm(m.municipio)}|${m.uf}`, v);
    }
    if (!data || data.length < 1000) break;
  }
  // city_geocode tem precedência por nome (base própria do Motor).
  const { data: cg } = await sb.from("city_geocode").select("cidade,uf,lat,lon,fonte_geocode").not("lat", "is", null);
  for (const c of cg ?? []) porNome.set(`${norm(c.cidade)}|${c.uf}`, { lat: Number(c.lat), lon: Number(c.lon), fonte: `city_geocode (${c.fonte_geocode})` });
  return { porNome, porIbge };
}

async function cepInfo(sb: SupabaseClient, ritmo: Ritmo, cep: string) {
  const { data: c } = await sb.from("cep_coordenada").select("*").eq("cep", cep).maybeSingle();
  if (c && new Date(c.consultado_em).getTime() > Date.now() - 180 * 864e5) return c;
  const r = await ritmo.buscar(`https://brasilapi.com.br/api/cep/v2/${cep}`);
  let linha: Record<string, unknown> = { cep, http_status: r.status, consultado_em: new Date().toISOString() };
  if (r.ok) {
    const p = await r.json();
    const co = p?.location?.coordinates ?? {};
    linha = { ...linha, latitude: num(co.latitude), longitude: num(co.longitude), municipio_ibge: p?.ibge?.city ?? null,
      municipio: p?.city ?? null, uf: p?.state ?? null, servico: p?.service ?? null };
  } else await r.body?.cancel();
  if (r.status !== 429 && r.status < 500) await sb.from("cep_coordenada").upsert(linha);
  return linha;
}

const dentroDoBrasil = (lat: number | null, lon: number | null) =>
  lat != null && lon != null && lat <= 5.6 && lat >= -34 && lon >= -74.2 && lon <= -33.6;

async function lote(sb: SupabaseClient) {
  const inicio = Date.now();
  const ritmo = new Ritmo();
  const { data: fila, error } = await sb.rpc("cnpj_fila", { p_limite: 400 });
  if (error) throw new Error(`cnpj_fila: ${error.message}`);
  const cnpjs = (fila ?? []).map((f: { cnpj: string }) => f.cnpj);
  if (cnpjs.length === 0) {
    await sb.rpc("coleta_cnpj_agendar", { p_ligar: false });
    return { status: "ok", mensagem: "fila vazia; job de lotes desagendado" };
  }
  const coletaId = await iniciarColeta(sb, { jobId: JOB, fonte: "brasilapi_cnpj", versaoConector: VERSAO, escopo: { fila: cnpjs.length, ritmo_ms: ritmo.intervalo } });
  const municipios = await carregarMunicipios(sb);
  const fotos: Record<string, unknown>[] = [];
  let pend = 0, geo = 0, feitos = 0, parar = false, prox = 0;
  // Vários trabalhadores escondem a latência da API; o ritmo global segue em 2 req/s.
  const trabalhador = async () => {
    while (!parar) {
      if (Date.now() - inicio > ORCAMENTO_MS) break;
      const cnpj = cnpjs[prox++];
      if (!cnpj) break;
      const r = await ritmo.buscar(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      feitos++;
      if (!r.ok) {
        await r.body?.cancel();
        if (r.status === 429) { parar = true; break; } // ritmo esgotado: retoma no próximo lote
        const motivo = r.status === 404 ? "não encontrado na fonte" : r.status === 400 ? "CNPJ inválido" : `erro HTTP ${r.status}`;
        const { data: ant } = await sb.from("cnpj_pendencias").select("tentativas").eq("cnpj", cnpj).maybeSingle();
        await sb.from("cnpj_pendencias").upsert({ cnpj, motivo, http_status: r.status, tentativas: (ant?.tentativas ?? 0) + 1, ultima_tentativa: new Date().toISOString() });
        pend++;
        continue;
      }
      const p = await r.json();
      const cep = String(p.cep ?? "").replace(/\D/g, "").padStart(8, "0");
      const cepOk = /^[0-9]{8}$/.test(cep) && cep !== "00000000";
      const ci = cepOk ? await cepInfo(sb, ritmo, cep) : null;
      const uf = (p.uf || ci?.uf || null) as string | null;
      const cad = {
        cnpj, razao_social: p.razao_social ?? null, nome_fantasia: p.nome_fantasia || null,
        situacao_cadastral: p.descricao_situacao_cadastral ?? (p.situacao_cadastral != null ? String(p.situacao_cadastral) : null),
        data_abertura: p.data_inicio_atividade || null, porte: p.porte ?? null, mei: p.opcao_pelo_mei === true,
        cnae_principal: p.cnae_fiscal ? String(p.cnae_fiscal).padStart(7, "0") : null,
        cnae_principal_descricao: p.cnae_fiscal_descricao ?? null,
        cnaes_secundarios: (Array.isArray(p.cnaes_secundarios) ? p.cnaes_secundarios : [])
          .map((c: { codigo?: number }) => c?.codigo).filter((c: unknown) => c && Number(c) > 0).map((c: number) => String(c).padStart(7, "0")),
        logradouro: [p.descricao_tipo_de_logradouro, p.logradouro].filter(Boolean).join(" ") || null,
        numero: p.numero || null, complemento: p.complemento || null, bairro: p.bairro || null,
        cep: cepOk ? cep : null, municipio_ibge: (ci?.municipio_ibge as string) ?? null, // IBGE do CEP v2, não o código da Receita
        municipio: p.municipio ?? null, uf, capturado_em: new Date().toISOString(), fonte: "brasilapi_cnpj", versao_conector: VERSAO,
      };
      const { error: e1 } = await sb.from("cnpj_cadastro").upsert(cad);
      if (e1) throw new Error(`cnpj_cadastro: ${e1.message}`);
      await sb.from("cnpj_pendencias").delete().eq("cnpj", cnpj);
      fotos.push(cad);

      // Geocodificação: CEP (precisão 'cep'); senão município (IBGE do CEP ou nome+UF).
      const mun = (ci?.municipio_ibge && municipios.porIbge.get(String(ci.municipio_ibge)))
        || (cad.municipio && uf ? municipios.porNome.get(`${norm(cad.municipio)}|${uf}`) : undefined) || null;
      const latC = num(ci?.latitude), lonC = num(ci?.longitude);
      const temCep = dentroDoBrasil(latC, lonC);
      if (temCep || mun) {
        await sb.from("cnpj_geocodificado").upsert({
          cnpj, latitude: temCep ? latC : mun!.lat, longitude: temCep ? lonC : mun!.lon,
          precisao: temCep ? "cep" : "municipio",
          metodo: temCep ? `centroide do CEP ${cep}` : "sede do município",
          fonte_coordenada: temCep ? `BrasilAPI CEP v2 (${ci?.servico ?? "?"})` : mun!.fonte,
          lat_cep: temCep ? latC : null, lon_cep: temCep ? lonC : null,
          lat_municipio: mun?.lat ?? null, lon_municipio: mun?.lon ?? null, geocodificado_em: new Date().toISOString(),
        });
        geo++;
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: 6 }, trabalhador));
    let foto = null;
    if (fotos.length) foto = await registrarFoto(sb, { tabela: "cnpj_cadastro", campoChave: "cnpj", registros: fotos, completo: false, coletaId });
    await finalizarColeta(sb, coletaId, { ok: true, found: feitos, inserted: fotos.length, inicioMs: inicio });
    const resto = cnpjs.length - feitos;
    return { status: resto > 0 || ritmo.vistos429 ? "parcial" : "ok",
      mensagem: `${fotos.length} cadastros, ${geo} geocodificados, ${pend} pendências, ${resto} do lote para o próximo; 429 vistos: ${ritmo.vistos429}; intervalo final ${ritmo.intervalo} ms`,
      foto };
  } catch (e) {
    await finalizarColeta(sb, coletaId, { ok: false, error: e instanceof Error ? e.message : String(e), found: feitos, inserted: fotos.length, inicioMs: inicio });
    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = clienteServico();
  if (!sb) return json({ error: "configuração ausente" }, 500);
  const chave = req.headers.get("x-coleta-key") ?? "";
  const { data: esperada } = await sb.rpc("vault_read_secret_by_name", { nome: "coleta_temporal_key" });
  if (!chave || !esperada || chave !== esperada) return json({ error: "não autorizado" }, 401);

  // Trava de execução única (lease de 4 min).
  const agora = new Date();
  await sb.from("ingest_jobs").upsert({ id: JOB }, { onConflict: "id", ignoreDuplicates: true });
  const { data: trava } = await sb.from("ingest_jobs")
    .update({ lock_until: new Date(agora.getTime() + 240_000).toISOString(), status: "running", last_started_at: agora.toISOString() })
    .eq("id", JOB).eq("paused", false).or(`lock_until.is.null,lock_until.lt.${agora.toISOString()}`).select("id");
  if (!trava?.length) return json({ status: "ignorado", mensagem: "outra execução em andamento ou job pausado" }, 409);

  let r: { status: string; mensagem: string; foto?: unknown };
  try { r = await lote(sb); }
  catch (e) { r = { status: "erro", mensagem: e instanceof Error ? e.message : String(e) }; }
  await sb.from("ingest_jobs").update({ lock_until: null, status: "idle", last_finished_at: new Date().toISOString() }).eq("id", JOB);
  await sb.from("agenda_coletas").update({ ultima_execucao: new Date().toISOString(), ultimo_status: r.status, ultima_mensagem: r.mensagem.slice(0, 500) }).eq("job", JOB);
  console.log(`coleta-cnpj: ${r.status} ${r.mensagem}`);
  return json(r);
});

// Gravação temporal das camadas de infraestrutura (ANEEL, PeeringDB, cabos).
// Roda em segundo plano e só quando a fonte mudou, para não pesar no Mapa.
import {
  clienteServico, emSegundoPlano, finalizarColeta, garantirIndicador, iniciarColeta,
  registrarFoto, registrarObservacoes, sha256, ultimaColetaOk, type LinhaObservacao,
} from "../_shared/temporal.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const VERSAO = "map-infrastructure-temporal-v1-2026-10";

async function lerTudo(supabase: SupabaseClient, tabela: string, colunas: string, ordem: string) {
  const linhas: Record<string, unknown>[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select(colunas).order(ordem).range(de, de + 999);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    linhas.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < 1000) break;
  }
  return linhas;
}

const COLS_ANEEL = "aneel_id,ceg,nome,tipo,fonte_combustivel,origem_combustivel,potencia_outorgada_kw,potencia_fiscalizada_kw,garantia_fisica_kw,potencia_kw,uf,municipios,municipio,latitude,longitude,data_entrada_operacao,proprietarios,data_conjunto";

async function fotoAneel(supabase: SupabaseClient) {
  const inicio = Date.now();
  const usinas = await lerTudo(supabase, "aneel_usinas", COLS_ANEEL, "aneel_id");
  if (usinas.length === 0) return;
  const dataConjunto = usinas.map((u) => String(u.data_conjunto ?? "")).filter(Boolean).sort().pop() ?? null;
  const hash = await sha256(JSON.stringify(usinas));
  const ultima = await ultimaColetaOk(supabase, "map-infrastructure:aneel");
  if (ultima?.resposta_hash === hash) return; // mesma cópia já fotografada

  const coletaId = await iniciarColeta(supabase, {
    jobId: "map-infrastructure:aneel", fonte: "aneel_usinas", versaoConector: VERSAO, respostaHash: hash,
    escopo: { tabela: "aneel_usinas", data_conjunto: dataConjunto, registros: usinas.length, completo: true },
  });
  try {
    // A tabela é a cópia mensal completa do SIGA (usinas em operação): lote completo.
    const foto = await registrarFoto(supabase, {
      tabela: "aneel_usinas", campoChave: "aneel_id", registros: usinas, completo: true, coletaId,
    });

    await garantirIndicador(supabase, {
      id: "energia.capacidade_instalada_mw", nome: "Capacidade instalada em operação", natureza: "estoque",
      unidade: "MW", periodicidade: "mensal", camada_mapa: "energia",
      metodologia: "Soma de potencia_kw / 1000 das usinas em operação na cópia do SIGA (ANEEL), por UF e tipo de geração.",
    });
    await garantirIndicador(supabase, {
      id: "energia.capacidade_acumulada_mw", nome: "Capacidade acumulada por ano de entrada em operação", natureza: "estoque",
      unidade: "MW", periodicidade: "anual", camada_mapa: "energia",
      metodologia: "Reconstruída a partir de data_entrada_operacao das usinas ainda existentes no SIGA; usinas desativadas não aparecem.",
    });

    const periodo = dataConjunto ?? new Date().toISOString().slice(0, 10);
    const agora = new Map<string, number>(); // uf|tipo -> MW
    const porAno = new Map<string, Map<number, number>>(); // uf|tipo -> ano -> MW
    let semData = 0;
    for (const u of usinas) {
      const uf = String(u.uf ?? "").trim().toUpperCase();
      const tipo = String(u.tipo ?? "").trim().toUpperCase();
      const kw = Number(u.potencia_kw);
      if (!uf || !tipo || !Number.isFinite(kw)) continue;
      for (const k of [`${uf}|${tipo}`, `${uf}|`]) {
        agora.set(k, (agora.get(k) ?? 0) + kw / 1000);
        const d = String(u.data_entrada_operacao ?? "");
        const ano = Number(d.slice(0, 4));
        if (!ano) { if (k.endsWith("|")) semData++; continue; }
        const m = porAno.get(k) ?? new Map<number, number>();
        m.set(ano, (m.get(ano) ?? 0) + kw / 1000);
        porAno.set(k, m);
      }
    }
    const linhas: LinhaObservacao[] = [];
    for (const [k, mw] of agora) {
      const [uf, tipo] = k.split("|");
      linhas.push({
        indicador_id: "energia.capacidade_instalada_mw", entidade_tipo: "uf", entidade_chave: uf, segmento: tipo,
        periodo_referencia: periodo, granularidade: "foto", valor: Math.round(mw * 1000) / 1000,
        origem_temporal: "foto_coletada", metadados: { fonte: "ANEEL SIGA", data_conjunto: dataConjunto },
      });
    }
    const anoFinal = Number(periodo.slice(0, 4));
    for (const [k, m] of porAno) {
      const [uf, tipo] = k.split("|");
      const anos = [...m.keys()].sort((a, b) => a - b);
      let acc = 0;
      for (let ano = anos[0]; ano <= anoFinal; ano++) {
        acc += m.get(ano) ?? 0;
        linhas.push({
          indicador_id: "energia.capacidade_acumulada_mw", entidade_tipo: "uf", entidade_chave: uf, segmento: tipo,
          periodo_referencia: `${ano}-01-01`, granularidade: "ano", valor: Math.round(acc * 1000) / 1000,
          origem_temporal: "reconstruida",
          metadados: { limitacao: "apenas usinas ainda existentes", data_conjunto: dataConjunto },
        });
      }
    }
    const obs = await registrarObservacoes(supabase, { coletaId, linhas });
    console.log(`temporal aneel: foto ${JSON.stringify(foto)}, observações ${obs.inseridas}, usinas sem data ${semData}`);
    await finalizarColeta(supabase, coletaId, { ok: true, found: usinas.length, inserted: obs.inseridas, inicioMs: inicio });
  } catch (e) {
    await finalizarColeta(supabase, coletaId, { ok: false, error: e instanceof Error ? e.message : String(e), inicioMs: inicio });
    throw e;
  }
}

async function fotoTabela(supabase: SupabaseClient, tabela: string, colunas: string, chave: string) {
  const inicio = Date.now();
  const registros = await lerTudo(supabase, tabela, colunas, chave);
  if (registros.length === 0) return;
  const hash = await sha256(JSON.stringify(registros));
  const job = `map-infrastructure:${tabela}`;
  if ((await ultimaColetaOk(supabase, job))?.resposta_hash === hash) return;
  const coletaId = await iniciarColeta(supabase, {
    jobId: job, fonte: tabela, versaoConector: VERSAO, respostaHash: hash,
    escopo: { tabela, registros: registros.length, completo: true },
  });
  try {
    const foto = await registrarFoto(supabase, { tabela, campoChave: chave, registros, completo: true, coletaId });
    await finalizarColeta(supabase, coletaId, { ok: true, found: registros.length, inserted: foto.novos + foto.alterados, inicioMs: inicio });
  } catch (e) {
    await finalizarColeta(supabase, coletaId, { ok: false, error: e instanceof Error ? e.message : String(e), inicioMs: inicio });
    throw e;
  }
}

/** Energia: foto da ANEEL e dos cabos (TeleGeography) quando a cópia no banco mudou. */
export function registrarTemporalEnergia() {
  const supabase = clienteServico();
  if (!supabase) return;
  emSegundoPlano((async () => {
    // A cópia da ANEEL muda uma vez por mês: confere no máximo a cada 12 h.
    const ultima = await ultimaColetaOk(supabase, "map-infrastructure:aneel");
    if (ultima && Date.now() - new Date(ultima.created_at).getTime() < 12 * 3600_000) return;
    await fotoAneel(supabase);
    await fotoTabela(supabase, "cabos_lista", "cabo_id,nome,tipo,fonte,snapshot,internacional", "cabo_id");
    await fotoTabela(supabase, "cabos_aterragens", "ponto_id,nome,uf,municipio_proximo,latitude,longitude,distancia_km,fonte,snapshot", "ponto_id");
  })());
}

/** Datacenters: foto da lista do PeeringDB, só com resposta completa (HTTP 200). */
export function registrarTemporalDatacenters(registros: Record<string, unknown>[], completo: boolean, url: string) {
  const supabase = clienteServico();
  if (!supabase || registros.length === 0) return;
  emSegundoPlano((async () => {
    const inicio = Date.now();
    const hash = await sha256(JSON.stringify(registros));
    const job = "map-infrastructure:peeringdb";
    const ultima = await ultimaColetaOk(supabase, job);
    if (ultima?.resposta_hash === hash && Date.now() - new Date(ultima.created_at).getTime() < 7 * 86400_000) return;
    const coletaId = await iniciarColeta(supabase, {
      jobId: job, fonte: "peeringdb_fac", versaoConector: VERSAO, respostaHash: hash,
      escopo: { url, registros: registros.length, completo },
    });
    try {
      const foto = await registrarFoto(supabase, { tabela: "peeringdb_fac", campoChave: "id", registros, completo, coletaId });
      await finalizarColeta(supabase, coletaId, { ok: true, found: registros.length, inserted: foto.novos + foto.alterados, inicioMs: inicio });
    } catch (e) {
      await finalizarColeta(supabase, coletaId, { ok: false, error: e instanceof Error ? e.message : String(e), inicioMs: inicio });
      throw e;
    }
  })());
}

import {
  clienteServico, emSegundoPlano, finalizarColeta, garantirIndicador, iniciarColeta,
  registrarObservacoes, type LinhaObservacao,
} from "../_shared/temporal.ts";

const VERSAO_METODO = "v1-2026-10";
const VERSAO_CONECTOR = "motor-search-temporal-v1-2026-10";
const NOMES: Record<string, string> = { gt: "Índice GT (Gap de Tradução)", cd: "Índice CD (Dependência Científica)", aue: "Índice AUE (Articulação U-E)", ei: "Índice EI (Efetividade Instrumental)" };

/** Grava GT, CD, AUE e EI calculados nesta busca como fotos em observacoes. */
export function registrarIndicesTemporal(p: {
  tema: string; uf: string | null; municipioIbge: string | null;
  valores: Record<string, number | null | undefined>;
}) {
  const supabase = clienteServico();
  if (!supabase || !p.tema) return;
  const segmento = p.municipioIbge ? `municipio:${p.municipioIbge}` : p.uf ? `uf:${p.uf}` : "";
  emSegundoPlano((async () => {
    const inicio = Date.now();
    const agora = new Date().toISOString();
    const coletaId = await iniciarColeta(supabase, {
      jobId: "motor-search:indices", fonte: "motor-search", versaoConector: VERSAO_CONECTOR,
      escopo: { tema: p.tema, uf: p.uf, municipio_ibge: p.municipioIbge },
    });
    try {
      const linhas: LinhaObservacao[] = [];
      for (const k of ["gt", "cd", "aue", "ei"]) {
        const v = p.valores[k];
        if (v == null || !Number.isFinite(Number(v))) continue;
        await garantirIndicador(supabase, {
          id: `indice.${k}`, nome: NOMES[k], natureza: "indice", unidade: "0 a 100", periodicidade: "irregular",
          metodologia: `Calculado pelo motor-search, fórmula ${VERSAO_METODO}.`,
        });
        linhas.push({
          indicador_id: `indice.${k}`, entidade_tipo: "tema", entidade_chave: p.tema, segmento,
          periodo_referencia: agora.slice(0, 10), granularidade: "foto", valor: Number(v),
          origem_temporal: "foto_coletada", capturado_em: agora, versao_metodo: VERSAO_METODO,
        });
      }
      const r = await registrarObservacoes(supabase, { coletaId, linhas });
      await finalizarColeta(supabase, coletaId, { ok: true, found: linhas.length, inserted: r.inseridas, inicioMs: inicio });
    } catch (e) {
      await finalizarColeta(supabase, coletaId, { ok: false, error: e instanceof Error ? e.message : String(e), inicioMs: inicio });
      throw e;
    }
  })());
}

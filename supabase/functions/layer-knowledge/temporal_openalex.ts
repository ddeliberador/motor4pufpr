// Série anual da OpenAlex (group_by=publication_year) para o tema pesquisado:
// publicações com instituição brasileira e, entre elas, com coautoria de mais de um país.
import {
  clienteServico, emSegundoPlano, finalizarColeta, garantirIndicador, iniciarColeta,
  registrarObservacoes, sha256, type LinhaObservacao,
} from "../_shared/temporal.ts";

const VERSAO = "layer-knowledge-openalex-anos-v1-2026-10";

export function registrarSerieOpenAlex(p: {
  tema: string; urlBr: string; conceito: string | null; headers: Record<string, string>;
}) {
  const supabase = clienteServico();
  const tema = p.tema.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);
  if (!supabase || !tema) return;
  emSegundoPlano((async () => {
    const inicio = Date.now();
    const urls = {
      publicacoes: `${p.urlBr}&group_by=publication_year&per_page=200`,
      coautorias: `${p.urlBr},countries_distinct_count:>1&group_by=publication_year&per_page=200`,
    };
    const buscar = async (u: string) => {
      const r = await fetch(u, { headers: p.headers, signal: AbortSignal.timeout(20_000) });
      if (!r.ok) throw new Error(`OpenAlex HTTP ${r.status}`);
      return (await r.json())?.group_by as { key: string; count: number }[] | undefined;
    };
    const [pub, coa] = await Promise.all([buscar(urls.publicacoes), buscar(urls.coautorias)]);
    if (!pub?.length) return; // fonte não trouxe série: nada a gravar
    const coletaId = await iniciarColeta(supabase, {
      jobId: "layer-knowledge:openalex-anos", fonte: "openalex", versaoConector: VERSAO,
      escopo: { tema, conceito: p.conceito, urls }, respostaHash: await sha256(JSON.stringify([pub, coa])),
    });
    try {
      await garantirIndicador(supabase, {
        id: "openalex.publicacoes_br", nome: "Publicações com instituição brasileira", natureza: "fluxo",
        unidade: "publicações", periodicidade: "anual", metodologia: "OpenAlex works, filtro institutions.country_code:BR, group_by=publication_year.",
      });
      await garantirIndicador(supabase, {
        id: "openalex.coautorias_internacionais_br", nome: "Publicações brasileiras com coautoria internacional", natureza: "fluxo",
        unidade: "publicações", periodicidade: "anual", metodologia: "Mesmo recorte com countries_distinct_count:>1, group_by=publication_year.",
      });
      const linhas: LinhaObservacao[] = [];
      const add = (id: string, g: { key: string; count: number }[] | undefined) => {
        for (const x of g ?? []) {
          const ano = Number(x.key);
          if (!Number.isInteger(ano) || ano < 1950 || ano > new Date().getUTCFullYear()) continue;
          linhas.push({
            indicador_id: id, entidade_tipo: "tema", entidade_chave: tema, periodo_referencia: `${ano}-01-01`,
            granularidade: "ano", valor: x.count, origem_temporal: "serie_da_fonte",
            metadados: { fonte: "OpenAlex", conceito: p.conceito },
          });
        }
      };
      add("openalex.publicacoes_br", pub);
      add("openalex.coautorias_internacionais_br", coa);
      const r = await registrarObservacoes(supabase, { coletaId, linhas });
      await finalizarColeta(supabase, coletaId, { ok: true, found: linhas.length, inserted: r.inseridas, inicioMs: inicio });
    } catch (e) {
      await finalizarColeta(supabase, coletaId, { ok: false, error: e instanceof Error ? e.message : String(e), inicioMs: inicio });
      throw e;
    }
  })());
}

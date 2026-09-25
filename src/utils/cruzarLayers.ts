// Cruzamento das Layers 4–7 com os atores já carregados no Mapa.
// Não cria marcadores: devolve vínculos por id de ator. Falhas de fonte
// são propagadas em `falhas` (nunca silenciadas nem substituídas por simulação).
import type { ModeloHF, ContratoIA, LayerVinculos, EnriquecimentoLayers } from "@/components/mapa/caboSubmarino";
import type { ResearchLocation } from "@/lib/researchLocations";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Match exato ou inclusão (mínimo 8 chars para evitar falsos positivos)
function match(nomeAtor: string, nomeExterno: string): boolean {
  const a = norm(nomeAtor);
  const b = norm(nomeExterno);
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 8) return false;
  return a.includes(b) || b.includes(a);
}

function matchCNPJ(cnpjAtor: string | null, cnpjExterno: string): boolean {
  if (!cnpjAtor || !cnpjExterno) return false;
  const limpar = (s: string) => s.replace(/\D/g, "");
  const a = limpar(cnpjAtor);
  return a.length >= 14 && a === limpar(cnpjExterno);
}

// ── L4: Hugging Face ─────────────────────────────────────────────────────────
export async function buscarModelosHF(): Promise<ModeloHF[]> {
  const r = await fetch(
    "https://huggingface.co/api/models?search=brazil&limit=100&full=false&sort=downloads",
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!r.ok) throw new Error(`Hugging Face HTTP ${r.status}`);
  const lista = (await r.json()) as Record<string, unknown>[];
  return lista
    .map((m) => ({
      id: String(m.id ?? m.modelId ?? ""),
      author: String(m.author ?? String(m.id ?? "").split("/")[0] ?? ""),
      downloads: Number(m.downloads ?? 0),
      tarefa: String(m.pipeline_tag ?? ""),
      likes: Number(m.likes ?? 0),
    }))
    .filter((m) => m.id);
}

// ── L5: PNCP ─────────────────────────────────────────────────────────────────
// /api/consulta/v1/contratos não aceita busca textual (exige datas/órgão).
// A busca textual oficial é /api/search, que devolve o órgão contratante
// (não o fornecedor) — por isso o vínculo é "ator contratou IA".
export async function buscarContratosIA(): Promise<ContratoIA[]> {
  const paginas = [1, 2, 3];
  const res = await Promise.allSettled(
    paginas.map(async (p) => {
      const r = await fetch(
        `https://pncp.gov.br/api/search/?q=${encodeURIComponent('"inteligência artificial"')}&tipos_documento=contrato&ordenacao=-data&pagina=${p}&tam_pagina=100`,
        { signal: AbortSignal.timeout(30_000) },
      );
      if (!r.ok) throw new Error(`PNCP HTTP ${r.status}`);
      const payload = (await r.json()) as { items?: Record<string, unknown>[] };
      return payload.items ?? [];
    }),
  );
  const items = res.flatMap((x) => (x.status === "fulfilled" ? x.value : []));
  if (!items.length) {
    const motivo = res.find((x) => x.status === "rejected") as PromiseRejectedResult | undefined;
    throw new Error(`PNCP sem resultados${motivo ? `: ${String(motivo.reason)}` : ""}`);
  }
  return items
    .map((c) => ({
      cnpj: String(c.orgao_cnpj ?? ""),
      fornecedor: String(c.orgao_nome ?? ""),
      valor: Number(c.valor_global ?? 0),
      objeto: String(c.description ?? ""),
      dataVigencia: c.data_fim_vigencia ? String(c.data_fim_vigencia) : undefined,
      url: c.item_url ? `https://pncp.gov.br/app${String(c.item_url)}` : undefined,
    }))
    .filter((c) => c.cnpj || c.fornecedor);
}

// ── Cruzamento principal ──────────────────────────────────────────────────────
export async function cruzarLayersComAtores(
  atores: ResearchLocation[],
  options: { l4: boolean; l5: boolean; l6: boolean; l7: boolean },
): Promise<{ resultado: EnriquecimentoLayers; falhas: string[] }> {
  const resultado: EnriquecimentoLayers = {};
  const falhas: string[] = [];

  const [hf, pncp] = await Promise.allSettled([
    options.l4 ? buscarModelosHF() : Promise.resolve([] as ModeloHF[]),
    options.l5 ? buscarContratosIA() : Promise.resolve([] as ContratoIA[]),
  ]);
  const modelosHF = hf.status === "fulfilled" ? hf.value : [];
  const contratosIA = pncp.status === "fulfilled" ? pncp.value : [];
  if (hf.status === "rejected") falhas.push(`L4 Hugging Face: ${String(hf.reason)}`);
  if (pncp.status === "rejected") falhas.push(`L5 PNCP: ${String(pncp.reason)}`);

  for (const ator of atores) {
    const vinculos: LayerVinculos = {};

    if (options.l4 && modelosHF.length) {
      const modelos = modelosHF.filter((m) => match(ator.nome, m.author));
      if (modelos.length) vinculos.l4 = { modelos };
    }

    if (options.l5 && contratosIA.length) {
      const contratos = contratosIA.filter(
        (c) => matchCNPJ(ator.cnpj ?? null, c.cnpj) || match(ator.nome, c.fornecedor),
      );
      if (contratos.length) vinculos.l5 = { contratos };
    }

    // L6: works_count/cited_by_count já gravados no raw_metadata (registros OpenAlex)
    if (options.l6) {
      const wc = ator.raw_metadata?.works_count;
      const cc = ator.raw_metadata?.cited_by_count;
      if (wc != null && Number(wc) > 0) {
        vinculos.l6 = { artigos: Number(wc), citacoes: Number(cc ?? 0), fonte: "openalex" };
      }
    }

    // L7: políticas curadas no raw_metadata (politicasDoEquipamento)
    if (options.l7) {
      const politicas = ator.raw_metadata?.politicas_publicas;
      if (politicas && typeof politicas === "string") {
        vinculos.l7 = { patentes: [], politicas: politicas.split("; ").filter(Boolean) };
      }
    }

    if (Object.keys(vinculos).length) resultado[ator.id] = vinculos;
  }

  return { resultado, falhas };
}

// Busca textual no PNCP.
//
// A API de consulta (/api/consulta/v1/contratacoes/publicacao) exige dataInicial,
// dataFinal e codigoModalidadeContratacao e ignora o parâmetro q: não serve para
// buscar por tema. A busca textual é /api/search, o mesmo índice do portal.

export const PNCP_SEARCH = "https://pncp.gov.br/api/search/";

// O PNCP derruba boa parte das chamadas que não vêm de navegador. Este formato
// identifica o robô sem se passar por navegador e falha menos que o padrão do Deno.
export const USER_AGENT = "Mozilla/5.0 (compatible; motor4pufpr/1.0; +https://github.com/ddeliberador/motor4pufpr)";

export interface ContratoPNCP {
  objeto: string;
  orgao: string;
  modalidade: string;
  valor: number;
  situacao: string;
  data: string;
  uf: string;
  url: string;
  fornecedor: string;
  fornecedorCnpj: string;
  termo: string;
}

export interface OpcoesBusca {
  uf?: string;
  porTermo?: number;
  timeoutMs?: number;
}

// O PNCP derruba conexões com frequência; uma nova tentativa, após uma pausa
// curta, resolve a maioria. Repetir na hora costuma cair de novo.
const PAUSA_ANTES_DE_REPETIR_MS = 1000;

async function buscarJson(url: string, timeoutMs: number): Promise<{ items?: unknown } | null> {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    if (tentativa > 0) await new Promise((r) => setTimeout(r, PAUSA_ANTES_DE_REPETIR_MS));
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return await res.json();
      console.warn(`PNCP ${res.status}: ${url}`);
      if (res.status < 500) return null;
    } catch (e) {
      console.warn(`PNCP falhou: ${url}:`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

export function normalizarContrato(item: Record<string, unknown>, termo: string): ContratoPNCP {
  return {
    objeto: String(item.description || item.title || ""),
    orgao: String(item.orgao_nome || ""),
    modalidade: String(item.modalidade_licitacao_nome || ""),
    valor: Number(item.valor_global || 0),
    situacao: String(item.situacao_nome || ""),
    data: String(item.data_publicacao_pncp || item.data_assinatura || ""),
    uf: String(item.uf || ""),
    url: item.item_url ? `https://pncp.gov.br/app${String(item.item_url)}` : "https://pncp.gov.br/app/contratos",
    fornecedor: String(item.fornecedor_nome || ""),
    fornecedorCnpj: String(item.fornecedor_ni || "").replace(/\D/g, ""),
    termo,
  };
}

/** Contratos publicados no PNCP que mencionam os termos, mais recentes primeiro. */
export async function buscarContratosPNCP(termos: string[], opcoes: OpcoesBusca = {}): Promise<ContratoPNCP[]> {
  const { uf = "", porTermo = 10, timeoutMs = 20000 } = opcoes;
  const vistos = new Set<string>();
  const contratos: ContratoPNCP[] = [];

  // Sequencial: rajadas de chamadas paralelas fazem o PNCP fechar a conexão.
  for (const termo of termos) {
    const params = new URLSearchParams({
      q: termo,
      tipos_documento: "contrato",
      ordenacao: "-data",
      pagina: "1",
      tam_pagina: String(porTermo),
    });
    if (uf) params.set("ufs", uf);
    const data = await buscarJson(`${PNCP_SEARCH}?${params}`, timeoutMs);
    const items = (Array.isArray(data?.items) ? data.items : []) as Record<string, unknown>[];
    for (const item of items) {
      const id = String(item.item_url || item.numero_controle_pncp || item.id || "");
      if (!id || vistos.has(id)) continue;
      vistos.add(id);
      contratos.push(normalizarContrato(item, termo));
    }
  }
  return contratos;
}

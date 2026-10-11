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

export interface EditalPNCP {
  objeto: string;
  orgao: string;
  modalidade: string;
  valor: number;
  situacao: string;
  dataPublicacao: string;
  /** Fim do prazo de propostas; vazio quando o edital não informa. */
  dataEncerramento: string;
  uf: string;
  url: string;
  termo: string;
}

export interface FornecedorPNCP {
  nome: string;
  cnpj: string;
  contratos: number;
  valorTotal: number;
}

export function normalizarEdital(item: Record<string, unknown>, termo: string): EditalPNCP {
  // No índice, o edital vem como /compras/{cnpj}/{ano}/{seq}; a página pública é /app/editais/...
  const caminho = String(item.item_url || "").replace(/^\/compras\//, "/");
  return {
    objeto: String(item.description || item.title || ""),
    orgao: String(item.orgao_nome || ""),
    modalidade: String(item.modalidade_licitacao_nome || ""),
    valor: Number(item.valor_global || 0),
    situacao: String(item.situacao_nome || ""),
    dataPublicacao: String(item.data_publicacao_pncp || ""),
    dataEncerramento: String(item.data_fim_vigencia || ""),
    uf: String(item.uf || ""),
    url: item.item_url ? `https://pncp.gov.br/app/editais${caminho}` : "https://pncp.gov.br/app/editais",
    termo,
  };
}

// Busca cada termo no índice, um de cada vez, e devolve os itens sem repetição.
async function buscarItens(
  termos: string[],
  filtros: Record<string, string>,
  opcoes: OpcoesBusca,
): Promise<{ item: Record<string, unknown>; termo: string }[]> {
  const { uf = "", porTermo = 10, timeoutMs = 20000 } = opcoes;
  const vistos = new Set<string>();
  const achados: { item: Record<string, unknown>; termo: string }[] = [];

  // Sequencial: rajadas de chamadas paralelas fazem o PNCP fechar a conexão.
  for (const termo of termos) {
    const params = new URLSearchParams({ q: termo, ...filtros, pagina: "1", tam_pagina: String(porTermo) });
    if (uf) params.set("ufs", uf);
    const data = await buscarJson(`${PNCP_SEARCH}?${params}`, timeoutMs);
    const items = (Array.isArray(data?.items) ? data.items : []) as Record<string, unknown>[];
    for (const item of items) {
      const id = String(item.item_url || item.numero_controle_pncp || item.id || "");
      if (!id || vistos.has(id)) continue;
      vistos.add(id);
      achados.push({ item, termo });
    }
  }
  return achados;
}

/** Contratos publicados no PNCP que mencionam os termos, mais recentes primeiro. */
export async function buscarContratosPNCP(termos: string[], opcoes: OpcoesBusca = {}): Promise<ContratoPNCP[]> {
  const achados = await buscarItens(termos, { tipos_documento: "contrato", ordenacao: "-data" }, opcoes);
  return achados.map(({ item, termo }) => normalizarContrato(item, termo));
}

/**
 * Editais do PNCP ainda recebendo propostas, por relevância. Ordenar por data
 * põe no topo editais que só casam com parte do termo.
 */
export async function buscarEditaisAbertosPNCP(termos: string[], opcoes: OpcoesBusca = {}): Promise<EditalPNCP[]> {
  const achados = await buscarItens(termos, { tipos_documento: "edital", status: "recebendo_proposta" }, opcoes);
  return achados.map(({ item, termo }) => normalizarEdital(item, termo));
}

/**
 * Empresas que mais assinaram os contratos, por CNPJ. Fornecedor pessoa física
 * (CPF) fica de fora: não é empresa e não deve circular como referência.
 */
export function agruparFornecedores(contratos: ContratoPNCP[]): FornecedorPNCP[] {
  const porCnpj = new Map<string, FornecedorPNCP>();
  for (const c of contratos) {
    if (c.fornecedorCnpj.length !== 14) continue;
    const f = porCnpj.get(c.fornecedorCnpj) ?? { nome: c.fornecedor || c.fornecedorCnpj, cnpj: c.fornecedorCnpj, contratos: 0, valorTotal: 0 };
    f.contratos++;
    f.valorTotal += c.valor;
    porCnpj.set(c.fornecedorCnpj, f);
  }
  return [...porCnpj.values()].sort((a, b) => b.contratos - a.contratos || b.valorTotal - a.valorTotal);
}

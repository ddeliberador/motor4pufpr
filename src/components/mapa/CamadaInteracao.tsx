// Camada de interação entre atores do sistema de inovação: tipos, catálogo e
// agregação dos fluxos UF→UF. O desenho fica a cargo do MapaBrasil (MapLibre),
// que recebe os arcos agregados e as unidades pela prop `interacao`.
//
// Cada interação da tabela `interacoes` liga duas hélices (ICT, empresa,
// governo) numa dimensão (ação, recurso, resultado). A aba Interação lê a
// view `vw_interacao_fluxo_uf_tipos`, que agrega por fonte/tipo/ano/tecnologia
// e par de UFs; o catálogo abaixo diz como cada tipo é apresentado.

export type Helice = "ict" | "empresa" | "governo";
export type Dimensao = "acao" | "recurso" | "resultado";

export const HELICE_ROTULO: Record<Helice, string> = { ict: "ICTs e universidades", empresa: "Empresas", governo: "Governo" };
export const DIMENSAO_ROTULO: Record<Dimensao, string> = { acao: "Ação conjunta", recurso: "Fluxo de recursos", resultado: "Resultado" };

export interface TipoInteracao {
  /** `${fonte}:${tipo}`, chave estável usada na URL e nos filtros. */
  id: string;
  fonte: string;
  tipo: string;
  rotulo: string;
  descricao: string;
  dimensao: Dimensao;
  origem: Helice;
  destino: Helice;
  /** Como chamar o nó de destino nos cartões ("Empresas", "Unidades"...). */
  rotuloDestinos: string;
  cor: string;
  /** Só a cooperação EMBRAPII tem a camada de unidades credenciadas (pontos). */
  comUnidades?: boolean;
  /** Tipo previsto no catálogo cuja coleta ainda não rodou; aparece desabilitado com a explicação. */
  planejado?: string;
}

export const TIPOS_INTERACAO: TipoInteracao[] = [
  {
    id: "embrapii:cooperacao_pdi", fonte: "embrapii", tipo: "cooperacao_pdi", rotulo: "Cooperação em PD&I (EMBRAPII)",
    descricao: "Projeto contratado entre uma unidade EMBRAPII (ICT) e uma empresa. Arco: UF da unidade → UF da empresa.",
    dimensao: "acao", origem: "ict", destino: "empresa", rotuloDestinos: "Empresas", cor: "#f59e0b", comUnidades: true,
  },
  {
    id: "embrapii:aporte_empresa", fonte: "embrapii", tipo: "aporte_empresa", rotulo: "Aporte da empresa à ICT",
    descricao: "Contrapartida financeira que a empresa coloca no projeto EMBRAPII. Arco: UF da empresa → UF da unidade.",
    dimensao: "recurso", origem: "empresa", destino: "ict", rotuloDestinos: "Unidades", cor: "#22c55e",
  },
  {
    id: "embrapii:financiamento_publico", fonte: "embrapii", tipo: "financiamento_publico", rotulo: "Financiamento público à ICT",
    descricao: "Recurso não reembolsável da EMBRAPII (governo federal) aos projetos de cada unidade. A origem é nacional, então aparece como círculo na UF que recebe.",
    dimensao: "recurso", origem: "governo", destino: "ict", rotuloDestinos: "Unidades", cor: "#3b82f6",
  },
  {
    id: "embrapii:pedido_pi", fonte: "embrapii", tipo: "pedido_pi", rotulo: "Pedidos de propriedade intelectual",
    descricao: "Pedidos de PI gerados nos projetos (patente, software, desenho). Arco: UF da unidade → UF da empresa.",
    dimensao: "resultado", origem: "ict", destino: "empresa", rotuloDestinos: "Empresas", cor: "#a855f7",
  },
  {
    id: "desafios:desafio_solucao", fonte: "desafios", tipo: "desafio_solucao", rotulo: "Desafio público → solução em ICT",
    descricao: "Desafio publicado por um órgão de governo relacionado por termos a um projeto EMBRAPII. Correspondência textual, não contratação. Desafios nacionais aparecem como círculo na UF da ICT.",
    dimensao: "acao", origem: "governo", destino: "ict", rotuloDestinos: "Unidades", cor: "#ec4899",
  },
  {
    id: "openalex:coautoria", fonte: "openalex", tipo: "coautoria", rotulo: "Coautoria científica entre ICTs",
    descricao: "Pares de instituições brasileiras com publicações em comum no ano (OpenAlex). Arco: UF → UF.",
    dimensao: "resultado", origem: "ict", destino: "ict", rotuloDestinos: "Instituições", cor: "#14b8a6",
    planejado: "coleta disponível em Gestão da Pesquisa → Coletas (OpenAlex)",
  },
];

export const TIPO_PADRAO = TIPOS_INTERACAO[0].id;
export const tipoPorId = (id: string) => TIPOS_INTERACAO.find((t) => t.id === id);

export type FluxoUf = {
  fonte: string; tipo: string;
  ano: number | null; tecnologia: string | null;
  origem_uf: string | null; origem_lat: number | null; origem_lon: number | null;
  destino_uf: string | null; destino_lat: number | null; destino_lon: number | null;
  lacos: number | null; projetos: number | null; destinos: number | null; valor_rateado: number | null;
};
export type UnidadeEmbrapii = {
  co_unidade: number | null; unidade_embrapii: string | null; sigla: string | null; tipo_instituicao: string | null;
  uf: string | null; cidade: string | null; status_credenciamento: string | null;
  lat: number | null; lon: number | null; coordenada_aproximada: boolean | null;
  projetos: number | null; valor_total_ipca: number | null; empresas: number | null; ufs_alcancadas: number | null;
};
export type ArcoAgregado = {
  chave: string; tipoId: string; cor: string;
  /** "Nacional" quando a origem não tem UF (governo federal, desafio de abrangência nacional). */
  origem: string; destino: string;
  o: [number, number]; d: [number, number];
  /** Laço dentro da mesma UF ou vindo de origem nacional: desenha círculo, não arco. */
  interno: boolean;
  lacos: number; projetos: number; destinos: number; valor: number;
};

export interface CamadaInteracaoProps {
  arcos: ArcoAgregado[];
  unidades: UnidadeEmbrapii[];
  onArco: (a: ArcoAgregado) => void;
  onUnidade: (u: UnidadeEmbrapii) => void;
}

export const COR_INTERACAO = TIPOS_INTERACAO[0].cor;
export const ORIGEM_NACIONAL = "Nacional";

/**
 * Soma os fluxos filtrados por tipo e par origem→destino. Linhas sem UF de
 * destino (ou sem coordenadas) ficam de fora; linhas sem UF de origem viram
 * laços "internos" na UF de destino, com origem "Nacional".
 */
export function agregarArcos(linhas: FluxoUf[]): ArcoAgregado[] {
  const m = new Map<string, ArcoAgregado>();
  for (const r of linhas) {
    if (!r.destino_uf || r.destino_lat == null || r.destino_lon == null) continue;
    const t = tipoPorId(`${r.fonte}:${r.tipo}`);
    if (!t) continue;
    const temOrigem = !!r.origem_uf && r.origem_lat != null && r.origem_lon != null;
    const origem = temOrigem ? (r.origem_uf as string) : ORIGEM_NACIONAL;
    const k = `${t.id}|${origem}>${r.destino_uf}`;
    const d: [number, number] = [r.destino_lon, r.destino_lat];
    const a = m.get(k) ?? {
      chave: k, tipoId: t.id, cor: t.cor, origem, destino: r.destino_uf,
      o: temOrigem ? [r.origem_lon as number, r.origem_lat as number] : d, d,
      interno: !temOrigem || origem === r.destino_uf,
      lacos: 0, projetos: 0, destinos: 0, valor: 0,
    };
    a.lacos += Number(r.lacos ?? 0); a.projetos += Number(r.projetos ?? 0); a.destinos += Number(r.destinos ?? 0); a.valor += Number(r.valor_rateado ?? 0);
    m.set(k, a);
  }
  return [...m.values()].sort((x, y) => x.lacos - y.lacos);
}

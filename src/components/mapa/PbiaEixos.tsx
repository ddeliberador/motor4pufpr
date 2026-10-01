import { useEffect, useState } from "react";

export type PbiaAcao = { id: string; nome: string; status: "entregue" | "iniciada" | "nao_iniciada"; layer?: string; curadoria?: string };
export type PbiaEixo = {
  id: string;
  nome: string;
  numero: number;
  cor?: string;
  layers?: string[];
  total_acoes: number;
  entregues: number;
  iniciadas: number;
  nao_iniciadas: number;
  recurso_utilizado_brl?: number;
  recurso_previsto_brl?: number;
  entrega_2026?: string;
  acoes: PbiaAcao[];
};
export type PbiaData = {
  fonte: string;
  total_acoes: number;
  total_entregues: number;
  total_iniciadas: number;
  total_nao_iniciadas: number;
  recurso_utilizado_brl?: number;
  recurso_previsto_brl?: number;
  eixos: PbiaEixo[];
};

/** Categorias de atores do mapa associadas a cada eixo do PBIA (curadoria Motor 4P). */
export const CATEGORIAS_POR_EIXO: Record<number, string[]> = {
  1: ["supercomputacao", "datacenter", "energia"],
  2: ["universidade", "instituto", "laboratorio"],
  3: ["universidade", "instituto"],
  4: ["startup", "embrapii", "habitat"],
  5: ["instituto"],
};

const bi = (v?: number) =>
  v == null ? "—" : v >= 1e9 ? `R$ ${(v / 1e9).toFixed(2).replace(".", ",")} bi` : `R$ ${(v / 1e6).toFixed(0)} mi`;

interface Props {
  eixoSelecionado: number | null;
  onSelecionarEixo: (n: number | null, cor?: string | null) => void;
  destacarAtores: boolean;
  onDestacarAtores: (v: boolean) => void;
  mostrarAncoras: boolean;
  onMostrarAncoras: (v: boolean) => void;
  onAbrirPoliticas?: () => void;
  /** Quantidade de atores no recorte atual que pertencem ao eixo ativo. */
  atoresDoEixo?: number;
}

/** PBIA dentro da Layer 7 — execução real do plano + seletor de eixos que filtra o mapa. */
export default function PbiaEixos({
  eixoSelecionado,
  onSelecionarEixo,
  destacarAtores,
  onDestacarAtores,
  mostrarAncoras,
  onMostrarAncoras,
  onAbrirPoliticas,
  atoresDoEixo,
}: Props) {
  const [dados, setDados] = useState<PbiaData | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/pbia-acoes.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setDados)
      .catch((e) => setErro(String(e.message ?? e)));
  }, []);

  if (erro) return <p className="px-2 text-[11px] text-destructive">PBIA indisponível: {erro}</p>;
  if (!dados) return <p className="px-2 text-[11px] text-muted-foreground">carregando PBIA…</p>;

  const eixoAtivo = dados.eixos.find((e) => e.numero === eixoSelecionado) ?? null;

  return (
    <div className="ml-6 mt-1 space-y-1.5 border-l border-border pl-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">PBIA — Plano Brasileiro de IA</p>

      <div className="rounded-md bg-muted/50 px-2 py-1.5 text-[10px] leading-relaxed text-muted-foreground">
        {dados.total_acoes} ações · {dados.total_entregues} com entregas · {dados.total_iniciadas} iniciadas
        <br />
        {bi(dados.recurso_utilizado_brl)} de {bi(dados.recurso_previsto_brl)} previstos
      </div>

      <div className="space-y-1">
        {dados.eixos.map((e) => {
          const ativo = e.numero === eixoSelecionado;
          const w = (n: number) => `${(n / Math.max(1, e.total_acoes)) * 100}%`;
          return (
            <button
              key={e.id}
              type="button"
              aria-pressed={ativo}
              onClick={() => onSelecionarEixo(ativo ? null : e.numero, e.cor ?? null)}
              className={`w-full rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${ativo ? "bg-violet-500/15 ring-1 ring-violet-500/40" : "bg-card hover:bg-muted"}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.cor || "#a78bfa" }} aria-hidden />
                <span className="flex-1 truncate">Eixo {e.numero} — {e.nome}</span>
                <span className="text-[10px] text-muted-foreground">{e.total_acoes}</span>
              </div>
              <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted">
                {e.entregues > 0 && <div className="bg-emerald-500" style={{ width: w(e.entregues) }} />}
                {e.iniciadas > 0 && <div className="bg-amber-500" style={{ width: w(e.iniciadas) }} />}
              </div>
              {ativo && (
                <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
                  <p>{e.entregues} entregues · {e.iniciadas} iniciadas · {e.nao_iniciadas} não iniciadas</p>
                  <p>{bi(e.recurso_utilizado_brl)} de {bi(e.recurso_previsto_brl)}</p>
                  {e.layers && e.layers.length > 0 && (
                    <p className="flex flex-wrap gap-1 pt-0.5">
                      {e.layers.map((l) => (
                        <span key={l} className="rounded border border-violet-500/40 px-1 text-[9px] font-bold text-violet-300">{l}</span>
                      ))}
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-md bg-card px-2 py-1.5 text-[11px] hover:bg-muted">
        <input
          type="checkbox"
          checked={destacarAtores}
          disabled={!eixoAtivo}
          onChange={() => onDestacarAtores(!destacarAtores)}
          className="h-3.5 w-3.5 shrink-0 accent-violet-500"
        />
        <span className="flex-1 truncate">Destacar atores do eixo</span>
        {destacarAtores && eixoAtivo && atoresDoEixo != null && (
          <span className="text-[10px] text-muted-foreground">{atoresDoEixo.toLocaleString("pt-BR")}</span>
        )}
      </label>
      {!eixoAtivo && <p className="px-2 text-[10px] text-muted-foreground">Selecione um eixo para destacar atores.</p>}

      <label className="flex cursor-pointer items-center gap-2 rounded-md bg-card px-2 py-1.5 text-[11px] hover:bg-muted">
        <input
          type="checkbox"
          checked={mostrarAncoras}
          onChange={() => onMostrarAncoras(!mostrarAncoras)}
          className="h-3.5 w-3.5 shrink-0 accent-violet-500"
        />
        <span className="flex-1 truncate">Infraestruturas âncora PBIA</span>
      </label>

      <div className="flex flex-wrap gap-2 px-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />entregues</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />iniciadas</span>
      </div>

      <div className="space-y-0.5 px-2 text-[10px]">
        {onAbrirPoliticas && (
          <button type="button" onClick={onAbrirPoliticas} className="text-primary hover:underline">
            Abrir painel de Políticas
          </button>
        )}
        <a href="/analise?cenario=3" className="block text-primary hover:underline">Ver análise completa → Cenário 3</a>
        <a href="https://pbia.cgee.org.br/resultados" target="_blank" rel="noreferrer" className="block text-muted-foreground hover:underline">
          Fonte: painel PBIA (CGEE)
        </a>
        <p className="pt-0.5 text-muted-foreground">Vínculo eixo × camada × ator: curadoria Motor 4P (UFPR/PPGPP).</p>
      </div>
    </div>
  );
}

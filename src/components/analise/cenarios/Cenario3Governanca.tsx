import { useState, useEffect } from "react";

interface Acao {
  id: string; nome: string; status: "entregue" | "iniciada" | "nao_iniciada";
  layer: string; curadoria: boolean;
}
interface Eixo {
  id: string; nome: string; numero: number; cor: string; layers: string[];
  total_acoes: number; entregues: number; iniciadas: number; nao_iniciadas: number;
  recurso_utilizado_brl: number; recurso_previsto_brl: number;
  entrega_2026: string; acoes: Acao[];
}
interface PBIAData {
  total_acoes: number; total_entregues: number; total_iniciadas: number; total_nao_iniciadas: number;
  recurso_utilizado_brl: number; recurso_previsto_brl: number; fonte: string; eixos: Eixo[];
}

const STATUS_COR = { entregue: "#34d399", iniciada: "#facc15", nao_iniciada: "#94a3b8" };
const STATUS_LABEL = { entregue: "Com entrega", iniciada: "Iniciada", nao_iniciada: "Não iniciada" };
const LAYER_NOME: Record<string, string> = {
  L1:"Energia", L2:"Infra Física", L3:"Infra Lógica",
  L4:"Modelos", L5:"Aplicações", L6:"Pesquisa", L7:"Governança"
};

function fmt(v: number) {
  if (v >= 1e9) return `R$ ${(v/1e9).toFixed(2)} bi`;
  if (v >= 1e6) return `R$ ${(v/1e6).toFixed(1)} mi`;
  if (v >= 1e3) return `R$ ${(v/1e3).toFixed(0)} mil`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

export default function Cenario3Governanca() {
  const [pbia, setPbia] = useState<PBIAData | null>(null);
  const [eixoSel, setEixoSel] = useState<string | null>(null);
  const [acaoAberta, setAcaoAberta] = useState<(Acao & { eixo: Eixo }) | null>(null);

  useEffect(() => {
    fetch("/pbia-acoes.json").then(r => r.json()).then(setPbia);
  }, []);

  if (!pbia) return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  const eixosFiltrados = eixoSel ? pbia.eixos.filter(e => e.id === eixoSel) : pbia.eixos;
  const todasAcoes = eixosFiltrados.flatMap(e => e.acoes.map(a => ({ ...a, eixo: e })));
  const pctEntregue = Math.round(100 * pbia.total_entregues / pbia.total_acoes);
  const pctRecurso = Math.round(100 * pbia.recurso_utilizado_brl / pbia.recurso_previsto_brl);

  return (
    <div className="space-y-6">
      {/* Fio narrativo */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-foreground leading-relaxed">
          <strong>O PBIA 2024-2028 tem 54 ações distribuídas em 5 eixos.</strong> Em 30/09/2026, {pbia.total_entregues} ações têm entregas confirmadas, {pbia.total_iniciadas} estão em execução e {pbia.total_nao_iniciadas} ainda não foram iniciadas. O recurso previsto é de {fmt(pbia.recurso_previsto_brl)}, sendo {fmt(pbia.recurso_utilizado_brl)} já utilizados ({pctRecurso}%). <strong className="text-foreground">Clique num eixo</strong> para filtrar as ações e <strong className="text-foreground">clique numa ação</strong> para ver os detalhes e a camada de IA associada.
        </p>
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { v: String(pbia.total_acoes), l: "Ações previstas (2024-2028)", cor: "#a78bfa" },
          { v: String(pbia.total_entregues), l: "Com entrega confirmada", cor: "#34d399" },
          { v: `${pctEntregue}%`, l: "Taxa de entrega atual", cor: pctEntregue >= 50 ? "#34d399" : "#fb923c" },
          { v: fmt(pbia.recurso_utilizado_brl), l: `de ${fmt(pbia.recurso_previsto_brl)} previstos`, cor: "#60a5fa" },
        ].map(m => (
          <div key={m.l} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xl font-bold leading-tight" style={{ color: m.cor }}>{m.v}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.l}</p>
          </div>
        ))}
      </div>

      {/* Cards por eixo — estilo painel CGEE */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">PBIA — Progresso por eixo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Fonte: {pbia.fonte} · <strong className="text-foreground">clique para filtrar as ações</strong></p>
          </div>
          {eixoSel && (
            <button onClick={() => setEixoSel(null)} className="text-xs text-muted-foreground hover:text-foreground underline">
              limpar filtro
            </button>
          )}
        </div>

        <div className="space-y-3">
          {pbia.eixos.map(e => {
            const isAtivo = eixoSel === e.id;
            const pctUtil = Math.round(100 * e.recurso_utilizado_brl / e.recurso_previsto_brl);
            return (
              <button key={e.id} onClick={() => setEixoSel(isAtivo ? null : e.id)}
                className={`w-full rounded-lg border p-3 text-left transition-all ${isAtivo ? "bg-muted/30" : "border-border hover:bg-muted/20"}`}
                style={{ borderColor: isAtivo ? e.cor : undefined }}>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: e.cor }}>E{e.numero}</span>
                    <span className="text-xs font-medium text-foreground truncate">{e.nome}</span>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-muted-foreground">{e.total_acoes}</span>
                </div>
                {/* Barra tricolor */}
                <div className="flex h-2 w-full rounded-full overflow-hidden">
                  <div className="bg-green-400 transition-all" style={{ width: `${(e.entregues/e.total_acoes)*100}%` }} />
                  <div className="bg-yellow-400 transition-all" style={{ width: `${(e.iniciadas/e.total_acoes)*100}%` }} />
                  <div className="bg-muted flex-1" />
                </div>
                <div className="flex items-center mt-1.5 text-[10px] flex-wrap gap-x-3 gap-y-0.5">
                  <span className="text-green-400">{e.entregues} com entregas</span>
                  <span className="text-yellow-400">{e.iniciadas} iniciadas</span>
                  <span className="text-muted-foreground">{e.nao_iniciadas} não iniciadas</span>
                  <span className="ml-auto font-medium" style={{ color: e.cor }}>
                    {fmt(e.recurso_utilizado_brl)} / {fmt(e.recurso_previsto_brl)} ({pctUtil}%)
                  </span>
                </div>
                {/* Layers associadas */}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {e.layers.map(l => (
                    <span key={l} className="rounded border px-1 py-0.5 text-[9px] font-bold uppercase"
                      style={{ background: e.cor+"20", color: e.cor, borderColor: e.cor+"40" }}>{l}</span>
                  ))}
                  <span className="text-[10px] text-muted-foreground italic ml-1">camadas de IA relacionadas · curadoria Motor</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-green-400 inline-block"/>Com entregas</span>
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-yellow-400 inline-block"/>Iniciada</span>
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-muted inline-block"/>Não iniciada</span>
        </div>
      </div>

      {/* Lista de ações */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          {eixoSel
            ? `Ações — Eixo ${pbia.eixos.find(e => e.id === eixoSel)?.numero}: ${pbia.eixos.find(e => e.id === eixoSel)?.nome}`
            : "Todas as 54 ações do PBIA"} · {todasAcoes.length}
        </h2>
        {eixoSel && pbia.eixos.find(e => e.id === eixoSel)?.entrega_2026 && (
          <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-500/8 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-0.5">Entregas previstas para 2026</p>
            <p className="text-xs text-muted-foreground">{pbia.eixos.find(e => e.id === eixoSel)?.entrega_2026}</p>
          </div>
        )}
        <div className="space-y-1.5">
          {todasAcoes.map(a => (
            <button key={a.id} onClick={() => setAcaoAberta(a)}
              className="w-full flex items-center gap-2.5 rounded-lg border border-border bg-muted/10 p-2.5 text-left hover:bg-muted/40 transition-colors">
              <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COR[a.status] }} />
              <span className="shrink-0 rounded border px-1 py-0.5 text-[9px] font-bold uppercase"
                style={{ background: a.eixo.cor+"20", color: a.eixo.cor, borderColor: a.eixo.cor+"40" }}>{a.layer}</span>
              <span className="flex-1 text-xs text-foreground">{a.nome}</span>
              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
                style={{ background: STATUS_COR[a.status]+"20", color: STATUS_COR[a.status] }}>
                {STATUS_LABEL[a.status]}
              </span>
            </button>
          ))}
        </div>
        {todasAcoes.some(a => a.curadoria) && (
          <p className="mt-3 text-[10px] text-muted-foreground italic">
            ⓘ Classificação por layer (L1-L7) é curadoria do Motor da Inovação / UFPR-PPGPP com base nas ações do painel CGEE.
          </p>
        )}
      </div>

      {/* Insight */}
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-xl text-violet-400 shrink-0 mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }}>insights</span>
          <div>
            <p className="text-sm font-semibold text-violet-400">O que o PBIA revela para a tese</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              O Eixo 4 (IA para Inovação Empresarial) concentra o maior volume de recursos utilizados — R$ 6,77 bi de R$ 13,76 bi previstos (49%) — mas tem apenas 4 de 9 ações entregues. É o eixo que deveria criar o mercado de IA no Brasil, mas ainda está na metade da execução. O Eixo 2 (Formação), por outro lado, tem 5 de 8 ações entregues com R$ 436 mi utilizados — o capital humano está sendo formado antes da infraestrutura de aplicação estar pronta. Isso confirma o Gap de Tradução mapeado no Cenário 2.
            </p>
          </div>
        </div>
      </div>

      {/* Drawer de ação */}
      {acaoAberta && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setAcaoAberta(null)}>
          <div className="flex-1 bg-black/40" />
          <div className="w-full max-w-sm bg-card border-l border-border flex flex-col h-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border px-4 py-3 shrink-0 gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
                    style={{ background: acaoAberta.eixo.cor+"20", color: acaoAberta.eixo.cor, borderColor: acaoAberta.eixo.cor+"40" }}>
                    E{acaoAberta.eixo.numero}
                  </span>
                  <span className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
                    style={{ background: "#818cf820", color: "#818cf8", borderColor: "#818cf840" }}>
                    {acaoAberta.layer}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: STATUS_COR[acaoAberta.status]+"20", color: STATUS_COR[acaoAberta.status] }}>
                    {STATUS_LABEL[acaoAberta.status]}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground leading-tight">{acaoAberta.nome}</h3>
              </div>
              <button onClick={() => setAcaoAberta(null)} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                <span className="material-symbols-outlined text-lg leading-none">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="rounded-lg bg-muted/30 p-3 space-y-2.5">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Eixo PBIA</p>
                  <p className="text-xs font-medium text-foreground">E{acaoAberta.eixo.numero} — {acaoAberta.eixo.nome}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recurso do eixo</p>
                  <p className="text-xs text-foreground">{fmt(acaoAberta.eixo.recurso_utilizado_brl)} utilizados de {fmt(acaoAberta.eixo.recurso_previsto_brl)} previstos</p>
                </div>
                {acaoAberta.eixo.entrega_2026 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entrega prevista 2026</p>
                    <p className="text-xs text-foreground">{acaoAberta.eixo.entrega_2026}</p>
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-1">Camada de IA — curadoria Motor</p>
                <p className="text-xs font-medium text-foreground">{acaoAberta.layer} — {LAYER_NOME[acaoAberta.layer]}</p>
                <p className="text-[10px] text-muted-foreground mt-1 italic">
                  Classificação por layer é curadoria do Motor da Inovação / UFPR-PPGPP. Não consta no painel oficial CGEE.
                </p>
              </div>
              <a href="https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/transformacaodigital/inteligencia-artificial"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-sm leading-none">open_in_new</span>
                Ver PBIA completo — MCTI/CGEE
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

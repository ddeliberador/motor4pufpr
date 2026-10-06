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
  L1: "Energia", L2: "Infra Física", L3: "Infra Lógica",
  L4: "Modelos", L5: "Aplicações", L6: "Pesquisa", L7: "Governança"
};

function fmt(v: number) {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(2)} bi`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)} mi`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function BarraRecurso({ utilizado, previsto, cor }: { utilizado: number; previsto: number; cor: string }) {
  const pct = Math.min(100, Math.round(100 * utilizado / previsto));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Recursos</span>
        <span className="text-[11px] font-semibold" style={{ color: cor }}>
          {fmt(utilizado)} <span className="text-muted-foreground font-normal">/ {fmt(previsto)} · {pct}%</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cor }} />
      </div>
    </div>
  );
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
  const pctEntregue = Math.round(100 * pbia.total_entregues / pbia.total_acoes);
  const pctRecurso = Math.round(100 * pbia.recurso_utilizado_brl / pbia.recurso_previsto_brl);

  return (
    <div className="space-y-6">
      {/* Fio narrativo */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-base text-foreground leading-relaxed">
          <strong>O PBIA 2024-2028 tem 54 ações distribuídas em 5 eixos.</strong> Em 30/09/2026, {pbia.total_entregues} ações têm entregas confirmadas, {pbia.total_iniciadas} estão em execução e {pbia.total_nao_iniciadas} ainda não foram iniciadas. O recurso previsto é de {fmt(pbia.recurso_previsto_brl)}, sendo {fmt(pbia.recurso_utilizado_brl)} já utilizados ({pctRecurso}%). <strong>Clique num eixo</strong> para filtrar as ações e <strong>clique numa ação</strong> para ver os detalhes e a camada de IA associada.
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
            <p className="text-2xl font-bold leading-tight" style={{ color: m.cor }}>{m.v}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.l}</p>
          </div>
        ))}
      </div>

      {/* Cards por eixo */}
      <div>
        <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-foreground">PBIA — Progresso por eixo</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Fonte: {pbia.fonte} · <strong className="text-foreground">clique num eixo para filtrar as ações abaixo</strong></p>
          </div>
          {eixoSel && (
            <button onClick={() => setEixoSel(null)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
              ✕ limpar filtro
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pbia.eixos.map(e => {
            const isAtivo = eixoSel === e.id;
            const pctEnt = Math.round(100 * e.entregues / e.total_acoes);
            return (
              <button key={e.id} onClick={() => setEixoSel(isAtivo ? null : e.id)}
                className={`relative overflow-hidden rounded-xl border bg-card p-5 text-left transition-all hover:shadow-lg ${isAtivo ? "ring-2 shadow-lg" : "border-border hover:border-muted-foreground/30"}`}
                style={isAtivo ? { borderColor: e.cor, ["--tw-ring-color" as string]: e.cor } : undefined}>
                {/* faixa de cor no topo */}
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: e.cor }} />

                <div className="flex items-start gap-3 mt-1">
                  <span className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl text-base font-bold text-white shadow"
                    style={{ backgroundColor: e.cor }}>E{e.numero}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-foreground leading-snug">{e.nome}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{e.total_acoes} ações · {pctEnt}% entregues</p>
                  </div>
                  {isAtivo && (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: e.cor }}>
                      filtrado
                    </span>
                  )}
                </div>

                {/* Barra tricolor de status */}
                <div className="mt-4">
                  <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted">
                    <div className="bg-green-400 transition-all" style={{ width: `${(e.entregues / e.total_acoes) * 100}%` }} />
                    <div className="bg-yellow-400 transition-all" style={{ width: `${(e.iniciadas / e.total_acoes) * 100}%` }} />
                  </div>
                  <div className="flex items-center mt-2 text-xs flex-wrap gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1.5 text-green-400 font-medium">
                      <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />{e.entregues} entregues
                    </span>
                    <span className="flex items-center gap-1.5 text-yellow-400 font-medium">
                      <span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" />{e.iniciadas} iniciadas
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" />{e.nao_iniciadas} não iniciadas
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <BarraRecurso utilizado={e.recurso_utilizado_brl} previsto={e.recurso_previsto_brl} cor={e.cor} />
                </div>

                {/* Layers associadas */}
                <div className="flex gap-1.5 mt-4 flex-wrap items-center">
                  {e.layers.map(l => (
                    <span key={l} className="rounded-md border px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: e.cor + "18", color: e.cor, borderColor: e.cor + "40" }}
                      title={LAYER_NOME[l]}>{l}</span>
                  ))}
                  <span className="text-[10px] text-muted-foreground italic ml-1">camadas de IA · curadoria Motor</span>
                </div>
              </button>
            );
          })}

          {/* Card de síntese ocupa o 6º slot no xl */}
          <div className="rounded-xl border border-dashed border-border bg-muted/10 p-5 flex flex-col justify-center">
            <p className="text-sm font-semibold text-foreground">Leitura rápida</p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Verde = ação com entrega confirmada no painel oficial. Amarelo = iniciada, sem entrega ainda. Cinza = não iniciada. A barra de recursos mostra o quanto do orçamento previsto do eixo já foi utilizado.
            </p>
          </div>
        </div>
      </div>

      {/* Lista de ações — agrupada por eixo */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          {eixoSel
            ? `Ações — Eixo ${pbia.eixos.find(e => e.id === eixoSel)?.numero}: ${pbia.eixos.find(e => e.id === eixoSel)?.nome}`
            : "As 54 ações do PBIA"}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Clique numa ação para ver detalhes e a camada de IA associada.</p>

        {eixoSel && pbia.eixos.find(e => e.id === eixoSel)?.entrega_2026 && (
          <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/8 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-0.5">Entregas previstas para 2026</p>
            <p className="text-sm text-muted-foreground">{pbia.eixos.find(e => e.id === eixoSel)?.entrega_2026}</p>
          </div>
        )}

        <div className="space-y-6">
          {eixosFiltrados.map(e => (
            <div key={e.id}>
              {!eixoSel && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white"
                    style={{ backgroundColor: e.cor }}>E{e.numero}</span>
                  <span className="text-sm font-bold text-foreground">{e.nome}</span>
                  <span className="text-xs text-muted-foreground">· {e.acoes.length} ações</span>
                </div>
              )}
              <div className="grid gap-1.5 md:grid-cols-2">
                {e.acoes.map(a => (
                  <button key={a.id} onClick={() => setAcaoAberta({ ...a, eixo: e })}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/10 p-3 text-left hover:bg-muted/40 hover:border-muted-foreground/30 transition-colors">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COR[a.status] }} />
                    <span className="flex-1 text-sm text-foreground leading-snug">{a.nome}</span>
                    <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: e.cor + "18", color: e.cor, borderColor: e.cor + "40" }}>{a.layer}</span>
                    <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
                      style={{ background: STATUS_COR[a.status] + "20", color: STATUS_COR[a.status] }}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[10px] text-muted-foreground italic">
          ⓘ Classificação por layer (L1-L7) é curadoria do Motor da Inovação / UFPR-PPGPP com base nas ações do painel CGEE.
        </p>
      </div>

      {/* Insight */}
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-xl text-violet-400 shrink-0 mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }}>insights</span>
          <div>
            <p className="text-base font-semibold text-violet-400">O que o PBIA revela para a tese</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
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
                    style={{ background: acaoAberta.eixo.cor + "20", color: acaoAberta.eixo.cor, borderColor: acaoAberta.eixo.cor + "40" }}>
                    E{acaoAberta.eixo.numero}
                  </span>
                  <span className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
                    style={{ background: "#818cf820", color: "#818cf8", borderColor: "#818cf840" }}>
                    {acaoAberta.layer}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: STATUS_COR[acaoAberta.status] + "20", color: STATUS_COR[acaoAberta.status] }}>
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

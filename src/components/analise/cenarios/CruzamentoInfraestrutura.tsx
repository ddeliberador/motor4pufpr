import { useState } from "react";
import { Banknote, Cable, Network, Server, Zap, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ESTADOS } from "@/lib/sistemasEstaduais";
import { SITUACOES_ENERGIA, fmtPct } from "@/lib/infraEstados";
import { energiaSemProcessamento, fraseBalanco, resumoCruzamento, type EstadoCruzamento } from "@/lib/cruzamentoInfra";

const estilos = [
  "text-[hsl(var(--energia-exporta))] border-[hsl(var(--energia-exporta)/0.35)]",
  "text-[hsl(var(--energia-equilibrio))] border-[hsl(var(--energia-equilibrio)/0.35)]",
  "text-[hsl(var(--energia-depende))] border-[hsl(var(--energia-depende)/0.35)]",
];
const coresCartao = [
  "border-[hsl(var(--energia-exporta)/0.65)] border-t-4 bg-[hsl(var(--energia-exporta)/0.14)] hover:bg-[hsl(var(--energia-exporta)/0.24)]",
  "border-[hsl(var(--energia-equilibrio)/0.75)] border-t-4 bg-[hsl(var(--energia-equilibrio)/0.16)] hover:bg-[hsl(var(--energia-equilibrio)/0.28)]",
  "border-[hsl(var(--energia-depende)/0.65)] border-t-4 bg-[hsl(var(--energia-depende)/0.14)] hover:bg-[hsl(var(--energia-depende)/0.24)]",
];
type Coluna = "uf" | "situacao" | "razao" | "brasil" | "cabo" | "fibra" | "dc";

export default function CruzamentoInfraestrutura({ linhas, totalDc, uf, onUfChange, carregando }: {
  linhas: EstadoCruzamento[]; totalDc: number | null; uf: string; onUfChange: (uf: string) => void; carregando: boolean;
}) {
  const [ordem, setOrdem] = useState<{ col: Coluna; desc: boolean }>({ col: "dc", desc: true });
  const totalRanking = linhas.filter(l => l.rankTarifa != null).length;
  const resumo = resumoCruzamento(linhas, totalDc);
  const ordenadas = [...linhas].sort((a, b) => {
    const va = a[ordem.col], vb = b[ordem.col];
    if (va == null) return vb == null ? 0 : 1;
    if (vb == null) return -1;
    const cmp = ordem.col === "uf" ? (ESTADOS[String(va)] ?? String(va)).localeCompare(ESTADOS[String(vb)] ?? String(vb))
      : typeof va === "string" ? va.localeCompare(String(vb)) : Number(va) - Number(vb);
    return cmp * (ordem.desc ? -1 : 1);
  });
  const cartao = (l: EstadoCruzamento) => (
    <Button key={l.uf} variant="outline" aria-label={`Selecionar ${ESTADOS[l.uf]} no cenário`} aria-pressed={uf === l.uf}
      onClick={() => onUfChange(l.uf)} data-uf={l.uf}
      className={`block h-full min-w-0 w-full whitespace-normal rounded-lg p-3 text-left text-foreground hover:text-foreground ${uf === l.uf ? "ring-2 ring-primary" : ""} ${coresCartao[SITUACOES_ENERGIA.findIndex(s => s === l.situacao)] ?? "border-border bg-background"}`}>
      <div className="flex min-h-10 items-start justify-between gap-1">
        <span className="min-w-0 text-sm font-semibold leading-tight">{ESTADOS[l.uf]}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{l.uf}</span>
      </div>
      <p className="mt-1 min-h-8 text-[11px] leading-snug text-muted-foreground">{fraseBalanco(l.razao)}</p>
      <div className="mt-3 flex items-center justify-between gap-1">
        <span className="flex items-center gap-1" title="Datacenters"><Server aria-hidden="true" className="text-muted-foreground" /><strong className={l.dc == null ? "text-[10px]" : "text-xl"}>{l.dc ?? "indisponível"}</strong></span>
        <Cable aria-label={l.cabo == null ? "Cabo internacional indisponível" : l.cabo ? "Com cabo internacional" : "Sem cabo internacional"} className={l.cabo ? "text-primary" : "text-muted-foreground opacity-35"} />
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground"><Network aria-hidden="true" /><span>Fibra {l.fibra == null ? "indisponível" : `${fmtPct(l.fibra)}%`}</span></div>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><Banknote aria-hidden="true" /><span title="Tarifa residencial · ANEEL">Tarifa {l.tarifa == null ? "indisponível" : `R$ ${l.tarifa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/MWh`} · {l.rankTarifa == null ? "ranking indisponível" : `${l.rankTarifa}º mais barata de ${totalRanking}`}</span></div>
      {l.fibra != null && <progress aria-label={`Municípios com fibra em ${ESTADOS[l.uf]}`} value={l.fibra} max={100} className="mt-1 block h-1 w-full overflow-hidden rounded [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary" />}
      {energiaSemProcessamento(l) && <span className="mt-3 flex items-start gap-1 text-[10px] font-semibold leading-tight text-[hsl(var(--energia-exporta))]"><Zap aria-hidden="true" />energia sem processamento</span>}
    </Button>
  );
  return (
    <section aria-labelledby="cruzamento-titulo" className="space-y-4 py-5">
      <h2 id="cruzamento-titulo" className="text-xl font-bold text-foreground">Onde as três camadas se encontram</h2>
      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-base font-semibold text-foreground">
        {resumo ? `Os ${resumo.exportadores} estados que exportam energia têm ${fmtPct(resumo.pctExportadores)}% dos datacenters do país; os que dependem de energia de fora concentram ${fmtPct(resumo.pctDependentes)}%${resumo.principalDependente ? `, puxados por ${ESTADOS[resumo.principalDependente]}` : ""}.`
          : carregando ? "Carregando o balanço energético e os datacenters…" : "Cruzamento indisponível: faltam dados de balanço energético ou datacenters."}
      </p>
      <div className="grid items-start gap-5 lg:grid-cols-3">
        {SITUACOES_ENERGIA.map((situacao, i) => {
          const grupo = linhas.filter(l => l.situacao === situacao).sort((a, b) => (b.dc ?? -1) - (a.dc ?? -1) || (ESTADOS[a.uf] ?? a.uf).localeCompare(ESTADOS[b.uf] ?? b.uf));
          const dc = grupo.some(l => l.dc == null) ? null : grupo.reduce((s, l) => s + (l.dc ?? 0), 0);
          return <section key={situacao} aria-label={situacao} className="min-w-0">
            <header className={`mb-3 min-h-24 border-t-2 pt-3 ${estilos[i]}`}>
              <h3 className="text-base font-semibold leading-snug">{situacao}</h3>
              <p className="mt-2 text-xs text-muted-foreground">{linhas.some(l => l.situacao == null) ? "Estados indisponíveis" : `${grupo.length} estados`} · <strong className="text-foreground">{dc == null || !grupo.length && linhas.some(l => l.situacao == null) ? "datacenters indisponíveis" : `${dc} datacenters`}</strong></p>
            </header>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 xl:grid-cols-2">{grupo.map(cartao)}</div>
          </section>;
        })}
      </div>
      {linhas.some(l => l.situacao == null) && <div><h3 className="mb-3 text-sm text-muted-foreground">Balanço energético indisponível</h3><div className="grid grid-cols-2 gap-2 lg:grid-cols-6">{linhas.filter(l => l.situacao == null).map(cartao)}</div></div>}
      <p className="text-[11px] text-muted-foreground">Situação comparada à relação geração/consumo do Brasil. Energia sem processamento: estados exportadores com até 2 datacenters. Ranking de custo: tarifa residencial (ANEEL), do mais barato (1º) ao mais caro (27º). Cabo indica apenas ligação internacional; fibra indica municípios com backhaul.</p>
      <details className="border-t border-border pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold"><ChevronDown size={16} />Ver como tabela</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">{([
              ["uf", "Estado"], ["situacao", "Situação energética"], ["razao", "Geração / consumo"], ["brasil", "Referência Brasil"], ["cabo", "Cabo internacional"], ["fibra", "% municípios com fibra"], ["dc", "Datacenters"],
            ] as [Coluna, string][]).map(([col, label]) => <th key={col} aria-sort={ordem.col === col ? ordem.desc ? "descending" : "ascending" : "none"}><Button variant="ghost" size="sm" className="h-auto whitespace-normal px-1 py-2 text-left text-xs hover:bg-muted hover:text-foreground" onClick={() => setOrdem(o => ({ col, desc: o.col === col ? !o.desc : col !== "uf" && col !== "situacao" }))}>{label}{ordem.col === col ? ordem.desc ? " ↓" : " ↑" : ""}</Button></th>)}</tr></thead>
            <tbody>{ordenadas.map(l => <tr key={l.uf} className="border-b border-border/50"><td className="py-2 pr-2">{ESTADOS[l.uf]} ({l.uf})</td><td className="pr-2">{l.situacao ?? "—"}</td><td className="pr-2">{l.razao == null ? "—" : fraseBalanco(l.razao)}</td><td className="pr-2">{l.brasil == null ? "—" : `${l.brasil.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}×`}</td><td>{l.cabo == null ? "—" : l.cabo ? "sim" : "não"}</td><td>{l.fibra == null ? "—" : `${fmtPct(l.fibra)}%`}</td><td>{l.dc ?? "—"}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">“—” indica fonte indisponível, não zero.</p>
      </details>
    </section>
  );
}
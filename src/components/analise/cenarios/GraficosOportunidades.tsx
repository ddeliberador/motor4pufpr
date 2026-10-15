import { Button } from "@/components/ui/button";
import { type AreaOportunidades } from "@/lib/oportunidadesPublicas";

const QUADRADOS = ["bg-accent border-accent", "border-[1.5px] border-muted-foreground bg-transparent", "border border-dashed border-muted-foreground/60 bg-muted"];
const ROTULOS = ["Com possível solução", "Sem solução catalogada", "Descrição insuficiente"];

export default function GraficosOportunidades({ areas, onArea }: { areas: AreaOportunidades[]; onArea: (area: string) => void }) {
  return <section aria-labelledby="lacunas-t" className="space-y-4">
    <h2 id="lacunas-t" className="text-xl font-bold">Onde estão as lacunas</h2>
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">{ROTULOS.map((r, i) => <span key={r} className="flex items-center gap-1.5"><span className={`h-3 w-3 shrink-0 rounded-[2px] ${QUADRADOS[i]}`} />{r}</span>)}</div>
    <div className="hidden grid-cols-[12rem_1fr_9rem] gap-4 text-xs text-muted-foreground md:grid"><span>Área</span><span>Oportunidades · C/T</span><span className="text-right font-normal">Startups do setor (BR)</span></div>
    <div className="divide-y divide-border">{[...areas].sort((a, b) => b.total - a.total || a.area.localeCompare(b.area)).map(a => <Button
      key={a.area} variant="ghost" onClick={() => onArea(a.area)}
      aria-label={`${a.area}: ${a.total} oportunidades, ${a.com_solucao} com possível solução, ${a.sem_solucao} sem solução, ${a.insuficiente} com descrição insuficiente; ${a.startups_segmento_brasil ?? "indisponível"} startups`}
      className="grid h-auto w-full grid-cols-[1fr_auto] gap-x-4 gap-y-2 whitespace-normal rounded-none px-0 py-3 text-left font-normal hover:bg-muted hover:text-foreground md:grid-cols-[12rem_1fr_9rem]">
      <span className="text-sm">{a.area}</span>
      <span aria-hidden="true" className="order-3 col-span-2 flex items-start gap-3 md:order-none md:col-span-1"><span className="flex flex-1 flex-wrap gap-1">{[a.com_solucao, a.sem_solucao, a.insuficiente].flatMap((n, i) => Array.from({ length: n }, (_, j) => <span key={`${i}-${j}`} className={`h-3 w-3 shrink-0 rounded-[2px] ${QUADRADOS[i]}`} />))}</span><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{a.com_solucao}/{a.total}</span></span>
      <span className="text-right text-xs font-normal tabular-nums text-muted-foreground"><span className="md:hidden">Startups do setor (BR): </span>{a.startups_segmento_brasil?.toLocaleString("pt-BR") ?? "—"}</span>
    </Button>)}</div>
  </section>;
}

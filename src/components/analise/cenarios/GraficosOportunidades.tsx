import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type AreaOportunidades, type UfOportunidades } from "@/lib/oportunidadesPublicas";

const QUADRADOS = ["bg-accent border-accent", "border-[1.5px] border-muted-foreground bg-transparent", "border border-dashed border-muted-foreground/60 bg-muted"];
const ROTULOS = ["Com possível solução", "Sem solução catalogada", "Descrição insuficiente"];
// Seven fixed columns, north to south; blank cells preserve the geographic layout.
const GRADE = [
  [null, null, "RR", null, "AP", null, null],
  ["AC", "AM", null, "PA", "MA", "CE", "RN"],
  [null, "RO", "MT", "TO", "PI", "PE", "PB"],
  [null, null, "MS", "GO", "BA", "SE", "AL"],
  [null, null, null, "DF", "MG", "ES", null],
  [null, null, "PR", "SP", "RJ", null, null],
  [null, null, "SC", null, null, null, null],
  [null, null, "RS", null, null, null, null],
];
export default function GraficosOportunidades({ areas, ufs, selecionada, onArea, onUf }: {
  areas: AreaOportunidades[]; ufs: UfOportunidades[]; selecionada: string; onArea: (area: string) => void; onUf: (uf: string) => void;
}) {
  const max = Math.max(1, ...ufs.map(u => u.total));
  const tile = (uf: string) => {
    const u = ufs.find(u => u.uf === uf);
    const total = u?.total ?? 0;
    const nivel = total === 0 ? "bg-muted" : total / max <= .25 ? "bg-accent/15" : total / max <= .5 ? "bg-accent/30" : total / max <= .75 ? "bg-accent/50" : "bg-accent/70";
    const label = `${uf}: ${total} oportunidades, ${u?.com_solucao ?? 0} com possível solução, ${u?.vigentes ?? 0} vigentes`;
    return <Tooltip key={uf}><TooltipTrigger asChild>
      <Button variant="ghost" aria-label={label} aria-pressed={selecionada === uf} onClick={() => onUf(uf)}
        className={`relative aspect-square h-auto w-full rounded-md border border-border p-0 text-xs font-semibold text-foreground hover:bg-muted hover:text-foreground sm:text-sm ${nivel} ${selecionada === uf ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}`}>
        {uf}{(u?.com_solucao ?? 0) > 0 && <span aria-hidden="true" className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-foreground" />}
      </Button>
    </TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
  };
  const gradeUfs = GRADE.flat().filter(Boolean);
  const outros = ufs.filter(u => u.uf !== "BR" && !gradeUfs.includes(u.uf));
  return <>
    <section aria-labelledby="lacunas-t" className="space-y-4">
      <h2 id="lacunas-t" className="text-xl font-bold">Onde estão as lacunas</h2>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">{ROTULOS.map((r, i) => <span key={r} className="flex items-center gap-1.5"><span className={`h-3 w-3 shrink-0 rounded-sm ${QUADRADOS[i]}`} />{r}</span>)}</div>
      <div className="hidden grid-cols-[12rem_1fr_9rem] gap-4 text-xs text-muted-foreground md:grid"><span>Área</span><span>Oportunidades</span><span className="text-right">C/T · startups</span></div>
      <div className="divide-y divide-border">{[...areas].sort((a, b) => b.total - a.total || a.area.localeCompare(b.area)).map(a => <Button
        key={a.area} variant="ghost" onClick={() => onArea(a.area)}
        aria-label={`${a.area}: ${a.total} oportunidades, ${a.com_solucao} com possível solução, ${a.sem_solucao} sem solução, ${a.insuficiente} com descrição insuficiente; ${a.startups_segmento_brasil ?? "indisponível"} startups`}
        className="grid h-auto w-full grid-cols-[1fr_auto] gap-x-4 gap-y-2 whitespace-normal rounded-none px-0 py-3 text-left font-normal hover:bg-muted hover:text-foreground md:grid-cols-[12rem_1fr_9rem]">
        <span className="text-sm">{a.area}</span>
        <span aria-hidden="true" className="order-3 col-span-2 flex flex-wrap gap-1 md:order-none md:col-span-1">{[a.com_solucao, a.sem_solucao, a.insuficiente].flatMap((n, i) => Array.from({ length: n }, (_, j) => <span key={`${i}-${j}`} className={`h-3 w-3 shrink-0 rounded-sm ${QUADRADOS[i]}`} />))}</span>
        <span className="text-right text-xs tabular-nums text-muted-foreground">{a.com_solucao}/{a.total} · {a.startups_segmento_brasil?.toLocaleString("pt-BR") ?? "—"}</span>
      </Button>)}</div>
    </section>
    <section aria-labelledby="uf-t" className="space-y-4">
      <h2 id="uf-t" className="text-xl font-bold">Por estado</h2>
      <p className="text-xs text-muted-foreground">Intensidade: total de oportunidades · ponto: há possível solução · BR: alcance nacional</p>
      <TooltipProvider><div className="flex max-w-lg items-start gap-4">
        <div className="grid min-w-0 flex-1 grid-cols-7 gap-1.5">{GRADE.flat().map((uf, i) => uf ? tile(uf) : <span key={`v-${i}`} aria-hidden="true" className="aspect-square" />)}</div>
        <div className="w-10 shrink-0 sm:w-14">{tile("BR")}</div>
      </div></TooltipProvider>
      {outros.length > 0 && <div className="flex flex-wrap gap-2">{outros.map(u => <Button key={u.uf ?? "nd"} variant="outline" size="sm" disabled={!u.uf} onClick={() => u.uf && onUf(u.uf)} className="h-auto whitespace-normal text-xs">{u.uf ?? "UF não identificada"}: {u.total} oportunidades · {u.com_solucao} com solução</Button>)}</div>}
    </section>
  </>;
}
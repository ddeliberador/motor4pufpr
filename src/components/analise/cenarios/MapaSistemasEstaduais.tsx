import { useEffect, useState } from "react";
import { ESTADOS, PERFIS, corPerfil, type ViewRow } from "@/lib/sistemasEstaduais";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const EXPLICACOES: Record<string, string> = {
  "Exportador de competência": "as unidades de pesquisa do estado atendem principalmente empresas de outros estados.",
  "Importador de competência": "a maioria das empresas do estado busca pesquisa em unidades de outros estados.",
  "Autocentrado": "empresas e unidades se relacionam principalmente dentro do próprio estado.",
  "Aberto (circula nos dois sentidos)": "o estado recebe e presta serviços para outros estados em proporções parecidas.",
  "Rede incipiente": "há menos de 30 relações registradas envolvendo o estado.",
  "Sem oferta local": "não há nenhuma unidade EMBRAPII ativa no estado.",
};
export function contarEstadosPorPerfil(perfis: Pick<ViewRow<"vw_uf_relacoes_perfil">, "uf" | "perfil">[], perfil: string) {
  return new Set(perfis.filter(p => p.perfil === perfil && p.uf).map(p => p.uf)).size;
}

function ItemLegenda({ perfil, quantidade, selecionado }: { perfil: string; quantidade: number; selecionado: boolean }) {
  const [aberto, setAberto] = useState(false);
  return <li className="min-w-0"><Tooltip open={aberto} onOpenChange={setAberto}>
    <TooltipTrigger asChild>
      <Button variant="ghost" onClick={() => setAberto(v => !v)} className={`h-auto w-full justify-start whitespace-normal border px-2 py-2 text-left text-sm ${selecionado ? "border-border bg-muted font-semibold" : "border-transparent font-normal"}`}>
        <svg width="12" height="12" aria-hidden="true" className="shrink-0"><rect width="12" height="12" rx="2" fill={corPerfil(perfil)} /></svg>
        <span>{perfil} · {quantidade} {quantidade === 1 ? "estado" : "estados"}</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[min(20rem,calc(100vw-2rem))]">{EXPLICACOES[perfil]}</TooltipContent>
  </Tooltip></li>;
}

type Feature = { properties: { sigla: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } };
const projetar = (lon: number, lat: number) => [(lon + 74.2) / 40.6 * 900, (5.6 - lat) / 39.6 * 900];
function caminho(f: Feature) {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates as number[][][]] : f.geometry.coordinates as number[][][][];
  return polys.map(poly => poly.map(ring => ring.map(([lon, lat], i) => `${i ? "L" : "M"}${projetar(lon, lat).join(",")}`).join("") + "Z").join("")).join("");
}
export default function MapaSistemasEstaduais({ perfis, uf, onChange }: { perfis: ViewRow<"vw_uf_relacoes_perfil">[]; uf: string; onChange: (uf: string) => void }) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    fetch("/br-uf.geojson").then(r => { if (!r.ok) throw new Error("Geometria das UFs indisponível"); return r.json(); }).then(j => { if (ativo) setFeatures(j.features); }).catch(e => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, []);
  const perfilSelecionado = perfis.find(p => p.uf === uf)?.perfil ?? null;
  return <div className="mt-5 space-y-5">
    <div className="max-w-xl space-y-3">
      <div><label htmlFor="sistemas-uf" className="mb-2 block text-sm font-semibold">Estado</label>
        <select id="sistemas-uf" value={uf} onChange={e => onChange(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-base">
          {Object.entries(ESTADOS).sort((a, b) => a[1].localeCompare(b[1], "pt-BR")).map(([sigla, nome]) => <option key={sigla} value={sigla}>{nome} · {sigla}</option>)}
        </select>
      </div>
      <div aria-live="polite">
        <p className="flex items-center gap-2 text-sm font-semibold"><svg width="12" height="12" aria-hidden="true" className="shrink-0"><rect width="12" height="12" rx="2" fill={corPerfil(perfilSelecionado)} /></svg><span>Perfil do {ESTADOS[uf]}: {perfilSelecionado ?? "Perfil indisponível"}</span></p>
        {perfilSelecionado && <p className="mt-1 text-sm text-muted-foreground">{EXPLICACOES[perfilSelecionado]}</p>}
      </div>
    </div>
    <figure className="min-w-0">
      {erro ? <p className="text-destructive">{erro}</p> : <svg viewBox="0 0 900 900" className="mx-auto block aspect-square w-full max-w-[520px]" aria-label="Mapa dos perfis estaduais">
        {features.map(f => {
          const sigla = f.properties.sigla;
          const perfil = perfis.find(p => p.uf === sigla)?.perfil ?? null;
          return <path key={sigla} d={caminho(f)} fill={corPerfil(perfil)} stroke={sigla === uf ? "hsl(var(--foreground))" : "hsl(var(--background))"} strokeWidth={sigla === uf ? 5 : 1.5} role="button" tabIndex={0} aria-label={`Selecionar ${ESTADOS[sigla]}`} aria-pressed={sigla === uf} onClick={() => onChange(sigla)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(sigla); } }} className="cursor-pointer transition-opacity hover:opacity-75 focus:outline-none focus:stroke-foreground"><title>{sigla} · {ESTADOS[sigla]} · {perfil ?? "Perfil indisponível"}</title></path>;
        })}
      </svg>}
      <figcaption className="mt-3">
        <h3 className="text-sm font-semibold">Cores do mapa: perfil de cada estado</h3>
        <TooltipProvider delayDuration={200}><ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">{PERFIS.map(p => <ItemLegenda key={p} perfil={p} quantidade={contarEstadosPorPerfil(perfis, p)} selecionado={p === perfilSelecionado} />)}</ul></TooltipProvider>
      </figcaption>
    </figure>
  </div>;
}
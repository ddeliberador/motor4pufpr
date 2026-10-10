import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ESTADOS, PERFIS, corPerfil, type ViewRow } from "@/lib/sistemasEstaduais";

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
  return <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)]">
    <div className="min-w-0">
      {erro ? <p className="text-destructive">{erro}</p> : <svg viewBox="0 0 900 900" className="mx-auto h-[330px] w-full sm:h-[390px]" aria-label="Mapa dos perfis estaduais">
        {features.map(f => {
          const sigla = f.properties.sigla;
          const perfil = perfis.find(p => p.uf === sigla)?.perfil ?? null;
          return <path key={sigla} d={caminho(f)} fill={corPerfil(perfil)} stroke={sigla === uf ? "hsl(var(--foreground))" : "hsl(var(--background))"} strokeWidth={sigla === uf ? 5 : 1.5} role="button" tabIndex={0} aria-label={`Selecionar ${ESTADOS[sigla]}`} aria-pressed={sigla === uf} onClick={() => onChange(sigla)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(sigla); } }} className="cursor-pointer transition-opacity hover:opacity-75 focus:outline-none focus:stroke-foreground"><title>{sigla} · {ESTADOS[sigla]} · {perfil ?? "Perfil indisponível"}</title></path>;
        })}
      </svg>}
    </div>
    <div className="space-y-5">
      <div><label htmlFor="sistemas-uf" className="mb-2 block text-sm font-semibold">Estado</label>
        <select id="sistemas-uf" value={uf} onChange={e => onChange(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-base">
          {Object.entries(ESTADOS).sort((a, b) => a[1].localeCompare(b[1], "pt-BR")).map(([sigla, nome]) => <option key={sigla} value={sigla}>{nome} · {sigla}</option>)}
        </select>
      </div>
      <ul className="space-y-2.5 text-sm">{PERFIS.map(p => <li key={p} className="flex items-center gap-2"><svg width="12" height="12" aria-hidden="true"><rect width="12" height="12" rx="2" fill={corPerfil(p)} /></svg>{p}</li>)}</ul>
      <div className="flex flex-wrap gap-1">{["PR", "SP", "PB", "MA"].map(s => <Button key={s} variant={uf === s ? "secondary" : "ghost"} size="sm" onClick={() => onChange(s)} aria-label={`Ver ${ESTADOS[s]}`}>{s}</Button>)}</div>
    </div>
  </div>;
}
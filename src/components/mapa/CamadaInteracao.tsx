import { projetar } from "@/components/mapa/MapaBrasil";

export type FluxoUf = {
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
  chave: string; origem: string; destino: string;
  o: [number, number]; d: [number, number];
  lacos: number; projetos: number; empresas: number; valor: number;
};

/** Soma os fluxos filtrados por par origem→destino. */
export function agregarArcos(linhas: FluxoUf[]): ArcoAgregado[] {
  const m = new Map<string, ArcoAgregado>();
  for (const r of linhas) {
    if (!r.origem_uf || !r.destino_uf || r.origem_lat == null || r.origem_lon == null || r.destino_lat == null || r.destino_lon == null) continue;
    const k = `${r.origem_uf}>${r.destino_uf}`;
    const a = m.get(k) ?? { chave: k, origem: r.origem_uf, destino: r.destino_uf, o: [r.origem_lon, r.origem_lat], d: [r.destino_lon, r.destino_lat], lacos: 0, projetos: 0, empresas: 0, valor: 0 };
    a.lacos += Number(r.lacos ?? 0); a.projetos += Number(r.projetos ?? 0); a.empresas += Number(r.destinos ?? 0); a.valor += Number(r.valor_rateado ?? 0);
    m.set(k, a);
  }
  return [...m.values()].sort((x, y) => x.lacos - y.lacos);
}

const COR = "#f59e0b";

export default function CamadaInteracaoSvg({
  arcos, unidades, tam, escala, bloqueado, onArco, onUnidade,
}: {
  arcos: ArcoAgregado[]; unidades: UnidadeEmbrapii[]; tam: number; escala: number;
  bloqueado: () => boolean; onArco: (a: ArcoAgregado) => void; onUnidade: (u: UnidadeEmbrapii) => void;
}) {
  const maxL = Math.max(1, ...arcos.map((a) => a.lacos));
  const maxP = Math.max(1, ...unidades.map((u) => Number(u.projetos ?? 0)));
  return (
    <g>
      {arcos.map((a) => {
        const [x1, y1] = projetar(a.o[0], a.o[1]);
        const [x2, y2] = projetar(a.d[0], a.d[1]);
        const w = (0.6 + 7 * Math.sqrt(a.lacos / maxL)) * escala;
        const clique = (e: React.MouseEvent) => { e.stopPropagation(); if (!bloqueado()) onArco(a); };
        const titulo = `${a.origem} → ${a.destino} · ${a.lacos.toLocaleString("pt-BR")} laços`;
        if (a.origem === a.destino) {
          const r = (2 + 14 * Math.sqrt(a.lacos / maxL)) * escala;
          return (
            <circle key={a.chave} cx={x1} cy={y1} r={r} fill={COR} fillOpacity={0.18} stroke={COR} strokeWidth={0.8 * escala} className="cursor-pointer" onClick={clique}>
              <title>{titulo}</title>
            </circle>
          );
        }
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const dx = x2 - x1, dy = y2 - y1;
        const cx = mx - dy * 0.2, cy = my + dx * 0.2;
        return (
          <path key={a.chave} d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`} fill="none" stroke={COR} strokeOpacity={0.45}
            strokeWidth={w} strokeLinecap="round" className="cursor-pointer hover:stroke-opacity-90" onClick={clique}>
            <title>{titulo}</title>
          </path>
        );
      })}
      {unidades.map((u) => {
        if (u.lat == null || u.lon == null) return null;
        const [x, y] = projetar(u.lon, u.lat);
        const r = tam * (0.25 + 0.75 * Math.sqrt(Number(u.projetos ?? 0) / maxP));
        const vazado = !!u.coordenada_aproximada;
        return (
          <circle key={u.co_unidade ?? `${u.sigla}-${u.uf}`} cx={x} cy={y} r={r}
            fill={vazado ? "none" : COR} fillOpacity={0.85} stroke={vazado ? COR : "hsl(var(--background))"}
            strokeWidth={(vazado ? 1.6 : 0.6) * escala} className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); if (!bloqueado()) onUnidade(u); }}>
            <title>{u.unidade_embrapii ?? u.sigla ?? "Unidade EMBRAPII"}</title>
          </circle>
        );
      })}
    </g>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lerBackhaulPelaFuncao, carregarDatacenters, carregarUsinas } from "@/lib/bi/datasets";
import { buscarModelosHF, buscarContratosIA } from "@/utils/cruzarLayers";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { Drawer, Spinner, TOOLTIP_STYLE } from "./Drawer";

/**
 * Sem pontuação inventada: só recebe nota (0–100) a camada que tem um indicador
 * calculável a partir dos dados reais. As demais mostram contagens reais e "sem índice".
 */
interface LayerScore { layer: string; nome: string; score: number | null; formula: string; cor: string; evidencias: string[] }

async function contar<T>(p: Promise<T[]>): Promise<number | string> {
  const limite = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("sem resposta em 15 s")), 15000));
  try { return (await Promise.race([p, limite])).length; } catch (e) { return `falha: ${(e as Error).message}`; }
}
const fmt = (v: number | string) => typeof v === "number" ? v.toLocaleString("pt-BR") : v;

export default function Cenario4Maturidade() {
  const [scores, setScores] = useState<LayerScore[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<LayerScore | null>(null);

  useEffect(() => {
    (async () => {
      const [tot, coord, bh, pols, usinas, dcs, modelos, contratos] = await Promise.all([
        supabase.from("research_locations").select("*", { count: "exact", head: true }),
        supabase.from("research_locations").select("*", { count: "exact", head: true }).not("latitude", "is", null),
        lerBackhaulPelaFuncao().catch(() => null),
        fetch("/politicas-layers.json").then(r => r.json()).catch(() => null),
        contar(carregarUsinas()),
        contar(carregarDatacenters()),
        contar(Promise.resolve(buscarModelosHF() as any).then((r: any) => Array.isArray(r) ? r : r?.data ?? [])),
        contar(Promise.resolve(buscarContratosIA() as any).then((r: any) => Array.isArray(r) ? r : r?.data ?? [])),
      ]);
      const totalAtores = tot.count ?? 0, comCoord = coord.count ?? 0;
      const bhCom = bh ? bh.filter(r => r.tem_backhaul === "sim").length : 0;
      const pctBH = bh && bh.length ? Math.round(100 * bhCom / bh.length) : null;
      const layersPol: any[] = pols?.layers ?? [];
      const nPols = layersPol.reduce((s, l) => s + l.politicas.length, 0);
      const ativas = layersPol.reduce((s, l) => s + l.politicas.filter((p: any) => String(p.status).startsWith("Ativa")).length, 0);
      const invest = layersPol.reduce((s, l) => s + l.politicas.reduce((ss: number, p: any) => ss + (p.investimento_publico_brl || 0), 0), 0) / 1e9;
      const pctCoord = totalAtores ? Math.round(100 * comCoord / totalAtores) : null;

      setScores([
        { layer: "L1", nome: "Energia", cor: "#f472b6", score: null, formula: "Sem índice: falta referência de demanda energética de IA para comparar.",
          evidencias: [`${fmt(usinas)} usinas no SIGA/ANEEL (via Mapa)`] },
        { layer: "L2", nome: "Infra Física", cor: "#fb923c", score: pctBH, formula: "% de municípios com backhaul de fibra (ANATEL).",
          evidencias: pctBH === null ? ["Conectividade indisponível no momento"] : [`${bhCom.toLocaleString("pt-BR")} de ${bh!.length.toLocaleString("pt-BR")} municípios com backhaul (${pctBH}%)`] },
        { layer: "L3", nome: "Infra Lógica", cor: "#facc15", score: null, formula: "Sem índice: falta referência internacional de capacidade instalada.",
          evidencias: [`${fmt(dcs)} datacenters no PeeringDB`] },
        { layer: "L4", nome: "Modelos de IA", cor: "#34d399", score: null, formula: "Sem índice: contagem ao vivo sem linha de base.",
          evidencias: [`${fmt(modelos)} modelos retornados pelo Hugging Face (consulta ao vivo)`] },
        { layer: "L5", nome: "Aplicações", cor: "#2dd4bf", score: null, formula: "Sem índice: contagem ao vivo sem linha de base.",
          evidencias: [`${fmt(contratos)} contratos com objeto IA no PNCP (consulta ao vivo)`] },
        { layer: "L6", nome: "Pesquisa", cor: "#60a5fa", score: pctCoord, formula: "% dos atores do SNI com coordenada real (completude da base).",
          evidencias: [`${totalAtores.toLocaleString("pt-BR")} atores do SNI`, `${comCoord.toLocaleString("pt-BR")} com coordenada real`] },
        { layer: "L7", nome: "Governança", cor: "#a78bfa", score: nPols ? Math.round(100 * ativas / nPols) : null, formula: "% das políticas curadas que estão ativas.",
          evidencias: [`${nPols} políticas curadas, ${ativas} ativas`, `R$ ${invest.toFixed(0)} bi em investimento declarado`] },
      ]);
      setCarregando(false);
    })();
  }, []);

  const comNota = scores.filter(s => s.score !== null);
  const radarData = scores.map(s => ({ layer: s.layer, score: s.score ?? 0 }));
  const geral = comNota.length ? Math.round(comNota.reduce((s, l) => s + (l.score as number), 0) / comNota.length) : null;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-foreground leading-relaxed">
          <strong>Este é o diagnóstico de síntese.</strong> Cada camada só recebe nota quando existe um indicador calculável a partir dos dados reais do Motor; as demais mostram as contagens reais e ficam fora da média. Clique numa camada para ver a fórmula e as evidências.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Índice de Maturidade SNI-IA · Brasil</p>
        <p className="text-6xl font-black" style={{ color: geral === null ? undefined : geral >= 60 ? "#34d399" : geral >= 40 ? "#fb923c" : "#f472b6" }}>
          {carregando || geral === null ? "—" : geral}
        </p>
        <p className="text-sm text-muted-foreground mt-1">de 100 · média das {comNota.length} camadas com indicador calculado</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Radar de maturidade por camada</h2>
          {carregando ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="layer" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}/100`, "Maturidade"]} />
              </RadarChart>
            </ResponsiveContainer>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">Camadas sem índice aparecem no zero do radar.</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pontuação por camada · clique para ver as evidências</p>
          {carregando ? <Spinner /> : scores.map(s => (
            <button key={s.layer} onClick={() => setAberta(s)}
              className="w-full flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/50 transition-colors text-left">
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
                style={{ background: s.cor + "20", color: s.cor, borderColor: s.cor + "40" }}>{s.layer}</span>
              <span className="text-xs font-medium text-foreground flex-1">{s.nome}</span>
              {s.score === null ? <span className="text-[10px] text-muted-foreground">sem índice</span> : (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.score}%`, backgroundColor: s.cor }} />
                  </div>
                  <span className="text-xs font-bold w-8 text-right" style={{ color: s.cor }}>{s.score}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {aberta && (
        <Drawer onClose={() => setAberta(null)} header={<>
          <div className="flex items-center gap-2">
            <span className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
              style={{ background: aberta.cor + "20", color: aberta.cor, borderColor: aberta.cor + "40" }}>{aberta.layer}</span>
            <h3 className="text-base font-bold text-foreground">{aberta.nome}</h3>
          </div>
          <p className="text-sm font-bold mt-1" style={{ color: aberta.cor }}>{aberta.score === null ? "sem índice" : `${aberta.score}/100`}</p>
        </>}>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Como é calculado</p>
          <p className="text-xs text-foreground rounded-lg bg-muted/30 p-3">{aberta.formula}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-2">Evidências (dados reais)</p>
          {aberta.evidencias.map((e, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full mt-1.5" style={{ backgroundColor: aberta.cor }} />
              <p className="text-xs text-foreground leading-relaxed">{e}</p>
            </div>
          ))}
        </Drawer>
      )}
    </div>
  );
}

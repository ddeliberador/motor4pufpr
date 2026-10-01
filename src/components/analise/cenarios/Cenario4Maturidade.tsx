import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

interface Eixo { numero: number; nome: string; cor: string; layers: string[]; entregues: number; total_acoes: number }
interface LayerScore {
  layer: string; nome: string; cor: string;
  scoreBase: number | null; scorePBIA: number | null;
  evidencias: string[]; acoesPBIA: number; acoesPBIAEntregues: number;
  metodoScore: string;
}

export default function Cenario4Maturidade() {
  const [scores, setScores] = useState<LayerScore[]>([]);
  const [eixosPBIA, setEixosPBIA] = useState<Eixo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [layerAberta, setLayerAberta] = useState<LayerScore | null>(null);

  useEffect(() => {
    async function calcular() {
      const [{ count: totalAtores }, { count: atoresCoord }, { data: bh }, pbiaResp] = await Promise.all([
        supabase.from("research_locations").select("*", { count: "exact", head: true }),
        supabase.from("research_locations").select("*", { count: "exact", head: true }).not("latitude", "is", null),
        supabase.from("infra_backhaul_municipio").select("tem_backhaul"),
        fetch("/pbia-acoes.json").then(r => r.json()),
      ]);

      const bhCom = (bh || []).filter((r: any) => r.tem_backhaul).length;
      const bhTotal = (bh || []).length;
      const pctBH = bhTotal > 0 ? Math.round(100 * bhCom / bhTotal) : 0;
      const pbia = pbiaResp;
      setEixosPBIA(pbia.eixos);

      // Calcular ações PBIA por layer
      const acoesLayer: Record<string, { total: number; entregues: number }> = {};
      pbia.eixos.forEach((e: any) => {
        e.acoes.forEach((a: any) => {
          if (!acoesLayer[a.layer]) acoesLayer[a.layer] = { total: 0, entregues: 0 };
          acoesLayer[a.layer].total++;
          if (a.status === "entregue") acoesLayer[a.layer].entregues++;
        });
      });

      // Score PBIA = % ações entregues para aquela layer × 100
      const scorePBIA = (l: string) => acoesLayer[l]?.total > 0
        ? Math.round(100 * acoesLayer[l].entregues / acoesLayer[l].total)
        : null;

      const layersScore: LayerScore[] = [
        {
          layer: "L1", nome: "Energia", cor: "#f472b6",
          scoreBase: null, // não há índice calculável com dados atuais do Motor
          scorePBIA: scorePBIA("L1"),
          acoesPBIA: acoesLayer["L1"]?.total || 0,
          acoesPBIAEntregues: acoesLayer["L1"]?.entregues || 0,
          metodoScore: "Sem índice calculável no Motor — dados ANEEL não quantificados como score",
          evidencias: [
            "Fonte: ANEEL SIGEL — usinas mapeadas por tipo e potência (MW)",
            "Matriz elétrica brasileira: ~85% renovável (ANEEL 2024)",
            "Itaipu: 14 GW · Tucuruí: 8,3 GW · Belo Monte: 11,2 GW",
            "Eixo 1 PBIA (Pró-Infra IA Sustentável): ação de uso de energia renovável para TI — iniciada",
          ],
        },
        {
          layer: "L2", nome: "Infra Física", cor: "#fb923c",
          scoreBase: pctBH, // % municípios com backhaul — dado real do Motor
          scorePBIA: scorePBIA("L2"),
          acoesPBIA: acoesLayer["L2"]?.total || 0,
          acoesPBIAEntregues: acoesLayer["L2"]?.entregues || 0,
          metodoScore: `Score calculado: % municípios com backhaul de fibra óptica (ANATEL) = ${pctBH}%`,
          evidencias: [
            `${pctBH}% dos ${bhTotal.toLocaleString("pt-BR")} municípios brasileiros com backhaul confirmado`,
            `${bhCom.toLocaleString("pt-BR")} municípios com fibra · ${(bhTotal - bhCom).toLocaleString("pt-BR")} sem fibra`,
            "Fonte: ANATEL — base infra_backhaul_municipio do Motor da Inovação",
            "Eixo 1 PBIA: Redes de alta velocidade e infovias subfluviais — 6 de 13 ações entregues",
          ],
        },
        {
          layer: "L3", nome: "Infra Lógica", cor: "#facc15",
          scoreBase: null,
          scorePBIA: scorePBIA("L3"),
          acoesPBIA: acoesLayer["L3"]?.total || 0,
          acoesPBIAEntregues: acoesLayer["L3"]?.entregues || 0,
          metodoScore: "Sem índice calculável — datacenters PeeringDB não quantificados como score de maturidade",
          evidencias: [
            "Fonte: PeeringDB — datacenters mapeados na Layer 3 do Motor",
            "CENAPAD expandido · Santos Dumont com capacidade aumentada (PBIA E1)",
            "Supercomputador de IA: entregue (PBIA Ação 01)",
            "Eixo 1 PBIA: 6 de 13 ações entregues — maior taxa de entrega por ações",
          ],
        },
        {
          layer: "L4", nome: "Modelos de IA", cor: "#34d399",
          scoreBase: null,
          scorePBIA: scorePBIA("L4"),
          acoesPBIA: acoesLayer["L4"]?.total || 0,
          acoesPBIAEntregues: acoesLayer["L4"]?.entregues || 0,
          metodoScore: "Sem índice calculável — fonte Hugging Face não quantificada como score",
          evidencias: [
            "Fonte planejada: Hugging Face API — modelos com autor brasileiro",
            "CNIA4I (Centro Nacional de IA para a Indústria) — em execução (PBIA E4)",
            "Parcerias internacionais para chips aceleradores — entregues (PBIA E1)",
            "Eixo 4 PBIA: 4 de 9 ações entregues — R$ 6,77 bi utilizados",
          ],
        },
        {
          layer: "L5", nome: "Aplicações", cor: "#2dd4bf",
          scoreBase: null,
          scorePBIA: scorePBIA("L5"),
          acoesPBIA: acoesLayer["L5"]?.total || 0,
          acoesPBIAEntregues: acoesLayer["L5"]?.entregues || 0,
          metodoScore: "Sem índice calculável — contratos PNCP com objeto IA ainda não quantificados",
          evidencias: [
            "Fonte planejada: PNCP — contratos públicos com objeto 'inteligência artificial'",
            "Eixo 3 PBIA: 8 de 19 ações entregues (42%) — maior número absoluto de ações",
            "Soluções IA para o Governo, cibersegurança, SIPEC, Patrimônio da União — entregues",
            "22 soluções de IA para serviços públicos previstas até dez/2026",
          ],
        },
        {
          layer: "L6", nome: "Pesquisa", cor: "#60a5fa",
          scoreBase: atoresCoord && totalAtores ? Math.round(100 * atoresCoord / totalAtores) : null,
          scorePBIA: scorePBIA("L6"),
          acoesPBIA: acoesLayer["L6"]?.total || 0,
          acoesPBIAEntregues: acoesLayer["L6"]?.entregues || 0,
          metodoScore: `Score calculado: % atores SNI com coordenada real = ${atoresCoord && totalAtores ? Math.round(100 * atoresCoord / totalAtores) : "?"}% (proxy de cobertura)`,
          evidencias: [
            `${(atoresCoord || 0).toLocaleString("pt-BR")} de ${(totalAtores || 0).toLocaleString("pt-BR")} atores SNI geocodificados`,
            "Fonte: research_locations — OpenAlex, ABStartups, EMBRAPII, OTD/CGEE, FORMICT, SINAPAD",
            "Eixo 2 PBIA (Formação): 5 de 8 ações entregues (63%) — maior taxa proporcional do PBIA",
            "Bolsas PG em IA, LIFE, IA na Graduação, Letramento Digital — todos entregues",
          ],
        },
        {
          layer: "L7", nome: "Governança", cor: "#a78bfa",
          scoreBase: null,
          scorePBIA: scorePBIA("L7"),
          acoesPBIA: acoesLayer["L7"]?.total || 0,
          acoesPBIAEntregues: acoesLayer["L7"]?.entregues || 0,
          metodoScore: "Sem índice calculável — políticas curadas no Motor não geram score numérico",
          evidencias: [
            "Fonte: public/politicas-layers.json — curadoria Motor da Inovação",
            "Guias Brasileiros de IA Responsável — entregues (PBIA E5)",
            "Centro Nacional de Transparência Algorítmica — entregue (PBIA E5)",
            "OBIA (Observatório Brasileiro de IA) — iniciado · PL 2338/2023 em tramitação",
          ],
        },
      ];

      setScores(layersScore);
      setCarregando(false);
    }
    calcular();
  }, []);

  // Só usa o score do PBIA no radar (único dado comparável entre todas as layers)
  const radarData = scores.map(s => ({
    layer: s.layer,
    pbia: s.scorePBIA ?? 0,
    base: s.scoreBase ?? null,
    fullMark: 100,
  }));

  return (
    <div className="space-y-6">
      {/* Fio narrativo */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-foreground leading-relaxed">
          <strong>Este é o diagnóstico de maturidade do SNI de IA brasileiro.</strong> Para cada layer, o Motor calcula um score onde os dados permitem — e confronta com a execução do PBIA para aquela camada. Onde não há dados suficientes para um índice, isso é dito explicitamente. <strong className="text-foreground">Clique em qualquer layer</strong> para ver as evidências, a fonte dos dados e as ações do PBIA associadas.
        </p>
      </div>

      {/* Radar PBIA por layer */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">Execução do PBIA por camada de IA</h2>
          <p className="text-xs text-muted-foreground mb-4">% de ações entregues em cada layer · classificação: curadoria Motor/UFPR-PPGPP</p>
          {carregando ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="layer" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Radar name="% ações PBIA entregues" dataKey="pbia" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, "Ações PBIA entregues"]}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
          <p className="text-[10px] text-muted-foreground text-center mt-1 italic">
            ⓘ Classificação layer × eixo PBIA é curadoria do Motor da Inovação / UFPR-PPGPP
          </p>
        </div>

        {/* Cards por layer */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Score por layer · clique para ver evidências</p>
          {scores.map(s => (
            <button key={s.layer} onClick={() => setLayerAberta(s)}
              className="w-full flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/50 transition-colors text-left">
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
                style={{ background: s.cor+"20", color: s.cor, borderColor: s.cor+"40" }}>{s.layer}</span>
              <span className="text-xs font-medium text-foreground flex-1">{s.nome}</span>
              <div className="flex items-center gap-2 shrink-0">
                {s.scoreBase !== null ? (
                  <>
                    <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.scoreBase}%`, backgroundColor: s.cor }} />
                    </div>
                    <span className="text-[10px] font-bold w-8" style={{ color: s.cor }}>{s.scoreBase}%</span>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">sem índice</span>
                )}
                {s.acoesPBIA > 0 && (
                  <span className="text-[10px] rounded px-1 py-0.5 bg-violet-500/10 text-violet-400 whitespace-nowrap">
                    {s.acoesPBIAEntregues}/{s.acoesPBIA} PBIA
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Confronto PBIA × Layer */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">PBIA por eixo × camadas de IA associadas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {eixosPBIA.map(e => (
            <div key={e.numero} className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: e.cor }}>E{e.numero}</span>
                <span className="text-[11px] font-semibold text-foreground leading-tight flex-1 truncate">{e.nome}</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {e.layers.map(l => (
                  <span key={l} className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
                    style={{ background: e.cor+"20", color: e.cor, borderColor: e.cor+"40" }}>{l}</span>
                ))}
              </div>
              <div className="flex h-1.5 w-full rounded-full overflow-hidden">
                <div className="bg-green-400" style={{ width: `${(e.entregues/e.total_acoes)*100}%` }} />
                <div className="bg-muted flex-1" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                <span className="text-green-400 font-medium">{e.entregues}</span>/{e.total_acoes} ações entregues · {Math.round(100*e.entregues/e.total_acoes)}%
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground italic">
          ⓘ Associação eixo PBIA → layer de IA é curadoria do Motor da Inovação / UFPR-PPGPP. Não consta no painel oficial CGEE/MCTI.
        </p>
      </div>

      {/* Conclusão */}
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-xl text-violet-400 shrink-0 mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }}>insights</span>
          <div>
            <p className="text-sm font-semibold text-violet-400">O argumento da tese em dados</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              O único score calculável com dados reais do Motor é o de L2 (% backhaul) e L6 (% atores geocodificados). As demais layers ainda não têm bases suficientemente estruturadas para um índice auditável — e isso é, em si, um resultado da pesquisa: o Motor da Inovação revela onde os dados existem e onde os gaps de dados são o próprio gap de política. O PBIA reconhece implicitamente isso ao concentrar entregas no Eixo 2 (formação) e no Eixo 3 (governo), enquanto o Eixo 4 (mercado), que dependeria de dados de startups e contratos, ainda está na metade da execução.
            </p>
          </div>
        </div>
      </div>

      {/* Drawer de layer */}
      {layerAberta && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setLayerAberta(null)}>
          <div className="flex-1 bg-black/40" />
          <div className="w-full max-w-sm bg-card border-l border-border flex flex-col h-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
                    style={{ background: layerAberta.cor+"20", color: layerAberta.cor, borderColor: layerAberta.cor+"40" }}>
                    {layerAberta.layer}
                  </span>
                  <h3 className="text-base font-bold text-foreground">{layerAberta.nome}</h3>
                </div>
                {layerAberta.scoreBase !== null ? (
                  <div className="flex items-center gap-2">
                    <div className="w-28 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${layerAberta.scoreBase}%`, backgroundColor: layerAberta.cor }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: layerAberta.cor }}>{layerAberta.scoreBase}%</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">Sem índice calculável com dados atuais do Motor</p>
                )}
              </div>
              <button onClick={() => setLayerAberta(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                <span className="material-symbols-outlined text-lg leading-none">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Método do score</p>
                <p className="text-xs text-foreground">{layerAberta.metodoScore}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Evidências e fontes</p>
                <div className="space-y-1.5">
                  {layerAberta.evidencias.map((ev, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-2.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full mt-1.5" style={{ backgroundColor: layerAberta.cor }} />
                      <p className="text-xs text-foreground leading-relaxed">{ev}</p>
                    </div>
                  ))}
                </div>
              </div>
              {layerAberta.acoesPBIA > 0 && (
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Ações PBIA para esta layer</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total de ações</span>
                    <span className="font-bold text-foreground">{layerAberta.acoesPBIA}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Entregues</span>
                    <span className="font-bold text-green-400">{layerAberta.acoesPBIAEntregues}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Taxa de entrega</span>
                    <span className="font-bold text-violet-400">
                      {layerAberta.scorePBIA !== null ? `${layerAberta.scorePBIA}%` : "—"}
                    </span>
                  </div>
                  {layerAberta.scorePBIA !== null && (
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-violet-400" style={{ width: `${layerAberta.scorePBIA}%` }} />
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground italic">Classificação por layer é curadoria Motor/UFPR-PPGPP</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

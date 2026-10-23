import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import MapaBrasil, { type Ponto, type VisaoRegionalMapa, type FundoId, FUNDOS, CORES_COROPLETICO, classeDoValor } from "@/components/mapa/MapaBrasil";
import { cortesQuantis } from "@/lib/seriesMunicipais";
import { CATEGORIAS } from "@/components/mapa/tipos";
import { REGIAO_POR_UF, REGIOES } from "@/lib/regioes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { PainelEstado, PainelMunicipio } from "@/components/mapa/PaineisLocais";
import type { MunicipioClicado } from "@/components/mapa/MapaBrasil";
import { FichaRegional } from "@/components/mapa/VisaoRegional";
import { INDICADORES_REGIONAIS } from "@/lib/seriesRegionais";

// Cache pré-semeado para os painéis de estado/município renderizarem sem Supabase.
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
qc.setQueryData(["painel-uf-perfil", "PR"], { uf: "PR", perfil: "Exportador de competência", unidades_ativas: 7, lacos_empresas_locais: 310, lacos_unidades_locais: 540, pct_empresas_buscam_fora: 41.2, uf_principal_origem_externa: "SP", unidade_principal: "Instituto Senai", pct_unidade_principal: 38 });
qc.setQueryData(["painel-uf-atores", "PR"], [{ uf: "PR", categoria: "ict", atores: 120 }, { uf: "PR", categoria: "empresa", atores: 900 }]);
qc.setQueryData(["painel-uf-interacoes", "PR"], [
  { fonte: "embrapii", tipo: "cooperacao_pdi", ano: 2020, origem_uf: "PR", destino_uf: "SP", lacos: 40 }, { fonte: "embrapii", tipo: "cooperacao_pdi", ano: 2021, origem_uf: "PR", destino_uf: "PR", lacos: 120 },
  { fonte: "embrapii", tipo: "financiamento_publico", ano: 2022, origem_uf: null, destino_uf: "PR", lacos: 300 }, { fonte: "desafios", tipo: "desafio_solucao", ano: 2023, origem_uf: "DF", destino_uf: "PR", lacos: 3 },
]);
qc.setQueryData(["painel-uf-series", "PR"], { "uf.doutores_titulados": Array.from({ length: 12 }, (_, i) => ({ ano: 2012 + i, valor: 600 + i * 45 })), "energia.capacidade_acumulada_mw": Array.from({ length: 30 }, (_, i) => ({ ano: 1995 + i, valor: 9000 + i * 300 })) });
qc.setQueryData(["painel-mun-series", "4106902"], [
  ...Array.from({ length: 8 }, (_, i) => ({ indicador_id: "mun.bl_acessos", segmento: "", periodo_referencia: `${2017 + i}-12-01`, granularidade: "mes", valor: 400000 + i * 30000 })),
  ...Array.from({ length: 8 }, (_, i) => ({ indicador_id: "mun.bl_acessos", segmento: "fibra", periodo_referencia: `${2017 + i}-12-01`, granularidade: "mes", valor: 100000 + i * 50000 })),
  { indicador_id: "mun.ppg", segmento: "", periodo_referencia: "2023-01-01", granularidade: "ano", valor: 112 },
  { indicador_id: "mun.populacao", segmento: "", periodo_referencia: "2024-01-01", granularidade: "ano", valor: 1829225 },
]);

// Dados sintéticos só para exercitar o mapa (capitais + ruído), sem Supabase.
const CAPITAIS: Record<string, [number, number]> = {
  AC: [-67.81, -9.97], AL: [-35.73, -9.67], AP: [-51.07, 0.03], AM: [-60.02, -3.12], BA: [-38.51, -12.97], CE: [-38.54, -3.72],
  DF: [-47.93, -15.78], ES: [-40.31, -20.32], GO: [-49.25, -16.68], MA: [-44.30, -2.53], MT: [-56.10, -15.60], MS: [-54.65, -20.44],
  MG: [-43.94, -19.92], PA: [-48.50, -1.46], PB: [-34.86, -7.12], PR: [-49.27, -25.43], PE: [-34.88, -8.05], PI: [-42.80, -5.09],
  RJ: [-43.17, -22.91], RN: [-35.21, -5.79], RS: [-51.23, -30.03], RO: [-63.90, -8.76], RR: [-60.67, 2.82], SC: [-48.55, -27.60],
  SP: [-46.63, -23.55], SE: [-37.07, -10.91], TO: [-48.33, -10.18],
};
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cats = CATEGORIAS.filter((c) => !["energia", "datacenter", "cabo", "backhaul"].includes(c.key));
const pontos: Ponto[] = [];
Object.entries(CAPITAIS).forEach(([uf, [lon, lat]]) => {
  const n = uf === "SP" ? 400 : uf === "PR" ? 120 : 25;
  for (let i = 0; i < n; i++) {
    const c = cats[Math.floor(rnd() * cats.length)];
    pontos.push({ id: `${uf}-${i}`, nome: `${c.label} ${i} (${uf})`, categoria: c.key, latitude: lat + (rnd() - 0.5) * 1.2, longitude: lon + (rnd() - 0.5) * 1.2 });
  }
});
const usinas = Object.entries(CAPITAIS).flatMap(([uf, [lon, lat]]) => Array.from({ length: 300 }, (_, i) => ({
  id: `u${uf}${i}`, nome: `Usina ${uf} ${i}`, tipo: ["UHE", "PCH", "EOL", "UFV", "UTE"][i % 5], potencia_kw: rnd() * 800000, latitude: lat + (rnd() - 0.5) * 4, longitude: lon + (rnd() - 0.5) * 4, uf,
})));
const COR_REG: Record<string, string> = { Norte: "hsl(var(--primary) / 0.15)", Nordeste: "hsl(var(--primary) / 0.3)", "Centro-Oeste": "hsl(var(--primary) / 0.45)", Sudeste: "hsl(var(--primary) / 0.6)", Sul: "hsl(var(--primary) / 0.7)" };

function Demo() {
  const [uf, setUf] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [l1, setL1] = useState(false);
  const [reg, setReg] = useState(false);
  const [inter, setInter] = useState(false);
  const [fundo, setFundo] = useState<FundoId>("sobrio");
  const [coro, setCoro] = useState(false);
  const [transp, setTransp] = useState(false);
  const coropletico = useMemo(() => {
    if (!coro) return null;
    // valores sintéticos: cresce com o código IBGE dentro da UF, com lacunas
    const valores: Record<string, number> = {};
    let x = 11;
    for (let i = 0; i < 6000; i++) { x = (x * 48271) % 2147483647; }
    const codigos: string[] = [];
    Object.keys(CAPITAIS).forEach(() => undefined);
    for (const uf of [11,12,13,14,15,16,17,21,22,23,24,25,26,27,28,29,31,32,33,35,41,42,43,50,51,52,53]) for (let k = 0; k < 900; k++) codigos.push(`${uf}${String(k).padStart(5, "0")}`);
    for (const c of codigos) { x = (x * 48271) % 2147483647; if (x % 7 !== 0) valores[c] = (x % 1000) * (Number(c.slice(0, 2)) > 40 ? 3 : 1); }
    const cortes = cortesQuantis(valores);
    return { valores, cortes, cores: CORES_COROPLETICO.slice(0, cortes.length + 1), rotulo: "Sintético · acessos", formatar: (v: number) => `${v.toFixed(0)} acessos` };
  }, [coro]);
  const contagem = useMemo(() => pontos.reduce((a, p) => { const u = p.id.split("-")[0]; a[u] = (a[u] ?? 0) + 1; return a; }, {} as Record<string, number>), []);
  const regional: VisaoRegionalMapa | null = reg ? {
    preenchimento: Object.fromEntries(Object.keys(CAPITAIS).map((u) => [u, COR_REG[REGIAO_POR_UF[u]]])),
    dica: Object.fromEntries(Object.keys(CAPITAIS).map((u) => [u, `${u} · ${REGIAO_POR_UF[u]}`])),
    destaque: new Set(["PR", "SC", "RS"]),
    rotulos: [["Norte", -60, -4], ["Nordeste", -41, -8], ["Centro-Oeste", -54, -15], ["Sudeste", -45, -20.5], ["Sul", -51.5, -27.5]].map(([t, lon, lat]) => ({ titulo: String(t), valor: "R$ 1,2 bi", lon: Number(lon), lat: Number(lat), ativo: t === "Sul" })),
    onSelecionarUf: (u) => setUf((x) => (x === u ? null : u)),
  } : null;
  const arcos = ["SP", "MG", "RJ", "RS", "PE", "AM"].map((d, i) => ({ chave: `embrapii:cooperacao_pdi|PR>${d}`, tipoId: "embrapii:cooperacao_pdi", cor: i % 2 ? "#f59e0b" : "#3b82f6", origem: "PR", destino: d, o: CAPITAIS.PR as [number, number], d: CAPITAIS[d] as [number, number], interno: false, lacos: 5 + Math.floor(rnd() * 80), projetos: 3, destinos: 2, valor: 1e6 }));
  const [painel, setPainel] = useState<{ tipo: "uf"; uf: string } | ({ tipo: "municipio" } & MunicipioClicado) | null>(null);
  const atoresPainel = pontos.map((p) => ({ id: p.id, nome: p.nome, categoria: p.categoria, municipio: "Curitiba", uf: p.id.split("-")[0], latitude: p.latitude, longitude: p.longitude }));
  const unidades = ["PR", "SP", "BA"].map((u, i) => ({ co_unidade: i, unidade_embrapii: `Unidade ${u}`, sigla: u, tipo_instituicao: "ICT", uf: u, cidade: "Capital", status_credenciamento: "Ativa", lat: CAPITAIS[u][1], lon: CAPITAIS[u][0], coordenada_aproximada: i === 2, projetos: 10 * (i + 1), valor_total_ipca: 1e7, empresas: 5, ufs_alcancadas: 4 }));
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div className="flex gap-3 border-b border-border p-2 text-xs">
        {[["Layer 1", l1, setL1], ["Regional", reg, setReg], ["Interação", inter, setInter], ["Coroplético", coro, setCoro], ["Transporte", transp, setTransp]].map(([r, v, s]) => (
          <label key={String(r)} className="flex items-center gap-1"><input type="checkbox" checked={v as boolean} onChange={(e) => (s as (b: boolean) => void)(e.target.checked)} />{String(r)}</label>
        ))}
        <button className="rounded border px-2" onClick={() => document.documentElement.classList.toggle("dark")}>tema</button>
        <select aria-label="Fundo do mapa" value={fundo} onChange={(e) => setFundo(e.target.value as FundoId)} className="rounded border bg-background px-1">{FUNDOS.map((f) => <option key={f.id} value={f.id}>{f.rotulo}</option>)}</select>
        <button className="rounded border px-2" onClick={() => setPainel({ tipo: "uf", uf: "PR" })}>painel PR</button>
        <button className="rounded border px-2" onClick={() => setPainel({ tipo: "municipio", ibge: "4106902", nome: "Curitiba", uf: "PR" })}>painel Curitiba</button>
        <span className="text-muted-foreground">UF: {uf ?? "—"} · ponto: {sel ?? "—"} · {pontos.length} pontos</span>
      </div>
      <div className="relative flex" style={{ height: "calc(100vh - 41px)" }}>
        <div className="relative flex-1">
        <MapaBrasil fundo={fundo} coropletico={coropletico} pontos={reg ? [] : pontos} regional={regional} transporte={transp ? { rodovias: true, ferrovias: true, portos: true, aeroportos: true } : null} ufSelecionada={uf} ufsSelecionadas={new Set(uf ? [uf] : [])} ufsFiltroAtivas={new Set()} contagemPorUf={contagem}
          onSelecionarUf={(u) => { setUf((x) => (x === u ? null : u)); setPainel({ tipo: "uf", uf: u }); }} onSelecionarMunicipio={(m) => setPainel({ tipo: "municipio", ...m })} onSelecionarCluster={(ps, t) => console.log("cluster", t, ps.length)}
          pontoSelecionadoId={sel} onSelecionarPonto={setSel}
          layer1Ativa={l1} dadosUsinas={usinas}
          interacao={inter ? { arcos, unidades, onArco: (a) => console.log("arco", a.chave), onUnidade: (u) => console.log("unidade", u.sigla) } : null} />
        {painel?.tipo === "uf" && <PainelEstado uf={painel.uf} anoFoco={2022} atores={atoresPainel.filter((a) => a.uf === painel.uf)} usinas={usinas.filter((u) => u.uf === painel.uf)} datacenters={[]} backhaul={[{ municipio: "Curitiba", uf: "PR", latitude: 0, longitude: 0, temBackhaul: true }, { municipio: "Pinhais", uf: "PR", latitude: 0, longitude: 0, temBackhaul: false }]} sintese={{ "4106902": 81, "4119152": 55, "4104808": 40 }} onFechar={() => setPainel(null)} onEnquadrar={() => undefined} onAbrirMunicipio={(m) => setPainel({ tipo: "municipio", ...m })} onSelecionarPonto={setSel} />}
        </div>
        {reg && <FichaRegional indicador={INDICADORES_REGIONAIS[4]} onIndicador={() => undefined} dados={undefined} carregando={false} erro={null} ano={null} regiaoFoco={null} onRegiaoFoco={() => undefined} onFechar={() => setReg(false)} />}
        {painel?.tipo === "municipio" && <PainelMunicipio municipio={painel} anoFoco={2022} atores={atoresPainel.filter((a) => a.uf === painel.uf).slice(0, 14)} usinas={usinas.filter((u) => u.uf === painel.uf).slice(0, 6)} datacenters={[{ id: 1, nome: "Equinix CU1", org: "Equinix", uf: "PR", cidade: "Curitiba" }]} backhaul={{ municipio: "Curitiba", uf: "PR", latitude: 0, longitude: 0, temBackhaul: true }} antenas={312} sintese={81} onFechar={() => setPainel(null)} onEnquadrar={() => undefined} onAbrirEstado={(u) => setPainel({ tipo: "uf", uf: u })} onSelecionarPonto={setSel} />}
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={qc}><MemoryRouter><Demo /></MemoryRouter></QueryClientProvider>);

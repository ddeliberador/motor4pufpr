import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Drawer, Erro, TOOLTIP_STYLE } from "./Drawer";

interface Politica {
  id: string; nome: string; orgao: string; ano: string; status: string;
  investimento: string; investimento_publico_brl?: number;
  instrumento: string; conexao_mapa: string; link: string;
}
interface LayerPol { layer: string; nome: string; politicas: Politica[] }
type PolComLayer = Politica & { layer: string; cor: string };

const COR_LAYER: Record<string, string> = { L1: "#f472b6", L2: "#fb923c", L3: "#facc15", L7: "#a78bfa", SNI: "#34d399" };

export default function Cenario3Governanca() {
  const [dados, setDados] = useState<LayerPol[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<PolComLayer | null>(null);
  const [layerSel, setLayerSel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/politicas-layers.json")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setDados(d.layers)).catch(e => setErro(e.message));
  }, []);

  const todas: PolComLayer[] = dados.flatMap(l => l.politicas.map(p => ({ ...p, layer: l.layer, cor: COR_LAYER[l.layer] || "#94a3b8" })));
  const porLayer = dados.map(l => ({
    layer: l.layer, nome: l.nome,
    total: l.politicas.reduce((s, p) => s + (p.investimento_publico_brl || 0), 0) / 1e9,
    npol: l.politicas.length, cor: COR_LAYER[l.layer] || "#94a3b8",
  })).filter(l => l.total > 0).sort((a, b) => b.total - a.total);
  const filtradas = (layerSel ? todas.filter(p => p.layer === layerSel) : todas)
    .slice().sort((a, b) => (b.investimento_publico_brl || 0) - (a.investimento_publico_brl || 0));
  const totalGeral = todas.reduce((s, p) => s + (p.investimento_publico_brl || 0), 0);
  const semValor = todas.filter(p => !p.investimento_publico_brl).length;
  const lider = porLayer[0];

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-foreground leading-relaxed">
          <strong>R$ {(totalGeral / 1e9).toFixed(0)} bilhões em {todas.length} políticas públicas curadas.</strong>{" "}
          {lider && <>A maior fatia está na camada {lider.layer} ({lider.nome}), com R$ {lider.total.toFixed(1)} bi. </>}
          {semValor > 0 && <>{semValor} políticas não têm valor numérico declarado e ficam fora da soma. </>}
          Clique numa barra ou numa política para ver os detalhes.
        </p>
      </div>

      {erro && <Erro msg={erro} />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { v: `R$ ${(totalGeral / 1e9).toFixed(0)} bi`, l: "Investimento total mapeado", cor: "#a78bfa" },
          { v: String(todas.length), l: "Políticas curadas", cor: "#34d399" },
          { v: String(todas.filter(p => p.status.startsWith("Ativa")).length), l: "Políticas ativas", cor: "#60a5fa" },
          { v: String(todas.filter(p => p.status.includes("tramitação")).length), l: "Em tramitação", cor: "#facc15" },
        ].map(m => (
          <div key={m.l} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold" style={{ color: m.cor }}>{m.v}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.l}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Investimento público por camada (R$ bilhões)</h2>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3"><strong className="text-foreground">Clique numa barra</strong> para filtrar as políticas abaixo</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={porLayer} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="layer" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `R$${v}bi`} />
            <Tooltip contentStyle={TOOLTIP_STYLE}
              formatter={(v: number, _n, p: any) => [`R$ ${v.toFixed(1)} bi (${p.payload.npol} políticas)`, "Investimento"]}
              labelFormatter={l => `Camada ${l} — clique para filtrar`} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} cursor="pointer"
              onClick={(d: any) => { const l = d.layer ?? d.payload?.layer; setLayerSel(prev => prev === l ? null : l); }}>
              {porLayer.map((d, i) => <Cell key={i} fill={d.cor} opacity={layerSel && layerSel !== d.layer ? 0.3 : 1} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {layerSel && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtro ativo:</span>
            <span className="rounded-full border px-2 py-0.5 text-[11px] font-bold"
              style={{ borderColor: COR_LAYER[layerSel] + "60", color: COR_LAYER[layerSel], background: COR_LAYER[layerSel] + "15" }}>Camada {layerSel}</span>
            <button onClick={() => setLayerSel(null)} className="text-xs text-muted-foreground hover:text-foreground underline">limpar</button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          {layerSel ? `Políticas da Camada ${layerSel}` : "Todas as políticas"} · {filtradas.length} no total
        </h2>
        <div className="space-y-2">
          {filtradas.map(p => (
            <button key={p.id} onClick={() => setAberta(p)}
              className="w-full flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 text-left hover:bg-muted/50 transition-colors">
              <span className="mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
                style={{ background: p.cor + "20", color: p.cor, borderColor: p.cor + "40" }}>{p.layer}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground leading-tight truncate">{p.nome}</p>
                <p className="text-[10px] font-bold mt-0.5" style={{ color: p.cor }}>{p.investimento}</p>
              </div>
              <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${p.status.startsWith("Ativa") ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                {p.status.split("—")[0].trim()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {aberta && (
        <Drawer onClose={() => setAberta(null)} header={<>
          <span className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
            style={{ background: aberta.cor + "20", color: aberta.cor, borderColor: aberta.cor + "40" }}>Camada {aberta.layer}</span>
          <h3 className="text-sm font-bold text-foreground mt-1 leading-tight">{aberta.nome}</h3>
        </>}>
          <div className="rounded-lg bg-muted/30 p-3 space-y-2">
            {[["Investimento", aberta.investimento], ["Órgão", aberta.orgao], ["Instrumento", aberta.instrumento], ["Criada em", aberta.ano], ["Status", aberta.status]].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k}</p>
                <p className={k === "Investimento" ? "text-base font-bold text-foreground" : "text-xs text-foreground"}>{v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Conexão com o Mapa</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{aberta.conexao_mapa}</p>
          </div>
          <a href={aberta.link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined text-sm leading-none">open_in_new</span>Ver política completa
          </a>
        </Drawer>
      )}
    </div>
  );
}

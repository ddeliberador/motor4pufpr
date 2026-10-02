import { useEffect, useMemo, useState } from "react";
import { Drawer, Spinner, Erro } from "./Drawer";

type Badge = "confirmado" | "achado" | "pendente" | "nao_se_aplica";
interface Setor {
  id: string; layer: string; camada: string; setor: string; cnae: string;
  internacionais: string; nacionais: string; dependencia: string; status: string;
  badge: Badge; verificado: boolean;
}
interface Dados { versao: string; fonte: string; aviso: string; setores: Setor[] }

const LAYERS = [
  { id: "L1", nome: "Energia", cor: "#f472b6" },
  { id: "L2", nome: "Infra Física", cor: "#fb923c" },
  { id: "L3", nome: "Infra Lógica", cor: "#facc15" },
  { id: "L4", nome: "Modelos", cor: "#34d399" },
  { id: "L5", nome: "Aplicações", cor: "#60a5fa" },
  { id: "L6", nome: "Pesquisa", cor: "#818cf8" },
  { id: "L7", nome: "Governança", cor: "#a78bfa" },
];

const BADGE: Record<Badge, { label: string; cls: string }> = {
  confirmado: { label: "Confirmado · dado oficial", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  achado: { label: "Achado", cls: "bg-amber-400/20 text-amber-500 border-amber-400/50" },
  pendente: { label: "Não calculável / pendente", cls: "bg-yellow-400/10 text-yellow-600 border-yellow-400/30" },
  nao_se_aplica: { label: "Não se aplica", cls: "bg-sky-500/10 text-sky-500 border-sky-500/30" },
};

const PIPELINE = [
  { elo: "Design / IP", nacional: false, nota: "Arquiteturas e IP de aceleradores (NVIDIA, Arm, AMD)" },
  { elo: "Fabless", nacional: true, nota: "CEITEC projeta chips — RFID, identificação, potência" },
  { elo: "Foundry", nacional: true, nota: "CEITEC (Porto Alegre/RS) — única fab da América Latina" },
  { elo: "OSAT", nacional: false, nota: "Encapsulamento/teste avançado concentrado na Ásia" },
];

export default function Cenario5Dependencia() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [sel, setSel] = useState<Setor | null>(null);

  useEffect(() => {
    fetch("/dependencia-tecnologica.json").then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setDados).catch(e => setErro(String(e.message || e)));
  }, []);

  const porLayer = useMemo(() => {
    const m: Record<string, Setor[]> = {};
    dados?.setores.forEach(s => { (m[s.layer] ||= []).push(s); });
    return m;
  }, [dados]);

  if (erro) return <Erro msg={erro} />;
  if (!dados) return <Spinner />;

  const total = dados.setores.length;
  const verificados = dados.setores.filter(s => s.verificado).length;
  const oficiais = dados.setores.filter(s => s.badge === "confirmado").length;
  const layerCfg = LAYERS.find(l => l.id === aberta);

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-3xl font-bold text-foreground">{verificados} <span className="text-base font-normal text-muted-foreground">de {total}</span></p>
          <p className="text-xs text-muted-foreground mt-1">setores com fonte verificada</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-3xl font-bold text-emerald-500">{oficiais}</p>
          <p className="text-xs text-muted-foreground mt-1">com percentual de dado oficial (ANEEL / ANATEL)</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-3xl font-bold text-yellow-600">{total - oficiais}</p>
          <p className="text-xs text-muted-foreground mt-1">sem número — marcados como não calculáveis, não estimados</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{dados.aviso} Fonte: {dados.fonte}.</p>

      {/* Nível 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {LAYERS.map(l => {
          const n = porLayer[l.id]?.length || 0;
          const on = aberta === l.id;
          return (
            <button key={l.id} onClick={() => setAberta(on ? null : l.id)}
              className="rounded-xl border bg-card p-3 text-left transition-all hover:bg-muted"
              style={{ borderColor: on ? l.cor : undefined, boxShadow: on ? `0 0 0 1px ${l.cor}` : undefined }}>
              <p className="text-[11px] font-bold" style={{ color: l.cor }}>{l.id}</p>
              <p className="text-sm font-semibold text-foreground">{l.nome}</p>
              <p className="text-xs text-muted-foreground mt-1">{n} setor{n !== 1 ? "es" : ""}</p>
            </button>
          );
        })}
      </div>

      {/* Nível 2 */}
      {layerCfg && (
        <div className="space-y-4 rounded-xl border p-4" style={{ borderColor: layerCfg.cor + "60" }}>
          <h3 className="text-sm font-bold" style={{ color: layerCfg.cor }}>{layerCfg.id} — {layerCfg.nome}</h3>

          {aberta === "L4" && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Cadeia de semicondutores para IA</p>
              <div className="flex flex-col sm:flex-row items-stretch gap-1">
                {PIPELINE.map((p, i) => (
                  <div key={p.elo} className="flex flex-1 items-center gap-1">
                    <div className={`flex-1 rounded-lg border p-2 ${p.nacional ? "border-emerald-500/60 bg-emerald-500/10" : "border-destructive/50 bg-destructive/10"}`}>
                      <p className={`text-xs font-bold ${p.nacional ? "text-emerald-500" : "text-destructive"}`}>{p.elo}{p.nacional && " · CEITEC"}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{p.nota}</p>
                    </div>
                    {i < PIPELINE.length - 1 && <span className="material-symbols-outlined text-muted-foreground text-base hidden sm:inline">arrow_forward</span>}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Vermelho = sem player nacional. O CEITEC atua nos elos de projeto e fabricação, mas em segmento diferente do necessário para IA
                (RFID, identificação, potência — não GPU de treinamento), e sua rota de potência depende de parceria com empresa chinesa.
              </p>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(porLayer[aberta!] || []).map(s => (
              <button key={s.id} onClick={() => setSel(s)}
                className={`rounded-lg border bg-card p-3 text-left hover:bg-muted transition-colors ${s.badge === "achado" ? "border-amber-400/60" : "border-border"}`}>
                <p className="text-sm font-medium text-foreground">{s.setor}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">CNAE {s.cnae}</span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${BADGE[s.badge].cls}`}>{BADGE[s.badge].label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nível 3 */}
      {sel && (
        <Drawer onClose={() => setSel(null)} header={
          <div>
            <p className="text-[11px] font-bold" style={{ color: LAYERS.find(l => l.id === sel.layer)?.cor }}>{sel.camada}</p>
            <p className="text-sm font-semibold text-foreground">{sel.setor}</p>
            <p className="text-[11px] text-muted-foreground">CNAE {sel.cnae}</p>
          </div>
        }>
          <div className={`rounded-lg border p-3 ${BADGE[sel.badge].cls}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider">Dependência</p>
            <p className="text-sm font-semibold mt-1">{sel.dependencia}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Internacional</p>
              <p className="text-xs text-foreground mt-1">{sel.internacionais}</p>
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Nacional</p>
              <p className="text-xs text-foreground mt-1">{sel.nacionais}</p>
            </div>
          </div>
          <p className="border-t border-border pt-2 text-[11px] text-muted-foreground">Status: {sel.status}</p>
        </Drawer>
      )}
    </div>
  );
}

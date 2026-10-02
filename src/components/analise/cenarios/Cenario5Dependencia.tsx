import { useEffect, useMemo, useState } from "react";
import { Spinner, Erro } from "./Drawer";

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
  confirmado: { label: "Dado oficial", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  achado: { label: "Achado", cls: "bg-amber-400/20 text-amber-500 border-amber-400/50" },
  pendente: { label: "Não calculável", cls: "bg-yellow-400/10 text-yellow-600 border-yellow-400/30" },
  nao_se_aplica: { label: "Não se aplica", cls: "bg-sky-500/10 text-sky-500 border-sky-500/30" },
};

// Percentual de dependência estrangeira somente quando a planilha traz número de mercado/importação
// (s7 importação de painéis, s9 market share móvel, s14 estimativa qualitativa explícita).
const DEP_NUM: Record<string, { pct: number; estimativa?: boolean }> = {
  s7: { pct: 99 }, s9: { pct: 93.5 }, s14: { pct: 100, estimativa: true },
};

const PIPELINE = [
  { elo: "Design / IP", nacional: false, nota: "NVIDIA, Arm, AMD" },
  { elo: "Fabless", nacional: true, nota: "CEITEC — RFID, identificação, potência" },
  { elo: "Foundry", nacional: true, nota: "CEITEC (Porto Alegre/RS) — única fab da AL" },
  { elo: "OSAT", nacional: false, nota: "Encapsulamento avançado na Ásia" },
];

/** Extrai nomes na ordem em que a planilha os lista (ordem = relevância declarada pela curadoria). */
function empresas(txt: string): { nome: string; det?: string }[] {
  // Frase descritiva com lista entre parênteses ("... (Voith, Andritz, GE)") → usa a lista
  const par = txt.match(/\(([^()]*,[^()]*)\)/);
  if (par && txt.split(/ — |\. /)[0].length > 60) {
    return par[1].split(",").map(s => ({ nome: s.trim() })).filter(e => e.nome).slice(0, 5);
  }
  const base = txt.split(/ — |\. /)[0];
  return base
    .split(/,(?![^()]*\))|;| \+ /)
    .map(s => s.trim().replace(/^Operadoras:\s*/i, ""))
    .filter(s => s.length > 1 && s.length < 90)
    .slice(0, 5)
    .map(s => {
      const m = s.match(/^([^(]+)\((.+)\)$/);
      return m ? { nome: m[1].trim(), det: m[2].trim() } : { nome: s };
    });
}

function Hint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex cursor-help align-middle">
      <span className="material-symbols-outlined text-[14px] text-muted-foreground">info</span>
      <span className="pointer-events-none absolute right-0 top-5 z-20 hidden w-72 rounded-lg border border-border bg-popover p-3 text-[11px] leading-relaxed text-popover-foreground shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

function Ranking({ lista, tom }: { lista: { nome: string; det?: string }[]; tom: "int" | "nac" }) {
  if (!lista.length) return <p className="text-xs italic text-muted-foreground">Nenhum player identificado</p>;
  const cor = tom === "int" ? "text-destructive" : "text-emerald-500";
  return (
    <ol className="space-y-1">
      {lista.map((e, i) => (
        <li key={i} className="flex items-baseline gap-2 text-xs">
          <span className={`w-4 shrink-0 font-bold tabular-nums ${cor}`}>{i + 1}</span>
          <span className="font-medium text-foreground">{e.nome}</span>
          {e.det && <span className="truncate text-[10px] text-muted-foreground" title={e.det}>{e.det}</span>}
        </li>
      ))}
    </ol>
  );
}

function BarraForca({ s }: { s: Setor }) {
  const num = DEP_NUM[s.id];
  if (s.badge === "nao_se_aplica")
    return <div className="h-2.5 rounded-full bg-sky-500/20" title="Natureza institucional — não se mede dependência" />;
  if (!num)
    return (
      <div className="h-2.5 rounded-full"
        style={{ background: "repeating-linear-gradient(45deg, hsl(var(--muted)) 0 6px, hsl(var(--border)) 6px 12px)" }}
        title="Sem número público — não estimado" />
    );
  const nac = 100 - num.pct;
  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
      <div className="bg-emerald-500" style={{ width: `${nac}%` }} />
      <div className="bg-destructive" style={{ width: `${num.pct}%` }} />
    </div>
  );
}

function CardSetor({ s, cor }: { s: Setor; cor: string }) {
  const int = empresas(s.internacionais);
  const nac = empresas(s.nacionais);
  const num = DEP_NUM[s.id];
  const veredito = s.badge === "nao_se_aplica" ? { t: "Institucional", c: "text-sky-500" }
    : num ? (num.pct >= 60 ? { t: "Dependência alta", c: "text-destructive" } : { t: "Equilibrado", c: "text-amber-500" })
    : { t: "Sem métrica", c: "text-muted-foreground" };
  return (
    <div className={`flex flex-col rounded-2xl border bg-card p-4 ${s.badge === "achado" ? "border-amber-400/60" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{s.setor}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">CNAE {s.cnae}</span>
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${BADGE[s.badge].cls}`}>{BADGE[s.badge].label}</span>
          </div>
        </div>
        <Hint text={`Status: ${s.status}`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-destructive">Internacional</p>
          <Ranking lista={int} tom="int" />
        </div>
        <div className="border-l border-border pl-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">Nacional</p>
          <Ranking lista={nac} tom="nac" />
        </div>
      </div>

      <div className="mt-auto pt-3">
        <div className="mb-1 flex items-center justify-between text-[10px]">
          <span className="text-emerald-500">{num ? `${(100 - num.pct).toLocaleString("pt-BR")}% nacional` : "Nacional"}</span>
          <span className={`font-bold ${veredito.c}`}>{veredito.t}{num?.estimativa && " (estimativa)"}</span>
          <span className="text-destructive">{num ? `${num.pct.toLocaleString("pt-BR")}% estrangeiro` : "Estrangeiro"}</span>
        </div>
        <BarraForca s={s} />
        <p className="mt-1.5 flex items-start gap-1 text-[10px] text-muted-foreground">
          <span className="line-clamp-2 flex-1">{s.dependencia}</span>
          <Hint text={`Internacional: ${s.internacionais}\n\nNacional: ${s.nacionais}`} />
        </p>
      </div>
      <span className="sr-only">{cor}</span>
    </div>
  );
}

export default function Cenario5Dependencia() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);

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
  const comNumero = Object.keys(DEP_NUM).length;
  const altas = Object.values(DEP_NUM).filter(d => d.pct >= 60).length;

  return (
    <div className="w-full space-y-8">
      {/* Resumo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { v: `${verificados}`, s: `de ${total}`, l: "setores com fonte verificada", c: "text-foreground" },
          { v: `${oficiais}`, l: "com percentual de dado oficial (ANEEL / ANATEL)", c: "text-emerald-500" },
          { v: `${altas} de ${comNumero}`, l: "setores com métrica de mercado mostram dependência estrangeira ≥ 60%", c: "text-destructive" },
          { v: `${total - comNumero}`, l: "sem métrica de mercado — não estimados", c: "text-yellow-600" },
        ].map((k, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <p className={`text-3xl font-bold ${k.c}`}>{k.v} {k.s && <span className="text-base font-normal text-muted-foreground">{k.s}</span>}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.l}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-emerald-500" /> nacional</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-destructive" /> estrangeiro</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded" style={{ background: "repeating-linear-gradient(45deg, hsl(var(--muted)) 0 3px, hsl(var(--border)) 3px 6px)" }} /> sem número público</span>
        <span>Ranking = ordem de relevância registrada na planilha auditada (não é market share).</span>
        <Hint text={`${dados.aviso} Fonte: ${dados.fonte}. Versão ${dados.versao}.`} />
      </div>

      {LAYERS.map(l => {
        const setores = porLayer[l.id] || [];
        if (!setores.length) return null;
        return (
          <section key={l.id} className="space-y-3">
            <div className="flex items-center gap-3 border-b pb-2" style={{ borderColor: l.cor + "60" }}>
              <span className="rounded-md px-2 py-0.5 text-xs font-bold" style={{ color: l.cor, background: l.cor + "1f" }}>{l.id}</span>
              <h3 className="text-base font-bold text-foreground">{l.nome}</h3>
              <span className="text-xs text-muted-foreground">{setores.length} setor{setores.length !== 1 ? "es" : ""}</span>
            </div>

            {l.id === "L4" && (
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Cadeia de semicondutores para IA</p>
                  <Hint text="O CEITEC atua nos elos de projeto e fabricação, mas em segmento diferente do necessário para IA (RFID, identificação, potência — não GPU de treinamento), e sua rota de potência depende de parceria com empresa chinesa." />
                </div>
                <div className="grid gap-2 sm:grid-cols-4">
                  {PIPELINE.map(p => (
                    <div key={p.elo} className={`rounded-xl border p-3 ${p.nacional ? "border-emerald-500/60 bg-emerald-500/10" : "border-destructive/50 bg-destructive/10"}`}>
                      <p className={`text-xs font-bold ${p.nacional ? "text-emerald-500" : "text-destructive"}`}>{p.elo}{p.nacional && " · CEITEC"}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{p.nota}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {setores.map(s => <CardSetor key={s.id} s={s} cor={l.cor} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

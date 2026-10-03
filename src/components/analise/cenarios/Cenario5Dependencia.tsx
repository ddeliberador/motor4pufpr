import { forwardRef, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Spinner, Erro } from "./Drawer";
import DependencyThermometer from "@/components/shared/DependencyThermometer";

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
  pendente: { label: "", cls: "" },
  nao_se_aplica: { label: "Não se aplica", cls: "bg-sky-500/10 text-sky-500 border-sky-500/30" },
};

// Percentual vindo de fonte numérica ou estimativa explicitamente registrada na base.
const DEP_NUM: Record<string, { pct: number; estimativa?: boolean }> = {
  s7: { pct: 99 }, s9: { pct: 93.5 }, s14: { pct: 100, estimativa: true },
};

const PIPELINE = [
  { elo: "Design / IP", nacional: false, nota: "NVIDIA, Arm, AMD" },
  { elo: "Fabless", nacional: true, nota: "CEITEC — RFID, identificação, potência" },
  { elo: "Foundry", nacional: true, nota: "CEITEC (Porto Alegre/RS) — única fab da AL" },
  { elo: "OSAT", nacional: false, nota: "Encapsulamento avançado na Ásia" },
];

type Empresa = { nome: string; det?: string };
type GrauDependencia = { pct: number; estimativa?: boolean; inferido?: boolean };

// Nomes identificados explicitamente na base auditada. A lista deliberadamente não
// tenta extrair empresas de frases, evitando transformar atividades e notas em nomes.
const EMPRESAS: Record<string, { internacionais: Empresa[]; nacionais: Empresa[] }> = {
  s1: { internacionais: [{ nome: "Voith" }, { nome: "Andritz" }, { nome: "GE" }, { nome: "Mitsubishi" }], nacionais: [{ nome: "Eletrobras / Furnas" }, { nome: "Copel" }, { nome: "Cemig" }, { nome: "Omega Energia" }] },
  s2: { internacionais: [], nacionais: [{ nome: "Itaipu Binacional", det: "ativo binacional Brasil–Paraguai" }] },
  s3: { internacionais: [{ nome: "Jinko Solar" }, { nome: "BYD" }, { nome: "JA Solar" }, { nome: "Trina Solar" }, { nome: "Canadian Solar" }], nacionais: [] },
  s4: { internacionais: [{ nome: "Siemens Gamesa" }, { nome: "Vestas" }, { nome: "GE Renewable Energy" }], nacionais: [] },
  s5: { internacionais: [{ nome: "GE" }, { nome: "Siemens Energy" }], nacionais: [{ nome: "Eletronuclear" }] },
  s6: { internacionais: [{ nome: "Vestas" }, { nome: "GE" }, { nome: "Siemens Gamesa" }], nacionais: [{ nome: "WEG" }] },
  s7: { internacionais: [{ nome: "Jinko Solar" }, { nome: "BYD" }, { nome: "JA Solar" }, { nome: "Trina Solar" }, { nome: "Canadian Solar" }], nacionais: [] },
  s8: { internacionais: [{ nome: "Vivo", det: "Telefónica" }, { nome: "Claro", det: "América Móvil" }], nacionais: [{ nome: "V.tal", det: "controlada por fundos do BTG Pactual" }] },
  s9: { internacionais: [{ nome: "Vivo", det: "Telefónica" }, { nome: "Claro", det: "América Móvil" }, { nome: "TIM", det: "Telecom Italia" }], nacionais: [{ nome: "Algar Telecom" }] },
  s10: { internacionais: [{ nome: "Starlink / SpaceX" }, { nome: "Viasat" }, { nome: "Hughes" }], nacionais: [{ nome: "Telebras", det: "operadora do SGDC" }] },
  s11: { internacionais: [{ nome: "Google" }, { nome: "Meta" }, { nome: "SubCom" }, { nome: "Alcatel Submarine Networks" }], nacionais: [{ nome: "Globenet / V.tal" }] },
  s12: { internacionais: [{ nome: "AWS" }, { nome: "Microsoft Azure" }, { nome: "Google Cloud" }, { nome: "Oracle Cloud" }, { nome: "IBM Cloud" }, { nome: "Scala Data Centers", det: "controlada pela DigitalBridge" }], nacionais: [{ nome: "Locaweb" }, { nome: "Magalu Cloud" }, { nome: "TIVIT" }, { nome: "EVEO" }] },
  s13: { internacionais: [{ nome: "OpenAI" }, { nome: "Google" }, { nome: "Anthropic" }, { nome: "Meta" }, { nome: "Microsoft" }], nacionais: [{ nome: "Maritaca AI" }, { nome: "Tucano 2" }] },
  s14: { internacionais: [{ nome: "NVIDIA" }, { nome: "AMD" }, { nome: "Intel" }, { nome: "Global Power Technology", det: "parceira tecnológica do CEITEC" }], nacionais: [{ nome: "CEITEC" }] },
  s15: { internacionais: [{ nome: "Accenture" }, { nome: "IBM" }, { nome: "Deloitte" }, { nome: "Microsoft" }], nacionais: [{ nome: "TOTVS" }, { nome: "Stefanini" }, { nome: "CI&T" }, { nome: "BRQ" }] },
  s16: { internacionais: [], nacionais: [{ nome: "TOTVS" }] },
  s17: { internacionais: [{ nome: "Microsoft" }, { nome: "Salesforce" }, { nome: "SAP" }, { nome: "Oracle" }], nacionais: [{ nome: "TOTVS" }, { nome: "RD Station" }, { nome: "Sankhya" }, { nome: "Omie" }, { nome: "Conta Azul" }, { nome: "Bling" }] },
  s18: { internacionais: [{ nome: "Google" }, { nome: "Meta" }], nacionais: [] },
  s19: { internacionais: [{ nome: "Google Research / DeepMind" }, { nome: "Microsoft Research" }, { nome: "Meta AI" }, { nome: "OpenAI" }, { nome: "IBM", det: "parceira do C4AI" }], nacionais: [{ nome: "USP" }, { nome: "Unicamp" }, { nome: "UFMG" }, { nome: "CEIA / UFG" }, { nome: "FAPESP" }] },
  s20: { internacionais: [{ nome: "Partnership on AI" }, { nome: "OECD.AI" }], nacionais: [{ nome: "ANPD" }, { nome: "MCTI" }, { nome: "CGEE" }] },
  s21: { internacionais: [], nacionais: [] },
};

const Hint = forwardRef<HTMLSpanElement, { text: string }>(function Hint({ text }, ref) {
  return (
    <span ref={ref} className="group relative inline-flex cursor-help align-middle">
      <span className="material-symbols-outlined text-[14px] text-muted-foreground">info</span>
      <span className="pointer-events-none absolute right-0 top-5 z-20 hidden w-72 rounded-lg border border-border bg-popover p-3 text-[11px] leading-relaxed text-popover-foreground shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
});

function Ranking({ lista, tom }: { lista: Empresa[]; tom: "int" | "nac" }) {
  if (!lista.length) return <p className="text-xs italic text-muted-foreground">Nenhuma empresa identificada</p>;
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

function grauDependencia(s: Setor, internacionais: Empresa[], nacionais: Empresa[]): GrauDependencia | null {
  const medido = DEP_NUM[s.id];
  if (medido) return medido;
  if (internacionais.length > 0 && nacionais.length === 0) return { pct: 100, inferido: true };
  if (nacionais.length > 0 && internacionais.length === 0) return { pct: 0, inferido: true };
  return null;
}

function BarraForca({ pct }: { pct: number }) {
  const nac = 100 - pct;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px]">
        <span className="text-emerald-500">{nac.toLocaleString("pt-BR")}% nacional</span>
        <span className="text-destructive">{pct.toLocaleString("pt-BR")}% estrangeiro</span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-label={`Força nacional ${nac}%, internacional ${pct}%`}>
        <div className="bg-emerald-500" style={{ width: `${nac}%` }} />
        <div className="bg-destructive" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CardSetor({ s, cor }: { s: Setor; cor: string }) {
  const int = EMPRESAS[s.id]?.internacionais || [];
  const nac = EMPRESAS[s.id]?.nacionais || [];
  const grau = grauDependencia(s, int, nac);
  return (
    <div className={`flex flex-col rounded-2xl border bg-card p-4 ${s.badge === "achado" ? "border-amber-400/60" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{s.setor}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">CNAE {s.cnae}</span>
            {BADGE[s.badge].label && <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${BADGE[s.badge].cls}`}>{BADGE[s.badge].label}</span>}
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
        {grau && <>
          <BarraForca pct={grau.pct} />
          <DependencyThermometer
            value={grau.pct}
            compact
            className="mt-3"
            detail={grau.inferido
              ? grau.pct === 100
                ? "100% porque a base identificou somente empresas estrangeiras."
                : "0% porque a base identificou somente empresas nacionais."
              : grau.estimativa
                ? "Estimativa qualitativa registrada na base auditada."
                : "Calculado com o percentual de mercado ou importação da fonte auditada."}
          />
        </>}
        {!/^(Não calculável|Pendente)/i.test(s.dependencia) && (
          <p className="mt-1.5 flex items-start gap-1 text-[10px] text-muted-foreground">
            <span className="line-clamp-2 flex-1">{s.dependencia}</span>
            <Hint text={`Internacional: ${s.internacionais}\n\nNacional: ${s.nacionais}`} />
          </p>
        )}
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

  // Média do grau de dependência por camada — só setores com percentual mensurável.
  const resumoLayers = useMemo(() => LAYERS.map(l => {
    const setores = porLayer[l.id] || [];
    const graus = setores
      .map(s => grauDependencia(s, EMPRESAS[s.id]?.internacionais || [], EMPRESAS[s.id]?.nacionais || []))
      .filter((g): g is GrauDependencia => g !== null);
    const media = graus.length ? graus.reduce((a, g) => a + g.pct, 0) / graus.length : null;
    return {
      id: l.id, nome: l.nome, cor: l.cor, total: setores.length, comMetrica: graus.length,
      media, label: media !== null ? `${media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—",
    };
  }), [porLayer]);

  if (erro) return <Erro msg={erro} />;
  if (!dados) return <Spinner />;

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-emerald-500" /> nacional</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-destructive" /> estrangeiro</span>
        <span>Ranking = ordem de relevância registrada na planilha auditada (não é market share).</span>
        <Hint text={`${dados.aviso} Fonte: ${dados.fonte}. Versão ${dados.versao}.`} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-foreground">Grau de dependência por camada</h3>
            <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">
              Média dos setores da camada que têm percentual mensurável (dado oficial, estimativa registrada na base ou inferido por exclusividade). Faixas de alerta do índice CD do Motor: ≤50 baixa · 50–70 moderada · &gt;70 crítica.
            </p>
          </div>
          <Hint text={`Média simples do grau de dependência dos setores mensuráveis de cada camada (L1–L7). Camadas sem barra não têm nenhum percentual calculável — nada foi estimado. Contagens: ${resumoLayers.map(r => `${r.id} ${r.comMetrica}/${r.total}`).join(" · ")}.`} />
        </div>
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={resumoLayers} margin={{ top: 24, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-muted-foreground/20" />
              <XAxis dataKey="id" tick={{ fontSize: 12, fill: "currentColor" }} tickLine={false} axisLine={{ stroke: "currentColor", strokeOpacity: 0.2 }} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<TooltipResumo />} cursor={{ fill: "currentColor", fillOpacity: 0.05 }} />
              <ReferenceLine y={70} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="4 4" label={{ value: "crítico >70%", position: "insideTopRight", fontSize: 10, fill: "currentColor" }} />
              <Bar dataKey="media" maxBarSize={72} radius={[4, 4, 0, 0]}>
                {resumoLayers.map(r => <Cell key={r.id} fill={r.cor} fillOpacity={r.media === null ? 0.18 : 0.85} />)}
                <LabelList dataKey="label" position="top" style={{ fontSize: 11, fontWeight: 700, fill: "currentColor" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>


      {LAYERS.map(l => {
        const setores = porLayer[l.id] || [];
        if (!setores.length) return null;
        return (
          <section key={l.id} className="space-y-4 border-t-4 pt-5" style={{ borderColor: l.cor }}>
            <div className="flex items-center gap-4">
              <span className="rounded-md px-3 py-1 text-base font-bold" style={{ color: l.cor, background: l.cor + "1f" }}>{l.id}</span>
              <h3 className="text-2xl font-bold text-foreground">{l.nome}</h3>
              <span className="text-sm font-medium text-muted-foreground">{setores.length} setor{setores.length !== 1 ? "es" : ""}</span>
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

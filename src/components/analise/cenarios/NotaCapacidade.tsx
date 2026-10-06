import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// "Nota de capacidade": indicador composto próprio do Cenário 2 (não é GT, CD, AUE nem EI).
interface Peso {
  indicador: string; rotulo: string; bloco: string; peso_bloco: number; peso: number;
  ativo: boolean; origem: string; justificativa: string | null; versao: number | null;
}
type Contagem = Record<string, number | string> & { uf: string };
interface IndUF { uf: string; indicador: string; ano: number; valor: number }

const CORES_BLOCO: Record<string, string> = {
  "Formação de pessoas": "#60a5fa", "Base de pesquisa": "#34d399",
  "Intermediação": "#fb923c", "Mercado e proteção": "#f472b6",
};
const MOTIVO_PADRAO = "sem dados carregados ainda (ingestão prevista na etapa 2)";

// Posição percentual entre UFs; empates recebem o mesmo valor.
function percentis(vals: Record<string, number>): Record<string, number> {
  const ufs = Object.keys(vals); const n = ufs.length;
  const out: Record<string, number> = {};
  ufs.forEach(u => { out[u] = n > 1 ? ufs.filter(o => vals[o] < vals[u]).length / (n - 1) : 1; });
  return out;
}

function postos(nota: Record<string, number>): Record<string, number> {
  const ord = Object.keys(nota).sort((a, b) => nota[b] - nota[a]);
  const r: Record<string, number> = {};
  let i = 0;
  while (i < ord.length) {
    let j = i; while (j + 1 < ord.length && nota[ord[j + 1]] === nota[ord[i]]) j++;
    for (let k = i; k <= j; k++) r[ord[k]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}
function spearman(a: Record<string, number>, b: Record<string, number>): number | null {
  const ufs = Object.keys(a).filter(u => u in b); const n = ufs.length;
  if (n < 3) return null;
  const ra = postos(a), rb = postos(b);
  const ma = ufs.reduce((s, u) => s + ra[u], 0) / n, mb = ufs.reduce((s, u) => s + rb[u], 0) / n;
  let num = 0, da = 0, db = 0;
  ufs.forEach(u => { num += (ra[u] - ma) * (rb[u] - mb); da += (ra[u] - ma) ** 2; db += (rb[u] - mb) ** 2; });
  return da && db ? num / Math.sqrt(da * db) : null;
}

export default function NotaCapacidade() {
  const [padrao, setPadrao] = useState<Peso[] | null>(null);
  const [pesos, setPesos] = useState<Peso[]>([]);
  const [contagens, setContagens] = useState<Contagem[]>([]);
  const [ind, setInd] = useState<IndUF[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [salvando, setSalvando] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("capacidade_pesos").select("*").order("bloco"),
      supabase.from("v_capacidade_uf_contagens").select("*"),
      supabase.from("indicadores_uf").select("uf, indicador, ano, valor"),
    ]).then(([p, c, i]) => {
      const e = p.error || c.error || i.error;
      if (e) { setErro(e.message); return; }
      const ps = (p.data || []).map(r => ({ ...r, peso: Number(r.peso), peso_bloco: Number(r.peso_bloco) })) as Peso[];
      setPadrao(ps); setPesos(ps);
      setContagens((c.data || []) as Contagem[]);
      setInd(((i.data || []) as IndUF[]).map(r => ({ ...r, valor: Number(r.valor) })));
    });
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin");
      setAdmin(!!r?.length);
    });
  }, []);

  // Valor bruto por indicador e UF; indicadores_uf = média dos 3 anos mais recentes.
  const brutos = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    pesos.forEach(p => {
      if (p.origem === "research_locations") {
        m[p.indicador] = Object.fromEntries(contagens.map(c => [c.uf, Number(c[p.indicador] || 0)]));
      } else {
        const porUf: Record<string, IndUF[]> = {};
        ind.filter(r => r.indicador === p.indicador).forEach(r => { (porUf[r.uf] ||= []).push(r); });
        const v: Record<string, number> = {};
        Object.entries(porUf).forEach(([uf, rs]) => {
          const ult = rs.sort((a, b) => b.ano - a.ano).slice(0, 3);
          v[uf] = ult.reduce((s, r) => s + r.valor, 0) / ult.length;
        });
        if (Object.keys(v).length) m[p.indicador] = v;
      }
    });
    return m;
  }, [pesos, contagens, ind]);

  const disponivel = (p: Peso) => p.ativo && !!brutos[p.indicador];
  const blocos = useMemo(() => [...new Set(pesos.map(p => p.bloco))], [pesos]);

  function calcular(ps: Peso[]) {
    const pct: Record<string, Record<string, number>> = {};
    ps.filter(p => p.ativo && brutos[p.indicador]).forEach(p => { pct[p.indicador] = percentis(brutos[p.indicador]); });
    const ufs = contagens.map(c => c.uf);
    const resultado: Record<string, { nota: number; contrib: Record<string, number> }> = {};
    const blocosAtivos = [...new Set(ps.map(p => p.bloco))].map(b => {
      const inds = ps.filter(p => p.bloco === b && pct[p.indicador] && p.peso > 0);
      return { b, inds, pb: ps.find(p => p.bloco === b)?.peso_bloco || 0 };
    }).filter(x => x.inds.length && x.pb > 0);
    const somaPB = blocosAtivos.reduce((s, x) => s + x.pb, 0);
    ufs.forEach(uf => {
      const contrib: Record<string, number> = {};
      blocosAtivos.forEach(({ b, inds, pb }) => {
        const comDado = inds.filter(p => uf in pct[p.indicador]);
        const sw = comDado.reduce((s, p) => s + p.peso, 0);
        const vb = sw ? comDado.reduce((s, p) => s + p.peso * pct[p.indicador][uf], 0) / sw : 0;
        contrib[b] = somaPB ? (100 * pb * vb) / somaPB : 0;
      });
      resultado[uf] = { nota: Object.values(contrib).reduce((s, v) => s + v, 0), contrib };
    });
    return resultado;
  }

  const atual = useMemo(() => calcular(pesos), [pesos, brutos, contagens]); // eslint-disable-line react-hooks/exhaustive-deps
  const iguais = useMemo(() => calcular(pesos.map(p => ({ ...p, peso: 1, peso_bloco: 1 }))), [pesos, brutos, contagens]); // eslint-disable-line react-hooks/exhaustive-deps
  const rho = useMemo(() => spearman(
    Object.fromEntries(Object.entries(atual).map(([u, v]) => [u, v.nota])),
    Object.fromEntries(Object.entries(iguais).map(([u, v]) => [u, v.nota]))), [atual, iguais]);
  const ranking = Object.entries(atual).sort((a, b) => b[1].nota - a[1].nota);

  const setPesoBloco = (b: string, v: number) => setPesos(ps => ps.map(p => p.bloco === b ? { ...p, peso_bloco: v } : p));
  const setPeso = (i: string, v: number) => setPesos(ps => ps.map(p => p.indicador === i ? { ...p, peso: v } : p));

  async function gravarPadrao() {
    setSalvando("gravando…");
    for (const p of pesos) {
      const { error } = await supabase.from("capacidade_pesos")
        .update({ peso: p.peso, peso_bloco: p.peso_bloco, versao: (p.versao || 1) + 1 }).eq("indicador", p.indicador);
      if (error) { setSalvando(`Falha: ${error.message}`); return; }
    }
    setPadrao(pesos.map(p => ({ ...p, versao: (p.versao || 1) + 1 }))); setSalvando("Gravado como novo padrão.");
  }

  if (erro) return <div className="rounded-xl border border-destructive/40 bg-card p-5 text-sm text-destructive">Falha ao carregar a Nota de capacidade: {erro}</div>;
  if (!padrao) return <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  const max = ranking[0]?.[1].nota || 100;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Nota de capacidade por UF</h2>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
            Indicador composto de 0 a 100 que combina quatro blocos. <strong className="text-foreground">Pesos são hipótese de trabalho</strong>, ainda a validar com a orientação.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {blocos.map(b => <span key={b} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CORES_BLOCO[b] }} />{b}</span>)}
        </div>
      </div>

      {/* Indicadores e disponibilidade */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {blocos.map(b => (
          <div key={b} className="rounded-lg border border-border p-3">
            <p className="text-xs font-bold" style={{ color: CORES_BLOCO[b] }}>{b}</p>
            <ul className="mt-1.5 space-y-1">
              {pesos.filter(p => p.bloco === b).map(p => (
                <li key={p.indicador} className={`text-xs ${disponivel(p) ? "text-foreground" : "text-muted-foreground opacity-60"}`}>
                  {p.rotulo}
                  {!disponivel(p) && <span className="ml-1 rounded bg-muted px-1 text-[10px] font-semibold">pendente</span>}
                  {!disponivel(p) && <span className="block text-[10px] italic">{!p.ativo ? "sem fonte aberta confirmada (depende do Extrator Lattes ou de dados de bolsas)" : MOTIVO_PADRAO}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Ranking */}
      <ol className="space-y-1">
        {ranking.map(([uf, r], i) => (
          <li key={uf} className="flex items-center gap-2 text-xs">
            <span className="w-6 text-right font-bold tabular-nums text-muted-foreground">{i + 1}º</span>
            <span className="w-7 font-bold text-foreground">{uf}</span>
            <div className="flex h-4 flex-1 overflow-hidden rounded bg-muted/40" title={blocos.map(b => `${b}: ${(r.contrib[b] || 0).toFixed(1)}`).join(" · ")}>
              {blocos.map(b => <div key={b} style={{ width: `${(100 * (r.contrib[b] || 0)) / max}%`, background: CORES_BLOCO[b] }} />)}
            </div>
            <span className="w-10 text-right font-bold tabular-nums text-foreground">{r.nota.toFixed(1)}</span>
          </li>
        ))}
      </ol>

      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Estabilidade (Spearman): {rho === null ? "—" : rho.toFixed(3)}</strong> — correlação entre a ordem com os pesos atuais e a ordem com todos os indicadores de peso igual. Quanto mais perto de 1, menos o ranking depende dos pesos escolhidos.
      </p>

      {/* Ajuste de pesos */}
      <div className="rounded-lg border border-border">
        <button onClick={() => setAberto(a => !a)} className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold text-foreground">
          Ajustar pesos
          <span className="material-symbols-outlined text-lg leading-none">{aberto ? "expand_less" : "expand_more"}</span>
        </button>
        {aberto && (
          <div className="space-y-4 border-t border-border p-4">
            <p className="text-xs text-muted-foreground">Mudanças valem só nesta visita e não são gravadas.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {blocos.map(b => {
                const pb = pesos.find(p => p.bloco === b)!.peso_bloco;
                return (
                  <div key={b} className="rounded-lg border border-border p-3">
                    <label className="flex items-center justify-between text-xs font-bold" style={{ color: CORES_BLOCO[b] }}>
                      {b} <span className="tabular-nums text-foreground">bloco {pb}</span>
                    </label>
                    <input type="range" min={0} max={50} step={1} value={pb} onChange={e => setPesoBloco(b, Number(e.target.value))} className="w-full" />
                    {pesos.filter(p => p.bloco === b).map(p => (
                      <div key={p.indicador} className={disponivel(p) ? "" : "opacity-50"}>
                        <label className="flex items-center justify-between text-xs text-foreground">
                          {p.rotulo} <span className="tabular-nums">{p.peso}</span>
                        </label>
                        <input type="range" min={0} max={3} step={0.5} value={p.peso} disabled={!disponivel(p)} onChange={e => setPeso(p.indicador, Number(e.target.value))} className="w-full" />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => { setPesos(padrao); setSalvando(null); }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Restaurar padrão</button>
              {admin && <button onClick={gravarPadrao} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Gravar como novo padrão</button>}
              {salvando && <span className="text-xs text-muted-foreground">{salvando}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Como ler */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-1 text-sm font-bold text-foreground">Como ler esta nota</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Os pesos são <strong className="text-foreground">hipótese de trabalho</strong>: blocos iguais como ponto de partida, sem validação empírica. Método segue as etapas do OECD/JRC Handbook on Constructing Composite Indicators.</li>
          <li>Cada indicador é convertido na posição da UF entre os estados (0 = menor, 1 = maior), para que as startups, cerca de 72% dos registros, não dominem a nota.</li>
          <li>A nota mede <strong className="text-foreground">escala</strong>: estados grandes têm mais de tudo. Ela <strong className="text-foreground">não</strong> está dividida por população.</li>
          <li>Indicadores sem dado ficam fora da nota (não contam como zero).</li>
          <li>Limites: startups vêm do mapeamento ABStartups 2025, sem CNPJ e geocodificadas pelo centro do município; unidades EMBRAPII se sobrepõem a registros OTD/CGEE; as categorias são derivadas de texto livre do tipo de ator.</li>
        </ul>
      </div>
    </div>
  );
}

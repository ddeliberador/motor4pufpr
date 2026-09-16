// Métricas do cruzamento do Data Lake C,T&I: composição da interseção ativa
// por base de origem, natureza, função e território. Tudo calculado sobre o
// recorte visível no mapa — nenhum número fixo.

import { X } from "lucide-react";
import { fonteLabel } from "@/components/mapa/tipos";
import { EIXOS, type Canonico } from "@/components/mapa/dataLake";
import type { ResearchLocation } from "@/lib/researchLocations";

type Item = ResearchLocation & { canon: Canonico };

const conta = (vals: string[]) => {
  const c: Record<string, number> = {};
  for (const v of vals) if (v) c[v] = (c[v] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
};

function Barra({
  linhas,
  total,
}: {
  linhas: [string, number][];
  total: number;
}) {
  if (!linhas.length)
    return <p className="text-xs text-muted-foreground">Sem registros no recorte.</p>;
  return (
    <div className="space-y-1.5">
      {linhas.map(([k, n]) => (
        <div key={k} className="text-[11px]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate">{k}</span>
            <span className="font-mono text-muted-foreground">
              {n.toLocaleString("pt-BR")} · {total ? Math.round((n / total) * 100) : 0}%
            </span>
          </div>
          <div className="mt-0.5 h-1 rounded-full bg-muted">
            <div
              className="h-1 rounded-full bg-primary"
              style={{ width: `${total ? (n / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MetricasCruzamento({
  itens,
  total,
  onFechar,
}: {
  itens: Item[];
  total: number;
  onFechar: () => void;
}) {
  const n = itens.length;
  const labelDe = (eixoId: string, key: string) =>
    EIXOS.find((e) => e.id === eixoId)?.opcoes.find((o) => o.key === key)?.label || key;

  const porBase = conta(itens.map((i) => fonteLabel(i.fonte)));
  const porNatureza = conta(itens.map((i) => labelDe("natureza", i.canon.natureza)));
  const porFuncao = conta(itens.map((i) => labelDe("funcao", i.canon.funcao)));
  const porRegiao = conta(itens.map((i) => i.canon.regiao));
  const porTema = conta(itens.flatMap((i) => i.canon.tema.map((t) => labelDe("tema", t))));
  const porUf = conta(itens.map((i) => i.uf || "")).slice(0, 8);
  const comGeo = itens.filter((i) => i.canon.cobertura.includes("geo")).length;
  const comTema = itens.filter((i) => i.canon.tema.length > 0).length;

  return (
    <div className="absolute right-4 top-4 z-20 w-80 max-h-[calc(100%-2rem)] overflow-y-auto rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Métricas do cruzamento</p>
          <p className="text-[11px] text-muted-foreground">
            {n.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")} entidades ·{" "}
            {total ? ((n / total) * 100).toFixed(1) : "0"}% do data lake
          </p>
        </div>
        <button onClick={onFechar} aria-label="fechar métricas">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-border pb-3">
        <div className="rounded-lg border border-border p-2">
          <p className="text-lg font-bold leading-none">{porBase.length}</p>
          <p className="text-[10px] text-muted-foreground">bases contribuindo</p>
        </div>
        <div className="rounded-lg border border-border p-2">
          <p className="text-lg font-bold leading-none">
            {n ? Math.round((comTema / n) * 100) : 0}%
          </p>
          <p className="text-[10px] text-muted-foreground">com tema classificado</p>
        </div>
        <div className="rounded-lg border border-border p-2">
          <p className="text-lg font-bold leading-none">
            {n ? Math.round((comGeo / n) * 100) : 0}%
          </p>
          <p className="text-[10px] text-muted-foreground">georreferenciados</p>
        </div>
        <div className="rounded-lg border border-border p-2">
          <p className="text-lg font-bold leading-none">{porUf.length ? porUf[0][0] : "—"}</p>
          <p className="text-[10px] text-muted-foreground">estado com mais registros</p>
        </div>
      </div>

      <div className="mt-3 space-y-4">
        <section>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Por base de origem
          </p>
          <Barra linhas={porBase} total={n} />
        </section>
        <section>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Por eixo temático
          </p>
          <Barra linhas={porTema} total={n} />
        </section>
        <section>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Por natureza institucional
          </p>
          <Barra linhas={porNatureza} total={n} />
        </section>
        <section>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Por função no ecossistema
          </p>
          <Barra linhas={porFuncao} total={n} />
        </section>
        <section>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Por região
          </p>
          <Barra linhas={porRegiao} total={n} />
        </section>
        <section>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Estados com mais registros
          </p>
          <Barra linhas={porUf} total={n} />
        </section>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Cruzamento em esquema canônico: dentro de cada eixo as opções somam; entre eixos
        diferentes vale a interseção.
      </p>
    </div>
  );
}

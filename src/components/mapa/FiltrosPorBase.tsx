// Filtros granulares por base, na coluna lateral do Mapa.
// O controle muda conforme o tipo de informação: caixas de seleção,
// lista suspensa com busca ou opção única.

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { ResearchLocation } from "@/lib/researchLocations";
import type { Enriquecimento } from "@/lib/locationEnrichment";
import { FILTROS, type FiltroDef, type SelecaoFiltros } from "@/components/mapa/filtrosBase";
import { fonteLabel } from "@/components/mapa/tipos";

interface Props {
  itens: ResearchLocation[];
  enriquecimento: Record<string, Enriquecimento>;
  selecao: SelecaoFiltros;
  onChange: (id: string, valores: Set<string>) => void;
  /** Bases marcadas no filtro de base de origem (vazio = todas). */
  fontesSel: Set<string>;
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function CaixasSelecao({
  opcoes,
  sel,
  onToggle,
}: {
  opcoes: [string, number][];
  sel: Set<string>;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
      {opcoes.map(([v, n]) => (
        <label
          key={v}
          className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted"
        >
          <input
            type="checkbox"
            checked={sel.has(v)}
            onChange={() => onToggle(v)}
            className="h-3.5 w-3.5 shrink-0 accent-primary"
          />
          <span className="flex-1 truncate" title={v}>
            {v}
          </span>
          <span className="font-mono text-muted-foreground">{n.toLocaleString("pt-BR")}</span>
        </label>
      ))}
    </div>
  );
}

function ListaSuspensa({
  label,
  opcoes,
  sel,
  onToggle,
}: {
  label: string;
  opcoes: [string, number][];
  sel: Set<string>;
  onToggle: (v: string) => void;
}) {
  const [aberta, setAberta] = useState(false);
  const [q, setQ] = useState("");
  const visiveis = useMemo(() => {
    const t = norm(q.trim());
    return (t ? opcoes.filter(([v]) => norm(v).includes(t)) : opcoes).slice(0, 300);
  }, [opcoes, q]);

  return (
    <div>
      <button
        onClick={() => setAberta((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left text-xs hover:bg-muted"
      >
        <span className="flex-1 truncate">
          {sel.size ? `${sel.size} selecionado(s)` : `Selecionar ${label.toLowerCase()}`}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
            aberta ? "rotate-180" : ""
          }`}
        />
      </button>

      {aberta && (
        <div className="mt-1 rounded-lg border border-border bg-card p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="buscar…"
              className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs outline-none focus:border-primary"
            />
          </div>
          <CaixasSelecao opcoes={visiveis} sel={sel} onToggle={onToggle} />
          {!visiveis.length && (
            <p className="px-1 py-2 text-[11px] text-muted-foreground">nenhuma opção</p>
          )}
        </div>
      )}

      {sel.size > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {[...sel].map((v) => (
            <button
              key={v}
              onClick={() => onToggle(v)}
              className="max-w-full truncate rounded-md border border-primary bg-primary/15 px-1.5 py-0.5 text-[10px]"
              title={`remover ${v}`}
            >
              {v} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OpcaoUnica({
  id,
  opcoes,
  sel,
  onSet,
}: {
  id: string;
  opcoes: [string, number][];
  sel: Set<string>;
  onSet: (v: Set<string>) => void;
}) {
  const atual = sel.size === 1 ? [...sel][0] : "";
  return (
    <div className="space-y-1">
      <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted">
        <input
          type="radio"
          name={id}
          checked={atual === ""}
          onChange={() => onSet(new Set())}
          className="h-3.5 w-3.5 accent-primary"
        />
        <span className="flex-1">Todos</span>
      </label>
      {opcoes.map(([v, n]) => (
        <label
          key={v}
          className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted"
        >
          <input
            type="radio"
            name={id}
            checked={atual === v}
            onChange={() => onSet(new Set([v]))}
            className="h-3.5 w-3.5 accent-primary"
          />
          <span className="flex-1 truncate">{v}</span>
          <span className="font-mono text-muted-foreground">{n.toLocaleString("pt-BR")}</span>
        </label>
      ))}
    </div>
  );
}

export default function FiltrosPorBase({
  itens,
  enriquecimento,
  selecao,
  onChange,
  fontesSel,
}: Props) {
  /** Facetas reais de cada filtro, com contagem. */
  const facetas = useMemo(() => {
    const mapa: Record<string, Record<string, number>> = {};
    for (const def of FILTROS) mapa[def.id] = {};
    for (const l of itens) {
      const e = enriquecimento[l.id] || {};
      for (const def of FILTROS) {
        if (def.fonte && def.fonte !== l.fonte) continue;
        for (const v of def.valores(l, e)) mapa[def.id][v] = (mapa[def.id][v] || 0) + 1;
      }
    }
    const out: Record<string, [string, number][]> = {};
    for (const def of FILTROS) {
      const entradas = Object.entries(mapa[def.id]);
      out[def.id] =
        def.controle === "dropdown"
          ? entradas.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
          : entradas.sort((a, b) => b[1] - a[1]);
    }
    return out;
  }, [itens, enriquecimento]);

  const toggle = (def: FiltroDef, v: string) => {
    const atual = new Set(selecao[def.id] || []);
    atual.has(v) ? atual.delete(v) : atual.add(v);
    onChange(def.id, atual);
  };

  /** Agrupa por base, mostrando só as bases visíveis no recorte atual. */
  const grupos = useMemo(() => {
    const bases = [...new Set(FILTROS.map((f) => f.fonte))];
    return bases
      .map((base) => ({
        base,
        titulo: base ? fonteLabel(base).split("—")[0].split("(")[0].trim() : "Geral",
        defs: FILTROS.filter(
          (f) => f.fonte === base && (facetas[f.id]?.length || 0) > 0,
        ),
      }))
      .filter(
        (g) =>
          g.defs.length > 0 &&
          (g.base === null || fontesSel.size === 0 || fontesSel.has(g.base)),
      );
  }, [facetas, fontesSel]);

  if (!grupos.length) return null;

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Filtros detalhados por base
      </p>

      {grupos.map((g) => (
        <div key={g.base || "geral"} className="rounded-xl border border-border bg-card/60 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/80">
            {g.titulo}
          </p>
          <div className="space-y-3">
            {g.defs.map((def) => {
              const sel = selecao[def.id] || new Set<string>();
              return (
                <div key={def.id}>
                  <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                    {def.label}
                  </p>
                  {def.controle === "check" && (
                    <CaixasSelecao
                      opcoes={facetas[def.id]}
                      sel={sel}
                      onToggle={(v) => toggle(def, v)}
                    />
                  )}
                  {def.controle === "dropdown" && (
                    <ListaSuspensa
                      label={def.label}
                      opcoes={facetas[def.id]}
                      sel={sel}
                      onToggle={(v) => toggle(def, v)}
                    />
                  )}
                  {def.controle === "radio" && (
                    <OpcaoUnica
                      id={def.id}
                      opcoes={facetas[def.id]}
                      sel={sel}
                      onSet={(v) => onChange(def.id, v)}
                    />
                  )}
                  {def.ajuda && (
                    <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                      {def.ajuda}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

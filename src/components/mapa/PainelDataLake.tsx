// Coluna lateral do modo Data Lake Cruzado: eixos canônicos com seleção
// múltipla. Dentro do eixo as opções somam; entre eixos vale a interseção.

import { useMemo } from "react";
import {
  EIXOS,
  valoresDoEixo,
  type Canonico,
  type SelecaoLake,
} from "@/components/mapa/dataLake";

interface Item {
  canon: Canonico;
}

export default function PainelDataLake({
  itens,
  selecao,
  onChange,
}: {
  itens: Item[];
  selecao: SelecaoLake;
  onChange: (eixoId: string, valores: Set<string>) => void;
}) {
  // Contagem por opção considerando os OUTROS eixos já selecionados,
  // para que os números reflitam o cruzamento em andamento.
  const contagens = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    for (const eixo of EIXOS) {
      const id = eixo.id as string;
      const parcial = itens.filter((i) =>
        EIXOS.every((outro) => {
          const oid = outro.id as string;
          if (oid === id) return true;
          const sel = selecao[oid];
          if (!sel || sel.size === 0) return true;
          return valoresDoEixo(i.canon, outro).some((v) => sel.has(v));
        }),
      );
      const c: Record<string, number> = {};
      for (const i of parcial)
        for (const v of valoresDoEixo(i.canon, eixo)) c[v] = (c[v] || 0) + 1;
      out[id] = c;
    }
    return out;
  }, [itens, selecao]);

  const alternar = (eixoId: string, key: string) => {
    const atual = selecao[eixoId] || new Set<string>();
    const novo = new Set(atual);
    novo.has(key) ? novo.delete(key) : novo.add(key);
    onChange(eixoId, novo);
  };

  return (
    <div className="space-y-6">

      {EIXOS.map((eixo) => {
        const id = eixo.id as string;
        const sel = selecao[id] || new Set<string>();
        const c = contagens[id] || {};
        const opcoes = [...eixo.opcoes].sort(
          (a, b) => (c[b.key] || 0) - (c[a.key] || 0),
        );
        return (
          <div key={id}>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {eixo.ordem}. {eixo.titulo}
            </p>
            <p className="mb-2 mt-1 text-[11px] leading-snug text-muted-foreground">
              {eixo.descricao}
            </p>
            <div className="space-y-1">
              {opcoes.map((o) => {
                const ativo = sel.has(o.key);
                const n = c[o.key] || 0;
                return (
                  <label
                    key={o.key}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-2 text-xs transition-colors hover:bg-muted ${
                      ativo ? "border-primary bg-primary/10" : "border-border bg-card"
                    } ${n === 0 && !ativo ? "opacity-45" : ""}`}
                  >
                    <span className="flex flex-1 items-start gap-2">
                      {o.cor && (
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full bg-current ${o.cor}`}
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block font-medium">{o.label}</span>
                        {o.descricao && (
                          <span className="block text-[10px] leading-snug text-muted-foreground">
                            {o.descricao}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="mt-0.5 flex shrink-0 items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {n.toLocaleString("pt-BR")}
                      </span>
                      <input
                        type="checkbox"
                        checked={ativo}
                        onChange={() => alternar(id, o.key)}
                        className="h-3.5 w-3.5 accent-primary"
                      />
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

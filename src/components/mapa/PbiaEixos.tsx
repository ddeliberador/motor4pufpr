import { useEffect, useState } from "react";

type Acao = { acao: string; programa?: string; status: string; descricao?: string; metas?: string; entrega_1?: string; entrega_2?: string; entregas_previstas_2026?: string };
type Eixo = { numero: number; nome: string; acoes: Acao[] };
type Snapshot = { fonte: string; coletado_em: string; eixos: Eixo[] };

const STATUS = [
  { key: "Com entregas", cls: "bg-emerald-500" },
  { key: "Iniciada", cls: "bg-amber-500" },
  { key: "Não iniciada", cls: "bg-muted-foreground/50" },
];

/** PBIA — eixos e andamento real das ações (snapshot do painel MCTI/CGEE). */
export default function PbiaEixos() {
  const [dados, setDados] = useState<Snapshot | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<Set<number>>(new Set());
  const [acaoAberta, setAcaoAberta] = useState<string | null>(null);

  useEffect(() => {
    fetch("/pbia-eixos.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setDados)
      .catch((e) => setErro(String(e.message ?? e)));
  }, []);

  const total = dados?.eixos.reduce((s, e) => s + e.acoes.length, 0) ?? 0;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">PBIA — Eixos</p>
      {erro && <p className="px-2 text-[11px] text-destructive">PBIA indisponível: {erro}</p>}
      {!dados && !erro && <p className="px-2 text-[11px] text-muted-foreground">carregando…</p>}
      {dados && (
        <div className="space-y-1">
          <p className="px-2 text-[10px] text-muted-foreground">
            {total} ações · MCTI/CGEE · coletado em {new Date(dados.coletado_em).toLocaleDateString("pt-BR")}
          </p>
          {dados.eixos.map((e) => {
            const cont = STATUS.map((s) => e.acoes.filter((a) => a.status === s.key).length);
            const isOpen = aberto.has(e.numero);
            return (
              <div key={e.numero} className="rounded-lg bg-card">
                <button
                  onClick={() => setAberto((p) => { const n = new Set(p); n.has(e.numero) ? n.delete(e.numero) : n.add(e.numero); return n; })}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate">Eixo {e.numero} — {e.nome}</span>
                    <span className="text-[10px] text-muted-foreground">{e.acoes.length}</span>
                  </div>
                  <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted">
                    {STATUS.map((s, i) => cont[i] > 0 && (
                      <div key={s.key} className={s.cls} style={{ width: `${(cont[i] / e.acoes.length) * 100}%` }} title={`${s.key}: ${cont[i]}`} />
                    ))}
                  </div>
                </button>
                {isOpen && (
                  <div className="ml-4 space-y-0.5 border-l border-border pb-1 pl-2">
                    {e.acoes.map((a) => {
                      const s = STATUS.find((x) => x.key === a.status);
                      const id = `${e.numero}:${a.acao}`;
                      return (
                        <div key={id}>
                          <button onClick={() => setAcaoAberta(acaoAberta === id ? null : id)} className="flex w-full items-start gap-2 rounded px-1 py-0.5 text-left text-[11px] hover:bg-muted">
                            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${s?.cls ?? "bg-muted"}`} aria-hidden />
                            <span className="flex-1">{a.acao}</span>
                          </button>
                          {acaoAberta === id && (
                            <div className="space-y-1 px-5 pb-1 text-[10px] text-muted-foreground">
                              <p><strong>Status:</strong> {a.status}{a.programa ? ` · ${a.programa}` : ""}</p>
                              {a.descricao && <p>{a.descricao}</p>}
                              {a.metas && <p><strong>Metas:</strong> {a.metas}</p>}
                              {[a.entrega_1, a.entrega_2].filter(Boolean).map((t, i) => <p key={i}><strong>Entrega:</strong> {t}</p>)}
                              {a.entregas_previstas_2026 && <p><strong>Previsto 2026:</strong> {a.entregas_previstas_2026}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2 px-2 pt-1 text-[10px] text-muted-foreground">
            {STATUS.map((s) => <span key={s.key} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${s.cls}`} />{s.key}</span>)}
          </div>
          <a href="https://pbia.cgee.org.br/resultados" target="_blank" rel="noreferrer" className="block px-2 text-[10px] text-primary hover:underline">Fonte: painel PBIA (CGEE)</a>
        </div>
      )}
    </div>
  );
}

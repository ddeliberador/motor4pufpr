import { ExternalLink } from "lucide-react";

interface ProgramsTabProps {
  programs: any;
  which: "nova-industria" | "pbia" | "fomento";
}

export default function ProgramsTab({ programs, which }: ProgramsTabProps) {
  if (which === "nova-industria") {
    const ni = programs?.nova_industria;
    if (!ni?.disponivel) return (
      <div className="bg-card border border-border rounded-xl p-8 text-center space-y-2">
        <p className="text-2xl">🏭</p>
        <p className="text-sm text-muted-foreground">Nova Indústria Brasil não identificada para este tema.</p>
        <a href="https://www.gov.br/mdic/pt-br/assuntos/nova-industria-brasil" target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ExternalLink className="w-3 h-3" /> Site oficial
        </a>
      </div>
    );
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">🏭 Nova Indústria Brasil</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Política industrial 2024–2026 — MDIC</p>
            </div>
            <a href={ni.fonte_oficial} target="_blank" rel="noopener noreferrer"
               className="text-[10px] text-primary hover:underline flex items-center gap-1 flex-shrink-0">
              <ExternalLink className="w-3 h-3" /> Site oficial
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-xl font-bold font-mono text-primary">{ni.meta_total}</p>
              <p className="text-[10px] text-muted-foreground">investimento previsto</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xl font-bold font-mono text-foreground">{ni.prazo}</p>
              <p className="text-[10px] text-muted-foreground">horizonte do plano</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(ni.missoes || []).map((m: any) => {
              const isRel = ni.missoes_relevantes?.includes(m.id);
              return (
                <div key={m.id} className={`p-3 rounded-lg border ${isRel ? "border-primary/40 bg-primary/5" : "border-border/50 bg-muted/20"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{m.icone}</span>
                    <p className={`text-xs font-semibold ${isRel ? "text-primary" : "text-foreground"}`}>{m.nome}</p>
                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">{m.meta}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{m.descricao}</p>
                </div>
              );
            })}
          </div>
        </div>

        {ni.execucao_orcamentaria?.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Execução orçamentária 2024 — Função Indústria</h3>
            <div className="space-y-1.5">
              {ni.execucao_orcamentaria.slice(0, 6).map((e: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                  <span className="text-xs text-foreground truncate flex-1">{e.orgao}</span>
                  <div className="flex gap-3 flex-shrink-0 ml-2">
                    <span className="text-[10px] text-muted-foreground">emp: R$ {(e.empenhado/1e9).toFixed(1)}bi</span>
                    <span className="text-[10px] font-semibold text-primary">pago: R$ {(e.pago/1e9).toFixed(1)}bi</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground mt-2">Fonte: Portal da Transparência — Função Orçamentária 22</p>
          </div>
        )}

        {ni.pia_pessoal?.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Pessoal ocupado na indústria — PIA/IBGE</h3>
            <div className="space-y-1.5">
              {ni.pia_pessoal.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                  <span className="text-xs text-foreground truncate flex-1">{r.atividade}</span>
                  <span className="text-xs font-bold text-primary ml-2">{r.valor} {r.unidade}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {ni.bndes_datasets?.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">Dados BNDES — Nova Indústria</h3>
            <div className="space-y-1.5">
              {ni.bndes_datasets.slice(0, 4).map((d: any, i: number) => (
                <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-between px-3 py-2 border border-border/50 rounded-lg hover:border-border transition-colors">
                  <span className="text-xs text-foreground truncate flex-1">{d.titulo}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 ml-2" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (which === "pbia") {
    const pbia = programs?.pbia;
    if (!pbia?.disponivel) return (
      <div className="bg-card border border-border rounded-xl p-8 text-center space-y-2">
        <p className="text-2xl">🤖</p>
        <p className="text-sm text-muted-foreground">PBIA não identificado para este tema.</p>
        <a href="https://www.gov.br/mcti" target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ExternalLink className="w-3 h-3" /> MCTI
        </a>
      </div>
    );
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">🤖 Plano Brasileiro de Inteligência Artificial</h3>
              <p className="text-xs text-muted-foreground mt-0.5">PBIA 2024–2028 — MCTI</p>
            </div>
            <a href={pbia.fonte_oficial} target="_blank" rel="noopener noreferrer"
               className="text-[10px] text-primary hover:underline flex items-center gap-1 flex-shrink-0">
              <ExternalLink className="w-3 h-3" /> Site oficial
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-xl font-bold font-mono text-primary">{pbia.meta_total}</p>
              <p className="text-[10px] text-muted-foreground">investimento previsto</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xl font-bold font-mono text-foreground">{pbia.prazo}</p>
              <p className="text-[10px] text-muted-foreground">horizonte do plano</p>
            </div>
          </div>
          <div className="space-y-2">
            {(pbia.eixos || []).map((e: any) => (
              <div key={e.id} className="flex items-start gap-3 p-3 border border-border/50 rounded-lg">
                <span className="text-lg flex-shrink-0">{e.icone}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">{e.nome}</p>
                    <span className="text-[10px] font-mono text-primary flex-shrink-0">{e.valor}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{e.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href={pbia.infraestrutura?.url} target="_blank" rel="noopener noreferrer"
             className="flex items-start gap-3 p-4 bg-card border border-primary/20 bg-primary/5 rounded-xl hover:border-primary/40 transition-colors">
            <span className="text-xl">🖥️</span>
            <div>
              <p className="text-xs font-semibold text-foreground">{pbia.infraestrutura?.nome}</p>
              <p className="text-[10px] text-muted-foreground">{pbia.infraestrutura?.capacidade} · {pbia.infraestrutura?.localizacao}</p>
            </div>
            <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0 mt-0.5" />
          </a>
          <a href={pbia.regulacao?.url} target="_blank" rel="noopener noreferrer"
             className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-colors">
            <span className="text-xl">⚖️</span>
            <div>
              <p className="text-xs font-semibold text-foreground">{pbia.regulacao?.pl}</p>
              <p className="text-[10px] text-muted-foreground">{pbia.regulacao?.status}</p>
            </div>
            <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0 mt-0.5" />
          </a>
        </div>

        {pbia.convenios_ti?.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Convênios de IA identificados — Transparência ({pbia.convenios_ti.length})</h3>
            <div className="space-y-2">
              {pbia.convenios_ti.slice(0, 6).map((c: any, i: number) => (
                <div key={i} className="p-3 border border-border/50 rounded-lg">
                  <p className="text-xs font-medium text-foreground line-clamp-2">{c.objeto}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {c.convenente && <span className="text-[10px] text-muted-foreground">{c.convenente}</span>}
                    {c.uf && <span className="text-[10px] font-mono bg-muted px-1 rounded">{c.uf}</span>}
                    {c.valor > 0 && <span className="text-[10px] font-semibold text-primary">R$ {(c.valor/1e6).toFixed(2)}M</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pbia.mcti_execucao?.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Execução MCTI 2024 — Ciência e Tecnologia</h3>
            <div className="space-y-1.5">
              {pbia.mcti_execucao.slice(0, 6).map((e: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                  <span className="text-xs text-foreground truncate flex-1">{e.orgao}</span>
                  <span className="text-[10px] font-semibold text-primary ml-2">R$ {(e.pago/1e6).toFixed(0)}M</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // fomento
  const fom = programs?.fomento;
  if (!fom?.disponivel) return <p className="text-sm text-muted-foreground text-center py-8">Dados de fomento não disponíveis.</p>;
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Agências de fomento — execução 2024</h3>
        <div className="space-y-2">
          {fom.instituicoes?.map((inst: any) => {
            const exec = fom.execucao_2024?.find((e: any) => e.sigla === inst.sigla);
            return (
              <a key={inst.sigla} href={inst.url} target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-between px-3 py-3 border border-border/50 rounded-lg hover:border-border transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">{inst.sigla}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{inst.nome}</span>
                  </div>
                  {exec && exec.pago_2024 > 0 && (
                    <p className="text-[10px] text-emerald-500 mt-0.5">Executado 2024: R$ {(exec.pago_2024/1e9).toFixed(2)}bi</p>
                  )}
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 ml-2" />
              </a>
            );
          })}
        </div>
      </div>

      {fom.convenios_fomento?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Convênios de fomento no tema ({fom.convenios_fomento.length})</h3>
          <div className="space-y-2">
            {fom.convenios_fomento.slice(0, 8).map((c: any, i: number) => (
              <div key={i} className="p-3 border border-border/50 rounded-lg">
                <p className="text-xs font-medium text-foreground line-clamp-2">{c.objeto}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {c.concedente && <span className="text-[10px] font-semibold text-primary">{c.concedente}</span>}
                  {c.convenente && <span className="text-[10px] text-muted-foreground truncate">{c.convenente}</span>}
                  {c.uf && <span className="text-[10px] font-mono bg-muted px-1 rounded">{c.uf}</span>}
                  {c.valor > 0 && <span className="text-[10px] font-semibold text-emerald-500">R$ {(c.valor/1e6).toFixed(2)}M</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Links úteis — Editais e chamadas</h3>
        <div className="space-y-1.5">
          {fom.links_uteis?.map((l: any, i: number) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-between px-3 py-2 border border-border/50 rounded-lg hover:border-border transition-colors">
              <span className="text-xs text-foreground">{l.nome}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            </a>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-muted-foreground text-center">Fontes: Portal da Transparência · CNPq · CAPES · FINEP · dados.gov.br</p>
    </div>
  );
}

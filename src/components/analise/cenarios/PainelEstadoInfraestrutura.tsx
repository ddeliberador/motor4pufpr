import { Cable, Network, Server, Zap, TriangleAlert, ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ESTADOS } from "@/lib/sistemasEstaduais";
import { apontamentosInfra, fraseBalanco, type EstadoCruzamento } from "@/lib/cruzamentoInfra";

export interface DetalheInfra {
  energia: { rotulo: string; valor: string }[];
  conectividade: { rotulo: string; valor: string }[];
  datacenters: { nome: string; cidade: string; org: string }[] | null;
}

export default function PainelEstadoInfraestrutura({ estado, detalhe, onClose }: { estado: EstadoCruzamento | null; detalhe: DetalheInfra | null; onClose: () => void }) {
  const sinais = estado ? apontamentosInfra(estado) : [];
  return <Dialog open={estado != null} onOpenChange={open => !open && onClose()}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto p-5 sm:p-6">
      <DialogHeader className="pr-6 text-left">
        <DialogTitle className="text-2xl leading-tight">{estado && ESTADOS[estado.uf]} · Infraestrutura de IA</DialogTitle>
        <DialogDescription>{estado?.situacao ?? "Balanço indisponível"} · {fraseBalanco(estado?.razao ?? null)}. Referência Brasil: {estado?.brasil == null ? "indisponível" : `${estado.brasil.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}×`}.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-5 md:grid-cols-3">
        {[{ nome: "Energia", icon: Zap, itens: detalhe?.energia ?? [] }, { nome: "Conectividade física", icon: Cable, itens: detalhe?.conectividade ?? [] }, { nome: "Processamento", icon: Server, itens: [{ rotulo: "Datacenters e pontos de troca de tráfego", valor: estado?.dc == null ? "indisponível" : String(estado.dc) }] }].map(b => <section key={b.nome} className="min-w-0 border-t-2 border-primary pt-3">
          <h3 className="flex items-center gap-2 text-base font-bold"><b.icon className="h-4 w-4 text-primary" />{b.nome}</h3>
          <dl className="mt-3 space-y-3">{b.itens.map(m => <div key={m.rotulo}><dt className="text-xs text-muted-foreground">{m.rotulo}</dt><dd className="mt-1 break-words text-sm font-semibold">{m.valor}</dd></div>)}</dl>
        </section>)}
      </div>
      <section className="border-t border-border pt-4">
        <h3 className="text-lg font-bold">Pontos críticos e possibilidades de investimento</h3>
        <div className="mt-3 divide-y divide-border">{sinais.map(s => <div key={s.camada} className="py-4">
          <p className={`flex items-center gap-2 text-sm font-semibold ${s.tipo === "Possibilidade" ? "text-[hsl(var(--energia-exporta))]" : s.tipo === "Atenção" ? "text-[hsl(var(--energia-depende))]" : "text-muted-foreground"}`}>{s.tipo === "Possibilidade" ? <ArrowUpRight size={18} /> : <TriangleAlert size={18} />}{s.camada} · {s.tipo}</p>
          <p className="mt-2 text-sm font-medium">{s.evidencia}</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.acao}</p>
        </div>)}</div>
      </section>
      <details className="border-t border-border pt-3"><summary className="cursor-pointer text-sm font-semibold">Instalações registradas no estado ({estado?.dc ?? "indisponível"})</summary>
        {detalhe?.datacenters == null ? <p className="mt-3 text-sm text-muted-foreground">Fonte indisponível.</p> : detalhe.datacenters.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhuma instalação registrada na fonte para este estado.</p> : <ul className="mt-3 divide-y divide-border">{detalhe.datacenters.map((d, i) => <li key={`${d.nome}-${i}`} className="py-2 text-sm"><strong>{d.nome}</strong><p className="text-xs text-muted-foreground">{d.cidade} · {d.org}</p></li>)}</ul>}
      </details>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Network size={16} className="shrink-0" />Fontes: EPE (balanço e demanda), ANEEL (usinas), ANATEL (backhaul), TeleGeography (cabos) e PeeringDB (instalações). Os apontamentos são triagens a partir dessas bases, não estudos de viabilidade; exigem verificar capacidade elétrica local, custos, licenciamento, disponibilidade de água, latência e demanda.</p>
    </DialogContent>
  </Dialog>;
}
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { carregarAtoresCelula, type AtorClassificado, CATEGORIAS_ESTADUAIS } from "@/lib/sistemasEstaduais";

export default function AtoresEstaduaisDialog({ uf, categoria, camada, camadaNome, onClose }: { uf: string; categoria: string; camada: string; camadaNome: string; onClose: () => void }) {
  const [atores, setAtores] = useState<AtorClassificado[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  useEffect(() => {
    let ativo = true;
    carregarAtoresCelula(uf, categoria, camada).then(a => { if (ativo) setAtores(a); }).catch(e => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [uf, categoria, camada]);
  const tamanho = 25;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto">
    <DialogTitle>{CATEGORIAS_ESTADUAIS.find(c => c.id === categoria)?.nome} · {camadaNome} · {uf}</DialogTitle>
    <DialogDescription>{atores ? `${atores.length.toLocaleString("pt-BR")} atores` : "Consultando atores e regras de classificação…"}</DialogDescription>
    {erro ? <p role="alert" className="text-destructive">Falha ao carregar atores: {erro}</p> : !atores ? <p className="py-8 text-muted-foreground">Carregando…</p> : <>
      {atores.length === 0 && <p className="py-6 text-muted-foreground">Nenhum ator nesta categoria e camada.</p>}
      <ul className="divide-y divide-border">{atores.slice(pagina * tamanho, (pagina + 1) * tamanho).map(a => <li key={a.ator_id} className="py-4">
        <div className="flex flex-wrap items-center gap-2"><h4 className="font-bold">{a.nome ?? "Nome não informado"}</h4>{a.uf_origem?.startsWith("inferida") && <span className="rounded border border-border bg-muted px-2 py-0.5 text-xs" title={a.uf_origem}>UF {a.uf_origem}</span>}</div>
        <p className="mt-1 text-sm text-muted-foreground">{a.tipo ?? "Tipo não informado"} · {a.municipio ?? "Município não informado"} · {a.fonte}</p>
        {a.regras.length ? a.regras.map(r => <dl key={`${r.regra_id}-${r.camada}`} className="mt-2 grid gap-1 text-sm sm:grid-cols-[120px_1fr]">
          <dt className="text-muted-foreground">Regra</dt><dd>{r.regra_id}</dd><dt className="text-muted-foreground">Evidência</dt><dd className="break-words">{r.evidencia ?? "Não informada"}</dd><dt className="text-muted-foreground">Confiança</dt><dd>{r.confianca ?? "Não informada"}</dd>
        </dl>) : <p className="mt-2 text-sm text-muted-foreground">Sem regra de camada atribuída; evidência e confiança não se aplicam.</p>}
      </li>)}</ul>
      {atores.length > tamanho && <div className="flex items-center justify-between border-t border-border pt-3">
        <Button variant="outline" size="icon" aria-label="Página anterior" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}><ChevronLeft /></Button>
        <span className="text-sm">Página {pagina + 1} de {Math.ceil(atores.length / tamanho)}</span>
        <Button variant="outline" size="icon" aria-label="Próxima página" disabled={(pagina + 1) * tamanho >= atores.length} onClick={() => setPagina(p => p + 1)}><ChevronRight /></Button>
      </div>}
    </>}
  </DialogContent></Dialog>;
}
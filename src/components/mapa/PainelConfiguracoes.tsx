// Painel de configurações do Mapa (engrenagem na barra superior), no espírito
// do painel "Settings" do Global Election Simulator: aparência, fundo
// cartográfico, nomes de lugares, malha municipal, link do mapa e exportação.

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { FUNDOS, type FundoId } from "@/components/mapa/maplibre/fundos";
import type { Tema } from "@/lib/tema";

export interface ConfiguracoesMapa {
  tema: Tema;
  fundo: FundoId;
  mostrarNomes: boolean;
  malhaMunicipal: boolean;
}

interface Props {
  config: ConfiguracoesMapa;
  onConfig: (c: ConfiguracoesMapa) => void;
  onFechar: () => void;
  /** Monta a URL que reproduz o mapa atual. */
  linkDoMapa: () => string;
  onSalvarPng: () => Promise<void>;
  onSalvarPdf: () => Promise<void>;
  urlIssues: string;
}

function Opcoes<T extends string>({ valor, opcoes, onEscolher }: { valor: T; opcoes: { id: T; rotulo: string; titulo?: string }[]; onEscolher: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.titulo}
          aria-pressed={valor === o.id}
          onClick={() => onEscolher(o.id)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
            valor === o.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

const Secao = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <div>
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{titulo}</p>
    {children}
  </div>
);

export default function PainelConfiguracoes({ config, onConfig, onFechar, linkDoMapa, onSalvarPng, onSalvarPdf, urlIssues }: Props) {
  const [copiado, setCopiado] = useState(false);
  const [exportando, setExportando] = useState<"png" | "pdf" | null>(null);
  const set = <K extends keyof ConfiguracoesMapa>(k: K, v: ConfiguracoesMapa[K]) => onConfig({ ...config, [k]: v });

  const copiar = async () => {
    const url = linkDoMapa();
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copie o link do mapa:", url);
    }
  };
  const exportar = async (tipo: "png" | "pdf") => {
    setExportando(tipo);
    try { await (tipo === "png" ? onSalvarPng() : onSalvarPdf()); } finally { setExportando(null); }
  };

  return (
    <aside className="absolute inset-y-0 right-0 z-30 flex w-full max-w-xs flex-col border-l border-border bg-background shadow-xl" role="dialog" aria-label="Configurações do mapa">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-bold">Configurações</p>
        <button type="button" onClick={onFechar} aria-label="Fechar configurações" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <Secao titulo="Aparência">
          <Opcoes valor={config.tema} onEscolher={(v) => set("tema", v)} opcoes={[{ id: "claro", rotulo: "Claro" }, { id: "escuro", rotulo: "Escuro" }]} />
        </Secao>
        <Secao titulo="Fundo do mapa">
          <Opcoes valor={config.fundo} onEscolher={(v) => set("fundo", v)} opcoes={FUNDOS.map((f) => ({ id: f.id, rotulo: f.rotulo, titulo: f.descricao }))} />
          <p className="mt-1.5 text-[11px] text-muted-foreground">{FUNDOS.find((f) => f.id === config.fundo)?.descricao}</p>
        </Secao>
        <Secao titulo="Nomes de lugares">
          <Opcoes valor={config.mostrarNomes ? "sim" : "nao"} onEscolher={(v) => set("mostrarNomes", v === "sim")} opcoes={[{ id: "sim", rotulo: "Mostrar" }, { id: "nao", rotulo: "Ocultar" }]} />
          <p className="mt-1.5 text-[11px] text-muted-foreground">Só nos fundos Claro e Escuro; o fundo sóbrio não tem rótulos.</p>
        </Secao>
        <Secao titulo="Malha municipal">
          <Opcoes valor={config.malhaMunicipal ? "sim" : "nao"} onEscolher={(v) => set("malhaMunicipal", v === "sim")} opcoes={[{ id: "sim", rotulo: "Ao aproximar" }, { id: "nao", rotulo: "Nunca" }]} />
          <p className="mt-1.5 text-[11px] text-muted-foreground">Divisas dos 5.570 municípios (IBGE), carregadas por estado quando o zoom passa de um certo ponto.</p>
        </Secao>
        <Secao titulo="Seu mapa, como link">
          <button type="button" onClick={copiar} className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted">
            {copiado ? <><Check className="h-3.5 w-3.5 text-emerald-500" /> Link copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar link deste mapa</>}
          </button>
          <p className="mt-1.5 text-[11px] text-muted-foreground">O link guarda a aba, o estado em foco, as categorias e as camadas de IA ligadas e o fundo. Quem abrir vê o mesmo mapa e pode continuar editando sem alterar o seu.</p>
        </Secao>
        <Secao titulo="Salvar esta vista">
          <div className="flex gap-1.5">
            <button type="button" disabled={!!exportando} onClick={() => exportar("png")} className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {exportando === "png" ? "Gerando…" : "Salvar imagem"}
            </button>
            <button type="button" disabled={!!exportando} onClick={() => exportar("pdf")} className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50">
              {exportando === "pdf" ? "Gerando…" : "Baixar PDF"}
            </button>
          </div>
        </Secao>
        <Secao titulo="Encontrou um problema?">
          <a href={urlIssues} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Relatar no GitHub do projeto</a>
        </Secao>
      </div>
    </aside>
  );
}

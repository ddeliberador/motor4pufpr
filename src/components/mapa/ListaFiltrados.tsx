// Lista expansível dos registros que estão visíveis no mapa (recorte filtrado),
// com todas as informações disponíveis na base e exportação em PDF.

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, FileDown, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIA_MAP, fonteLabel, type CategoriaKey } from "@/components/mapa/tipos";
import type { ResearchLocation } from "@/lib/researchLocations";
import { safeHttpUrl } from "@/lib/utils";

type Item = ResearchLocation & { categoria: CategoriaKey };

const PAGINA = 50;

const REGIAO_POR_UF: Record<string, string> = {
  AC: "Norte", AM: "Norte", AP: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste",
  PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

/** Rótulos legíveis para os campos guardados em raw_metadata. */
const META_LABEL: Record<string, string> = {
  segmento: "Segmento",
  instituicao: "Instituição vinculada",
  vinculo: "Vínculo",
  nivel: "Nível",
  ano_criacao: "Ano de criação",
  website: "Site",
  city: "Cidade (registro original)",
  institution_type: "Tipo no registro original",
  sede: "Sede",
  coordenador: "Coordenação",
  contato: "Contato",
  descricao: "Descrição",
  razao_social_pdf: "Razão social (documento oficial)",
  works_count: "Publicações registradas",
  cited_by_count: "Citações registradas",
  ror: "Identificador ROR",
  display_name: "Nome no registro original",
  type: "Tipo no registro original",
  origem: "Origem do registro",
  motivo: "Observação",
  aviso: "Observação",
  nota_coordenada: "Observação sobre a coordenada",
};

const OCULTOS = new Set([
  "tipo_coleta", "coletado_fora_do_motor", "coordenadas", "geo", "id", "uf",
  "uf_state", "slug", "origem_planilha", "lista_parcial", "sem_coordenada_exata",
  "endereco_enriquecido_por", "ativo", "coordenadores",
]);

function metaVisivel(l: Item): [string, string][] {
  const meta = l.raw_metadata || {};
  return Object.entries(meta)
    .filter(([k, v]) => !OCULTOS.has(k) && v != null && typeof v !== "object" && String(v).trim())
    .map(([k, v]) => [META_LABEL[k] || k.replace(/_/g, " "), String(v)] as [string, string]);
}

const enderecoDe = (l: Item) =>
  [l.municipio, l.uf].filter(Boolean).join(" / ") || "não informado";

interface Props {
  itens: Item[];
  filtrosAtivos: string[];
  total: number;
  /** Quando definido, o componente vira um painel flutuante controlado. */
  aberto?: boolean;
  onFechar?: () => void;
  pontoSelecionadoId?: string | null;
  onSelecionarPonto?: (id: string | null) => void;
  /** Total de locais sobrepostos no ícone clicado no mapa (recorte de grupo). */
  grupoTotal?: number | null;
  onLimparGrupo?: () => void;
}

export default function ListaFiltrados({
  itens,
  filtrosAtivos,
  total,
  aberto: abertoProp,
  onFechar,
  pontoSelecionadoId,
  onSelecionarPonto,
  grupoTotal,
  onLimparGrupo,
}: Props) {
  const [abertoLocal, setAbertoLocal] = useState(false);
  const aberto = abertoProp !== undefined ? abertoProp : abertoLocal;
  const setAberto = abertoProp !== undefined ? onFechar || (() => {}) : setAbertoLocal;

  const [limite, setLimite] = useState(PAGINA);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Ao selecionar no mapa, apenas destaca e rola até o item — sem abrir o detalhamento.
  useEffect(() => {
    if (!pontoSelecionadoId) return;
    const idx = itens.findIndex((l) => l.id === pontoSelecionadoId);
    if (idx < 0) return;
    if (idx + 1 > limite) setLimite(Math.ceil((idx + 1) / PAGINA) * PAGINA);
    const t = setTimeout(() => {
      rowRefs.current[pontoSelecionadoId]?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 120);
    return () => clearTimeout(t);
  }, [pontoSelecionadoId, itens, limite]);

  const visiveis = useMemo(() => itens.slice(0, limite), [itens, limite]);

  const exportarPdf = async () => {
    setGerando(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
      const M = 36;
      const W = doc.internal.pageSize.getWidth() - M * 2;
      const H = doc.internal.pageSize.getHeight();

      // Capa / cabeçalho institucional
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Mapa da Inovação — recorte filtrado", M, M + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        "Motor da Inovação · UFPR/PPGPP · Pesquisa Colaborativa do Mapa da Inovação",
        M,
        M + 20,
      );
      doc.setFontSize(8.5);
      doc.setTextColor(90);
      doc.text(
        `Emitido em ${new Date().toLocaleString("pt-BR")} · ${itens.length.toLocaleString(
          "pt-BR",
        )} de ${total.toLocaleString("pt-BR")} registros da base`,
        M,
        M + 34,
      );
      const resumo = filtrosAtivos.length
        ? `Filtros aplicados: ${filtrosAtivos.join(" · ")}`
        : "Filtros aplicados: nenhum (base completa)";
      const linhasResumo = doc.splitTextToSize(resumo, W);
      doc.text(linhasResumo, M, M + 47);
      doc.setTextColor(0);

      let y = M + 47 + linhasResumo.length * 10 + 12;

      // Tabela
      const cols = [
        { t: "#", w: 26 },
        { t: "Nome", w: 210 },
        { t: "Tipo", w: 130 },
        { t: "Município / UF", w: 110 },
        { t: "Região", w: 62 },
        { t: "CNPJ", w: 92 },
        { t: "Coordenadas", w: 92 },
        { t: "Base de origem", w: 148 },
      ];
      const larguraTotal = cols.reduce((s, c) => s + c.w, 0);
      const escala = W / larguraTotal;
      const larguras = cols.map((c) => c.w * escala);

      const cabecalho = () => {
        doc.setFillColor(238, 240, 243);
        doc.rect(M, y - 11, W, 16, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.6);
        let x = M + 3;
        cols.forEach((c, i) => {
          doc.text(c.t, x, y);
          x += larguras[i];
        });
        y += 12;
        doc.setFont("helvetica", "normal");
      };

      cabecalho();

      itens.forEach((l, i) => {
        const celulas = [
          String(i + 1),
          l.nome,
          l.tipo,
          enderecoDe(l),
          (l.uf && REGIAO_POR_UF[l.uf]) || "—",
          l.cnpj || "—",
          l.latitude != null && l.longitude != null
            ? `${Number(l.latitude).toFixed(4)}, ${Number(l.longitude).toFixed(4)}`
            : "sem coordenada",
          fonteLabel(l.fonte),
        ];
        doc.setFontSize(7.4);
        const quebradas = celulas.map((txt, idx) =>
          doc.splitTextToSize(txt, larguras[idx] - 6),
        );
        const altura = Math.max(...quebradas.map((q) => q.length)) * 8.6 + 5;

        if (y + altura > H - M - 14) {
          doc.addPage();
          y = M + 12;
          cabecalho();
        }
        if (i % 2 === 1) {
          doc.setFillColor(248, 249, 250);
          doc.rect(M, y - 8, W, altura, "F");
        }
        let x = M + 3;
        quebradas.forEach((q, idx) => {
          doc.text(q, x, y);
          x += larguras[idx];
        });
        y += altura;
      });

      // Rodapé com numeração e nota de procedência
      const paginas = doc.getNumberOfPages();
      for (let p = 1; p <= paginas; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.text(
          "Dados extraídos das bases públicas integradas ao Motor da Inovação; a base de origem consta em cada linha.",
          M,
          H - M + 12,
        );
        doc.text(`${p} / ${paginas}`, M + W - 30, H - M + 12);
      }

      doc.save("mapa-da-inovacao-recorte-filtrado.pdf");
    } catch (err) {
      toast.error("Falha ao gerar o PDF.");
      console.error(err);
    } finally {
      setGerando(false);
    }
  };

  const lista = (
    <>
      {grupoTotal != null && grupoTotal > 1 && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2">
          <span className="material-symbols-outlined mt-0.5 text-base leading-none text-primary" aria-hidden>
            layers
          </span>
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-medium">
              {itens.length.toLocaleString("pt-BR")} de {grupoTotal.toLocaleString("pt-BR")} locais
              sobrepostos neste ponto do mapa
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Escolha abaixo qual local você quer ver.
            </p>
          </div>
          {onLimparGrupo && (
            <button
              onClick={onLimparGrupo}
              className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted"
            >
              Ver todos
            </button>
          )}
        </div>
      )}

      {filtrosAtivos.length > 0 && (
        <p className="mb-3 text-xs text-muted-foreground">
          Filtros aplicados: {filtrosAtivos.join(" · ")}
        </p>
      )}

      {!itens.length ? (
        <p className="text-sm text-muted-foreground">
          Nenhum registro corresponde aos filtros selecionados.
        </p>
      ) : (
        <>
          <div className={`divide-y divide-border bg-card ${abertoProp !== undefined ? "lg:border-0" : "rounded-xl border border-border"}`}>
            {visiveis.map((l, i) => {
              const Icone = CATEGORIA_MAP[l.categoria]?.icon;
              const cor = CATEGORIA_MAP[l.categoria]?.cor || "";
              const href = safeHttpUrl(l.fonte_url);
              const aberta = expandido === l.id;
              const selecionada = pontoSelecionadoId === l.id;
              const extras = metaVisivel(l);
              return (
                <div
                  key={l.id}
                  ref={(el) => {
                    rowRefs.current[l.id] = el;
                  }}
                >
                  <button
                    onClick={() => {
                      const novo = aberta ? null : l.id;
                      setExpandido(novo);
                      onSelecionarPonto?.(novo);
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                      selecionada ? "bg-primary/15 ring-1 ring-primary/40" : aberta ? "bg-primary/5 ring-1 ring-primary/30" : ""
                    }`}
                  >
                    <span className="mt-0.5 w-8 shrink-0 font-mono text-[11px] text-muted-foreground">
                      {i + 1}
                    </span>
                    {Icone && (
                      <span
                        className={`material-symbols-outlined mt-0.5 shrink-0 text-base leading-none ${cor}`}
                        aria-hidden
                      >
                        {Icone}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{l.nome}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {l.tipo} · {enderecoDe(l)} · {fonteLabel(l.fonte)}
                      </span>
                    </span>
                    <ChevronDown
                      className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                        aberta ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {aberta && (
                    <div className="border-t border-border/60 bg-gradient-to-b from-muted/30 to-muted/10 px-4 py-4">
                      {/* Cabeçalho do card */}
                      <div className="mb-4 flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          {Icone && (
                            <span className={`material-symbols-outlined text-xl leading-none ${cor}`} aria-hidden>
                              {Icone}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground leading-tight">{l.nome}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              {l.tipo}
                            </span>
                            {l.uf && REGIAO_POR_UF[l.uf] && (
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {REGIAO_POR_UF[l.uf]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Grid de informações */}
                      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                        {/* Localização */}
                        <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/40">
                          <span className="material-symbols-outlined text-base leading-none text-muted-foreground w-4 text-center" aria-hidden>location_on</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Município / UF</p>
                            <p className="text-xs text-foreground mt-0.5">{enderecoDe(l)}</p>
                          </div>
                        </div>

                        {/* CNPJ */}
                        <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/40">
                          <span className="material-symbols-outlined text-base leading-none text-muted-foreground w-4 text-center" aria-hidden>badge</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">CNPJ</p>
                            <p className="text-xs text-foreground mt-0.5 font-mono">{l.cnpj || "não informado"}</p>
                          </div>
                        </div>

                        {/* Coordenadas */}
                        {l.latitude != null && l.longitude != null && (
                          <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/40">
                            <span className="material-symbols-outlined text-base leading-none text-muted-foreground w-4 text-center" aria-hidden>my_location</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Coordenadas</p>
                              <p className="text-xs text-foreground mt-0.5 font-mono">
                                {Number(l.latitude).toFixed(5)}, {Number(l.longitude).toFixed(5)}
                              </p>
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${l.latitude},${l.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-[10px] text-primary hover:underline flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-sm leading-none" aria-hidden>open_in_new</span>
                            </a>
                          </div>
                        )}

                        {/* Base de origem */}
                        <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/40">
                          <span className="material-symbols-outlined text-base leading-none text-muted-foreground w-4 text-center" aria-hidden>database</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Base de origem</p>
                            <p className="text-xs text-foreground mt-0.5">{fonteLabel(l.fonte)}</p>
                          </div>
                        </div>

                        {/* Data da coleta */}
                        <div className={`flex items-center gap-3 px-3 py-2.5 ${extras.length > 0 || href ? "border-b border-border/40" : ""}`}>
                          <span className="material-symbols-outlined text-base leading-none text-muted-foreground w-4 text-center" aria-hidden>calendar_today</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data da coleta</p>
                            <p className="text-xs text-foreground mt-0.5">
                              {l.data_coleta
                                ? new Date(l.data_coleta).toLocaleDateString("pt-BR")
                                : "não informada"}
                            </p>
                          </div>
                        </div>

                        {/* Campos extras do raw_metadata */}
                        {extras.map(([k, v], idx) => (
                          <div key={k} className={`flex items-start gap-3 px-3 py-2.5 ${idx < extras.length - 1 || href ? "border-b border-border/40" : ""}`}>
                            <span className="material-symbols-outlined text-base leading-none text-muted-foreground w-4 text-center mt-0.5" aria-hidden>info</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</p>
                              <p className="text-xs text-foreground mt-0.5 break-words">{v}</p>
                            </div>
                          </div>
                        ))}

                        {/* Link da fonte */}
                        {href && (
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            <span className="material-symbols-outlined text-base leading-none text-muted-foreground w-4 text-center" aria-hidden>link</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fonte</p>
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-0.5 block break-all text-xs text-primary hover:underline"
                              >
                                {href}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {limite < itens.length && (
            <button
              onClick={() => setLimite((n) => n + PAGINA * 4)}
              className="mt-3 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
            >
              Mostrar mais ({(itens.length - limite).toLocaleString("pt-BR")} restantes)
            </button>
          )}
        </>
      )}
    </>
  );

  // No celular, painel inferior. No desktop, coluna fixa que reduz a área do mapa.
  if (abertoProp !== undefined) {
    if (!aberto) return null;
    return (
      <div
        className="absolute inset-x-0 bottom-0 top-[6.75rem] z-20 flex flex-col overflow-hidden rounded-t-xl border border-border/60 bg-card/95 shadow-lg backdrop-blur-md transition-[width,background-color] duration-300 hover:bg-card focus-within:bg-card lg:static lg:z-auto lg:h-full lg:w-96 lg:shrink-0 lg:rounded-none lg:border-0 lg:border-l lg:border-border lg:bg-card lg:shadow-none lg:backdrop-blur-none"
        role="dialog"
        aria-label="Listagem filtrada"
      >
        {/* Barra de ações: fora da lista, servindo à listagem */}
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/60 bg-card/90 px-4 py-3 backdrop-blur-sm lg:bg-card lg:backdrop-blur-none">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Listagem filtrada</p>
            <p className="text-[11px] text-muted-foreground">
              {itens.length.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")} registros
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={exportarPdf}
              disabled={!itens.length || gerando}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background/90 px-3 py-1.5 text-[11px] font-medium shadow-sm transition-colors hover:bg-muted disabled:opacity-40"
              title="Exportar listagem em PDF"
            >
              {gerando ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <FileDown className="h-3 w-3" />
              )}
              PDF
            </button>
            <button
              onClick={onFechar}
              aria-label="fechar listagem"
              title="Recolher listagem"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/90 shadow-sm transition-colors hover:bg-muted"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground lg:hidden" />
              <span className="material-symbols-outlined hidden text-base leading-none text-muted-foreground lg:inline" aria-hidden>
                chevron_right
              </span>
            </button>
          </div>
        </div>

        {/* Lista rolável */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-0">
          {lista}
        </div>
      </div>
    );
  }

  // Modo recolhível legado (embaixo do mapa)
  return (
    <div className="border-t border-border">
      <div className="container-wide flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <button
          onClick={() => setAberto((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
          Lista dos registros filtrados ({itens.length.toLocaleString("pt-BR")})
        </button>
        <button
          onClick={exportarPdf}
          disabled={!itens.length || gerando}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
        >
          {gerando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
          Exportar lista em PDF
        </button>
      </div>

      {aberto && <div className="container-wide px-6 pb-8">{lista}</div>}
    </div>
  );
}

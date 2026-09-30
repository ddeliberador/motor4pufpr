import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Cpu, Database, ExternalLink, Globe2, Map as MapIcon, Microscope } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCatalogo, detalhesDe, type Detalhes } from "@/lib/catalogo";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: "easeOut" as const },
  }),
};

type Recurso = { fonte: string; mantenedor: string; nacionalidade: string; uso: string; nota?: string | null };

type Camada = "Conhecimento" | "Tecnologia" | "Política" | "Internacional" | "Outras bases e modelos";

type FonteMotor = Recurso & {
  camada: Camada;
  url?: string;
};

const CAMADAS: Array<{ nome: Camada; titulo: string; descricao: string; icon: typeof Microscope }> = [
  { nome: "Conhecimento", titulo: "Camada do Conhecimento", descricao: "Ciência, formação, pesquisa e capacidade institucional.", icon: Microscope },
  { nome: "Tecnologia", titulo: "Camada da Tecnologia", descricao: "Patentes, emprego, empresas, código e maturidade tecnológica.", icon: Cpu },
  { nome: "Política", titulo: "Camada da Política", descricao: "Compras, orçamento, legislação, controle e instrumentos públicos.", icon: Building2 },
  { nome: "Internacional", titulo: "Camada Internacional", descricao: "Comércio exterior, dependência, capitais e referências globais.", icon: Globe2 },
  { nome: "Outras bases e modelos", titulo: "Fontes complementares e modelos", descricao: "Bases transversais, ecossistema de inovação e modelos usados pelo Motor.", icon: Database },
];

type BaseMapa = NonNullable<Detalhes["mapa_territorial"]>;
type BaseMapaComplementar = NonNullable<Detalhes["mapa_complementar"]>;

const ORDEM_CAMADAS: Camada[] = ["Conhecimento", "Tecnologia", "Política", "Internacional", "Outras bases e modelos"];

type Visao = "tudo" | "motor" | "mapa";

const OPCOES_VISAO: Array<{ valor: Visao; rotulo: string; icon: typeof Microscope }> = [
  { valor: "tudo", rotulo: "Tudo", icon: Database },
  { valor: "motor", rotulo: "Motor", icon: Microscope },
  { valor: "mapa", rotulo: "Mapa", icon: MapIcon },
];

const Bases = () => {
  const [visao, setVisao] = useState<Visao>("tudo");
  const { bases, erro } = useCatalogo();
  const lista = bases ?? [];
  const FONTES_MOTOR: (FonteMotor & { ativa: boolean })[] = lista.flatMap((b) => {
    const m = detalhesDe(b).motor;
    if (!m) return [];
    const camada = (ORDEM_CAMADAS.includes(m.camada as Camada) ? m.camada : "Outras bases e modelos") as Camada;
    return [{ fonte: m.fonte, mantenedor: b.mantenedor ?? "", nacionalidade: b.nacionalidade ?? "", uso: b.uso ?? "", nota: b.nota, camada, url: b.url ?? undefined, ativa: b.ativa }];
  });
  const BASES_MAPA: (BaseMapa & { ativa: boolean })[] = lista.flatMap((b) => {
    const m = detalhesDe(b).mapa_territorial;
    return m ? [{ ...m, ativa: b.ativa }] : [];
  });
  const BASES_MAPA_COMPLEMENTARES: (BaseMapaComplementar & { ativa: boolean })[] = lista.flatMap((b) => {
    const m = detalhesDe(b).mapa_complementar;
    return m ? [{ ...m, situacao: b.ativa ? m.situacao : "Desativada no catálogo", ativa: b.ativa }] : [];
  });
  const TOTAL_BASES_MAPA = BASES_MAPA.length + BASES_MAPA_COMPLEMENTARES.length;

  return (
  <div className="min-h-screen bg-background text-foreground">
    <Header />

    <main className="pt-24 pb-20">
      <section className="pb-14">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Database className="w-4 h-4" />
              Catálogo de dados
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Bases</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
              Fontes públicas consultadas pelo Motor e bases territoriais que alimentam o Mapa da Inovação.
            </p>
            <div className="inline-flex items-center gap-1 p-1 bg-card border border-border rounded-full" role="tablist" aria-label="Selecionar catálogo">
              {OPCOES_VISAO.map(({ valor, rotulo, icon: Icon }) => (
                <button
                  key={valor}
                  role="tab"
                  aria-selected={visao === valor}
                  onClick={() => setVisao(valor)}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors ${visao === valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                >
                  <Icon className="w-4 h-4" />
                  {rotulo}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {erro && <p role="alert" className="max-w-3xl mx-auto px-6 pb-8 text-center text-sm text-destructive">Não foi possível carregar o catálogo: {erro}</p>}
      {!bases && !erro && <p className="text-center text-sm text-muted-foreground pb-8">Carregando catálogo…</p>}

      {visao !== "mapa" && (
      <section className="py-16 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">Bases do Motor</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto">
              Catálogo consolidado das fontes e modelos usados nas quatro camadas analíticas, sem repetir entradas equivalentes.
            </motion.p>

            <div className="space-y-8">
              {CAMADAS.map((camada, indice) => {
                const fontes = FONTES_MOTOR.filter((fonte) => fonte.camada === camada.nome);
                return (
                  <motion.section key={camada.nome} variants={fadeUp} custom={indice + 2} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="flex items-start gap-3 p-5 border-b border-border bg-muted/30">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <camada.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{camada.titulo}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{camada.descricao}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left bg-muted/20">
                            <th scope="col" className="px-4 py-3 font-semibold">Fonte</th>
                            <th scope="col" className="px-4 py-3 font-semibold">Mantenedor</th>
                            <th scope="col" className="px-4 py-3 font-semibold">Nacionalidade</th>
                            <th scope="col" className="px-4 py-3 font-semibold min-w-[280px]">Uso no Motor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fontes.map((fonte) => (
                            <tr key={fonte.fonte} className="border-t border-border align-top">
                              <td className="px-4 py-3 font-medium whitespace-nowrap">
                                {fonte.url ? (
                                  <a href={fonte.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
                                    {fonte.fonte}<ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : fonte.fonte}
                                {!fonte.ativa && <span className="block text-[10px] font-normal text-destructive mt-1">desativada no catálogo</span>}
                                {fonte.nota && <span className="block text-[10px] font-normal text-muted-foreground mt-1">{fonte.nota}</span>}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{fonte.mantenedor}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${fonte.nacionalidade === "Nacional" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                                  {fonte.nacionalidade}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground leading-relaxed">{fonte.uso}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.section>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {visao !== "motor" && (
      <section className="py-16 border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">Bases do Mapa ({TOTAL_BASES_MAPA})</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-10 max-w-3xl mx-auto">
              Catálogo completo das fontes territoriais, integrações analíticas e Camadas de IA. As medições históricas mantêm falhas explícitas.
            </motion.p>

            <h3 className="text-xl font-semibold mb-4">Bases territoriais de atores</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {BASES_MAPA.map((base, indice) => (
                <motion.article key={base.nome} variants={fadeUp} custom={indice + 2} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <a href={base.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold hover:text-primary transition-colors">
                        {base.nome}<ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <p className="text-xs text-muted-foreground mt-1">{base.responsavel}</p>
                      {!base.ativa && <p className="text-xs text-destructive mt-1">Desativada no catálogo</p>}
                    </div>
                    <span className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${base.vinculo === "Compartilhada" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {base.vinculo}
                    </span>
                  </div>
                  <div className="border-y border-border py-3 mb-3">
                    <p className="text-2xl font-bold">{base.registros}</p>
                    <p className="text-xs text-muted-foreground">registros ativos documentados</p>
                  </div>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="font-medium mb-1">Origem</dt>
                      <dd className="text-muted-foreground leading-relaxed">{base.origem}</dd>
                    </div>
                    <div>
                      <dt className="font-medium mb-1">Limitações conhecidas</dt>
                      <dd className="text-muted-foreground leading-relaxed">{base.limitacoes}</dd>
                    </div>
                  </dl>
                </motion.article>
              ))}
            </div>

            <div className="mt-12">
              <h3 className="text-xl font-semibold mb-2">Integrações complementares do Mapa</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Indicadores, financiamento, infraestrutura e enriquecimentos que complementam os atores territoriais sem duplicar as bases acima.
              </p>
              <div className="overflow-x-auto bg-card border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left bg-muted/30">
                      <th scope="col" className="px-4 py-3 font-semibold">Fonte</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Pilar</th>
                      <th scope="col" className="px-4 py-3 font-semibold min-w-[260px]">Medição documentada</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BASES_MAPA_COMPLEMENTARES.map((base) => (
                      <tr key={base.nome} className="border-t border-border align-top">
                        <td className="px-4 py-3">
                          <a href={base.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium hover:text-primary transition-colors">
                            {base.nome}<ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="block text-xs text-muted-foreground mt-1">{base.responsavel}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{base.pilar}</td>
                        <td className="px-4 py-3 text-muted-foreground">{base.medicao}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${base.situacao === "Ativa" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                            {base.situacao}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      )}
    </main>

    <Footer />
  </div>
  );
};

export default Bases;

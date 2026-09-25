import { ExternalLink, Mail, UserRound } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UfprLogo from "@/components/UfprLogo";

const equipe = [
  {
    funcao: "Doutorando",
    nome: "Decio Dalton Deliberador Filho",
    lattes: "https://lattes.cnpq.br/3225001061053583",
  },
  {
    funcao: "Orientador",
    nome: "Walter Tadahiro Shima",
    lattes: "http://lattes.cnpq.br/1832648887498998",
  },
  {
    funcao: "Coorientadora",
    nome: "Eunice Liu",
    lattes: "http://lattes.cnpq.br/8516802514551656",
  },
];

const Sobre = () => (
  <div className="min-h-screen flex flex-col bg-background text-foreground">
    <Header />

    <main className="flex-1 pt-16">
      <section className="border-b border-border bg-card">
        <div className="container-narrow py-14 md:py-20">
          <div className="flex items-start gap-5 md:gap-7">
            <UfprLogo className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary mb-3">
                UFPR · PPGPP
              </p>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">Sobre o projeto</h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                O Motor da Inovação é um projeto de doutorado acadêmico do Programa de
                Pós-Graduação em Políticas Públicas da Universidade Federal do Paraná.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-narrow py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.15fr_0.85fr] md:gap-14">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Pesquisa</h2>
            <p className="text-muted-foreground leading-relaxed mb-5">
              A pesquisa investiga como integrar dados públicos sobre pesquisa, produção,
              políticas e patentes para apoiar diagnósticos verificáveis do Sistema Nacional
              de Inovação brasileiro.
            </p>
            <dl className="border-y border-border divide-y divide-border text-sm">
              <div className="py-4">
                <dt className="text-muted-foreground mb-1">Instituição</dt>
                <dd className="font-medium">Universidade Federal do Paraná — UFPR</dd>
              </div>
              <div className="py-4">
                <dt className="text-muted-foreground mb-1">Programa</dt>
                <dd className="font-medium">Programa de Pós-Graduação em Políticas Públicas — PPGPP</dd>
              </div>
              <div className="py-4">
                <dt className="text-muted-foreground mb-1">Período</dt>
                <dd className="font-medium">Doutorado em Políticas Públicas · 2025–2028</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Equipe acadêmica</h2>
            <div className="border-y border-border divide-y divide-border">
              {equipe.map((pessoa) => (
                <div key={pessoa.funcao} className="py-4 flex items-start gap-3">
                  <UserRound className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                      {pessoa.funcao}
                    </p>
                    <p className="font-medium mb-1.5">{pessoa.nome}</p>
                    <a
                      href={pessoa.lattes}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-4"
                    >
                      Currículo Lattes
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <h2 className="text-xl font-semibold mb-3">Contato</h2>
          <a
            href="mailto:deciodeliberador@ufpr.br"
            className="inline-flex items-center gap-2 text-primary hover:underline underline-offset-4"
          >
            <Mail className="w-4 h-4" />
            deciodeliberador@ufpr.br
          </a>
        </div>
      </section>
    </main>

    <Footer />
  </div>
);

export default Sobre;
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Construction, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const MotorV2 = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="max-w-xl mx-auto px-6 text-center space-y-8">

          {/* Ícone */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
          </div>

          {/* Título */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-foreground">Motor da Inovação</h1>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/15 text-primary uppercase tracking-wide">v2 beta</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Nova interface em desenvolvimento. Mesmos dados, melhor navegabilidade —
              busca única com 4 perfis simultâneos, filtros laterais dinâmicos e resultados
              em grid fixo sem rolagem.
            </p>
          </div>

          {/* O que muda */}
          <div className="bg-card border border-border rounded-2xl p-6 text-left space-y-4">
            <p className="text-sm font-semibold text-foreground">O que muda na v2</p>
            <div className="space-y-3">
              {[
                {
                  titulo: "Busca única para todos os perfis",
                  desc: "Não é mais necessário escolher Gestor, Empresa, Pesquisador ou Universidade antes de buscar. Os 4 perfis aparecem como abas no resultado.",
                },
                {
                  titulo: "Filtros laterais dinâmicos",
                  desc: "Os filtros mudam conforme o perfil ativo — cada um mostra só o que é relevante para aquele olhar.",
                },
                {
                  titulo: "Grid fixo sem rolagem",
                  desc: "Todos os dados visíveis de uma vez. Sem rolagem vertical para descobrir o que existe — tudo em grid 2 colunas.",
                },
                {
                  titulo: "Todos os dados atuais preservados",
                  desc: "PNCP, OpenAlex, INPI, CAPES, CAGED, Lei do Bem, EMBRAPII, SIDRA, Patentes, Análise IA — nenhum dado é removido.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Construction className="w-4 h-4" />
            <span>Em construção · Homologação em andamento · UFPR · PPGPP</span>
          </div>

          {/* Link para o v1 */}
          <div>
            <p className="text-xs text-muted-foreground mb-3">Enquanto isso, o Motor v1 continua disponível:</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
            >
              Acessar Motor v1
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MotorV2;

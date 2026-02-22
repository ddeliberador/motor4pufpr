import { Link } from "react-router-dom";
import { Zap, BookOpen } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PersonaSelector from "@/components/mvp/PersonaSelector";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center pt-16">
        <div className="container-wide py-16 md:py-24">
          {/* Hero */}
          <div className="text-center mb-12 md:mb-16">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
              Qual é o seu papel no<br />Sistema de Inovação?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              O MOTOR 4P traduz objetos tecnológicos em redes verificáveis de incidência.
              Escolha sua perspectiva para começar.
            </p>
          </div>

          {/* Persona Cards */}
          <div className="max-w-4xl mx-auto mb-12">
            <PersonaSelector />
          </div>

          {/* Secondary Link */}
          <div className="text-center">
            <Link
              to="/camada-ausente"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <BookOpen className="w-4 h-4" />
              Conhecer o conceito do Motor 4P
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;

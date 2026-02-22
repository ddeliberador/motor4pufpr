import { Link } from "react-router-dom";
import { Zap, BookOpen, Activity } from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PersonaSelector from "@/components/mvp/PersonaSelector";
import { Suspense } from "react";
import ElectricScene from "@/components/home/ElectricScene";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "hsl(222 47% 6%)" }}>
      <Header />

      {/* 3D Electric Background */}
      <Suspense fallback={null}>
        <ElectricScene />
      </Suspense>

      <main className="flex-1 flex flex-col items-center justify-center pt-16 relative z-10">
        <div className="container-wide py-16 md:py-24">
          {/* Hero */}
          <div className="text-center mb-12 md:mb-16">
            {/* Animated icon with electric pulse */}
            <motion.div
              className="relative w-24 h-24 mx-auto mb-8"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.3 }}
            >
              {/* Pulse shockwaves */}
              {[1, 2, 3].map((ring) => (
                <motion.div
                  key={ring}
                  className="absolute inset-0 rounded-3xl border-2 border-primary/30"
                  animate={{
                    scale: [1, 2 + ring * 0.4],
                    opacity: [0.6, 0],
                    borderColor: ["hsl(var(--primary))", "hsl(var(--accent))"],
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: ring * 0.5 }}
                />
              ))}
              {/* Electric glow behind */}
              <motion.div
                className="absolute -inset-4 rounded-3xl"
                style={{
                  background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)",
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent flex items-center justify-center shadow-2xl shadow-primary/40">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Zap className="w-11 h-11 text-primary-foreground drop-shadow-lg" />
                </motion.div>
              </div>
            </motion.div>

            {/* Tagline */}
            <motion.div
              className="inline-flex items-center gap-2 px-5 py-2 mb-6 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-sm"
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Activity className="w-4 h-4 text-primary" />
              </motion.div>
              <span className="text-xs font-semibold text-blue-300 tracking-widest uppercase">
                Infraestrutura Pública de Inteligência
              </span>
              <motion.span
                className="w-2 h-2 rounded-full bg-accent shadow-lg shadow-accent/50"
                animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.div>

            <motion.h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight leading-[1.1]"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.7 }}
            >
              Qual é o seu papel no
              <br />
              <motion.span
                className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-[length:200%_auto] bg-clip-text text-transparent"
                animate={{ backgroundPosition: ["0% center", "200% center"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                Sistema de Inovação?
              </motion.span>
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl text-blue-200/70 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              O <span className="font-semibold text-white">MOTOR 4P</span> traduz objetos tecnológicos em redes verificáveis de incidência.
              <br className="hidden md:block" />
              Escolha sua perspectiva para começar.
            </motion.p>
          </div>

          {/* Persona Cards */}
          <motion.div
            className="max-w-4xl mx-auto mb-12"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.7 }}
          >
            <PersonaSelector />
          </motion.div>

          {/* Secondary Link */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <Link
              to="/camada-ausente"
              className="inline-flex items-center gap-2 text-sm text-blue-300/60 hover:text-blue-200 transition-colors group backdrop-blur-sm bg-white/5 px-4 py-2 rounded-full border border-white/10"
            >
              <BookOpen className="w-4 h-4" />
              Conhecer o conceito do Motor 4P
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;

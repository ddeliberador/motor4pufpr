import { Link } from "react-router-dom";
import { Zap, BookOpen, Activity } from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PersonaSelector from "@/components/mvp/PersonaSelector";
import { useEffect, useState } from "react";

/* ─── Particle field background ─── */
const PARTICLE_COUNT = 60;
const CONNECTION_DIST = 120;

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

const ParticleField = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [dimensions, setDimensions] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setDimensions({ w, h });
    setParticles(
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
      }))
    );
  }, []);

  useEffect(() => {
    let raf: number;
    const animate = () => {
      setParticles((prev) =>
        prev.map((p) => {
          let nx = p.x + p.vx;
          let ny = p.y + p.vy;
          if (nx < 0 || nx > dimensions.w) p.vx *= -1;
          if (ny < 0 || ny > dimensions.h) p.vy *= -1;
          return { ...p, x: nx, y: ny };
        })
      );
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [dimensions]);

  const connections: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONNECTION_DIST) {
        connections.push({
          x1: particles[i].x,
          y1: particles[i].y,
          x2: particles[j].x,
          y2: particles[j].y,
          opacity: 1 - dist / CONNECTION_DIST,
        });
      }
    }
  }

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      {connections.map((c, i) => (
        <line
          key={`l-${i}`}
          x1={c.x1}
          y1={c.y1}
          x2={c.x2}
          y2={c.y2}
          stroke="hsl(var(--primary))"
          strokeOpacity={c.opacity * 0.12}
          strokeWidth={0.5}
        />
      ))}
      {particles.map((p) => (
        <circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={p.size}
          fill="hsl(var(--primary))"
          fillOpacity={0.25}
        />
      ))}
    </svg>
  );
};

/* ─── Orbiting rings ─── */
const OrbitRings = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
    {[280, 400, 520].map((size, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full border border-primary/[0.06]"
        style={{ width: size, height: size }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30 + i * 15, repeat: Infinity, ease: "linear" }}
      >
        <motion.div
          className="absolute w-2 h-2 rounded-full bg-primary/30"
          style={{ top: -4, left: "50%", marginLeft: -4 }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2 + i, repeat: Infinity }}
        />
      </motion.div>
    ))}
  </div>
);

/* ─── Scanning line ─── */
const ScanLine = () => (
  <motion.div
    className="absolute left-0 right-0 h-px pointer-events-none"
    style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.15), transparent)" }}
    animate={{ top: ["0%", "100%", "0%"] }}
    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    aria-hidden
  />
);

/* ─── Glowing hex grid ─── */
const HexGrid = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
    <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
      <defs>
        <pattern id="hex" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(1.5)">
          <path
            d="M28 66L0 50V16L28 0L56 16V50L28 66Z M28 100L0 84V50L28 34L56 50V84L28 100Z"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" />
    </svg>
  </div>
);

/* ─── Floating data labels ─── */
const floatingLabels = ["CNPq", "INPI", "OpenAlex", "Finep", "COMEX", "CAPES", "Embrapii", "BNDES"];

const FloatingLabels = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
    {floatingLabels.map((label, i) => (
      <motion.div
        key={label}
        className="absolute text-[10px] font-mono tracking-wider text-primary/20 uppercase"
        style={{
          left: `${10 + (i % 4) * 25}%`,
          top: `${15 + Math.floor(i / 4) * 60}%`,
        }}
        animate={{
          y: [0, -10, 0],
          opacity: [0.15, 0.35, 0.15],
        }}
        transition={{
          duration: 4 + i * 0.5,
          repeat: Infinity,
          delay: i * 0.7,
        }}
      >
        {label}
      </motion.div>
    ))}
  </div>
);

/* ─── Main Component ─── */
const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <Header />

      {/* Background effects */}
      <ParticleField />
      <HexGrid />
      <OrbitRings />
      <ScanLine />
      <FloatingLabels />

      {/* Radial glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.06) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <main className="flex-1 flex flex-col items-center justify-center pt-16 relative z-10">
        <div className="container-wide py-16 md:py-24">
          {/* Hero */}
          <div className="text-center mb-12 md:mb-16">
            {/* Animated icon */}
            <motion.div
              className="relative w-20 h-20 mx-auto mb-8"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            >
              {/* Pulse rings */}
              {[1, 2, 3].map((ring) => (
                <motion.div
                  key={ring}
                  className="absolute inset-0 rounded-2xl border border-primary/20"
                  animate={{ scale: [1, 1.5 + ring * 0.3], opacity: [0.4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: ring * 0.6 }}
                />
              ))}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
                <Zap className="w-9 h-9 text-primary-foreground" />
              </div>
            </motion.div>

            {/* Tagline */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-primary/20 bg-primary/5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wide uppercase">
                Infraestrutura Pública de Inteligência
              </span>
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-accent"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>

            <motion.h1
              className="text-4xl md:text-6xl font-bold text-foreground mb-5 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              Qual é o seu papel no
              <br />
              <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                Sistema de Inovação?
              </span>
            </motion.h1>

            <motion.p
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              O MOTOR 4P traduz objetos tecnológicos em redes verificáveis de incidência.
              Escolha sua perspectiva para começar.
            </motion.p>
          </div>

          {/* Persona Cards */}
          <motion.div
            className="max-w-4xl mx-auto mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <PersonaSelector />
          </motion.div>

          {/* Secondary Link */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
          >
            <Link
              to="/camada-ausente"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <BookOpen className="w-4 h-4" />
              Conhecer o conceito do Motor 4P
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;

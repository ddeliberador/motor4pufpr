import { motion } from "framer-motion";

const Motor4PDiagram = () => {
  // Posições fixas para os 4 pilares (em coordenadas SVG 400x400)
  const pillars = [
    { label: "PESQUISA", x: 80, y: 80, color: "hsl(var(--primary))" },
    { label: "PRODUÇÃO", x: 320, y: 80, color: "hsl(215 45% 35%)" },
    { label: "POLÍTICA", x: 80, y: 320, color: "hsl(25 70% 50%)" },
    { label: "PATENTES", x: 320, y: 320, color: "hsl(25 60% 45%)" },
  ];

  const centerX = 200;
  const centerY = 200;

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square">
      <svg className="w-full h-full" viewBox="0 0 400 400">
        {/* Connection lines from center to pillars */}
        {pillars.map((pillar, i) => (
          <motion.line
            key={`center-${i}`}
            x1={centerX}
            y1={centerY}
            x2={pillar.x}
            y2={pillar.y}
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeOpacity="0.3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
          />
        ))}
        
        {/* Connection lines between adjacent pillars (square) */}
        {pillars.map((pillar, i) => {
          const nextPillar = pillars[(i + 1) % 4];
          return (
            <motion.line
              key={`connect-${i}`}
              x1={pillar.x}
              y1={pillar.y}
              x2={nextPillar.x}
              y2={nextPillar.y}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1.5"
              strokeOpacity="0.4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.6 + i * 0.1 }}
            />
          );
        })}

        {/* Central circle */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          r="60"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeOpacity="0.3"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />

        {/* Central text */}
        <motion.text
          x={centerX}
          y={centerY - 8}
          textAnchor="middle"
          className="fill-primary text-[11px] font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          COORDENAÇÃO
        </motion.text>
        <motion.text
          x={centerX}
          y={centerY + 10}
          textAnchor="middle"
          className="fill-primary text-[11px] font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          INTELIGENTE
        </motion.text>

        {/* Pillar circles */}
        {pillars.map((pillar, index) => (
          <motion.g
            key={pillar.label}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
          >
            <circle
              cx={pillar.x}
              cy={pillar.y}
              r="45"
              fill={pillar.color}
              className="cursor-pointer transition-transform hover:scale-110"
              style={{ transformOrigin: `${pillar.x}px ${pillar.y}px` }}
            />
            <text
              x={pillar.x}
              y={pillar.y + 4}
              textAnchor="middle"
              className="fill-white text-[11px] font-bold pointer-events-none"
            >
              {pillar.label}
            </text>
          </motion.g>
        ))}

        {/* Small decorative nodes */}
        {[
          { x: 140, y: 140 },
          { x: 260, y: 140 },
          { x: 140, y: 260 },
          { x: 260, y: 260 },
        ].map((node, i) => (
          <motion.circle
            key={`node-${i}`}
            cx={node.x}
            cy={node.y}
            r="4"
            fill="hsl(var(--primary))"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            transition={{ duration: 0.3, delay: 0.8 + i * 0.05 }}
          />
        ))}
      </svg>
    </div>
  );
};

export default Motor4PDiagram;

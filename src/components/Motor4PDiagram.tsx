import { motion } from "framer-motion";

const Motor4PDiagram = () => {
  const pillars = [
    { label: "PESQUISA", angle: 135, color: "hsl(var(--primary))" },
    { label: "PRODUÇÃO", angle: 45, color: "hsl(215 45% 35%)" },
    { label: "POLÍTICA", angle: 225, color: "hsl(25 70% 50%)" },
    { label: "PATENTES", angle: 315, color: "hsl(25 60% 45%)" },
  ];

  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square">
      {/* Central circle */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30 flex items-center justify-center z-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="text-center">
          <p className="text-xs md:text-sm font-semibold text-primary">COORDENAÇÃO</p>
          <p className="text-xs md:text-sm font-semibold text-primary">INTELIGENTE</p>
        </div>
      </motion.div>

      {/* Network lines SVG */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
        {/* Connection lines between pillars and center */}
        {pillars.map((_, i) => {
          const angle1 = (pillars[i].angle * Math.PI) / 180;
          const x1 = 200 + 120 * Math.cos(angle1);
          const y1 = 200 - 120 * Math.sin(angle1);
          
          return (
            <motion.line
              key={`center-${i}`}
              x1={200}
              y1={200}
              x2={x1}
              y2={y1}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeOpacity="0.3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
            />
          );
        })}
        
        {/* Connection lines between adjacent pillars */}
        {pillars.map((_, i) => {
          const angle1 = (pillars[i].angle * Math.PI) / 180;
          const angle2 = (pillars[(i + 1) % 4].angle * Math.PI) / 180;
          const x1 = 200 + 120 * Math.cos(angle1);
          const y1 = 200 - 120 * Math.sin(angle1);
          const x2 = 200 + 120 * Math.cos(angle2);
          const y2 = 200 - 120 * Math.sin(angle2);
          
          return (
            <motion.line
              key={`connect-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(var(--accent))"
              strokeWidth="2"
              strokeOpacity="0.4"
              strokeDasharray="6 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.6 + i * 0.1 }}
            />
          );
        })}

        {/* Small network nodes */}
        {[...Array(8)].map((_, i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const radius = 80 + (i % 2) * 30;
          const cx = 200 + radius * Math.cos(angle);
          const cy = 200 - radius * Math.sin(angle);
          
          return (
            <motion.circle
              key={`node-${i}`}
              cx={cx}
              cy={cy}
              r="4"
              fill="hsl(var(--primary))"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.6 }}
              transition={{ duration: 0.3, delay: 0.8 + i * 0.05 }}
            />
          );
        })}
      </svg>

      {/* Pillar circles */}
      {pillars.map((pillar, index) => {
        const angle = (pillar.angle * Math.PI) / 180;
        const x = 50 + 35 * Math.cos(angle);
        const y = 50 - 35 * Math.sin(angle);
        
        return (
          <motion.div
            key={pillar.label}
            className="absolute w-20 h-20 md:w-24 md:h-24 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-lg"
            style={{ 
              left: `${x}%`, 
              top: `${y}%`,
              backgroundColor: pillar.color
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            whileHover={{ scale: 1.1 }}
          >
            {pillar.label}
          </motion.div>
        );
      })}
    </div>
  );
};

export default Motor4PDiagram;

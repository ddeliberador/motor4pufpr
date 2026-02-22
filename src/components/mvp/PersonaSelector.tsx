import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { personaConfigs } from "@/config/personas";
import type { Persona } from "@/types/persona";

const personas: Persona[] = ["pesquisador", "universidade", "empresa", "governo"];

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 1.0 + i * 0.12,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const PersonaSelector = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {personas.map((key, i) => {
        const config = personaConfigs[key];
        const Icon = config.icon;
        return (
          <motion.button
            key={key}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/${key}`)}
            className="group relative card-modern p-6 md:p-8 text-left hover:border-primary/40 transition-colors duration-300 cursor-pointer overflow-hidden"
          >
            {/* Hover glow */}
            <div
              className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${config.color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500`}
            />

            {/* Corner accent line */}
            <motion.div
              className={`absolute top-0 left-0 h-1 bg-gradient-to-r ${config.color} rounded-t-xl`}
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 1.3 + i * 0.12, duration: 0.6 }}
            />

            <div className="relative z-10">
              <motion.div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center mb-5 shadow-lg`}
                whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.5 } }}
              >
                <Icon className="w-7 h-7 text-white" />
              </motion.div>
              <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {config.label}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {config.subtitle}
              </p>
              <ul className="space-y-1.5 mb-5">
                {config.questions.slice(0, 3).map((q, qi) => (
                  <motion.li
                    key={qi}
                    className="text-xs text-muted-foreground/80 flex items-center gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 + i * 0.12 + qi * 0.08 }}
                  >
                    <motion.span
                      className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${config.color}`}
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: qi * 0.3 }}
                    />
                    {q}
                  </motion.li>
                ))}
              </ul>
              <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Acessar
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.span>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default PersonaSelector;

import { motion } from "framer-motion";
import { Unplug, Package, Factory, GraduationCap } from "lucide-react";

const challenges = [
  {
    icon: Unplug,
    title: "Ciência Fragmentada",
    description: "Pesquisas e inovação desconectadas",
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    icon: Package,
    title: "Instrumentos Isolados",
    description: "Fomento sem articulação",
    color: "text-muted-foreground",
    bgColor: "bg-muted"
  },
  {
    icon: Factory,
    title: "Demanda Produtiva",
    description: "Necessidades tecnológicas não atendidas",
    color: "text-accent",
    bgColor: "bg-accent/10"
  },
  {
    icon: GraduationCap,
    title: "Aprendizado Limitado",
    description: "Ausência de memória e coordenação",
    color: "text-primary",
    bgColor: "bg-primary/10"
  }
];

const ChallengeCards = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {challenges.map((challenge, index) => (
        <motion.div
          key={challenge.title}
          className="card-institutional text-center p-4 md:p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          whileHover={{ y: -4 }}
        >
          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full ${challenge.bgColor} flex items-center justify-center mx-auto mb-3`}>
            <challenge.icon className={`w-6 h-6 md:w-7 md:h-7 ${challenge.color}`} />
          </div>
          <h4 className={`font-semibold text-sm md:text-base ${challenge.color} mb-1`}>
            {challenge.title}
          </h4>
          <p className="text-xs md:text-sm text-muted-foreground">
            {challenge.description}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

export default ChallengeCards;

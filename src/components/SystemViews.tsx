import { motion } from "framer-motion";
import { User, Building2, Landmark, ArrowRight } from "lucide-react";

const views = [
  {
    icon: User,
    title: "Pesquisador",
    color: "bg-primary",
    items: ["Objetos Científicos", "Grupos e Patentes"],
    arrows: true
  },
  {
    icon: Building2,
    title: "Empresa",
    color: "bg-accent",
    items: ["CNPJ", "Fomento e Parcerias"],
    arrows: true
  },
  {
    icon: Landmark,
    title: "Estado",
    subtitle: "(Futuro)",
    color: "bg-orange-500",
    items: ["Mapeamento", "Lacunas e Aderência"],
    arrows: true
  }
];

const SystemViews = () => {
  return (
    <div className="space-y-6">
      {/* Tab headers */}
      <div className="flex justify-center gap-2 md:gap-4">
        {views.map((view, index) => (
          <motion.div
            key={view.title}
            className={`${view.color} text-white px-4 md:px-8 py-2 md:py-3 rounded-t-lg font-semibold text-sm md:text-base flex items-center gap-2`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <view.icon className="w-4 h-4 md:w-5 md:h-5" />
            <span>{view.title}</span>
            {view.subtitle && (
              <span className="text-xs opacity-80">{view.subtitle}</span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Content area */}
      <motion.div 
        className="bg-card border border-border rounded-lg p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {views.map((view, index) => (
            <div key={view.title} className="text-center">
              <div className="space-y-2">
                {view.items.map((item, itemIndex) => (
                  <div key={item} className="flex items-center justify-center gap-2 text-sm md:text-base text-muted-foreground">
                    <span>{item}</span>
                    {view.arrows && (
                      <ArrowRight className="w-4 h-4 text-accent" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SystemViews;

/**
 * MethodologyModal - Modal de Metodologia dos Indicadores
 * Explica C2T, GT, P2C, CD, ILT com fórmulas e interpretação
 */
import { useState, useEffect } from "react";
import { X, BookOpen, Zap, AlertTriangle, Target, Link2, TrendingUp, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

interface MethodologyModalProps {
  open: boolean;
  onClose: () => void;
}

interface IndicatorMethodology {
  name: string;
  formula: string;
  description: string;
  interpretation: Record<string, string>;
  data_sources: string[];
}

const indicatorIcons: Record<string, React.ReactNode> = {
  C2T: <Zap className="w-5 h-5" />,
  GT: <AlertTriangle className="w-5 h-5" />,
  P2C: <Target className="w-5 h-5" />,
  CD: <Link2 className="w-5 h-5" />,
  ILT: <TrendingUp className="w-5 h-5" />,
};

const indicatorColors: Record<string, string> = {
  C2T: "from-blue-500 to-indigo-600",
  GT: "from-orange-500 to-red-600",
  P2C: "from-emerald-500 to-teal-600",
  CD: "from-violet-500 to-purple-600",
  ILT: "from-pink-500 to-rose-600",
};

export default function MethodologyModal({ open, onClose }: MethodologyModalProps) {
  const [methodology, setMethodology] = useState<Record<string, IndicatorMethodology>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadMethodology();
    }
  }, [open]);

  const loadMethodology = async () => {
    setIsLoading(true);
    try {
      const response = await api.getIndicatorsMethodology();
      setMethodology(response.indicators as Record<string, IndicatorMethodology>);
    } catch (err) {
      console.error('Failed to load methodology:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <BookOpen className="w-6 h-6 text-primary" />
            Metodologia dos Indicadores
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Carregando metodologia...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="C2T" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {Object.keys(methodology).map((code) => (
                <TabsTrigger key={code} value={code} className="text-xs">
                  {code}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(methodology).map(([code, data]) => (
              <TabsContent key={code} value={code} className="mt-6 space-y-6">
                {/* Header com ícone */}
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${indicatorColors[code]} flex items-center justify-center shadow-lg`}>
                    <div className="text-white">
                      {indicatorIcons[code]}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{code}</h3>
                    <p className="text-muted-foreground">{data.name}</p>
                  </div>
                </div>

                {/* Descrição */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-foreground">{data.description}</p>
                </div>

                {/* Fórmula */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Fórmula de Cálculo
                  </h4>
                  <code className="block px-4 py-3 bg-card border border-border rounded-lg text-sm font-mono text-foreground">
                    {data.formula}
                  </code>
                </div>

                {/* Interpretação */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Interpretação dos Valores</h4>
                  <div className="space-y-2">
                    {Object.entries(data.interpretation).map(([range, meaning]) => (
                      <div key={range} className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg">
                        <div className={`px-3 py-1 rounded text-xs font-semibold ${
                          range.startsWith('>') || range.includes('70') ? 'bg-green-100 text-green-700' :
                          range.includes('50') || range.includes('60') ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {range}
                        </div>
                        <p className="text-sm text-muted-foreground flex-1">{meaning}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fontes de Dados */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Fontes de Dados</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.data_sources.map((source, idx) => (
                      <span key={idx} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

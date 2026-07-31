import { useState } from "react";
import { ExternalLink } from "lucide-react";

export default function LeiBemCalculadora() {
  const [faturamento, setFaturamento] = useState("");
  const [percentualPD, setPercentualPD] = useState("3");
  const [resultado, setResultado] = useState<null | { investimento: number; deducao_min: number; deducao_max: number; economia_ir: number }>(null);

  const calcular = () => {
    const fat = parseFloat(faturamento.replace(/\./g, "").replace(",", ".")) || 0;
    const pct = parseFloat(percentualPD) / 100;
    const investimento = fat * pct;
    const deducao_min = investimento * 0.60;
    const deducao_max = investimento * 0.80;
    const economia_ir = deducao_min * 0.34; // IRPJ 25% + CSLL 9% = 34%
    setResultado({ investimento, deducao_min, deducao_max, economia_ir });
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="bg-card border-2 border-amber-500/20 rounded-2xl overflow-hidden">
      <div className="bg-amber-500/5 border-b border-amber-500/10 px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">💰</span>
          <h3 className="text-base font-semibold text-foreground">Calculadora — Lei do Bem</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Estime quanto sua empresa pode deduzir do Imposto de Renda investindo em P&D neste tema
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Faturamento anual bruto (R$)
            </label>
            <input
              type="text"
              value={faturamento}
              onChange={e => setFaturamento(e.target.value)}
              placeholder="Ex: 10.000.000"
              className="w-full h-11 rounded-xl border border-border bg-muted/30 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <p className="text-xs text-muted-foreground mt-1">Apenas empresas no regime Lucro Real são elegíveis</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              % do faturamento investido em P&D
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min="1" max="20" step="0.5"
                value={percentualPD}
                onChange={e => setPercentualPD(e.target.value)}
                className="flex-1 accent-amber-500"
              />
              <span className="text-base font-bold text-amber-500 w-12 text-right">{percentualPD}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Média do setor: 2–5% do faturamento</p>
          </div>
        </div>

        <button
          onClick={calcular}
          disabled={!faturamento}
          className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Calcular benefício fiscal
        </button>

        {resultado && (
          <div className="bg-muted/30 rounded-xl p-4 space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <p className="text-sm font-semibold text-foreground">📊 Resultado estimado:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-background rounded-xl p-3 text-center border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Investimento em P&D</p>
                <p className="text-lg font-bold text-foreground">{fmt(resultado.investimento)}</p>
              </div>
              <div className="bg-amber-500/10 rounded-xl p-3 text-center border border-amber-500/20">
                <p className="text-xs text-amber-600 mb-1">Dedução no IR (60–80%)</p>
                <p className="text-lg font-bold text-amber-600">
                  {fmt(resultado.deducao_min)} – {fmt(resultado.deducao_max)}
                </p>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-500/20">
                <p className="text-xs text-emerald-600 mb-1">Economia estimada no IR</p>
                <p className="text-lg font-bold text-emerald-600">{fmt(resultado.economia_ir)}</p>
              </div>
            </div>
            <div className="bg-amber-500/5 rounded-lg p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Como funciona:</strong> a Lei do Bem permite deduzir 60% a 80% dos gastos com P&D da base de cálculo do IRPJ (25%) e CSLL (9%). A economia estimada considera a alíquota combinada de 34%. Valores estimados — consulte um contador especializado em incentivos fiscais à inovação.
              </p>
            </div>
          </div>
        )}

        <a href="https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem" target="_blank" rel="noopener noreferrer"
           className="flex items-center justify-between px-4 py-3 border border-border/50 rounded-xl hover:border-amber-500/30 hover:bg-amber-500/5 transition-colors">
          <span className="text-sm text-foreground">Portal oficial Lei do Bem — MCTI</span>
          <ExternalLink className="w-4 h-4 text-amber-500" />
        </a>
      </div>
    </div>
  );
}

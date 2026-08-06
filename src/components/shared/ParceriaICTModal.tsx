import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

interface ParceriaICTModalProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

const PASSOS = [
  {
    numero: "01",
    titulo: "Identifique a ICT certa",
    descricao: "Acesse o OpenAlex ou o diretório do MCTI para encontrar a instituição com expertise no seu tema. Verifique publicações recentes e pesquisadores ativos.",
    link: { label: "Buscar ICTs no MCTI", url: "https://www.gov.br/mcti/pt-br/acesso-a-informacao/institucional/icts" },
  },
  {
    numero: "02",
    titulo: "Contate o NIT da instituição",
    descricao: "O NIT (Núcleo de Inovação Tecnológica) é o setor responsável por formalizar parcerias com empresas. Toda universidade federal tem um. Envie um briefing técnico do seu problema.",
    link: { label: "O que é o NIT?", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/legislacao/instrucoes-normativas/resolucao-no-3-de-11-de-outubro-de-2021" },
  },
  {
    numero: "03",
    titulo: "Escolha o instrumento jurídico",
    descricao: "O Marco Legal CT&I oferece 4 opções: Contrato de Parceria P&D (mais comum), Encomenda Tecnológica (para resultado garantido), Acordo de Cooperação (sem transferência financeira) ou Licenciamento de tecnologia já existente.",
    link: { label: "Marco Legal CT&I", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/legislacao/leis/lei-n-10-973-de-2-de-dezembro-de-2004" },
  },
  {
    numero: "04",
    titulo: "Negocie o IP (propriedade intelectual)",
    descricao: "Defina antes: quem fica com as patentes? Empresa geralmente fica com a exclusividade comercial; ICT fica com os direitos de pesquisa e publicação. Isso deve estar no contrato.",
    link: null,
  },
  {
    numero: "05",
    titulo: "Use os incentivos fiscais",
    descricao: "Gastos com a parceria são elegíveis para dedução pela Lei do Bem (60–80% do IRPJ/CSLL). Se sua empresa é do setor TIC, pode usar a obrigação da Lei da Informática (5% do faturamento) para financiar o projeto.",
    link: { label: "Lei do Bem — MCTI", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem" },
  },
];

export default function ParceriaICTModal({ defaultOpen = true }: ParceriaICTModalProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="w-full bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
      >
        <div>
          <h2 className="text-base font-semibold text-foreground">🤝 Como fazer parceria com uma ICT</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Passo a passo pelo Marco Legal de CT&I</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-5 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {PASSOS.map((passo, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl border border-border/50 bg-muted/20 h-full">
                <div className="w-9 h-9 flex-shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{passo.numero}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-1">{passo.titulo}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">{passo.descricao}</p>
                  {passo.link && (
                    <a href={passo.link.url} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                      <ExternalLink className="w-3 h-3" />
                      {passo.link.label}
                    </a>
                  )}
                </div>
              </div>
            ))}

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 h-full">
              <p className="text-sm font-semibold text-foreground mb-1">⏱️ Quanto tempo leva?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Negociação e assinatura: 2–4 meses. Projetos simples (acordo de cooperação): 3–6 semanas.
                Acelerou desde o Marco Legal 2016 — hoje é mais simples do que parece.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

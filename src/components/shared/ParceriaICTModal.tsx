import { useState } from "react";
import { X, ExternalLink, ChevronRight } from "lucide-react";

interface ParceriaICTModalProps {
  trigger?: React.ReactNode;
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

export default function ParceriaICTModal({ trigger }: ParceriaICTModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger || (
          <button className="w-full flex items-center justify-between px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤝</span>
              <span className="text-sm font-medium text-foreground">Como iniciar uma parceria com uma ICT?</span>
            </div>
            <ChevronRight className="w-4 h-4 text-primary" />
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-base font-semibold text-foreground">🤝 Como fazer parceria com uma ICT</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Passo a passo pelo Marco Legal de CT&I</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {PASSOS.map((passo, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{passo.numero}</span>
                    </div>
                    {i < PASSOS.length - 1 && (
                      <div className="w-px h-full bg-border/50 mx-auto mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
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

              <div className="bg-muted/30 rounded-xl p-4 mt-2">
                <p className="text-xs font-semibold text-foreground mb-1">⏱️ Quanto tempo leva?</p>
                <p className="text-xs text-muted-foreground">Negociação e assinatura: 2–4 meses. Projetos simples (acordo de cooperação): 3–6 semanas. Acelerou desde o Marco Legal 2016 — hoje é mais simples do que parece.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

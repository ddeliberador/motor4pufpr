import { Microscope, GraduationCap, Factory, Building2, type LucideIcon } from "lucide-react";
import type { Persona } from "@/types/persona";

export interface PersonaConfig {
  key: Persona;
  label: string;
  icon: LucideIcon;
  subtitle: string;
  questions: string[];
  strategicQuestion: string;
  aiButtonLabel: string;
  aiSystemPromptFocus: string;
  pdfTitle: string;
  prioritySections: string[];
  color: string;
  gradient: string;
}

export const personaConfigs: Record<Persona, PersonaConfig> = {
  pesquisador: {
    key: "pesquisador",
    label: "Pesquisador",
    icon: Microscope,
    subtitle: "Encontre oportunidades de pesquisa, bolsas e parcerias",
    questions: [
      "Onde há bolsas?",
      "Quem pesquisa isso?",
      "Onde publicar?",
      "Quem já patenteou?",
    ],
    strategicQuestion: "Onde há bolsas? Quem pesquisa isso?",
    aiButtonLabel: "Gerar Estratégia de Pesquisa",
    aiSystemPromptFocus:
      "Foque em: estratégia de pesquisa, fontes de financiamento (bolsas CAPES, CNPq, FAPESP), parceiros ideais, gaps tecnológicos, tendências globais de publicação e oportunidades de colaboração internacional. Estruture como um plano de ação para um pesquisador.",
    pdfTitle: "Relatório de Estratégia de Pesquisa",
    prioritySections: ["scientific", "scholarships", "international", "technological"],
    color: "from-blue-500 to-cyan-600",
    gradient: "from-blue-500/10 to-cyan-500/10",
  },
  universidade: {
    key: "universidade",
    label: "Universidade",
    icon: GraduationCap,
    subtitle: "Posicionamento institucional, captação e parcerias estratégicas",
    questions: [
      "Onde estamos posicionados?",
      "Estamos captando recursos?",
      "Estamos patenteando?",
      "Temos parcerias estratégicas?",
    ],
    strategicQuestion: "Onde estamos posicionados? Estamos captando recursos?",
    aiButtonLabel: "Gerar Estratégia Institucional",
    aiSystemPromptFocus:
      "Foque em: posicionamento institucional, ranking por área, captação de recursos via instrumentos públicos, parcerias estratégicas nacionais e internacionais, volume de patentes por departamento e oportunidades de investimento. Estruture como um relatório de inteligência institucional.",
    pdfTitle: "Relatório de Estratégia Institucional",
    prioritySections: ["scientific", "institutional", "international", "education"],
    color: "from-emerald-500 to-teal-600",
    gradient: "from-emerald-500/10 to-teal-500/10",
  },
  empresa: {
    key: "empresa",
    label: "Empresário",
    icon: Factory,
    subtitle: "Maturidade tecnológica, concorrência e financiamento disponível",
    questions: [
      "Qual maturidade tecnológica?",
      "Quem lidera?",
      "Qual financiamento disponível?",
      "Qual risco?",
    ],
    strategicQuestion: "Qual maturidade? Quem lidera? Qual financiamento?",
    aiButtonLabel: "Gerar Inteligência Competitiva",
    aiSystemPromptFocus:
      "Foque em: maturidade tecnológica (TRL estimado), empresas líderes e concorrentes, riscos e oportunidades de mercado, linhas de financiamento disponíveis (Finep, BNDES, Embrapii), patentes estratégicas e universidades parceiras. Estruture como um relatório de inteligência competitiva para tomada de decisão empresarial.",
    pdfTitle: "Relatório de Inteligência Competitiva",
    prioritySections: ["technological", "companies", "institutional", "international"],
    color: "from-amber-500 to-orange-600",
    gradient: "from-amber-500/10 to-orange-500/10",
  },
  governo: {
    key: "governo",
    label: "Governo",
    icon: Building2,
    subtitle: "Diagnóstico regional, lacunas e impacto de políticas públicas",
    questions: [
      "Onde investir?",
      "Qual região está atrasada?",
      "Estamos dependentes do exterior?",
      "O instrumento público funciona?",
    ],
    strategicQuestion: "Onde investir? Qual região está atrasada?",
    aiButtonLabel: "Gerar Diagnóstico de Política Pública",
    aiSystemPromptFocus:
      "Foque em: diagnóstico regional (distribuição por estado), lacunas de investimento, dependência internacional, efetividade dos instrumentos públicos existentes, correlação entre financiamento e resultados (patentes, publicações), e recomendações de política industrial orientada a missões. Estruture como um diagnóstico para formuladores de política pública.",
    pdfTitle: "Diagnóstico de Política Pública",
    prioritySections: ["institutional", "scientific", "international", "companies", "technological"],
    color: "from-violet-500 to-purple-600",
    gradient: "from-violet-500/10 to-purple-500/10",
  },
};

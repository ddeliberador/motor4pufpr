import { jsPDF } from "jspdf";

interface Indicators {
  c2t: { value: number; label: string; description: string };
  gt: { value: number; label: string; description: string };
  p2c: { value: number; label: string; description: string };
  cd: { value: number; label: string; description: string };
}

interface SearchResults {
  query: string;
  stats: { groups: number; patents: number; instruments: number; companies: number; international: number };
  scientific: { name: string; institution: string; state: string; area: string; international?: string }[];
  technological: { title: string; applicant: string; year: string; code: string; international?: string }[];
  institutional: { name: string; type: string; status: string; value?: string }[];
  companies: { name: string; country: string; sector: string; type: string }[];
  international: { country: string; institutions: number; patents: number; relevance: string }[];
  indicators?: Indicators;
}

// Complete institutional data with full details (matching AtlasContent)
const mockRankingData = [
  { 
    rank: 1, name: "USP", fullName: "Universidade de São Paulo", type: "Federal", state: "SP", 
    groups: 40, patents: 22, projects: 12, cooperation: 8,
    researchers: 156, doctorates: 89, fundingMM: 45.2, publications: 342,
    partnerships: ["MIT", "Stanford", "Fraunhofer"],
    topAreas: ["Materiais Avançados", "IA Aplicada", "Biotecnologia"]
  },
  { 
    rank: 2, name: "Unicamp", fullName: "Universidade Estadual de Campinas", type: "Estadual", state: "SP", 
    groups: 30, patents: 18, projects: 10, cooperation: 7,
    researchers: 112, doctorates: 67, fundingMM: 32.8, publications: 278,
    partnerships: ["CNRS", "Max Planck", "ETH Zurich"],
    topAreas: ["Química Avançada", "Engenharia de Materiais", "Fotônica"]
  },
  { 
    rank: 3, name: "UFRJ", fullName: "Universidade Federal do Rio de Janeiro", type: "Federal", state: "RJ", 
    groups: 25, patents: 14, projects: 6, cooperation: 5,
    researchers: 98, doctorates: 54, fundingMM: 28.4, publications: 198,
    partnerships: ["Harvard", "Oxford", "Sorbonne"],
    topAreas: ["Energia", "Petroquímica", "Nanotecnologia"]
  },
  { 
    rank: 4, name: "Fiocruz", fullName: "Fundação Oswaldo Cruz", type: "ICT", state: "RJ", 
    groups: 20, patents: 9, projects: 8, cooperation: 6,
    researchers: 145, doctorates: 78, fundingMM: 56.7, publications: 456,
    partnerships: ["WHO", "CDC", "Pasteur Institute"],
    topAreas: ["Vacinas", "Biotecnologia", "Saúde Pública"]
  },
  { 
    rank: 5, name: "UFMG", fullName: "Universidade Federal de Minas Gerais", type: "Federal", state: "MG", 
    groups: 18, patents: 12, projects: 5, cooperation: 4,
    researchers: 76, doctorates: 42, fundingMM: 21.3, publications: 167,
    partnerships: ["TU Munich", "Politecnico di Milano"],
    topAreas: ["Metalurgia", "Engenharia Química", "Mineração"]
  },
  { 
    rank: 6, name: "UFSC", fullName: "Universidade Federal de Santa Catarina", type: "Federal", state: "SC", 
    groups: 15, patents: 8, projects: 7, cooperation: 5,
    researchers: 62, doctorates: 35, fundingMM: 18.9, publications: 145,
    partnerships: ["TU Delft", "KTH Stockholm"],
    topAreas: ["Automação", "Engenharia Mecânica", "Materiais"]
  },
  { 
    rank: 7, name: "UFPR", fullName: "Universidade Federal do Paraná", type: "Federal", state: "PR", 
    groups: 12, patents: 5, projects: 4, cooperation: 3,
    researchers: 48, doctorates: 28, fundingMM: 12.4, publications: 98,
    partnerships: ["University of Coimbra", "TU Dresden"],
    topAreas: ["Química Verde", "Bioprocessos", "Madeira"]
  },
  { 
    rank: 8, name: "UFRGS", fullName: "Universidade Federal do Rio Grande do Sul", type: "Federal", state: "RS", 
    groups: 14, patents: 6, projects: 3, cooperation: 4,
    researchers: 58, doctorates: 31, fundingMM: 15.6, publications: 134,
    partnerships: ["EPFL", "University of Toronto"],
    topAreas: ["Microeletrônica", "Polímeros", "Agrotecnologia"]
  },
];

// Regional data with universities (matching AtlasContent)
const regionalData = [
  { 
    region: 'Sudeste', 
    states: 'SP, RJ, MG, ES', 
    groups: 156, 
    patents: 89, 
    percentage: 58,
    universities: [
      { name: 'USP', state: 'SP', type: 'Federal', groups: 40, patents: 22, ictObj: 78.5 },
      { name: 'Unicamp', state: 'SP', type: 'Estadual', groups: 30, patents: 18, ictObj: 68.7 },
      { name: 'UFRJ', state: 'RJ', type: 'Federal', groups: 25, patents: 14, ictObj: 53.0 },
      { name: 'UFMG', state: 'MG', type: 'Federal', groups: 18, patents: 12, ictObj: 44.1 },
      { name: 'UNESP', state: 'SP', type: 'Estadual', groups: 15, patents: 8, ictObj: 35.3 },
      { name: 'UFSCar', state: 'SP', type: 'Federal', groups: 12, patents: 7, ictObj: 29.6 },
      { name: 'UFES', state: 'ES', type: 'Federal', groups: 8, patents: 4, ictObj: 18.9 },
      { name: 'UERJ', state: 'RJ', type: 'Estadual', groups: 8, patents: 4, ictObj: 18.5 },
    ]
  },
  { 
    region: 'Sul', 
    states: 'PR, SC, RS', 
    groups: 52, 
    patents: 28, 
    percentage: 19,
    universities: [
      { name: 'UFSC', state: 'SC', type: 'Federal', groups: 15, patents: 8, ictObj: 35.7 },
      { name: 'UFRGS', state: 'RS', type: 'Federal', groups: 14, patents: 6, ictObj: 31.5 },
      { name: 'UFPR', state: 'PR', type: 'Federal', groups: 12, patents: 5, ictObj: 26.3 },
      { name: 'UEM', state: 'PR', type: 'Estadual', groups: 6, patents: 4, ictObj: 16.8 },
      { name: 'UEL', state: 'PR', type: 'Estadual', groups: 5, patents: 5, ictObj: 17.2 },
    ]
  },
  { 
    region: 'Nordeste', 
    states: 'BA, PE, CE, RN, PB', 
    groups: 34, 
    patents: 12, 
    percentage: 13,
    universities: [
      { name: 'UFPE', state: 'PE', type: 'Federal', groups: 10, patents: 4, ictObj: 21.3 },
      { name: 'UFC', state: 'CE', type: 'Federal', groups: 9, patents: 3, ictObj: 18.0 },
      { name: 'UFBA', state: 'BA', type: 'Federal', groups: 8, patents: 3, ictObj: 16.7 },
      { name: 'UFRN', state: 'RN', type: 'Federal', groups: 4, patents: 1, ictObj: 8.2 },
      { name: 'UFPB', state: 'PB', type: 'Federal', groups: 3, patents: 1, ictObj: 6.5 },
    ]
  },
  { 
    region: 'Centro-Oeste', 
    states: 'DF, GO, MT, MS', 
    groups: 18, 
    patents: 8, 
    percentage: 7,
    universities: [
      { name: 'UnB', state: 'DF', type: 'Federal', groups: 8, patents: 4, ictObj: 18.9 },
      { name: 'UFG', state: 'GO', type: 'Federal', groups: 5, patents: 2, ictObj: 11.0 },
      { name: 'UFMT', state: 'MT', type: 'Federal', groups: 3, patents: 1, ictObj: 6.3 },
      { name: 'UFMS', state: 'MS', type: 'Federal', groups: 2, patents: 1, ictObj: 5.0 },
    ]
  },
  { 
    region: 'Norte', 
    states: 'AM, PA, TO', 
    groups: 8, 
    patents: 3, 
    percentage: 3,
    universities: [
      { name: 'UFPA', state: 'PA', type: 'Federal', groups: 4, patents: 2, ictObj: 9.8 },
      { name: 'UFAM', state: 'AM', type: 'Federal', groups: 3, patents: 1, ictObj: 6.5 },
      { name: 'UFT', state: 'TO', type: 'Federal', groups: 1, patents: 0, ictObj: 1.6 },
    ]
  },
];

const calculateICTObj = (groups: number, patents: number, projects: number, cooperation: number): number => {
  const maxGroups = 50, maxPatents = 30, maxProjects = 15, maxCoop = 10;
  const score = (
    0.4 * Math.min(groups / maxGroups, 1) +
    0.3 * Math.min(patents / maxPatents, 1) +
    0.2 * Math.min(projects / maxProjects, 1) +
    0.1 * Math.min(cooperation / maxCoop, 1)
  ) * 100;
  return Math.round(score * 10) / 10;
};

export function generateNewspaperPDF(results: SearchResults) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;
  let pageNum = 1;

  // Colors
  const primaryColor: [number, number, number] = [30, 58, 95];
  const accentColor: [number, number, number] = [45, 90, 74];
  const textColor: [number, number, number] = [40, 40, 40];
  const mutedColor: [number, number, number] = [120, 120, 120];

  // Helper: Draw header on each page
  const drawPageHeader = (title: string) => {
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, 12, pageWidth - margin, 12);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...mutedColor);
    doc.text("MOTOR 4P UFPR — RELATÓRIO TÉCNICO DE INCIDÊNCIA E CAPACIDADES", margin, 9);
    doc.text(`Página ${pageNum}`, pageWidth - margin, 9, { align: "right" });
    
    doc.setFont("times", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text(title.toUpperCase(), pageWidth / 2, 9, { align: "center" });
  };

  // Helper: Draw footer on each page
  const drawPageFooter = () => {
    const footerY = pageHeight - 10;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...mutedColor);
    doc.text("Doutorado em Políticas Públicas — Universidade Federal do Paraná", margin, footerY + 4);
    doc.text("Decio Dalton Deliberador Filho (Doutorando) • Walter Tadahiro Shima (Orientador)", pageWidth - margin, footerY + 4, { align: "right" });
  };

  // Helper: Section title
  const drawSectionTitle = (title: string, y: number): number => {
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(title, margin, y);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 1.5, margin + 45, y + 1.5);
    return y + 7;
  };

  // Helper: Subsection title
  const drawSubsectionTitle = (title: string, y: number): number => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...textColor);
    doc.text(title, margin, y);
    return y + 5;
  };

  // Helper: Check page break
  const checkPageBreak = (neededSpace: number, sectionTitle: string): number => {
    if (yPos + neededSpace > pageHeight - 20) {
      drawPageFooter();
      doc.addPage();
      pageNum++;
      yPos = 20;
      drawPageHeader(sectionTitle);
      return 24;
    }
    return yPos;
  };

  // ========== PAGE 1 - COVER ==========
  
  // Header block
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 65, 'F');
  
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("MOTOR 4P UFPR", pageWidth / 2, 24, { align: "center" });
  
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("A Camada Ausente da Política Industrial Brasileira", pageWidth / 2, 34, { align: "center" });
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("RELATÓRIO TÉCNICO DE INCIDÊNCIA E CAPACIDADES", pageWidth / 2, 48, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(today, pageWidth / 2, 58, { align: "center" });

  yPos = 75;

  // Object box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, 'S');
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...mutedColor);
  doc.text("OBJETO TECNOLÓGICO ANALISADO", pageWidth / 2, yPos + 5, { align: "center" });
  
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text(`"${results.query}"`, pageWidth / 2, yPos + 13, { align: "center" });
  yPos += 25;

  // Two-column summary
  const colWidth = (contentWidth - 6) / 2;
  
  // Left column - Stats
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...primaryColor);
  doc.text("SUMÁRIO QUANTITATIVO", margin, yPos);
  yPos += 5;

  const statsTable = [
    ["Grupos de Pesquisa (CNPq)", String(results.stats.groups)],
    ["Patentes (INPI)", String(results.stats.patents)],
    ["Instrumentos de Fomento", String(results.stats.instruments)],
    ["Empresas Mapeadas", String(results.stats.companies)],
    ["Países com Incidência", String(results.stats.international)],
  ];

  let statsY = yPos;
  statsTable.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    doc.text(label, margin + 2, statsY);
    doc.setFont("helvetica", "bold");
    doc.text(value, margin + colWidth - 2, statsY, { align: "right" });
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.line(margin, statsY + 1.5, margin + colWidth, statsY + 1.5);
    statsY += 5;
  });

  // Right column - Indicators
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...primaryColor);
  doc.text("INDICADORES DE TRADUÇÃO", margin + colWidth + 6, yPos - 5);

  if (results.indicators) {
    const indTable = [
      ["C2T — Maturidade Ciência→Tecnologia", `${results.indicators.c2t.value}%`],
      ["GT — Gargalo de Tradução", `${results.indicators.gt.value}%`],
      ["P2C — Aderência Política→Capacidade", `${results.indicators.p2c.value}%`],
      ["CD — Concentração e Dependência", `${results.indicators.cd.value}%`],
    ];

    let indY = yPos;
    indTable.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...textColor);
      doc.text(label, margin + colWidth + 8, indY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...accentColor);
      doc.text(value, pageWidth - margin - 2, indY, { align: "right" });
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.line(margin + colWidth + 6, indY + 1.5, pageWidth - margin, indY + 1.5);
      indY += 5;
    });
  }

  yPos = statsY + 8;

  // Methodology box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, contentWidth, 22, 1, 1, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...primaryColor);
  doc.text("METODOLOGIA MOTOR 4P", margin + 3, yPos + 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...textColor);
  const methodText = "Este relatório utiliza a Engine de Tradução Tecnocientífica do MOTOR 4P UFPR para mapear a incidência de um objeto tecnológico nas camadas do Sistema Nacional de Inovação: Ciência (grupos de pesquisa CNPq), Tecnologia (patentes INPI), Produção (empresas e comércio exterior) e Política (instrumentos de fomento). O Índice de Capacidade Tecnocientífica por Objeto (ICT-Obj) pondera grupos (40%), patentes (30%), projetos (20%) e cooperação C-I (10%).";
  const methodLines = doc.splitTextToSize(methodText, contentWidth - 6);
  doc.text(methodLines, margin + 3, yPos + 10);
  yPos += 28;

  // Table of contents
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...primaryColor);
  doc.text("ESTRUTURA DO RELATÓRIO", margin, yPos);
  yPos += 5;

  const toc = [
    ["1.", "Incidência Científica — Grupos de pesquisa por área e instituição", "2"],
    ["2.", "Incidência Tecnológica — Patentes por depositante e código IPC", "2"],
    ["3.", "Empresas e Mercado — Mapeamento produtivo nacional e internacional", "3"],
    ["4.", "Instrumentos de Fomento — Programas e linhas disponíveis", "3"],
    ["5.", "Incidência Internacional — Países e instituições estrangeiras", "4"],
    ["6.", "Atlas Nacional de Capacidades — Distribuição territorial", "4-5"],
    ["7.", "Ranking ICT-Obj — Instituições ordenadas por capacidade", "5-6"],
    ["8.", "Análise e Recomendações — Interpretação e diretrizes", "6-7"],
  ];

  toc.forEach(([num, title, page]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...primaryColor);
    doc.text(num, margin + 2, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);
    doc.text(title, margin + 8, yPos);
    doc.setTextColor(...mutedColor);
    doc.text(page, pageWidth - margin - 2, yPos, { align: "right" });
    yPos += 4.5;
  });

  drawPageFooter();

  // ========== PAGE 2 - INCIDÊNCIA CIENTÍFICA E TECNOLÓGICA ==========
  doc.addPage();
  pageNum++;
  yPos = 24;
  drawPageHeader("Incidência Científica e Tecnológica");

  // Scientific Section
  yPos = drawSectionTitle("1. INCIDÊNCIA CIENTÍFICA", yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...mutedColor);
  doc.text(`Grupos de pesquisa identificados no Diretório de Grupos de Pesquisa do CNPq para o objeto "${results.query}".`, margin, yPos);
  yPos += 5;

  // Table header
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, yPos, contentWidth, 5, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("Grupo de Pesquisa", margin + 2, yPos + 3.5);
  doc.text("Instituição", margin + 72, yPos + 3.5);
  doc.text("UF", margin + 112, yPos + 3.5);
  doc.text("Área", margin + 125, yPos + 3.5);
  doc.text("Int.", margin + 168, yPos + 3.5);
  yPos += 6;

  results.scientific.forEach((group, i) => {
    yPos = checkPageBreak(6, "Incidência Científica");
    
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, yPos - 2.5, contentWidth, 5.5, 'F');
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...textColor);
    
    const groupName = group.name.length > 38 ? group.name.substring(0, 35) + "..." : group.name;
    doc.text(groupName, margin + 2, yPos);
    doc.text(group.institution, margin + 72, yPos);
    doc.text(group.state, margin + 112, yPos);
    
    const area = group.area.length > 18 ? group.area.substring(0, 15) + "..." : group.area;
    doc.text(area, margin + 125, yPos);
    
    if (group.international) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...accentColor);
      doc.text("●", margin + 170, yPos);
    }
    yPos += 5;
  });

  yPos += 6;

  // Technological Section
  yPos = checkPageBreak(35, "Incidência Tecnológica");
  yPos = drawSectionTitle("2. INCIDÊNCIA TECNOLÓGICA", yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...mutedColor);
  doc.text(`Patentes identificadas na base do INPI relacionadas ao objeto "${results.query}".`, margin, yPos);
  yPos += 5;

  // Table header
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, yPos, contentWidth, 5, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("Título da Patente", margin + 2, yPos + 3.5);
  doc.text("Depositante", margin + 90, yPos + 3.5);
  doc.text("Ano", margin + 140, yPos + 3.5);
  doc.text("Código IPC", margin + 155, yPos + 3.5);
  yPos += 6;

  results.technological.forEach((patent, i) => {
    yPos = checkPageBreak(6, "Incidência Tecnológica");
    
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, yPos - 2.5, contentWidth, 5.5, 'F');
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...textColor);
    
    const title = patent.title.length > 48 ? patent.title.substring(0, 45) + "..." : patent.title;
    doc.text(title, margin + 2, yPos);
    
    const applicant = patent.applicant.length > 25 ? patent.applicant.substring(0, 22) + "..." : patent.applicant;
    doc.text(applicant, margin + 90, yPos);
    doc.text(patent.year, margin + 140, yPos);
    doc.text(patent.code, margin + 155, yPos);
    yPos += 5;
  });

  drawPageFooter();

  // ========== PAGE 3 - EMPRESAS E INSTRUMENTOS ==========
  doc.addPage();
  pageNum++;
  yPos = 24;
  drawPageHeader("Empresas e Instrumentos de Fomento");

  // Companies Section
  yPos = drawSectionTitle("3. EMPRESAS E MERCADO", yPos);

  // Brazilian companies
  yPos = drawSubsectionTitle("3.1 Empresas Brasileiras", yPos);
  
  const brCompanies = results.companies.filter(c => c.country === "Brasil");
  
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, yPos, contentWidth, 5, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("Empresa", margin + 2, yPos + 3.5);
  doc.text("Setor", margin + 75, yPos + 3.5);
  doc.text("Tipo", margin + 140, yPos + 3.5);
  yPos += 6;

  brCompanies.forEach((company, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, yPos - 2.5, contentWidth, 5.5, 'F');
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...textColor);
    doc.text(company.name, margin + 2, yPos);
    doc.text(company.sector, margin + 75, yPos);
    doc.text(company.type, margin + 140, yPos);
    yPos += 5;
  });

  yPos += 5;

  // International companies
  yPos = drawSubsectionTitle("3.2 Empresas Internacionais", yPos);
  
  const intCompanies = results.companies.filter(c => c.country !== "Brasil");
  
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, yPos, contentWidth, 5, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("Empresa", margin + 2, yPos + 3.5);
  doc.text("País", margin + 65, yPos + 3.5);
  doc.text("Setor", margin + 105, yPos + 3.5);
  yPos += 6;

  intCompanies.forEach((company, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, yPos - 2.5, contentWidth, 5.5, 'F');
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...textColor);
    doc.text(company.name, margin + 2, yPos);
    doc.text(company.country, margin + 65, yPos);
    doc.text(company.sector, margin + 105, yPos);
    yPos += 5;
  });

  yPos += 8;

  // Instruments Section
  yPos = drawSectionTitle("4. INSTRUMENTOS PÚBLICOS DE FOMENTO", yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...mutedColor);
  doc.text("Programas e linhas de financiamento identificados para o objeto tecnológico.", margin, yPos);
  yPos += 5;

  doc.setFillColor(30, 58, 95);
  doc.rect(margin, yPos, contentWidth, 5, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("Instrumento", margin + 2, yPos + 3.5);
  doc.text("Tipo", margin + 85, yPos + 3.5);
  doc.text("Valor/Condição", margin + 125, yPos + 3.5);
  doc.text("Status", margin + 162, yPos + 3.5);
  yPos += 6;

  results.institutional.forEach((inst, i) => {
    yPos = checkPageBreak(6, "Instrumentos de Fomento");
    
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, yPos - 2.5, contentWidth, 5.5, 'F');
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...textColor);
    
    const name = inst.name.length > 42 ? inst.name.substring(0, 39) + "..." : inst.name;
    doc.text(name, margin + 2, yPos);
    doc.text(inst.type, margin + 85, yPos);
    doc.text(inst.value || "-", margin + 125, yPos);
    
    const statusColors: Record<string, [number, number, number]> = {
      'Aberto': [34, 150, 70],
      'Contínuo': [59, 130, 200],
      'Ativo': [16, 150, 100],
    };
    const statusColor = statusColors[inst.status] || mutedColor;
    doc.setTextColor(...statusColor);
    doc.setFont("helvetica", "bold");
    doc.text(inst.status, margin + 162, yPos);
    yPos += 5;
  });

  drawPageFooter();

  // ========== PAGE 4 - INTERNACIONAL E ATLAS ==========
  doc.addPage();
  pageNum++;
  yPos = 24;
  drawPageHeader("Incidência Internacional e Atlas Nacional");

  // International Section
  yPos = drawSectionTitle("5. INCIDÊNCIA INTERNACIONAL", yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...mutedColor);
  doc.text("Mapeamento da presença internacional em pesquisa e tecnologia para o objeto analisado.", margin, yPos);
  yPos += 5;

  doc.setFillColor(30, 58, 95);
  doc.rect(margin, yPos, contentWidth, 5, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("País", margin + 2, yPos + 3.5);
  doc.text("Instituições", margin + 65, yPos + 3.5);
  doc.text("Patentes", margin + 100, yPos + 3.5);
  doc.text("Relevância", margin + 135, yPos + 3.5);
  yPos += 6;

  results.international.forEach((item, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, yPos - 2.5, contentWidth, 5.5, 'F');
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...textColor);
    
    const countryName = item.country.replace(/[🇨🇳🇺🇸🇯🇵🇰🇷🇩🇪🇫🇷🇬🇧🇨🇭🇮🇪🇳🇱]/g, '').trim();
    doc.text(countryName, margin + 2, yPos);
    doc.text(String(item.institutions), margin + 65, yPos);
    doc.text(String(item.patents), margin + 100, yPos);
    doc.text(item.relevance, margin + 135, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Atlas Section
  yPos = drawSectionTitle("6. ATLAS NACIONAL DE CAPACIDADES", yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...mutedColor);
  const atlasDesc = `Mapa comparativo de universidades e centros de pesquisa do Brasil por capacidade no objeto "${results.query}".`;
  doc.text(atlasDesc, margin, yPos);
  yPos += 7;

  // Regional Distribution
  yPos = drawSubsectionTitle("6.1 Distribuição Territorial de Capacidades", yPos);

  doc.setFillColor(30, 58, 95);
  doc.rect(margin, yPos, contentWidth, 5, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("Região", margin + 2, yPos + 3.5);
  doc.text("Estados", margin + 35, yPos + 3.5);
  doc.text("Grupos", margin + 85, yPos + 3.5);
  doc.text("Patentes", margin + 110, yPos + 3.5);
  doc.text("Instituições", margin + 140, yPos + 3.5);
  doc.text("%", margin + 170, yPos + 3.5);
  yPos += 6;

  regionalData.forEach((region, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, yPos - 2.5, contentWidth, 5.5, 'F');
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...textColor);
    doc.text(region.region, margin + 2, yPos);
    doc.text(region.states, margin + 35, yPos);
    doc.text(String(region.groups), margin + 87, yPos);
    doc.text(String(region.patents), margin + 115, yPos);
    doc.text(String(region.universities.length), margin + 148, yPos);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(`${region.percentage}%`, margin + 170, yPos);
    yPos += 5;
  });

  // Totals row
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, yPos - 1.5, contentWidth, 5.5, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL BRASIL", margin + 2, yPos + 1.5);
  doc.text("268", margin + 87, yPos + 1.5);
  doc.text("140", margin + 115, yPos + 1.5);
  doc.text("25", margin + 148, yPos + 1.5);
  doc.text("100%", margin + 170, yPos + 1.5);
  yPos += 10;

  // Expanded universities by region
  yPos = drawSubsectionTitle("6.2 Detalhamento por Região — Universidades e ICT-Obj", yPos);

  regionalData.forEach((region) => {
    yPos = checkPageBreak(15 + region.universities.length * 5, "Atlas de Capacidades");
    
    // Region header
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, yPos - 2, contentWidth, 5.5, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...primaryColor);
    doc.text(`${region.region} (${region.states})`, margin + 2, yPos + 1);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedColor);
    doc.text(`${region.universities.length} instituições | ${region.groups} grupos | ${region.patents} patentes`, pageWidth - margin - 2, yPos + 1, { align: "right" });
    yPos += 6;

    // Universities table
    region.universities.forEach((uni, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(253, 253, 254);
        doc.rect(margin + 4, yPos - 2.5, contentWidth - 8, 5, 'F');
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...textColor);
      doc.text(uni.name, margin + 6, yPos);
      doc.setTextColor(...mutedColor);
      doc.text(uni.type, margin + 35, yPos);
      doc.text(uni.state, margin + 60, yPos);
      doc.setTextColor(...textColor);
      doc.text(String(uni.groups), margin + 85, yPos);
      doc.text(String(uni.patents), margin + 110, yPos);
      
      // ICT-Obj with color coding
      if (uni.ictObj >= 50) {
        doc.setTextColor(...accentColor);
      } else if (uni.ictObj >= 25) {
        doc.setTextColor(...primaryColor);
      } else {
        doc.setTextColor(...mutedColor);
      }
      doc.setFont("helvetica", "bold");
      doc.text(String(uni.ictObj), margin + 165, yPos);
      yPos += 4.5;
    });

    yPos += 4;
  });

  drawPageFooter();

  // ========== PAGE 5 - RANKING ICT-Obj ==========
  doc.addPage();
  pageNum++;
  yPos = 24;
  drawPageHeader("Ranking Institucional ICT-Obj");

  yPos = drawSectionTitle("7. RANKING INSTITUCIONAL (ICT-Obj)", yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...mutedColor);
  doc.text("Ordenação das instituições brasileiras pelo Índice de Capacidade Tecnocientífica por Objeto (ICT-Obj).", margin, yPos);
  yPos += 7;

  // ICT-Obj Formula explanation
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, contentWidth, 16, 1, 1, 'F');
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, contentWidth, 16, 1, 1, 'S');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...primaryColor);
  doc.text("FÓRMULA ICT-Obj", margin + 3, yPos + 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...textColor);
  doc.text("ICT-Obj = 0.4 × Grupos Científicos (CNPq) + 0.3 × Patentes (INPI) + 0.2 × Projetos Financiados + 0.1 × Cooperação C-I", margin + 3, yPos + 10);
  doc.setTextColor(...mutedColor);
  doc.text("Valores normalizados por máximos de referência (Grupos: 50, Patentes: 30, Projetos: 15, Cooperação: 10). Score de 0 a 100.", margin + 3, yPos + 14);
  yPos += 21;

  // Ranking table
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, yPos, contentWidth, 6, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("#", margin + 3, yPos + 4);
  doc.text("Instituição", margin + 12, yPos + 4);
  doc.text("Tipo", margin + 75, yPos + 4);
  doc.text("UF", margin + 98, yPos + 4);
  doc.text("Grupos", margin + 112, yPos + 4);
  doc.text("Pat.", margin + 132, yPos + 4);
  doc.text("Proj.", margin + 147, yPos + 4);
  doc.text("Coop.", margin + 160, yPos + 4);
  doc.text("ICT-Obj", pageWidth - margin - 3, yPos + 4, { align: "right" });
  yPos += 8;

  mockRankingData.forEach((inst, i) => {
    const ictObj = calculateICTObj(inst.groups, inst.patents, inst.projects, inst.cooperation);
    
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, yPos - 3, contentWidth, 9, 'F');
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text(String(inst.rank), margin + 3, yPos + 1);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    doc.text(inst.name, margin + 12, yPos);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...mutedColor);
    const fullName = inst.fullName.length > 35 ? inst.fullName.substring(0, 32) + "..." : inst.fullName;
    doc.text(fullName, margin + 12, yPos + 4);
    
    doc.setFontSize(6.5);
    doc.setTextColor(...textColor);
    doc.text(inst.type, margin + 75, yPos);
    doc.text(inst.state, margin + 98, yPos);
    doc.text(String(inst.groups), margin + 115, yPos);
    doc.text(String(inst.patents), margin + 133, yPos);
    doc.text(String(inst.projects), margin + 148, yPos);
    doc.text(String(inst.cooperation), margin + 162, yPos);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...accentColor);
    doc.text(String(ictObj), pageWidth - margin - 3, yPos + 1, { align: "right" });
    yPos += 10;
  });

  yPos += 6;

  // Component breakdown for top institution
  yPos = drawSubsectionTitle("7.1 Detalhamento do Cálculo — Top 3 Instituições", yPos);

  const topInstitutions = mockRankingData.slice(0, 3);
  
  topInstitutions.forEach((inst) => {
    yPos = checkPageBreak(22, "Detalhamento ICT-Obj");
    
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, yPos - 2, contentWidth, 5, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...primaryColor);
    doc.text(`${inst.rank}º ${inst.name} — ${inst.fullName}`, margin + 2, yPos + 1);
    yPos += 6;

    const breakdown = [
      { component: "Grupos Científicos (CNPq)", weight: "0.4", value: inst.groups, maxRef: 50, points: (Math.min(inst.groups / 50, 1) * 0.4 * 100).toFixed(1) },
      { component: "Patentes (INPI)", weight: "0.3", value: inst.patents, maxRef: 30, points: (Math.min(inst.patents / 30, 1) * 0.3 * 100).toFixed(1) },
      { component: "Projetos Financiados", weight: "0.2", value: inst.projects, maxRef: 15, points: (Math.min(inst.projects / 15, 1) * 0.2 * 100).toFixed(1) },
      { component: "Cooperação Ciência-Indústria", weight: "0.1", value: inst.cooperation, maxRef: 10, points: (Math.min(inst.cooperation / 10, 1) * 0.1 * 100).toFixed(1) },
    ];

    breakdown.forEach((item) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...mutedColor);
      doc.text(item.component, margin + 4, yPos);
      doc.text(`${item.value}/${item.maxRef}`, margin + 100, yPos);
      doc.text(`×${item.weight}`, margin + 125, yPos);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...accentColor);
      doc.text(`= ${item.points}`, margin + 145, yPos);
      yPos += 4;
    });

    // Total
    const ictObj = calculateICTObj(inst.groups, inst.patents, inst.projects, inst.cooperation);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin + 140, yPos - 1, margin + 168, yPos - 1);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...primaryColor);
    doc.text(`TOTAL: ${ictObj}`, margin + 145, yPos + 2);
    yPos += 8;
  });

  drawPageFooter();

  // ========== PAGE 6 - ANÁLISE E RECOMENDAÇÕES ==========
  doc.addPage();
  pageNum++;
  yPos = 24;
  drawPageHeader("Análise e Recomendações");

  yPos = drawSectionTitle("8. ANÁLISE E RECOMENDAÇÕES", yPos);

  // Indicators Analysis
  if (results.indicators) {
    yPos = drawSubsectionTitle("8.1 Interpretação dos Indicadores de Tradução", yPos);

    const indAnalysis = [
      {
        code: "C2T",
        name: "Maturidade Ciência→Tecnologia",
        value: results.indicators.c2t.value,
        desc: results.indicators.c2t.description,
      },
      {
        code: "GT",
        name: "Gargalo de Tradução",
        value: results.indicators.gt.value,
        desc: results.indicators.gt.description,
      },
      {
        code: "P2C",
        name: "Aderência Política→Capacidade",
        value: results.indicators.p2c.value,
        desc: results.indicators.p2c.description,
      },
      {
        code: "CD",
        name: "Concentração e Dependência",
        value: results.indicators.cd.value,
        desc: results.indicators.cd.description,
      },
    ];

    indAnalysis.forEach((ind) => {
      yPos = checkPageBreak(14, "Análise");
      
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, yPos, contentWidth, 11, 1, 1, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...primaryColor);
      doc.text(`${ind.code} — ${ind.name}: ${ind.value}%`, margin + 3, yPos + 4);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...textColor);
      const descLines = doc.splitTextToSize(ind.desc, contentWidth - 6);
      doc.text(descLines[0], margin + 3, yPos + 8.5);
      yPos += 13;
    });
  }

  yPos += 4;

  // Key Findings
  yPos = drawSubsectionTitle("8.2 Principais Achados", yPos);

  const findings = [
    `O objeto "${results.query}" apresenta ${results.stats.groups} grupos de pesquisa ativos, indicando base científica consolidada.`,
    `Foram identificadas ${results.stats.patents} patentes relacionadas, demonstrando esforço de tradução tecnológica em curso.`,
    `A concentração regional no Sudeste (58%) aponta necessidade de políticas de descentralização.`,
    `A incidência internacional em ${results.stats.international} países demonstra relevância global do tema.`,
    `${results.stats.instruments} instrumentos de fomento estão disponíveis, mas a aderência (P2C) indica oportunidades de melhoria.`,
    `O índice ICT-Obj revela liderança consolidada de USP, Unicamp e UFRJ, com gap significativo para demais instituições.`,
  ];

  findings.forEach((finding, i) => {
    yPos = checkPageBreak(8, "Recomendações");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...primaryColor);
    doc.text(`${i + 1}.`, margin, yPos);
    doc.setTextColor(...textColor);
    const lines = doc.splitTextToSize(finding, contentWidth - 8);
    doc.text(lines, margin + 5, yPos);
    yPos += lines.length * 3.5 + 2;
  });

  yPos += 5;

  // Recommendations
  yPos = drawSubsectionTitle("8.3 Recomendações para Política Industrial", yPos);

  const recommendations = [
    "Fortalecer a articulação entre grupos de pesquisa e empresas do setor através de programas de cooperação C-I.",
    "Ampliar instrumentos de fomento para regiões fora do eixo Sudeste, promovendo descentralização territorial.",
    "Incentivar parcerias internacionais com países líderes identificados no mapeamento (China, EUA, Alemanha).",
    "Monitorar indicadores de gargalo de tradução (GT) para identificar etapas críticas no fluxo de inovação.",
    "Utilizar o ranking ICT-Obj para priorizar instituições em chamadas públicas de P&D e formação de redes.",
    "Desenvolver mecanismos de financiamento específicos para projetos em estágio de alta maturidade (TRL 6-9).",
  ];

  recommendations.forEach((rec) => {
    yPos = checkPageBreak(8, "Recomendações");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...accentColor);
    doc.text("•", margin, yPos);
    doc.setTextColor(...textColor);
    const lines = doc.splitTextToSize(rec, contentWidth - 6);
    doc.text(lines, margin + 4, yPos);
    yPos += lines.length * 3.5 + 1.5;
  });

  yPos += 8;

  // Final summary box
  yPos = checkPageBreak(32, "Síntese");
  
  doc.setFillColor(30, 58, 95);
  doc.roundedRect(margin, yPos, contentWidth, 30, 2, 2, 'F');
  
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("SÍNTESE EXECUTIVA", pageWidth / 2, yPos + 6, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const summaryText = `O MOTOR 4P UFPR mapeou o objeto tecnológico "${results.query}" identificando uma rede de ${results.stats.groups} grupos de pesquisa, ${results.stats.patents} patentes, ${results.stats.companies} empresas e ${results.stats.instruments} instrumentos de fomento, com incidência verificada em ${results.stats.international} países. O índice ICT-Obj posiciona a USP como instituição líder nacional neste objeto (78.5 pontos), seguida por Unicamp (68.7) e UFRJ (53.0). A alta concentração territorial no Sudeste (58%) indica oportunidade para políticas de descentralização e fortalecimento de polos regionais. O gargalo de tradução identificado (GT: ${results.indicators?.gt.value || 45}%) aponta para necessidade de instrumentos que acelerem a passagem da ciência para tecnologia aplicada.`;
  const summaryLines = doc.splitTextToSize(summaryText, contentWidth - 10);
  doc.text(summaryLines, pageWidth / 2, yPos + 12, { align: "center", maxWidth: contentWidth - 10 });

  yPos += 36;

  // Sources
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...mutedColor);
  doc.text("Fontes: Diretório de Grupos de Pesquisa CNPq, Instituto Nacional da Propriedade Industrial (INPI), Capes, Finep, BNDES, Embrapii", margin, yPos);
  yPos += 3;
  doc.text("Nota: Dados simulados para demonstração do protótipo MVP Engine. Versão de produção integrará APIs das bases públicas oficiais.", margin, yPos);

  drawPageFooter();

  // Save
  const filename = `motor4p_relatorio_${results.query.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

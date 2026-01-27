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

// Atlas data for the report
const atlasRankingData = [
  { rank: 1, name: "USP", fullName: "Universidade de São Paulo", type: "Federal", state: "SP", groups: 40, patents: 22, projects: 12, cooperation: 8 },
  { rank: 2, name: "Unicamp", fullName: "Universidade Estadual de Campinas", type: "Estadual", state: "SP", groups: 30, patents: 18, projects: 10, cooperation: 7 },
  { rank: 3, name: "UFRJ", fullName: "Universidade Federal do Rio de Janeiro", type: "Federal", state: "RJ", groups: 25, patents: 14, projects: 6, cooperation: 5 },
  { rank: 4, name: "Fiocruz", fullName: "Fundação Oswaldo Cruz", type: "ICT", state: "RJ", groups: 20, patents: 9, projects: 8, cooperation: 6 },
  { rank: 5, name: "UFMG", fullName: "Universidade Federal de Minas Gerais", type: "Federal", state: "MG", groups: 18, patents: 12, projects: 5, cooperation: 4 },
  { rank: 6, name: "UFSC", fullName: "Universidade Federal de Santa Catarina", type: "Federal", state: "SC", groups: 15, patents: 8, projects: 7, cooperation: 5 },
  { rank: 7, name: "UFPR", fullName: "Universidade Federal do Paraná", type: "Federal", state: "PR", groups: 12, patents: 5, projects: 4, cooperation: 3 },
  { rank: 8, name: "UFRGS", fullName: "Universidade Federal do Rio Grande do Sul", type: "Federal", state: "RS", groups: 14, patents: 6, projects: 3, cooperation: 4 },
];

const regionalData = [
  { region: 'Sudeste', states: 'SP, RJ, MG, ES', groups: 156, patents: 89, percentage: 58, institutions: 8 },
  { region: 'Sul', states: 'PR, SC, RS', groups: 52, patents: 28, percentage: 19, institutions: 5 },
  { region: 'Nordeste', states: 'BA, PE, CE, outros', groups: 34, patents: 12, percentage: 13, institutions: 5 },
  { region: 'Centro-Oeste', states: 'DF, GO, MT, MS', groups: 18, patents: 8, percentage: 7, institutions: 4 },
  { region: 'Norte', states: 'AM, PA, outros', groups: 8, patents: 3, percentage: 3, institutions: 3 },
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
  const margin = 20;
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
    doc.setFontSize(7);
    doc.setTextColor(...mutedColor);
    doc.text("MOTOR 4P UFPR — RELATÓRIO TÉCNICO", margin, 10);
    doc.text(`Página ${pageNum}`, pageWidth - margin, 10, { align: "right" });
    
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text(title.toUpperCase(), pageWidth / 2, 10, { align: "center" });
  };

  // Helper: Draw footer on each page
  const drawPageFooter = () => {
    const footerY = pageHeight - 12;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...mutedColor);
    doc.text("Doutorado em Políticas Públicas — Universidade Federal do Paraná", margin, footerY + 5);
    doc.text("Decio Dalton Deliberador Filho (Doutorando) • Walter Tadahiro Shima (Orientador)", pageWidth - margin, footerY + 5, { align: "right" });
  };

  // Helper: Section title
  const drawSectionTitle = (title: string, y: number): number => {
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text(title, margin, y);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 2, margin + 50, y + 2);
    return y + 8;
  };

  // Helper: Subsection title
  const drawSubsectionTitle = (title: string, y: number): number => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text(title, margin, y);
    return y + 5;
  };

  // Helper: Check page break
  const checkPageBreak = (neededSpace: number, sectionTitle: string): number => {
    if (yPos + neededSpace > pageHeight - 25) {
      drawPageFooter();
      doc.addPage();
      pageNum++;
      yPos = 20;
      drawPageHeader(sectionTitle);
      return 25;
    }
    return yPos;
  };

  // ========== PAGE 1 - COVER ==========
  
  // Title block
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 70, 'F');
  
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text("MOTOR 4P UFPR", pageWidth / 2, 28, { align: "center" });
  
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text("A Camada Ausente da Política Industrial Brasileira", pageWidth / 2, 38, { align: "center" });
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("RELATÓRIO TÉCNICO DE INCIDÊNCIA E CAPACIDADES", pageWidth / 2, 52, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(today, pageWidth / 2, 62, { align: "center" });

  yPos = 82;

  // Object box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, contentWidth, 22, 2, 2, 'F');
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, contentWidth, 22, 2, 2, 'S');
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...mutedColor);
  doc.text("OBJETO TECNOLÓGICO ANALISADO", pageWidth / 2, yPos + 6, { align: "center" });
  
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text(`"${results.query}"`, pageWidth / 2, yPos + 16, { align: "center" });
  yPos += 30;

  // Summary stats
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...textColor);
  doc.text("SUMÁRIO QUANTITATIVO", margin, yPos);
  yPos += 6;

  const statsTable = [
    ["Grupos de Pesquisa (CNPq)", String(results.stats.groups)],
    ["Patentes Identificadas (INPI)", String(results.stats.patents)],
    ["Instrumentos de Fomento", String(results.stats.instruments)],
    ["Empresas Mapeadas", String(results.stats.companies)],
    ["Países com Incidência", String(results.stats.international)],
  ];

  statsTable.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...textColor);
    doc.text(label, margin + 4, yPos);
    doc.setFont("helvetica", "bold");
    doc.text(value, pageWidth - margin - 4, yPos, { align: "right" });
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
    yPos += 6;
  });

  yPos += 6;

  // Indicators summary
  if (results.indicators) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...textColor);
    doc.text("INDICADORES DE TRADUÇÃO TECNOLÓGICA", margin, yPos);
    yPos += 6;

    const indTable = [
      ["C2T — Maturidade Ciência→Tecnologia", `${results.indicators.c2t.value}%`],
      ["GT — Índice de Gargalo de Tradução", `${results.indicators.gt.value}%`],
      ["P2C — Aderência Política→Capacidade", `${results.indicators.p2c.value}%`],
      ["CD — Concentração e Dependência", `${results.indicators.cd.value}%`],
    ];

    indTable.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...textColor);
      doc.text(label, margin + 4, yPos);
      doc.setFont("helvetica", "bold");
      doc.text(value, pageWidth - margin - 4, yPos, { align: "right" });
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
      yPos += 6;
    });
  }

  yPos += 8;

  // Table of contents
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...textColor);
  doc.text("ESTRUTURA DO RELATÓRIO", margin, yPos);
  yPos += 6;

  const toc = [
    ["1.", "Incidência Científica", "Pág. 2"],
    ["2.", "Incidência Tecnológica", "Pág. 2"],
    ["3.", "Empresas e Mercado", "Pág. 3"],
    ["4.", "Instrumentos de Fomento", "Pág. 3"],
    ["5.", "Incidência Internacional", "Pág. 4"],
    ["6.", "Atlas Nacional de Capacidades", "Pág. 4-5"],
    ["7.", "Ranking Institucional (ICT-Obj)", "Pág. 5-6"],
    ["8.", "Análise e Recomendações", "Pág. 6"],
  ];

  toc.forEach(([num, title, page]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text(num, margin + 4, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);
    doc.text(title, margin + 12, yPos);
    doc.setTextColor(...mutedColor);
    doc.text(page, pageWidth - margin - 4, yPos, { align: "right" });
    yPos += 5;
  });

  // Footer
  drawPageFooter();

  // ========== PAGE 2 - INCIDÊNCIA CIENTÍFICA E TECNOLÓGICA ==========
  doc.addPage();
  pageNum++;
  yPos = 25;
  drawPageHeader("Incidência Científica e Tecnológica");

  // Scientific Section
  yPos = drawSectionTitle("1. INCIDÊNCIA CIENTÍFICA", yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text(`Grupos de pesquisa identificados no Diretório de Grupos de Pesquisa do CNPq para o objeto "${results.query}".`, margin, yPos);
  yPos += 6;

  // Table header
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos, contentWidth, 6, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  doc.text("Grupo de Pesquisa", margin + 2, yPos + 4);
  doc.text("Instituição", margin + 70, yPos + 4);
  doc.text("UF", margin + 110, yPos + 4);
  doc.text("Área", margin + 125, yPos + 4);
  yPos += 8;

  results.scientific.forEach((group, i) => {
    yPos = checkPageBreak(8, "Incidência Científica");
    
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, yPos - 3, contentWidth, 7, 'F');
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    
    const groupName = group.name.length > 35 ? group.name.substring(0, 32) + "..." : group.name;
    doc.text(groupName, margin + 2, yPos);
    doc.text(group.institution, margin + 70, yPos);
    doc.text(group.state, margin + 110, yPos);
    
    const area = group.area.length > 20 ? group.area.substring(0, 17) + "..." : group.area;
    doc.text(area, margin + 125, yPos);
    
    if (group.international) {
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(5);
      doc.text("INT", margin + contentWidth - 8, yPos);
    }
    yPos += 6;
  });

  yPos += 8;

  // Technological Section
  yPos = checkPageBreak(40, "Incidência Tecnológica");
  yPos = drawSectionTitle("2. INCIDÊNCIA TECNOLÓGICA", yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text(`Patentes identificadas na base do INPI relacionadas ao objeto "${results.query}".`, margin, yPos);
  yPos += 6;

  // Table header
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos, contentWidth, 6, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  doc.text("Título da Patente", margin + 2, yPos + 4);
  doc.text("Depositante", margin + 85, yPos + 4);
  doc.text("Ano", margin + 135, yPos + 4);
  doc.text("Código", margin + 150, yPos + 4);
  yPos += 8;

  results.technological.forEach((patent, i) => {
    yPos = checkPageBreak(8, "Incidência Tecnológica");
    
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, yPos - 3, contentWidth, 7, 'F');
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    
    const title = patent.title.length > 45 ? patent.title.substring(0, 42) + "..." : patent.title;
    doc.text(title, margin + 2, yPos);
    
    const applicant = patent.applicant.length > 25 ? patent.applicant.substring(0, 22) + "..." : patent.applicant;
    doc.text(applicant, margin + 85, yPos);
    doc.text(patent.year, margin + 135, yPos);
    doc.text(patent.code, margin + 150, yPos);
    yPos += 6;
  });

  drawPageFooter();

  // ========== PAGE 3 - EMPRESAS E INSTRUMENTOS ==========
  doc.addPage();
  pageNum++;
  yPos = 25;
  drawPageHeader("Empresas e Instrumentos de Fomento");

  // Companies Section
  yPos = drawSectionTitle("3. EMPRESAS E MERCADO", yPos);

  // Brazilian companies
  yPos = drawSubsectionTitle("3.1 Empresas Brasileiras", yPos);
  
  const brCompanies = results.companies.filter(c => c.country === "Brasil");
  
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos, contentWidth, 6, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  doc.text("Empresa", margin + 2, yPos + 4);
  doc.text("Setor", margin + 70, yPos + 4);
  doc.text("Tipo", margin + 130, yPos + 4);
  yPos += 8;

  brCompanies.forEach((company, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, yPos - 3, contentWidth, 7, 'F');
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    doc.text(company.name, margin + 2, yPos);
    doc.text(company.sector, margin + 70, yPos);
    doc.text(company.type, margin + 130, yPos);
    yPos += 6;
  });

  yPos += 6;

  // International companies
  yPos = drawSubsectionTitle("3.2 Empresas Internacionais", yPos);
  
  const intCompanies = results.companies.filter(c => c.country !== "Brasil");
  
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos, contentWidth, 6, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  doc.text("Empresa", margin + 2, yPos + 4);
  doc.text("País", margin + 60, yPos + 4);
  doc.text("Setor", margin + 100, yPos + 4);
  yPos += 8;

  intCompanies.forEach((company, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, yPos - 3, contentWidth, 7, 'F');
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    doc.text(company.name, margin + 2, yPos);
    doc.text(company.country, margin + 60, yPos);
    doc.text(company.sector, margin + 100, yPos);
    yPos += 6;
  });

  yPos += 10;

  // Instruments Section
  yPos = drawSectionTitle("4. INSTRUMENTOS PÚBLICOS DE FOMENTO", yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text("Programas e linhas de financiamento identificados para o objeto tecnológico.", margin, yPos);
  yPos += 6;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos, contentWidth, 6, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  doc.text("Instrumento", margin + 2, yPos + 4);
  doc.text("Tipo", margin + 80, yPos + 4);
  doc.text("Valor/Condição", margin + 120, yPos + 4);
  doc.text("Status", margin + 155, yPos + 4);
  yPos += 8;

  results.institutional.forEach((inst, i) => {
    yPos = checkPageBreak(8, "Instrumentos de Fomento");
    
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, yPos - 3, contentWidth, 7, 'F');
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    
    const name = inst.name.length > 40 ? inst.name.substring(0, 37) + "..." : inst.name;
    doc.text(name, margin + 2, yPos);
    doc.text(inst.type, margin + 80, yPos);
    doc.text(inst.value || "-", margin + 120, yPos);
    
    const statusColors: Record<string, [number, number, number]> = {
      'Aberto': [34, 197, 94],
      'Contínuo': [59, 130, 246],
      'Ativo': [16, 185, 129],
    };
    const statusColor = statusColors[inst.status] || mutedColor;
    doc.setTextColor(...statusColor);
    doc.setFont("helvetica", "bold");
    doc.text(inst.status, margin + 155, yPos);
    yPos += 6;
  });

  drawPageFooter();

  // ========== PAGE 4 - INTERNACIONAL E ATLAS ==========
  doc.addPage();
  pageNum++;
  yPos = 25;
  drawPageHeader("Incidência Internacional e Atlas Nacional");

  // International Section
  yPos = drawSectionTitle("5. INCIDÊNCIA INTERNACIONAL", yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text("Mapeamento da presença internacional em pesquisa e tecnologia para o objeto analisado.", margin, yPos);
  yPos += 6;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos, contentWidth, 6, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  doc.text("País", margin + 2, yPos + 4);
  doc.text("Instituições", margin + 60, yPos + 4);
  doc.text("Patentes", margin + 90, yPos + 4);
  doc.text("Relevância", margin + 120, yPos + 4);
  yPos += 8;

  results.international.forEach((item, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, yPos - 3, contentWidth, 7, 'F');
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    
    const countryName = item.country.replace(/[🇨🇳🇺🇸🇯🇵🇰🇷🇩🇪🇫🇷🇬🇧🇨🇭🇮🇪🇳🇱]/g, '').trim();
    doc.text(countryName, margin + 2, yPos);
    doc.text(String(item.institutions), margin + 60, yPos);
    doc.text(String(item.patents), margin + 90, yPos);
    doc.text(item.relevance, margin + 120, yPos);
    yPos += 6;
  });

  yPos += 12;

  // Atlas Section
  yPos = drawSectionTitle("6. ATLAS NACIONAL DE CAPACIDADES", yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  const atlasDesc = `Mapa comparativo de universidades e centros de pesquisa do Brasil por capacidade no objeto "${results.query}".`;
  doc.text(atlasDesc, margin, yPos);
  yPos += 8;

  // Regional Distribution
  yPos = drawSubsectionTitle("6.1 Distribuição Territorial de Capacidades", yPos);

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos, contentWidth, 6, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  doc.text("Região", margin + 2, yPos + 4);
  doc.text("Estados", margin + 35, yPos + 4);
  doc.text("Grupos", margin + 80, yPos + 4);
  doc.text("Patentes", margin + 105, yPos + 4);
  doc.text("Instituições", margin + 135, yPos + 4);
  doc.text("%", margin + 165, yPos + 4);
  yPos += 8;

  regionalData.forEach((region, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, yPos - 3, contentWidth, 7, 'F');
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    doc.text(region.region, margin + 2, yPos);
    doc.text(region.states, margin + 35, yPos);
    doc.text(String(region.groups), margin + 80, yPos);
    doc.text(String(region.patents), margin + 105, yPos);
    doc.text(String(region.institutions), margin + 135, yPos);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(`${region.percentage}%`, margin + 165, yPos);
    yPos += 6;
  });

  // Totals row
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, yPos - 2, contentWidth, 7, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL BRASIL", margin + 2, yPos + 2);
  doc.text("268", margin + 80, yPos + 2);
  doc.text("140", margin + 105, yPos + 2);
  doc.text("25", margin + 135, yPos + 2);
  doc.text("100%", margin + 165, yPos + 2);
  yPos += 12;

  // Concentration analysis
  doc.setFillColor(255, 251, 235);
  doc.roundedRect(margin, yPos, contentWidth, 14, 1, 1, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, contentWidth, 14, 1, 1, 'S');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(180, 100, 0);
  doc.text("ANÁLISE DE CONCENTRAÇÃO", margin + 4, yPos + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  doc.text("58% das capacidades concentradas no Sudeste. Oportunidade para políticas de descentralização.", margin + 4, yPos + 10);

  drawPageFooter();

  // ========== PAGE 5 - RANKING ICT-Obj ==========
  doc.addPage();
  pageNum++;
  yPos = 25;
  drawPageHeader("Ranking Institucional ICT-Obj");

  yPos = drawSectionTitle("7. RANKING INSTITUCIONAL (ICT-Obj)", yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text("Ordenação das instituições brasileiras pelo Índice de Capacidade Tecnocientífica por Objeto (ICT-Obj).", margin, yPos);
  yPos += 8;

  // ICT-Obj Formula explanation
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, contentWidth, 18, 1, 1, 'F');
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, contentWidth, 18, 1, 1, 'S');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text("FÓRMULA ICT-Obj", margin + 4, yPos + 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  doc.text("ICT-Obj = 0.4 × Grupos Científicos (CNPq) + 0.3 × Patentes (INPI) + 0.2 × Projetos Financiados + 0.1 × Cooperação C-I", margin + 4, yPos + 11);
  doc.setTextColor(...mutedColor);
  doc.text("Valores normalizados por máximos de referência. Score de 0 a 100.", margin + 4, yPos + 15);
  yPos += 24;

  // Ranking table
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("#", margin + 3, yPos + 5);
  doc.text("Instituição", margin + 12, yPos + 5);
  doc.text("Tipo", margin + 70, yPos + 5);
  doc.text("UF", margin + 95, yPos + 5);
  doc.text("Grupos", margin + 108, yPos + 5);
  doc.text("Pat.", margin + 128, yPos + 5);
  doc.text("Proj.", margin + 143, yPos + 5);
  doc.text("Coop.", margin + 158, yPos + 5);
  doc.text("ICT-Obj", pageWidth - margin - 5, yPos + 5, { align: "right" });
  yPos += 9;

  atlasRankingData.forEach((inst, i) => {
    const ictObj = calculateICTObj(inst.groups, inst.patents, inst.projects, inst.cooperation);
    
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, yPos - 3, contentWidth, 8, 'F');
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text(String(inst.rank), margin + 3, yPos + 1);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    doc.text(inst.name, margin + 12, yPos);
    doc.setFontSize(5.5);
    doc.setTextColor(...mutedColor);
    const fullName = inst.fullName.length > 30 ? inst.fullName.substring(0, 27) + "..." : inst.fullName;
    doc.text(fullName, margin + 12, yPos + 4);
    
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    doc.text(inst.type, margin + 70, yPos);
    doc.text(inst.state, margin + 95, yPos);
    doc.text(String(inst.groups), margin + 110, yPos);
    doc.text(String(inst.patents), margin + 130, yPos);
    doc.text(String(inst.projects), margin + 145, yPos);
    doc.text(String(inst.cooperation), margin + 160, yPos);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...accentColor);
    doc.text(String(ictObj), pageWidth - margin - 5, yPos + 1, { align: "right" });
    yPos += 10;
  });

  yPos += 8;

  // Component breakdown for top institution
  yPos = drawSubsectionTitle("7.1 Detalhamento do Cálculo (Top 1: USP)", yPos);

  const topInst = atlasRankingData[0];
  const breakdown = [
    { component: "Grupos Científicos (CNPq)", weight: "0.4", value: topInst.groups, maxRef: 50, points: (topInst.groups / 50 * 0.4 * 100).toFixed(1) },
    { component: "Patentes (INPI)", weight: "0.3", value: topInst.patents, maxRef: 30, points: (topInst.patents / 30 * 0.3 * 100).toFixed(1) },
    { component: "Projetos Financiados", weight: "0.2", value: topInst.projects, maxRef: 15, points: (topInst.projects / 15 * 0.2 * 100).toFixed(1) },
    { component: "Cooperação Ciência-Indústria", weight: "0.1", value: topInst.cooperation, maxRef: 10, points: (topInst.cooperation / 10 * 0.1 * 100).toFixed(1) },
  ];

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos, contentWidth, 6, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  doc.text("Componente", margin + 2, yPos + 4);
  doc.text("Peso", margin + 85, yPos + 4);
  doc.text("Valor", margin + 105, yPos + 4);
  doc.text("Ref. Máx.", margin + 125, yPos + 4);
  doc.text("Pontos", margin + 155, yPos + 4);
  yPos += 8;

  breakdown.forEach((item, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, yPos - 3, contentWidth, 7, 'F');
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    doc.text(item.component, margin + 2, yPos);
    doc.text(item.weight, margin + 85, yPos);
    doc.text(String(item.value), margin + 105, yPos);
    doc.text(String(item.maxRef), margin + 125, yPos);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...accentColor);
    doc.text(item.points, margin + 155, yPos);
    yPos += 6;
  });

  // Total row
  doc.setFillColor(45, 90, 74);
  doc.rect(margin, yPos - 2, contentWidth, 7, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL ICT-Obj", margin + 2, yPos + 2);
  doc.text(String(calculateICTObj(topInst.groups, topInst.patents, topInst.projects, topInst.cooperation)), margin + 155, yPos + 2);

  drawPageFooter();

  // ========== PAGE 6 - ANÁLISE E RECOMENDAÇÕES ==========
  doc.addPage();
  pageNum++;
  yPos = 25;
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
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, yPos, contentWidth, 12, 1, 1, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...primaryColor);
      doc.text(`${ind.code} — ${ind.name}: ${ind.value}%`, margin + 4, yPos + 5);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...textColor);
      const descLines = doc.splitTextToSize(ind.desc, contentWidth - 8);
      doc.text(descLines[0], margin + 4, yPos + 10);
      yPos += 15;
    });
  }

  yPos += 5;

  // Key Findings
  yPos = drawSubsectionTitle("8.2 Principais Achados", yPos);

  const findings = [
    `O objeto "${results.query}" apresenta ${results.stats.groups} grupos de pesquisa ativos, indicando base científica consolidada.`,
    `Foram identificadas ${results.stats.patents} patentes, sugerindo esforço de tradução tecnológica em curso.`,
    `A concentração regional no Sudeste (58%) indica necessidade de políticas de descentralização.`,
    `A incidência internacional em ${results.stats.international} países demonstra relevância global do tema.`,
    `${results.stats.instruments} instrumentos de fomento estão disponíveis para apoio a projetos na área.`,
  ];

  findings.forEach((finding, i) => {
    yPos = checkPageBreak(10, "Recomendações");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    doc.text(`${i + 1}.`, margin, yPos);
    const lines = doc.splitTextToSize(finding, contentWidth - 10);
    doc.text(lines, margin + 6, yPos);
    yPos += lines.length * 4 + 3;
  });

  yPos += 6;

  // Recommendations
  yPos = drawSubsectionTitle("8.3 Recomendações para Política Industrial", yPos);

  const recommendations = [
    "Fortalecer a articulação entre grupos de pesquisa e empresas do setor através de programas de cooperação C-I.",
    "Ampliar instrumentos de fomento para regiões fora do eixo Sudeste, promovendo descentralização.",
    "Incentivar parcerias internacionais com países líderes identificados no mapeamento.",
    "Monitorar indicadores de gargalo de tradução (GT) para identificar etapas críticas no fluxo de inovação.",
    "Utilizar o ranking ICT-Obj para priorizar instituições em chamadas públicas de P&D.",
  ];

  recommendations.forEach((rec, i) => {
    yPos = checkPageBreak(10, "Recomendações");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textColor);
    doc.text(`•`, margin, yPos);
    const lines = doc.splitTextToSize(rec, contentWidth - 8);
    doc.text(lines, margin + 5, yPos);
    yPos += lines.length * 4 + 2;
  });

  yPos += 10;

  // Final summary box
  doc.setFillColor(30, 58, 95);
  doc.roundedRect(margin, yPos, contentWidth, 28, 2, 2, 'F');
  
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("SÍNTESE EXECUTIVA", pageWidth / 2, yPos + 7, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const summaryText = `O MOTOR 4P UFPR mapeou o objeto tecnológico "${results.query}" identificando uma rede de ${results.stats.groups} grupos de pesquisa, ${results.stats.patents} patentes, ${results.stats.companies} empresas e ${results.stats.instruments} instrumentos de fomento, com incidência verificada em ${results.stats.international} países. O índice ICT-Obj posiciona a USP como instituição líder nacional neste objeto, seguida por Unicamp e UFRJ. A alta concentração territorial indica oportunidade para políticas de descentralização e fortalecimento de polos regionais.`;
  const summaryLines = doc.splitTextToSize(summaryText, contentWidth - 12);
  doc.text(summaryLines, pageWidth / 2, yPos + 14, { align: "center", maxWidth: contentWidth - 12 });

  yPos += 36;

  // Sources
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...mutedColor);
  doc.text("Fontes: CNPq (Diretório de Grupos de Pesquisa), INPI, Capes, Finep, BNDES, Embrapii", margin, yPos);
  yPos += 3;
  doc.text("Dados simulados para demonstração do protótipo MVP Engine.", margin, yPos);

  drawPageFooter();

  // Save
  const filename = `motor4p_relatorio_${results.query.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

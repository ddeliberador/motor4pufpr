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

// Complete institutional data
const mockRankingData = [
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
  { region: 'Sudeste', states: 'SP, RJ, MG, ES', groups: 156, patents: 89, percentage: 58,
    universities: [
      { name: 'USP', state: 'SP', type: 'Federal', groups: 40, patents: 22, ictObj: 78.5 },
      { name: 'Unicamp', state: 'SP', type: 'Estadual', groups: 30, patents: 18, ictObj: 68.7 },
      { name: 'UFRJ', state: 'RJ', type: 'Federal', groups: 25, patents: 14, ictObj: 53.0 },
      { name: 'UFMG', state: 'MG', type: 'Federal', groups: 18, patents: 12, ictObj: 44.1 },
    ]
  },
  { region: 'Sul', states: 'PR, SC, RS', groups: 52, patents: 28, percentage: 19,
    universities: [
      { name: 'UFSC', state: 'SC', type: 'Federal', groups: 15, patents: 8, ictObj: 35.7 },
      { name: 'UFRGS', state: 'RS', type: 'Federal', groups: 14, patents: 6, ictObj: 31.5 },
      { name: 'UFPR', state: 'PR', type: 'Federal', groups: 12, patents: 5, ictObj: 26.3 },
    ]
  },
  { region: 'Nordeste', states: 'BA, PE, CE, RN, PB', groups: 34, patents: 12, percentage: 13,
    universities: [
      { name: 'UFPE', state: 'PE', type: 'Federal', groups: 10, patents: 4, ictObj: 21.3 },
      { name: 'UFC', state: 'CE', type: 'Federal', groups: 9, patents: 3, ictObj: 18.0 },
      { name: 'UFBA', state: 'BA', type: 'Federal', groups: 8, patents: 3, ictObj: 16.7 },
    ]
  },
  { region: 'Centro-Oeste', states: 'DF, GO, MT, MS', groups: 18, patents: 8, percentage: 7,
    universities: [
      { name: 'UnB', state: 'DF', type: 'Federal', groups: 8, patents: 4, ictObj: 18.9 },
      { name: 'UFG', state: 'GO', type: 'Federal', groups: 5, patents: 2, ictObj: 11.0 },
    ]
  },
  { region: 'Norte', states: 'AM, PA, TO', groups: 8, patents: 3, percentage: 3,
    universities: [
      { name: 'UFPA', state: 'PA', type: 'Federal', groups: 4, patents: 2, ictObj: 9.8 },
      { name: 'UFAM', state: 'AM', type: 'Federal', groups: 3, patents: 1, ictObj: 6.5 },
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
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;
  let pageNum = 1;

  // Colors
  const primary: [number, number, number] = [25, 50, 85];
  const accent: [number, number, number] = [40, 85, 65];
  const text: [number, number, number] = [35, 35, 35];
  const muted: [number, number, number] = [110, 110, 110];
  const lightBg: [number, number, number] = [248, 250, 252];

  // ========== HELPER FUNCTIONS ==========

  const drawHeader = (title: string) => {
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.6);
    doc.line(margin, 14, pageWidth - margin, 14);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text("MOTOR 4P UFPR", margin, 10);
    doc.text(`Página ${pageNum}`, pageWidth - margin, 10, { align: "right" });
    
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...primary);
    doc.text(title.toUpperCase(), pageWidth / 2, 10, { align: "center" });
  };

  const drawFooter = () => {
    const y = pageHeight - 12;
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text("Doutorado em Políticas Públicas — UFPR", margin, y + 5);
    doc.text("Decio Deliberador • Walter Shima", pageWidth - margin, y + 5, { align: "right" });
  };

  const sectionTitle = (title: string, y: number): number => {
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.text(title, margin, y);
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.6);
    doc.line(margin, y + 2, margin + 50, y + 2);
    return y + 10;
  };

  const subsectionTitle = (title: string, y: number): number => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...text);
    doc.text(title, margin, y);
    return y + 7;
  };

  const paragraph = (content: string, y: number, maxWidth: number = contentWidth): number => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...text);
    const lines = doc.splitTextToSize(content, maxWidth);
    doc.text(lines, margin, y);
    return y + lines.length * 5 + 3;
  };

  const checkPage = (needed: number, title: string): number => {
    if (yPos + needed > pageHeight - 25) {
      drawFooter();
      doc.addPage();
      pageNum++;
      yPos = 22;
      drawHeader(title);
      return 28;
    }
    return yPos;
  };

  // ========== PAGE 1 - CAPA ==========
  
  // Header block
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageWidth, 75, 'F');
  
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text("MOTOR 4P UFPR", pageWidth / 2, 30, { align: "center" });
  
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.text("A Camada Ausente da Política Industrial Brasileira", pageWidth / 2, 42, { align: "center" });
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("RELATÓRIO TÉCNICO DE INCIDÊNCIA E CAPACIDADES", pageWidth / 2, 58, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(today, pageWidth / 2, 68, { align: "center" });

  yPos = 90;

  // Object box
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, yPos, contentWidth, 24, 3, 3, 'F');
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, yPos, contentWidth, 24, 3, 3, 'S');
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("OBJETO TECNOLÓGICO ANALISADO", pageWidth / 2, yPos + 8, { align: "center" });
  
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...primary);
  doc.text(`"${results.query}"`, pageWidth / 2, yPos + 18, { align: "center" });
  yPos += 35;

  // Summary section
  yPos = sectionTitle("Sumário Executivo", yPos);
  
  // Stats grid
  const stats = [
    { label: "Grupos de Pesquisa", value: results.stats.groups, source: "CNPq" },
    { label: "Patentes", value: results.stats.patents, source: "INPI" },
    { label: "Instrumentos de Fomento", value: results.stats.instruments, source: "Finep/Embrapii" },
    { label: "Empresas Mapeadas", value: results.stats.companies, source: "Brasil + Exterior" },
    { label: "Países com Incidência", value: results.stats.international, source: "Internacional" },
  ];

  const boxWidth = (contentWidth - 8) / 3;
  const boxHeight = 22;
  
  stats.slice(0, 3).forEach((stat, i) => {
    const x = margin + i * (boxWidth + 4);
    doc.setFillColor(...lightBg);
    doc.roundedRect(x, yPos, boxWidth, boxHeight, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...primary);
    doc.text(String(stat.value), x + boxWidth / 2, yPos + 10, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...text);
    doc.text(stat.label, x + boxWidth / 2, yPos + 17, { align: "center" });
  });
  yPos += boxHeight + 5;

  const boxWidth2 = (contentWidth - 4) / 2;
  stats.slice(3).forEach((stat, i) => {
    const x = margin + i * (boxWidth2 + 4);
    doc.setFillColor(...lightBg);
    doc.roundedRect(x, yPos, boxWidth2, boxHeight, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...primary);
    doc.text(String(stat.value), x + boxWidth2 / 2, yPos + 10, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...text);
    doc.text(stat.label, x + boxWidth2 / 2, yPos + 17, { align: "center" });
  });
  yPos += boxHeight + 12;

  // Indicators section
  if (results.indicators) {
    yPos = subsectionTitle("Indicadores de Tradução Tecnocientífica", yPos);
    
    const indicators = [
      { key: "C2T", name: "Maturidade Ciência→Tecnologia", value: results.indicators.c2t.value, desc: results.indicators.c2t.description },
      { key: "GT", name: "Gargalo de Tradução", value: results.indicators.gt.value, desc: results.indicators.gt.description },
      { key: "P2C", name: "Aderência Política→Capacidade", value: results.indicators.p2c.value, desc: results.indicators.p2c.description },
      { key: "CD", name: "Concentração e Dependência", value: results.indicators.cd.value, desc: results.indicators.cd.description },
    ];

    indicators.forEach((ind) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...primary);
      doc.text(`${ind.key}`, margin, yPos);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...text);
      doc.text(`— ${ind.name}`, margin + 12, yPos);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...accent);
      doc.text(`${ind.value}%`, pageWidth - margin, yPos, { align: "right" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...muted);
      const descLines = doc.splitTextToSize(ind.desc, contentWidth - 20);
      doc.text(descLines, margin + 12, yPos + 5);
      yPos += 5 + descLines.length * 4 + 4;
    });
  }

  drawFooter();

  // ========== PAGE 2 - INCIDÊNCIA CIENTÍFICA ==========
  doc.addPage();
  pageNum++;
  yPos = 28;
  drawHeader("Incidência Científica");

  yPos = sectionTitle("1. Incidência Científica", yPos);
  
  yPos = paragraph(
    `Mapeamento dos grupos de pesquisa cadastrados no Diretório de Grupos de Pesquisa do CNPq que desenvolvem atividades relacionadas ao objeto tecnológico "${results.query}". Esta camada representa a base científica do Sistema Nacional de Inovação.`,
    yPos
  );
  yPos += 3;

  // Table header
  doc.setFillColor(...primary);
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("Nome do Grupo", margin + 3, yPos + 5.5);
  doc.text("Instituição", margin + 75, yPos + 5.5);
  doc.text("UF", margin + 130, yPos + 5.5);
  doc.text("Área", margin + 145, yPos + 5.5);
  yPos += 10;

  results.scientific.forEach((group, i) => {
    yPos = checkPage(8, "Incidência Científica");
    
    if (i % 2 === 0) {
      doc.setFillColor(250, 251, 252);
      doc.rect(margin, yPos - 4, contentWidth, 8, 'F');
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...text);
    
    const name = group.name.length > 38 ? group.name.substring(0, 35) + "..." : group.name;
    const inst = group.institution.length > 28 ? group.institution.substring(0, 25) + "..." : group.institution;
    const area = group.area.length > 20 ? group.area.substring(0, 17) + "..." : group.area;
    
    doc.text(name, margin + 3, yPos);
    doc.text(inst, margin + 75, yPos);
    doc.text(group.state, margin + 130, yPos);
    doc.text(area, margin + 145, yPos);
    yPos += 7;
  });

  yPos += 10;
  yPos = checkPage(60, "Incidência Tecnológica");

  // ========== INCIDÊNCIA TECNOLÓGICA ==========
  yPos = sectionTitle("2. Incidência Tecnológica", yPos);
  
  yPos = paragraph(
    `Patentes depositadas no Instituto Nacional da Propriedade Industrial (INPI) relacionadas ao objeto "${results.query}". Representa a capacidade de tradução do conhecimento científico em aplicações tecnológicas protegidas.`,
    yPos
  );
  yPos += 3;

  // Table header
  doc.setFillColor(...primary);
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("Título da Patente", margin + 3, yPos + 5.5);
  doc.text("Depositante", margin + 85, yPos + 5.5);
  doc.text("Ano", margin + 140, yPos + 5.5);
  doc.text("Código IPC", margin + 155, yPos + 5.5);
  yPos += 10;

  results.technological.forEach((patent, i) => {
    yPos = checkPage(8, "Incidência Tecnológica");
    
    if (i % 2 === 0) {
      doc.setFillColor(250, 251, 252);
      doc.rect(margin, yPos - 4, contentWidth, 8, 'F');
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...text);
    
    const title = patent.title.length > 42 ? patent.title.substring(0, 39) + "..." : patent.title;
    const applicant = patent.applicant.length > 28 ? patent.applicant.substring(0, 25) + "..." : patent.applicant;
    
    doc.text(title, margin + 3, yPos);
    doc.text(applicant, margin + 85, yPos);
    doc.text(patent.year, margin + 140, yPos);
    doc.text(patent.code, margin + 155, yPos);
    yPos += 7;
  });

  drawFooter();

  // ========== PAGE 3 - EMPRESAS E FOMENTO ==========
  doc.addPage();
  pageNum++;
  yPos = 28;
  drawHeader("Mercado e Fomento");

  yPos = sectionTitle("3. Mapeamento de Empresas", yPos);
  
  yPos = paragraph(
    `Empresas brasileiras e internacionais atuantes no segmento de "${results.query}", identificadas por meio de bases de comércio exterior, registros industriais e presença em feiras e eventos do setor.`,
    yPos
  );
  yPos += 3;

  // Table header
  doc.setFillColor(...primary);
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("Empresa", margin + 3, yPos + 5.5);
  doc.text("País", margin + 80, yPos + 5.5);
  doc.text("Setor", margin + 115, yPos + 5.5);
  doc.text("Tipo", margin + 155, yPos + 5.5);
  yPos += 10;

  results.companies.forEach((company, i) => {
    yPos = checkPage(8, "Mercado e Fomento");
    
    if (i % 2 === 0) {
      doc.setFillColor(250, 251, 252);
      doc.rect(margin, yPos - 4, contentWidth, 8, 'F');
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...text);
    
    const name = company.name.length > 38 ? company.name.substring(0, 35) + "..." : company.name;
    
    doc.text(name, margin + 3, yPos);
    doc.text(company.country, margin + 80, yPos);
    doc.text(company.sector, margin + 115, yPos);
    doc.text(company.type, margin + 155, yPos);
    yPos += 7;
  });

  yPos += 12;
  yPos = checkPage(60, "Instrumentos de Fomento");

  yPos = sectionTitle("4. Instrumentos de Fomento", yPos);
  
  yPos = paragraph(
    `Programas e linhas de financiamento disponíveis para projetos relacionados ao objeto tecnológico, incluindo editais Finep, programas Embrapii e incentivos fiscais aplicáveis.`,
    yPos
  );
  yPos += 3;

  // Table header
  doc.setFillColor(...primary);
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("Instrumento", margin + 3, yPos + 5.5);
  doc.text("Tipo", margin + 90, yPos + 5.5);
  doc.text("Status", margin + 130, yPos + 5.5);
  doc.text("Valor", margin + 155, yPos + 5.5);
  yPos += 10;

  results.institutional.forEach((inst, i) => {
    yPos = checkPage(8, "Instrumentos de Fomento");
    
    if (i % 2 === 0) {
      doc.setFillColor(250, 251, 252);
      doc.rect(margin, yPos - 4, contentWidth, 8, 'F');
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...text);
    
    const name = inst.name.length > 45 ? inst.name.substring(0, 42) + "..." : inst.name;
    
    doc.text(name, margin + 3, yPos);
    doc.text(inst.type, margin + 90, yPos);
    doc.text(inst.status, margin + 130, yPos);
    doc.text(inst.value || "—", margin + 155, yPos);
    yPos += 7;
  });

  drawFooter();

  // ========== PAGE 4 - INTERNACIONAL E ATLAS ==========
  doc.addPage();
  pageNum++;
  yPos = 28;
  drawHeader("Internacional e Atlas");

  yPos = sectionTitle("5. Incidência Internacional", yPos);
  
  yPos = paragraph(
    `Países com atividade científica e tecnológica significativa no objeto analisado, identificando potenciais parceiros para cooperação internacional e benchmarks de desenvolvimento.`,
    yPos
  );
  yPos += 3;

  // Table header
  doc.setFillColor(...primary);
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("País", margin + 3, yPos + 5.5);
  doc.text("Instituições", margin + 70, yPos + 5.5);
  doc.text("Patentes", margin + 105, yPos + 5.5);
  doc.text("Relevância", margin + 140, yPos + 5.5);
  yPos += 10;

  results.international.forEach((item, i) => {
    yPos = checkPage(8, "Internacional");
    
    if (i % 2 === 0) {
      doc.setFillColor(250, 251, 252);
      doc.rect(margin, yPos - 4, contentWidth, 8, 'F');
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...text);
    
    doc.text(item.country, margin + 3, yPos);
    doc.text(String(item.institutions), margin + 70, yPos);
    doc.text(String(item.patents), margin + 105, yPos);
    doc.text(item.relevance, margin + 140, yPos);
    yPos += 7;
  });

  yPos += 15;
  yPos = checkPage(80, "Atlas Nacional");

  // ========== ATLAS NACIONAL ==========
  yPos = sectionTitle("6. Atlas Nacional de Capacidades", yPos);
  
  yPos = paragraph(
    `Distribuição territorial das capacidades tecnocientíficas brasileiras relacionadas ao objeto, com detalhamento por região e principais instituições.`,
    yPos
  );
  yPos += 5;

  // Regional bars
  regionalData.forEach((region) => {
    yPos = checkPage(35, "Atlas Nacional");
    
    // Region header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primary);
    doc.text(region.region, margin, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text(`(${region.states})`, margin + 35, yPos);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...accent);
    doc.text(`${region.percentage}%`, pageWidth - margin, yPos, { align: "right" });
    yPos += 5;

    // Progress bar
    doc.setFillColor(230, 235, 240);
    doc.roundedRect(margin, yPos, contentWidth, 5, 2, 2, 'F');
    doc.setFillColor(...primary);
    doc.roundedRect(margin, yPos, contentWidth * (region.percentage / 100), 5, 2, 2, 'F');
    yPos += 8;

    // Universities list
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...text);
    
    region.universities.forEach((uni) => {
      doc.text(`• ${uni.name}`, margin + 5, yPos);
      doc.text(`${uni.state}`, margin + 45, yPos);
      doc.text(`${uni.type}`, margin + 65, yPos);
      doc.text(`${uni.groups} grupos`, margin + 100, yPos);
      doc.text(`${uni.patents} patentes`, margin + 130, yPos);
      doc.setTextColor(...accent);
      doc.text(`ICT: ${uni.ictObj}`, pageWidth - margin, yPos, { align: "right" });
      doc.setTextColor(...text);
      yPos += 5;
    });
    yPos += 5;
  });

  drawFooter();

  // ========== PAGE 5 - RANKING ICT-OBJ ==========
  doc.addPage();
  pageNum++;
  yPos = 28;
  drawHeader("Ranking ICT-Obj");

  yPos = sectionTitle("7. Ranking de Capacidade Tecnocientífica", yPos);
  
  // Formula box
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'S');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primary);
  doc.text("Fórmula ICT-Obj:", margin + 5, yPos + 8);
  
  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...text);
  doc.text("0.4 × Grupos + 0.3 × Patentes + 0.2 × Projetos + 0.1 × Cooperação", margin + 45, yPos + 8);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("Valores normalizados em relação aos máximos observados no sistema", margin + 5, yPos + 15);
  yPos += 28;

  // Table header
  doc.setFillColor(...primary);
  doc.rect(margin, yPos, contentWidth, 9, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("#", margin + 5, yPos + 6);
  doc.text("Instituição", margin + 15, yPos + 6);
  doc.text("Tipo", margin + 85, yPos + 6);
  doc.text("UF", margin + 105, yPos + 6);
  doc.text("Grupos", margin + 118, yPos + 6);
  doc.text("Patentes", margin + 138, yPos + 6);
  doc.text("ICT-Obj", margin + 162, yPos + 6);
  yPos += 11;

  mockRankingData.forEach((inst, i) => {
    yPos = checkPage(10, "Ranking ICT-Obj");
    
    if (i % 2 === 0) {
      doc.setFillColor(250, 251, 252);
      doc.rect(margin, yPos - 5, contentWidth, 9, 'F');
    }
    
    const ictObj = calculateICTObj(inst.groups, inst.patents, inst.projects, inst.cooperation);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...primary);
    doc.text(String(inst.rank), margin + 5, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...text);
    doc.text(inst.fullName.length > 35 ? inst.fullName.substring(0, 32) + "..." : inst.fullName, margin + 15, yPos);
    doc.text(inst.type, margin + 85, yPos);
    doc.text(inst.state, margin + 105, yPos);
    doc.text(String(inst.groups), margin + 123, yPos);
    doc.text(String(inst.patents), margin + 145, yPos);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...accent);
    doc.text(String(ictObj), margin + 165, yPos);
    
    yPos += 8;
  });

  // Top 3 breakdown
  yPos += 10;
  yPos = checkPage(50, "Detalhamento Top 3");
  
  yPos = subsectionTitle("Detalhamento do Cálculo — Top 3", yPos);

  mockRankingData.slice(0, 3).forEach((inst, i) => {
    yPos = checkPage(25, "Detalhamento");
    
    const ictObj = calculateICTObj(inst.groups, inst.patents, inst.projects, inst.cooperation);
    
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...primary);
    doc.text(`${inst.rank}º ${inst.name}`, margin + 5, yPos + 7);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...accent);
    doc.text(`${ictObj}`, pageWidth - margin - 5, yPos + 7, { align: "right" });
    
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    const formula = `(0.4 × ${inst.groups}/50) + (0.3 × ${inst.patents}/30) + (0.2 × ${inst.projects}/15) + (0.1 × ${inst.cooperation}/10)`;
    doc.text(formula, margin + 5, yPos + 15);
    
    yPos += 25;
  });

  drawFooter();

  // ========== PAGE 6 - ANÁLISE E RECOMENDAÇÕES ==========
  doc.addPage();
  pageNum++;
  yPos = 28;
  drawHeader("Análise e Recomendações");

  yPos = sectionTitle("8. Análise Estratégica", yPos);
  
  // Diagnosis
  yPos = subsectionTitle("8.1 Diagnóstico da Capacidade Instalada", yPos);
  
  yPos = paragraph(
    `O mapeamento do objeto "${results.query}" revela uma estrutura de capacidades distribuída de forma heterogênea no território nacional. Foram identificados ${results.stats.groups} grupos de pesquisa e ${results.stats.patents} patentes, configurando uma base científico-tecnológica em diferentes estágios de maturidade.`,
    yPos
  );

  if (results.indicators) {
    yPos = paragraph(
      `O indicador C2T de ${results.indicators.c2t.value}% sugere ${results.indicators.c2t.value >= 50 ? 'boa capacidade' : 'potencial de melhoria'} na tradução de conhecimento científico para aplicações tecnológicas. O gargalo de tradução (GT: ${results.indicators.gt.value}%) indica ${results.indicators.gt.value >= 50 ? 'necessidade de atenção' : 'fluxo adequado'} na conversão de patentes em produtos comercializados.`,
      yPos
    );
  }
  yPos += 5;

  // Regional
  yPos = subsectionTitle("8.2 Distribuição Regional", yPos);
  
  yPos = paragraph(
    `A região Sudeste concentra 58% das capacidades mapeadas, seguida pelo Sul (19%) e Nordeste (13%). Esta concentração reflete a distribuição histórica do sistema de C&T brasileiro, mas também aponta oportunidades para políticas de descentralização e fortalecimento de polos regionais.`,
    yPos
  );

  const topRegion = regionalData[0];
  yPos = paragraph(
    `No Sudeste, destacam-se ${topRegion.universities.slice(0, 3).map(u => u.name).join(', ')} como principais instituições. A média do ICT-Obj regional (${(topRegion.universities.reduce((a, u) => a + u.ictObj, 0) / topRegion.universities.length).toFixed(1)}) indica maturidade consolidada.`,
    yPos
  );
  yPos += 5;

  // Recommendations
  yPos = subsectionTitle("8.3 Recomendações de Política", yPos);
  
  const recommendations = [
    "Fortalecer a articulação entre grupos de pesquisa e empresas através de programas de cooperação estruturados",
    "Ampliar o apoio a projetos de transferência de tecnologia nas regiões com maior potencial de crescimento",
    "Desenvolver instrumentos específicos para acelerar a tradução de patentes em produtos comercializados",
    "Promover a internacionalização das capacidades brasileiras através de parcerias com instituições líderes",
    "Implementar mecanismos de monitoramento contínuo da evolução das capacidades tecnocientíficas",
  ];

  recommendations.forEach((rec, i) => {
    yPos = checkPage(12, "Recomendações");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...primary);
    doc.text(`${i + 1}.`, margin, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...text);
    const lines = doc.splitTextToSize(rec, contentWidth - 10);
    doc.text(lines, margin + 8, yPos);
    yPos += lines.length * 5 + 4;
  });

  yPos += 10;
  yPos = checkPage(40, "Síntese");

  // Final synthesis box
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'F');
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'S');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primary);
  doc.text("Síntese Executiva", margin + 5, yPos + 8);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...text);
  const synthesis = `O objeto "${results.query}" apresenta capacidades científicas e tecnológicas distribuídas em ${results.stats.groups} grupos e ${results.stats.patents} patentes, com presença em ${results.stats.international} países. As ${results.stats.companies} empresas mapeadas e ${results.stats.instruments} instrumentos de fomento disponíveis configuram um ecossistema com potencial para políticas industriais coordenadas.`;
  const synthLines = doc.splitTextToSize(synthesis, contentWidth - 10);
  doc.text(synthLines, margin + 5, yPos + 15);

  drawFooter();

  // Save
  const filename = `motor4p-${results.query.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

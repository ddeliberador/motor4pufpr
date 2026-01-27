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

export function generateNewspaperPDF(results: SearchResults) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Draw UFPR building logo
  const drawUfprLogo = (x: number, y: number, size: number) => {
    doc.setFillColor(30, 58, 95);
    doc.rect(x, y + size * 0.85, size, size * 0.08, 'F');
    doc.rect(x - size * 0.05, y + size * 0.9, size * 1.1, size * 0.05, 'F');
    doc.rect(x + size * 0.05, y + size * 0.8, size * 0.9, size * 0.05, 'F');
    const colWidth = size * 0.08;
    const colSpacing = size * 0.14;
    for (let i = 0; i < 6; i++) {
      const colX = x + size * 0.08 + i * colSpacing;
      doc.rect(colX, y + size * 0.35, colWidth, size * 0.45, 'F');
      doc.rect(colX - 1, y + size * 0.32, colWidth + 2, size * 0.04, 'F');
    }
    doc.rect(x + size * 0.02, y + size * 0.28, size * 0.96, size * 0.05, 'F');
    doc.triangle(
      x + size * 0.5, y + size * 0.08,
      x + size * 0.02, y + size * 0.28,
      x + size * 0.98, y + size * 0.28,
      'F'
    );
  };

  // Helper for section headers
  const drawSectionHeader = (title: string, color: [number, number, number], y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...color);
    doc.text(title, margin, y);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 1.5, margin + 60, y + 1.5);
    return y + 6;
  };

  // ========== PAGE 1 - COVER ==========
  
  // Header
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(today.toUpperCase(), margin, yPos);
  doc.text("RELATÓRIO TÉCNICO DE INCIDÊNCIA", pageWidth - margin, yPos, { align: "right" });
  yPos += 2;
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  // Logo
  drawUfprLogo(pageWidth / 2 - 12, yPos, 24);
  yPos += 30;

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(30, 58, 95);
  doc.text("MOTOR 4P UFPR", pageWidth / 2, yPos, { align: "center" });
  yPos += 6;

  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text("A Camada Ausente da Política Industrial Brasileira", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.8);
  doc.line(margin + 30, yPos, pageWidth - margin - 30, yPos);
  yPos += 10;

  // Search Query Box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, 'S');
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("OBJETO TECNOLÓGICO ANALISADO", pageWidth / 2, yPos + 5, { align: "center" });
  
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text(`"${results.query}"`, pageWidth / 2, yPos + 13, { align: "center" });
  yPos += 24;

  // Stats boxes
  const boxWidth = contentWidth / 5 - 3;
  const statsData = [
    { label: "Grupos", value: results.stats.groups, color: [59, 130, 246] as [number, number, number] },
    { label: "Patentes", value: results.stats.patents, color: [147, 51, 234] as [number, number, number] },
    { label: "Instrumentos", value: results.stats.instruments, color: [16, 185, 129] as [number, number, number] },
    { label: "Empresas", value: results.stats.companies, color: [245, 158, 11] as [number, number, number] },
    { label: "Int'l", value: results.stats.international, color: [239, 68, 68] as [number, number, number] },
  ];

  statsData.forEach((stat, i) => {
    const boxX = margin + i * (boxWidth + 3);
    doc.setFillColor(...stat.color);
    doc.roundedRect(boxX, yPos, boxWidth, 16, 1.5, 1.5, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(String(stat.value), boxX + boxWidth / 2, yPos + 7, { align: "center" });
    doc.setFontSize(6);
    doc.text(stat.label.toUpperCase(), boxX + boxWidth / 2, yPos + 12, { align: "center" });
  });
  yPos += 22;

  // Indicators Section (if available)
  if (results.indicators) {
    doc.setFillColor(250, 251, 252);
    doc.roundedRect(margin, yPos, contentWidth, 28, 2, 2, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(margin, yPos, contentWidth, 28, 2, 2, 'S');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 95);
    doc.text("INDICADORES DE TRADUÇÃO TECNOLÓGICA", pageWidth / 2, yPos + 5, { align: "center" });

    const indWidth = contentWidth / 4 - 4;
    const indData = [
      { label: "C2T", name: "Maturidade", value: results.indicators.c2t.value, color: [6, 182, 212] as [number, number, number] },
      { label: "GT", name: "Gargalo", value: results.indicators.gt.value, color: [249, 115, 22] as [number, number, number] },
      { label: "P2C", name: "Aderência", value: results.indicators.p2c.value, color: [16, 185, 129] as [number, number, number] },
      { label: "CD", name: "Dependência", value: results.indicators.cd.value, color: [139, 92, 246] as [number, number, number] },
    ];

    indData.forEach((ind, i) => {
      const indX = margin + 2 + i * (indWidth + 4);
      const indY = yPos + 10;
      
      // Progress bar background
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(indX, indY + 8, indWidth, 3, 1, 1, 'F');
      
      // Progress bar fill
      doc.setFillColor(...ind.color);
      const fillWidth = (indWidth * ind.value) / 100;
      doc.roundedRect(indX, indY + 8, fillWidth, 3, 1, 1, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...ind.color);
      doc.text(`${ind.value}%`, indX + indWidth / 2, indY + 4, { align: "center" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.text(`${ind.label} - ${ind.name}`, indX + indWidth / 2, indY + 15, { align: "center" });
    });
    yPos += 32;
  }

  // Two column layout
  const colWidth = (contentWidth - 6) / 2;
  let leftY = yPos;
  let rightY = yPos;

  // LEFT COLUMN - Scientific
  leftY = drawSectionHeader("INCIDÊNCIA CIENTÍFICA", [59, 130, 246], leftY);
  
  results.scientific.forEach((group) => {
    if (leftY > pageHeight - 40) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(40, 40, 40);
    doc.text(`• ${group.name}`, margin, leftY);
    leftY += 3;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(`  ${group.institution} (${group.state}) — ${group.area}`, margin, leftY);
    leftY += 2.5;
    
    if (group.international) {
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(5.5);
      doc.text(`  INT: ${group.international}`, margin, leftY);
      leftY += 2.5;
    }
    leftY += 1.5;
  });

  leftY += 4;

  // Technological
  leftY = drawSectionHeader("INCIDÊNCIA TECNOLÓGICA", [147, 51, 234], leftY);

  results.technological.forEach((patent) => {
    if (leftY > pageHeight - 40) return;
    const title = patent.title.length > 50 ? patent.title.substring(0, 47) + "..." : patent.title;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(40, 40, 40);
    doc.text(`• ${title}`, margin, leftY);
    leftY += 3;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(`  ${patent.applicant} (${patent.year}) — ${patent.code}`, margin, leftY);
    leftY += 2.5;
    
    if (patent.international) {
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(5.5);
      doc.text(`  INT: ${patent.international}`, margin, leftY);
      leftY += 2.5;
    }
    leftY += 1.5;
  });

  // RIGHT COLUMN - Companies
  const rightColX = margin + colWidth + 6;
  rightY = drawSectionHeader("EMPRESAS NO SETOR", [245, 158, 11], rightY);
  rightY = rightY - 6 + 1;
  doc.text("", rightColX, rightY);
  rightY += 5;

  const brCompanies = results.companies.filter(c => c.country === "Brasil");
  const intCompanies = results.companies.filter(c => c.country !== "Brasil");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(40, 40, 40);
  doc.text("BRASIL", rightColX, rightY);
  rightY += 3;

  brCompanies.forEach((company) => {
    if (rightY > pageHeight - 40) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    doc.text(`• ${company.name} — ${company.sector} (${company.type})`, rightColX, rightY);
    rightY += 3;
  });

  rightY += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(40, 40, 40);
  doc.text("INTERNACIONAL", rightColX, rightY);
  rightY += 3;

  intCompanies.forEach((company) => {
    if (rightY > pageHeight - 40) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    doc.text(`• ${company.name} (${company.country}) — ${company.sector}`, rightColX, rightY);
    rightY += 3;
  });

  rightY += 4;

  // International Incidence
  rightY = drawSectionHeader("INCIDÊNCIA INTERNACIONAL", [239, 68, 68], rightY);
  rightY = rightY - 6 + 1;
  doc.text("", rightColX, rightY);
  rightY += 5;

  results.international.forEach((item) => {
    if (rightY > pageHeight - 40) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(40, 40, 40);
    const countryName = item.country.replace(/[🇨🇳🇺🇸🇯🇵🇰🇷🇩🇪🇫🇷🇬🇧🇨🇭🇮🇪🇳🇱]/g, '').trim();
    doc.text(`${countryName}`, rightColX, rightY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(`${item.institutions} inst. | ${item.patents} pat. | ${item.relevance}`, rightColX + 25, rightY);
    rightY += 4;
  });

  // Footer
  const footerY = pageHeight - 15;
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 95);
  doc.text("Doutorado em Políticas Públicas — UFPR", pageWidth / 2, footerY + 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text("Decio Dalton Deliberador Filho (Doutorando) • Walter Tadahiro Shima (Orientador)", pageWidth / 2, footerY + 9, { align: "center" });

  // ========== PAGE 2 - INSTITUTIONAL ==========
  doc.addPage();
  yPos = margin;

  // Header
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.4);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("MOTOR 4P UFPR — RELATÓRIO TÉCNICO", margin, yPos);
  doc.text(`OBJETO: "${results.query.toUpperCase()}"`, pageWidth - margin, yPos, { align: "right" });
  yPos += 2;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Institutional Section
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 95);
  doc.text("INSTRUMENTOS PÚBLICOS DE FOMENTO", pageWidth / 2, yPos, { align: "center" });
  yPos += 6;

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(margin + 40, yPos, pageWidth - margin - 40, yPos);
  yPos += 8;

  results.institutional.forEach((inst) => {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, contentWidth, 14, 1.5, 1.5, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(margin, yPos, contentWidth, 14, 1.5, 1.5, 'S');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 95);
    doc.text(inst.name, margin + 4, yPos + 5);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`${inst.type}${inst.value ? ` — ${inst.value}` : ''}`, margin + 4, yPos + 10);
    
    // Status badge
    const statusColors: Record<string, [number, number, number]> = {
      'Aberto': [34, 197, 94],
      'Contínuo': [59, 130, 246],
      'Ativo': [16, 185, 129],
    };
    const statusColor = statusColors[inst.status] || [100, 100, 100];
    doc.setFillColor(...statusColor);
    doc.roundedRect(pageWidth - margin - 22, yPos + 4, 18, 6, 1, 1, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.setTextColor(255, 255, 255);
    doc.text(inst.status.toUpperCase(), pageWidth - margin - 13, yPos + 8, { align: "center" });
    
    yPos += 18;
  });

  yPos += 8;

  // Indicators Explanation (if available)
  if (results.indicators) {
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text("ANÁLISE DE INDICADORES", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    const indExplanations = [
      {
        label: "C2T",
        name: "Maturidade Ciência → Tecnologia",
        value: results.indicators.c2t.value,
        desc: results.indicators.c2t.description,
        color: [6, 182, 212] as [number, number, number]
      },
      {
        label: "GT",
        name: "Gargalo de Tradução",
        value: results.indicators.gt.value,
        desc: results.indicators.gt.description,
        color: [249, 115, 22] as [number, number, number]
      },
      {
        label: "P2C",
        name: "Aderência Política → Capacidade",
        value: results.indicators.p2c.value,
        desc: results.indicators.p2c.description,
        color: [16, 185, 129] as [number, number, number]
      },
      {
        label: "CD",
        name: "Concentração e Dependência",
        value: results.indicators.cd.value,
        desc: results.indicators.cd.description,
        color: [139, 92, 246] as [number, number, number]
      },
    ];

    indExplanations.forEach((ind) => {
      doc.setFillColor(252, 252, 253);
      doc.roundedRect(margin, yPos, contentWidth, 16, 1.5, 1.5, 'F');
      
      // Label badge
      doc.setFillColor(...ind.color);
      doc.roundedRect(margin + 3, yPos + 3, 14, 10, 1, 1, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(ind.label, margin + 10, yPos + 9.5, { align: "center" });
      
      // Name and value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      doc.text(`${ind.name}: ${ind.value}%`, margin + 22, yPos + 6);
      
      // Description
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      const descLines = doc.splitTextToSize(ind.desc, contentWidth - 28);
      doc.text(descLines[0], margin + 22, yPos + 11);
      
      yPos += 20;
    });
  }

  yPos += 6;

  // Summary box
  doc.setFillColor(30, 58, 95);
  doc.roundedRect(margin, yPos, contentWidth, 24, 2, 2, 'F');
  
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("SÍNTESE DA REDE DE INCIDÊNCIA", pageWidth / 2, yPos + 7, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const summaryText = `O MOTOR 4P traduziu o objeto tecnológico "${results.query}" em uma rede composta por ${results.stats.groups} grupos de pesquisa, ${results.stats.patents} patentes registradas, ${results.stats.companies} empresas atuantes e incidência verificada em ${results.stats.international} países.`;
  const summaryLines = doc.splitTextToSize(summaryText, contentWidth - 16);
  doc.text(summaryLines, pageWidth / 2, yPos + 14, { align: "center" });

  // Footer
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.4);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  doc.setFont("times", "italic");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("MOTOR 4P UFPR — A Camada Ausente da Política Industrial Brasileira", pageWidth / 2, pageHeight - 7, { align: "center" });

  // Save
  doc.save(`motor-4p-ufpr-${results.query.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

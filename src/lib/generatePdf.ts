import { jsPDF } from "jspdf";

interface SearchResults {
  query: string;
  stats: { groups: number; patents: number; instruments: number; companies: number; international: number };
  scientific: { name: string; institution: string; state: string; area: string; international?: string }[];
  technological: { title: string; applicant: string; year: string; code: string; international?: string }[];
  institutional: { name: string; type: string; status: string; value?: string }[];
  companies: { name: string; country: string; sector: string; type: string }[];
  international: { country: string; institutions: number; patents: number; relevance: string }[];
}

export function generateNewspaperPDF(results: SearchResults) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Draw UFPR building logo
  const drawUfprLogo = (x: number, y: number, size: number) => {
    doc.setFillColor(30, 58, 95); // Primary color
    
    // Base
    doc.rect(x, y + size * 0.85, size, size * 0.08, 'F');
    doc.rect(x - size * 0.05, y + size * 0.9, size * 1.1, size * 0.05, 'F');
    
    // Steps
    doc.rect(x + size * 0.05, y + size * 0.8, size * 0.9, size * 0.05, 'F');
    
    // Columns
    const colWidth = size * 0.08;
    const colSpacing = size * 0.14;
    for (let i = 0; i < 6; i++) {
      const colX = x + size * 0.08 + i * colSpacing;
      doc.rect(colX, y + size * 0.35, colWidth, size * 0.45, 'F');
      doc.rect(colX - 1, y + size * 0.32, colWidth + 2, size * 0.04, 'F');
    }
    
    // Top beam
    doc.rect(x + size * 0.02, y + size * 0.28, size * 0.96, size * 0.05, 'F');
    
    // Triangle roof
    doc.triangle(
      x + size * 0.5, y + size * 0.08,
      x + size * 0.02, y + size * 0.28,
      x + size * 0.98, y + size * 0.28,
      'F'
    );
  };

  // ========== COVER PAGE ==========
  
  // Header line
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;
  
  // Date and edition
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(today.toUpperCase(), margin, yPos);
  doc.text("EDIÇÃO ESPECIAL", pageWidth - margin, yPos, { align: "right" });
  yPos += 3;
  
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Logo
  drawUfprLogo(pageWidth / 2 - 15, yPos, 30);
  yPos += 40;

  // Main Title
  doc.setFont("times", "bold");
  doc.setFontSize(36);
  doc.setTextColor(30, 58, 95);
  doc.text("MOTOR 4P UFPR", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // Subtitle
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text("A Camada Ausente da Política Industrial Brasileira", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Decorative line
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(1);
  doc.line(margin + 40, yPos, pageWidth - margin - 40, yPos);
  yPos += 15;

  // Search Query Highlight
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, 'F');
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("OBJETO TECNOLÓGICO ANALISADO", pageWidth / 2, yPos + 7, { align: "center" });
  
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(30, 58, 95);
  doc.text(`"${results.query}"`, pageWidth / 2, yPos + 20, { align: "center" });
  yPos += 35;

  // Stats boxes
  const boxWidth = contentWidth / 5 - 4;
  const statsData = [
    { label: "Grupos", value: results.stats.groups, color: [59, 130, 246] as [number, number, number] },
    { label: "Patentes", value: results.stats.patents, color: [147, 51, 234] as [number, number, number] },
    { label: "Instrumentos", value: results.stats.instruments, color: [16, 185, 129] as [number, number, number] },
    { label: "Empresas", value: results.stats.companies, color: [245, 158, 11] as [number, number, number] },
    { label: "Int'l", value: results.stats.international, color: [239, 68, 68] as [number, number, number] },
  ];

  statsData.forEach((stat, i) => {
    const boxX = margin + i * (boxWidth + 4);
    doc.setFillColor(...stat.color);
    doc.roundedRect(boxX, yPos, boxWidth, 20, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(String(stat.value), boxX + boxWidth / 2, yPos + 10, { align: "center" });
    
    doc.setFontSize(7);
    doc.text(stat.label.toUpperCase(), boxX + boxWidth / 2, yPos + 16, { align: "center" });
  });
  yPos += 30;

  // Two column layout for content
  const colWidth2 = (contentWidth - 8) / 2;
  let leftY = yPos;
  let rightY = yPos;

  // LEFT COLUMN - Scientific + Technological
  // Section: Scientific Incidence
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text("INCIDÊNCIA CIENTÍFICA", margin, leftY);
  leftY += 5;
  
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, leftY, margin + colWidth2, leftY);
  leftY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);

  results.scientific.slice(0, 4).forEach((group) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`• ${group.name}`, margin, leftY);
    leftY += 4;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`  ${group.institution} (${group.state}) — ${group.area}`, margin, leftY);
    if (group.international) {
      leftY += 3;
      doc.setTextColor(239, 68, 68);
      doc.text(`  🌍 ${group.international}`, margin, leftY);
    }
    leftY += 5;
    doc.setTextColor(60, 60, 60);
  });

  leftY += 5;

  // Section: Technological Incidence
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text("INCIDÊNCIA TECNOLÓGICA", margin, leftY);
  leftY += 5;
  
  doc.setDrawColor(147, 51, 234);
  doc.line(margin, leftY, margin + colWidth2, leftY);
  leftY += 5;

  results.technological.slice(0, 3).forEach((patent) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const title = patent.title.length > 45 ? patent.title.substring(0, 42) + "..." : patent.title;
    doc.text(`• ${title}`, margin, leftY);
    leftY += 4;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`  ${patent.applicant} (${patent.year})`, margin, leftY);
    if (patent.international) {
      leftY += 3;
      doc.setTextColor(239, 68, 68);
      doc.text(`  🌍 ${patent.international}`, margin, leftY);
    }
    leftY += 5;
    doc.setTextColor(60, 60, 60);
  });

  // RIGHT COLUMN - Companies + International
  const rightColX = margin + colWidth2 + 8;
  
  // Section: Companies
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text("EMPRESAS NO SETOR", rightColX, rightY);
  rightY += 5;
  
  doc.setDrawColor(245, 158, 11);
  doc.line(rightColX, rightY, rightColX + colWidth2, rightY);
  rightY += 5;

  const brCompanies = results.companies.filter(c => c.country === "Brasil");
  const intCompanies = results.companies.filter(c => c.country !== "Brasil");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text("🇧🇷 BRASIL", rightColX, rightY);
  rightY += 4;

  brCompanies.slice(0, 3).forEach((company) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`  • ${company.name} — ${company.sector}`, rightColX, rightY);
    rightY += 3.5;
  });

  rightY += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("🌍 INTERNACIONAL", rightColX, rightY);
  rightY += 4;

  intCompanies.slice(0, 4).forEach((company) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`  • ${company.name} (${company.country})`, rightColX, rightY);
    rightY += 3.5;
  });

  rightY += 5;

  // Section: International Incidence
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text("INCIDÊNCIA INTERNACIONAL", rightColX, rightY);
  rightY += 5;
  
  doc.setDrawColor(239, 68, 68);
  doc.line(rightColX, rightY, rightColX + colWidth2, rightY);
  rightY += 5;

  results.international.slice(0, 5).forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(`${item.country}`, rightColX, rightY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(` — ${item.institutions} inst. | ${item.patents} pat. | ${item.relevance}`, rightColX + 20, rightY);
    rightY += 4;
  });

  // Footer
  const footerY = pageHeight - 20;
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 95);
  doc.text("Doutorado em Políticas Públicas — UFPR", pageWidth / 2, footerY + 6, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Decio Dalton Deliberador Filho (Doutorando) • Walter Tadahiro Shima (Orientador)", pageWidth / 2, footerY + 11, { align: "center" });

  // ========== PAGE 2 - Institutional Instruments ==========
  doc.addPage();
  yPos = margin;

  // Header
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("MOTOR 4P UFPR — RELATÓRIO DE INCIDÊNCIA", margin, yPos);
  doc.text("PÁGINA 2", pageWidth - margin, yPos, { align: "right" });
  yPos += 3;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Institutional Section
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text("INSTRUMENTOS PÚBLICOS DE FOMENTO", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(1);
  doc.line(margin + 50, yPos, pageWidth - margin - 50, yPos);
  yPos += 10;

  results.institutional.forEach((inst) => {
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 95);
    doc.text(inst.name, margin + 5, yPos + 7);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`${inst.type}${inst.value ? ` — ${inst.value}` : ''}`, margin + 5, yPos + 13);
    
    // Status badge
    const statusColors: Record<string, [number, number, number]> = {
      'Aberto': [34, 197, 94],
      'Contínuo': [59, 130, 246],
      'Ativo': [16, 185, 129],
    };
    const statusColor = statusColors[inst.status] || [100, 100, 100];
    doc.setFillColor(...statusColor);
    doc.roundedRect(pageWidth - margin - 25, yPos + 5, 20, 8, 1, 1, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text(inst.status.toUpperCase(), pageWidth - margin - 15, yPos + 10, { align: "center" });
    
    yPos += 22;
  });

  yPos += 10;

  // Summary box
  doc.setFillColor(30, 58, 95);
  doc.roundedRect(margin, yPos, contentWidth, 30, 3, 3, 'F');
  
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("REDE DE INCIDÊNCIA CONSTRUÍDA", pageWidth / 2, yPos + 10, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const summaryText = `O MOTOR 4P traduziu o objeto "${results.query}" em ${results.stats.groups} grupos de pesquisa, ${results.stats.patents} patentes, ${results.stats.companies} empresas e ${results.stats.international} países com incidência internacional.`;
  const summaryLines = doc.splitTextToSize(summaryText, contentWidth - 20);
  doc.text(summaryLines, pageWidth / 2, yPos + 18, { align: "center" });

  // Footer
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("MOTOR 4P UFPR — A Camada Ausente da Política Industrial Brasileira", pageWidth / 2, pageHeight - 10, { align: "center" });

  // Save
  doc.save(`motor-4p-ufpr-${results.query.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

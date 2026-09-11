import jsPDF from 'jspdf';
import { format } from 'date-fns';

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function loadPremiumFonts(doc: jsPDF): Promise<void> {
  try {
    const [regRes, boldRes] = await Promise.all([
      fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf'),
      fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf')
    ]);
    const regBuf = await regRes.arrayBuffer();
    const boldBuf = await boldRes.arrayBuffer();
    
    doc.addFileToVFS('Roboto-Regular.ttf', arrayBufferToBase64(regBuf));
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    
    doc.addFileToVFS('Roboto-Medium.ttf', arrayBufferToBase64(boldBuf));
    doc.addFont('Roboto-Medium.ttf', 'Roboto', 'bold');
    
    doc.setFont('Roboto', 'normal');
  } catch (err) {
    console.warn("Failed to load Roboto font for PDF, falling back.", err);
  }
}

export function applyPremiumHeader(doc: jsPDF, title: string, subtitle: string = '') {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Slate 800 Header Background
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('Roboto', 'bold');
  doc.text('SMARTLEDGER', 14, 20);
  
  // Subtitle / Report Type
  doc.setFontSize(12);
  doc.setFont('Roboto', 'normal');
  doc.text(title, 14, 28);
  
  // Generation Date aligned right in the header
  const generatedDateStr = `Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`;
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(generatedDateStr, pageWidth - 14, 28, { align: 'right' });
  if (subtitle) {
    doc.setTextColor(255, 255, 255);
    doc.text(subtitle, pageWidth - 14, 20, { align: 'right' });
  }

  // Reset text color for body
  doc.setTextColor(0, 0, 0); 
}

export function applyPremiumFooter(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = (doc as any).internal.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Diagonal Watermark
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(60);
    doc.setTextColor(200, 200, 200);
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({opacity: 0.08}));
    doc.text('SmartLedger', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45
    });
    doc.restoreGraphicsState();
    
    // Footer Text
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`SmartLedger • ${title} • Page ${i} of ${pageCount}`, 14, pageHeight - 10);
  }
}

export interface SummaryMetric {
  label: string;
  value: string;
  highlight?: boolean;
  valueColor?: [number, number, number]; // RGB array for value
}

export function drawSummaryGrid(doc: jsPDF, startY: number, metrics: SummaryMetric[]): number {
  if (!metrics || metrics.length === 0) return startY;

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const gap = 6;
  const columns = metrics.length >= 3 ? 3 : metrics.length === 2 ? 2 : 1;
  const totalGaps = (columns - 1) * gap;
  const cardWidth = (pageWidth - (margin * 2) - totalGaps) / columns;
  const cardHeight = 18;

  let currentX = margin;
  let currentY = startY;

  metrics.forEach((metric, index) => {
    if (index > 0 && index % columns === 0) {
      currentX = margin;
      currentY += cardHeight + gap;
    }

    // Card background
    if (metric.highlight) {
      doc.setFillColor(241, 245, 249); // slate-100
    } else {
      doc.setFillColor(248, 250, 252); // slate-50
    }
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Label
    doc.setFontSize(8);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(metric.label.toUpperCase(), currentX + 4, currentY + 7);

    // Value
    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    if (metric.valueColor) {
      doc.setTextColor(metric.valueColor[0], metric.valueColor[1], metric.valueColor[2]);
    } else if (metric.highlight) {
      doc.setTextColor(15, 23, 42); // slate-900
    } else {
      doc.setTextColor(51, 65, 85); // slate-700
    }
    doc.text(metric.value, currentX + 4, currentY + 14);

    currentX += cardWidth + gap;
  });

  return currentY + cardHeight + Math.max(10, gap);
}

export const premiumTableStyles = {
  theme: 'grid',
  styles: {
    font: 'Roboto',
    fontSize: 9,
    cellPadding: 4,
    textColor: [30, 41, 59] as [number, number, number],
    lineColor: [226, 232, 240] as [number, number, number], // slate-200
    lineWidth: 0.1
  },
  headStyles: {
    fillColor: [241, 245, 249] as [number, number, number], // slate-100
    textColor: [15, 23, 42] as [number, number, number], // slate-900
    fontStyle: 'bold'
  },
  alternateRowStyles: {
    fillColor: [248, 250, 252] as [number, number, number] // slate-50
  }
};

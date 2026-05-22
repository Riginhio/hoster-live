import type { LoteriaBoard } from "@/lib/loteria";
import type { Session } from "@/lib/sessions/sessionStorage";
import type { BoardBatch } from "@/lib/boards/boardBatchStorage";

type GenerateBoardsPdfParams = {
  boards: LoteriaBoard[];
  session: Session | null;
  restaurantName: string;
  tablePrice: number;
  prizeAmount: number;
  validFrom?: string;
  validTo?: string;
};

const pageWidth = 215.9;
const pageHeight = 279.4;
const margin = 14;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value ? new Date(value) : new Date());
}

async function loadImageDataUrl(src: string) {
  const response = await fetch(src);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

type PdfDocument = InstanceType<(typeof import("jspdf"))["jsPDF"]>;

function drawQrPlaceholder(pdf: PdfDocument, x: number, y: number, size: number) {
  pdf.setDrawColor(217, 164, 65);
  pdf.setLineWidth(0.6);
  pdf.rect(x, y, size, size);
  pdf.setFillColor(20, 17, 15);
  pdf.rect(x + 2, y + 2, size - 4, size - 4, "F");

  pdf.setFillColor(217, 164, 65);
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      if ((row + col) % 2 === 0 || (row === 0 && col < 3) || (col === 4 && row > 1)) {
        pdf.rect(x + 5 + col * 4, y + 5 + row * 4, 2.4, 2.4, "F");
      }
    }
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(217, 164, 65);
  pdf.text("QR", x + size / 2, y + size + 4, { align: "center" });
}

function drawCover(pdf: PdfDocument, params: GenerateBoardsPdfParams) {
  const sessionId = params.session?.id ?? "demo-local";
  const createdAt = params.session?.createdAt;
  const isPhysicalBatch = !params.session;

  pdf.setFillColor(8, 7, 6);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setDrawColor(217, 164, 65);
  pdf.setLineWidth(1);
  pdf.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  pdf.setTextColor(217, 164, 65);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.text("HOSTER LIVE", pageWidth / 2, 58, { align: "center" });

  pdf.setTextColor(244, 234, 215);
  pdf.setFontSize(13);
  pdf.text("Hospitality Gaming Platform", pageWidth / 2, 68, { align: "center" });

  const details = isPhysicalBatch
    ? [
        ["Tipo", "Lote fisico reutilizable"],
        ["Tablas incluidas", String(params.boards.length || 50)],
        ["Restaurante", params.restaurantName || "Rancho Viejo"],
        ["Fecha", formatDate()],
        ...(params.validFrom || params.validTo
          ? [["Vigencia", `${params.validFrom ?? "Sin inicio"} - ${params.validTo ?? "Sin fin"}`]]
          : []),
      ]
    : [
        ["Restaurante", params.restaurantName],
        ["Session ID", sessionId],
        ["Fecha", formatDate(createdAt)],
        ["Cantidad de tablas", String(params.boards.length)],
        ["Costo por tabla", formatCurrency(params.tablePrice)],
        ["Premio calculado", formatCurrency(params.prizeAmount)],
      ];

  pdf.setFontSize(11);
  let y = 105;
  details.forEach(([label, value]) => {
    pdf.setTextColor(217, 164, 65);
    pdf.setFont("helvetica", "bold");
    pdf.text(label.toUpperCase(), 48, y);
    pdf.setTextColor(244, 234, 215);
    pdf.setFont("helvetica", "normal");
    pdf.text(value, 112, y);
    y += 12;
  });

  pdf.setFontSize(9);
  pdf.setTextColor(244, 234, 215);
  pdf.text("Powered by Hoster Live", pageWidth / 2, pageHeight - 24, { align: "center" });
}

function drawBoardFrame(pdf: PdfDocument, board: LoteriaBoard, params: GenerateBoardsPdfParams) {
  pdf.setFillColor(255, 252, 244);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setDrawColor(217, 164, 65);
  pdf.setLineWidth(1.2);
  pdf.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  pdf.setTextColor(8, 7, 6);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(board.folio, margin + 4, 24);

  pdf.setFontSize(10);
  pdf.text("Hoster Live", pageWidth / 2, 20, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(params.restaurantName, pageWidth / 2, 26, { align: "center" });

  drawQrPlaceholder(pdf, pageWidth - margin - 27, 17, 21);

  const footerY = pageHeight - 45;
  pdf.setFillColor(255, 252, 244);
  pdf.setDrawColor(217, 164, 65);
  pdf.setLineWidth(0.6);
  pdf.rect(margin + 4, footerY, pageWidth - margin * 2 - 8, 27);
  pdf.setDrawColor(20, 17, 15);
  pdf.setLineWidth(0.3);
  pdf.rect(margin + 8, footerY + 7, 38, 12);
  pdf.rect(margin + 52, footerY + 7, 58, 12);
  pdf.rect(margin + 116, footerY + 7, 28, 12);
  pdf.rect(margin + 150, footerY + 7, 29, 12);
  pdf.setFontSize(8);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Mesa", margin + 8, footerY + 5);
  pdf.text("Nombre cliente", margin + 52, footerY + 5);
  pdf.text("Folio", margin + 116, footerY + 5);
  pdf.text("Firma / recibido", margin + 150, footerY + 5);
}

export async function generateBoardsPdf(params: GenerateBoardsPdfParams) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const imageCache = new Map<string, string>();

  drawCover(pdf, params);

  for (const board of params.boards) {
    pdf.addPage();
    drawBoardFrame(pdf, board, params);

    const cardWidth = 35;
    const cardHeight = 55.5;
    const gap = 2.4;
    const gridWidth = cardWidth * 4 + gap * 3;
    const gridX = (pageWidth - gridWidth) / 2;
    const gridY = 36;

    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const card = board.cards[row][col];
        const x = gridX + col * (cardWidth + gap);
        const y = gridY + row * (cardHeight + gap);

        if (!imageCache.has(card.image)) {
          imageCache.set(card.image, await loadImageDataUrl(card.image));
        }

        pdf.setDrawColor(20, 17, 15);
        pdf.setLineWidth(0.28);
        pdf.rect(x - 0.6, y - 0.6, cardWidth + 1.2, cardHeight + 1.2);
        pdf.addImage(imageCache.get(card.image)!, "PNG", x, y, cardWidth, cardHeight);
      }
    }
  }

  const safeRestaurantName = params.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  pdf.save(`hoster-live-tablas-${safeRestaurantName || "sesion"}.pdf`);
}

export async function generateControlSheetPdf(params: {
  batch: BoardBatch;
  quantity: number;
  gameNumber?: string;
  ruletera?: string;
  mode?: string;
  prize?: number;
}) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const quantity = Math.min(params.quantity, params.batch.quantity);

  pdf.setFillColor(255, 252, 244);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setDrawColor(217, 164, 65);
  pdf.setLineWidth(1);
  pdf.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  pdf.setTextColor(8, 7, 6);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("HOSTER LIVE", margin + 4, 28);
  pdf.setFontSize(13);
  pdf.text("Hoja de control de jugada", margin + 4, 38);

  const details = [
    ["Restaurante", params.batch.restaurantName],
    ["Fecha", formatDate()],
    ["Jugada no.", params.gameNumber ?? ""],
    ["Ruletera", params.ruletera ?? ""],
    ["Modalidad", params.mode ?? ""],
    ["Premio", params.prize ? formatCurrency(params.prize) : ""],
  ];

  pdf.setFontSize(9);
  let y = 52;
  details.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? margin + 4 : 112;
    if (index > 0 && index % 2 === 0) y += 10;
    pdf.setFont("helvetica", "bold");
    pdf.text(label, x, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(value || "________________", x + 28, y);
  });

  const tableX = margin + 4;
  let tableY = 90;
  const rowHeight = 7;
  const colWidths = [24, 70, 22, 66];
  const headers = ["Folio", "Nombre cliente", "Pago", "Observaciones"];

  pdf.setFont("helvetica", "bold");
  pdf.setFillColor(20, 17, 15);
  pdf.setTextColor(244, 234, 215);
  let x = tableX;
  headers.forEach((header, index) => {
    pdf.rect(x, tableY, colWidths[index], rowHeight, "F");
    pdf.text(header, x + 2, tableY + 4.8);
    x += colWidths[index];
  });

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(8, 7, 6);
  tableY += rowHeight;

  for (let index = 0; index < quantity; index += 1) {
    if (tableY + rowHeight > pageHeight - margin - 4) {
      pdf.addPage();
      tableY = margin;
    }

    const folio = `HL-${String(index + 1).padStart(3, "0")}`;
    x = tableX;
    [folio, "", "", ""].forEach((value, colIndex) => {
      pdf.rect(x, tableY, colWidths[colIndex], rowHeight);
      if (value) pdf.text(value, x + 2, tableY + 4.8);
      x += colWidths[colIndex];
    });
    tableY += rowHeight;
  }

  pdf.save(`hoster-live-control-${params.batch.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}

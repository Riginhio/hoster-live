import type { LoteriaBoard } from "@/lib/loteria";
import type { Session } from "@/lib/sessions/sessionStorage";
import type { BoardBatch } from "@/lib/boards/boardBatchStorage";
import { createValidationUrl } from "@/lib/qr/qrPayload";
import { getRestaurantById } from "@/lib/restaurants/restaurantStorage";
import type { RestaurantConfig } from "@/lib/types";

type GenerateBoardsPdfParams = {
  boards: LoteriaBoard[];
  session: Session | null;
  restaurantName: string;
  tablePrice: number;
  prizeAmount: number;
  batch?: BoardBatch | null;
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

function drawQrPlaceholder(pdf: PdfDocument, x: number, y: number, size: number, validateUrl?: string) {
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

  if (validateUrl) {
    pdf.link(x, y, size, size, { url: validateUrl });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(4.4);
    pdf.setTextColor(80, 80, 80);
    const shortUrl = validateUrl.replace(/^https?:\/\//, "");
    pdf.text(shortUrl.slice(0, 34), x + size / 2, y + size + 8, { align: "center" });
  }
}

async function drawQrCode(pdf: PdfDocument, x: number, y: number, size: number, validateUrl?: string) {
  if (!validateUrl) {
    drawQrPlaceholder(pdf, x, y, size);
    return;
  }

  try {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=1&data=${encodeURIComponent(
      validateUrl,
    )}`;
    const qrImageDataUrl = await loadImageDataUrl(qrImageUrl);

    pdf.setDrawColor(217, 164, 65);
    pdf.setLineWidth(0.6);
    pdf.rect(x, y, size, size);
    pdf.addImage(qrImageDataUrl, "PNG", x + 1.2, y + 1.2, size - 2.4, size - 2.4);
    pdf.link(x, y, size, size, { url: validateUrl });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(4.4);
    pdf.setTextColor(80, 80, 80);
    pdf.text(validateUrl.replace(/^https?:\/\//, "").slice(0, 34), x + size / 2, y + size + 4, {
      align: "center",
    });
  } catch {
    drawQrPlaceholder(pdf, x, y, size, validateUrl);
  }
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

function getBoardValidationUrl(board: LoteriaBoard, params: GenerateBoardsPdfParams) {
  const batchId = params.batch?.id ?? params.session?.batchId;
  const restaurantId = params.batch?.restaurantId ?? params.session?.restaurantId;

  if (!batchId || !restaurantId) {
    return undefined;
  }

  return createValidationUrl(
    {
      restaurantId,
      restaurantName: params.batch?.restaurantName ?? params.session?.restaurantName,
      batchId,
      batchName: params.batch?.name,
      folio: board.folio,
    },
    typeof window !== "undefined" ? window.location.origin : "",
  );
}

async function drawBoardFrame(
  pdf: PdfDocument,
  board: LoteriaBoard,
  params: GenerateBoardsPdfParams,
  validateUrl?: string,
) {
  const restaurant = getRestaurantById(params.batch?.restaurantId ?? params.session?.restaurantId ?? "");
  pdf.setFillColor(255, 252, 244);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setDrawColor(217, 164, 65);
  pdf.setLineWidth(1.2);
  pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);

  pdf.setTextColor(8, 7, 6);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text(board.folio, 16, 24);

  if (restaurant?.logoUrl) {
    try {
      const logoDataUrl = await loadImageDataUrl(restaurant.logoUrl);
      pdf.addImage(logoDataUrl, "PNG", 88, 12, 40, 18);
    } catch {
      pdf.setFontSize(14);
      pdf.text(params.restaurantName, pageWidth / 2, 20, { align: "center" });
    }
  } else {
    pdf.setFontSize(14);
    pdf.text(params.restaurantName, pageWidth / 2, 20, { align: "center" });
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("HOSTER LIVE", pageWidth / 2, 30, { align: "center" });

  await drawQrCode(pdf, pageWidth - 40, 12, 24, validateUrl);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Escanea para promociones", pageWidth - 28, 42, { align: "center" });

  drawRestaurantSocials(pdf, restaurant);
}

function drawRestaurantSocials(pdf: PdfDocument, restaurant?: RestaurantConfig) {
  if (!restaurant) return;

  const socials = [
    restaurant.instagram ? `IG ${restaurant.instagram.replace(/^https?:\/\/(www\.)?/, "")}` : "",
    restaurant.facebook ? `FB ${restaurant.facebook.replace(/^https?:\/\/(www\.)?/, "")}` : "",
    restaurant.tiktok ? `TT ${restaurant.tiktok.replace(/^https?:\/\/(www\.)?/, "")}` : "",
  ].filter(Boolean);

  if (socials.length === 0) return;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(80, 80, 80);
  pdf.text(socials.join("  |  ").slice(0, 95), pageWidth / 2, pageHeight - 14, {
    align: "center",
  });
}

export async function generateBoardsPdf(params: GenerateBoardsPdfParams) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const imageCache = new Map<string, string>();

  drawCover(pdf, params);

  for (const board of params.boards) {
    pdf.addPage();
    const validateUrl = getBoardValidationUrl(board, params);
    await drawBoardFrame(pdf, board, params, validateUrl);

    const cardWidth = 39;
    const cardHeight = 61.9;
    const gap = 2.2;
    const gridWidth = cardWidth * 4 + gap * 3;
    const gridX = (pageWidth - gridWidth) / 2;
    const gridY = 44;

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
  pdf.setFontSize(16);
  pdf.text("HOSTER LIVE", margin + 4, 22);
  pdf.setFontSize(11);
  pdf.text("Hoja de control de jugada", margin + 4, 30);

  const details = [
    ["Restaurante", params.batch.restaurantName],
    ["Lote", params.batch.name],
    ["Fecha", formatDate()],
    ["Jugada no.", params.gameNumber ?? ""],
    ["Ruletera", params.ruletera ?? ""],
    ["Modalidad", params.mode ?? ""],
    ["Premio", params.prize ? formatCurrency(params.prize) : ""],
  ];

  pdf.setFontSize(7.4);
  let y = 40;
  details.forEach(([label, value], index) => {
    const column = index % 3;
    const x = margin + 4 + column * 62;
    if (index > 0 && column === 0) y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.text(label, x, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(String(value || "__________").slice(0, 28), x + 22, y);
  });

  const columns = 2;
  const rowsPerColumn = Math.ceil(quantity / columns);
  const tableTop = 62;
  const rowHeight = 7.2;
  const columnWidth = 91;
  const colWidths = [18, 43, 10, 20];
  const headers = ["Folio", "Nombre / mesa", "Pago", "Obs."];

  pdf.setTextColor(8, 7, 6);
  pdf.setFontSize(6.8);

  for (let column = 0; column < columns; column += 1) {
    const tableX = margin + 4 + column * (columnWidth + 4);
    let tableY = tableTop;

    pdf.setFont("helvetica", "bold");
    pdf.setFillColor(20, 17, 15);
    pdf.setTextColor(244, 234, 215);
    let x = tableX;
    headers.forEach((header, index) => {
      pdf.rect(x, tableY, colWidths[index], rowHeight, "F");
      pdf.text(header, x + 1.2, tableY + 4.7);
      x += colWidths[index];
    });

    tableY += rowHeight;
    pdf.setTextColor(8, 7, 6);
    pdf.setFont("helvetica", "normal");

    for (let row = 0; row < rowsPerColumn; row += 1) {
      const index = column * rowsPerColumn + row;
      if (index >= quantity) break;

      const folio = `HL-${String(index + 1).padStart(3, "0")}`;
      x = tableX;
      [folio, "____________", "□", "____"].forEach((value, colIndex) => {
        pdf.rect(x, tableY, colWidths[colIndex], rowHeight);
        pdf.text(value, x + 1.2, tableY + 4.7);
        x += colWidths[colIndex];
      });
      tableY += rowHeight;
    }
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Hoster Live", pageWidth / 2, pageHeight - 12, { align: "center" });

  pdf.save(`hoster-live-control-${params.batch.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface ReceiptPdfLineItem {
  productName: string;
  description?: string | null;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number;
  lineTotal: number;
}

export interface ReceiptPdfData {
  receiptNumber: string;
  orderNumber: string;
  receiptGeneratedAt: Date;
  orderCompletedAt: Date;
  transactionReference?: string | null;
  orderStatus: string;
  paymentStatus: 'PAID' | 'PARTIALLY PAID' | 'UNPAID' | 'REFUNDED';
  currency: string;
  merchant: {
    businessName: string;
    logoUrl?: string | null;
    brandColor?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
  };
  customer: {
    name: string;
    phone: string;
    deliveryAddress?: string | null;
  };
  items: ReceiptPdfLineItem[];
  financials: {
    subtotal: number;
    discountTotal: number;
    deliveryCharges: number;
    taxTotal: number;
    grandTotal: number;
    amountPaid: number;
    outstandingBalance: number;
  };
}

const COLORS = {
  navy: '#0F172A',
  navyMid: '#1E293B',
  orange: '#FF5500',
  orangeSoft: '#FFF7ED',
  white: '#FFFFFF',
  panelBg: '#F8FAFC',
  panelBorder: '#E2E8F0',
  divider: '#CBD5E1',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  rowAlt: '#F8FAFC',
  paidBg: '#DCFCE7',
  paidBorder: '#16A34A',
  paidText: '#15803D',
  partialBg: '#FEF3C7',
  partialBorder: '#D97706',
  partialText: '#B45309',
  unpaidBg: '#FEE2E2',
  unpaidBorder: '#DC2626',
  unpaidText: '#B91C1C',
  refundedBg: '#FFE4E6',
  refundedBorder: '#E11D48',
  refundedText: '#BE123C',
};

function formatCurrency(amount: number, currency: string): string {
  const safeCurrency = (currency || 'TZS').toUpperCase();
  const num = Number.isFinite(amount) ? amount : 0;
  const hasDecimals = Math.abs(num - Math.round(num)) > 0.001;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${safeCurrency} ${formatted}`;
}

function formatDateTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function resolveLogoBuffer(logoUrl?: string | null): Buffer | null {
  if (!logoUrl || typeof logoUrl !== 'string') return null;
  const trimmed = logoUrl.trim();
  const dataUriMatch = trimmed.match(/^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/i);
  if (dataUriMatch) {
    try {
      return Buffer.from(dataUriMatch[2], 'base64');
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith('/uploads/')) {
    const candidate = path.resolve(__dirname, '../../public', trimmed.replace(/^\/+/, ''));
    const uploadsRoot = path.resolve(__dirname, '../../public/uploads');
    if (candidate.startsWith(uploadsRoot) && fs.existsSync(candidate)) {
      try {
        const ext = path.extname(candidate).toLowerCase();
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          return fs.readFileSync(candidate);
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

function getPaymentBadgeColors(status: ReceiptPdfData['paymentStatus']) {
  switch (status) {
    case 'PAID':
      return { bg: COLORS.paidBg, border: COLORS.paidBorder, text: COLORS.paidText };
    case 'PARTIALLY PAID':
      return { bg: COLORS.partialBg, border: COLORS.partialBorder, text: COLORS.partialText };
    case 'REFUNDED':
      return { bg: COLORS.refundedBg, border: COLORS.refundedBorder, text: COLORS.refundedText };
    case 'UNPAID':
    default:
      return { bg: COLORS.unpaidBg, border: COLORS.unpaidBorder, text: COLORS.unpaidText };
  }
}

function sanitizeHexColor(input?: string | null, fallback: string = COLORS.navy): string {
  if (input && /^#[0-9A-Fa-f]{6}$/.test(input.trim())) {
    return input.trim();
  }
  return fallback;
}

export async function generateConfirmationReceiptPdf(data: ReceiptPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const margin = 40;
    const pageWidth = 595.28; // A4 width in pt
    const pageHeight = 841.89; // A4 height in pt
    const contentWidth = pageWidth - margin * 2; // 515.28 pt
    const bottomLimit = pageHeight - 78;

    const doc = new PDFDocument({
      size: 'A4',
      margin,
      bufferPages: true,
      compress: true,
      info: {
        Title: `Confirmation Receipt ${data.receiptNumber} - Order #${data.orderNumber}`,
        Author: data.merchant.businessName || 'LUMO Track',
        Subject: `Confirmation Receipt for Order #${data.orderNumber}`,
        Creator: 'LUMO Track Automated Confirmation Receipt System',
      },
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err: Error) => reject(err));

    const accentColor = sanitizeHexColor(data.merchant.brandColor, COLORS.orange);
    const logoBuf = resolveLogoBuffer(data.merchant.logoUrl);
    const cleanOrderNo = String(data.orderNumber || '').replace(/^#+/, '');

    // Top structural accent bar
    doc.rect(0, 0, pageWidth, 8).fill(COLORS.navy);
    doc.rect(0, 8, pageWidth, 3).fill(COLORS.orange);

    let y = 26;

    // ==================== A. BUSINESS INFORMATION & B. RECEIPT HEADER ====================
    const headerStartY = y;
    const leftBlockWidth = 285;
    const rightBlockX = margin + leftBlockWidth + 15;
    const rightBlockWidth = contentWidth - leftBlockWidth - 15;

    // Business logo or styled monogram
    let bizTextX = margin;
    const logoSize = 48;
    let renderedLogo = false;
    if (logoBuf) {
      try {
        doc.roundedRect(margin, y, logoSize, logoSize, 8).fillAndStroke(COLORS.white, COLORS.panelBorder);
        doc.image(logoBuf, margin + 4, y + 4, { fit: [logoSize - 8, logoSize - 8], align: 'center', valign: 'center' });
        renderedLogo = true;
      } catch {
        renderedLogo = false;
      }
    }
    if (!renderedLogo) {
      const badgeColor = accentColor.toUpperCase() === '#FFFFFF' ? COLORS.navy : accentColor;
      doc.roundedRect(margin, y, logoSize, logoSize, 10).fill(badgeColor);
      const initial = (data.merchant.businessName || 'L').trim().charAt(0).toUpperCase();
      doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(22).text(initial, margin, y + 13, {
        width: logoSize,
        align: 'center',
      });
    }
    bizTextX = margin + logoSize + 12;
    const bizTextWidth = leftBlockWidth - logoSize - 12;

    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(15).text(data.merchant.businessName, bizTextX, y, {
      width: bizTextWidth,
    });
    let bizY = doc.y + 2;
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.textSecondary);

    if (data.merchant.address) {
      doc.text(data.merchant.address, bizTextX, bizY, { width: bizTextWidth });
      bizY = doc.y + 1.5;
    }
    if (data.merchant.phone) {
      doc.text(`Tel: ${data.merchant.phone}`, bizTextX, bizY, { width: bizTextWidth });
      bizY = doc.y + 1.5;
    }
    if (data.merchant.email) {
      doc.text(`Email: ${data.merchant.email}`, bizTextX, bizY, { width: bizTextWidth });
      bizY = doc.y + 1.5;
    }
    if (data.merchant.website) {
      doc.text(`Web: ${data.merchant.website}`, bizTextX, bizY, { width: bizTextWidth });
      bizY = doc.y + 1.5;
    }

    // Right side: CONFIRMATION RECEIPT heading + metadata
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(16).text('CONFIRMATION RECEIPT', rightBlockX, headerStartY, {
      width: rightBlockWidth,
      align: 'right',
    });
    let metaY = doc.y + 4;

    const metaPairs: Array<[string, string]> = [
      ['Receipt No:', data.receiptNumber],
      ['Order No:', `#${cleanOrderNo}`],
      ['Receipt Date:', formatDateTime(data.receiptGeneratedAt)],
      ['Completed Date:', formatDateTime(data.orderCompletedAt)],
    ];
    if (data.transactionReference) {
      metaPairs.push(['Transaction Ref:', data.transactionReference]);
    }

    for (const [label, value] of metaPairs) {
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.textMuted).text(label, rightBlockX, metaY, {
        width: 82,
        align: 'left',
      });
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.navy).text(value, rightBlockX + 82, metaY, {
        width: rightBlockWidth - 82,
        align: 'right',
      });
      metaY = Math.max(doc.y, metaY + 11) + 2;
    }

    y = Math.max(bizY, metaY, headerStartY + logoSize + 8) + 12;

    // Divider line
    doc.moveTo(margin, y).lineTo(margin + contentWidth, y).strokeColor(COLORS.orange).lineWidth(1.5).stroke();
    y += 14;

    // ==================== C. CUSTOMER INFORMATION & F. PAYMENT/ORDER STATUS PANELS ====================
    const gap = 14;
    const leftPanelW = 295;
    const rightPanelW = contentWidth - leftPanelW - gap;
    const rightPanelX = margin + leftPanelW + gap;

    doc.font('Helvetica').fontSize(8.5);
    const addrText = data.customer.deliveryAddress || 'Not specified';
    const addrHeight = doc.heightOfString(addrText, { width: leftPanelW - 24 });
    const panelHeight = Math.max(82, 54 + addrHeight);

    // Customer Info Panel
    doc.roundedRect(margin, y, leftPanelW, panelHeight, 8).fillAndStroke(COLORS.panelBg, COLORS.panelBorder);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(8.5).text('CUSTOMER INFORMATION', margin + 12, y + 10);
    doc.moveTo(margin + 12, y + 23).lineTo(margin + leftPanelW - 12, y + 23).strokeColor(COLORS.panelBorder).lineWidth(0.75).stroke();

    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.textPrimary).text(data.customer.name, margin + 12, y + 29, {
      width: leftPanelW - 24,
    });
    let custY = doc.y + 2;
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.textSecondary).text(`Phone: ${data.customer.phone}`, margin + 12, custY, {
      width: leftPanelW - 24,
    });
    custY = doc.y + 2;
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.textMuted).text(`Address: ${addrText}`, margin + 12, custY, {
      width: leftPanelW - 24,
    });

    // Payment & Order Status Panel
    const badge = getPaymentBadgeColors(data.paymentStatus);
    doc.roundedRect(rightPanelX, y, rightPanelW, panelHeight, 8).fillAndStroke(COLORS.panelBg, COLORS.panelBorder);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(8.5).text('STATUS & VERIFICATION', rightPanelX + 12, y + 10);
    doc.moveTo(rightPanelX + 12, y + 23).lineTo(rightPanelX + rightPanelW - 12, y + 23).strokeColor(COLORS.panelBorder).lineWidth(0.75).stroke();

    doc.font('Helvetica').fontSize(8).fillColor(COLORS.textMuted).text('Order Status', rightPanelX + 12, y + 29);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.navy).text(
      data.orderStatus === 'DELIVERED' ? 'COMPLETED (DELIVERED)' : data.orderStatus.toUpperCase(),
      rightPanelX + 76,
      y + 28,
      { width: rightPanelW - 88, align: 'right' }
    );

    doc.font('Helvetica').fontSize(8).fillColor(COLORS.textMuted).text('Payment Status', rightPanelX + 12, y + 48);
    const pillW = Math.min(115, rightPanelW - 88);
    const pillX = rightPanelX + rightPanelW - 12 - pillW;
    doc.roundedRect(pillX, y + 45, pillW, 18, 4).fillAndStroke(badge.bg, badge.border);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(badge.text).text(data.paymentStatus, pillX, y + 50, {
      width: pillW,
      align: 'center',
    });

    if (data.paymentStatus !== 'PAID') {
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.textMuted).text(
        'Order completion does not confirm payment.',
        rightPanelX + 12,
        y + 68,
        { width: rightPanelW - 24 }
      );
    }

    y += panelHeight + 18;

    // ==================== D. ORDER DETAILS TABLE ====================
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(10).text('ORDER DETAILS', margin, y);
    y = doc.y + 6;

    const colWidths = [34, 223, 56, 98, 104.28]; // Sum = 515.28
    const headers = ['No.', 'Product', 'Quantity', 'Unit Price', 'Total'];

    const drawTableHeader = (startY: number): number => {
      const hdrH = 24;
      doc.roundedRect(margin, startY, contentWidth, hdrH, 4).fill(COLORS.navy);
      let x = margin;
      headers.forEach((hdr, i) => {
        const align = i >= 2 ? 'right' : 'left';
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.white).text(hdr, x + 7, startY + 8, {
          width: colWidths[i] - 14,
          align,
        });
        x += colWidths[i];
      });
      return startY + hdrH;
    };

    y = drawTableHeader(y);

    const itemsToRender: ReceiptPdfLineItem[] =
      data.items.length > 0
        ? data.items
        : [
            {
              productName: 'Order Item',
              quantity: 1,
              unitPrice: data.financials.subtotal,
              lineTotal: data.financials.subtotal,
            },
          ];

    itemsToRender.forEach((item, index) => {
      const productText = item.description
        ? `${item.productName}\n${item.description}`
        : item.productName;

      doc.font('Helvetica-Bold').fontSize(8.5);
      const nameHeight = doc.heightOfString(item.productName, { width: colWidths[1] - 14 });
      let descHeight = 0;
      if (item.description) {
        doc.font('Helvetica').fontSize(7.5);
        descHeight = doc.heightOfString(item.description, { width: colWidths[1] - 14 }) + 2;
      }
      const rowHeight = Math.max(24, nameHeight + descHeight + 12);

      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        doc.rect(0, 0, pageWidth, 6).fill(COLORS.navy);
        y = 36;
        doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9.5).text(
          `CONFIRMATION RECEIPT — ${data.receiptNumber} (Continued)`,
          margin,
          y
        );
        y = doc.y + 8;
        y = drawTableHeader(y);
      }

      if (index % 2 === 1) {
        doc.rect(margin, y, contentWidth, rowHeight).fill(COLORS.rowAlt);
      }

      let x = margin;
      // No.
      doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.textMuted).text(String(index + 1), x + 7, y + 7, {
        width: colWidths[0] - 14,
        align: 'left',
      });
      x += colWidths[0];

      // Product
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.textPrimary).text(item.productName, x + 7, y + 6, {
        width: colWidths[1] - 14,
        align: 'left',
      });
      if (item.description) {
        doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.textMuted).text(item.description, x + 7, y + 6 + nameHeight + 2, {
          width: colWidths[1] - 14,
          align: 'left',
        });
      }
      x += colWidths[1];

      // Quantity
      doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.textPrimary).text(String(item.quantity), x + 7, y + 7, {
        width: colWidths[2] - 14,
        align: 'right',
      });
      x += colWidths[2];

      // Unit Price
      doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.textPrimary).text(
        formatCurrency(item.unitPrice, data.currency),
        x + 7,
        y + 7,
        { width: colWidths[3] - 14, align: 'right' }
      );
      x += colWidths[3];

      // Total
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.navy).text(
        formatCurrency(item.lineTotal, data.currency),
        x + 7,
        y + 7,
        { width: colWidths[4] - 14, align: 'right' }
      );

      y += rowHeight;
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).strokeColor(COLORS.panelBorder).lineWidth(0.5).stroke();
    });

    y += 16;

    // ==================== E. FINANCIAL SUMMARY ====================
    const summaryRows: Array<{ label: string; value: string; bold?: boolean; color?: string; highlight?: boolean }> = [
      { label: 'Subtotal', value: formatCurrency(data.financials.subtotal, data.currency) },
    ];
    if (data.financials.discountTotal > 0) {
      summaryRows.push({
        label: 'Discounts',
        value: `-${formatCurrency(data.financials.discountTotal, data.currency)}`,
        color: COLORS.paidText,
      });
    }
    if (data.financials.deliveryCharges > 0) {
      summaryRows.push({
        label: 'Delivery Charges',
        value: formatCurrency(data.financials.deliveryCharges, data.currency),
      });
    }
    if (data.financials.taxTotal > 0) {
      summaryRows.push({
        label: 'Taxes',
        value: formatCurrency(data.financials.taxTotal, data.currency),
      });
    }
    summaryRows.push({
      label: 'Grand Total',
      value: formatCurrency(data.financials.grandTotal, data.currency),
      bold: true,
      highlight: true,
    });
    summaryRows.push({
      label: 'Amount Paid',
      value: formatCurrency(data.financials.amountPaid, data.currency),
      bold: true,
      color: data.financials.amountPaid > 0 ? COLORS.paidText : COLORS.textSecondary,
    });
    summaryRows.push({
      label: 'Outstanding Balance',
      value: formatCurrency(data.financials.outstandingBalance, data.currency),
      bold: true,
      color: data.financials.outstandingBalance > 0 ? COLORS.unpaidText : COLORS.paidText,
    });

    const summaryBoxH = summaryRows.length * 20 + 26;
    if (y + summaryBoxH + 70 > bottomLimit) {
      doc.addPage();
      doc.rect(0, 0, pageWidth, 6).fill(COLORS.navy);
      y = 36;
    }

    const summaryWidth = 250;
    const summaryX = margin + contentWidth - summaryWidth;

    doc.roundedRect(summaryX, y, summaryWidth, summaryBoxH, 8).fillAndStroke(COLORS.panelBg, COLORS.panelBorder);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(8.5).text('FINANCIAL SUMMARY', summaryX + 12, y + 9);
    let sy = y + 25;

    for (const row of summaryRows) {
      if (row.highlight) {
        doc.rect(summaryX + 6, sy - 3, summaryWidth - 12, 20).fill(COLORS.navy);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.white).text(row.label, summaryX + 12, sy + 2, {
          width: 110,
        });
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.orange).text(row.value, summaryX + 118, sy + 2, {
          width: summaryWidth - 130,
          align: 'right',
        });
      } else {
        doc.font(row.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(COLORS.textSecondary).text(
          row.label,
          summaryX + 12,
          sy + 1,
          { width: 110 }
        );
        doc.font(row.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(row.color || COLORS.textPrimary).text(
          row.value,
          summaryX + 118,
          sy + 1,
          { width: summaryWidth - 130, align: 'right' }
        );
      }
      sy += 20;
    }

    // Left-aligned Payment Verification Note beside Financial Summary
    const noteW = contentWidth - summaryWidth - 16;
    doc.roundedRect(margin, y, noteW, summaryBoxH, 8).fillAndStroke(COLORS.white, COLORS.panelBorder);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(8.5).text('PAYMENT VERIFICATION', margin + 12, y + 9);
    doc.roundedRect(margin + 12, y + 27, 96, 18, 4).fillAndStroke(badge.bg, badge.border);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(badge.text).text(data.paymentStatus, margin + 12, y + 32, {
      width: 96,
      align: 'center',
    });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.textSecondary).text(
      data.paymentStatus === 'PAID'
        ? 'Full payment has been recorded against this completed order.'
        : data.paymentStatus === 'PARTIALLY PAID'
        ? `Partial payment recorded. Remaining balance: ${formatCurrency(data.financials.outstandingBalance, data.currency)}.`
        : data.paymentStatus === 'REFUNDED'
        ? 'This order has been refunded in the merchant ledger.'
        : `No confirmed payment recorded yet. Outstanding balance: ${formatCurrency(data.financials.outstandingBalance, data.currency)}.`,
      margin + 12,
      y + 52,
      { width: noteW - 24 }
    );

    y += summaryBoxH + 22;

    // ==================== G. RECEIPT THANK-YOU BANNER ====================
    if (y + 56 > bottomLimit) {
      doc.addPage();
      doc.rect(0, 0, pageWidth, 6).fill(COLORS.navy);
      y = 36;
    }

    doc.moveTo(margin, y).lineTo(margin + contentWidth, y).strokeColor(COLORS.panelBorder).lineWidth(1).stroke();
    y += 12;

    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.navy).text(
      `Thank you for choosing ${data.merchant.businessName}.`,
      margin,
      y,
      { width: contentWidth, align: 'center' }
    );
    y = doc.y + 4;

    const contactParts: string[] = [];
    if (data.merchant.phone) contactParts.push(`Tel: ${data.merchant.phone}`);
    if (data.merchant.email) contactParts.push(`Email: ${data.merchant.email}`);
    if (data.merchant.address) contactParts.push(data.merchant.address);
    if (data.merchant.website) contactParts.push(data.merchant.website);

    if (contactParts.length > 0) {
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.textMuted).text(contactParts.join('  •  '), margin, y, {
        width: contentWidth,
        align: 'center',
      });
    }

    // ==================== PAGE NUMBERS & POWERED BY LUMO TRACK FOOTER ====================
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      const footerY = pageHeight - 44;
      doc.moveTo(margin, footerY - 8).lineTo(margin + contentWidth, footerY - 8).strokeColor(COLORS.panelBorder).lineWidth(0.75).stroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.textMuted).text(
        'Powered by LUMO Track',
        margin,
        footerY,
        { width: contentWidth / 2, align: 'left' }
      );
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.textMuted).text(
        `Page ${i + 1} of ${range.count}`,
        margin + contentWidth / 2,
        footerY,
        { width: contentWidth / 2, align: 'right' }
      );
    }

    doc.end();
  });
}


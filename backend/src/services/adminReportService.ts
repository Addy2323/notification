import { reportTranslator, Language } from '../localization';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { prisma } from '../database/prisma';

export interface ReportOptions {
  language?: Language;
  period: string;
  startDate?: Date;
  endDate?: Date;
  merchantId?: string;
  reportType: 'PLATFORM_OVERVIEW' | 'MERCHANT_PERFORMANCE' | 'SALES' | 'DELIVERIES' | 'AUDIT_LOGS';
  adminName?: string;
}

export async function fetchReportData(options: ReportOptions) {
  const now = new Date();
  let startDate = options.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  let endDate = options.endDate || now;

  if (!options.startDate) {
    if (options.period === 'TODAY') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (options.period === 'THIS_WEEK') {
      const day = now.getDay() || 7;
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day + 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (options.period === 'THIS_QUARTER') {
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
    } else if (options.period === 'SEMI_ANNUAL') {
      startDate = new Date(now.getFullYear(), now.getMonth() >= 6 ? 6 : 0, 1);
    } else if (options.period === 'THIS_YEAR') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
  }

  const whereMerchant = options.merchantId ? { merchant_id: options.merchantId } : {};

  const [merchants, orders, deliveries, drivers, notifications, auditLogs] = await Promise.all([
    prisma.merchant.findMany({
      where: options.merchantId ? { id: options.merchantId } : {},
      select: { id: true, business_name: true, business_phone: true, email: true, status: true, created_at: true },
    }),
    prisma.order.findMany({
      where: {
        ...whereMerchant,
        created_at: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        order_number: true,
        customer_name: true,
        customer_phone: true,
        product_name: true,
        amount: true,
        total_revenue: true,
        total_cost: true,
        gross_profit: true,
        status: true,
        created_at: true,
        merchant: { select: { business_name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 1000,
    }),
    prisma.delivery.findMany({
      where: {
        ...whereMerchant,
        created_at: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        customer_phone: true,
        driver_name: true,
        driver_phone: true,
        status: true,
        created_at: true,
        delivered_at: true,
        merchant: { select: { business_name: true } },
      },
      take: 1000,
    }),
    prisma.driver.findMany({
      where: options.merchantId ? { merchant_id: options.merchantId } : {},
      select: { id: true, name: true, phone: true, status: true, merchant: { select: { business_name: true } } },
    }),
    prisma.orderNotification.findMany({
      where: {
        order: whereMerchant,
        created_at: { gte: startDate, lte: endDate },
      },
      select: { id: true, channel: true, recipient_phone: true, status: true, sent_at: true },
      take: 1000,
    }),
    prisma.auditLog.findMany({
      where: { timestamp: { gte: startDate, lte: endDate } },
      orderBy: { timestamp: 'desc' },
      take: 200,
    }),
  ]);

  const totalSales = orders.reduce((sum, o) => sum + Number(o.total_revenue || o.amount || 0), 0);
  const totalCost = orders.reduce((sum, o) => sum + Number(o.total_cost || 0), 0);
  const grossProfit = orders.reduce((sum, o) => sum + Number(o.gross_profit || (Number(o.total_revenue || o.amount || 0) - Number(o.total_cost || 0))), 0);

  return {
    period: options.period,
    startDate,
    endDate,
    adminName: options.adminName || 'LUMO Control Centre System',
    reportType: options.reportType,
    merchants,
    orders,
    deliveries,
    drivers,
    notifications,
    auditLogs,
    summary: {
      totalMerchants: merchants.length,
      totalOrders: orders.length,
      deliveredOrders: orders.filter((o) => o.status === 'DELIVERED').length,
      failedOrders: orders.filter((o) => ['FAILED', 'CANCELLED'].includes(o.status)).length,
      totalSales,
      totalCost,
      grossProfit,
      totalDeliveries: deliveries.length,
      totalDrivers: drivers.length,
      totalNotifications: notifications.length,
    },
  };
}

export async function generateAdminPDFReport(options: ReportOptions): Promise<Buffer> {
  const r = reportTranslator(options.language);
  const locale = options.language === 'sw' ? 'sw-TZ' : 'en-TZ';
  const data = await fetchReportData(options);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Colors
    const primaryColor = '#1E293B'; // Slate 800
    const accentColor = '#F59E0B'; // Amber 500
    const textColor = '#334155'; // Slate 700

    // Header
    doc.fillColor(primaryColor).fontSize(20).text(r("reports.lumo_tracking"), 40, 40, { bold: true } as any);
    doc.fillColor(accentColor).fontSize(14).text(r("reports.administration_operational_report"), 40, 65);

    doc.fillColor(textColor).fontSize(9);
    doc.text(r("reports.report_period_value0", { value0: String(data.period) }), 400, 40, { align: 'right' });
    doc.text(r("reports.generated_at_value0", { value0: String(new Date().toLocaleString(locale)) }), 400, 52, { align: 'right' });
    doc.text(r("reports.generated_by_value0", { value0: String(data.adminName) }), 400, 64, { align: 'right' });

    doc.moveTo(40, 85).lineTo(555, 85).strokeColor('#E2E8F0').lineWidth(1).stroke();

    // Summary Cards Section
    doc.fillColor(primaryColor).fontSize(12).text(r("reports.platform_summary_snapshot"), 40, 100, { bold: true } as any);

    const cardY = 120;
    const cardWidth = 120;
    const cardHeight = 50;

    // Card 1
    doc.rect(40, cardY, cardWidth, cardHeight).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').fontSize(8).text(r("reports.total_merchants"), 50, cardY + 8);
    doc.fillColor(primaryColor).fontSize(14).text(String(data.summary.totalMerchants), 50, cardY + 22, { bold: true } as any);

    // Card 2
    doc.rect(170, cardY, cardWidth, cardHeight).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').fontSize(8).text(r("reports.total_orders"), 180, cardY + 8);
    doc.fillColor(primaryColor).fontSize(14).text(String(data.summary.totalOrders), 180, cardY + 22, { bold: true } as any);

    // Card 3
    doc.rect(300, cardY, cardWidth, cardHeight).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').fontSize(8).text(r("reports.total_sales_tzs"), 310, cardY + 8);
    doc.fillColor('#10B981').fontSize(12).text(data.summary.totalSales.toLocaleString(locale), 310, cardY + 24, { bold: true } as any);

    // Card 4
    doc.rect(430, cardY, cardWidth, cardHeight).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').fontSize(8).text(r("reports.gross_profit_tzs"), 440, cardY + 8);
    doc.fillColor('#059669').fontSize(12).text(data.summary.grossProfit.toLocaleString(locale), 440, cardY + 24, { bold: true } as any);

    // Table of Orders
    doc.fillColor(primaryColor).fontSize(12).text(r("reports.recent_operational_orders"), 40, 190, { bold: true } as any);

    let tableY = 210;
    doc.rect(40, tableY, 515, 20).fill('#1E293B');
    doc.fillColor('#FFFFFF').fontSize(8);
    doc.text(r("reports.order"), 45, tableY + 5);
    doc.text(r("reports.merchant"), 115, tableY + 5);
    doc.text(r("reports.customer"), 225, tableY + 5);
    doc.text(r("reports.product"), 325, tableY + 5);
    doc.text(r("reports.status"), 435, tableY + 5);
    doc.text(r("reports.revenue_tzs"), 490, tableY + 5, { align: 'right' });

    tableY += 20;

    data.orders.slice(0, 15).forEach((order, idx) => {
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(40, tableY, 515, 18).fill(bg);
      doc.fillColor(textColor).fontSize(7.5);
      doc.text(order.order_number, 45, tableY + 4);
      doc.text(order.merchant.business_name.substring(0, 18), 115, tableY + 4);
      doc.text(order.customer_name.substring(0, 18), 225, tableY + 4);
      doc.text(order.product_name.substring(0, 18), 325, tableY + 4);
      doc.text(order.status, 435, tableY + 4);
      doc.text(Number(order.total_revenue || order.amount || 0).toLocaleString(locale), 490, tableY + 4, { align: 'right' });
      tableY += 18;
    });

    // Footer
    doc.fillColor('#94A3B8').fontSize(8).text(r("reports.lumo_tracking_confidential_administrative_report"), 40, 780, { align: 'center' });

    doc.end();
  });
}

export async function generateAdminExcelReport(options: ReportOptions): Promise<Buffer> {
  const r = reportTranslator(options.language);
  const locale = options.language === 'sw' ? 'sw-TZ' : 'en-TZ';
  const data = await fetchReportData(options);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LUMO Control Centre';
  workbook.created = new Date();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet(r("reports.platform_summary"));
  summarySheet.columns = [
    { header: r("reports.metric"), key: 'metric', width: 30 },
    { header: r("reports.value"), key: 'value', width: 25 },
  ];

  summarySheet.addRows([
    { metric: r("reports.report_period"), value: data.period },
    { metric: r("reports.total_merchants"), value: data.summary.totalMerchants },
    { metric: r("reports.total_orders"), value: data.summary.totalOrders },
    { metric: r("reports.delivered_orders"), value: data.summary.deliveredOrders },
    { metric: r("reports.failed_cancelled_orders"), value: data.summary.failedOrders },
    { metric: r("reports.total_sales_tzs"), value: data.summary.totalSales },
    { metric: r("reports.total_product_cost_tzs"), value: data.summary.totalCost },
    { metric: r("reports.gross_profit_tzs"), value: data.summary.grossProfit },
    { metric: r("reports.total_deliveries"), value: data.summary.totalDeliveries },
    { metric: r("reports.total_drivers"), value: data.summary.totalDrivers },
    { metric: r("reports.total_sms_notifications"), value: data.summary.totalNotifications },
  ]);

  // Format header row
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  // Sheet 2: Merchants
  const merchantsSheet = workbook.addWorksheet(r("reports.merchants"));
  merchantsSheet.columns = [
    { header: r("reports.id"), key: 'id', width: 36 },
    { header: r("reports.business_name"), key: 'business_name', width: 25 },
    { header: r("reports.phone"), key: 'business_phone', width: 15 },
    { header: r("reports.email"), key: 'email', width: 25 },
    { header: r("reports.status"), key: 'status', width: 12 },
    { header: r("reports.joined_date"), key: 'created_at', width: 20 },
  ];

  data.merchants.forEach((m) => merchantsSheet.addRow(m));
  merchantsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  merchantsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  // Sheet 3: Orders
  const ordersSheet = workbook.addWorksheet(r("reports.orders"));
  ordersSheet.columns = [
    { header: r("reports.order_number"), key: 'order_number', width: 18 },
    { header: r("reports.merchant"), key: 'merchant', width: 25 },
    { header: r("reports.customer"), key: 'customer_name', width: 20 },
    { header: r("reports.phone"), key: 'customer_phone', width: 15 },
    { header: r("reports.product"), key: 'product_name', width: 25 },
    { header: r("reports.revenue_tzs"), key: 'revenue', width: 18 },
    { header: r("reports.cost_tzs"), key: 'cost', width: 18 },
    { header: r("reports.gross_profit_tzs"), key: 'profit', width: 18 },
    { header: r("reports.status"), key: 'status', width: 15 },
    { header: r("reports.date"), key: 'created_at', width: 20 },
  ];

  data.orders.forEach((o) => {
    ordersSheet.addRow({
      order_number: o.order_number,
      merchant: o.merchant.business_name,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      product_name: o.product_name,
      revenue: Number(o.total_revenue || o.amount || 0),
      cost: Number(o.total_cost || 0),
      profit: Number(o.gross_profit || 0),
      status: o.status,
      created_at: o.created_at.toISOString(),
    });
  });
  ordersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ordersSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

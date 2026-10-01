import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { prisma } from '../database/prisma';

export interface ReportOptions {
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
    doc.fillColor(primaryColor).fontSize(20).text('LUMO TRACKING', 40, 40, { bold: true } as any);
    doc.fillColor(accentColor).fontSize(14).text('ADMINISTRATION OPERATIONAL REPORT', 40, 65);

    doc.fillColor(textColor).fontSize(9);
    doc.text(`Report Period: ${data.period}`, 400, 40, { align: 'right' });
    doc.text(`Generated At: ${new Date().toLocaleString()}`, 400, 52, { align: 'right' });
    doc.text(`Generated By: ${data.adminName}`, 400, 64, { align: 'right' });

    doc.moveTo(40, 85).lineTo(555, 85).strokeColor('#E2E8F0').lineWidth(1).stroke();

    // Summary Cards Section
    doc.fillColor(primaryColor).fontSize(12).text('PLATFORM SUMMARY snapshot', 40, 100, { bold: true } as any);

    const cardY = 120;
    const cardWidth = 120;
    const cardHeight = 50;

    // Card 1
    doc.rect(40, cardY, cardWidth, cardHeight).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').fontSize(8).text('TOTAL MERCHANTS', 50, cardY + 8);
    doc.fillColor(primaryColor).fontSize(14).text(String(data.summary.totalMerchants), 50, cardY + 22, { bold: true } as any);

    // Card 2
    doc.rect(170, cardY, cardWidth, cardHeight).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').fontSize(8).text('TOTAL ORDERS', 180, cardY + 8);
    doc.fillColor(primaryColor).fontSize(14).text(String(data.summary.totalOrders), 180, cardY + 22, { bold: true } as any);

    // Card 3
    doc.rect(300, cardY, cardWidth, cardHeight).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').fontSize(8).text('TOTAL SALES (TZS)', 310, cardY + 8);
    doc.fillColor('#10B981').fontSize(12).text(data.summary.totalSales.toLocaleString(), 310, cardY + 24, { bold: true } as any);

    // Card 4
    doc.rect(430, cardY, cardWidth, cardHeight).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').fontSize(8).text('GROSS PROFIT (TZS)', 440, cardY + 8);
    doc.fillColor('#059669').fontSize(12).text(data.summary.grossProfit.toLocaleString(), 440, cardY + 24, { bold: true } as any);

    // Table of Orders
    doc.fillColor(primaryColor).fontSize(12).text('RECENT OPERATIONAL ORDERS', 40, 190, { bold: true } as any);

    let tableY = 210;
    doc.rect(40, tableY, 515, 20).fill('#1E293B');
    doc.fillColor('#FFFFFF').fontSize(8);
    doc.text('ORDER #', 45, tableY + 5);
    doc.text('MERCHANT', 115, tableY + 5);
    doc.text('CUSTOMER', 225, tableY + 5);
    doc.text('PRODUCT', 325, tableY + 5);
    doc.text('STATUS', 435, tableY + 5);
    doc.text('REVENUE (TZS)', 490, tableY + 5, { align: 'right' });

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
      doc.text(Number(order.total_revenue || order.amount || 0).toLocaleString(), 490, tableY + 4, { align: 'right' });
      tableY += 18;
    });

    // Footer
    doc.fillColor('#94A3B8').fontSize(8).text('LUMO Tracking — Confidential Administrative Report', 40, 780, { align: 'center' });

    doc.end();
  });
}

export async function generateAdminExcelReport(options: ReportOptions): Promise<Buffer> {
  const data = await fetchReportData(options);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LUMO Control Centre';
  workbook.created = new Date();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Platform Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 25 },
  ];

  summarySheet.addRows([
    { metric: 'Report Period', value: data.period },
    { metric: 'Total Merchants', value: data.summary.totalMerchants },
    { metric: 'Total Orders', value: data.summary.totalOrders },
    { metric: 'Delivered Orders', value: data.summary.deliveredOrders },
    { metric: 'Failed / Cancelled Orders', value: data.summary.failedOrders },
    { metric: 'Total Sales (TZS)', value: data.summary.totalSales },
    { metric: 'Total Product Cost (TZS)', value: data.summary.totalCost },
    { metric: 'Gross Profit (TZS)', value: data.summary.grossProfit },
    { metric: 'Total Deliveries', value: data.summary.totalDeliveries },
    { metric: 'Total Drivers', value: data.summary.totalDrivers },
    { metric: 'Total SMS Notifications', value: data.summary.totalNotifications },
  ]);

  // Format header row
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  // Sheet 2: Merchants
  const merchantsSheet = workbook.addWorksheet('Merchants');
  merchantsSheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Business Name', key: 'business_name', width: 25 },
    { header: 'Phone', key: 'business_phone', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Joined Date', key: 'created_at', width: 20 },
  ];

  data.merchants.forEach((m) => merchantsSheet.addRow(m));
  merchantsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  merchantsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  // Sheet 3: Orders
  const ordersSheet = workbook.addWorksheet('Orders');
  ordersSheet.columns = [
    { header: 'Order Number', key: 'order_number', width: 18 },
    { header: 'Merchant', key: 'merchant', width: 25 },
    { header: 'Customer', key: 'customer_name', width: 20 },
    { header: 'Phone', key: 'customer_phone', width: 15 },
    { header: 'Product', key: 'product_name', width: 25 },
    { header: 'Revenue (TZS)', key: 'revenue', width: 18 },
    { header: 'Cost (TZS)', key: 'cost', width: 18 },
    { header: 'Gross Profit (TZS)', key: 'profit', width: 18 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Date', key: 'created_at', width: 20 },
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

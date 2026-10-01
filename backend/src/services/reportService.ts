import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { prisma } from '../database/prisma';

export interface ReportOptions {
  reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL' | 'CUSTOM';
  startDate?: Date;
  endDate?: Date;
}

export class ReportService {
  private static getDatesForReport(options: ReportOptions) {
    const now = new Date();
    let start: Date;
    let end: Date = options.endDate || new Date();

    if (options.reportType === 'DAILY') {
      start = options.startDate || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59);
    } else if (options.reportType === 'WEEKLY') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = options.startDate || new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
    } else if (options.reportType === 'MONTHLY') {
      start = options.startDate || new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (options.reportType === 'QUARTERLY') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      start = options.startDate || new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0);
    } else if (options.reportType === 'SEMI_ANNUAL') {
      const semiMonth = now.getMonth() < 6 ? 0 : 6;
      start = options.startDate || new Date(now.getFullYear(), semiMonth, 1, 0, 0, 0);
    } else if (options.reportType === 'ANNUAL') {
      start = options.startDate || new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    } else {
      start = options.startDate || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    }

    return { start, end };
  }

  static async generatePDF(merchantId: string, options: ReportOptions): Promise<Buffer> {
    const { start, end } = this.getDatesForReport(options);

    // Fetch Merchant & Data
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    const orders = await prisma.order.findMany({
      where: {
        merchant_id: merchantId,
        created_at: { gte: start, lte: end },
      },
      include: { items: true },
      orderBy: { created_at: 'desc' },
    });

    const notificationsCount = await prisma.orderNotification.count({
      where: {
        order: { merchant_id: merchantId },
        created_at: { gte: start, lte: end },
      },
    });

    // Aggregations
    let totalSales = 0;
    let totalCost = 0;
    let grossProfit = 0;
    let productsSold = 0;
    let delivered = 0;
    let pending = 0;
    let failed = 0;
    let deliveredSales = 0;
    let pendingSales = 0;

    for (const ord of orders) {
      const rev = Number(ord.total_revenue || ord.amount || 0);
      const cost = Number(ord.total_cost || 0);
      const profit =
        ord.gross_profit !== null && ord.gross_profit !== undefined
          ? Number(ord.gross_profit)
          : cost > 0
          ? rev - cost
          : 0;

      totalSales += rev;
      totalCost += cost;
      grossProfit += profit;

      if (ord.status === 'DELIVERED') {
        delivered++;
        deliveredSales += rev;
      } else if (ord.status === 'FAILED' || ord.status === 'CANCELLED') {
        failed++;
      } else {
        pending++;
        pendingSales += rev;
      }

      for (const item of ord.items) {
        productsSold += item.quantity;
      }
    }

    // Build PDF Document matching Screenshots 2 & 3 layout
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const merchantName = merchant?.business_name || 'LUMO Operations Manager';
      const nowStr = new Date().toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'medium',
      });

      // ==================== HEADER (Teal Title & Metadata) ====================
      doc.fillColor('#0D9488').fontSize(22).font('Helvetica-Bold').text(merchantName, 36, 36);
      doc.fillColor('#64748B').fontSize(10).font('Helvetica').text('Financial & Delivery Operations Audit System', 36, 62);

      // Top-Right Metadata Block
      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
      doc.text(`Report: ${options.reportType} AUDIT`, 360, 38, { align: 'right', width: 200 });
      doc.font('Helvetica').fillColor('#64748B');
      doc.text(`Generated: ${nowStr}`, 360, 52, { align: 'right', width: 200 });
      doc.font('Helvetica-Bold').fillColor('#059669');
      doc.text(`Status: AUDITED & CLOSED`, 360, 66, { align: 'right', width: 200 });

      // Header Rule Line
      doc.moveTo(36, 84).lineTo(559, 84).strokeColor('#CBD5E1').lineWidth(1).stroke();

      // ==================== OPERATIONAL SUMMARY ====================
      doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('OPERATIONAL SUMMARY', 36, 96);

      // Side-by-Side Summary Cards
      const cardY = 114;
      const cardW = 254;
      const cardH = 92;

      // Card 1: TRANSACTIONS
      doc.rect(36, cardY, cardW, cardH).fillAndStroke('#F8FAFC', '#E2E8F0');

      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('TRANSACTIONS', 48, cardY + 10);
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
      doc.text(`Total Count:`, 48, cardY + 28);
      doc.font('Helvetica-Bold').text(`${orders.length}`, 160, cardY + 28, { align: 'right', width: 118 });

      doc.font('Helvetica').text(`Volume / Sales:`, 48, cardY + 42);
      doc.font('Helvetica-Bold').text(`TZS ${totalSales.toLocaleString()}`, 160, cardY + 42, { align: 'right', width: 118 });

      doc.font('Helvetica').text(`Delivered Sales:`, 48, cardY + 56);
      doc.font('Helvetica-Bold').fillColor('#16A34A').text(`+TZS ${deliveredSales.toLocaleString()}`, 160, cardY + 56, { align: 'right', width: 118 });

      doc.font('Helvetica').fillColor('#334155').text(`Pending Volume:`, 48, cardY + 70);
      doc.font('Helvetica-Bold').fillColor('#DC2626').text(`TZS ${pendingSales.toLocaleString()}`, 160, cardY + 70, { align: 'right', width: 118 });

      // Card 2: FINANCE
      doc.rect(305, cardY, cardW, cardH).fillAndStroke('#F8FAFC', '#E2E8F0');

      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('FINANCE', 317, cardY + 10);
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155');

      doc.text(`Sales Revenue:`, 317, cardY + 28);
      doc.font('Helvetica-Bold').fillColor('#16A34A').text(`+TZS ${totalSales.toLocaleString()}`, 425, cardY + 28, { align: 'right', width: 120 });

      doc.font('Helvetica').fillColor('#334155').text(`Product Cost:`, 317, cardY + 42);
      doc.font('Helvetica-Bold').fillColor('#DC2626').text(`-TZS ${totalCost.toLocaleString()}`, 425, cardY + 42, { align: 'right', width: 120 });

      doc.font('Helvetica').fillColor('#334155').text(`Cash / Margin:`, 317, cardY + 56);
      doc.font('Helvetica-Bold').fillColor('#0F172A').text(`TZS ${grossProfit.toLocaleString()}`, 425, cardY + 56, { align: 'right', width: 120 });

      doc.font('Helvetica').fillColor('#64748B').text(`Automated SMS:`, 317, cardY + 70);
      doc.font('Helvetica-Bold').fillColor('#475569').text(`${notificationsCount} Sent`, 425, cardY + 70, { align: 'right', width: 120 });

      // ==================== NET PROFIT HIGHLIGHT BANNER ====================
      const bannerY = 218;
      const isPositive = grossProfit >= 0;
      const bgHex = isPositive ? '#F0FDF4' : '#FEF2F2';
      const borderHex = isPositive ? '#BBF7D0' : '#FCA5A5';
      const textHex = isPositive ? '#16A34A' : '#DC2626';

      doc.rect(36, bannerY, 523, 34).fillAndStroke(bgHex, borderHex);

      doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text('Net Profit (Sales Revenue - Product Cost)', 52, bannerY + 11);
      doc.fillColor(textHex).fontSize(14).font('Helvetica-Bold').text(
        `${isPositive ? '+TZS' : '-TZS'} ${Math.abs(grossProfit).toLocaleString()}`,
        350,
        bannerY + 9,
        { align: 'right', width: 195 }
      );

      // ==================== TRANSACTIONS LEDGER TABLE ====================
      let y = 266;
      doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('TRANSACTIONS LEDGER', 36, y);

      y += 16;
      // Header Bar
      doc.rect(36, y, 523, 20).fill('#F1F5F9');
      doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold');
      doc.text('Ref', 42, y + 6);
      doc.text('Date', 105, y + 6);
      doc.text('Customer', 170, y + 6);
      doc.text('Product / Items', 260, y + 6);
      doc.text('Amount (TZS)', 380, y + 6, { align: 'right', width: 80 });
      doc.text('Profit (TZS)', 470, y + 6, { align: 'right', width: 80 });

      y += 20;
      doc.font('Helvetica').fontSize(8);

      for (const ord of orders.slice(0, 20)) {
        if (y > 740) {
          doc.addPage();
          y = 40;
        }

        const dateStr = ord.created_at.toLocaleDateString();
        const custStr = (ord.customer_name || 'Walk-in').substring(0, 15);
        const prodStr = (ord.product_name || 'Item snapshot').substring(0, 20);
        const rev = Number(ord.total_revenue || ord.amount || 0);
        const profit =
          ord.gross_profit !== null && ord.gross_profit !== undefined ? Number(ord.gross_profit) : 0;

        doc.fillColor('#334155');
        doc.text(ord.order_number, 42, y + 4);
        doc.text(dateStr, 105, y + 4);
        doc.text(custStr, 170, y + 4);
        doc.text(prodStr, 260, y + 4);

        doc.fillColor('#0F172A').font('Helvetica-Bold');
        doc.text(`TZS ${rev.toLocaleString()}`, 380, y + 4, { align: 'right', width: 80 });

        doc.fillColor(profit >= 0 ? '#16A34A' : '#DC2626');
        doc.text(profit !== 0 ? `TZS ${profit.toLocaleString()}` : '-', 470, y + 4, { align: 'right', width: 80 });

        doc.font('Helvetica');
        y += 17;
        doc.moveTo(36, y).lineTo(559, y).strokeColor('#F1F5F9').lineWidth(0.5).stroke();
      }

      // ==================== EXPENSES / PRODUCT COST LEDGER ====================
      if (y > 660) {
        doc.addPage();
        y = 40;
      } else {
        y += 20;
      }

      doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('EXPENSES & PRODUCT COST LEDGER', 36, y);

      y += 16;
      doc.rect(36, y, 523, 20).fill('#F1F5F9');
      doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold');
      doc.text('Date', 42, y + 6);
      doc.text('Description / Product Snapshot', 110, y + 6);
      doc.text('Qty', 350, y + 6, { align: 'center', width: 40 });
      doc.text('Cost Amount (TZS)', 430, y + 6, { align: 'right', width: 120 });

      y += 20;
      doc.font('Helvetica').fontSize(8);

      let costRowsCount = 0;
      for (const ord of orders) {
        for (const item of ord.items) {
          if (costRowsCount >= 15) break;
          if (y > 750) {
            doc.addPage();
            y = 40;
          }

          const dateStr = ord.created_at.toLocaleDateString();
          const itemCost = Number(item.unit_cost_price || 0) * item.quantity;

          doc.fillColor('#334155');
          doc.text(dateStr, 42, y + 4);
          doc.text(item.product_name_snapshot, 110, y + 4);
          doc.text(`${item.quantity}`, 350, y + 4, { align: 'center', width: 40 });

          doc.fillColor('#DC2626').font('Helvetica-Bold');
          doc.text(`-TZS ${itemCost.toLocaleString()}`, 430, y + 4, { align: 'right', width: 120 });

          doc.font('Helvetica');
          y += 17;
          doc.moveTo(36, y).lineTo(559, y).strokeColor('#F1F5F9').lineWidth(0.5).stroke();
          costRowsCount++;
        }
      }

      if (costRowsCount === 0) {
        doc.fillColor('#94A3B8').font('Helvetica').text('No individual line item costs recorded for this period.', 42, y + 6);
      }

      // ==================== FOOTER ====================
      doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica').text(
        `LUMO Operations Manager v1.0 • Digital Verification Seal: SEC-AUD-0099`,
        36,
        780,
        { align: 'center' }
      );

      doc.end();
    });
  }

  static async generateExcel(merchantId: string, options: ReportOptions): Promise<Buffer> {
    const { start, end } = this.getDatesForReport(options);

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    const orders = await prisma.order.findMany({
      where: {
        merchant_id: merchantId,
        created_at: { gte: start, lte: end },
      },
      include: {
        items: true,
        customer: true,
        driver: true,
        events: true,
        notifications: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const customers = await prisma.customer.findMany({
      where: { merchant_id: merchantId },
      include: { _count: { select: { orders: true } } },
    });

    const drivers = await prisma.driver.findMany({
      where: { merchant_id: merchantId },
      include: { _count: { select: { orders: true } } },
    });

    const products = await prisma.product.findMany({
      where: { merchant_id: merchantId },
    });

    const notifications = await prisma.orderNotification.findMany({
      where: {
        order: { merchant_id: merchantId },
        created_at: { gte: start, lte: end },
      },
      orderBy: { created_at: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LUMO Operations Engine';
    workbook.created = new Date();

    // 1. SUMMARY SHEET
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 25 },
    ];

    let totalSales = 0;
    let totalCost = 0;
    let grossProfit = 0;
    let productsSold = 0;
    let deliveredCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const ord of orders) {
      if (ord.status === 'DELIVERED') deliveredCount++;
      else if (ord.status === 'FAILED' || ord.status === 'CANCELLED') failedCount++;
      else pendingCount++;

      const rev = Number(ord.total_revenue || ord.amount || 0);
      const cost = Number(ord.total_cost || 0);
      const profit =
        ord.gross_profit !== null && ord.gross_profit !== undefined
          ? Number(ord.gross_profit)
          : cost > 0
          ? rev - cost
          : 0;

      totalSales += rev;
      totalCost += cost;
      grossProfit += profit;

      for (const item of ord.items) {
        productsSold += item.quantity;
      }
    }

    summarySheet.addRow({ metric: 'Merchant Business Name', value: merchant?.business_name || 'LUMO Merchant' });
    summarySheet.addRow({ metric: 'Report Type', value: options.reportType });
    summarySheet.addRow({ metric: 'Start Date', value: start.toLocaleDateString() });
    summarySheet.addRow({ metric: 'End Date', value: end.toLocaleDateString() });
    summarySheet.addRow({ metric: 'Total Orders', value: orders.length });
    summarySheet.addRow({ metric: 'Total Sales Revenue (TZS)', value: totalSales });
    summarySheet.addRow({ metric: 'Total Product Cost (TZS)', value: totalCost });
    summarySheet.addRow({ metric: 'Gross Profit (TZS)', value: grossProfit });
    summarySheet.addRow({ metric: 'Total Products Sold', value: productsSold });
    summarySheet.addRow({ metric: 'Delivered Orders', value: deliveredCount });
    summarySheet.addRow({ metric: 'Pending Deliveries', value: pendingCount });
    summarySheet.addRow({ metric: 'Failed/Cancelled Orders', value: failedCount });
    summarySheet.addRow({ metric: 'Notifications Sent', value: notifications.length });

    // 2. SALES SHEET
    const salesSheet = workbook.addWorksheet('Sales Ledger');
    salesSheet.columns = [
      { header: 'Order ID', key: 'orderNumber', width: 16 },
      { header: 'Order Date', key: 'date', width: 20 },
      { header: 'Customer Name', key: 'customerName', width: 22 },
      { header: 'Customer Phone', key: 'customerPhone', width: 18 },
      { header: 'Product Name', key: 'productName', width: 24 },
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'Category', key: 'category', width: 16 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Selling Price', key: 'price', width: 15 },
      { header: 'Unit Cost', key: 'cost', width: 15 },
      { header: 'Sales Revenue', key: 'revenue', width: 16 },
      { header: 'Total Cost', key: 'totalCost', width: 16 },
      { header: 'Gross Profit', key: 'profit', width: 16 },
      { header: 'Driver Name', key: 'driverName', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    for (const ord of orders) {
      if (ord.items && ord.items.length > 0) {
        for (const item of ord.items) {
          salesSheet.addRow({
            orderNumber: ord.order_number,
            date: ord.created_at.toISOString(),
            customerName: ord.customer_name,
            customerPhone: ord.customer_phone,
            productName: item.product_name_snapshot,
            sku: item.product_sku_snapshot || '-',
            category: item.product_category_snapshot || '-',
            quantity: item.quantity,
            price: Number(item.unit_selling_price),
            cost: Number(item.unit_cost_price || 0),
            revenue: Number(item.subtotal),
            totalCost: Number(item.unit_cost_price || 0) * item.quantity,
            profit: Number(item.profit_amount || 0),
            driverName: ord.driver_name || 'Unassigned',
            status: ord.status,
          });
        }
      } else {
        salesSheet.addRow({
          orderNumber: ord.order_number,
          date: ord.created_at.toISOString(),
          customerName: ord.customer_name,
          customerPhone: ord.customer_phone,
          productName: ord.product_name,
          sku: '-',
          category: '-',
          quantity: 1,
          price: Number(ord.amount || 0),
          cost: Number(ord.total_cost || 0),
          revenue: Number(ord.total_revenue || ord.amount || 0),
          totalCost: Number(ord.total_cost || 0),
          profit: Number(ord.gross_profit || 0),
          driverName: ord.driver_name || 'Unassigned',
          status: ord.status,
        });
      }
    }

    // Style Header Row
    salesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    salesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };

    // 3. CUSTOMERS SHEET
    const custSheet = workbook.addWorksheet('Customers');
    custSheet.columns = [
      { header: 'Customer Name', key: 'name', width: 24 },
      { header: 'Phone Number', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 22 },
      { header: 'Delivery Address', key: 'address', width: 30 },
      { header: 'Total Orders', key: 'ordersCount', width: 14 },
      { header: 'Created Date', key: 'created', width: 20 },
    ];

    for (const c of customers) {
      custSheet.addRow({
        name: c.name,
        phone: c.phone,
        email: c.email || '-',
        address: c.delivery_address || '-',
        ordersCount: c._count.orders,
        created: c.created_at.toISOString(),
      });
    }

    // 4. DRIVERS SHEET
    const driverSheet = workbook.addWorksheet('Drivers');
    driverSheet.columns = [
      { header: 'Driver Name', key: 'name', width: 24 },
      { header: 'Phone Number', key: 'phone', width: 18 },
      { header: 'Vehicle Info', key: 'vehicle', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Total Deliveries', key: 'count', width: 16 },
    ];

    for (const d of drivers) {
      driverSheet.addRow({
        name: d.name,
        phone: d.phone,
        vehicle: d.vehicle_info || '-',
        status: d.status,
        count: d._count.orders,
      });
    }

    // 5. NOTIFICATIONS SHEET
    const notifSheet = workbook.addWorksheet('Notifications');
    notifSheet.columns = [
      { header: 'Order ID', key: 'orderNumber', width: 16 },
      { header: 'Recipient Type', key: 'type', width: 15 },
      { header: 'Phone Number', key: 'phone', width: 18 },
      { header: 'Message Text', key: 'body', width: 45 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Sent Time', key: 'time', width: 20 },
    ];

    for (const n of notifications) {
      notifSheet.addRow({
        orderNumber: n.order_id,
        type: n.recipient_type,
        phone: n.recipient_phone,
        body: n.message_body,
        status: n.status,
        time: n.sent_at ? n.sent_at.toISOString() : n.created_at.toISOString(),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

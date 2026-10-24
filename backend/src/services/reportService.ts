import { reportTranslator, Language } from '../localization';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { ledgerFinancials } from './salesService';
import { prisma } from '../database/prisma';

export interface ReportOptions {
  language?: Language;
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
    const r = reportTranslator(options.language);
    const locale = options.language === 'sw' ? 'sw-TZ' : 'en-TZ';
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
      include: { items: true, events: { where: { event_type: 'ORDER_REFUNDED' } } },
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
      const financials = ledgerFinancials(ord);
      const rev = financials.net_revenue;
      const cost = financials.net_cost ?? 0;
      const profit = financials.net_profit ?? 0;

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
      const nowStr = new Date().toLocaleString(locale, {
        dateStyle: 'short',
        timeStyle: 'medium',
      });

      // ==================== HEADER (Teal Title & Metadata) ====================
      doc.fillColor('#0D9488').fontSize(22).font('Helvetica-Bold').text(merchantName, 36, 36);
      doc.fillColor('#64748B').fontSize(10).font('Helvetica').text(r("reports.financial_delivery_operations_audit_system"), 36, 62);

      // Top-Right Metadata Block
      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
      doc.text(r("reports.report_value0_audit", { value0: String(options.reportType) }), 360, 38, { align: 'right', width: 200 });
      doc.font('Helvetica').fillColor('#64748B');
      doc.text(r("reports.generated_value0", { value0: String(nowStr) }), 360, 52, { align: 'right', width: 200 });
      doc.font('Helvetica-Bold').fillColor('#059669');
      doc.text(r("reports.status_generated_report"), 360, 66, { align: 'right', width: 200 });

      // Header Rule Line
      doc.moveTo(36, 84).lineTo(559, 84).strokeColor('#CBD5E1').lineWidth(1).stroke();

      // ==================== OPERATIONAL SUMMARY ====================
      doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(r("reports.operational_summary"), 36, 96);

      // Side-by-Side Summary Cards
      const cardY = 114;
      const cardW = 254;
      const cardH = 92;

      // Card 1: TRANSACTIONS
      doc.rect(36, cardY, cardW, cardH).fillAndStroke('#F8FAFC', '#E2E8F0');

      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text(r("reports.transactions"), 48, cardY + 10);
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
      doc.text(r("reports.total_count"), 48, cardY + 28);
      doc.font('Helvetica-Bold').text(r("reports.value0", { value0: String(orders.length) }), 160, cardY + 28, { align: 'right', width: 118 });

      doc.font('Helvetica').text(r("reports.volume_sales"), 48, cardY + 42);
      doc.font('Helvetica-Bold').text(r("reports.tzs_value0", { value0: String(totalSales.toLocaleString(locale)) }), 160, cardY + 42, { align: 'right', width: 118 });

      doc.font('Helvetica').text(r("reports.delivered_sales"), 48, cardY + 56);
      doc.font('Helvetica-Bold').fillColor('#16A34A').text(r("reports.tzs_value0", { value0: String(deliveredSales.toLocaleString(locale)) }), 160, cardY + 56, { align: 'right', width: 118 });

      doc.font('Helvetica').fillColor('#334155').text(r("reports.pending_volume"), 48, cardY + 70);
      doc.font('Helvetica-Bold').fillColor('#DC2626').text(r("reports.tzs_value0", { value0: String(pendingSales.toLocaleString(locale)) }), 160, cardY + 70, { align: 'right', width: 118 });

      // Card 2: FINANCE
      doc.rect(305, cardY, cardW, cardH).fillAndStroke('#F8FAFC', '#E2E8F0');

      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text(r("reports.finance"), 317, cardY + 10);
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155');

      doc.text(r("reports.sales_revenue"), 317, cardY + 28);
      doc.font('Helvetica-Bold').fillColor('#16A34A').text(r("reports.tzs_value0", { value0: String(totalSales.toLocaleString(locale)) }), 425, cardY + 28, { align: 'right', width: 120 });

      doc.font('Helvetica').fillColor('#334155').text(r("reports.product_cost"), 317, cardY + 42);
      doc.font('Helvetica-Bold').fillColor('#DC2626').text(r("reports.tzs_value0", { value0: String(totalCost.toLocaleString(locale)) }), 425, cardY + 42, { align: 'right', width: 120 });

      doc.font('Helvetica').fillColor('#334155').text(r("reports.gross_profit"), 317, cardY + 56);
      doc.font('Helvetica-Bold').fillColor('#0F172A').text(r("reports.tzs_value0", { value0: String(grossProfit.toLocaleString(locale)) }), 425, cardY + 56, { align: 'right', width: 120 });

      doc.font('Helvetica').fillColor('#64748B').text(r("reports.automated_sms"), 317, cardY + 70);
      doc.font('Helvetica-Bold').fillColor('#475569').text(r("reports.value0_sent", { value0: String(notificationsCount) }), 425, cardY + 70, { align: 'right', width: 120 });

      // ==================== NET PROFIT HIGHLIGHT BANNER ====================
      const bannerY = 218;
      const isPositive = grossProfit >= 0;
      const bgHex = isPositive ? '#F0FDF4' : '#FEF2F2';
      const borderHex = isPositive ? '#BBF7D0' : '#FCA5A5';
      const textHex = isPositive ? '#16A34A' : '#DC2626';

      doc.rect(36, bannerY, 523, 34).fillAndStroke(bgHex, borderHex);

      doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text(r("reports.gross_profit_after_refunds"), 52, bannerY + 11);
      doc.fillColor(textHex).fontSize(14).font('Helvetica-Bold').text(
        r("reports.value0_value1", { value0: String(isPositive ? '+TZS' : '-TZS'), value1: String(Math.abs(grossProfit).toLocaleString(locale)) }),
        350,
        bannerY + 9,
        { align: 'right', width: 195 }
      );

      let y = 266;
      const money = (value: number | null) => value === null ? r("reports.not_recorded") : value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const refunds = orders.reduce((sum, order) => sum + ledgerFinancials(order).refund_amount, 0);
      const missing = orders.filter(order => ledgerFinancials(order).net_cost === null).length;
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      doc.text(r("reports.period_value0_value1", { value0: String(start.toLocaleDateString(locale)), value1: String(end.toLocaleDateString(locale)) }), 36, y, { width: 523 }); y = doc.y + 6;
      doc.text(r("reports.refunds_tzs_value0_orders_missing_buying_cost_value1", { value0: String(money(refunds)), value1: String(missing) }), 36, y, { width: 523 }); y = doc.y + 6;
      doc.text(r("reports.figures_include_all_delivery_stages_for_orders_created_in_this_period_using_their_current_"), 36, y, { width: 523 }); y = doc.y + 14;

      // Fixed column widths and measured row heights keep long values and page breaks readable.
      const table = (title: string, headers: string[], widths: number[], rows: string[][]) => {
        if (y > 690) { doc.addPage(); y = 40; }
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text(title, 36, y, { width: 523 }); y = doc.y + 8;
        const drawRow = (cells: string[], header = false) => {
          doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
          const height = Math.max(24, ...cells.map((cell, i) => doc.heightOfString(cell, { width: widths[i] - 10 }) + 12));
          if (header) doc.rect(36, y, 523, height).fill('#F1F5F9');
          let x = 36;
          cells.forEach((cell, i) => { doc.fillColor('#334155').text(cell, x + 5, y + 6, { width: widths[i] - 10 }); x += widths[i]; });
          y += height;
          doc.moveTo(36, y).lineTo(559, y).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
        };
        drawRow(headers, true);
        for (const row of rows) {
          doc.font('Helvetica').fontSize(8);
          const height = Math.max(24, ...row.map((cell, i) => doc.heightOfString(cell, { width: widths[i] - 10 }) + 12));
          if (y + height > 750) { doc.addPage(); y = 40; drawRow(headers, true); }
          drawRow(row);
        }
        if (!rows.length) { doc.font('Helvetica').fontSize(9).text(r("reports.no_records_for_this_period"), 42, y + 8); y += 28; }
        y += 20;
      };
      table(r("reports.sales_ledger_tzs"), [r("reports.order_date"), r("reports.customer_product"), r("reports.net_sales"), r("reports.net_buying_cost"), r("reports.gross_profit"), r("reports.status")], [87, 128, 77, 77, 77, 77], orders.map(order => {
        const f = ledgerFinancials(order);
        return [`${order.order_number}\n${order.created_at.toLocaleDateString(locale)}`, `${order.customer_name}\n${order.product_name}`, money(f.net_revenue), money(f.net_cost), money(f.net_profit), order.payment_status === 'REFUNDED' ? 'REFUNDED' : order.status];
      }));
      table(r("reports.product_prices_at_sale_tzs"), [r("reports.order_product"), r("reports.qty"), r("reports.buying_unit"), r("reports.selling_unit"), r("reports.discount"), r("reports.sale_profit")], [163, 35, 85, 85, 70, 85], orders.flatMap(order => order.items.map(item => [
        `${order.order_number}\n${item.product_name_snapshot}`, String(item.quantity), money(item.unit_cost_price === null ? null : Number(item.unit_cost_price)), money(Number(item.unit_selling_price)), money(Number(item.discount ?? 0)), money(item.profit_amount === null ? null : Number(item.profit_amount))
      ])));
      const refundRows = orders.flatMap(order => order.events.map(event => {
        let detail: any = {};
        try { detail = JSON.parse(event.metadata || '{}'); } catch {}
        return [order.order_number, event.timestamp.toLocaleDateString(locale), money(Number(detail.amount ?? 0)), String(detail.reason || ''), detail.restocked ? r("reports.returned_to_stock") : r("reports.cost_retained")];
      }));
      table(r("reports.refund_records_tzs"), [r("reports.order"), r("reports.refund_date"), r("reports.amount"), r("reports.reason"), r("reports.goods")], [87, 80, 85, 171, 100], refundRows);

      doc.end();
    });
  }

  static async generateExcel(merchantId: string, options: ReportOptions): Promise<Buffer> {
    const r = reportTranslator(options.language);
    const locale = options.language === 'sw' ? 'sw-TZ' : 'en-TZ';
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
    const summarySheet = workbook.addWorksheet(r("reports.summary"));
    summarySheet.columns = [
      { header: r("reports.metric"), key: 'metric', width: 30 },
      { header: r("reports.value"), key: 'value', width: 25 },
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

      const financials = ledgerFinancials(ord);
      const rev = financials.net_revenue;
      const cost = financials.net_cost ?? 0;
      const profit = financials.net_profit ?? 0;

      totalSales += rev;
      totalCost += cost;
      grossProfit += profit;

      for (const item of ord.items) {
        productsSold += item.quantity;
      }
    }

    summarySheet.addRow({ metric: r("reports.merchant_business_name"), value: merchant?.business_name || 'LUMO Merchant' });
    summarySheet.addRow({ metric: r("reports.report_type"), value: options.reportType });
    summarySheet.addRow({ metric: r("reports.start_date"), value: start.toLocaleDateString(locale) });
    summarySheet.addRow({ metric: r("reports.end_date"), value: end.toLocaleDateString(locale) });
    summarySheet.addRow({ metric: r("reports.total_orders"), value: orders.length });
    summarySheet.addRow({ metric: r("reports.total_sales_revenue_tzs"), value: totalSales });
    summarySheet.addRow({ metric: r("reports.total_product_cost_tzs"), value: totalCost });
    summarySheet.addRow({ metric: r("reports.gross_profit_tzs"), value: grossProfit });
    summarySheet.addRow({ metric: r("reports.refunds_tzs"), value: orders.reduce((sum, order) => sum + ledgerFinancials(order).refund_amount, 0) });
    summarySheet.addRow({ metric: r("reports.orders_missing_buying_cost"), value: orders.filter(order => ledgerFinancials(order).net_cost === null).length });
    summarySheet.addRow({ metric: r("reports.total_products_sold"), value: productsSold });
    summarySheet.addRow({ metric: r("reports.delivered_orders"), value: deliveredCount });
    summarySheet.addRow({ metric: r("reports.pending_deliveries"), value: pendingCount });
    summarySheet.addRow({ metric: r("reports.failed_cancelled_orders"), value: failedCount });
    summarySheet.addRow({ metric: r("reports.notifications_sent"), value: notifications.length });

    // 2. SALES SHEET
    const salesSheet = workbook.addWorksheet(r("reports.sales_ledger"));
    salesSheet.columns = [
      { header: r("reports.order_id"), key: 'orderNumber', width: 16 },
      { header: r("reports.order_date"), key: 'date', width: 20 },
      { header: r("reports.customer_name"), key: 'customerName', width: 22 },
      { header: r("reports.customer_phone"), key: 'customerPhone', width: 18 },
      { header: r("reports.product_name"), key: 'productName', width: 24 },
      { header: r("reports.sku"), key: 'sku', width: 14 },
      { header: r("reports.category"), key: 'category', width: 16 },
      { header: r("reports.quantity"), key: 'quantity', width: 10 },
      { header: r("reports.selling_price"), key: 'price', width: 15 },
      { header: r("reports.unit_cost"), key: 'cost', width: 15 },
      { header: r("reports.sales_revenue"), key: 'revenue', width: 16 },
      { header: r("reports.total_cost"), key: 'totalCost', width: 16 },
      { header: r("reports.gross_profit"), key: 'profit', width: 16 },
      { header: r("reports.driver_name"), key: 'driverName', width: 20 },
      { header: r("reports.status"), key: 'status', width: 15 },
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
            cost: item.unit_cost_price === null ? null : Number(item.unit_cost_price),
            revenue: ord.payment_status === 'REFUNDED' ? 0 : Number(item.subtotal),
            totalCost: item.unit_cost_price === null ? null : ledgerFinancials(ord).net_cost === 0 ? 0 : Number(item.unit_cost_price) * item.quantity,
            profit: item.unit_cost_price === null ? null : (ord.payment_status === 'REFUNDED' ? 0 : Number(item.subtotal)) - (ledgerFinancials(ord).net_cost === 0 ? 0 : Number(item.unit_cost_price) * item.quantity),
            driverName: ord.driver_name || 'Unassigned',
            status: ord.payment_status === 'REFUNDED' ? 'REFUNDED' : ord.status,
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
          revenue: ledgerFinancials(ord).net_revenue,
          totalCost: ledgerFinancials(ord).net_cost,
          profit: ledgerFinancials(ord).net_profit,
          driverName: ord.driver_name || 'Unassigned',
          status: ord.payment_status === 'REFUNDED' ? 'REFUNDED' : ord.status,
        });
      }
    }

    // Style Header Row
    salesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    salesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };

    // 3. CUSTOMERS SHEET
    const custSheet = workbook.addWorksheet(r("reports.customers"));
    custSheet.columns = [
      { header: r("reports.customer_name"), key: 'name', width: 24 },
      { header: r("reports.phone_number"), key: 'phone', width: 18 },
      { header: r("reports.email"), key: 'email', width: 22 },
      { header: r("reports.delivery_address"), key: 'address', width: 30 },
      { header: r("reports.total_orders"), key: 'ordersCount', width: 14 },
      { header: r("reports.created_date"), key: 'created', width: 20 },
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
    const driverSheet = workbook.addWorksheet(r("reports.drivers"));
    driverSheet.columns = [
      { header: r("reports.driver_name"), key: 'name', width: 24 },
      { header: r("reports.phone_number"), key: 'phone', width: 18 },
      { header: r("reports.vehicle_info"), key: 'vehicle', width: 20 },
      { header: r("reports.status"), key: 'status', width: 15 },
      { header: r("reports.total_deliveries"), key: 'count', width: 16 },
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
    const notifSheet = workbook.addWorksheet(r("reports.notifications"));
    notifSheet.columns = [
      { header: r("reports.order_id"), key: 'orderNumber', width: 16 },
      { header: r("reports.recipient_type"), key: 'type', width: 15 },
      { header: r("reports.phone_number"), key: 'phone', width: 18 },
      { header: r("reports.message_text"), key: 'body', width: 45 },
      { header: r("reports.status"), key: 'status', width: 14 },
      { header: r("reports.sent_time"), key: 'time', width: 20 },
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

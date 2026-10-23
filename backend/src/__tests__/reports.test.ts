jest.mock('../database/prisma', () => ({ prisma: {
  merchant: { findUnique: jest.fn() }, order: { findMany: jest.fn() },
  orderNotification: { count: jest.fn(), findMany: jest.fn() },
  customer: { findMany: jest.fn() }, driver: { findMany: jest.fn() }, product: { findMany: jest.fn() }
} }));
import { prisma } from '../database/prisma';
import { ReportService } from '../services/reportService';
import ExcelJS from 'exceljs';

beforeEach(() => {
  (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ business_name: 'Test Merchant' });
  (prisma.orderNotification.count as jest.Mock).mockResolvedValue(0);
  for (const model of [prisma.orderNotification, prisma.customer, prisma.driver, prisma.product]) (model.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.order.findMany as jest.Mock).mockResolvedValue(Array.from({ length: 25 }, (_, i) => ({
    id: String(i), order_number: `LUMO-${i}`, created_at: new Date('2026-10-01'), customer_name: 'Customer', product_name: 'Product', status: 'DELIVERED', payment_status: i === 0 ? 'REFUNDED' : 'PAID', total_revenue: 100, total_cost: 60,
    items: [{ product_name_snapshot: 'Product', quantity: 1, unit_selling_price: 100, unit_cost_price: 60, subtotal: 100, profit_amount: 40 }],
    events: i === 0 ? [{ timestamp: new Date(), metadata: JSON.stringify({ amount: 100, reason: 'Returned', restocked: true }), event_type: 'ORDER_REFUNDED' }] : []
  })));
});
it('generates a PDF for more than twenty orders and refunds', async () => {
  const pdf = await ReportService.generatePDF('merchant', { reportType: 'MONTHLY' });
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length).toBeGreaterThan(1);
  expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ merchant_id: 'merchant' }) }));
});
it('exports matching refund-adjusted totals and keeps original unit prices', async () => {
  const buffer = await ReportService.generateExcel('merchant', { reportType: 'MONTHLY' });
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(buffer as any);
  const summary = new Map();
  book.getWorksheet('Summary')!.eachRow(row => summary.set(row.getCell(1).value, row.getCell(2).value));
  expect(summary.get('Total Sales Revenue (TZS)')).toBe(2400);
  expect(summary.get('Total Product Cost (TZS)')).toBe(1440);
  expect(summary.get('Gross Profit (TZS)')).toBe(960);
  expect(summary.get('Refunds (TZS)')).toBe(100);
  const row = book.getWorksheet('Sales Ledger')!.getRow(2);
  expect(row.getCell(9).value).toBe(100);
  expect(row.getCell(10).value).toBe(60);
  expect(row.getCell(11).value).toBe(0);
  expect(row.getCell(13).value).toBe(0);
});

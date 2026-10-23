jest.mock('../database/prisma', () => ({ prisma: {} }));
import { ledgerFinancials } from '../services/salesService';

describe('sales ledger financials', () => {
  const order = { total_revenue: 100, total_cost: 60, amount: 999 };
  it('calculates profit from saved selling and buying totals', () => {
    expect(ledgerFinancials(order)).toMatchObject({ net_revenue: 100, net_cost: 60, net_profit: 40 });
  });
  it('preserves zero revenue and reports losses', () => {
    expect(ledgerFinancials({ ...order, total_revenue: 0 }).net_profit).toBe(-60);
  });
  it('does not invent profit for historical orders with missing cost', () => {
    expect(ledgerFinancials({ amount: 100, total_cost: null }).net_profit).toBeNull();
  });
  it('supports known zero buying cost', () => {
    expect(ledgerFinancials({ ...order, total_cost: 0 }).net_profit).toBe(100);
  });
  it('retains the cost when refunded goods are not recovered', () => {
    expect(ledgerFinancials({ ...order, payment_status: 'REFUNDED' })).toMatchObject({ net_revenue: 0, net_cost: 60, net_profit: -60, refund_amount: 100 });
  });
  it('reverses cost when refunded goods return to stock', () => {
    expect(ledgerFinancials({ ...order, payment_status: 'REFUNDED', events: [{ event_type: 'ORDER_REFUNDED', metadata: JSON.stringify({ restocked: true }) }] })).toMatchObject({ net_revenue: 0, net_cost: 0, net_profit: 0, refund_amount: 100 });
  });
});

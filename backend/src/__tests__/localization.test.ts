jest.mock('../database/prisma', () => ({ prisma: { merchantUser: { update: jest.fn(), findUnique: jest.fn() }, merchant: { findUnique: jest.fn() } } }));
jest.mock('../notifications/adapter', () => ({ MesejiSMSAdapter: jest.fn(), normalizePhone: (value: string) => value }));
import fs from 'fs';
import path from 'path';
import { resolveLanguage, reportTranslator, displayLabel, errorTranslationKey } from '../localization';
import { en, sw } from '../localization/messages';
import { updateLanguage, getMe } from '../controllers/authController';
import { prisma } from '../database/prisma';
import { orderMessageTemplate } from '../notifications/orderNotificationEngine';

const response = () => { const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() }; return res; };
it('resolves valid request, cookie and saved languages with a safe English default', () => {
  expect(resolveLanguage({ query: {}, headers: {}, cookies: {} } as any)).toBe('en');
  expect(resolveLanguage({ query: { language: 'xx' }, headers: {}, cookies: {} } as any)).toBe('en');
  expect(resolveLanguage({ query: {}, headers: { 'accept-language': 'sw-TZ,en;q=0.5' } } as any)).toBe('sw');
  expect(resolveLanguage({ query: {}, headers: {}, cookies: { lumo_language: 'sw' } } as any)).toBe('sw');
  expect(resolveLanguage({ query: {}, headers: {}, user: { language: 'sw' } } as any)).toBe('sw');
});
it('translates labels and preserves names and financial interpolation values', () => {
  expect(displayLabel('sw', 'Orders')).toBe('Oda');
  expect(displayLabel('sw', 'REFUNDED')).toBe('Fedha zimerejeshwa');
  expect(reportTranslator('sw')('interactions.merchant_value0_details_updated_successfully', { value0: 'Orders & Asha <Ltd>' })).toContain('Orders & Asha <Ltd>');
  expect(reportTranslator('en')('reports.refunds_tzs_value0_orders_missing_buying_cost_value1', { value0: '680,000', value1: 2 })).toContain('680,000');
});
it('falls back to English for genuinely missing Swahili messages', () => {
  const key = 'common.language', saved = sw[key];
  delete sw[key];
  expect(reportTranslator('sw')(key)).toBe(en[key]);
  sw[key] = saved;
});
it('saves only the authenticated user preference and refuses extra fields or unsupported codes', async () => {
  (prisma.merchantUser.update as jest.Mock).mockResolvedValue({ language: 'sw' });
  const res = response();
  await updateLanguage({ user: { id: 'signed-in-user' }, body: { language: 'sw' } } as any, res);
  expect(prisma.merchantUser.update).toHaveBeenCalledWith({ where: { id: 'signed-in-user' }, data: { language: 'sw' }, select: { language: true } });
  (prisma.merchantUser.update as jest.Mock).mockClear();
  for (const body of [{ language: 'xx' }, { language: 'sw', id: 'another-user' }, { language: 'sw', role: 'ADMIN' }]) {
    const failed = response(); await updateLanguage({ user: { id: 'user' }, body } as any, failed); expect(failed.status).toHaveBeenCalledWith(400);
  }
  expect(prisma.merchantUser.update).not.toHaveBeenCalled();
});
it('returns the saved account language from the existing profile endpoint', async () => {
  (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ business_name: 'Business' });
  const res = response(); const user = { id: 'user', merchant_id: 'merchant', language: 'sw' };
  await getMe({ user } as any, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { user, merchant: { business_name: 'Business' } } }));
});
it('maps unexpected server errors to safe localized messages', () => {
  const key = errorTranslationKey('Prisma error: secret connection information', 500);
  expect(key).toBe('errors.server');
  expect(reportTranslator('sw')(key)).not.toContain('Prisma');
});
it('keeps interpolation placeholders in translated delivery SMS templates', () => {
  for (const event of ['ORDER_CREATED', 'ORDER_CONFIRMED', 'DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'DRIVER_ARRIVED', 'ORDER_DELIVERED', 'ORDER_CANCELLED']) {
    const english = orderMessageTemplate(event, 'CUSTOMER', 'en')!;
    const swahili = orderMessageTemplate(event, 'CUSTOMER', 'sw')!;
    const placeholders = (value: string) => [...new Set(value.match(/\{\{\w+\}\}/g) || [])].sort();
    expect(placeholders(swahili)).toEqual(placeholders(english));
    expect(swahili).not.toBe(english);
  }
});
it('has identical resource keys and placeholders in both languages, synchronized with the backend', () => {
  const flatten = (value: any, prefix = '', result: Record<string, string> = {}) => { for (const [key, text] of Object.entries(value)) { const name = prefix ? `${prefix}.${key}` : key; if (typeof text === 'string') result[name] = text; else flatten(text, name, result); } return result; };
  const root = path.resolve(__dirname, '../../../frontend/locales');
  const english = flatten(JSON.parse(fs.readFileSync(path.join(root, 'en.json'), 'utf8')));
  const swahili = flatten(JSON.parse(fs.readFileSync(path.join(root, 'sw.json'), 'utf8')));
  expect(Object.keys(english).sort()).toEqual(Object.keys(swahili).sort());
  expect(en).toEqual(english); expect(sw).toEqual(swahili);
  const placeholders = (text: string) => [...new Set([...text.matchAll(/\{(\w+)(?:,|\})/g)].map(match => match[1]))].sort();
  for (const key of Object.keys(english)) expect({ key, values: placeholders(english[key]) }).toEqual({ key, values: placeholders(swahili[key]) });
});

import { test, expect, Page } from '@playwright/test';

async function mockApi(page: Page, initial: { authenticated?: boolean; language?: 'en' | 'sw' } = {}) {
  let authenticated = initial.authenticated ?? true;
  let language = initial.language ?? 'en';
  const saved: string[] = [];
  const user = () => ({ id: 'test-user', name: 'Asha Orders', role: 'ADMIN', merchant_id: 'merchant', language });
  const merchant = { id: 'merchant', business_name: 'Orders Shop', business_phone: '0712345678', brand_color: '#1E40AF' };
  const order = { id: 'order', order_number: 'LUMO-12345', merchant, customer_name: 'Asha English', customer_phone: '0712345678', product_name: 'English Phone', amount: '100', total_revenue: '100', total_cost: '60', gross_profit: '40', net_revenue: 100, net_cost: 60, net_profit: 40, refund_amount: 0, status: 'DELIVERED', payment_status: 'PAID', driver_name: 'Driver English', driver_phone: '0712345678', created_at: '2026-10-23T12:00:00.000Z', updated_at: '2026-10-23T12:00:00.000Z', delivery_address: 'Orders Street', events: [], notifications: [], items: [{ id: 'item', product_name_snapshot: 'English Phone', unit_selling_price: '100', unit_cost_price: '60', quantity: 1, discount: '0', subtotal: '100', profit_amount: '40' }] };
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^\/api/, '');
    const headers = { 'access-control-allow-origin': 'http://localhost:3100', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type,accept-language,authorization', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
    if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return; }
    let data: any = {};
    if (path === '/auth/me') {
      if (!authenticated) { await route.fulfill({ status: 401, headers, json: { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated', translationKey: 'errors.unauthorized' } } }); return; }
      data = { user: user(), merchant };
    } else if (path === '/auth/preferences/language') { language = request.postDataJSON().language; saved.push(language); data = { language }; }
    else if (path === '/auth/check-phone') data = { name: 'Asha Orders', business_name: merchant.business_name };
    else if (path === '/auth/verify-password' || path === '/auth/verify-pin') { authenticated = true; data = { token: 'test-token', user: user(), merchant }; }
    else if (path === '/auth/logout') { authenticated = false; data = {}; }
    else if (path === '/orders/metrics') data = { total: 1, delivered: 1, outForDelivery: 0, cancelled: 0 };
    else if (path === '/orders') data = { orders: [order], meta: { total: 1, page: 1, totalPages: 1 } };
    else if (path === '/orders/order') data = order;
    else if (path === '/sales') data = { orders: [order], summary: { totalOrders: 1, totalRevenue: 100, totalCost: 60, totalProfit: 40, deliveredCount: 1, pendingCount: 0, totalRefunds: 0, refundedCount: 0 }, pagination: { totalPages: 1 } };
    else if (path === '/admin/orders') data = { orders: [order], pagination: { total: 1, page: 1, totalPages: 1 } };
    else if (path === '/admin/analytics') data = { period: { timezone: 'Africa/Dar_es_Salaam' }, merchants: { total: 1, active: 1, engaged: 1 }, summary: { orders: 1, dispatches: 1, delivered: 1, sales: 100, cost: 60, profit: 40, refunds: 0, missingCostCount: 0 }, notifications: { total: 1, delivered: 1, failed: 0, queued: 0, deliveryRate: 100 }, trend: [{ label: '2026-10-23', sales: 100, profit: 40, orders: 1, delivered: 1, smsDelivered: 1, smsFailed: 0 }], dispatchStatuses: { DELIVERED: 1 }, notificationStatuses: { DELIVERED: 1 } };
    else if (path.startsWith('/track/')) data = { ...order, driver: { name: 'Driver English', phone: '0712345678' }, merchant, timeline: [] };
    else if (path === '/drivers' || path === '/customers') data = [];
    await route.fulfill({ status: 200, headers, json: { success: true, data } });
  });
  return { saved };
}
const selector = (page: Page) => page.getByRole('combobox', { name: /^(Language|Lugha)$/ }).first();

test('guest choice translates public and auth pages and survives refresh', async ({ page }) => {
  await mockApi(page, { authenticated: false });
  await page.goto('/features');
  await expect(page.getByRole('heading', { name: 'Complete Delivery Communication & Tracking Suite' })).toBeVisible();
  await selector(page).selectOption('sw');
  await expect(page.getByRole('heading', { name: 'Mfumo kamili wa arifa na ufuatiliaji wa mizigo' })).toBeVisible();
  await expect(page).toHaveURL('/features');
  await page.reload(); await expect(selector(page)).toHaveValue('sw');
  await expect(page.locator('html')).toHaveAttribute('lang', 'sw');
  await page.goto('/login');
  await expect(selector(page)).toHaveValue('sw');
  await expect(page.getByText('Ingia kusimamia arifa za mizigo na oda za biashara.', { exact: true })).toBeVisible();
});
test('merchant switching updates navigation, forms and financial labels without changing records', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/dashboard/orders');
  await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
  await selector(page).selectOption('sw');
  await expect(page.getByRole('heading', { name: 'Oda', exact: true })).toBeVisible();
  await expect(page.getByText('English Phone', { exact: true })).toBeVisible();
  await expect(page.getByText('Asha English', { exact: true })).toBeVisible();
  await expect.poll(() => api.saved).toContain('sw');
  await page.getByRole('button', { name: 'Sajili oda', exact: true }).click();
  await expect(page.getByText('Bei ya kununua (TZS) *', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).count();
  await page.reload(); await expect(selector(page)).toHaveValue('sw');
  await page.goto('/dashboard/sales');
  await expect(page.getByRole('columnheader', { name: 'Bei ya kununua (TZS)' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Bei ya kuuza (TZS)' })).toBeVisible();
  await expect(page.getByText('English Phone', { exact: true })).toBeVisible();
});
test('saved account language restores on sign-in, and admin graphs share the global state', async ({ page }) => {
  await mockApi(page, { authenticated: false, language: 'sw' });
  await page.goto('/login');
  await page.locator('input[placeholder="e.g. 0627204980"]').fill('0712345678');
  await page.locator('button[type="submit"]').click();
  for (const digit of ['1', '2', '3', '4']) await page.getByRole('button', { name: digit, exact: true }).click();
  await expect(page).toHaveURL('/admin');
  await expect(selector(page)).toHaveValue('sw');
  await page.goto('/admin/analytics');
  await expect(page.getByRole('heading', { name: 'Uchanganuzi wa mfumo', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Mauzo na faida ghafi (TZS)' })).toBeVisible();
  await selector(page).selectOption('en');
  await expect(page.getByRole('heading', { name: 'Platform Analytics', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Sales and gross profit (TZS)' })).toBeVisible();
});
test('tracking shares the same language without translating customer and driver names', async ({ page }) => {
  await mockApi(page, { language: 'sw' });
  await page.goto('/track/test-token');
  await expect(page.getByText('Driver English', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Orders Shop', { exact: true }).first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'sw');
  await expect(page.getByText('Oda yako imefikishwa. Karibu tena!', { exact: true })).toBeVisible();
});
test('mobile language control remains within the viewport and keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.goto('/dashboard/orders');
  const control = selector(page); await expect(control).toBeVisible();
  const box = await control.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await control.focus(); await expect(control).toBeFocused();
  await control.selectOption('sw'); await expect(page.getByRole('heading', { name: 'Oda', exact: true })).toBeVisible();
});

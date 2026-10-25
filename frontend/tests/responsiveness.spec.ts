import { test, expect, Page } from '@playwright/test';

const VIEWPORTS = [
  { width: 320, height: 600, label: '320px (Very narrow phone)' },
  { width: 360, height: 740, label: '360px (Compact Android)' },
  { width: 375, height: 667, label: '375px (Common mobile)' },
  { width: 390, height: 844, label: '390px (Modern phone)' },
  { width: 430, height: 932, label: '430px (Larger phone)' },
  { width: 768, height: 1024, label: '768px (Tablet portrait)' },
  { width: 1024, height: 768, label: '1024px (Tablet landscape)' },
  { width: 1440, height: 900, label: '1440px (Desktop)' },
];

async function mockApi(page: Page, initial: { authenticated?: boolean } = {}) {
  const authenticated = initial.authenticated ?? true;
  const user = { id: 'test-user', name: 'John Merchant', role: 'MERCHANT', merchant_id: 'merchant-1' };
  const merchant = { id: 'merchant-1', business_name: 'HOME DECO', business_phone: '0712345678' };
  const order = {
    id: 'ord-1',
    order_number: 'LUMO-8241',
    customer_name: 'Zuhura Omari',
    customer_phone: '0712345678',
    product_name: 'Living Room Rug',
    delivery_address: 'Mikocheni B, Dar es Salaam',
    status: 'OUT_FOR_DELIVERY',
    driver_name: 'Juma Hassan',
    driver_id: 'drv-1',
    created_at: new Date().toISOString(),
    tracking_token: 'tok-8241',
  };

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const headers = {
      'access-control-allow-origin': 'http://localhost:3100',
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'content-type,accept-language,authorization',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    };

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }

    let data: any = {};
    if (path === '/auth/me') {
      if (!authenticated) {
        await route.fulfill({ status: 401, headers, json: { success: false, error: { message: 'Unauthorized' } } });
        return;
      }
      data = { user, merchant };
    } else if (path === '/orders/metrics') {
      data = { total: 12, delivered: 8, outForDelivery: 3, cancelled: 1 };
    } else if (path === '/orders') {
      data = { orders: [order], meta: { total: 1, page: 1, totalPages: 1 } };
    } else if (path === '/drivers') {
      data = [{ id: 'drv-1', name: 'Juma Hassan', phone: '0712345678', status: 'ACTIVE' }];
    } else if (path === '/sms/overview') {
      data = {
        account: {
          availableCredits: 1250,
          health: { color: 'green', percentage: 85, statusLabelEn: 'Healthy Balance', statusLabelSw: 'Salio la Kutosha' },
        },
      };
    }

    await route.fulfill({ status: 200, headers, json: { success: true, data } });
  });
}

test.describe('Landing Page Mobile Responsiveness & Layout', () => {
  for (const vp of VIEWPORTS) {
    test(`Landing Page renders without horizontal overflow at ${vp.label}`, async ({ page }) => {
      await mockApi(page, { authenticated: false });
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      // Wait for splash screen fade
      await page.waitForTimeout(2200);

      // Verify no horizontal overflow: scrollWidth should be <= clientWidth
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasOverflow).toBe(false);

      // Verify Header branding is visible
      const logo = page.locator('header img[alt="LUMO Logo"]').first();
      await expect(logo).toBeVisible();

      // Verify Hero Heading is visible and readable
      const heroHeading = page.locator('main h1').first();
      await expect(heroHeading).toBeVisible();
      const heroText = await heroHeading.textContent();
      expect(heroText?.length).toBeGreaterThan(10);

      // Verify CTA buttons have comfortable touch targets (>= 44px)
      const primaryCta = page.getByRole('link', { name: /Get Started Free|Anza Bure/i }).first();
      await expect(primaryCta).toBeVisible();
      const ctaBox = await primaryCta.boundingBox();
      expect(ctaBox).not.toBeNull();
      if (ctaBox) {
        expect(ctaBox.height).toBeGreaterThanOrEqual(44);
        if (vp.width <= 430) {
          // On mobile, CTA should span nearly full container width
          expect(ctaBox.width).toBeGreaterThanOrEqual(vp.width - 50);
        }
      }

      // If mobile (< 768px), test hamburger drawer open/close
      if (vp.width < 768) {
        const menuBtn = page.getByRole('button', { name: /Navigation Menu|Menyu|Funga/i });
        await expect(menuBtn).toBeVisible();
        await menuBtn.click();
        const drawer = page.locator('#mobile-navigation-menu');
        await expect(drawer).toBeVisible();

        // Close drawer with Escape
        await page.keyboard.press('Escape');
        await expect(drawer).toBeHidden();
      }
    });
  }
});

test.describe('Authenticated Dashboard Mobile Responsiveness & Layout', () => {
  for (const vp of VIEWPORTS) {
    test(`Dashboard renders without horizontal overflow and with operational layout at ${vp.label}`, async ({ page }) => {
      await mockApi(page, { authenticated: true });
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/dashboard');

      // Verify no horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasOverflow).toBe(false);

      // 1. Verify Operational Introduction replaces promotional card
      const heading = page.getByRole('heading', { name: /Operations Overview|Muhtasari wa Uendeshaji/i });
      await expect(heading).toBeVisible();

      // Verify promotional hero slogans are NOT dominating the dashboard
      const promoSlogan = page.getByText(/Deliveries build a brighter Tanzania/i);
      await expect(promoSlogan).toBeHidden();

      // 2. Verify Search input is visible and usable
      const searchInput = page.locator('#mobile-search-input');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('LUMO-8241');
      await expect(searchInput).toHaveValue('LUMO-8241');

      // 3. Verify Operational KPI cards are rendered
      await expect(page.getByText(/Today's Orders|Maagizo ya leo/i).first()).toBeVisible();
      await expect(page.getByText(/Out for Delivery|Mizigo Ipo Njiani/i).first()).toBeVisible();

      // 4. Verify SMS balance card is rendered with real balance
      await expect(page.getByText(/1,250/).first()).toBeVisible();
      await expect(page.getByRole('link', { name: /Top Up SMS|Ongeza SMS/i })).toBeVisible();

      // 5. Verify Mobile Bottom Navigation on mobile viewports (< 768px)
      if (vp.width < 768) {
        const bottomNav = page.locator('nav[aria-label="Mobile Navigation"]');
        await expect(bottomNav).toBeVisible();

        // Verify bottom nav items
        await expect(bottomNav.getByText(/Overview/i)).toBeVisible();
        await expect(bottomNav.getByText(/Orders/i)).toBeVisible();
        await expect(bottomNav.getByText(/Deliveries/i)).toBeVisible();

        // Verify mobile order cards view is visible on mobile
        const mobileOrderNum = page.locator('span.font-mono:has-text("LUMO-8241")').first();
        await expect(mobileOrderNum).toBeVisible();
      } else {
        // Desktop table should be visible
        const table = page.locator('table');
        await expect(table).toBeVisible();
      }
    });
  }
});

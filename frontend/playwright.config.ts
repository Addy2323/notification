import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1, timeout: 30000,
  use: { baseURL: 'http://localhost:3100', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: { command: 'node ../node_modules/next/dist/bin/next start -p 3100', port: 3100, timeout: 120000, reuseExistingServer: !process.env.CI },
});

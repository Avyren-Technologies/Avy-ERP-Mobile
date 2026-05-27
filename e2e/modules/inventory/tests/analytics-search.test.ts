import { loginViaUI } from '../../../shared/fixtures/auth.fixture';

describe('Analytics & Search', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginViaUI();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  // ── Analytics ────────────────────────────

  it('should navigate to analytics', async () => {
    await device.openURL({ url: 'avy-erp://inventory/analytics' });
    await waitFor(element(by.text('Inventory Analytics')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to stock value', async () => {
    await device.openURL({ url: 'avy-erp://inventory/analytics-stock-value' });
    await waitFor(element(by.text('Stock Value Analysis')))
      .toBeVisible()
      .withTimeout(10000);
  });

  // ── Search ───────────────────────────────

  it('should navigate to search', async () => {
    await device.openURL({ url: 'avy-erp://inventory/search' });
    await waitFor(element(by.text('Inventory Search')))
      .toBeVisible()
      .withTimeout(10000);
  });

  // ── Import/Export ────────────────────────

  it('should navigate to import', async () => {
    await device.openURL({ url: 'avy-erp://inventory/import' });
    await waitFor(element(by.text('Import Data')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to export', async () => {
    await device.openURL({ url: 'avy-erp://inventory/export' });
    await waitFor(element(by.text('Export Data')))
      .toBeVisible()
      .withTimeout(10000);
  });
});

import { loginViaUI } from '../../../shared/fixtures/auth.fixture';

describe('Warehouse Scan Workflows', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginViaUI();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should navigate to putaway scan screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/warehouse/scan/putaway' });
    await waitFor(element(by.text('Putaway Scan')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to pick scan screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/warehouse/scan/pick' });
    await waitFor(element(by.text('Pick Scan')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to count scan screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/warehouse/scan/count' });
    await waitFor(element(by.text('Count Scan')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to dispatch scan screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/warehouse/scan/dispatch' });
    await waitFor(element(by.text('Dispatch Scan')))
      .toBeVisible()
      .withTimeout(10000);
  });
});

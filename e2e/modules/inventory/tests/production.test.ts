import { expect as detoxExpect } from 'detox';
import { loginViaUI } from '../../../shared/fixtures/auth.fixture';

describe('Inventory Production Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginViaUI();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should show issue to production list with FAB', async () => {
    await device.openURL({ url: 'avy-erp://inventory/production/issue' });
    await waitFor(element(by.text('Issue to Production')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show FG receipt list', async () => {
    await device.openURL({ url: 'avy-erp://inventory/production/fg-receipt' });
    await waitFor(element(by.text('FG Receipt')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show material return with condition options', async () => {
    await device.openURL({ url: 'avy-erp://inventory/production/material-return' });
    await waitFor(element(by.text('Material Return')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show production scrap screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/production/scrap' });
    await waitFor(element(by.text('Production Scrap')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show WO reconciliation screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/production/reconciliation' });
    await waitFor(element(by.text('WO Reconciliation')))
      .toBeVisible()
      .withTimeout(10000);
  });
});

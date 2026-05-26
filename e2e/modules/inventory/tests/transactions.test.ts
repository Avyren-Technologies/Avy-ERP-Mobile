import { expect as detoxExpect } from 'detox';
import { loginViaUI } from '../../../shared/fixtures/auth.fixture';

describe('Inventory Transactions', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginViaUI();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should show receive stock list', async () => {
    await device.openURL({ url: 'avy-erp://inventory/receive' });
    await waitFor(element(by.text('Receive Stock')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show dispatch list', async () => {
    await device.openURL({ url: 'avy-erp://inventory/dispatch' });
    await waitFor(element(by.text('Pack & Dispatch')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show customer returns list', async () => {
    await device.openURL({ url: 'avy-erp://inventory/returns' });
    await waitFor(element(by.text('Customer Returns')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show pick items list', async () => {
    await device.openURL({ url: 'avy-erp://inventory/issue' });
    await waitFor(element(by.text('Pick & Issue')))
      .toBeVisible()
      .withTimeout(10000);
  });
});

import { loginViaUI } from '../../../shared/fixtures/auth.fixture';

describe('Tool Room', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginViaUI();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should navigate to tool life policies', async () => {
    await device.openURL({ url: 'avy-erp://inventory/tool-room/policies' });
    await waitFor(element(by.text('Tool Life Policies')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to tool issue screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/tool-room/issue' });
    await waitFor(element(by.text('Tool Issue')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to tool return screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/tool-room/return' });
    await waitFor(element(by.text('Tool Return')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to reconditioning screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/tool-room/reconditioning' });
    await waitFor(element(by.text('Reconditioning')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to tool status report', async () => {
    await device.openURL({ url: 'avy-erp://inventory/tool-room/reports' });
    await waitFor(element(by.text('Tool Reports')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to tools at machine', async () => {
    await device.openURL({ url: 'avy-erp://inventory/tool-room/reports/at-machine' });
    await waitFor(element(by.text('Tools at Machine')))
      .toBeVisible()
      .withTimeout(10000);
  });
});

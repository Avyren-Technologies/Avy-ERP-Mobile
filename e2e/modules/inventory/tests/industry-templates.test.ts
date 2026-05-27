import { loginViaUI } from '../../../shared/fixtures/auth.fixture';

describe('Industry Templates', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginViaUI();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should navigate to industry templates screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/industry' });
    await waitFor(element(by.text('Industry Templates')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should show template cards', async () => {
    await waitFor(element(by.text('Pharma / Life Sciences')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should tap a template to view details', async () => {
    await element(by.text('Pharma / Life Sciences')).tap();
    await waitFor(element(by.text('FEFO Enforcement')))
      .toBeVisible()
      .withTimeout(3000);
  });
});

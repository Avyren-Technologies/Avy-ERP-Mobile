import { expect as detoxExpect } from 'detox';
import { loginViaUI } from '../../../shared/fixtures/auth.fixture';

describe('Maintenance Module — Smoke Tests', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginViaUI();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should show the maintenance dashboard after login', async () => {
    // Navigate to maintenance section via sidebar
    // Note: testIDs must be added to the actual app components
    // This test serves as a template — update selectors when testIDs are added
    await waitFor(element(by.text('Maintenance Dashboard')))
      .toBeVisible()
      .withTimeout(15000);
  });

  it('should navigate to asset register', async () => {
    await element(by.text('Asset Register')).tap();
    await waitFor(element(by.text('Asset Register').withAncestor(by.type('RCTView'))))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to work orders', async () => {
    await element(by.text('Work Orders')).tap();
    await waitFor(element(by.text('Work Orders')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to work requests', async () => {
    await element(by.text('Work Requests')).tap();
    await waitFor(element(by.text('Work Requests')))
      .toBeVisible()
      .withTimeout(10000);
  });
});

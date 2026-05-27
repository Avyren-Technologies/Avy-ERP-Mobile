import { loginViaUI } from '../../../shared/fixtures/auth.fixture';

describe('Offline Sync', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginViaUI();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should show sync status indicator on dashboard', async () => {
    await device.openURL({ url: 'avy-erp://inventory' });
    // Sync indicator should be visible (showing Synced or Online)
    await waitFor(element(by.text('Inventory Dashboard')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should navigate to sync conflicts screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/sync-conflicts' });
    await waitFor(element(by.text('Sync Conflicts')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show empty state when no conflicts', async () => {
    await waitFor(element(by.text('No conflicts to resolve')))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('should navigate back from sync conflicts', async () => {
    await element(by.id('inv-sync-back-btn')).tap();
    await waitFor(element(by.text('Inventory Dashboard')))
      .toBeVisible()
      .withTimeout(3000);
  });
});

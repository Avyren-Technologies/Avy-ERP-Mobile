import { expect as detoxExpect } from 'detox';
import { loginViaUI } from '../../../shared/fixtures/auth.fixture';

describe('Inventory Module — Smoke Tests', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginViaUI();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  // ── Core Screens ──────────────────────

  it('should navigate to inventory dashboard', async () => {
    await device.openURL({ url: 'avy-erp://inventory' });
    await waitFor(element(by.text('Inventory Dashboard')))
      .toBeVisible()
      .withTimeout(15000);
  });

  it('should navigate to stock explorer', async () => {
    await device.openURL({ url: 'avy-erp://inventory/stock' });
    await waitFor(element(by.text('Stock Explorer')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to GRN screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/grn' });
    await waitFor(element(by.text('Goods Receipt Notes')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to put-away screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/put-away' });
    await waitFor(element(by.text('Pending Putaway')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to stock transfer screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/transfer' });
    await waitFor(element(by.text('Stock Transfer')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to adjustments screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/adjustments' });
    await waitFor(element(by.text('Stock Adjustments')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to stock counts screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/counts' });
    await waitFor(element(by.text('Stock Counts')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to approvals screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/approvals' });
    await waitFor(element(by.text('Pending Approvals')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to reports screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/reports' });
    await waitFor(element(by.text('Inventory Reports')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to config screen', async () => {
    await device.openURL({ url: 'avy-erp://inventory/config' });
    await waitFor(element(by.text('Inventory Configuration')))
      .toBeVisible()
      .withTimeout(10000);
  });

  // ── Phase 2 — Production Screens ─────

  it('should navigate to issue to production', async () => {
    await device.openURL({ url: 'avy-erp://inventory/production/issue' });
    await waitFor(element(by.text('Issue to Production')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to FG receipt', async () => {
    await device.openURL({ url: 'avy-erp://inventory/production/fg-receipt' });
    await waitFor(element(by.text('FG Receipt')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to material return', async () => {
    await device.openURL({ url: 'avy-erp://inventory/production/material-return' });
    await waitFor(element(by.text('Material Return')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to production scrap', async () => {
    await device.openURL({ url: 'avy-erp://inventory/production/scrap' });
    await waitFor(element(by.text('Production Scrap')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should navigate to WO reconciliation', async () => {
    await device.openURL({ url: 'avy-erp://inventory/production/reconciliation' });
    await waitFor(element(by.text('WO Reconciliation')))
      .toBeVisible()
      .withTimeout(10000);
  });
});

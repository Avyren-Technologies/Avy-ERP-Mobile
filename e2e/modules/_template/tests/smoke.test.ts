import { expect as detoxExpect } from 'detox';
// import { MODULE_TEST_IDS } from '../routes';

describe('Module — Smoke Tests', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // TODO: Login if needed
    // await loginViaUI();
  });

  it('TODO: should load the main screen', async () => {
    // Example:
    // await expect(element(by.id(MODULE_TEST_IDS.screen.root))).toBeVisible();
  });
});

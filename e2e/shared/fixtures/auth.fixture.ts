import { BaseApiClient } from '../helpers/api-client';

const TEST_EMAIL = process.env.E2E_USER_EMAIL || 'admin@test.com';
const TEST_PASSWORD = process.env.E2E_USER_PASSWORD || 'Test@123';

/**
 * Login via the app UI. Call this in beforeAll().
 * Navigates through the login screen and waits for the dashboard.
 */
export async function loginViaUI(email = TEST_EMAIL, password = TEST_PASSWORD) {
  // Wait for login screen
  await waitFor(element(by.text('Sign In'))).toBeVisible().withTimeout(15000);

  // Type credentials
  await element(by.id('login-email')).typeText(email);
  await element(by.id('login-password')).typeText(password);

  // Tap Sign In
  await element(by.text('Sign In')).tap();

  // Wait for dashboard/home to load
  await waitFor(element(by.id('app-sidebar'))).toBeVisible().withTimeout(30000);
}

/**
 * Login via API (faster, no UI interaction needed).
 * Returns an authenticated API client for test data setup/teardown.
 */
export async function loginViaAPI(email = TEST_EMAIL, password = TEST_PASSWORD): Promise<BaseApiClient> {
  const client = new BaseApiClient();
  await client.login(email, password);
  return client;
}

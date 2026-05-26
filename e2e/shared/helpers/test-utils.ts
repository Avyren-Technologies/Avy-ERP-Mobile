/**
 * Wait for an element to be visible with a custom timeout.
 */
export async function waitForVisible(
  matcher: Detox.NativeMatcher,
  timeoutMs = 10000,
) {
  await waitFor(element(matcher)).toBeVisible().withTimeout(timeoutMs);
}

/**
 * Wait for an element to NOT be visible (e.g., loading spinner disappears).
 */
export async function waitForHidden(
  matcher: Detox.NativeMatcher,
  timeoutMs = 15000,
) {
  await waitFor(element(matcher)).not.toBeVisible().withTimeout(timeoutMs);
}

/**
 * Type text into a field identified by testID, clearing it first.
 */
export async function clearAndType(testID: string, text: string) {
  await element(by.id(testID)).clearText();
  await element(by.id(testID)).typeText(text);
}

/**
 * Tap a button by its testID.
 */
export async function tapById(testID: string) {
  await element(by.id(testID)).tap();
}

/**
 * Tap a button by its text.
 */
export async function tapByText(text: string) {
  await element(by.text(text)).tap();
}

/**
 * Scroll down inside a ScrollView/FlatList identified by testID.
 */
export async function scrollDown(testID: string, pixels = 300) {
  await element(by.id(testID)).scroll(pixels, 'down');
}

/**
 * Dismiss the keyboard (useful after typeText).
 */
export async function dismissKeyboard() {
  // Tap outside any input to dismiss
  try {
    await device.pressBack?.(); // Android
  } catch {
    // iOS — no pressBack, just continue
  }
}

/**
 * Wait for the app to finish loading (skeleton/spinner gone).
 * Relies on the app setting a testID="screen-loaded" or similar.
 */
export async function waitForScreenReady(testID = 'screen-loaded', timeoutMs = 15000) {
  try {
    await waitFor(element(by.id(testID))).toBeVisible().withTimeout(timeoutMs);
  } catch {
    // Fallback: wait a fixed time if no testID marker
    await new Promise((r) => setTimeout(r, 3000));
  }
}

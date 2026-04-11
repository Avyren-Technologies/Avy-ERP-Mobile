# Biometric Lock Enforcement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make biometric authentication work like WhatsApp/banking apps — persist correctly, lock on background→foreground, retry on failure, and clear on sign-out.

**Architecture:** A `BiometricLockGate` component wraps the authenticated app layout. It listens to `AppState` changes and overlays a full-screen lock requiring biometric auth whenever the app returns from background. The gate reads `biometric_enabled` from MMKV and is only active when the user has opted in. Sign-out clears all biometric keys so the next user starts fresh.

**Tech Stack:** expo-local-authentication, react-native AppState, MMKV (react-native-mmkv), Zustand

---

## Gap Analysis (5 issues found)

| # | Gap | Impact |
|---|-----|--------|
| 1 | **No biometric lock on app resume** | App never re-challenges after initial login — defeats the purpose |
| 2 | **No retry mechanism** | If biometric prompt is dismissed or fails, user is stuck with no way to retry |
| 3 | **Settings toggle reads stale state** | `getItem` is called once on mount in settings screen — if the biometric keys were cleared by `use-biometric-login.ts` (401 cleanup), the settings screen can show stale state |
| 4 | **Biometric keys survive sign-out** | If user A enables biometric → logs out → user B logs in, user B inherits user A's biometric token (security issue) |
| 5 | **Dynamic require in `use-biometric-login.ts`** | Line 89 uses `require('@/lib/storage')` instead of a proper import for `setItem` |

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/components/ui/biometric-lock-gate.tsx` | **Create** | Full-screen lock overlay + AppState listener |
| `src/app/(app)/_layout.tsx` | **Modify** | Wrap layout with `BiometricLockGate` |
| `src/hooks/use-biometric-login.ts` | **Modify** | Fix dynamic require, improve cleanup |
| `src/features/auth/use-auth-store.ts` | **Modify** | Clear biometric MMKV keys on signOut |
| `src/features/settings/settings-screen.tsx` | **Modify** | Listen for app focus to refresh toggle state |

---

### Task 1: Fix `use-biometric-login.ts` — remove dynamic require

**Files:**
- Modify: `src/hooks/use-biometric-login.ts:6,89-90`

- [ ] **Step 1: Add `setItem` to the import**

Change line 6 from:
```typescript
import { getItem, removeItem } from '@/lib/storage';
```
to:
```typescript
import { getItem, removeItem, setItem } from '@/lib/storage';
```

- [ ] **Step 2: Remove the dynamic require on line 89-90**

Replace:
```typescript
          const { setItem } = require('@/lib/storage') as typeof import('@/lib/storage');
          await setItem(BIOMETRIC_TOKEN_KEY, tokens.refreshToken);
```
with:
```typescript
          setItem(BIOMETRIC_TOKEN_KEY, tokens.refreshToken);
```

- [ ] **Step 3: Run type-check**

Run: `pnpm type-check`
Expected: PASS — no errors

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-biometric-login.ts
git commit -m "fix: replace dynamic require with static import in biometric login hook"
```

---

### Task 2: Clear biometric keys on sign-out

**Files:**
- Modify: `src/features/auth/use-auth-store.ts:1,102-113`

- [ ] **Step 1: Add biometric key constants**

After the existing `USER_DATA_KEY` constant (line ~19), add:
```typescript
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_TOKEN_KEY = 'biometric_token';
const BIOMETRIC_PROMPT_SHOWN_KEY = 'biometric_prompt_shown';
const BIOMETRIC_COMPANY_SETTING_KEY = 'biometric_company_setting';
```

- [ ] **Step 2: Clear biometric keys in `signOut`**

In the `signOut` method, after `removeItem(USER_DATA_KEY)` (line 109), add:
```typescript
        // Clear biometric data so the next user starts fresh
        removeItem(BIOMETRIC_ENABLED_KEY);
        removeItem(BIOMETRIC_TOKEN_KEY);
        removeItem(BIOMETRIC_PROMPT_SHOWN_KEY);
        removeItem(BIOMETRIC_COMPANY_SETTING_KEY);
```

- [ ] **Step 3: Run type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/auth/use-auth-store.ts
git commit -m "fix: clear biometric MMKV keys on sign-out to prevent cross-user leakage"
```

---

### Task 3: Create `BiometricLockGate` component

This is the core feature. It overlays a full-screen lock whenever:
- The app returns from background AND `biometric_enabled` is true in MMKV
- Provides retry button when authentication fails or is dismissed
- Shows unlock prompt automatically on gate activation

**Files:**
- Create: `src/components/ui/biometric-lock-gate.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/ui/biometric-lock-gate.tsx` with this implementation:

```typescript
import * as LocalAuthentication from 'expo-local-authentication';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { getItem } from '@/lib/storage';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

/**
 * Full-screen biometric lock gate.
 *
 * Wraps the authenticated app content. When the app returns from background
 * and biometric login is enabled, this component overlays a lock screen
 * that requires biometric authentication to dismiss — like WhatsApp or
 * banking apps.
 *
 * Behavior:
 * - On app resume (background → active): show lock if biometric is enabled
 * - Auto-prompts biometric on lock activation
 * - Retry button if prompt is dismissed or fails
 * - Grace period of 2 seconds — quick app switches (e.g., photo picker) don't trigger lock
 */
export function BiometricLockGate({ children }: { children: React.ReactNode }) {
    const [locked, setLocked] = useState(false);
    const [authFailed, setAuthFailed] = useState(false);
    const backgroundTimestamp = useRef<number | null>(null);
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const isAuthenticating = useRef(false);

    // Grace period in ms — don't lock for very brief background visits
    // (e.g., permission dialogs, share sheets, camera/photo picker)
    const GRACE_PERIOD_MS = 2000;

    const authenticate = useCallback(async () => {
        if (isAuthenticating.current) return;
        isAuthenticating.current = true;
        setAuthFailed(false);

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Avy ERP',
                cancelLabel: 'Cancel',
                disableDeviceFallback: false,
            });

            if (result.success) {
                setLocked(false);
                setAuthFailed(false);
            } else {
                setAuthFailed(true);
            }
        } catch {
            setAuthFailed(true);
        } finally {
            isAuthenticating.current = false;
        }
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            const prevState = appState.current;
            appState.current = nextState;

            // App going to background — record timestamp
            if (nextState === 'background' || nextState === 'inactive') {
                if (prevState === 'active') {
                    backgroundTimestamp.current = Date.now();
                }
                return;
            }

            // App returning to foreground
            if (nextState === 'active' && (prevState === 'background' || prevState === 'inactive')) {
                const biometricEnabled = getItem<boolean>(BIOMETRIC_ENABLED_KEY);
                if (!biometricEnabled) return;

                // Check grace period
                const elapsed = backgroundTimestamp.current
                    ? Date.now() - backgroundTimestamp.current
                    : Infinity;
                backgroundTimestamp.current = null;

                if (elapsed < GRACE_PERIOD_MS) return;

                // Lock the app and prompt authentication
                setLocked(true);
                setAuthFailed(false);
            }
        });

        return () => subscription.remove();
    }, []);

    // Auto-prompt when lock activates
    useEffect(() => {
        if (locked && !isAuthenticating.current) {
            // Small delay to let the lock overlay render first
            const timer = setTimeout(() => authenticate(), 300);
            return () => clearTimeout(timer);
        }
    }, [locked, authenticate]);

    return (
        <>
            {children}
            {locked && (
                <Modal
                    visible
                    transparent={false}
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={() => {
                        // Prevent Android back button from dismissing the lock
                    }}
                >
                    <View style={lockStyles.container}>
                        <View style={lockStyles.iconCircle}>
                            <Text style={lockStyles.lockIcon}>🔒</Text>
                        </View>
                        <Text style={lockStyles.title}>App Locked</Text>
                        <Text style={lockStyles.subtitle}>
                            Authenticate to unlock Avy ERP
                        </Text>

                        {authFailed && (
                            <Text style={lockStyles.errorText}>
                                Authentication failed. Tap below to try again.
                            </Text>
                        )}

                        <Pressable
                            style={({ pressed }) => [
                                lockStyles.unlockButton,
                                pressed && lockStyles.unlockButtonPressed,
                            ]}
                            onPress={authenticate}
                        >
                            <Text style={lockStyles.unlockButtonText}>
                                {authFailed ? 'Retry' : 'Unlock'}
                            </Text>
                        </Pressable>
                    </View>
                </Modal>
            )}
        </>
    );
}

const lockStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: colors.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    lockIcon: {
        fontSize: 44,
    },
    title: {
        fontFamily: 'Inter',
        fontSize: 24,
        fontWeight: '700',
        color: colors.neutral[900],
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Inter',
        fontSize: 15,
        fontWeight: '400',
        color: colors.neutral[500],
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    errorText: {
        fontFamily: 'Inter',
        fontSize: 13,
        fontWeight: '500',
        color: colors.danger[600],
        textAlign: 'center',
        marginBottom: 16,
    },
    unlockButton: {
        backgroundColor: colors.primary[600],
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 48,
        minWidth: 200,
        alignItems: 'center',
    },
    unlockButtonPressed: {
        backgroundColor: colors.primary[700],
    },
    unlockButtonText: {
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: '700',
        color: colors.white,
    },
});
```

- [ ] **Step 2: Run type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/biometric-lock-gate.tsx
git commit -m "feat: add BiometricLockGate component for app lock on resume"
```

---

### Task 4: Wire `BiometricLockGate` into the app layout

**Files:**
- Modify: `src/app/(app)/_layout.tsx:783-788`

- [ ] **Step 1: Import BiometricLockGate**

Add to the imports at the top of the file:
```typescript
import { BiometricLockGate } from '@/components/ui/biometric-lock-gate';
```

- [ ] **Step 2: Wrap TabLayoutInner with BiometricLockGate**

Change the `TabLayout` export (around line 783) from:
```typescript
export default function TabLayout() {
    return (
        <SidebarProvider>
            <TabLayoutInner />
        </SidebarProvider>
    );
}
```
to:
```typescript
export default function TabLayout() {
    return (
        <SidebarProvider>
            <BiometricLockGate>
                <TabLayoutInner />
            </BiometricLockGate>
        </SidebarProvider>
    );
}
```

- [ ] **Step 3: Run type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/_layout.tsx
git commit -m "feat: wire BiometricLockGate into authenticated app layout"
```

---

### Task 5: Fix settings screen stale biometric toggle

The settings screen reads biometric state once on mount. If the keys are cleared (e.g., 401 cleanup, sign-out), the toggle shows stale state. Fix by re-reading state when the screen gains focus.

**Files:**
- Modify: `src/features/settings/settings-screen.tsx:62-76`

- [ ] **Step 1: Import `useIsFocused` from expo-router or react-navigation**

Add to the imports:
```typescript
import { useIsFocused } from '@react-navigation/native';
```

- [ ] **Step 2: Re-read biometric state on screen focus**

Replace the existing biometric check `useEffect` (lines 62-76):
```typescript
  // Check biometric hardware availability and current toggle state
  React.useEffect(() => {
    async function checkBiometric() {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(hasHardware && isEnrolled);
      } catch {
        setBiometricAvailable(false);
      }
      const enabled = getItem<boolean>(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(enabled === true);
    }
    checkBiometric();
  }, []);
```

with:
```typescript
  const isFocused = useIsFocused();

  // Check biometric hardware availability and current toggle state
  // Re-read on every focus to catch external changes (e.g., 401 cleanup)
  React.useEffect(() => {
    if (!isFocused) return;
    async function checkBiometric() {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(hasHardware && isEnrolled);
      } catch {
        setBiometricAvailable(false);
      }
      const enabled = getItem<boolean>(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(enabled === true);
    }
    checkBiometric();
  }, [isFocused]);
```

- [ ] **Step 3: Run type-check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/settings/settings-screen.tsx
git commit -m "fix: refresh biometric toggle state on settings screen focus"
```

---

## Manual Testing Checklist

After all tasks are complete, verify these scenarios:

1. **Enable biometric in Settings** → Toggle ON → Biometric prompt appears → Confirm → Toggle stays ON → Navigate away and back → Toggle still ON
2. **App lock on resume** → With biometric ON, press home button → Wait 3+ seconds → Return to app → Lock screen appears → Authenticate → App unlocks
3. **Grace period** → With biometric ON, press home → Immediately return (<2s) → No lock screen
4. **Retry on failure** → Lock screen → Dismiss biometric prompt → "Retry" button appears → Tap → Prompt appears again
5. **Sign out clears state** → Enable biometric → Sign out → Sign in as different user → Settings shows biometric OFF → No biometric prompt on first login for new user
6. **Biometric login on cold start** → Enable biometric → Kill app → Reopen → Biometric prompt on login screen → Authenticate → Dashboard loads
7. **401 cleanup** → Enable biometric → Let token expire → App clears biometric keys → Settings shows biometric OFF

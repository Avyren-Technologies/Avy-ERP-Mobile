import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import * as Updates from 'expo-updates';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { OtaUpdateScreen } from '@/components/ui/ota-update-screen';
import { checkAppVersion } from '@/lib/api/app-version';
import type { VersionCheckResult } from '@/lib/api/app-version';
import { createLogger } from '@/lib/logger';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require('../../../assets/logo.png') as number;

const logger = createLogger('AppUpdateGate');

interface AppUpdateGateProps {
  children: React.ReactNode;
}

/**
 * Top-level gate wrapping the entire app navigation.
 *
 * Sequence:
 * 1. OTA update check (Expo Updates) — shown as "Checking for updates"
 * 2. Backend version check — may block the app or show a soft prompt
 * 3. Children render (app navigation)
 *
 * Placed inside `_layout.tsx` root layout so it runs before auth.
 */
export function AppUpdateGate({ children }: AppUpdateGateProps) {
  const [otaDone, setOtaDone] = useState(() => {
    // Skip OTA in dev — expo-updates is not available in development builds
    if (__DEV__) return true;
    // Also skip if not using updates channel (e.g. simulator builds)
    if (!Updates.isEnabled) return true;
    return false;
  });

  const [versionCheck, setVersionCheck] = useState<VersionCheckResult | null>(null);
  const [softDismissed, setSoftDismissed] = useState(false);
  const [checkDone, setCheckDone] = useState(false);

  const handleOtaComplete = useCallback(() => {
    setOtaDone(true);
  }, []);

  // After OTA check, run backend version check
  useEffect(() => {
    if (!otaDone) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await checkAppVersion();
        if (!cancelled) {
          setVersionCheck(result);
          logger.info('Version check result', { verdict: result.updateRequired });
        }
      } catch (err) {
        // Network failure — allow through (don't block the user)
        logger.warn('Version check failed — allowing through', { error: err });
      } finally {
        if (!cancelled) setCheckDone(true);
      }
    })();

    return () => { cancelled = true; };
  }, [otaDone]);

  const handleOpenStore = useCallback(() => {
    if (versionCheck?.updateUrl) {
      Linking.openURL(versionCheck.updateUrl);
    }
  }, [versionCheck]);

  const handleDismissSoft = useCallback(() => {
    setSoftDismissed(true);
  }, []);

  // Phase 1: OTA update check
  if (!otaDone) {
    return <OtaUpdateScreen onComplete={handleOtaComplete} />;
  }

  // Phase 2: Waiting for backend version check (brief, usually <1s)
  // Don't show a loader here — let the app render underneath.
  // The blocking modal will appear if needed.

  // Phase 3: Maintenance mode — full block, no dismiss
  if (checkDone && versionCheck?.maintenanceMode) {
    return (
      <>
        {children}
        <Modal visible transparent={false} animationType="fade" statusBarTranslucent>
          <View style={styles.container}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Under Maintenance</Text>
            <Text style={styles.message}>{versionCheck.message}</Text>
          </View>
        </Modal>
      </>
    );
  }

  // Phase 4: Force update — full block, only action is "Update Now"
  if (checkDone && versionCheck?.updateRequired === 'force') {
    return (
      <>
        {children}
        <Modal visible transparent={false} animationType="fade" statusBarTranslucent>
          <View style={styles.container}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Update Required</Text>
            </View>
            <Text style={styles.title}>Please Update Avy ERP</Text>
            <Text style={styles.message}>{versionCheck.message}</Text>
            {versionCheck.updateUrl && (
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
                onPress={handleOpenStore}
              >
                <Text style={styles.primaryButtonText}>Update Now</Text>
              </Pressable>
            )}
          </View>
        </Modal>
      </>
    );
  }

  // Phase 5: Soft update — dismissible prompt overlay
  if (checkDone && versionCheck?.updateRequired === 'soft' && !softDismissed) {
    return (
      <>
        {children}
        <Modal visible transparent animationType="fade" statusBarTranslucent>
          <View style={styles.overlay}>
            <View style={styles.promptCard}>
              <Text style={styles.promptTitle}>Update Available</Text>
              <Text style={styles.promptMessage}>{versionCheck.message}</Text>
              <View style={styles.promptButtons}>
                <Pressable
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
                  onPress={handleDismissSoft}
                >
                  <Text style={styles.secondaryButtonText}>Later</Text>
                </Pressable>
                {versionCheck.updateUrl && (
                  <Pressable
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
                    onPress={handleOpenStore}
                  >
                    <Text style={styles.primaryButtonText}>Update</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // Phase 6: All clear — render app
  return <>{children}</>;
}

const styles = StyleSheet.create({
  // ── Full-screen blocking (maintenance + force) ──
  container: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 24,
  },
  badge: {
    backgroundColor: colors.warning[100],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning[700],
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '400',
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 300,
  },

  // ── Buttons ──
  primaryButton: {
    backgroundColor: colors.primary[600],
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    minWidth: 160,
    alignItems: 'center',
  },
  primaryButtonPressed: {
    backgroundColor: colors.primary[700],
  },
  primaryButtonText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.neutral[100],
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 120,
    alignItems: 'center',
  },
  secondaryButtonPressed: {
    backgroundColor: colors.neutral[200],
  },
  secondaryButtonText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[700],
  },

  // ── Soft update overlay ──
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  promptCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  promptTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  promptMessage: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  promptButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});

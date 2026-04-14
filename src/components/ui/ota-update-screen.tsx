import * as Updates from 'expo-updates';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { createLogger } from '@/lib/logger';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require('../../../assets/logo.png') as number;

const logger = createLogger('OTAUpdate');

interface OtaUpdateScreenProps {
  /** Called when OTA check is complete (whether update was applied or not). */
  onComplete: () => void;
}

/**
 * Full-screen OTA update gate.
 *
 * On mount:
 * 1. Checks for a pending Expo update.
 * 2. If found → downloads it while showing progress.
 * 3. Reloads the app to apply the update.
 * 4. If no update (or error) → calls onComplete so the app continues.
 */
export function OtaUpdateScreen({ onComplete }: OtaUpdateScreenProps) {
  const [checking, setChecking] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const runCheck = useCallback(async () => {
    try {
      logger.info('Checking for OTA updates...');
      const update = await Updates.checkForUpdateAsync();

      if (!update.isAvailable) {
        logger.info('No OTA update available');
        onComplete();
        return;
      }

      logger.info('OTA update available — downloading');
      setChecking(false);
      setDownloading(true);

      await Updates.fetchUpdateAsync();
      logger.info('OTA update downloaded — reloading app');
      await Updates.reloadAsync();
      // App restarts here — onComplete never fires after reload.
    } catch (err) {
      // Non-fatal: if the OTA check fails (network, no update channel in dev, etc.)
      // just continue to the app. The user can still use the current version.
      logger.warn('OTA update check failed — continuing with current version', { error: err });
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  // Only show the modal while we're actively checking or downloading
  if (!checking && !downloading) return null;

  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator size="large" color={colors.primary[600]} style={styles.spinner} />
        <Text style={styles.title}>
          {downloading ? 'Installing Update...' : 'Checking for Updates...'}
        </Text>
        <Text style={styles.subtitle}>
          {downloading
            ? 'A new version is being installed. The app will restart shortly.'
            : 'Please wait while we check for the latest version.'}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 32,
  },
  spinner: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});

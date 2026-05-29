/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { HelpDrawer } from '@/components/ui/help-drawer';
import { showErrorMessage } from '@/components/ui/utils';
import { maintenanceApi } from '@/features/maintenance/api/maintenance-api';
import { scanAssetHelp } from '@/features/maintenance/help';
import { AssetOperationalBadge } from '@/features/maintenance/shared/asset-status-badge';
import { CriticalityBadge } from '@/features/maintenance/shared/criticality-badge';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ MAIN ============

export function ScanAssetScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = React.useState(false);
  const [asset, setAsset] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [manualCode, setManualCode] = React.useState('');
  const [showManual, setShowManual] = React.useState(false);

  const handleBarCodeScanned = React.useCallback(async (result: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      const res = await maintenanceApi.lookupByTag(result.data);
      const assetData = (res as any)?.data;
      if (assetData) {
        setAsset(assetData);
      } else {
        showErrorMessage('No asset found for this tag');
        setScanned(false);
      }
    } catch {
      showErrorMessage('Failed to look up asset tag');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  }, [scanned, loading]);

  const handleManualLookup = async () => {
    if (!manualCode.trim()) return;
    setLoading(true);
    try {
      const res = await maintenanceApi.lookupByTag(manualCode.trim());
      const assetData = (res as any)?.data;
      if (assetData) {
        setAsset(assetData);
        setScanned(true);
      } else {
        showErrorMessage('No asset found for this tag code');
      }
    } catch {
      showErrorMessage('Failed to look up asset tag');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setScanned(false);
    setAsset(null);
    setManualCode('');
  };

  // Permission not granted yet
  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.gradient.surface, colors.white]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        {/* Header */}
        <LinearGradient
          colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
            <Text className="font-inter text-lg font-bold text-white">Scan Asset</Text>
            <HelpDrawer help={scanAssetHelp} />
          </View>
        </LinearGradient>

        <View style={styles.center}>
          <Svg width={64} height={64} viewBox="0 0 24 24">
            <Rect x={3} y={3} width={18} height={18} rx={2} stroke={colors.neutral[300]} strokeWidth="1.5" fill="none" />
            <Path d="M7 12h10" stroke={colors.neutral[300]} strokeWidth="1.5" strokeLinecap="round" />
          </Svg>
          <Text className="mt-4 font-inter text-sm font-semibold text-neutral-500">
            Camera permission required
          </Text>
          <Pressable onPress={requestPermission} style={styles.permBtn}>
            <Text className="font-inter text-sm font-bold text-white">Grant Permission</Text>
          </Pressable>
          <Pressable onPress={() => setShowManual(true)} style={{ marginTop: 12 }}>
            <Text className="font-inter text-sm font-semibold text-primary-600">Enter code manually</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <Text className="font-inter text-lg font-bold text-white">Scan Asset</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <HelpDrawer help={scanAssetHelp} />
            <Pressable onPress={() => setShowManual(!showManual)} style={styles.manualBtn} hitSlop={12}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* Camera / Results */}
      {!scanned ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13'] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          {/* Overlay */}
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text className="mt-6 font-inter text-sm text-white/80">
              Point camera at asset QR/barcode
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.white} />
              <Text className="mt-3 font-inter text-sm text-white">Looking up asset...</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.resultContainer, { paddingBottom: insets.bottom + 24 }]}>
          {asset ? (
            <Animated.View entering={FadeInUp.duration(400)} style={styles.resultContent}>
              {/* Asset Card */}
              <View style={[styles.assetCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
                <View style={[styles.assetCodeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
                  <Text className="font-inter text-xs font-bold text-info-700">
                    {asset.assetNumber}
                  </Text>
                </View>
                <Text className="mt-2 font-inter text-lg font-bold text-primary-950 dark:text-white">
                  {asset.name}
                </Text>
                <View style={styles.assetMeta}>
                  <AssetOperationalBadge status={asset.operationalStatus ?? 'IDLE'} />
                  <CriticalityBadge criticality={asset.criticality ?? 'MEDIUM'} />
                </View>
                {asset.location?.name ? (
                  <Text className="mt-2 font-inter text-xs text-neutral-500 dark:text-neutral-400">
                    Location: {asset.location.name}
                  </Text>
                ) : null}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => router.push(`/maintenance/asset-detail?id=${asset.id}`)}
                  style={[styles.actionButton, { backgroundColor: colors.primary[600] }]}
                >
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M12 9a3 3 0 100 6 3 3 0 000-6z" stroke="#fff" strokeWidth="1.8" fill="none" />
                  </Svg>
                  <Text className="font-inter text-sm font-bold text-white">View Details</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push(`/maintenance/work-request-create?assetId=${asset.id}`)}
                  style={[styles.actionButton, { backgroundColor: colors.warning[600] }]}
                >
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  </Svg>
                  <Text className="font-inter text-sm font-bold text-white">Raise Request</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push(`/maintenance/log-reading?assetId=${asset.id}`)}
                  style={[styles.actionButton, { backgroundColor: colors.info[600] }]}
                >
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M12 20V10M18 20V4M6 20v-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text className="font-inter text-sm font-bold text-white">Log Reading</Text>
                </Pressable>
              </View>

              {/* Scan Again */}
              <Pressable onPress={handleReset} style={styles.scanAgainBtn}>
                <Text className="font-inter text-sm font-semibold text-primary-600">Scan Another</Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      )}

      {/* Manual Input */}
      {showManual ? (
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.manualPanel, { backgroundColor: isDark ? '#1A1730' : colors.white, paddingBottom: insets.bottom + 16 }]}>
          <Text className="mb-3 font-inter text-sm font-bold text-primary-950 dark:text-white">
            Enter Tag Code
          </Text>
          <View style={styles.manualRow}>
            <TextInput
              style={[styles.manualInput, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], color: isDark ? colors.white : colors.primary[950], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
              placeholder="Tag code or asset number"
              placeholderTextColor={colors.neutral[400]}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              returnKeyType="search"
              onSubmitEditing={handleManualLookup}
            />
            <Pressable onPress={handleManualLookup} style={styles.lookupBtn} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="font-inter text-sm font-bold text-white">Lookup</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : '#000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    headerGradient: {
      paddingHorizontal: 20, paddingBottom: 16, zIndex: 10,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: {
      width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center', alignItems: 'center',
    },
    manualBtn: {
      width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center', alignItems: 'center',
    },
    permBtn: {
      marginTop: 20, backgroundColor: colors.primary[600], borderRadius: 12,
      paddingHorizontal: 24, paddingVertical: 12,
    },
    cameraContainer: { flex: 1 },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    scanFrame: {
      width: 240, height: 240, position: 'relative',
    },
    corner: {
      position: 'absolute', width: 30, height: 30, borderColor: colors.white,
    },
    cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
    cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
    cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
    cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    resultContainer: {
      flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    resultContent: { flex: 1, padding: 24, gap: 16 },
    assetCard: {
      borderRadius: 20, padding: 20, borderWidth: 1,
      shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    },
    assetCodeBadge: {
      alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    },
    assetMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    actionRow: { gap: 10 },
    actionButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderRadius: 14, height: 48,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
    },
    scanAgainBtn: {
      alignItems: 'center', paddingVertical: 14,
      borderTopWidth: 1, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    manualPanel: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20,
      shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
    },
    manualRow: { flexDirection: 'row', gap: 10 },
    manualInput: {
      flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    },
    lookupBtn: {
      backgroundColor: colors.primary[600], borderRadius: 12, paddingHorizontal: 20,
      justifyContent: 'center', alignItems: 'center',
    },
  });

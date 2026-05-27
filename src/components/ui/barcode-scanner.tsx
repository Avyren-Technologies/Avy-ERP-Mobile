import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Flashlight, FlashlightOff, Keyboard } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import colors from '@/components/ui/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

interface BarcodeScannerProps {
  onScan: (value: string, type: string) => void;
  prompt?: string;
  onManualEntry?: () => void;
  onClose?: () => void;
  testID?: string;
}

export function BarcodeScanner({ onScan, prompt, onManualEntry, onClose, testID }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const handleBarCodeScanned = useCallback(
    ({ data, type }: { data: string; type: string }) => {
      if (scanned) return;
      setScanned(true);
      onScan(data, type);
    },
    [scanned, onScan],
  );

  const resetScan = useCallback(() => setScanned(false), []);

  if (!permission) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.permissionBox}>
          <Text className="text-base font-inter text-neutral-600 text-center">
            Requesting camera permission...
          </Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container} testID={testID}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.permissionBox}>
          <Text className="text-lg font-bold font-inter text-neutral-900 text-center mb-2">
            Camera Permission Required
          </Text>
          <Text className="text-sm font-inter text-neutral-500 text-center mb-6">
            We need access to your camera to scan barcodes and QR codes.
          </Text>
          <TouchableOpacity style={styles.grantBtn} onPress={requestPermission} activeOpacity={0.7}>
            <Text className="text-sm font-bold font-inter text-white">Grant Permission</Text>
          </TouchableOpacity>
          {onManualEntry && (
            <TouchableOpacity style={styles.manualBtn} onPress={onManualEntry} activeOpacity={0.7}>
              <Keyboard color={colors.primary[600]} size={16} />
              <Text className="text-sm font-medium font-inter text-primary-600 ml-2">Enter Manually</Text>
            </TouchableOpacity>
          )}
          {onClose && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text className="text-sm font-inter text-neutral-500">Cancel</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer} testID={testID}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{
          barcodeTypes: ['code128', 'code39', 'ean13', 'ean8', 'qr', 'upc_a', 'upc_e'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.iconBtn} hitSlop={12}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => setTorchOn((v) => !v)}
            style={styles.iconBtn}
            hitSlop={12}
          >
            {torchOn ? (
              <FlashlightOff color="#fff" size={22} />
            ) : (
              <Flashlight color="#fff" size={22} />
            )}
          </TouchableOpacity>
        </View>

        {/* Scan area frame */}
        <View style={styles.scanAreaWrapper}>
          <View style={styles.scanArea}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Prompt text */}
        <View style={styles.promptArea}>
          <Text className="text-sm font-medium font-inter text-white text-center">
            {prompt || 'Point the camera at a barcode'}
          </Text>

          {scanned && (
            <TouchableOpacity style={styles.rescanBtn} onPress={resetScan} activeOpacity={0.7}>
              <Text className="text-sm font-bold font-inter text-white">Tap to Scan Again</Text>
            </TouchableOpacity>
          )}

          {onManualEntry && (
            <TouchableOpacity
              style={styles.manualEntryBtn}
              onPress={onManualEntry}
              activeOpacity={0.7}
            >
              <Keyboard color="#fff" size={16} />
              <Text className="text-sm font-medium font-inter text-white ml-2">Enter Manually</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  grantBtn: {
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAreaWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  promptArea: {
    alignItems: 'center',
    paddingBottom: 80,
    gap: 16,
  },
  rescanBtn: {
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
});

/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import {
  useBulkImportEmployees,
  useBulkValidateEmployees,
} from '@/features/company-admin/api/use-hr-mutations';
import { downloadBulkEmployeeTemplate } from '@/features/company-admin/api/use-hr-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ── Types ────────────────────────────────────────────────────────────

interface ValidationRow {
  rowNum: number;
  valid: boolean;
  data?: Record<string, unknown>;
  errors?: string[];
}

interface ImportResultRow {
  rowNum: number;
  success: boolean;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  accountCreated?: boolean;
  error?: string;
}

// ── Step Indicator ───────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepRow}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <View
                style={[
                  styles.stepLine,
                  (isDone || isActive) && { backgroundColor: colors.primary[400] },
                ]}
              />
            )}
            <View
              style={[
                styles.stepDot,
                isActive && styles.stepDotActive,
                isDone && styles.stepDotDone,
              ]}
            >
              {isDone ? (
                <Svg width={12} height={12} viewBox="0 0 24 24">
                  <Path
                    d="M5 12l5 5L20 7"
                    stroke={colors.white}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              ) : (
                <Text
                  className={`font-inter text-xs font-bold ${isActive ? 'text-white' : 'text-neutral-400'}`}
                >
                  {step}
                </Text>
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ── Validation Row Card ──────────────────────────────────────────────

function ValidationRowCard({
  row,
  index,
}: {
  row: ValidationRow;
  index: number;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const name =
    [row.data?.firstName, row.data?.lastName].filter(Boolean).join(' ') ||
    `Row ${row.rowNum}`;

  return (
    <Animated.View entering={FadeInUp.duration(300).delay(60 + index * 30)}>
      <Pressable
        onPress={() => {
          if (!row.valid && row.errors?.length) setExpanded((v) => !v);
        }}
        style={[styles.rowCard, !row.valid && styles.rowCardError]}
      >
        <View style={styles.rowCardHeader}>
          <View
            style={[
              styles.rowNumBadge,
              { backgroundColor: row.valid ? colors.success[50] : colors.danger[50] },
            ]}
          >
            <Text
              className="font-inter text-[10px] font-bold"
              style={{ color: row.valid ? colors.success[700] : colors.danger[700] }}
            >
              #{row.rowNum}
            </Text>
          </View>
          <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white" style={{ flex: 1 }}>
            {name}
          </Text>
          <View
            style={[
              styles.validBadge,
              {
                backgroundColor: row.valid ? colors.success[50] : colors.danger[50],
              },
            ]}
          >
            <Text
              className="font-inter text-[10px] font-bold"
              style={{ color: row.valid ? colors.success[700] : colors.danger[700] }}
            >
              {row.valid ? 'Valid' : 'Error'}
            </Text>
          </View>
          {!row.valid && row.errors?.length ? (
            <Svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              style={{
                marginLeft: 4,
                transform: [{ rotate: expanded ? '180deg' : '0deg' }],
              }}
            >
              <Path
                d="M6 9l6 6 6-6"
                stroke={colors.neutral[400]}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : null}
        </View>
        {expanded && row.errors?.length ? (
          <View style={styles.errorList}>
            {row.errors.map((err, i) => (
              <View key={i} style={styles.errorItem}>
                <View style={styles.errorDot} />
                <Text className="font-inter text-xs text-danger-700" style={{ flex: 1 }}>
                  {err}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// ── Import Result Row Card ───────────────────────────────────────────

function ImportResultCard({
  row,
  index,
}: {
  row: ImportResultRow;
  index: number;
}) {
  const name =
    [row.firstName, row.lastName].filter(Boolean).join(' ') || `Row ${row.rowNum}`;

  return (
    <Animated.View entering={FadeInUp.duration(300).delay(60 + index * 30)}>
      <View style={[styles.rowCard, !row.success && styles.rowCardError]}>
        <View style={styles.rowCardHeader}>
          <View
            style={[
              styles.rowNumBadge,
              {
                backgroundColor: row.success ? colors.success[50] : colors.danger[50],
              },
            ]}
          >
            <Text
              className="font-inter text-[10px] font-bold"
              style={{ color: row.success ? colors.success[700] : colors.danger[700] }}
            >
              #{row.rowNum}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
              {name}
            </Text>
            {row.employeeId ? (
              <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                {row.employeeId}
              </Text>
            ) : null}
          </View>
          {row.success ? (
            <View style={styles.resultBadges}>
              <View style={[styles.validBadge, { backgroundColor: colors.success[50] }]}>
                <Text
                  className="font-inter text-[10px] font-bold"
                  style={{ color: colors.success[700] }}
                >
                  Imported
                </Text>
              </View>
              {row.accountCreated && (
                <View style={[styles.validBadge, { backgroundColor: colors.info[50] }]}>
                  <Text
                    className="font-inter text-[10px] font-bold"
                    style={{ color: colors.info[700] }}
                  >
                    Account
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.validBadge, { backgroundColor: colors.danger[50] }]}>
              <Text
                className="font-inter text-[10px] font-bold"
                style={{ color: colors.danger[700] }}
              >
                Failed
              </Text>
            </View>
          )}
        </View>
        {!row.success && row.error ? (
          <View style={styles.errorList}>
            <View style={styles.errorItem}>
              <View style={styles.errorDot} />
              <Text className="font-inter text-xs text-danger-700" style={{ flex: 1 }}>
                {row.error}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────

export function BulkEmployeeImportScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [step, setStep] = React.useState(1);

  // Step 1 state
  const [downloading, setDownloading] = React.useState(false);

  // Step 2 state
  const [selectedFile, setSelectedFile] = React.useState<{
    uri: string;
    name: string;
    size?: number;
  } | null>(null);
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<{
    totalRows: number;
    validCount: number;
    errorCount: number;
    rows: ValidationRow[];
  } | null>(null);

  const validateMutation = useBulkValidateEmployees();
  const importMutation = useBulkImportEmployees();

  // Step 3 state
  const [importResult, setImportResult] = React.useState<{
    total: number;
    successCount: number;
    failureCount: number;
    results: ImportResultRow[];
  } | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      await downloadBulkEmployeeTemplate();
      showSuccess('Template Ready', 'Template has been shared successfully.');
    } catch (err: any) {
      showErrorMessage(err?.message ?? 'Failed to download template.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size ?? undefined,
        });
        setValidationResult(null);
      }
    } catch {
      showErrorMessage('Failed to pick file.');
    }
  };

  const handleValidate = () => {
    if (!selectedFile || !password.trim()) {
      showErrorMessage('Please select a file and enter a default password.');
      return;
    }
    validateMutation.mutate(
      {
        fileUri: selectedFile.uri,
        fileName: selectedFile.name,
        defaultPassword: password.trim(),
      },
      {
        onSuccess: (response: any) => {
          const data = response?.data ?? response;
          setValidationResult({
            totalRows: data.totalRows ?? 0,
            validCount: data.validCount ?? 0,
            errorCount: data.errorCount ?? 0,
            rows: data.rows ?? [],
          });
        },
      },
    );
  };

  const handleImport = () => {
    if (!validationResult) return;
    const validRows = validationResult.rows
      .filter((r) => r.valid && r.data)
      .map((r) => r.data as Record<string, unknown>);

    if (validRows.length === 0) {
      showErrorMessage('No valid rows to import.');
      return;
    }

    importMutation.mutate(
      { rows: validRows, defaultPassword: password.trim() },
      {
        onSuccess: (response: any) => {
          const data = response?.data ?? response;
          setImportResult({
            total: data.total ?? 0,
            successCount: data.successCount ?? 0,
            failureCount: data.failureCount ?? 0,
            results: data.results ?? [],
          });
          setStep(3);
        },
      },
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Step 1: Download Template ────────────────────────────────────

  const renderStep1 = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <View style={styles.templateCard}>
          <View style={styles.templateIconWrap}>
            <LinearGradient
              colors={[colors.primary[500], colors.accent[500]] as const}
              style={styles.templateIcon}
            >
              <Svg width={28} height={28} viewBox="0 0 24 24">
                <Path
                  d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                  stroke={colors.white}
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                  stroke={colors.white}
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </LinearGradient>
          </View>

          <Text className="font-inter text-base font-bold text-primary-950 dark:text-white" style={{ marginTop: 16 }}>
            Download Import Template
          </Text>
          <Text
            className="font-inter text-sm text-neutral-500 dark:text-neutral-400"
            style={{ marginTop: 8, textAlign: 'center', lineHeight: 20 }}
          >
            Download the Excel template, fill in your employee data, then upload
            it in the next step to validate and import.
          </Text>

          <Pressable
            onPress={handleDownloadTemplate}
            disabled={downloading}
            style={({ pressed }) => [
              styles.primaryBtn,
              { marginTop: 24 },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              downloading && { opacity: 0.6 },
            ]}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                    stroke={colors.white}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text className="font-inter text-sm font-bold text-white">
                  Download Template
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(200)} style={{ marginTop: 16 }}>
        <Pressable
          onPress={() => setStep(2)}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text className="font-inter text-sm font-bold text-white">Next</Text>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path
              d="M9 18l6-6-6-6"
              stroke={colors.white}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );

  // ── Step 2: Upload & Validate ────────────────────────────────────

  const renderStep2 = () => (
    <View style={{ flex: 1 }}>
      <FlashList
        data={validationResult?.rows ?? []}
        keyExtractor={(item) => String(item.rowNum)}
        renderItem={({ item, index }) => (
          <ValidationRowCard row={item} index={index} />
        )}
        ListHeaderComponent={
          <>
            {/* File Picker */}
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <Pressable
                onPress={handlePickFile}
                style={({ pressed }) => [
                  styles.uploadArea,
                  pressed && { opacity: 0.85 },
                  selectedFile && styles.uploadAreaSelected,
                ]}
              >
                <Svg width={32} height={32} viewBox="0 0 24 24">
                  <Path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    stroke={selectedFile ? colors.primary[500] : colors.neutral[400]}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                {selectedFile ? (
                  <View style={{ alignItems: 'center', marginTop: 8 }}>
                    <Text className="font-inter text-sm font-semibold text-primary-700">
                      {selectedFile.name}
                    </Text>
                    {selectedFile.size ? (
                      <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" style={{ marginTop: 2 }}>
                        {formatFileSize(selectedFile.size)}
                      </Text>
                    ) : null}
                    <Text className="font-inter text-xs text-primary-500" style={{ marginTop: 4 }}>
                      Tap to change file
                    </Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', marginTop: 8 }}>
                    <Text className="font-inter text-sm font-semibold text-neutral-700">
                      Select Excel File
                    </Text>
                    <Text className="font-inter text-xs text-neutral-400" style={{ marginTop: 2 }}>
                      .xlsx format only
                    </Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>

            {/* Password Input */}
            <Animated.View entering={FadeInDown.duration(400).delay(200)} style={{ marginTop: 16 }}>
              <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white" style={{ marginBottom: 8 }}>
                Default Password
              </Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password for new accounts"
                  placeholderTextColor={colors.neutral[400]}
                  secureTextEntry={!showPassword}
                  style={styles.passwordInput}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.passwordToggle}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    {showPassword ? (
                      <Path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"
                        stroke={colors.neutral[500]}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : (
                      <>
                        <Path
                          d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                          stroke={colors.neutral[500]}
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <Path
                          d="M1 1l22 22"
                          stroke={colors.neutral[500]}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </>
                    )}
                  </Svg>
                </Pressable>
              </View>
            </Animated.View>

            {/* Validate Button */}
            <Animated.View entering={FadeInDown.duration(400).delay(300)} style={{ marginTop: 16 }}>
              <Pressable
                onPress={handleValidate}
                disabled={!selectedFile || !password.trim() || validateMutation.isPending}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                  (!selectedFile || !password.trim() || validateMutation.isPending) && {
                    opacity: 0.5,
                  },
                ]}
              >
                {validateMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                      <Path
                        d="M9 11l3 3L22 4"
                        stroke={colors.white}
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                        stroke={colors.white}
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                    <Text className="font-inter text-sm font-bold text-white">
                      Validate
                    </Text>
                  </>
                )}
              </Pressable>
            </Animated.View>

            {/* Validation Summary */}
            {validationResult && (
              <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 20 }}>
                <View style={styles.summaryRow}>
                  <View style={[styles.summaryCard, { backgroundColor: colors.success[50] }]}>
                    <Text
                      className="font-inter text-lg font-bold"
                      style={{ color: colors.success[700] }}
                    >
                      {validationResult.validCount}
                    </Text>
                    <Text
                      className="font-inter text-xs font-semibold"
                      style={{ color: colors.success[600] }}
                    >
                      Valid
                    </Text>
                  </View>
                  <View style={[styles.summaryCard, { backgroundColor: colors.danger[50] }]}>
                    <Text
                      className="font-inter text-lg font-bold"
                      style={{ color: colors.danger[700] }}
                    >
                      {validationResult.errorCount}
                    </Text>
                    <Text
                      className="font-inter text-xs font-semibold"
                      style={{ color: colors.danger[600] }}
                    >
                      Errors
                    </Text>
                  </View>
                  <View style={[styles.summaryCard, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                    <Text
                      className="font-inter text-lg font-bold"
                      style={{ color: colors.primary[700] }}
                    >
                      {validationResult.totalRows}
                    </Text>
                    <Text
                      className="font-inter text-xs font-semibold"
                      style={{ color: colors.primary[600] }}
                    >
                      Total
                    </Text>
                  </View>
                </View>

                {validationResult.rows.length > 0 && (
                  <Text
                    className="font-inter text-sm font-semibold text-primary-950 dark:text-white"
                    style={{ marginTop: 16, marginBottom: 8 }}
                  >
                    Row Details
                  </Text>
                )}
              </Animated.View>
            )}
          </>
        }
        contentContainerStyle={[
          styles.stepContent,
          { paddingBottom: validationResult && validationResult.validCount > 0 ? 100 : 40 },
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Sticky Import Button */}
      {validationResult && validationResult.validCount > 0 && (
        <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={handleImport}
            disabled={importMutation.isPending}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.success[600] },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              importMutation.isPending && { opacity: 0.6 },
            ]}
          >
            {importMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    stroke={colors.white}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text className="font-inter text-sm font-bold text-white">
                  Import {validationResult.validCount} Valid Row
                  {validationResult.validCount !== 1 ? 's' : ''}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );

  // ── Step 3: Import Results ───────────────────────────────────────

  const renderStep3 = () => (
    <View style={{ flex: 1 }}>
      <FlashList
        data={importResult?.results ?? []}
        keyExtractor={(item) => String(item.rowNum)}
        renderItem={({ item, index }) => (
          <ImportResultCard row={item} index={index} />
        )}
        ListHeaderComponent={
          importResult ? (
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: colors.success[50] }]}>
                  <Text
                    className="font-inter text-lg font-bold"
                    style={{ color: colors.success[700] }}
                  >
                    {importResult.successCount}
                  </Text>
                  <Text
                    className="font-inter text-xs font-semibold"
                    style={{ color: colors.success[600] }}
                  >
                    Imported
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: colors.danger[50] }]}>
                  <Text
                    className="font-inter text-lg font-bold"
                    style={{ color: colors.danger[700] }}
                  >
                    {importResult.failureCount}
                  </Text>
                  <Text
                    className="font-inter text-xs font-semibold"
                    style={{ color: colors.danger[600] }}
                  >
                    Failed
                  </Text>
                </View>
              </View>

              {importResult.results.length > 0 && (
                <Text
                  className="font-inter text-sm font-semibold text-primary-950 dark:text-white"
                  style={{ marginTop: 16, marginBottom: 8 }}
                >
                  Import Details
                </Text>
              )}
            </Animated.View>
          ) : null
        }
        contentContainerStyle={[styles.stepContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text className="font-inter text-sm font-bold text-white">Done</Text>
        </Pressable>
      </View>
    </View>
  );

  // ── Render ───────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <LinearGradient
          colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.headerDecor1} />
          <View style={styles.headerDecor2} />

          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path
                  d="M15 18l-6-6 6-6"
                  stroke={colors.white}
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
            <Text className="font-inter text-lg font-bold text-white" style={{ flex: 1 }}>
              Bulk Employee Import
            </Text>
          </View>

          {/* Step indicator */}
          <View style={{ marginTop: 16 }}>
            <StepIndicator current={step} total={3} />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Step Content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerDecor1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 2,
    borderColor: colors.white,
  },
  stepDotDone: {
    backgroundColor: colors.success[500],
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 4,
  },

  // Step content
  stepContent: {
    padding: 24,
  },

  // Template card
  templateCard: {
    backgroundColor: isDark ? '#1A1730' : colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: isDark ? colors.primary[900] : colors.primary[50],
  },
  templateIconWrap: {
    marginTop: 8,
  },
  templateIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Upload area
  uploadArea: {
    backgroundColor: isDark ? '#1A1730' : colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  uploadAreaSelected: {
    borderColor: colors.primary[300],
    backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
  },

  // Password
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1A1730' : colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.primary[950],
  },
  passwordToggle: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary[600],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },

  // Row cards
  rowCard: {
    backgroundColor: isDark ? '#1A1730' : colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: isDark ? colors.primary[900] : colors.primary[50],
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  rowCardError: {
    borderColor: colors.danger[100],
  },
  rowCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowNumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  validBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  resultBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  errorList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: 6,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  errorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.danger[400],
    marginTop: 5,
  },

  // Sticky bottom
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: isDark ? '#1A1730' : colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
});
const styles = createStyles(false);

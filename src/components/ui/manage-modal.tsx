/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { Text } from '@/components/ui/text';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

export interface ManageModalItem {
  id: string;
  name: string;
  code?: string | null;
  abbreviation?: string | null;
}

export interface ManageModalField {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
}

export interface ManageModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: ManageModalItem[];
  isLoading: boolean;
  createFields: ManageModalField[];
  onCreate: (values: Record<string, string>) => Promise<any>;
  onUpdate: (id: string, values: Record<string, string>) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  isCreating?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

// ============ ICONS ============

function PencilIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ============ MAIN COMPONENT ============

export function ManageModal({
  visible,
  onClose,
  title,
  items,
  isLoading,
  createFields,
  onCreate,
  onUpdate,
  onDelete,
  isCreating = false,
  isUpdating = false,
  isDeleting = false,
}: ManageModalProps) {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(isDark), [isDark]);
  const { show: showConfirm, modalProps: confirmModalProps } =
    useConfirmModal();

  // Edit state
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValues, setEditValues] = React.useState<Record<string, string>>(
    {},
  );

  // Create form state
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [createValues, setCreateValues] = React.useState<
    Record<string, string>
  >({});

  // Error state for inline display
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!visible) {
      setEditingId(null);
      setEditValues({});
      setShowCreateForm(false);
      setCreateValues({});
      setErrorMessage(null);
    }
  }, [visible]);

  // --- Edit handlers ---
  const handleStartEdit = React.useCallback(
    (item: ManageModalItem) => {
      setEditingId(item.id);
      const values: Record<string, string> = {};
      for (const field of createFields) {
        const val = item[field.key as keyof ManageModalItem];
        values[field.key] = typeof val === 'string' ? val : '';
      }
      setEditValues(values);
      setErrorMessage(null);
    },
    [createFields],
  );

  const handleCancelEdit = React.useCallback(() => {
    setEditingId(null);
    setEditValues({});
    setErrorMessage(null);
  }, []);

  const handleSaveEdit = React.useCallback(async () => {
    if (!editingId) return;
    try {
      setErrorMessage(null);
      await onUpdate(editingId, editValues);
      setEditingId(null);
      setEditValues({});
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Update failed';
      setErrorMessage(msg);
    }
  }, [editingId, editValues, onUpdate]);

  // --- Delete handler ---
  const handleDelete = React.useCallback(
    (item: ManageModalItem) => {
      showConfirm({
        title: 'Delete Item',
        message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        variant: 'danger',
        onConfirm: async () => {
          try {
            setErrorMessage(null);
            await onDelete(item.id);
          } catch (err: any) {
            const msg =
              err?.response?.data?.message ||
              err?.message ||
              'Delete failed';
            setErrorMessage(msg);
          }
        },
      });
    },
    [onDelete, showConfirm],
  );

  // --- Create handlers ---
  const handleShowCreate = React.useCallback(() => {
    setShowCreateForm(true);
    setErrorMessage(null);
    const initial: Record<string, string> = {};
    for (const field of createFields) {
      initial[field.key] = '';
    }
    setCreateValues(initial);
  }, [createFields]);

  const handleCancelCreate = React.useCallback(() => {
    setShowCreateForm(false);
    setCreateValues({});
    setErrorMessage(null);
  }, []);

  const handleCreate = React.useCallback(async () => {
    // Validate required fields
    for (const field of createFields) {
      if (field.required && !createValues[field.key]?.trim()) {
        setErrorMessage(`${field.label} is required`);
        return;
      }
    }
    try {
      setErrorMessage(null);
      await onCreate(createValues);
      setShowCreateForm(false);
      setCreateValues({});
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Create failed';
      setErrorMessage(msg);
    }
  }, [createFields, createValues, onCreate]);

  return (
    <>
      <RNModal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetWrapper}
          >
            <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Title */}
            <Text className="mb-4 font-inter text-lg font-bold text-primary-950 dark:text-white">
              {title}
            </Text>

            {/* Error message */}
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text className="font-inter text-xs font-medium text-danger-600">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Single scrollable area for items list + create form */}
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {/* Loading state */}
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator
                    size="small"
                    color={colors.primary[600]}
                  />
                  <Text className="ml-2 font-inter text-sm text-neutral-500">
                    Loading...
                  </Text>
                </View>
              ) : (
                /* Existing items list */
                <>
                  {items.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text className="font-inter text-sm text-neutral-400">
                        No items yet
                      </Text>
                    </View>
                  ) : (
                    items.map((item) => (
                      <View key={item.id} style={styles.itemRow}>
                        {editingId === item.id ? (
                          /* Edit mode */
                          <View style={styles.editContainer}>
                            {createFields.map((field) => (
                              <TextInput
                                key={field.key}
                                style={styles.input}
                                placeholder={field.placeholder}
                                placeholderTextColor={colors.neutral[400]}
                                value={editValues[field.key] ?? ''}
                                onChangeText={(text) =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    [field.key]: text,
                                  }))
                                }
                              />
                            ))}
                            <View style={styles.editActions}>
                              <Pressable
                                style={({ pressed }) => [
                                  styles.smallBtn,
                                  styles.cancelSmallBtn,
                                  pressed && { opacity: 0.8 },
                                ]}
                                onPress={handleCancelEdit}
                              >
                                <Text className="font-inter text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                                  Cancel
                                </Text>
                              </Pressable>
                              <Pressable
                                style={({ pressed }) => [
                                  styles.smallBtn,
                                  styles.saveSmallBtn,
                                  pressed && { opacity: 0.85 },
                                ]}
                                onPress={handleSaveEdit}
                                disabled={isUpdating}
                              >
                                {isUpdating ? (
                                  <ActivityIndicator
                                    size="small"
                                    color={colors.white}
                                  />
                                ) : (
                                  <Text className="font-inter text-xs font-bold text-white">
                                    Save
                                  </Text>
                                )}
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          /* Display mode */
                          <>
                            <View style={styles.itemContent}>
                              {item.code ? (
                                <View style={styles.codeBadge}>
                                  <Text className="font-inter text-[10px] font-bold text-primary-700 dark:text-primary-300">
                                    {item.code}
                                  </Text>
                                </View>
                              ) : null}
                              <Text
                                className="flex-1 font-inter text-sm font-medium text-neutral-800 dark:text-neutral-200"
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>
                            </View>
                            <View style={styles.itemActions}>
                              <Pressable
                                style={({ pressed }) => [
                                  styles.iconBtn,
                                  pressed && { opacity: 0.6 },
                                ]}
                                onPress={() => handleStartEdit(item)}
                                hitSlop={8}
                              >
                                <PencilIcon
                                  color={
                                    isDark
                                      ? colors.neutral[400]
                                      : colors.neutral[500]
                                  }
                                />
                              </Pressable>
                              <Pressable
                                style={({ pressed }) => [
                                  styles.iconBtn,
                                  pressed && { opacity: 0.6 },
                                ]}
                                onPress={() => handleDelete(item)}
                                hitSlop={8}
                                disabled={isDeleting}
                              >
                                <TrashIcon color={colors.danger[500]} />
                              </Pressable>
                            </View>
                          </>
                        )}
                      </View>
                    ))
                  )}
                </>
              )}

              {/* Add New Section — inside ScrollView so it scrolls with keyboard */}
              {showCreateForm ? (
                <View style={styles.createSection}>
                  <Text className="mb-3 font-inter text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    Add New
                  </Text>
                  {createFields.map((field) => (
                    <View key={field.key} style={styles.fieldContainer}>
                      <Text className="mb-1 font-inter text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        {field.label}
                        {field.required ? (
                          <Text className="font-inter text-xs text-danger-500">
                            {' '}
                            *
                          </Text>
                        ) : null}
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholder={field.placeholder}
                        placeholderTextColor={colors.neutral[400]}
                        value={createValues[field.key] ?? ''}
                        onChangeText={(text) =>
                          setCreateValues((prev) => ({
                            ...prev,
                            [field.key]: text,
                          }))
                        }
                      />
                    </View>
                  ))}
                  <View style={styles.createActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.cancelBtn,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={handleCancelCreate}
                    >
                      <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.createBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                      onPress={handleCreate}
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Text className="font-inter text-sm font-bold text-white">
                          Create
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.addNewBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={handleShowCreate}
                >
                  <Text className="font-inter text-sm font-semibold text-primary-600">
                    + Add New
                  </Text>
                </Pressable>
              )}
            </ScrollView>

            {/* Bottom safe area */}
            <View style={{ height: insets.bottom + 8 }} />
          </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>

      <ConfirmModal {...confirmModalProps} />
    </>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(8, 15, 40, 0.32)',
      justifyContent: 'flex-end',
    },
    sheetWrapper: {
      maxHeight: '85%',
      minHeight: '50%',
    },
    sheet: {
      flex: 1,
      backgroundColor: isDark ? '#1A1730' : colors.white,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 24,
      paddingTop: 12,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.neutral[300],
      alignSelf: 'center',
      marginBottom: 16,
    },
    errorContainer: {
      backgroundColor: isDark ? 'rgba(244,63,94,0.12)' : colors.danger[50],
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 12,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
    },
    scrollContent: {
      flexGrow: 1,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    itemContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginRight: 8,
    },
    codeBadge: {
      backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : colors.primary[50],
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    itemActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconBtn: {
      padding: 4,
    },
    editContainer: {
      flex: 1,
      gap: 8,
    },
    editActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 4,
    },
    smallBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelSmallBtn: {
      backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
      borderWidth: 1,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    saveSmallBtn: {
      backgroundColor: colors.primary[600],
    },
    createSection: {
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.neutral[700] : colors.neutral[200],
      paddingTop: 16,
      marginTop: 4,
    },
    fieldContainer: {
      marginBottom: 10,
    },
    input: {
      backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
      paddingHorizontal: 14,
      height: 46,
      fontSize: 14,
      color: isDark ? colors.white : colors.neutral[900],
      fontFamily: 'Inter',
    },
    createActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    actionBtn: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelBtn: {
      backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
      borderWidth: 1.5,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    createBtn: {
      backgroundColor: colors.primary[600],
      shadowColor: colors.primary[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    addNewBtn: {
      paddingVertical: 14,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.neutral[700] : colors.neutral[200],
      marginTop: 4,
    },
  });

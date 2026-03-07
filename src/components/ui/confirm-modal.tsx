/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import {
    Modal as RNModal,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    SlideInUp,
    SlideOutDown,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';

// ============ TYPES ============

export type ConfirmModalVariant = 'danger' | 'primary' | 'warning';

export interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmModalVariant;
    onConfirm: () => void;
    onCancel: () => void;
}

// ============ VARIANT CONFIG ============

function getVariantColors(variant: ConfirmModalVariant) {
    switch (variant) {
        case 'danger':
            return {
                iconBg: colors.danger[50],
                iconColor: colors.danger[500],
                buttonBg: colors.danger[600],
                buttonBorder: colors.danger[600],
            };
        case 'warning':
            return {
                iconBg: colors.warning[50],
                iconColor: colors.warning[500],
                buttonBg: colors.warning[600],
                buttonBorder: colors.warning[600],
            };
        default:
            return {
                iconBg: colors.primary[50],
                iconColor: colors.primary[600],
                buttonBg: colors.primary[600],
                buttonBorder: colors.primary[600],
            };
    }
}

function VariantIcon({ variant }: { variant: ConfirmModalVariant }) {
    const { iconColor } = getVariantColors(variant);
    if (variant === 'danger') {
        return (
            <Svg width={28} height={28} viewBox="0 0 24 24">
                <Path
                    d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
                    stroke={iconColor}
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        );
    }
    if (variant === 'warning') {
        return (
            <Svg width={28} height={28} viewBox="0 0 24 24">
                <Path
                    d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01"
                    stroke={iconColor}
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        );
    }
    return (
        <Svg width={28} height={28} viewBox="0 0 24 24">
            <Path
                d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01"
                stroke={iconColor}
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

// ============ MAIN COMPONENT ============

export function ConfirmModal({
    visible,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary',
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const { iconBg, iconColor, buttonBg } = getVariantColors(variant);

    return (
        <RNModal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onCancel}
        >
            <Animated.View
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(150)}
                style={styles.backdrop}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

                <Animated.View
                    entering={SlideInUp.duration(300).easing(Easing.out(Easing.cubic))}
                    exiting={SlideOutDown.duration(250).easing(Easing.in(Easing.cubic))}
                    style={styles.sheet}
                >
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                        <VariantIcon variant={variant} />
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text className="text-center font-inter text-lg font-bold text-primary-950">
                            {title}
                        </Text>
                        <Text className="mt-2 text-center font-inter text-sm leading-5 text-neutral-500">
                            {message}
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.cancelButton,
                                pressed && { opacity: 0.8 },
                            ]}
                            onPress={onCancel}
                        >
                            <Text className="font-inter text-sm font-semibold text-neutral-600">
                                {cancelText}
                            </Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.confirmButton,
                                { backgroundColor: buttonBg },
                                pressed && { opacity: 0.85 },
                            ]}
                            onPress={onConfirm}
                        >
                            <Text className="font-inter text-sm font-bold text-white">
                                {confirmText}
                            </Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </Animated.View>
        </RNModal>
    );
}

// ============ HOOK ============

export function useConfirmModal() {
    const [modalConfig, setModalConfig] = React.useState<{
        visible: boolean;
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        variant?: ConfirmModalVariant;
        onConfirm: () => void;
    }>({
        visible: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const show = React.useCallback((config: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        variant?: ConfirmModalVariant;
        onConfirm: () => void;
    }) => {
        setModalConfig({ ...config, visible: true });
    }, []);

    const hide = React.useCallback(() => {
        setModalConfig(prev => ({ ...prev, visible: false }));
    }, []);

    const modalProps: ConfirmModalProps = {
        ...modalConfig,
        onCancel: hide,
        onConfirm: () => {
            modalConfig.onConfirm();
            hide();
        },
    };

    return { show, hide, modalProps };
}

// ============ STYLES ============

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 40,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.neutral[300],
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 24,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    content: {
        paddingHorizontal: 8,
        marginBottom: 28,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        backgroundColor: colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
    },
    confirmButton: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
});

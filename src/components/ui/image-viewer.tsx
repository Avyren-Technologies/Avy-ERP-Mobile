import * as React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import colors from '@/components/ui/colors';
import { useFileUrl } from '@/hooks/use-file-url';

// ── Types ────────────────────────────────────────────────────────

export interface ImageViewerImage {
    fileName: string;
    fileUrl: string;
}

export interface ImageViewerProps {
    images: ImageViewerImage[];
    initialIndex?: number;
    visible: boolean;
    onClose: () => void;
}

// ── Constants ────────────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Resolved Image Item (resolves R2 keys to presigned URLs) ────

function ResolvedImageItem({ item }: { item: ImageViewerImage }) {
    const isLocalOrHttp = item.fileUrl.startsWith('file://') || item.fileUrl.startsWith('http://') || item.fileUrl.startsWith('https://');
    const { url, isLoading } = useFileUrl({ key: item.fileUrl, enabled: !isLocalOrHttp });
    const resolvedUri = isLocalOrHttp ? item.fileUrl : url;

    return (
        <View style={viewerStyles.imageContainer}>
            <ScrollView
                contentContainerStyle={viewerStyles.scrollContent}
                maximumZoomScale={4}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                bouncesZoom
                centerContent
            >
                {isLoading ? (
                    <ActivityIndicator size="large" color={colors.white} />
                ) : resolvedUri ? (
                    <Image
                        source={{ uri: resolvedUri }}
                        style={viewerStyles.fullImage}
                        contentFit="contain"
                    />
                ) : null}
            </ScrollView>
        </View>
    );
}

// ── Component ────────────────────────────────────────────────────

export function ImageViewer({ images, initialIndex = 0, visible, onClose }: ImageViewerProps) {
    const insets = useSafeAreaInsets();
    const flatListRef = React.useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

    // Reset index when viewer opens
    React.useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex);
            // Scroll to initial index after mount
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
            }, 50);
        }
    }, [visible, initialIndex]);

    const handleViewableItemsChanged = React.useRef(
        ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
            if (viewableItems.length > 0 && viewableItems[0].index != null) {
                setCurrentIndex(viewableItems[0].index);
            }
        }
    ).current;

    const viewabilityConfig = React.useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const goToPrevious = () => {
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
            setCurrentIndex(newIndex);
        }
    };

    const goToNext = () => {
        if (currentIndex < images.length - 1) {
            const newIndex = currentIndex + 1;
            flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
            setCurrentIndex(newIndex);
        }
    };

    const currentImage = images[currentIndex];
    const hasMultiple = images.length > 1;

    const renderImageItem = React.useCallback(({ item }: { item: ImageViewerImage }) => (
        <ResolvedImageItem item={item} />
    ), []);

    if (!visible || images.length === 0) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={viewerStyles.overlay}>
                {/* Close button */}
                <Pressable
                    onPress={onClose}
                    hitSlop={12}
                    style={[viewerStyles.closeButton, { top: insets.top + 12, left: 16 }]}
                >
                    <View style={viewerStyles.closeCircle}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path
                                d="M18 6L6 18M6 6l12 12"
                                stroke={colors.white}
                                strokeWidth="2.5"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </View>
                </Pressable>

                {/* Image counter */}
                {hasMultiple && (
                    <View style={[viewerStyles.counter, { top: insets.top + 18 }]}>
                        <Text className="font-inter text-sm font-bold" style={{ color: colors.white }}>
                            {currentIndex + 1} / {images.length}
                        </Text>
                    </View>
                )}

                {/* Image carousel */}
                <FlatList
                    ref={flatListRef}
                    data={images}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(_, index) => `viewer-img-${index}`}
                    renderItem={renderImageItem}
                    onViewableItemsChanged={handleViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    getItemLayout={(_, index) => ({
                        length: SCREEN_WIDTH,
                        offset: SCREEN_WIDTH * index,
                        index,
                    })}
                    initialScrollIndex={initialIndex}
                    style={viewerStyles.flatList}
                />

                {/* Navigation arrows */}
                {hasMultiple && currentIndex > 0 && (
                    <Pressable onPress={goToPrevious} style={[viewerStyles.navButton, viewerStyles.navLeft]}>
                        <View style={viewerStyles.navCircle}>
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
                        </View>
                    </Pressable>
                )}
                {hasMultiple && currentIndex < images.length - 1 && (
                    <Pressable onPress={goToNext} style={[viewerStyles.navButton, viewerStyles.navRight]}>
                        <View style={viewerStyles.navCircle}>
                            <Svg width={20} height={20} viewBox="0 0 24 24">
                                <Path
                                    d="M9 18l6-6-6-6"
                                    stroke={colors.white}
                                    strokeWidth="2.5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                        </View>
                    </Pressable>
                )}

                {/* Filename bar at bottom */}
                <View style={[viewerStyles.filenameBar, { paddingBottom: insets.bottom + 12 }]}>
                    <Text className="font-inter text-xs font-semibold" style={{ color: colors.white }} numberOfLines={1}>
                        {currentImage?.fileName ?? 'Image'}
                    </Text>
                </View>
            </Animated.View>
        </Modal>
    );
}

// ── Helper ───────────────────────────────────────────────────────

/** Check if a URI points to an image (by extension, R2 presigned URL, or local file) */
export function isImageFile(uri: string): boolean {
    if (!uri) return false;
    const lower = uri.toLowerCase();
    // Local file picked from camera/gallery
    if (lower.startsWith('file://')) return true;
    // HTTP(S) URLs (R2 presigned URLs)
    if (lower.startsWith('http://') || lower.startsWith('https://')) return true;
    // Common image extensions
    return /\.(jpg|jpeg|png|gif|bmp|webp|svg|heic|heif|avif)(\?.*)?$/i.test(lower);
}

// ── Styles ───────────────────────────────────────────────────────

const viewerStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    closeButton: {
        position: 'absolute',
        zIndex: 10,
    },
    closeCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    counter: {
        position: 'absolute',
        right: 16,
        zIndex: 10,
    },
    flatList: {
        flex: 1,
    },
    imageContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.7,
    },
    navButton: {
        position: 'absolute',
        top: '50%',
        marginTop: -20,
        zIndex: 10,
    },
    navLeft: {
        left: 12,
    },
    navRight: {
        right: 12,
    },
    navCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filenameBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
});

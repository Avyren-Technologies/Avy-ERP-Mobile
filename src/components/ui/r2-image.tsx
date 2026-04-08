import { ActivityIndicator, View } from 'react-native';
import type { ImageStyle } from 'react-native';

import { Image, type ImgProps } from '@/components/ui/image';
import { useFileUrl } from '@/hooks/use-file-url';

interface R2ImageProps extends Omit<ImgProps, 'source'> {
  fileKey: string | null | undefined;
  platform?: boolean;
  style?: ImageStyle;
  fallback?: React.ReactNode;
}

export function R2Image({ fileKey, platform, fallback, style, ...imageProps }: R2ImageProps) {
  const { url, isLoading } = useFileUrl({ key: fileKey, platform });

  if (!fileKey) return fallback ? <>{fallback}</> : null;
  if (isLoading) {
    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="small" />
      </View>
    );
  }
  if (!url) return fallback ? <>{fallback}</> : null;

  return <Image source={{ uri: url }} style={style} {...imageProps} />;
}

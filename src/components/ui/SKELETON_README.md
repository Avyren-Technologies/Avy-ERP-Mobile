# Skeleton Loader Components

This project uses `react-native-reanimated-skeleton` for smooth skeleton loading animations.

## Installation

The library is already installed. It works with react-native-reanimated v3+.

## Basic Usage

### Simple Skeleton

```tsx
import { Skeleton } from '@/components/ui';

function MyComponent({ isLoading, data }) {
  return (
    <Skeleton isLoading={isLoading}>
      <View>
        <Text>{data.title}</Text>
        <Text>{data.description}</Text>
      </View>
    </Skeleton>
  );
}
```

### Custom Layout Skeleton

```tsx
import { Skeleton } from '@/components/ui';

function CustomSkeleton({ isLoading }) {
  return (
    <Skeleton
      isLoading={isLoading}
      layout={[
        { key: 'avatar', width: 40, height: 40, borderRadius: 20 },
        { key: 'title', width: '80%', height: 16, marginBottom: 8 },
        { key: 'content', width: '100%', height: 12 },
      ]}
    >
      <UserProfile data={userData} />
    </Skeleton>
  );
}
```

## Predefined Components

### SkeletonCard
Perfect for loading states of cards/lists.

```tsx
import { SkeletonCard } from '@/components/ui';

<SkeletonCard />
```

### SkeletonText
For text content loading.

```tsx
import { SkeletonText } from '@/components/ui';

<SkeletonText lines={3} />
```

### SkeletonAvatar
For profile pictures or avatars.

```tsx
import { SkeletonAvatar } from '@/components/ui';

<SkeletonAvatar />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isLoading` | boolean | required | Shows skeleton when true |
| `layout` | array | [] | Custom bone layout specifications |
| `containerStyle` | object | {} | Container styling |
| `boneColor` | string | '#E1E9EE' | Skeleton bone color |
| `highlightColor` | string | '#F2F8FC' | Highlight/shimmer color |
| `animationType` | 'shiver' \| 'pulse' | 'shiver' | Animation type |
| `duration` | number | 1200 | Animation duration in ms |

## Layout Configuration

Each layout item supports:

```tsx
{
  key: 'uniqueKey',           // Required unique identifier
  width: 100,                 // Number or '50%' string
  height: 20,                 // Number in pixels
  borderRadius: 4,            // Border radius
  marginBottom: 8,            // Spacing
  marginLeft: 8,              // Spacing
  // ... other styles
}
```

## Best Practices

1. **Use consistent colors** with your app's theme
2. **Match actual content dimensions** for best UX
3. **Group related skeletons** in containers
4. **Test on all devices** for proper layout
5. **Use predefined components** when possible

## Examples

See `skeleton-examples.tsx` for complete usage examples.
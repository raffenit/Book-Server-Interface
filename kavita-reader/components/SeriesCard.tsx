import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import { Series } from '../services/kavitaAPI';
import { kavitaAPI } from '../services/kavitaAPI';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

const GAP = Spacing.sm;
const SIDE_MARGIN = Spacing.base;

export function useGridColumns() {
  const { width } = useWindowDimensions();
  const numColumns =
    width >= 1600 ? 8 :
    width >= 1280 ? 7 :
    width >= 960  ? 6 :
    width >= 700  ? 5 :
    width >= 500  ? 4 : 3;
  const cardWidth = (width - SIDE_MARGIN * 2 - GAP * (numColumns - 1)) / numColumns;
  return { numColumns, cardWidth };
}

interface Props {
  series: Series;
  onPress: () => void;
  onContextMenu?: (seriesId: number, seriesName: string, x: number, y: number) => void;
  style?: any;
  cardWidth?: number;
}

function getFormatIcon(format: number): string {
  switch (format) {
    case 3: return 'EPUB';
    case 4: return 'PDF';
    case 1: return 'CBZ';
    default: return 'IMG';
  }
}

export function SeriesCard({ series, onPress, onContextMenu, style, cardWidth }: Props) {
  const progress = series.pages > 0 ? (series.pagesRead / series.pages) * 100 : 0;
  const coverUrl = kavitaAPI.getSeriesCoverUrl(series.id);
  const containerRef = useRef<View>(null);

  // Attach contextmenu directly to the DOM node — RNW doesn't forward it via props
  useEffect(() => {
    if (Platform.OS !== 'web' || !onContextMenu) return;
    const el = containerRef.current as any as HTMLElement;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      onContextMenu(series.id, series.name, e.clientX, e.clientY);
    };
    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  }, [onContextMenu, series.id, series.name]);

  function handleLongPress(e: GestureResponderEvent) {
    if (onContextMenu) {
      onContextMenu(series.id, series.name, e.nativeEvent.pageX, e.nativeEvent.pageY);
    }
  }

  return (
    <TouchableOpacity
      ref={containerRef}
      style={[cardWidth ? { width: cardWidth } : styles.cardFallback, style]}
      onPress={onPress}
      onLongPress={onContextMenu ? handleLongPress : undefined}
      delayLongPress={400}
      activeOpacity={0.8}
    >
      <View style={styles.coverContainer}>
        <Image
          source={{ uri: coverUrl }}
          style={styles.cover}
          resizeMode="cover"
        />
        <View style={styles.formatBadge}>
          <Text style={styles.formatText}>{getFormatIcon(series.format)}</Text>
        </View>
        {progress > 0 && progress < 100 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        )}
        {progress >= 100 && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>✓</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>{series.name}</Text>
    </TouchableOpacity>
  );
}

export function SeriesCardLarge({ series, onPress, onContextMenu }: Props) {
  const progress = series.pages > 0 ? (series.pagesRead / series.pages) * 100 : 0;
  const coverUrl = kavitaAPI.getSeriesCoverUrl(series.id);
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !onContextMenu) return;
    const el = containerRef.current as any as HTMLElement;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      onContextMenu(series.id, series.name, e.clientX, e.clientY);
    };
    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  }, [onContextMenu, series.id, series.name]);

  function handleLongPress(e: GestureResponderEvent) {
    if (onContextMenu) {
      onContextMenu(series.id, series.name, e.nativeEvent.pageX, e.nativeEvent.pageY);
    }
  }

  return (
    <TouchableOpacity
      ref={containerRef}
      style={styles.cardLarge}
      onPress={onPress}
      onLongPress={onContextMenu ? handleLongPress : undefined}
      delayLongPress={400}
      activeOpacity={0.8}
    >
      <Image source={{ uri: coverUrl }} style={styles.coverLarge} resizeMode="cover" />
      <View style={styles.infoLarge}>
        <Text style={styles.titleLarge} numberOfLines={2}>{series.name}</Text>
        {series.libraryName && (
          <Text style={styles.library}>{series.libraryName}</Text>
        )}
        {progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardFallback: { flex: 1 },
  coverContainer: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
    aspectRatio: 0.67,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.xs,
  },
  cover: { width: '100%', height: '100%' },
  formatBadge: {
    position: 'absolute', top: 5, left: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: Radius.sm,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  formatText: {
    fontSize: 9, fontWeight: Typography.bold,
    color: Colors.accent, letterSpacing: 0.5,
  },
  progressBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 3, backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressFill: { height: '100%', backgroundColor: Colors.accent },
  completedBadge: {
    position: 'absolute', top: 5, right: 5,
    width: 20, height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
    justifyContent: 'center', alignItems: 'center',
  },
  completedText: { fontSize: 10, color: '#fff', fontWeight: Typography.bold },
  title: { fontSize: Typography.xs, color: Colors.textPrimary, lineHeight: 16 },
  // Large card
  cardLarge: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  coverLarge: { width: 70, height: 100 },
  infoLarge: {
    flex: 1, padding: Spacing.md,
    justifyContent: 'center', gap: 4,
  },
  titleLarge: {
    fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary,
  },
  library: { fontSize: Typography.sm, color: Colors.accent },
  progressContainer: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginTop: 4,
  },
  progressTrack: {
    flex: 1, height: 4,
    backgroundColor: Colors.progressTrack,
    borderRadius: Radius.full, overflow: 'hidden',
  },
  progressText: { fontSize: Typography.xs, color: Colors.textSecondary },
});

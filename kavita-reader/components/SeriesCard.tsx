import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Series } from '../services/kavitaAPI';
import { kavitaAPI } from '../services/kavitaAPI';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.base * 2 - Spacing.sm * 2) / 3;

interface Props {
  series: Series;
  onPress: () => void;
  style?: any;
}

function getFormatIcon(format: number): string {
  switch (format) {
    case 3: return 'EPUB';
    case 4: return 'PDF';
    default: return 'CBZ';
  }
}

export function SeriesCard({ series, onPress, style }: Props) {
  const progress = series.pages > 0 ? (series.pagesRead / series.pages) * 100 : 0;
  const coverUrl = kavitaAPI.getSeriesCoverUrl(series.id);

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.8}>
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

export function SeriesCardLarge({ series, onPress }: Props) {
  const progress = series.pages > 0 ? (series.pagesRead / series.pages) * 100 : 0;
  const coverUrl = kavitaAPI.getSeriesCoverUrl(series.id);

  return (
    <TouchableOpacity style={styles.cardLarge} onPress={onPress} activeOpacity={0.8}>
      <Image
        source={{ uri: coverUrl }}
        style={styles.coverLarge}
        resizeMode="cover"
      />
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
  card: {
    width: CARD_WIDTH,
  },
  coverContainer: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
    aspectRatio: 0.67,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.xs,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  formatBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: Radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  formatText: {
    fontSize: 9,
    fontWeight: Typography.bold,
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
  completedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: Typography.bold,
  },
  title: {
    fontSize: Typography.xs,
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  // Large card
  cardLarge: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  coverLarge: {
    width: 70,
    height: 100,
  },
  infoLarge: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
    gap: 4,
  },
  titleLarge: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  library: {
    fontSize: Typography.sm,
    color: Colors.accent,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.progressTrack,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
});

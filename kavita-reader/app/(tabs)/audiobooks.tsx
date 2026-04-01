import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { absAPI, ABSLibrary, ABSLibraryItem } from '../../services/audiobookshelfAPI';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function AudiobookCard({ item, onPress, onPlay, isPlaying }: {
  item: ABSLibraryItem;
  onPress: () => void;
  onPlay: () => void;
  isPlaying: boolean;
}) {
  const meta = item.media.metadata;
  const progress = item.userMediaProgress;
  const progressPct = progress ? Math.round(progress.progress * 100) : 0;
  const coverUri = absAPI.getCoverUrl(item.id);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.coverWrapper}>
        <Image source={{ uri: coverUri }} style={styles.cover} />
        {progressPct > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{meta.title}</Text>
        {meta.authorName ? (
          <Text style={styles.cardAuthor} numberOfLines={1}>{meta.authorName}</Text>
        ) : null}
        {meta.duration ? (
          <Text style={styles.cardDuration}>{formatDuration(meta.duration)}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={onPlay} style={styles.playBtn} hitSlop={8}>
        <Ionicons
          name={isPlaying ? 'pause-circle' : 'play-circle'}
          size={36}
          color={Colors.accent}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function AudiobooksScreen() {
  const router = useRouter();
  const { nowPlaying, isPlaying, play, togglePlayPause } = useAudioPlayer();

  const [connected, setConnected] = useState(false);
  const [libraries, setLibraries] = useState<ABSLibrary[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [items, setItems] = useState<ABSLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const checkStatus = async () => {
        await absAPI.initialize();
        
        if (!absAPI.hasCredentials()) {
          setConnected(false);
          setLoading(false);
          return;
        }

        // Run the fetch!
        initialize(); 
      };

      checkStatus();
    }, []) // <--- EMPTY ARRAY IS THE LIFESAVER HERE
  );

  async function initialize() {
    await absAPI.initialize();
    if (!absAPI.hasCredentials()) {
      setConnected(false);
      setLoading(false);
      return;
    }
    setConnected(true);
    try {
      const libs = await absAPI.getLibraries();
      const bookLibs = libs.filter(l => l.mediaType === 'book');
      setLibraries(bookLibs);
      const firstId = bookLibs[0]?.id ?? null;
      setSelectedLibraryId(firstId);
      if (firstId) await fetchItems(firstId, 0, true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  const fetchItems = useCallback(async (libraryId: string, pageNum: number, reset: boolean) => {
    try {
      const { items: data, total } = await absAPI.getLibraryItems(libraryId, pageNum, 40);
      if (reset) {
        setItems(data);
      } else {
        setItems(prev => [...prev, ...data]);
      }
      setPage(pageNum);
      setHasMore((pageNum + 1) * 40 < total);
    } catch (e) {
      console.error('Failed to fetch audiobook items', e);
    } finally {
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  function onRefresh() {
    setRefreshing(true);
    if (selectedLibraryId) fetchItems(selectedLibraryId, 0, true);
  }

  function loadMore() {
    if (!hasMore || loadingMore || !selectedLibraryId) return;
    setLoadingMore(true);
    fetchItems(selectedLibraryId, page + 1, false);
  }

  async function selectLibrary(id: string) {
    if (id === selectedLibraryId) return;
    setSelectedLibraryId(id);
    setLoading(true);
    setItems([]);
    await fetchItems(id, 0, true);
    setLoading(false);
  }

  async function handlePlay(item: ABSLibraryItem) {
    if (nowPlaying?.item.id === item.id) {
      await togglePlayPause();
    } else {
      await play(item);
    }
  }

  if (!connected && !loading) {
    return (
      <View style={styles.notConfigured}>
        <Ionicons name="headset-outline" size={64} color={Colors.border} />
        <Text style={styles.emptyTitle}>Audiobookshelf not configured</Text>
        <Text style={styles.emptyText}>Add your server URL and API key in Settings → Audiobookshelf.</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Text style={styles.settingsBtnText}>Go to Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Audiobooks</Text>
      </View>

      {/* Library picker */}
      {libraries.length > 1 && (
        <FlatList
          horizontal
          data={libraries}
          keyExtractor={l => l.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.libraryPicker}
          renderItem={({ item: lib }) => (
            <TouchableOpacity
              style={[styles.libChip, lib.id === selectedLibraryId && styles.libChipActive]}
              onPress={() => selectLibrary(lib.id)}
            >
              <Text style={[styles.libChipText, lib.id === selectedLibraryId && styles.libChipTextActive]}>
                {lib.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.accent} style={{ padding: Spacing.xl }} /> : null}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>No audiobooks found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <AudiobookCard
              item={item}
              onPress={() => router.push(`/audiobook/${item.id}`)}
              onPlay={() => handlePlay(item)}
              isPlaying={isPlaying && nowPlaying?.item.id === item.id}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    fontFamily: 'Georgia',
  },
  libraryPicker: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  libChip: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  libChipActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  libChipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  libChipTextActive: {
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
  list: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 120,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  coverWrapper: {
    position: 'relative',
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.progressTrack,
    borderBottomLeftRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: Colors.accent,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  cardAuthor: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  cardDuration: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  playBtn: {
    padding: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: Spacing.sm,
  },
  notConfigured: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  settingsBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  settingsBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textOnAccent,
  },
});

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { kavitaAPI, Series, Genre, Tag } from '../../services/kavitaAPI';
import { SeriesCard, SeriesCardLarge, useGridColumns } from '../../components/SeriesCard';
import SeriesContextMenu from '../../components/SeriesContextMenu';
import GenreTagContextMenu, { ChipType } from '../../components/GenreTagContextMenu';
import { useSeriesContextMenu } from '../../hooks/useSeriesContextMenu';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

// ── Inline filter row ──────────────────────────────────────────────────────────

function FilterRow<T extends { id: number; title?: string; label?: string; name?: string }>({
  label,
  items,
  selectedId,
  onSelect,
  onChipContextMenu,
}: {
  label: string;
  items: T[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onChipContextMenu?: (item: T, x: number, y: number) => void;
}) {
  return (
    <View style={styles.filterRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRowContent}
      >
        <Text style={styles.filterRowLabel}>{label}</Text>
        {/* "All" chip — no context menu */}
        <TouchableOpacity
          style={[styles.chip, selectedId === null && styles.chipActive]}
          onPress={() => onSelect(null)}
          activeOpacity={0.75}
        >
          <Text style={[styles.chipText, selectedId === null && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {items.map(item => {
          const name = (item as any).title ?? (item as any).label ?? (item as any).name ?? '';
          const active = selectedId === item.id;
          return (
            <ChipWithContextMenu
              key={item.id}
              active={active}
              name={name}
              onPress={() => onSelect(active ? null : item.id)}
              onContextMenu={onChipContextMenu ? (x, y) => onChipContextMenu(item, x, y) : undefined}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

function ChipWithContextMenu({
  active, name, onPress, onContextMenu,
}: {
  active: boolean;
  name: string;
  onPress: () => void;
  onContextMenu?: (x: number, y: number) => void;
}) {
  const ref = React.useRef<any>(null);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !onContextMenu) return;
    const el = ref.current as HTMLElement | null;
    if (!el) return;
    const handler = (e: MouseEvent) => { e.preventDefault(); onContextMenu(e.clientX, e.clientY); };
    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  }, [onContextMenu]);

  function handleLongPress(e: GestureResponderEvent) {
    onContextMenu?.(e.nativeEvent.pageX, e.nativeEvent.pageY);
  }

  return (
    <TouchableOpacity
      ref={ref}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      onLongPress={onContextMenu ? handleLongPress : undefined}
      delayLongPress={400}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{name}</Text>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { numColumns, cardWidth } = useGridColumns();
  const { ctx: ctxMenu, openMenu, closeMenu, openDetail } = useSeriesContextMenu();

  const [chipMenu, setChipMenu] = useState<{
    visible: boolean;
    itemId: number | null;
    itemTitle: string;
    itemType: ChipType | null;
    position: { x: number; y: number };
  }>({ visible: false, itemId: null, itemTitle: '', itemType: null, position: { x: 0, y: 0 } });

  function openChipMenu(item: { id: number; title?: string }, type: ChipType, x: number, y: number) {
    setChipMenu({ visible: true, itemId: item.id, itemTitle: item.title ?? '', itemType: type, position: { x, y } });
  }

  function closeChipMenu() {
    setChipMenu(prev => ({ ...prev, visible: false }));
  }

  const [genres, setGenres] = useState<Genre[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  const [recentSeries, setRecentSeries] = useState<Series[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filterKey = `${selectedGenreId}|${selectedTagId}`;
  const prevFilterKey = useRef(filterKey);

  const fetchMetadata = useCallback(async () => {
    try {
      const [g, t, recent] = await Promise.all([
        kavitaAPI.getGenres(),
        kavitaAPI.getTags(),
        kavitaAPI.getRecentlyRead(),
      ]);
      setGenres(g);
      setTags(t);
      setRecentSeries(recent.slice(0, 5));
    } catch (e) {
      console.error('Failed to fetch metadata', e);
    }
  }, []);

  const fetchSeries = useCallback(async (pageNum: number, reset: boolean) => {
    setSeriesLoading(true);
    try {
      const pageSize = 30;
      let raw: Series[] = [];
      if (selectedGenreId !== null) {
        raw = await kavitaAPI.getSeriesByGenre(selectedGenreId, pageNum, pageSize);
      } else if (selectedTagId !== null) {
        raw = await kavitaAPI.getSeriesByTag(selectedTagId, pageNum, pageSize);
      } else {
        raw = await kavitaAPI.getAllSeries(pageNum, pageSize);
      }
      if (reset) {
        setSeries(raw);
      } else {
        setSeries(prev => [...prev, ...raw]);
      }
      setHasMore(raw.length === pageSize);
      setPage(pageNum);
    } catch (e) {
      console.error('Failed to fetch series', e);
    } finally {
      setSeriesLoading(false);
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedGenreId, selectedTagId]);

  useEffect(() => {
    fetchMetadata();
    fetchSeries(0, true);
  }, []);

  useEffect(() => {
    if (filterKey === prevFilterKey.current) return;
    prevFilterKey.current = filterKey;
    setSeries([]);
    setPage(0);
    setHasMore(true);
    fetchSeries(0, true);
  }, [filterKey]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMetadata();
    fetchSeries(0, true);
  };

  function loadMore() {
    if (!hasMore || seriesLoading) return;
    fetchSeries(page + 1, false);
  }

  const hasActiveFilter = selectedGenreId !== null || selectedTagId !== null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <>
      <FlatList
        key={numColumns}
        data={series}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Your Library</Text>
              <Text style={styles.subtitle}>
                {series.length > 0 ? `${series.length}${hasMore ? '+' : ''} series` : ''}
              </Text>
            </View>

            {/* Continue Reading — hidden when filters are active */}
            {recentSeries.length > 0 && !hasActiveFilter && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Continue Reading</Text>
                {recentSeries.map((s: any) => (
                  <SeriesCardLarge
                    key={s.seriesId || s.id}
                    series={{ ...s, id: s.seriesId || s.id }}
                    onPress={() => router.push(`/series/${s.seriesId || s.id}`)}
                    onContextMenu={openMenu}
                  />
                ))}
              </View>
            )}

            {/* Filter rows */}
            <View style={styles.filtersBlock}>
              <FilterRow
                label="Genre"
                items={genres}
                selectedId={selectedGenreId}
                onSelect={setSelectedGenreId}
                onChipContextMenu={(item, x, y) => openChipMenu(item, 'genre', x, y)}
              />
              <FilterRow
                label="Tag"
                items={tags}
                selectedId={selectedTagId}
                onSelect={setSelectedTagId}
                onChipContextMenu={(item, x, y) => openChipMenu(item, 'tag', x, y)}
              />
            </View>

            {hasActiveFilter && (
              <View style={styles.activeFilterBar}>
                <Text style={styles.activeFilterText}>
                  {series.length}{hasMore ? '+' : ''} result{series.length !== 1 ? 's' : ''}
                  {seriesLoading ? '…' : ''}
                </Text>
                <TouchableOpacity onPress={() => {
                  setSelectedGenreId(null);
                  setSelectedTagId(null);
                }}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          seriesLoading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={Colors.accent} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !seriesLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No series found</Text>
              <Text style={styles.emptyText}>
                {hasActiveFilter
                  ? 'Try different filters or clear them to see all series.'
                  : 'Your Kavita library appears to be empty.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <SeriesCard
            series={item}
            onPress={() => router.push(`/series/${item.id}`)}
            onContextMenu={openMenu}
            cardWidth={cardWidth}
          />
        )}
      />

      <SeriesContextMenu
        visible={ctxMenu.visible}
        seriesId={ctxMenu.seriesId}
        seriesName={ctxMenu.seriesName}
        position={ctxMenu.position}
        onClose={closeMenu}
        onOpenDetail={openDetail}
      />

      <GenreTagContextMenu
        visible={chipMenu.visible}
        itemId={chipMenu.itemId}
        itemTitle={chipMenu.itemTitle}
        itemType={chipMenu.itemType}
        position={chipMenu.position}
        onClose={closeChipMenu}
        onRemoved={() => { closeChipMenu(); fetchMetadata(); fetchSeries(0, true); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1, backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  grid: {
    paddingBottom: 40,
    backgroundColor: Colors.background,
  },
  row: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    fontFamily: Typography.serif,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    fontWeight: Typography.medium,
    paddingBottom: 4,
  },
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  // Filter rows
  filtersBlock: {
    marginBottom: Spacing.md,
    gap: 6,
  },
  filterRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  filterRowLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginRight: Spacing.xs,
    minWidth: 64,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  chipTextActive: {
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },

  // Active filter summary bar
  activeFilterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  activeFilterText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  clearText: {
    fontSize: Typography.sm,
    color: Colors.accent,
    fontWeight: Typography.medium,
  },

  // Footer / empty
  footerLoader: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

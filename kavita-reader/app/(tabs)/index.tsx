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
} from 'react-native';
import { useRouter } from 'expo-router';
import { kavitaAPI, Series, Genre, Tag, Collection } from '../../services/kavitaAPI';
import { SeriesCard, SeriesCardLarge, useGridColumns } from '../../components/SeriesCard';
import SeriesContextMenu from '../../components/SeriesContextMenu';
import { useSeriesContextMenu } from '../../hooks/useSeriesContextMenu';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

// ── Format options ─────────────────────────────────────────────────────────────

const FORMATS: { id: number; label: string }[] = [
  { id: 4, label: 'PDF' },
  { id: 3, label: 'EPUB' },
  { id: 1, label: 'CBZ' },
];

// ── Inline filter row ──────────────────────────────────────────────────────────

function FilterRow<T extends { id: number; title?: string; label?: string; name?: string }>({
  label,
  items,
  selectedId,
  onSelect,
}: {
  label: string;
  items: T[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <View style={styles.filterRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRowContent}
      >
        <Text style={styles.filterRowLabel}>{label}</Text>
        {/* "All" chip */}
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
            <TouchableOpacity
              key={item.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(active ? null : item.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { numColumns, cardWidth } = useGridColumns();
  const { ctx: ctxMenu, openMenu, closeMenu, openDetail } = useSeriesContextMenu();

  const [genres, setGenres] = useState<Genre[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<number | null>(null);

  const [recentSeries, setRecentSeries] = useState<Series[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filterKey = `${selectedGenreId}|${selectedTagId}|${selectedCollectionId}|${selectedFormatId}`;
  const prevFilterKey = useRef(filterKey);

  const fetchMetadata = useCallback(async () => {
    try {
      const [g, t, c, recent] = await Promise.all([
        kavitaAPI.getGenres(),
        kavitaAPI.getTags(),
        kavitaAPI.getCollections(),
        kavitaAPI.getRecentlyRead(),
      ]);
      setGenres(g);
      setTags(t);
      setCollections(c);
      setRecentSeries(recent.slice(0, 5));
    } catch (e) {
      console.error('Failed to fetch metadata', e);
    }
  }, []);

  const fetchSeries = useCallback(async (pageNum: number, reset: boolean) => {
    setSeriesLoading(true);
    try {
      const pageSize = selectedFormatId !== null ? 60 : 30;
      let raw: Series[] = [];
      if (selectedGenreId !== null) {
        raw = await kavitaAPI.getSeriesByGenre(selectedGenreId, pageNum, pageSize);
      } else if (selectedTagId !== null) {
        raw = await kavitaAPI.getSeriesByTag(selectedTagId, pageNum, pageSize);
      } else if (selectedCollectionId !== null) {
        raw = await kavitaAPI.getSeriesForCollection(selectedCollectionId, pageNum, pageSize);
      } else {
        raw = await kavitaAPI.getAllSeries(pageNum, pageSize);
      }
      const filtered = selectedFormatId !== null
        ? raw.filter(s => s.format === selectedFormatId)
        : raw;
      if (reset) {
        setSeries(filtered);
      } else {
        setSeries(prev => [...prev, ...filtered]);
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
  }, [selectedGenreId, selectedTagId, selectedCollectionId, selectedFormatId]);

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

  const hasActiveFilter = selectedGenreId !== null || selectedTagId !== null
    || selectedCollectionId !== null || selectedFormatId !== null;

  const formatItems = FORMATS.map(f => ({ id: f.id, title: f.label }));

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
            <View style={styles.header}>
              <Text style={styles.title}>Your Library</Text>
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
              />
              <FilterRow
                label="Tag"
                items={tags}
                selectedId={selectedTagId}
                onSelect={setSelectedTagId}
              />
              <FilterRow
                label="Collection"
                items={collections}
                selectedId={selectedCollectionId}
                onSelect={setSelectedCollectionId}
              />
              <FilterRow
                label="Format"
                items={formatItems}
                selectedId={selectedFormatId}
                onSelect={setSelectedFormatId}
              />
            </View>

            {hasActiveFilter && (
              <View style={styles.activeFilterBar}>
                <Text style={styles.activeFilterText}>
                  {series.length} result{series.length !== 1 ? 's' : ''}
                  {seriesLoading ? '…' : ''}
                </Text>
                <TouchableOpacity onPress={() => {
                  setSelectedGenreId(null);
                  setSelectedTagId(null);
                  setSelectedCollectionId(null);
                  setSelectedFormatId(null);
                }}>
                  <Text style={styles.clearText}>Clear all</Text>
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
    paddingTop: 60,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    fontFamily: Typography.serif,
    lineHeight: 42,
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

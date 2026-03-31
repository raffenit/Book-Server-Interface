/**
 * SeriesContextMenu
 * A floating modal triggered by right-click (web) or long-press (native).
 * Lets the user toggle genres, tags, and collection membership for a series.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  TextInput,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { kavitaAPI, SeriesMetadata, Genre, Tag, Collection } from '../services/kavitaAPI';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface Props {
  visible: boolean;
  seriesId: number | null;
  seriesName: string;
  position: ContextMenuPosition;
  onClose: () => void;
  onOpenDetail?: () => void;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SeriesContextMenu({
  visible, seriesId, seriesName, position, onClose, onOpenDetail,
}: Props) {
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metadata, setMetadata] = useState<SeriesMetadata | null>(null);
  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [collectionsWithSeries, setCollectionsWithSeries] = useState<Set<number>>(new Set());
  const [tab, setTab] = useState<'genres' | 'tags' | 'collections'>('genres');
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (visible && seriesId != null) {
      setTab('genres');
      setSearch('');
      setSaved(false);
      setSaveError('');
      loadData();
    }
  }, [visible, seriesId]);

  async function loadData() {
    setLoading(true);
    try {
      const [meta, genres, tags, colls] = await Promise.all([
        kavitaAPI.getSeriesMetadata(seriesId!),
        kavitaAPI.getGenres(),
        kavitaAPI.getTags(),
        kavitaAPI.getCollections(),
      ]);
      setMetadata(meta);
      setAllGenres(genres);
      setAllTags(tags);
      setAllCollections(colls);
      // Determine collection membership
      const inColls = new Set<number>();
      await Promise.all(
        colls.map(async (c) => {
          const series = await kavitaAPI.getSeriesForCollection(c.id);
          if (series.some(s => s.id === seriesId)) inColls.add(c.id);
        })
      );
      setCollectionsWithSeries(inColls);
    } finally {
      setLoading(false);
    }
  }

  function toggleGenre(g: Genre) {
    if (!metadata) return;
    const has = metadata.genres.some(mg => mg.id === g.id);
    setMetadata({ ...metadata, genres: has ? metadata.genres.filter(mg => mg.id !== g.id) : [...metadata.genres, g] });
  }

  function toggleTag(t: Tag) {
    if (!metadata) return;
    const has = metadata.tags.some(mt => mt.id === t.id);
    setMetadata({ ...metadata, tags: has ? metadata.tags.filter(mt => mt.id !== t.id) : [...metadata.tags, t] });
  }

  function toggleCollection(collId: number) {
    const next = new Set(collectionsWithSeries);
    if (next.has(collId)) next.delete(collId); else next.add(collId);
    setCollectionsWithSeries(next);
  }

  async function save() {
    if (!metadata) return;
    setSaving(true);
    setSaveError('');
    try {
      await kavitaAPI.updateSeriesMetadata(metadata);
      await Promise.all(
        allCollections.map(async (c) => {
          const wasIn = collectionsWithSeries.has(c.id);
          const current = await kavitaAPI.getSeriesForCollection(c.id);
          const isIn = current.some(s => s.id === seriesId);
          if (!isIn && wasIn) await kavitaAPI.addSeriesToCollection(c.id, seriesId!);
          if (isIn && !wasIn) await kavitaAPI.removeSeriesFromCollection(c, seriesId!);
        })
      );
      setSaved(true);
      setTimeout(onClose, 800);
    } catch (e: any) {
      setSaveError(e?.response?.data?.title ?? e?.message ?? 'Save failed — check console');
      console.error('Context menu save failed', e);
    } finally {
      setSaving(false);
    }
  }

  // Position the popup near the tap/click, clamped to screen
  const MENU_W = Math.min(320, width - 32);
  const MENU_H = 400;
  const left = Math.min(position.x, width - MENU_W - 16);
  const top = Math.min(position.y, height - MENU_H - 60);

  const activeList = tab === 'genres' ? allGenres : tab === 'tags' ? allTags : allCollections;
  const filteredList = activeList.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  function isSelected(item: Genre | Tag | Collection) {
    if (tab === 'genres') return metadata?.genres.some(g => g.id === item.id) ?? false;
    if (tab === 'tags') return metadata?.tags.some(t => t.id === item.id) ?? false;
    return collectionsWithSeries.has(item.id);
  }

  function handleToggle(item: Genre | Tag | Collection) {
    if (tab === 'genres') toggleGenre(item as Genre);
    else if (tab === 'tags') toggleTag(item as Tag);
    else toggleCollection(item.id);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={[styles.menu, { width: MENU_W, top, left }]}>
        {/* Header */}
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle} numberOfLines={1}>{seriesName}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {onOpenDetail && (
          <TouchableOpacity style={styles.openDetailRow} onPress={onOpenDetail}>
            <Ionicons name="book-outline" size={16} color={Colors.accent} />
            <Text style={styles.openDetailText}>Open Detail</Text>
          </TouchableOpacity>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['genres', 'tags', 'collections'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => { setTab(t); setSearch(''); }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : (
          <>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={`Filter ${tab}…`}
              placeholderTextColor={Colors.textMuted}
            />
            <ScrollView style={styles.chipScroll} contentContainerStyle={styles.chipContent}>
              {filteredList.length === 0 && (
                <Text style={styles.emptyText}>No {tab} found.</Text>
              )}
              {filteredList.map(item => (
                <Chip
                  key={item.id}
                  label={item.title}
                  selected={isSelected(item)}
                  onPress={() => handleToggle(item)}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Save error */}
        {saveError ? (
          <Text style={styles.saveError}>{saveError}</Text>
        ) : null}

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={save}
          disabled={saving || loading}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.textOnAccent} />
          ) : saved ? (
            <>
              <Ionicons name="checkmark" size={16} color={Colors.textOnAccent} />
              <Text style={styles.saveBtnText}>Saved!</Text>
            </>
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuTitle: {
    flex: 1, fontSize: Typography.sm,
    fontWeight: Typography.semibold, color: Colors.textPrimary,
  },
  closeBtn: { padding: 4 },
  openDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  openDetailText: {
    fontSize: Typography.sm, color: Colors.accent, fontWeight: Typography.medium,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.accent },
  tabText: { fontSize: 12, color: Colors.textSecondary, fontWeight: Typography.medium },
  tabTextActive: { color: Colors.accent, fontWeight: Typography.bold },
  loadingArea: { height: 120, justifyContent: 'center', alignItems: 'center' },
  searchInput: {
    margin: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  chipScroll: { maxHeight: 180 },
  chipContent: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  chipText: { fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { color: Colors.accent },
  emptyText: { fontSize: Typography.sm, color: Colors.textMuted, fontStyle: 'italic', padding: Spacing.sm },
  saveError: {
    fontSize: 11, color: Colors.error,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs,
    textAlign: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.accent,
    margin: Spacing.sm,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textOnAccent,
  },
});

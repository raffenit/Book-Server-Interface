import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { kavitaAPI, KavitaBookInfo } from '../../services/kavitaAPI';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const THEMES = {
  dark:  { bg: '#1a1a22', text: '#e8e0d0', link: '#e8a838' },
  sepia: { bg: '#f4ecd8', text: '#3b2e1e', link: '#8b6340' },
  light: { bg: '#ffffff', text: '#1a1a1a', link: '#2563eb' },
};
type ThemeName = 'dark' | 'sepia' | 'light';

function buildPageHtml(rawHtml: string, theme: typeof THEMES.dark, baseHref: string): string {
  // Rewrite protocol-relative URLs like //host:port/api/book/ → /api/book/
  const rewritten = rawHtml.replace(/\/\/[^/"'\s]+?(\/api\/book\/)/g, '$1');
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=3">
<base href="${baseHref}">
<style>
*{box-sizing:border-box}
html{background:${theme.bg};-webkit-text-size-adjust:100%}
body{margin:0 auto;padding:24px 20px 60px;background:${theme.bg};color:${theme.text};
  font-family:Georgia,"Times New Roman",serif;font-size:18px;line-height:1.75;max-width:680px}
a{color:${theme.link}}
img{max-width:100%;height:auto;display:block;margin:1em auto}
p{margin:0 0 1em}
h1,h2,h3,h4,h5,h6{color:${theme.text};line-height:1.3;margin:1.2em 0 .5em}
blockquote{border-left:3px solid ${theme.link};margin:1em 0;padding-left:1em;opacity:.85}
pre,code{background:rgba(128,128,128,.15);border-radius:4px;padding:.1em .3em;font-size:.9em}
</style></head><body>${rewritten}</body></html>`;
}

export default function EpubReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    chapterId: string;
    title: string;
    seriesId: string;
    volumeId: string;
  }>();
  const chapterId = Number(params.chapterId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [rawHtml, setRawHtml] = useState('');
  const [theme, setTheme] = useState<ThemeName>('dark');

  // Replace your baseHref logic with this:
  const kavitaProxy = kavitaAPI.getServerUrl(); 

  const baseHref =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${kavitaProxy}/api/Reader/image-proxy/${chapterId}/` 
      : `${kavitaProxy}/api/Reader/image-proxy/${chapterId}/`;

  // Rebuild page HTML whenever raw content or theme changes (no extra network call on theme switch)
  const pageHtml = rawHtml ? buildPageHtml(rawHtml, THEMES[theme], baseHref) : '';

  async function loadPage(page: number) {
    setLoading(true);
    setError('');
    try {
      const html = await kavitaAPI.getBookPage(chapterId, page);
      setRawHtml(html);
      setCurrentPage(page);
      kavitaAPI.saveReadingProgress(
        chapterId, page,
      );
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load page');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const info: KavitaBookInfo = await kavitaAPI.getBookInfo(chapterId);
        setTotalPages(info.pages ?? 0);

        // Check if lastReadPage is a valid number (including 0)
        // If it's undefined or null, default to 0
        const startPage = (info.lastReadPage !== undefined && info.lastReadPage !== null)
          ? info.lastReadPage 
          : 0;

        console.log(`Resuming at page: ${startPage}`);
        await loadPage(startPage);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load book');
        setLoading(false);
      }
    })();
  }, [chapterId]);

  function cycleTheme() {
    const order: ThemeName[] = ['dark', 'sepia', 'light'];
    setTheme(prev => order[(order.indexOf(prev) + 1) % order.length]);
  }

  const themeIcon = { dark: 'moon' as const, sepia: 'cafe' as const, light: 'sunny' as const }[theme];
  const t = THEMES[theme];

  if (error && !loading) {
    return (
      <View style={[styles.container, { backgroundColor: t.bg }]}>
        <View style={styles.errorCenter}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.goBack}>
            <Text style={styles.goBackText}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const canPrev = currentPage > 0 && !loading;
  const canNext = currentPage < totalPages - 1 && !loading;
  const progressPct = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar hidden />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{params.title || 'Reader'}</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={cycleTheme}>
          <Ionicons name={themeIcon} size={20} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Page content */}
      <View style={styles.contentArea}>
        {Platform.OS === 'web' ? (
          // @ts-ignore — iframe is a valid DOM element in React Native Web
          <iframe
            srcDoc={pageHtml}
            style={{
              border: 'none',
              width: '100%',
              height: '100%',
              display: 'block',
              backgroundColor: t.bg,
            }}
            sandbox="allow-scripts allow-same-origin"
            title="Book page"
          />
        ) : (
          <View style={styles.nativePlaceholder}>
            <Ionicons name="book-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.nativeText}>
              EPUB reading is available in the web version of this app.
            </Text>
          </View>
        )}
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: t.bg }]}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      )}

      {/* Footer nav */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navBtn, !canPrev && styles.navBtnDisabled]}
          onPress={() => loadPage(currentPage - 1)}
          disabled={!canPrev}
        >
          <Ionicons name="chevron-back" size={24} color={canPrev ? Colors.textPrimary : Colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.progressInfo}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
          </View>
          <Text style={styles.progressText}>
            {totalPages > 0 ? `${currentPage + 1} / ${totalPages}` : '…'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.navBtn, !canNext && styles.navBtnDisabled]}
          onPress={() => loadPage(currentPage + 1)}
          disabled={!canNext}
        >
          <Ionicons name="chevron-forward" size={24} color={canNext ? Colors.textPrimary : Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(13,13,18,0.92)',
    zIndex: 10,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  contentArea: { flex: 1 },
  nativePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  nativeText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: Typography.base,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 30,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(13,13,18,0.92)',
    gap: Spacing.sm,
    zIndex: 10,
  },
  navBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
  },
  navBtnDisabled: { opacity: 0.4 },
  progressInfo: { flex: 1, alignItems: 'center', gap: 4 },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: Colors.progressTrack,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.accent },
  progressText: { fontSize: Typography.xs, color: Colors.textSecondary },
  loadingOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: { fontSize: Typography.base, color: Colors.textSecondary },
  errorCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: Typography.base,
    color: Colors.error,
    textAlign: 'center',
    lineHeight: 22,
  },
  goBack: { marginTop: Spacing.sm },
  goBackText: { color: Colors.accent, fontSize: Typography.base },
});

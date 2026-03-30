import React, { useEffect, useState, useCallback } from 'react';
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
import { kavitaAPI, Series } from '../../services/kavitaAPI';
import { SeriesCard, SeriesCardLarge } from '../../components/SeriesCard';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [recentSeries, setRecentSeries] = useState<Series[]>([]);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [recent, all] = await Promise.all([
        kavitaAPI.getRecentlyRead(),
        kavitaAPI.getAllSeries(0, 20),
      ]);
      setRecentSeries(recent.slice(0, 10));
      setAllSeries(all);
    } catch (e) {
      console.error('Failed to fetch home data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const goToSeries = (series: Series) => {
    router.push(`/series/${series.id}`);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.loadingText}>Loading your library…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good reading</Text>
        <Text style={styles.subtitle}>Your Kavita library</Text>
      </View>

      {/* Continue Reading */}
      {recentSeries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Reading</Text>
          {recentSeries.slice(0, 5).map((series: any) => (
            <SeriesCardLarge
              key={series.seriesId || series.id}
              series={{ ...series, id: series.seriesId || series.id }}
              onPress={() => goToSeries({ ...series, id: series.seriesId || series.id })}
            />
          ))}
        </View>
      )}

      {/* All Series */}
      {allSeries.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Library</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/libraries')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={allSeries}
            keyExtractor={(item) => item.id.toString()}
            numColumns={3}
            scrollEnabled={false}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <SeriesCard series={item} onPress={() => goToSeries(item)} />
            )}
          />
        </View>
      )}

      {allSeries.length === 0 && recentSeries.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Library is empty</Text>
          <Text style={styles.emptyText}>Your Kavita libraries will appear here once they have content.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.base,
    paddingTop: 60,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    fontFamily: Typography.serif,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  seeAll: {
    fontSize: Typography.sm,
    color: Colors.accent,
    marginBottom: Spacing.md,
  },
  row: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
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

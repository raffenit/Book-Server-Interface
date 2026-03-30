import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { kavitaAPI } from '../../services/kavitaAPI';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  loading?: boolean;
  statusText?: string;
  statusOk?: boolean;
}

function SettingRow({ icon, label, value, onPress, destructive, loading, statusText, statusOk }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress && !loading ? 0.7 : 1}
      disabled={!onPress || loading}
    >
      <View style={[styles.rowIcon, destructive && styles.rowIconDestructive]}>
        <Ionicons name={icon as any} size={18} color={destructive ? Colors.error : Colors.accent} />
      </View>
      <View style={styles.rowMain}>
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
        {statusText ? (
          <Text style={[styles.statusText, statusOk ? styles.statusOk : styles.statusError]}>
            {statusText}
          </Text>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={Colors.accent} />
      ) : value ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : onPress && !destructive ? (
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      ) : null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { logout, serverUrl } = useAuth();
  const [scanLoading, setScanLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scanOk, setScanOk] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState('');
  const [analyzeOk, setAnalyzeOk] = useState(false);

  function handleLogout() {
    Alert.alert(
      'Disconnect',
      'This will remove your server connection. You can reconnect at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: logout },
      ]
    );
  }

  async function handleScanAll() {
    setScanLoading(true);
    setScanStatus('');
    try {
      await kavitaAPI.scanAllLibraries();
      setScanOk(true);
      setScanStatus('Scan queued — Kavita is processing in the background.');
    } catch (e: any) {
      setScanOk(false);
      setScanStatus(`Scan failed: ${e?.response?.status ?? e?.message ?? 'unknown error'}`);
    } finally {
      setScanLoading(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzeLoading(true);
    setAnalyzeStatus('');
    try {
      await kavitaAPI.analyzeFiles();
      setAnalyzeOk(true);
      setAnalyzeStatus('Analysis queued — Kavita will flag any issues it finds.');
    } catch (e: any) {
      setAnalyzeOk(false);
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        setAnalyzeStatus('Requires admin privileges on your Kavita account.');
      } else {
        setAnalyzeStatus(`Failed: ${status ?? e?.message ?? 'unknown error'}`);
      }
    } finally {
      setAnalyzeLoading(false);
    }
  }

  const displayUrl = serverUrl.replace(/^https?:\/\//, '');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Server section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server</Text>
        <View style={styles.card}>
          <SettingRow
            icon="server-outline"
            label="Connected to"
            value={displayUrl}
          />
        </View>
      </View>

      {/* File Health */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>File Health</Text>
        <Text style={styles.sectionNote}>
          Scanning re-reads all files and rebuilds metadata. Analysis checks for corrupted or
          unreadable content. Both run as background tasks on your Kavita server.
        </Text>
        <View style={styles.card}>
          <SettingRow
            icon="refresh-outline"
            label="Scan All Libraries"
            onPress={handleScanAll}
            loading={scanLoading}
            statusText={scanStatus}
            statusOk={scanOk}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="bug-outline"
            label="Analyze Files"
            onPress={handleAnalyze}
            loading={analyzeLoading}
            statusText={analyzeStatus}
            statusOk={analyzeOk}
          />
        </View>
      </View>

      {/* About section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <SettingRow
            icon="information-circle-outline"
            label="Kavita Reader"
            value="v1.0.0"
          />
          <View style={styles.divider} />
          <SettingRow
            icon="globe-outline"
            label="Kavita Project"
            value="kavitareader.com"
          />
        </View>
      </View>

      {/* Account section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <SettingRow
            icon="log-out-outline"
            label="Disconnect Server"
            onPress={handleLogout}
            destructive
          />
        </View>
      </View>

      <Text style={styles.footer}>
        Kavita Reader is an unofficial client for self-hosted Kavita servers.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 60,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    fontFamily: Typography.serif,
  },
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  sectionNote: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    lineHeight: 17,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
    minHeight: 56,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rowIconDestructive: {
    backgroundColor: 'rgba(224,92,92,0.12)',
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  rowLabelDestructive: {
    color: Colors.error,
  },
  rowValue: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    maxWidth: 160,
    textAlign: 'right',
  },
  statusText: {
    fontSize: Typography.xs,
    lineHeight: 16,
  },
  statusOk: {
    color: Colors.success,
  },
  statusError: {
    color: Colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.base + 34 + Spacing.md,
  },
  footer: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    lineHeight: 18,
  },
});

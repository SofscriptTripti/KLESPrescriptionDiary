import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, LoadingOverlay, EmptyState, Card, Button } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getMicroResult, getTestComponents } from '../../api/services/tests';
import { getMode } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';
import type { TestComponentModel } from '../../types/models';

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function TestDetailsScreen({ navigation, route }: RootScreenProps<'TestDetails'>) {
  const { patient, labNo, testName } = route.params;
  const [components, setComponents] = useState<TestComponentModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMicro, setLoadingMicro] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mode = await getMode();
      const list = await getTestComponents(patient, mode, { labNo });
      const sorted = [...list].sort(
        (a, b) => new Date(b.CREATEDT).getTime() - new Date(a.CREATEDT).getTime(),
      );
      setComponents(sorted);
    } catch {
      Alert.alert('Error', 'Failed to load test components');
    } finally {
      setLoading(false);
    }
  }, [patient, labNo]);

  useEffect(() => {
    load();
  }, [load]);

  const isEmpty = useMemo(() => components.length === 0, [components]);
  const sampleNo = useMemo(
    () => components.find(c => c.SAMPLENO)?.SAMPLENO,
    [components],
  );

  async function viewMicroResult() {
    if (!sampleNo) return;
    setLoadingMicro(true);
    try {
      const result = await getMicroResult(sampleNo);
      if (!result || (result.objArrResult ?? []).length === 0) {
        Alert.alert('Microbiology Result', 'No result found.');
        return;
      }
      const lines = result.objArrResult.map(r => `${r.COMPCD ?? ''}: ${r.TESTVALUE ?? ''}`.trim());
      const message = [result.RptNote, ...lines].filter(Boolean).join('\n');
      Alert.alert('Microbiology Result', message || 'No result found.');
    } catch {
      Alert.alert('Error', 'Failed to load microbiology result');
    } finally {
      setLoadingMicro(false);
    }
  }

  return (
    <Screen>
      <AppHeader
        title={testName}
        subtitle={`Lab No: ${labNo}`}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity style={styles.headerBtn} onPress={load} hitSlop={8}>
            <Icon name="refresh" size={22} color={colors.textOnPrimary} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={components}
        keyExtractor={(item, index) => `${item.LABNO}-${item.COMPCD}-${index}`}
        contentContainerStyle={[styles.list, isEmpty && styles.emptyContainer]}
        ListHeaderComponent={
          sampleNo ? (
            <Button
              label={loadingMicro ? 'Loading…' : 'View Microbiology Result'}
              variant="outline"
              onPress={viewMicroResult}
              disabled={loadingMicro}
              style={styles.microBtn}
            />
          ) : undefined
        }
        ListEmptyComponent={
          !loading ? <EmptyState icon="clipboard-text-off-outline" title="No components found" /> : undefined
        }
        renderItem={({ item }) => {
          const isAuth = ['y', 'true', '1'].includes((item.ISAUTH ?? '').toLowerCase());
          return (
          <Card style={styles.card}>
            <View style={styles.rowTop}>
              <Text style={styles.name} numberOfLines={2}>
                {item.COMPNAME}
              </Text>
              {item.ISAUTH ? (
                <View style={[styles.authBadge, { backgroundColor: isAuth ? colors.successLight : colors.warningLight }]}>
                  <Text style={[styles.authLabel, { color: isAuth ? colors.success : colors.warning }]}>
                    {isAuth ? 'Authorised' : 'Unauthorised'}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.grid}>
              <GridItem label="Value" value={item.VALUE || '—'} />
              <GridItem label="Unit" value={item.UNIT || '—'} />
              <GridItem label="Normal Range" value={`${item.NRMLVALL ?? '—'} - ${item.NRMLVALH ?? '—'}`} />
            </View>
            <Text style={styles.date}>{formatDate(item.CREATEDT)}</Text>
          </Card>
          );
        }}
      />
      <LoadingOverlay visible={loading} label="Loading test details…" />
    </Screen>
  );
}

function GridItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.gridItem}>
      <Text style={styles.gridLabel}>{label}</Text>
      <Text style={styles.gridValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: { padding: spacing.xs },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  microBtn: { marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  name: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  authBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.successLight,
  },
  authLabel: { ...typography.captionStrong, fontSize: 11, color: colors.success },
  grid: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.md },
  gridItem: { flex: 1 },
  gridLabel: { ...typography.label, color: colors.textMuted },
  gridValue: { ...typography.bodyStrong, color: colors.textPrimary, marginTop: 2 },
  date: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
});

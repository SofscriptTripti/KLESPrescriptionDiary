import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, LoadingOverlay, EmptyState, Card } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getTestList } from '../../api/services/tests';
import { getMode } from '../../storage/session';
import { useLandscapeOnFocus } from '../../utils/orientation';
import type { RootScreenProps } from '../../navigation/types';
import type { TestsModel, TestStatus } from '../../types/models';

interface StatusMeta {
  label: string;
  color: string;
  bg: string;
}

// TESTSTATUS -> badge look, per TestsModel.cs's bgColor getter (1 pending / 2
// collected / 3 rejected / 4 reported / 5 authorised / 6 other / 10 result
// received), mapped onto this app's semantic theme colors.
const STATUS_META: Record<number, StatusMeta> = {
  1: { label: 'Pending', color: colors.warning, bg: colors.warningLight },
  2: { label: 'Collected', color: colors.info, bg: colors.infoLight },
  3: { label: 'Rejected', color: colors.danger, bg: colors.dangerLight },
  4: { label: 'Reported', color: colors.success, bg: colors.successLight },
  5: { label: 'Authorised', color: colors.success, bg: colors.successLight },
  6: { label: 'Other', color: colors.textMuted, bg: colors.surfaceAlt },
  10: { label: 'Result Received', color: colors.success, bg: colors.successLight },
};

function statusMeta(status: TestStatus): StatusMeta {
  return STATUS_META[status] ?? STATUS_META[6];
}

/** Mirrors DiagnosticTestFragment/RadiologyTestFragment's FetchReportThread(): a
 * report-flagged test ("TestFlg" == "r") opens the resolved report file instead
 * of the component-detail screen. */
function isReportTest(item: TestsModel): boolean {
  return (item.TestFlg ?? '').toLowerCase().trim() === 'r' && !!item.RadiologyRptPath;
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

export function TestListScreen({ navigation, route }: RootScreenProps<'TestList'>) {
  const { patient } = route.params;
  const [tests, setTests] = useState<TestsModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  useLandscapeOnFocus();

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const mode = await getMode();
      const list = await getTestList(patient, mode);
      const sorted = [...list].sort(
        (a, b) => new Date(b.TESTORDDATE).getTime() - new Date(a.TESTORDDATE).getTime(),
      );
      setTests(sorted);
    } catch {
      Alert.alert('Error', 'Failed to load tests');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [patient]);

  useEffect(() => {
    load();
  }, [load]);

  const isEmpty = useMemo(() => tests.length === 0, [tests]);

  return (
    <Screen>
      <AppHeader
        title="Tests"
        subtitle={patient.PATIENT_NAME}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity style={styles.headerBtn} onPress={() => load()} hitSlop={8}>
            <Icon name="refresh" size={22} color={colors.textOnPrimary} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={tests}
        keyExtractor={(item, index) => `${item.LABNO}-${item.TESTCD}-${item.CHRGCD}-${index}`}
        contentContainerStyle={[styles.list, isEmpty && styles.emptyContainer]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="test-tube-empty"
              title="No tests found"
              subtitle="Pull down to refresh or request a new test."
            />
          ) : undefined
        }
        renderItem={({ item }) => {
          const meta = statusMeta(item.TESTSTATUS);
          // Mirrors TestListScreen.xaml.cs's Handle_ItemTapped gating: rejected
          // (3) and pending (1) rows never open a details screen, and a
          // LABRPTTYP of "L"/"M" routes to the microbiology result screen
          // instead of the usual component/value grid.
          function handlePress() {
            if (item.TESTSTATUS === 3) {
              Alert.alert('Tests', 'No Data Found');
              return;
            }
            if (isReportTest(item)) {
              if (item.TESTSTATUS === 1) {
                Alert.alert('Tests', 'No Data Found');
                return;
              }
              navigation.navigate('ReportViewer', {
                title: item.TESTNAME,
                reportPaths: item.RadiologyRptPath!.split(','),
              });
              return;
            }
            if (item.LABRPTTYP === 'L' || item.LABRPTTYP === 'M') {
              navigation.navigate('TestMicroResults', { test: item });
              return;
            }
            if (item.TESTSTATUS === 1) {
              Alert.alert('Tests', 'No Data Found');
              return;
            }
            navigation.navigate('TestDetails', { patient, test: item });
          }
          return (
            <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.icon}>
                    <Icon name="test-tube" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={2}>
                      {item.TESTNAME}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      Lab No: {item.LABNO} · {formatDate(item.TESTORDDATE)}
                    </Text>
                  </View>
                  {/* "Authorised" (status 5) badge removed per instruction — every
                      other status still shows its badge normally. */}
                  {item.TESTSTATUS !== 5 ? (
                    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.badgeLabel, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      {/* Floating action button — matches NewTestRequestPage's destination,
          moved here from the header per instruction. */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('NewTestRequest', { patient })}>
        <Icon name="plus" size={28} color={colors.textOnPrimary} />
      </TouchableOpacity>

      <LoadingOverlay visible={loading} label="Loading tests…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBtn: { padding: spacing.xs },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: { flex: 1, marginRight: spacing.sm },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  badgeLabel: { ...typography.captionStrong, fontSize: 11 },
});

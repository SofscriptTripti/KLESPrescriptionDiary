import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Screen, AppHeader, LoadingOverlay, EmptyState } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { getMicroResult } from '../../api/services/tests';
import { useLandscapeOnFocus } from '../../utils/orientation';
import type { RootScreenProps } from '../../navigation/types';
import type { MicroResultDataModel } from '../../types/models';

/**
 * Mirrors TestMicroResultsPage.xaml/.xaml.cs — reached (instead of
 * TestDetailsScreen) when a tapped test's LABRPTTYP is "L" (Lab) or "M"
 * (Microbiology): those rows carry microbiology antibiotic-sensitivity data
 * via GetPtnMicroResultTest, not the usual component/value grid.
 */
export function TestMicroResultsScreen({ navigation, route }: RootScreenProps<'TestMicroResults'>) {
  const { test } = route.params;
  const [rows, setRows] = useState<MicroResultDataModel[]>([]);
  const [reportNote, setReportNote] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  useLandscapeOnFocus();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMicroResult(test.SAMPLENO ?? '');
      setRows(result?.objArrResult ?? []);
      setReportNote(result?.RptNote);
    } catch {
      Alert.alert('Error', 'No results found');
    } finally {
      setLoading(false);
    }
  }, [test.SAMPLENO]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <AppHeader title={test.TESTNAME} subtitle={`Lab No: ${test.LABNO}`} onBack={() => navigation.goBack()} />

      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.colRptSts]}>Rpt Sts</Text>
        <Text style={[styles.headerCell, styles.colAntiBio]}>Antibiotics</Text>
        <Text style={[styles.headerCell, styles.colCompCd]}>Comp Cd</Text>
        <Text style={[styles.headerCell, styles.colTestValue]}>Test Value</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item, index) => `${item.SAMPLENO}-${item.COMPCD}-${index}`}
        contentContainerStyle={[styles.list, rows.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={
          !loading ? <EmptyState icon="flask-off-outline" title="No results found" /> : undefined
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.cell, styles.colRptSts]} numberOfLines={2}>
              {item.RPTSTS || '—'}
            </Text>
            <Text style={[styles.cell, styles.colAntiBio]} numberOfLines={2}>
              {item.ANTIBIOTICS || '—'}
            </Text>
            <Text style={[styles.cell, styles.colCompCd]} numberOfLines={2}>
              {item.COMPCD || '—'}
            </Text>
            <Text style={[styles.cell, styles.colTestValue]} numberOfLines={2}>
              {item.TESTVALUE || '—'}
            </Text>
          </View>
        )}
      />

      {reportNote ? (
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>{reportNote}</Text>
        </View>
      ) : null}

      <LoadingOverlay visible={loading} label="Loading..." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerCell: { ...typography.captionStrong, color: colors.textOnPrimary },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cell: { ...typography.caption, color: colors.textPrimary },
  colRptSts: { flex: 1 },
  colAntiBio: { flex: 1 },
  colCompCd: { flex: 1 },
  colTestValue: { flex: 3 },
  list: { paddingBottom: spacing.xl },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  footer: { backgroundColor: colors.primary, padding: spacing.md },
  footerLabel: { ...typography.body, color: colors.textOnPrimary },
});

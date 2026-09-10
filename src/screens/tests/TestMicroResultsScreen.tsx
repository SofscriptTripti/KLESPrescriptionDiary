import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen, AppHeader, LoadingOverlay, EmptyState } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { getMicroResult } from '../../api/services/tests';
import { useLandscapeOnFocus } from '../../utils/orientation';
import type { RootScreenProps } from '../../navigation/types';
import type { MicroResultDataModel } from '../../types/models';

const COL_RPTSTS_WIDTH = 90;
const COL_ANTIBIO_WIDTH = 160;
const COL_COMPCD_WIDTH = 100;
const COL_TESTVALUE_WIDTH = 220;
const ROW_MIN_HEIGHT = 44;

/**
 * Mirrors TestMicroResultsPage.xaml/.xaml.cs — reached (instead of
 * TestDetailsScreen) when a tapped test's LABRPTTYP is "L" (Lab) or "M"
 * (Microbiology): those rows carry microbiology antibiotic-sensitivity data
 * via GetPtnMicroResultTest, not the usual component/value grid.
 *
 * Table styled to match TestDetailsScreen's bordered, horizontally
 * scrollable grid so long antibiotic/value text isn't clipped.
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

  const isEmpty = rows.length === 0;

  return (
    <Screen>
      <AppHeader title={test.TESTNAME} subtitle={`Lab No: ${test.LABNO}`} onBack={() => navigation.goBack()} />

      {isEmpty ? (
        !loading ? <EmptyState icon="flask-off-outline" title="No results found" /> : null
      ) : (
        <ScrollView contentContainerStyle={styles.vScroll}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={styles.row}>
                <View style={[styles.cell, styles.cellHeader, { width: COL_RPTSTS_WIDTH, minHeight: ROW_MIN_HEIGHT }]}>
                  <Text style={styles.cellHeaderText} numberOfLines={2}>
                    Rpt Sts
                  </Text>
                </View>
                <View
                  style={[styles.cell, styles.cellHeader, { width: COL_ANTIBIO_WIDTH, minHeight: ROW_MIN_HEIGHT }]}>
                  <Text style={styles.cellHeaderText} numberOfLines={2}>
                    Antibiotics
                  </Text>
                </View>
                <View style={[styles.cell, styles.cellHeader, { width: COL_COMPCD_WIDTH, minHeight: ROW_MIN_HEIGHT }]}>
                  <Text style={styles.cellHeaderText} numberOfLines={2}>
                    Comp Cd
                  </Text>
                </View>
                <View
                  style={[
                    styles.cell,
                    styles.cellHeader,
                    { width: COL_TESTVALUE_WIDTH, minHeight: ROW_MIN_HEIGHT },
                  ]}>
                  <Text style={styles.cellHeaderText} numberOfLines={2}>
                    Test Value
                  </Text>
                </View>
              </View>

              {rows.map((item, index) => (
                <View key={`${item.SAMPLENO}-${item.COMPCD}-${index}`} style={styles.row}>
                  <View style={[styles.cell, styles.cellBody, { width: COL_RPTSTS_WIDTH, minHeight: ROW_MIN_HEIGHT }]}>
                    <Text style={styles.cellBodyText} numberOfLines={2}>
                      {item.RPTSTS || '—'}
                    </Text>
                  </View>
                  <View
                    style={[styles.cell, styles.cellBody, { width: COL_ANTIBIO_WIDTH, minHeight: ROW_MIN_HEIGHT }]}>
                    <Text style={styles.cellBodyText} numberOfLines={2}>
                      {item.ANTIBIOTICS || '—'}
                    </Text>
                  </View>
                  <View
                    style={[styles.cell, styles.cellBody, { width: COL_COMPCD_WIDTH, minHeight: ROW_MIN_HEIGHT }]}>
                    <Text style={styles.cellBodyText} numberOfLines={2}>
                      {item.COMPCD || '—'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.cell,
                      styles.cellBody,
                      { width: COL_TESTVALUE_WIDTH, minHeight: ROW_MIN_HEIGHT },
                    ]}>
                    <Text style={styles.cellBodyText} numberOfLines={2}>
                      {item.TESTVALUE || '—'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}

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
  vScroll: { paddingBottom: spacing.xl },
  row: { flexDirection: 'row' },
  cell: {
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  cellHeader: { backgroundColor: colors.primary },
  cellBody: { backgroundColor: colors.surface },
  cellHeaderText: { ...typography.captionStrong, color: colors.textOnPrimary, textAlign: 'center' },
  cellBodyText: { ...typography.caption, color: colors.textPrimary, textAlign: 'center' },
  footer: { backgroundColor: colors.primary, padding: spacing.md },
  footerLabel: { ...typography.body, color: colors.textOnPrimary },
});

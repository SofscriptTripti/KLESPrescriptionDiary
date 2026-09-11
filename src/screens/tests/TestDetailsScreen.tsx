import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, LoadingOverlay, EmptyState } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { getTestComponents } from '../../api/services/tests';
import { getMode } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';
import type { TestComponentModel } from '../../types/models';

const NAME_COL_WIDTH = 140;
const DATA_COL_WIDTH = 100;
const ROW_MIN_HEIGHT = 48;

function formatShortDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)}`;
}

interface PivotColumn {
  ordNo: string;
  header: string;
}
interface PivotRow {
  compCd: string;
  compName: string;
}

/**
 * Pivots the flat component list into horizontal Component rows x Order/Date columns:
 * Component Name is pinned on the left, while Date columns, Ref Range, and Unit
 * scroll horizontally to the right.
 */
function buildPivot(components: TestComponentModel[]) {
  const rows: PivotRow[] = [];
  const seenComp = new Set<string>();
  const columns: PivotColumn[] = [];
  const seenOrd = new Set<string>();

  for (const c of components) {
    if (!seenComp.has(c.COMPCD)) {
      seenComp.add(c.COMPCD);
      rows.push({ compCd: c.COMPCD, compName: c.COMPNAME });
    }
    const ordNo = c.ORDNO ?? '';
    if (!seenOrd.has(ordNo)) {
      seenOrd.add(ordNo);
      columns.push({ ordNo, header: formatShortDate(c.CREATEDT) });
    }
  }

  function cellFor(compCd: string, ordNo: string): TestComponentModel | undefined {
    let found: TestComponentModel | undefined;
    for (const c of components) {
      if (c.COMPCD === compCd && c.ORDNO === ordNo) found = c;
    }
    return found;
  }

  function compInfo(compCd: string): TestComponentModel | undefined {
    let found: TestComponentModel | undefined;
    for (const c of components) {
      if (c.COMPCD === compCd) found = c;
    }
    return found;
  }

  return { rows, columns, cellFor, compInfo };
}

/** Mirrors TestComponentDbAdapter.TextColorByCompOrd: red when the value is at/beyond normal range. */
function isAbnormal(cell?: TestComponentModel): boolean {
  if (!cell) return false;
  const value = Number(cell.VALUE);
  const high = Number(cell.NRMLVALH);
  const low = Number(cell.NRMLVALL);
  if (Number.isNaN(value)) return false;
  if (!Number.isNaN(high) && value >= high) return true;
  if (!Number.isNaN(low) && value <= low) return true;
  return false;
}

/** Mirrors TestComponentDbAdapter.GetBackColorByCompOrd: amber cell background when ISAUTH !== 'Y'. */
function isUnauthorised(cell?: TestComponentModel): boolean {
  if (!cell || !cell.ISAUTH) return false;
  return cell.ISAUTH.toUpperCase() !== 'Y';
}

export function TestDetailsScreen({ navigation, route }: RootScreenProps<'TestDetails'>) {
  const { patient, test } = route.params;
  const [components, setComponents] = useState<TestComponentModel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mode = await getMode();
      const list = await getTestComponents(patient, mode, {
        labNo: test.LABNO,
        chrgCd: test.CHRGCD,
        testCd: test.TESTCD,
        cmpntCd: test.cmpntcd,
      });
      setComponents(list);
    } catch {
      Alert.alert('Error', 'Failed to load test components');
    } finally {
      setLoading(false);
    }
  }, [patient, test]);

  useEffect(() => {
    load();
  }, [load]);

  const pivot = useMemo(() => buildPivot(components), [components]);
  const isEmpty = components.length === 0;

  /** Mirrors TestDetailsPage.xaml.cs's ShowGraphPage(): builds the trend
   * points straight from the already-fetched component list, no extra API call. */
  function openGraph(row: PivotRow) {
    const info = pivot.compInfo(row.compCd);
    const points = components
      .filter(c => c.COMPCD === row.compCd)
      .map(c => ({ label: formatShortDate(c.CREATEDT), value: Number(c.VALUE) || 0 }));
    navigation.navigate('TestGraph', {
      patient,
      dept: info?.CHRGDESC ?? '',
      component: row.compName,
      min: Number(info?.NRMLVALL) || 0,
      max: Number(info?.NRMLVALH) || 0,
      points,
    });
  }

  return (
    <Screen>
      <AppHeader
        title={test.TESTNAME}
        subtitle={`Lab No: ${test.LABNO}`}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity style={styles.headerBtn} onPress={load} hitSlop={8}>
            <Icon name="refresh" size={22} color={colors.textOnPrimary} />
          </TouchableOpacity>
        }
      />

      {isEmpty ? (
        !loading ? <EmptyState icon="clipboard-text-off-outline" title="No components found" /> : null
      ) : (
        <ScrollView contentContainerStyle={styles.vScroll}>
          <View style={styles.tableWrapper}>
            {/* Fixed Left Column: Component Names */}
            <View style={styles.fixedColumn}>
              <View style={[styles.cell, styles.cellHeader, { width: NAME_COL_WIDTH, minHeight: ROW_MIN_HEIGHT }]}>
                <Text style={styles.cellHeaderText} numberOfLines={2}>
                  Components
                </Text>
              </View>
              {pivot.rows.map(row => (
                <TouchableOpacity
                  key={row.compCd}
                  activeOpacity={0.7}
                  onPress={() => openGraph(row)}
                  style={[styles.cell, styles.cellBody, { width: NAME_COL_WIDTH, minHeight: ROW_MIN_HEIGHT }]}>
                  <Text style={[styles.cellBodyTextBold, styles.cellBodyLink]} numberOfLines={2}>
                    {row.compName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Scrollable Right Columns: Dates, Ref. Range, Unit */}
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                {/* Header Row */}
                <View style={styles.row}>
                  {pivot.columns.map(col => (
                    <View
                      key={col.ordNo}
                      style={[styles.cell, styles.cellHeader, { width: DATA_COL_WIDTH, minHeight: ROW_MIN_HEIGHT }]}>
                      <Text style={styles.cellHeaderText} numberOfLines={2}>
                        {col.header}
                      </Text>
                    </View>
                  ))}
                  <View style={[styles.cell, styles.cellHeader, { width: DATA_COL_WIDTH, minHeight: ROW_MIN_HEIGHT }]}>
                    <Text style={styles.cellHeaderText} numberOfLines={2}>
                      Ref. Range
                    </Text>
                  </View>
                  <View style={[styles.cell, styles.cellHeader, { width: DATA_COL_WIDTH, minHeight: ROW_MIN_HEIGHT }]}>
                    <Text style={styles.cellHeaderText} numberOfLines={2}>
                      Unit
                    </Text>
                  </View>
                </View>

                {/* Component Rows */}
                {pivot.rows.map(row => {
                  const info = pivot.compInfo(row.compCd);
                  return (
                    <View key={row.compCd} style={styles.row}>
                      {pivot.columns.map(col => {
                        const cell = pivot.cellFor(row.compCd, col.ordNo);
                        return (
                          <View
                            key={col.ordNo}
                            style={[
                              styles.cell,
                              styles.cellBody,
                              { width: DATA_COL_WIDTH, minHeight: ROW_MIN_HEIGHT },
                              isUnauthorised(cell) ? styles.cellHighlight : null,
                            ]}>
                            <Text
                              style={[
                                styles.cellBodyText,
                                isAbnormal(cell) ? styles.cellDangerText : null,
                              ]}
                              numberOfLines={2}>
                              {cell?.VALUE || '—'}
                            </Text>
                          </View>
                        );
                      })}
                      <View
                        style={[styles.cell, styles.cellBody, { width: DATA_COL_WIDTH, minHeight: ROW_MIN_HEIGHT }]}>
                        <Text style={styles.cellBodyText} numberOfLines={2}>
                          {`${info?.NRMLVALL ?? '—'}-${info?.NRMLVALH ?? '—'}`}
                        </Text>
                      </View>
                      <View
                        style={[styles.cell, styles.cellBody, { width: DATA_COL_WIDTH, minHeight: ROW_MIN_HEIGHT }]}>
                        <Text style={styles.cellBodyText} numberOfLines={2}>
                          {info?.UNIT || '—'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}

      <LoadingOverlay visible={loading} label="Loading..." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBtn: { padding: spacing.xs },
  vScroll: { paddingBottom: spacing.xl },
  tableWrapper: { flexDirection: 'row', width: '100%', paddingHorizontal: spacing.sm },
  fixedColumn: {
    zIndex: 1,
    elevation: 2,
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
  },
  row: { flexDirection: 'row' },
  cell: {
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  cellHeader: { backgroundColor: colors.primary },
  cellBody: { backgroundColor: colors.surface },
  cellHighlight: { backgroundColor: colors.warningLight },
  cellHeaderText: { ...typography.captionStrong, color: colors.textOnPrimary, textAlign: 'center' },
  cellBodyText: { ...typography.caption, color: colors.textPrimary, textAlign: 'center' },
  cellBodyTextBold: { ...typography.captionStrong, color: colors.textPrimary, textAlign: 'center' },
  cellBodyLink: { color: colors.primary, textDecorationLine: 'underline' },
  cellDangerText: { color: colors.danger, fontWeight: '700' },
});

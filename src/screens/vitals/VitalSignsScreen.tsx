import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, LayoutChangeEvent, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { Screen, AppHeader, Button, Card, EmptyState, LoadingOverlay } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getObsTypList, getObservations, insertObservations } from '../../api/services/vitals';
import { getMode } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';
import type { ObsvGrpWeb, VitalSignsNewModel } from '../../types/models';

/** One vital-sign component row, grouped from the flat VitalSignsNewModel[] response
 * the way MAUI's NewVitalSignsAdapter groups by OBSNAME. */
interface VitalSignRow {
  name: string;
  OBSNAME: string;
  base: VitalSignsNewModel;
  points: { label: string; value: number }[];
}

/** Parses the ASP.NET MS-AJAX `/Date(169...)/ ` form as well as plain ISO strings. */
function parseObsDate(raw: string | undefined): Date {
  if (!raw) return new Date(0);
  const msMatch = /\/Date\((\d+)\)\//.exec(raw);
  if (msMatch) return new Date(Number(msMatch[1]));
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function formatShortDate(d: Date): string {
  if (d.getTime() === 0) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** OBSUNIT often comes back blank from the backend; fall back to the unit embedded
 * in OBSNAME, e.g. "TEMPERATURE (˚ F)" -> "˚ F". */
function resolveUnit(obsName: string): string {
  const match = /\(([^)]+)\)\s*$/.exec(obsName ?? '');
  return match ? match[1].trim() : '';
}

/** Ports NewVitalSignsAdapter.GetVitComponentsNames()/GetSignsListModels(): group the
 * flat readings list by OBSNAME (first-seen order), pick the most recent entry with a
 * value as the display "base", and keep every dated value (oldest→newest) for the chart —
 * matches CreateGrid()'s ChartEntry loop over obs.OBSDATE/obs.OBSVALUE. */
function buildRows(observations: VitalSignsNewModel[]): VitalSignRow[] {
  const order: string[] = [];
  const groups = new Map<string, VitalSignsNewModel[]>();

  for (const obs of observations) {
    if (!groups.has(obs.OBSNAME)) {
      order.push(obs.OBSNAME);
      groups.set(obs.OBSNAME, []);
    }
    groups.get(obs.OBSNAME)!.push(obs);
  }

  return order.map(name => {
    const items = groups.get(name) ?? [];
    const withValue = items
      .filter(i => !!i.OBSVALUE && i.OBSVALUE.trim() !== '')
      .slice()
      .sort((a, b) => parseObsDate(b.OBSTIME2 || b.OBSDATE).getTime() - parseObsDate(a.OBSTIME2 || a.OBSDATE).getTime());

    const base = withValue[0] ?? items[0];
    const points = withValue
      .slice()
      .reverse()
      .map(i => ({
        label: formatShortDate(parseObsDate(i.OBSTIME2 || i.OBSDATE)),
        value: Number(i.OBSVALUE),
      }))
      .filter(p => !Number.isNaN(p.value));

    return { name, OBSNAME: name, base, points };
  });
}

export function VitalSignsScreen({ navigation, route }: RootScreenProps<'VitalSigns'>) {
  const { patient } = route.params;

  const [mode, setMode] = useState<'ip' | 'op'>('ip');
  const [obsTypes, setObsTypes] = useState<ObsvGrpWeb[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [rows, setRows] = useState<VitalSignRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadObservations = useCallback(
    async (obsType: ObsvGrpWeb, activeMode: 'ip' | 'op') => {
      setLoading(true);
      try {
        const observations = await getObservations(patient, activeMode, obsType);
        setRows(buildRows(observations));
        setValues({});
      } catch {
        Alert.alert('Error', 'Failed to load vital sign readings');
      } finally {
        setLoading(false);
      }
    },
    [patient],
  );

  const init = useCallback(async () => {
    setLoading(true);
    try {
      const m = (await getMode()) === 'op' ? 'op' : 'ip';
      setMode(m);
      const types = await getObsTypList(patient, m);
      setObsTypes(types);
      if (types.length > 0) {
        await loadObservations(types[0], m);
      } else {
        setRows([]);
      }
    } catch {
      Alert.alert('Error', 'Failed to load vital sign types');
    } finally {
      setLoading(false);
    }
  }, [patient, loadObservations]);

  useEffect(() => {
    init();
  }, [init]);

  const selectObsType = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      setTypePickerOpen(false);
      const obsType = obsTypes[index];
      if (obsType) loadObservations(obsType, mode);
    },
    [obsTypes, mode, loadObservations],
  );

  function setValue(name: string, text: string) {
    setValues(prev => ({ ...prev, [name]: text }));
  }

  /** Ports ValidateData(): every non-empty entry must be within [OBSMIN, OBSMAX];
   * at least one value must be entered. */
  function validate(): VitalSignsNewModel[] | null {
    const readings: VitalSignsNewModel[] = [];

    for (const row of rows) {
      const text = values[row.name]?.trim();
      if (!text) continue;

      const numeric = Number(text);
      if (Number.isNaN(numeric)) {
        Alert.alert('Vital Signs', `Enter valid value for ${row.name}`);
        return null;
      }
      if (numeric < row.base.OBSMIN || numeric > row.base.OBSMAX) {
        Alert.alert('Vital Signs', `Enter valid value for ${row.name}`);
        return null;
      }

      readings.push({ ...row.base, OBSVALUE: text });
    }

    if (readings.length === 0) {
      Alert.alert('Vital Signs', 'Please enter atleast one value');
      return null;
    }

    return readings;
  }

  async function handleSave() {
    const readings = validate();
    if (!readings) return;

    setSaving(true);
    try {
      const ok = await insertObservations(patient, mode, readings);
      if (ok) {
        Alert.alert('Vital Signs', 'Saved successfully');
        const obsType = obsTypes[selectedIndex];
        if (obsType) await loadObservations(obsType, mode);
      } else {
        Alert.alert('Vital Signs', 'Some Error Occurred. Try Again');
      }
    } catch {
      Alert.alert('Vital Signs', 'Some Error Occurred. Try Again');
    } finally {
      setSaving(false);
    }
  }

  const currentTypeLabel = obsTypes[selectedIndex]?.LvlOneDesc ?? '';

  return (
    <Screen>
      <AppHeader title="Vital Signs" subtitle={patient.PATIENT_NAME} onBack={() => navigation.goBack()} />

      {/* Matches NewVitalSignsPage.xaml's top row: "Observation Type :" + a
          tappable box showing the current selection (opens a picker of the
          backend-fetched obsTypeList) + a Save button right beside it. */}
      <View style={styles.typeRow}>
        <Text style={styles.typeLabel}>Observation Type:</Text>
        <TouchableOpacity
          style={styles.typeBox}
          onPress={() => obsTypes.length > 0 && setTypePickerOpen(true)}
          disabled={obsTypes.length === 0}>
          <Text style={styles.typeBoxText} numberOfLines={1}>
            {currentTypeLabel || '—'}
          </Text>
          <Icon name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <Button label="Save" onPress={handleSave} loading={saving} disabled={rows.length === 0} />
      </View>

      {/* Matches the Teal "Observation" / "Data Representation" column header —
          hidden when there's nothing to show a header for. */}
      {rows.length > 0 ? (
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderLabel, styles.colObs]}>Observation</Text>
          <Text style={[styles.tableHeaderLabel, styles.colData]}>Data Representation</Text>
        </View>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={item => item.name}
        contentContainerStyle={[styles.list, rows.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="heart-pulse"
              title="No Observation or Data Available"
              subtitle={
                obsTypes.length > 0
                  ? 'Try selecting a different observation type.'
                  : 'No observation types are configured for this patient.'
              }
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.rowGrid}>
              <View style={styles.colObs}>
                <Text style={styles.name}>{item.name}</Text>
                <TextInput
                  placeholder="Enter value"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={values[item.name] ?? ''}
                  onChangeText={text => setValue(item.name, text)}
                  style={styles.entry}
                />
                <Text style={styles.fieldLine}>Min : {item.base.OBSMIN}</Text>
                <Text style={styles.fieldLine}>Max : {item.base.OBSMAX}</Text>
                <Text style={styles.fieldLine}>Unit : {resolveUnit(item.OBSNAME)}</Text>
                <Text style={styles.fieldLine}>Normal H : {item.base.OBSNRMLMAX}</Text>
                <Text style={styles.fieldLine}>Normal L : {item.base.OBSNRMLMIN}</Text>
              </View>
              <View style={styles.colData}>
                <InlineTrendChart points={item.points} min={item.base.OBSMIN} max={item.base.OBSMAX} />
              </View>
            </View>
          </Card>
        )}
      />

      <Modal
        visible={typePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTypePickerOpen(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setTypePickerOpen(false)}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Observation Type</Text>
              <TouchableOpacity onPress={() => setTypePickerOpen(false)} hitSlop={8}>
                <Icon name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={obsTypes}
              keyExtractor={t => String(t.LvlOneId)}
              renderItem={({ item, index }) => (
                <TouchableOpacity style={styles.modalOption} onPress={() => selectObsType(index)}>
                  <Text style={styles.modalOptionLabel}>{item.LvlOneDesc}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <LoadingOverlay visible={loading} label="Loading vitals…" />
    </Screen>
  );
}

interface InlineTrendChartProps {
  points: { label: string; value: number }[];
  min: number;
  max: number;
}

const CHART_HEIGHT = 130;
const CHART_PAD = 8;

/** Compact per-row trend chart — ports CreateGrid()'s Microcharts LineChart (built
 * from obs.OBSDATE/obs.OBSVALUE against OBSMIN/OBSMAX bounds); shows "No data found"
 * when there's nothing to plot, matching the original's fallback Label exactly. */
function InlineTrendChart({ points, min, max }: InlineTrendChartProps) {
  const [width, setWidth] = useState(0);

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  const layout = useMemo(() => {
    if (points.length === 0 || width === 0) return null;
    const values = points.map(p => p.value);
    const domainMin = Math.min(min, ...values);
    const domainMax = Math.max(max, ...values);
    const span = domainMax - domainMin || 1;
    const innerW = width - CHART_PAD * 2;
    const innerH = CHART_HEIGHT - CHART_PAD * 2;
    const x = (i: number) => CHART_PAD + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
    const y = (v: number) => CHART_PAD + (1 - (v - domainMin) / span) * innerH;
    const plotted = points.map((p, i) => ({ x: x(i), y: y(p.value) }));
    return { plotted, polyline: plotted.map(p => `${p.x},${p.y}`).join(' ') };
  }, [points, width, min, max]);

  if (points.length === 0) {
    return (
      <View style={[styles.chartBox, styles.chartEmpty]}>
        <Text style={styles.chartEmptyText}>No data found</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartBox} onLayout={onLayout}>
      {layout ? (
        <Svg width={width} height={CHART_HEIGHT}>
          <Polyline
            points={layout.polyline}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {layout.plotted.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={colors.primary} />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  typeLabel: { ...typography.captionStrong, color: colors.primary },
  typeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  typeBoxText: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  tableHeaderLabel: { ...typography.captionStrong, color: colors.textOnPrimary, textAlign: 'center' },
  colObs: { flex: 4 },
  colData: { flex: 6, paddingLeft: spacing.sm },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.md },
  rowGrid: { flexDirection: 'row' },
  name: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xs },
  entry: {
    ...typography.caption,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.xs,
  },
  fieldLine: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  chartBox: {
    height: CHART_HEIGHT,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  chartEmpty: { alignItems: 'center', justifyContent: 'center' },
  chartEmptyText: { ...typography.caption, color: colors.textMuted },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: '70%',
    paddingVertical: spacing.sm,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  modalOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionLabel: { ...typography.body, color: colors.textPrimary },
});

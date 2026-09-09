import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Button, Card, EmptyState, LoadingOverlay, TextField } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getObsTypList, getObservations, insertObservations } from '../../api/services/vitals';
import { getMode } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';
import type { ObsvGrpWeb, VitalSignsNewModel } from '../../types/models';

/** One vital-sign component row, grouped from the flat VitalSignsNewModel[] response
 * the way MAUI's NewVitalSignsAdapter groups by OBSNAME. */
interface VitalSignRow {
  name: string;
  base: VitalSignsNewModel;
  recent: { value: string; date: string }[];
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

/** Ports NewVitalSignsAdapter.GetVitComponentsNames()/GetSignsListModels(): group the
 * flat readings list by OBSNAME (first-seen order), pick the most recent entry with a
 * value as the display "base", and surface up to 3 recent values for the caption. */
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
    const recent = withValue.slice(0, 3).map(i => ({
      value: i.OBSVALUE,
      date: formatShortDate(parseObsDate(i.OBSTIME2 || i.OBSDATE)),
    }));
    // Chronological (oldest→newest) points for the trend graph — unlike `recent`
    // above (newest-first, capped at 3 for the caption), this keeps every reading.
    const points = withValue
      .slice()
      .reverse()
      .map(i => ({
        label: formatShortDate(parseObsDate(i.OBSTIME2 || i.OBSDATE)),
        value: Number(i.OBSVALUE),
      }))
      .filter(p => !Number.isNaN(p.value));

    return { name, base, recent, points };
  });
}

export function VitalSignsScreen({ navigation, route }: RootScreenProps<'VitalSigns'>) {
  const { patient } = route.params;

  const [mode, setMode] = useState<'ip' | 'op'>('ip');
  const [obsTypes, setObsTypes] = useState<ObsvGrpWeb[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  return (
    <Screen>
      <AppHeader title="Vital Signs" subtitle={patient.PATIENT_NAME} onBack={() => navigation.goBack()} />

      {obsTypes.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}>
          {obsTypes.map((obsType, index) => {
            const active = index === selectedIndex;
            return (
              <TouchableOpacity
                key={obsType.LvlOneId}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => selectObsType(index)}>
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]} numberOfLines={1}>
                  {obsType.LvlOneDesc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={item => item.name}
        contentContainerStyle={[styles.list, rows.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={
          !loading ? <EmptyState icon="heart-pulse" title="No Records Found" /> : undefined
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="heart-pulse" size={20} color={colors.primary} />
              <Text style={styles.name}>{item.name}</Text>
              {item.points.length > 0 ? (
                <TouchableOpacity
                  hitSlop={8}
                  style={styles.trendBtn}
                  onPress={() =>
                    navigation.navigate('VitalsGraph', {
                      patient,
                      obsName: item.name,
                      unit: item.base.OBSUNIT,
                      min: item.base.OBSNRMLMIN,
                      max: item.base.OBSNRMLMAX,
                      points: item.points,
                    })
                  }>
                  <Icon name="chart-line" size={20} color={colors.accent} />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.range}>
              Normal: {item.base.OBSNRMLMIN}–{item.base.OBSNRMLMAX} {item.base.OBSUNIT}
              {'  '}·{'  '}Range: {item.base.OBSMIN}–{item.base.OBSMAX}
            </Text>

            <TextField
              placeholder={`Enter value (${item.base.OBSUNIT})`}
              keyboardType="numeric"
              value={values[item.name] ?? ''}
              onChangeText={text => setValue(item.name, text)}
              style={styles.input}
            />

            {item.recent.length > 0 ? (
              <Text style={styles.recent}>
                Last: {item.recent.map(r => `${r.value}${r.date ? ` (${r.date})` : ''}`).join(', ')}
              </Text>
            ) : (
              <Text style={styles.recent}>No previous readings</Text>
            )}
          </Card>
        )}
      />

      <View style={styles.footer}>
        <Button label="Save" onPress={handleSave} fullWidth disabled={rows.length === 0} />
      </View>

      <LoadingOverlay visible={loading} label="Loading vitals…" />
      <LoadingOverlay visible={saving} label="Saving…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipsRow: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  chipsContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary },
  chipLabel: { ...typography.bodyStrong, color: colors.textSecondary },
  chipLabelActive: { color: colors.textOnPrimary },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  name: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  trendBtn: { padding: spacing.xs },
  range: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  input: { marginBottom: spacing.sm },
  recent: { ...typography.caption, color: colors.textMuted },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});

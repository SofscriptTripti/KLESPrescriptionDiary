import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen, AppHeader, Button, Card, EmptyState } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import type { RootScreenProps } from '../../navigation/types';
import type { ArrMedSch, MedicineModel } from '../../types/models';

/**
 * Simplified dose-status computation.
 *
 * The MAUI original (View/MedicineAssignment.xaml.cs) delegates the actual
 * cell-status logic to a `MedicineAdapter` helper that wasn't available in
 * the extracted source (only View/Model .cs files were pulled, not the
 * Viewmodel/adapter classes) — so this is a from-scratch equivalent built
 * directly from the ArrMedSch fields, not a byte-for-byte port:
 *
 *  - a cell is keyed by (date-part of STDDT, time-of-day-part of STDTM)
 *  - if a matching ArrMedSch row has a real ACTDTTM (not empty / not the C#
 *    default "0001-01-01" epoch), the dose was given: shown as the actual
 *    time, colored green if given at/before the scheduled moment, amber if
 *    late by up to an hour, red if later than that
 *  - if no matching row (or one with no ACTDTTM) and the scheduled moment is
 *    already in the past (vs Date.now()), the cell is a red "missed" mark
 *  - otherwise (scheduled moment still in the future) the cell is left blank/neutral
 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function isActiveOrder(item: MedicineModel): boolean {
  return String(item.ISORDCLOSED).toLowerCase() === 'false';
}

function toDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** C# default DateTime serializes as ~0001-01-01; treat any very-early year as "unset". */
function isUnset(value?: string): boolean {
  const d = toDate(value);
  return !d || d.getFullYear() <= 1901;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function timeKey(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function timeSortValue(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}
function formatDateLabel(key: string): string {
  const [y, m, day] = key.split('-').map(Number);
  return `${pad(day)}/${pad(m)}/${String(y).slice(2)}`;
}
function formatTimeLabel(key: string): string {
  return key;
}

interface ScheduleCell {
  label: string;
  kind: 'onTime' | 'late' | 'veryLate' | 'missed' | 'future' | 'empty';
}

function buildSchedule(schedules: ArrMedSch[] | undefined) {
  const rows = schedules ?? [];

  const dateSet = new Map<string, Date>();
  const timeSet = new Map<string, Date>();
  const byCell = new Map<string, ArrMedSch>();

  for (const row of rows) {
    const stddt = toDate(row.STDDT);
    const sttm = toDate(row.STDTM);
    if (!stddt || !sttm) continue;
    const dKey = dateKey(stddt);
    const tKey = timeKey(sttm);
    if (!dateSet.has(dKey)) dateSet.set(dKey, stddt);
    if (!timeSet.has(tKey)) timeSet.set(tKey, sttm);
    byCell.set(`${dKey}|${tKey}`, row);
  }

  const dates = [...dateSet.entries()].sort((a, b) => a[1].getTime() - b[1].getTime()).map(([k]) => k);
  const times = [...timeSet.entries()]
    .sort((a, b) => timeSortValue(a[1]) - timeSortValue(b[1]))
    .map(([k]) => k);

  const now = Date.now();

  function cellFor(dKey: string, tKey: string): ScheduleCell {
    const row = byCell.get(`${dKey}|${tKey}`);
    const [y, m, day] = dKey.split('-').map(Number);
    const [hh, mm] = tKey.split(':').map(Number);
    const scheduled = new Date(y, m - 1, day, hh, mm);

    if (row && !isUnset(row.ACTDTTM)) {
      const actual = toDate(row.ACTDTTM);
      if (actual) {
        const label = `${pad(actual.getHours())}:${pad(actual.getMinutes())}`;
        const diffMin = (actual.getTime() - scheduled.getTime()) / 60000;
        if (diffMin <= 0) return { label, kind: 'onTime' };
        if (diffMin <= 60) return { label, kind: 'late' };
        return { label, kind: 'veryLate' };
      }
    }

    if (scheduled.getTime() < now) {
      return { label: 'Missed', kind: 'missed' };
    }
    return { label: '-', kind: 'future' };
  }

  return { dates, times, cellFor, hasData: rows.length > 0 };
}

const CELL_STYLE_BY_KIND: Record<ScheduleCell['kind'], { bg: string; text: string }> = {
  onTime: { bg: colors.successLight, text: colors.success },
  late: { bg: colors.warningLight, text: colors.warning },
  veryLate: { bg: colors.dangerLight, text: colors.danger },
  missed: { bg: colors.dangerLight, text: colors.danger },
  future: { bg: colors.surfaceAlt, text: colors.textMuted },
  empty: { bg: colors.surfaceAlt, text: colors.textMuted },
};

function formatDate(value: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

const CELL_WIDTH = 68;
const ROW_HEIGHT = 40;

function ScheduleGrid({ medicine }: { medicine: MedicineModel }) {
  const { dates, times, cellFor, hasData } = useMemo(() => buildSchedule(medicine.ArrMedSch), [medicine]);

  if (!hasData || dates.length === 0 || times.length === 0) {
    return <Text style={styles.noSchedule}>No schedule data available</Text>;
  }

  return (
    <View style={styles.gridWrap}>
      <View style={styles.timeColumn}>
        <View style={[styles.timeCell, styles.headerCell]}>
          <Text style={styles.headerLabel}>Time</Text>
        </View>
        {times.map(t => (
          <View key={t} style={styles.timeCell}>
            <Text style={styles.timeLabel}>{formatTimeLabel(t)}</Text>
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.dateHeaderRow}>
            {dates.map(d => (
              <View key={d} style={[styles.dataCellBox, styles.headerCell]}>
                <Text style={styles.headerLabel}>{formatDateLabel(d)}</Text>
              </View>
            ))}
          </View>
          {times.map(t => (
            <View key={t} style={styles.dataRow}>
              {dates.map(d => {
                const cell = cellFor(d, t);
                const style = CELL_STYLE_BY_KIND[cell.kind];
                return (
                  <View key={d} style={[styles.dataCellBox, { backgroundColor: style.bg }]}>
                    <Text style={[styles.cellLabel, { color: style.text }]} numberOfLines={1}>
                      {cell.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function MedicineScheduleCard({ medicine }: { medicine: MedicineModel }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.itemDesc} numberOfLines={2}>
        {medicine.ORDITEMDESC}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {medicine.DOSAGEDESC || '-'} · {medicine.FREQDESC || '-'}
      </Text>
      <Text style={styles.metaMuted}>
        {formatDate(medicine.ORDSTARTDT)} – {formatDate(medicine.ORDENDDT)}
      </Text>

      <View style={styles.legend}>
        <LegendDot color={colors.success} label="On time" />
        <LegendDot color={colors.warning} label="Late" />
        <LegendDot color={colors.danger} label="Missed" />
      </View>

      <ScheduleGrid medicine={medicine} />
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

export function MedicineScheduleScreen({ navigation, route }: RootScreenProps<'MedicineSchedule'>) {
  const { patient, medicines } = route.params;
  const [group, setGroup] = useState<'active' | 'closed'>('active');

  const active = useMemo(() => medicines.filter(isActiveOrder), [medicines]);
  const closed = useMemo(() => medicines.filter(m => !isActiveOrder(m)), [medicines]);
  const list = group === 'active' ? active : closed;

  return (
    <Screen>
      <AppHeader title="Dosing Schedule" subtitle={patient.PATIENT_NAME} onBack={() => navigation.goBack()} />

      <View style={styles.toggleRow}>
        <Button
          label={`Active (${active.length})`}
          variant={group === 'active' ? 'primary' : 'outline'}
          onPress={() => setGroup('active')}
          style={styles.toggleBtn}
        />
        <Button
          label={`Closed (${closed.length})`}
          variant={group === 'closed' ? 'primary' : 'outline'}
          onPress={() => setGroup('closed')}
          style={styles.toggleBtn}
        />
      </View>

      <FlatList
        data={list}
        keyExtractor={(item, idx) => `${item.ORDNO}-${item.ORDSRNO}-${idx}`}
        contentContainerStyle={[styles.list, list.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={<EmptyState icon="calendar-clock-outline" title={`No ${group} medicines`} />}
        renderItem={({ item }) => <MedicineScheduleCard medicine={item} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm },
  list: { padding: spacing.lg, paddingTop: spacing.md },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.md },
  itemDesc: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  metaMuted: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  noSchedule: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md, fontStyle: 'italic' },

  legend: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: radius.pill },
  legendLabel: { ...typography.caption, color: colors.textMuted },

  gridWrap: { flexDirection: 'row', marginTop: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  timeColumn: { borderRightWidth: 1, borderRightColor: colors.border },
  timeCell: {
    width: 56,
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 4,
  },
  headerCell: { backgroundColor: colors.surfaceAlt },
  headerLabel: { ...typography.captionStrong, color: colors.textSecondary, textAlign: 'center' },
  timeLabel: { ...typography.caption, color: colors.textPrimary },
  dateHeaderRow: { flexDirection: 'row' },
  dataRow: { flexDirection: 'row' },
  dataCellBox: {
    width: CELL_WIDTH,
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  cellLabel: { ...typography.caption },
});

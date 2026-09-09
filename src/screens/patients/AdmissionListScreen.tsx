import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Card, LoadingOverlay, EmptyState } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getAdmissionHistory } from '../../api/services/opPatients';
import type { RootScreenProps } from '../../navigation/types';
import type { MedicalHistoryModel } from '../../types/models';

/**
 * Mirrors MedicalHistoryModel.bgColor in the MAUI source (AdmStsCd 1 -> amber
 * "FFD060"/Reserve, 2 -> light-green "F0F8DB"/Admitted, other -> light-red
 * "FFAFAF"/Discharged) — reproduced as a colored status pill using theme tokens.
 */
function statusInfo(admStsCd: number): { label: string; bg: string; fg: string } {
  if (admStsCd === 1) return { label: 'Reserved', bg: colors.warningLight, fg: colors.warning };
  if (admStsCd === 2) return { label: 'Admitted', bg: colors.successLight, fg: colors.success };
  return { label: 'Discharged', bg: colors.dangerLight, fg: colors.danger };
}

interface AdmissionRowProps {
  item: MedicalHistoryModel;
}

function AdmissionRow({ item }: AdmissionRowProps) {
  const status = statusInfo(item.AdmStsCd);
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Icon name="hospital-box-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.ipNo} numberOfLines={1}>
            IP No: {item.IPNo}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: status.bg }]}>
          <Text style={[styles.pillText, { color: status.fg }]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.datesRow}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>Admitted</Text>
          <Text style={styles.dateValue} numberOfLines={1}>
            {item.AdmDt || '—'}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>Discharged</Text>
          <Text style={styles.dateValue} numberOfLines={1}>
            {item.DschgDt || '—'}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export function AdmissionListScreen({ navigation, route }: RootScreenProps<'AdmissionList'>) {
  const { patient } = route.params;
  const [history, setHistory] = useState<MedicalHistoryModel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAdmissionHistory(patient.PRMNT_PATIENT_NO);
      setHistory(list);
    } catch {
      Alert.alert('Error', 'Failed to load admission history');
    } finally {
      setLoading(false);
    }
  }, [patient.PRMNT_PATIENT_NO]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <AppHeader
        title="Admission History"
        subtitle={`IP No: ${patient.PATIENT_ID} · Bed ${patient.PATIENT_BEDNO}`}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={history}
        keyExtractor={(item, index) => `${item.IPNo}-${index}`}
        contentContainerStyle={[styles.list, history.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={
          !loading ? <EmptyState icon="calendar-blank-outline" title="No admission history found" /> : undefined
        }
        renderItem={({ item }) => <AdmissionRow item={item} />}
      />
      <LoadingOverlay visible={loading} label="Loading admission history…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingTop: spacing.md },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: { flex: 1 },
  ipNo: { ...typography.bodyStrong, color: colors.textPrimary },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  pillText: { ...typography.captionStrong },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateBlock: { flex: 1 },
  divider: { width: 1, height: '100%', backgroundColor: colors.border, marginHorizontal: spacing.md },
  dateLabel: { ...typography.caption, color: colors.textMuted },
  dateValue: { ...typography.body, color: colors.textPrimary, marginTop: 2 },
});

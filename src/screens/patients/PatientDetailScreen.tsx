import React, { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Card } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getMode } from '../../storage/session';
import type { RootScreenProps, RootStackParamList } from '../../navigation/types';

interface ModuleTile {
  key: string;
  icon: string;
  title: string;
  route: keyof RootStackParamList;
}

const IP_MODULES: ModuleTile[] = [
  { key: 'vitals', icon: 'heart-pulse', title: 'Vital Signs', route: 'VitalSigns' },
  { key: 'tests', icon: 'test-tube', title: 'Tests', route: 'TestList' },
  { key: 'medicines', icon: 'pill', title: 'Medicines', route: 'MedicineList' },
  { key: 'diet', icon: 'food-apple-outline', title: 'Diet', route: 'DietList' },
  { key: 'notes', icon: 'note-text-outline', title: "Doctor's Notes", route: 'Notes' },
];

const OP_MODULES: ModuleTile[] = [
  { key: 'vitals', icon: 'heart-pulse', title: 'Vital Signs', route: 'VitalSigns' },
  { key: 'tests', icon: 'test-tube', title: 'Tests', route: 'TestList' },
  { key: 'medicines', icon: 'pill', title: 'Medicines', route: 'MedicineList' },
  { key: 'admission', icon: 'history', title: 'Admission History', route: 'AdmissionList' },
  { key: 'notes', icon: 'note-text-outline', title: "Doctor's Notes", route: 'Notes' },
];

function waNumber(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

export function PatientDetailScreen({ navigation, route }: RootScreenProps<'PatientDetail'>) {
  const { patient } = route.params;
  const [mode, setLocalMode] = useState<'ip' | 'op'>('ip');

  useEffect(() => {
    getMode().then(m => setLocalMode(m === 'op' ? 'op' : 'ip'));
  }, []);

  const modules = mode === 'op' ? OP_MODULES : IP_MODULES;

  function open(url: string, label: string) {
    Linking.openURL(url).catch(() => Alert.alert(label, `Unable to open ${label.toLowerCase()}`));
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <AppHeader
        title={patient.PATIENT_NAME}
        subtitle={`IP No: ${patient.PATIENT_ID}  ·  Bed ${patient.PATIENT_BEDNO}`}
        onBack={() => navigation.goBack()}
        right={
          mode === 'ip' ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('PendingRequest', { patient })}
              style={styles.pendingBtn}>
              <Icon name="clock-alert-outline" size={22} color={colors.textOnPrimary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <SummaryItem label="Ward" value={patient.PATIENT_WARDNO} />
          <SummaryItem label="Class" value={patient.PATIENT_CLASS} />
          <SummaryItem label="Age/Sex" value={`${patient.PATIENT_AGE}, ${patient.PATIENT_GENDER}`} />
        </View>
        <View style={styles.contactRow}>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => open(`tel:${patient.PATIENT_MOBILE}`, 'Call')}>
            <Icon name="phone-outline" size={18} color={colors.primary} />
            <Text style={styles.contactLabel}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => open(`sms:${patient.PATIENT_MOBILE}`, 'SMS')}>
            <Icon name="message-text-outline" size={18} color={colors.primary} />
            <Text style={styles.contactLabel}>SMS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => open(`https://wa.me/${waNumber(patient.PATIENT_MOBILE)}`, 'WhatsApp')}>
            <Icon name="whatsapp" size={18} color={colors.success} />
            <Text style={styles.contactLabel}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => open(`mailto:${patient.PATIENT_EMAIL}`, 'Email')}>
            <Icon name="email-outline" size={18} color={colors.primary} />
            <Text style={styles.contactLabel}>Email</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.grid}>
        {modules.map(m => (
          <TouchableOpacity
            key={m.key}
            style={styles.moduleWrap}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(m.route as any, { patient } as any)}>
            <Card style={styles.moduleCard}>
              <View style={styles.moduleIcon}>
                <Icon name={m.icon} size={26} color={colors.primary} />
              </View>
              <Text style={styles.moduleTitle}>{m.title}</Text>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pendingBtn: { padding: spacing.xs },
  summary: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flex: 1 },
  summaryLabel: { ...typography.label, color: colors.textMuted },
  summaryValue: { ...typography.bodyStrong, color: colors.textPrimary, marginTop: 2 },
  contactRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
  },
  contactLabel: { ...typography.caption, color: colors.textPrimary },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
    gap: spacing.md,
  },
  moduleWrap: { width: '47%' },
  moduleCard: { alignItems: 'center', paddingVertical: spacing.xl },
  moduleIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  moduleTitle: { ...typography.bodyStrong, color: colors.textPrimary },
});

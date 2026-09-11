import React, { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Card, GenderAvatar } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getMode } from '../../storage/session';
import type { RootScreenProps, RootStackParamList } from '../../navigation/types';

interface ModuleTile {
  key: string;
  icon: string;
  title: string;
  route: keyof RootStackParamList;
}

// Matches PatientDetailPage.xaml's bottom FlexLayout exactly: only these three
// buttons are visible in the shipped app (Text="Tests"/"Vital Signs"/"Prescription").
// btnDietHistory / btnNotes / btnPendingRequests are all IsVisible="false" in that
// XAML. All three stay off per instruction, commented out rather than deleted —
// Pending Request was briefly re-enabled and then asked to be removed again.
const IP_MODULES: ModuleTile[] = [
  { key: 'vitals', icon: 'heart-pulse', title: 'Vital Signs', route: 'VitalSigns' },
  { key: 'tests', icon: 'test-tube', title: 'Tests', route: 'TestList' },
  { key: 'prescription', icon: 'pill', title: 'Prescription', route: 'MedicineList' },
  // { key: 'pending', icon: 'clock-alert-outline', title: 'Pending Request', route: 'PendingRequest' },
  // { key: 'diet', icon: 'food-apple-outline', title: 'Diet', route: 'DietList' },
  // { key: 'notes', icon: 'note-text-outline', title: "Doctor's Notes", route: 'Notes' },
];

// OPPatientDetailPage's own button set (Tests/Vitals/Prescription/AdmissionList/Notes) —
// Notes commented out for the same reason as above.
const OP_MODULES: ModuleTile[] = [
  { key: 'vitals', icon: 'heart-pulse', title: 'Vital Signs', route: 'VitalSigns' },
  { key: 'tests', icon: 'test-tube', title: 'Tests', route: 'TestList' },
  { key: 'prescription', icon: 'pill', title: 'Prescription', route: 'MedicineList' },
  { key: 'admission', icon: 'history', title: 'Admission History', route: 'AdmissionList' },
  // { key: 'notes', icon: 'note-text-outline', title: "Doctor's Notes", route: 'Notes' },
];

function waNumber(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

/** Matches PatientDetailPage.xaml.cs: txtAdmDate.Text = selectedPatient.PATIENT_ADMSDATE.ToString("dd-MM-yyyy"). */
function formatAdmDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
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

  function openRmo() {
    const docCd = Number(patient.PATIENT_DOCCD);
    navigation.navigate('RMO', { docCd: Number.isNaN(docCd) ? 0 : docCd });
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <AppHeader
        title={patient.PATIENT_NAME}
        subtitle={`${patient.PATIENT_GENDER === 'M' ? 'Male' : 'Female'}, ${patient.PATIENT_AGE}`}
        avatar={<GenderAvatar gender={patient.PATIENT_GENDER} size={40} />}
        onBack={() => navigation.goBack()}
        right={
          // Matches PatientDetailPage.xaml's ToolbarItem (Text="RMO", Clicked="Handle_Clicked_1").
          <TouchableOpacity onPress={openRmo} style={styles.headerBtn}>
            <Icon name="doctor" size={22} color={colors.textOnPrimary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.summary}>
        <View style={styles.contactRow}>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => open(`tel:${patient.PATIENT_MOBILE}`, 'Call')}>
            <Icon name="phone-outline" size={18} color={colors.textOnPrimary} />
            <Text style={styles.contactLabel} numberOfLines={1}>
              Call
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => open(`sms:${patient.PATIENT_MOBILE}`, 'SMS')}>
            <Icon name="message-text-outline" size={18} color={colors.textOnPrimary} />
            <Text style={styles.contactLabel} numberOfLines={1}>
              SMS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => open(`https://wa.me/${waNumber(patient.PATIENT_MOBILE)}`, 'WhatsApp')}>
            <Icon name="whatsapp" size={18} color={colors.textOnPrimary} />
            <Text style={styles.contactLabel} numberOfLines={1}>
              WhatsApp
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => open(`mailto:${patient.PATIENT_EMAIL}`, 'Email')}>
            <Icon name="email-outline" size={18} color={colors.textOnPrimary} />
            <Text style={styles.contactLabel} numberOfLines={1}>
              Email
            </Text>
          </TouchableOpacity>
        </View>

        {/* Based on PatientDetailPage.xaml's info Frame, with Bed/Floor split into
            separate fields (the original combines them into one "Bed/Flr" label)
            and Gender/Age added alongside. */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <InfoField label="Reg. No" value={patient.PRMNT_PATIENT_NO} />
            <InfoField label="IP No" value={patient.PATIENT_ID} />
          </View>
          <View style={styles.infoRow}>
            <InfoField label="Ward" value={patient.PATIENT_WARDNO} />
            <InfoField label="Bed" value={patient.PATIENT_BEDNO} />
          </View>
          <View style={styles.infoRow}>
            <InfoField label="Floor" value={patient.PATIENT_FLOOR} />
            <InfoField label="Class" value={patient.PATIENT_CLASS} />
          </View>
          <View style={styles.infoRow}>
            <InfoField label="Adm Date" value={formatAdmDate(patient.PATIENT_ADMSDATE)} />
            <InfoField
              label="Gender/Age"
              value={`${patient.PATIENT_GENDER === 'M' ? 'Male' : 'Female'}, ${patient.PATIENT_AGE}`}
            />
          </View>
        </Card>
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

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoField}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: { padding: spacing.xs },
  summary: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  contactRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    // Explicit left/right padding so the longest label ("WhatsApp") never
    // touches the button edge on narrow screens.
    paddingHorizontal: spacing.xs,
  },
  contactLabel: { ...typography.caption, color: colors.textOnPrimary },
  infoCard: { padding: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  infoField: { flex: 1, flexDirection: 'column' },
  infoLabel: { ...typography.captionStrong, color: colors.primary },
  infoValue: { ...typography.captionStrong, color: colors.textPrimary, marginTop: 2, paddingRight: spacing.sm },
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

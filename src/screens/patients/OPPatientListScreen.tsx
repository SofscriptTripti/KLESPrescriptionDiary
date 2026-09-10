import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  Screen,
  AppHeader,
  TextField,
  LoadingOverlay,
  EmptyState,
  Card,
  GenderAvatar,
  PatientTypeModal,
} from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getOPPatientList } from '../../api/services/opPatients';
import { getUser, setMode } from '../../storage/session';
import { patientTypeRoute } from '../../navigation/patientType';
import type { RootScreenProps } from '../../navigation/types';
import type { PatientModel, User } from '../../types/models';

/** Mirrors OPPatientListPage.xaml.cs's constructor: docCd = user.DOCCD for types
 * "1"/"2" (Doctor/RMO), or "0" for type "3" (Nurse). */
function resolveDocCd(user: User): number {
  if (user.UserTyp === '1' || user.UserTyp === '2') {
    return Number(user.DOCCD) || 0;
  }
  return 0;
}

export function OPPatientListScreen({ navigation }: RootScreenProps<'OPPatientList'>) {
  const [user, setLocalUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<PatientModel[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = await getUser();
      setLocalUser(u);
      if (!u) return;
      const docCd = resolveDocCd(u);
      const list = await getOPPatientList(u.UserTyp, docCd);
      setPatients(list);
    } catch {
      Alert.alert('Error', 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return patients;
    const q = query.trim().toLowerCase();
    return patients.filter(p => p.PATIENT_NAME?.toLowerCase().includes(q));
  }, [patients, query]);

  function call(mobile?: string) {
    if (!mobile) return;
    Linking.openURL(`tel:${mobile}`).catch(() => Alert.alert('Call', 'Unable to make call'));
  }
  function sms(mobile?: string) {
    if (!mobile) return;
    Linking.openURL(`sms:${mobile}`).catch(() => Alert.alert('SMS', 'Unable to send SMS'));
  }
  // OPPatientListPage.xaml.cs's Handle_Tapped_1 opens `mailto:` (not WhatsApp, unlike the IP list).
  function email(address?: string) {
    if (!address) return;
    Linking.openURL(`mailto:${address}`).catch(() => Alert.alert('Email', 'Unable to open email'));
  }

  async function openPatient(patient: PatientModel) {
    await setMode('op');
    navigation.navigate('PatientDetail', { patient });
  }

  async function handleTypeSelect(type: 'ip' | 'op') {
    setShowTypeModal(false);
    await setMode(type);
    navigation.replace(patientTypeRoute(type, user));
  }

  return (
    <Screen>
      <AppHeader
        title="OP Patients"
        subtitle={`${filtered.length} of ${patients.length}`}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        right={
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowTypeModal(true)} hitSlop={8}>
            <Icon name="account-switch" size={22} color={colors.textOnPrimary} />
          </TouchableOpacity>
        }
      />
      <View style={styles.searchWrap}>
        <TextField
          placeholder="Search by patient name"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.PRMNT_PATIENT_NO}
        contentContainerStyle={[styles.list, filtered.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={
          !loading ? <EmptyState icon="account-search-outline" title="No patients found" /> : undefined
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openPatient(item)}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <GenderAvatar gender={item.PATIENT_GENDER} size={48} />
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.PATIENT_NAME}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    IP No: {item.PATIENT_ID} · Bed {item.PATIENT_BEDNO} · {item.PATIENT_WARDNO} · Floor {item.PATIENT_FLOOR}
                  </Text>
                  {user?.UserTyp !== '1' ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      Dr. {item.PATIENT_DOCNM}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => call(item.PATIENT_MOBILE)}>
                  <Icon name="phone-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => sms(item.PATIENT_MOBILE)}>
                  <Icon name="message-text-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => email(item.PATIENT_EMAIL)}>
                  <Icon name="email-outline" size={18} color={colors.accent} />
                </TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
      <LoadingOverlay visible={loading} label="Loading patients…" />
      <PatientTypeModal
        visible={showTypeModal}
        onSelect={handleTypeSelect}
        onDismiss={() => setShowTypeModal(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBtn: { padding: spacing.xs },
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchInput: { marginBottom: 0 },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1 },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

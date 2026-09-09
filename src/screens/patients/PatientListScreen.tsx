import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, TextField, LoadingOverlay, EmptyState, Card } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getPatientList } from '../../api/services/patients';
import { getUser } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';
import type { PatientModel, User } from '../../types/models';

function waNumber(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

export function PatientListScreen({ navigation, route }: RootScreenProps<'PatientList'>) {
  const wardCd = route.params?.wardCd;
  const [user, setLocalUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<PatientModel[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = await getUser();
      setLocalUser(u);
      if (!u) return;
      const docCd = wardCd ? 0 : Number(u.DOCCD) || 0;
      const list = await getPatientList(u.UserTyp, { docCd, wardCd });
      setPatients(list);
    } catch {
      Alert.alert('Error', 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [wardCd]);

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
  function whatsapp(mobile?: string) {
    if (!mobile) return;
    Linking.openURL(`https://wa.me/${waNumber(mobile)}`).catch(() =>
      Alert.alert('WhatsApp', 'Unable to open WhatsApp'),
    );
  }

  return (
    <Screen>
      <AppHeader
        title="Patients"
        subtitle={`${filtered.length} of ${patients.length}`}
        onBack={() => navigation.goBack()}
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
          <TouchableOpacity onPress={() => navigation.navigate('PatientDetail', { patient: item })}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: item.PATIENT_GENDER === 'M' ? colors.accentLight : '#FCE7F3' },
                  ]}>
                  <Icon
                    name={item.PATIENT_GENDER === 'M' ? 'gender-male' : 'gender-female'}
                    size={22}
                    color={item.PATIENT_GENDER === 'M' ? colors.male : colors.female}
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.PATIENT_NAME}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    IP No: {item.PATIENT_ID} · Bed {item.PATIENT_BEDNO} · {item.PATIENT_WARDNO}
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
                <TouchableOpacity style={styles.actionBtn} onPress={() => whatsapp(item.PATIENT_MOBILE)}>
                  <Icon name="whatsapp" size={18} color={colors.success} />
                </TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
      <LoadingOverlay visible={loading} label="Loading patients…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchInput: { marginBottom: 0 },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
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

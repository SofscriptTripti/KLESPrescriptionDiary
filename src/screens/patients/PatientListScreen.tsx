import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { getPatientList } from '../../api/services/patients';
import { getUser, setMode } from '../../storage/session';
import { patientTypeRoute } from '../../navigation/patientType';
import type { RootScreenProps } from '../../navigation/types';
import type { PatientModel, User } from '../../types/models';

function waNumber(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

type FilterKind = 'class' | 'ward' | 'floor' | null;

function FilterOptionSeparator() {
  return <View style={styles.filterOptionSeparator} />;
}

function filterKindIcon(kind: FilterKind): string {
  if (kind === 'class') return 'shape-outline';
  if (kind === 'ward') return 'hospital-building';
  return 'layers-outline';
}

/** Matches PatientModel.PtnNo — "IP No:<id> Patient No:<regNo>". */
function ptnNoLabel(p: PatientModel): string {
  return `IP No: ${p.PATIENT_ID}   Patient No: ${p.PRMNT_PATIENT_NO}`;
}

export function PatientListScreen({ navigation, route }: RootScreenProps<'PatientList'>) {
  const wardCd = route.params?.wardCd;
  const [user, setLocalUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<PatientModel[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Class/Ward/Floor filter — mirrors PatientFilterPopup: pick a distinct value from
  // whichever field, filter the list down to matching rows. "All" clears it.
  // `modalKind` is only which popup is currently open; `filterKind`/`filterValue`
  // is the actually-applied filter and must survive the popup closing.
  const [modalKind, setModalKind] = useState<FilterKind>(null);
  const [filterKind, setFilterKind] = useState<FilterKind>(null);
  const [filterValue, setFilterValue] = useState<string | null>(null);

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

  function fieldFor(kind: Exclude<FilterKind, null>, p: PatientModel): string {
    if (kind === 'class') return p.PATIENT_CLASS;
    if (kind === 'ward') return p.PATIENT_WARDNO;
    return p.PATIENT_FLOOR;
  }

  const filterOptions = useMemo(() => {
    if (!modalKind) return [];
    const seen = new Set<string>();
    const opts: string[] = [];
    for (const p of patients) {
      const v = fieldFor(modalKind, p);
      if (v && !seen.has(v)) {
        seen.add(v);
        opts.push(v);
      }
    }
    return opts;
  }, [patients, modalKind]);

  const filtered = useMemo(() => {
    let list = patients;
    if (filterKind && filterValue) {
      list = list.filter(p => fieldFor(filterKind, p) === filterValue);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(p => p.PATIENT_NAME?.toLowerCase().includes(q));
    }
    return list;
  }, [patients, query, filterKind, filterValue]);

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

  const [showTypeModal, setShowTypeModal] = useState(false);

  async function handleTypeSelect(type: 'ip' | 'op') {
    setShowTypeModal(false);
    await setMode(type);
    navigation.replace(patientTypeRoute(type, user));
  }

  const showDoctorInfo = user?.UserTyp !== '1';

  return (
    <Screen>
      <AppHeader
        title="Patient List"
        centerTitle={true}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        right={
          <TouchableOpacity style={styles.menuBtn} onPress={() => setShowTypeModal(true)} hitSlop={8}>
            <Icon name="account-switch" size={22} color={colors.textOnPrimary} />
          </TouchableOpacity>
        }
      />
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <TextField
            placeholder="Search by patient name"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            containerStyle={styles.searchFieldContainer}
          />
          <Text style={styles.countText}>{filtered.length}</Text>
        </View>
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
                <GenderAvatar gender={item.PATIENT_GENDER} size={44} />
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.PATIENT_NAME}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.PATIENT_GENDER === 'M' ? 'Male' : 'Female'}, {item.PATIENT_AGE}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    Ward: {item.PATIENT_WARDNO} · Bed: {item.PATIENT_BEDNO} · Floor: {item.PATIENT_FLOOR}
                  </Text>
                  <View style={styles.contactLine}>
                    <Text style={styles.mobile} numberOfLines={1}>
                      {item.PATIENT_MOBILE}
                    </Text>
                    <View style={styles.contactIcons}>
                      <TouchableOpacity style={styles.contactIconBtn} onPress={() => call(item.PATIENT_MOBILE)} hitSlop={8}>
                        <Icon name="phone" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.contactIconBtn} onPress={() => sms(item.PATIENT_MOBILE)} hitSlop={8}>
                        <Icon name="message-text" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.contactIconBtn} onPress={() => whatsapp(item.PATIENT_MOBILE)} hitSlop={8}>
                        <Icon name="whatsapp" size={18} color={colors.success} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.ptnNo} numberOfLines={1}>
                    {ptnNoLabel(item)}
                  </Text>

                  {showDoctorInfo ? (
                    <View style={styles.doctorBlock}>
                      <Text style={styles.doctorName} numberOfLines={1}>
                        Dr. {item.PATIENT_DOCNM}
                      </Text>
                      <View style={styles.contactLine}>
                        <Text style={styles.mobile} numberOfLines={1}>
                          {item.DOC_MOBILENO}
                        </Text>
                        <View style={styles.contactIcons}>
                          <TouchableOpacity style={styles.contactIconBtn} onPress={() => call(item.DOC_MOBILENO)} hitSlop={8}>
                            <Icon name="phone" size={18} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.contactIconBtn} onPress={() => sms(item.DOC_MOBILENO)} hitSlop={8}>
                            <Icon name="message-text" size={18} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.contactIconBtn} onPress={() => whatsapp(item.DOC_MOBILENO)} hitSlop={8}>
                            <Icon name="whatsapp" size={18} color={colors.success} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />

      {/* Matches PatientListPage.xaml's bottom button bar (All / Class / Ward / Floor). */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => {
            setFilterKind(null);
            setFilterValue(null);
          }}>
          <Text style={styles.filterBtnLabel}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setModalKind('class')}>
          <Text style={styles.filterBtnLabel}>Class</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setModalKind('ward')}>
          <Text style={styles.filterBtnLabel}>Ward</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setModalKind('floor')}>
          <Text style={styles.filterBtnLabel}>Floor</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!modalKind}
        transparent
        animationType="none"
        onRequestClose={() => setModalKind(null)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalKind(null)}>
          {/* activeOpacity={1} + no-op onPress: claims the touch so taps inside
              the box don't fall through to the backdrop's dismiss handler. */}
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBadge}>
                  <Icon name={filterKindIcon(modalKind)} size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    Filter by {modalKind === 'class' ? 'Class' : modalKind === 'ward' ? 'Ward' : 'Floor'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {filterOptions.length} option{filterOptions.length === 1 ? '' : 's'} available
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalKind(null)} hitSlop={8} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={filterOptions}
              keyExtractor={item => item}
              style={styles.modalList}
              ItemSeparatorComponent={FilterOptionSeparator}
              ListEmptyComponent={<EmptyState title="No values found" />}
              renderItem={({ item }) => {
                const selected = item === filterValue;
                return (
                  <TouchableOpacity
                    style={[styles.filterOptionRow, selected && styles.filterOptionRowSelected]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setFilterKind(modalKind);
                      setFilterValue(item);
                      setModalKind(null);
                    }}>
                    <Icon
                      name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                      size={20}
                      color={selected ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.filterOptionLabel, selected && styles.filterOptionLabelSelected]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={styles.modalClearBtn}
              onPress={() => {
                setFilterKind(null);
                setFilterValue(null);
                setModalKind(null);
              }}>
              <Icon name="filter-remove-outline" size={16} color={colors.primary} />
              <Text style={styles.modalClearBtnLabel}>Clear filter</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
  menuBtn: { padding: spacing.xs },
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchFieldContainer: { flex: 1, marginBottom: 0, marginRight: spacing.sm },
  searchInput: { marginBottom: 0 },
  countText: {
    ...typography.bodyStrong,
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  info: { flex: 1 },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  contactLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  mobile: { ...typography.captionStrong, color: colors.primary, flexShrink: 1, marginRight: spacing.sm },
  contactIcons: { flexDirection: 'row', gap: spacing.xs },
  contactIconBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorBlock: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  doctorName: { ...typography.captionStrong, color: colors.textPrimary },
  ptnNo: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingBottom: spacing.md,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.25)',
  },
  filterBtnLabel: { ...typography.bodyStrong, color: colors.textOnPrimary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  modalIconBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  modalSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalList: { flexGrow: 0 },
  filterOptionSeparator: { height: spacing.xs },
  filterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  filterOptionRowSelected: { backgroundColor: colors.primaryLight },
  filterOptionLabel: { ...typography.body, color: colors.textPrimary },
  filterOptionLabelSelected: { ...typography.bodyStrong, color: colors.primaryDark },
  modalClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalClearBtnLabel: { ...typography.bodyStrong, color: colors.primary, fontSize: 14 },
});

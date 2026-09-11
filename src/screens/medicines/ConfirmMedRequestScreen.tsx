import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  Screen,
  AppHeader,
  Button,
  TextField,
  Card,
  LoadingOverlay,
  EmptyState,
} from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import {
  getDosageDescList,
  getFrequencyList,
  getRouteOfAdminList,
  insertMedicineOrder,
} from '../../api/services/medicines';
import { getMode, getUser } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';
import type {
  CdDcdModel,
  FrequencyModel,
  GenMedicineListModel,
  InsertMedicineOrderModel,
  NewMedReqDtlModel,
} from '../../types/models';

interface DraftItem {
  med: GenMedicineListModel;
  freqIdx: number;
  dosageIdx: number;
  routeIdx: number;
  quantity: string;
  days: string;
  remarks: string;
}

type PickerField = 'freq' | 'dosage' | 'route';

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ConfirmMedRequestScreen({
  navigation,
  route,
}: RootScreenProps<'ConfirmMedRequest'>) {
  const { patient, selected } = route.params;

  const [freqList, setFreqList] = useState<FrequencyModel[]>([]);
  const [dosageList, setDosageList] = useState<CdDcdModel[]>([]);
  const [routeList, setRouteList] = useState<CdDcdModel[]>([]);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [picker, setPicker] = useState<{
    index: number;
    field: PickerField;
  } | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The hardware/system back button and the swipe-back gesture dispatch a
  // GO_BACK/POP action directly, bypassing the header's onBack — intercept
  // those too so medicines removed here (removeDraft) don't still show as
  // checked on the medicine picker when the user leaves without saving.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (e.data.action.type !== 'GO_BACK' && e.data.action.type !== 'POP')
        return;
      e.preventDefault();
      navigation.navigate(
        'NewMedicineRequest',
        { patient, preselected: drafts.map(d => d.med) },
        { pop: true },
      );
    });
    return unsubscribe;
  }, [navigation, patient, drafts]);

  async function load() {
    setLoading(true);
    try {
      const [freq, dosage, routeOfAdmin] = await Promise.all([
        getFrequencyList(),
        getDosageDescList(),
        getRouteOfAdminList(),
      ]);
      setFreqList(freq);
      setDosageList(dosage);
      setRouteList(routeOfAdmin);
      setDrafts(
        selected.map(med => ({
          med,
          freqIdx: 0,
          dosageIdx: 0,
          routeIdx: 0,
          quantity: '',
          days: '',
          remarks: '',
        })),
      );
    } catch {
      Alert.alert('Error', 'Failed to load frequency/dosage/route lists');
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(index: number, patch: Partial<DraftItem>) {
    setDrafts(prev =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    );
  }

  function removeDraft(index: number) {
    setDrafts(prev => prev.filter((_, i) => i !== index));
  }

  function selectOption(optionIdx: number) {
    if (!picker) return;
    if (picker.field === 'freq')
      updateDraft(picker.index, { freqIdx: optionIdx });
    else if (picker.field === 'dosage')
      updateDraft(picker.index, { dosageIdx: optionIdx });
    else updateDraft(picker.index, { routeIdx: optionIdx });
    setPicker(null);
  }

  function validate(): boolean {
    if (drafts.length === 0) {
      Alert.alert('New Medicine Request', 'Add at least one medicine');
      return false;
    }
    for (const d of drafts) {
      const qty = Number(d.quantity);
      const days = Number(d.days);
      if (!qty || qty <= 0 || !days || days <= 0) {
        Alert.alert('New Medicine Request', 'Quantity or Days cannot be 0');
        return false;
      }
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const user = await getUser();
      const mode = (await getMode()) || 'ip';
      const isIp = mode !== 'op';
      const now = new Date();
      const dateString = formatDate(now);

      const dtlModels: NewMedReqDtlModel[] = drafts.map((d, idx) => {
        const endDt = new Date(now);
        endDt.setDate(endDt.getDate() + (Number(d.days) - 1));
        return {
          RQDETL_SR_NO: idx + 1,
          RQDETL_REQ_BY_DT: now.toISOString(),
          ord_srno: idx + 1,
          item_code: d.med.item_cd,
          Item_desc: d.med.item_desc,
          dosage_code: Number(dosageList[d.dosageIdx]?.cd) || 0,
          freq_code: Number(freqList[d.freqIdx]?.freq_cd) || 0,
          frequency: Number(freqList[d.freqIdx]?.frequency) || 0,
          period: Number(d.days),
          strt_dt: now.toISOString(),
          strt_time: now.toISOString(),
          end_dt: endDt.toISOString(),
          end_time: endDt.toISOString(),
          request_qty: Number(d.quantity),
          rout_admin: Number(routeList[d.routeIdx]?.cd) || 0,
          oth_det: d.remarks ?? '',
        };
      });

      const payload: InsertMedicineOrderModel = {
        COCD: '1',
        DIVCD: 1,
        LOCCD: 1,
        strHeader: {
          ip_op_flg: isIp ? 'I' : 'O',
          ptn_no: Number(patient.PRMNT_PATIENT_NO) || 0,
          ip_no: isIp ? Number(patient.PATIENT_ID) || 0 : 0,
          ord_no: 0,
          ord_date: dateString,
          ord_time: dateString,
          doc_cd: Number(patient.PATIENT_DOCCD) || 0,
          store_code: 0,
          ord_bed_no: patient.PATIENT_BEDNO,
          crt_usr_id: user?.USERID ?? '',
          ptn_name: patient.PATIENT_NAME,
          doc_name: patient.PATIENT_DOCNM,
          Ward_No: Number(patient.PATIENT_WARDCD) || 0,
        },
        strDetail: dtlModels,
      };

      const ok = await insertMedicineOrder(payload);
      if (ok) {
        Alert.alert('Success', 'Medicine request submitted', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MedicineList', { patient }),
          },
        ]);
      } else {
        Alert.alert('Error', 'Some error occurred. Try again');
      }
    } catch {
      Alert.alert('Error', 'Some error occurred. Try again');
    } finally {
      setSubmitting(false);
    }
  }

  const pickerOptions = useMemo(() => {
    if (!picker) return [];
    if (picker.field === 'freq') return freqList.map(f => f.freq_desc);
    if (picker.field === 'dosage') return dosageList.map(d => d.dcd);
    return routeList.map(r => r.dcd);
  }, [picker, freqList, dosageList, routeList]);

  const pickerTitle =
    picker?.field === 'freq'
      ? 'Frequency'
      : picker?.field === 'dosage'
      ? 'Dosage'
      : 'Route of Admin';

  function handleAddNew() {
    // Matches ConfirmNewMedRequestPage.xaml.cs's Handle_Clicked_1 ("Add New +"),
    // which pops back to the medicine picker — here the current cart is threaded
    // back in as `preselected` so nothing already chosen is lost.
    // `pop: true` is required: a plain navigate() only reuses the *current*
    // route or pushes a new one — without it this pushes a second picker
    // instance on top instead of popping back to the original.
    navigation.navigate(
      'NewMedicineRequest',
      { patient, preselected: drafts.map(d => d.med) },
      { pop: true },
    );
  }

  /** Leaving without saving (header back or Cancel) still threads the current
   * (possibly trimmed by removeDraft) cart back as `preselected`, so items
   * deleted here no longer show as checked on the medicine picker. */
  function handleBack() {
    navigation.navigate(
      'NewMedicineRequest',
      { patient, preselected: drafts.map(d => d.med) },
      { pop: true },
    );
  }

  function openRmo() {
    const docCd = Number(patient.PATIENT_DOCCD);
    navigation.navigate('RMO', { docCd: Number.isNaN(docCd) ? 0 : docCd });
  }

  return (
    <Screen>
      <AppHeader
        title="Confirm Request"
        subtitle={patient.PATIENT_NAME}
        onBack={handleBack}
        right={
          // Matches ConfirmNewMedRequestPage.xaml's ToolbarItem (Text="RMO").
          <TouchableOpacity onPress={openRmo} style={styles.headerBtn}>
            <Icon name="doctor" size={22} color={colors.textOnPrimary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.summaryBar}>
        <Icon name="pill" size={18} color={colors.primary} />
        <Text style={styles.summaryText}>
          {drafts.length} {drafts.length === 1 ? 'medicine' : 'medicines'} in
          this request
        </Text>
      </View>

      <FlatList
        data={drafts}
        keyExtractor={(d, idx) => `${d.med.item_cd}-${idx}`}
        contentContainerStyle={[
          styles.list,
          drafts.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="cart-off"
              title="Cart is empty"
              subtitle="Tap Add New to choose medicines"
            />
          ) : undefined
        }
        renderItem={({ item, index }) => (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.indexBadge}>
                <Text style={styles.indexBadgeText}>{index + 1}</Text>
              </View>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.itemDesc} numberOfLines={2}>
                  {item.med.item_desc}
                </Text>
                {item.med.gen_nm ? (
                  <Text style={styles.itemSub} numberOfLines={1}>
                    {item.med.gen_nm}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => removeDraft(index)}
                hitSlop={8}
                style={styles.removeBtn}
              >
                <Icon
                  name="trash-can-outline"
                  size={20}
                  color={colors.danger}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>Dosage Instructions</Text>
            <View style={styles.dropdownRow}>
              <DropdownField
                label="Frequency"
                value={freqList[item.freqIdx]?.freq_desc}
                onPress={() => setPicker({ index, field: 'freq' })}
              />
              <DropdownField
                label="Dosage"
                value={dosageList[item.dosageIdx]?.dcd}
                onPress={() => setPicker({ index, field: 'dosage' })}
              />
              <DropdownField
                label="Route of Admin"
                value={routeList[item.routeIdx]?.dcd}
                onPress={() => setPicker({ index, field: 'route' })}
              />
            </View>

            <View style={styles.inputsRow}>
              <TextField
                label="Quantity"
                placeholder="0"
                keyboardType="numeric"
                value={item.quantity}
                onChangeText={v =>
                  updateDraft(index, { quantity: v.replace(/[^0-9]/g, '') })
                }
                style={styles.smallInput}
              />
              <TextField
                label="Days"
                placeholder="0"
                keyboardType="numeric"
                value={item.days}
                onChangeText={v =>
                  updateDraft(index, { days: v.replace(/[^0-9]/g, '') })
                }
                style={styles.smallInput}
              />
            </View>

            <TextField
              label="Remarks"
              placeholder="Optional remarks"
              value={item.remarks}
              onChangeText={v => updateDraft(index, { remarks: v })}
              multiline
              style={styles.remarksInput}
            />
          </Card>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Button
            label="Add New"
            variant="outline"
            onPress={handleAddNew}
            style={styles.footerBtn}
          />
          <Button
            label="Save"
            onPress={handleSubmit}
            loading={submitting}
            style={styles.footerBtn}
          />
          <Button
            label="Cancel"
            variant="danger"
            onPress={handleBack}
            style={styles.footerBtn}
          />
        </View>
      </View>

      <Modal
        visible={!!picker}
        transparent
        animationType="fade"
        // See PatientListScreen.tsx's filter Modal for why this matters on iOS.
        supportedOrientations={[
          'portrait',
          'landscape-left',
          'landscape-right',
          'portrait-upside-down',
        ]}
        onRequestClose={() => setPicker(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPicker(null)}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{pickerTitle}</Text>
              <TouchableOpacity onPress={() => setPicker(null)} hitSlop={8}>
                <Icon name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickerOptions}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => selectOption(index)}
                >
                  <Text style={styles.modalOptionLabel}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <LoadingOverlay visible={loading} label="Loading options…" />
    </Screen>
  );
}

interface DropdownFieldProps {
  label: string;
  value?: string;
  onPress: () => void;
}

function DropdownField({ label, value, onPress }: DropdownFieldProps) {
  return (
    <TouchableOpacity
      style={styles.dropdownField}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.dropdownLabel}>{label}</Text>
      <View style={styles.dropdownValueRow}>
        <Text
          style={[styles.dropdownValue, !value && styles.dropdownPlaceholder]}
          numberOfLines={1}
        >
          {value ?? 'Select'}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerBtn: { padding: spacing.xs },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
  },
  summaryText: { ...typography.captionStrong, color: colors.primaryDark },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.lg },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  indexBadgeText: {
    ...typography.captionStrong,
    color: colors.textOnPrimary,
    fontSize: 12,
  },
  cardTitleWrap: { flex: 1 },
  itemDesc: { ...typography.bodyStrong, color: colors.textPrimary },
  itemSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  removeBtn: { padding: spacing.xs },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dropdownField: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  dropdownLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 2,
  },
  dropdownValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  dropdownValue: {
    ...typography.captionStrong,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  dropdownPlaceholder: {
    color: colors.textMuted,
    fontFamily: typography.body.fontFamily,
  },
  inputsRow: { flexDirection: 'row', gap: spacing.md },
  smallInput: { marginBottom: spacing.md },
  remarksInput: { minHeight: 64, textAlignVertical: 'top', marginBottom: 0 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  footerBtn: { flex: 1, paddingHorizontal: spacing.sm },
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

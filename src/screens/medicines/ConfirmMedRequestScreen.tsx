import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Button, TextField, Card, LoadingOverlay } from '../../components';
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

export function ConfirmMedRequestScreen({ navigation, route }: RootScreenProps<'ConfirmMedRequest'>) {
  const { patient, selected } = route.params;

  const [freqList, setFreqList] = useState<FrequencyModel[]>([]);
  const [dosageList, setDosageList] = useState<CdDcdModel[]>([]);
  const [routeList, setRouteList] = useState<CdDcdModel[]>([]);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [picker, setPicker] = useState<{ index: number; field: PickerField } | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setDrafts(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function selectOption(optionIdx: number) {
    if (!picker) return;
    if (picker.field === 'freq') updateDraft(picker.index, { freqIdx: optionIdx });
    else if (picker.field === 'dosage') updateDraft(picker.index, { dosageIdx: optionIdx });
    else updateDraft(picker.index, { routeIdx: optionIdx });
    setPicker(null);
  }

  function validate(): boolean {
    if (drafts.length === 0) return false;
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
          { text: 'OK', onPress: () => navigation.navigate('MedicineList', { patient }) },
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

  return (
    <Screen>
      <AppHeader title="Confirm Request" subtitle={patient.PATIENT_NAME} onBack={() => navigation.goBack()} />

      <FlatList
        data={drafts}
        keyExtractor={(d, idx) => `${d.med.item_cd}-${idx}`}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <Card style={styles.card}>
            <Text style={styles.itemDesc} numberOfLines={2}>
              {item.med.item_desc}
            </Text>
            {item.med.gen_nm ? (
              <Text style={styles.itemSub} numberOfLines={1}>
                {item.med.gen_nm}
              </Text>
            ) : null}

            <View style={styles.chipRow}>
              <TouchableOpacity style={styles.chip} onPress={() => setPicker({ index, field: 'freq' })}>
                <Text style={styles.chipLabel} numberOfLines={1}>
                  {freqList[item.freqIdx]?.freq_desc ?? 'Frequency'}
                </Text>
                <Icon name="chevron-down" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.chip} onPress={() => setPicker({ index, field: 'dosage' })}>
                <Text style={styles.chipLabel} numberOfLines={1}>
                  {dosageList[item.dosageIdx]?.dcd ?? 'Dosage'}
                </Text>
                <Icon name="chevron-down" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.chip} onPress={() => setPicker({ index, field: 'route' })}>
                <Text style={styles.chipLabel} numberOfLines={1}>
                  {routeList[item.routeIdx]?.dcd ?? 'Route'}
                </Text>
                <Icon name="chevron-down" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputsRow}>
              <TextField
                label="Quantity"
                keyboardType="numeric"
                value={item.quantity}
                onChangeText={v => updateDraft(index, { quantity: v.replace(/[^0-9]/g, '') })}
                style={styles.smallInput}
              />
              <TextField
                label="Days"
                keyboardType="numeric"
                value={item.days}
                onChangeText={v => updateDraft(index, { days: v.replace(/[^0-9]/g, '') })}
                style={styles.smallInput}
              />
            </View>

            <TextField
              label="Remarks"
              placeholder="Optional remarks"
              value={item.remarks}
              onChangeText={v => updateDraft(index, { remarks: v })}
            />
          </Card>
        )}
      />

      <View style={styles.footer}>
        <Button label="Submit Request" onPress={handleSubmit} fullWidth loading={submitting} />
      </View>

      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPicker(null)}>
          <View style={styles.modalBox}>
            <FlatList
              data={pickerOptions}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item, index }) => (
                <TouchableOpacity style={styles.modalOption} onPress={() => selectOption(index)}>
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

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingTop: spacing.md },
  card: { marginBottom: spacing.md },
  itemDesc: { ...typography.bodyStrong, color: colors.textPrimary },
  itemSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    maxWidth: '100%',
  },
  chipLabel: { ...typography.caption, color: colors.primaryDark, maxWidth: 140 },
  inputsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  smallInput: { marginBottom: 0 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
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
  modalOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionLabel: { ...typography.body, color: colors.textPrimary },
});

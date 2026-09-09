import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Button, TextField, LoadingOverlay, EmptyState } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getDietMealOptions, getDietTypeList, insertPtnDiet } from '../../api/services/diet';
import { getUser } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';
import type { CdDcdModel, DietDetailModel, SaveDietDetailArray } from '../../types/models';

/** Editable row state — the fetched DietDetailModel plus a text-input mirror of DietQty,
 * since the user types digits before they parse to a valid number. */
interface DietRow extends DietDetailModel {
  qtyText: string;
}

export function InsertDietRecordScreen({ navigation, route }: RootScreenProps<'InsertDietRecord'>) {
  const { patient } = route.params;
  const [dietTypes, setDietTypes] = useState<CdDcdModel[]>([]);
  const [selectedType, setSelectedType] = useState<CdDcdModel | null>(null);
  const [rows, setRows] = useState<DietRow[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDietTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDietTypes() {
    setLoadingTypes(true);
    try {
      const list = await getDietTypeList();
      setDietTypes(list);
      if (list.length > 0) {
        await selectType(list[0]);
      }
    } catch {
      Alert.alert('Error', 'Failed to load diet types');
    } finally {
      setLoadingTypes(false);
    }
  }

  async function selectType(type: CdDcdModel) {
    setSelectedType(type);
    setRows([]);
    setLoadingMeals(true);
    try {
      const meals = await getDietMealOptions(type.cd);
      setRows(
        meals.map(m => ({
          ...m,
          InHouse: m.InHouse ?? false,
          Remarks: m.Remarks ?? '',
          qtyText: m.DietQty ? String(m.DietQty) : '',
        })),
      );
    } catch {
      Alert.alert('Error', 'Failed to load meal options');
    } finally {
      setLoadingMeals(false);
    }
  }

  function toggleInHouse(index: number) {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, InHouse: !r.InHouse } : r)));
  }

  function setQty(index: number, text: string) {
    const sanitized = text.replace(/[^0-9.]/g, '');
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, qtyText: sanitized } : r)));
  }

  function setRemark(index: number, text: string) {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, Remarks: text } : r)));
  }

  function validate(): boolean {
    if (!selectedType) {
      Alert.alert('Diet Order', 'Please select a diet type');
      return false;
    }
    if (rows.length === 0) {
      Alert.alert('Diet Order', 'No meal options available for this diet type');
      return false;
    }
    for (const r of rows) {
      const qty = Number(r.qtyText);
      if (!qty || qty <= 0) {
        Alert.alert('Diet Order', 'Quantity cannot be 0');
        return false;
      }
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate() || !selectedType) return;

    setSubmitting(true);
    try {
      const user = await getUser();
      if (!user) {
        Alert.alert('Error', 'User session not found');
        return;
      }

      const nowIso = new Date().toISOString();
      const detail: SaveDietDetailArray[] = rows.map((r, i) => ({
        OrdSrNo: i + 1,
        MealTmCd: r.MealTmCd,
        MealTmDesc: r.MealTmDesc,
        DietCd: r.DietCd,
        DietDesc: r.DietDesc,
        InHouse: r.InHouse,
        Remarks: r.Remarks ?? '',
        DietQty: Number(r.qtyText),
        OrdDate: nowIso,
        OrdTime: nowIso,
        DietTypCd: Number(selectedType.cd) || 0,
        DietTyp: selectedType.dcd,
        UserId: user.USERID,
        DocCd: Number(user.DOCCD) || 0,
        RefDocCd: Number(user.DOCCD) || 0,
        IPNo: Number(patient.PATIENT_ID) || 0,
        OrdStatus: 1,
        WardNo: Number(patient.PATIENT_WARDCD) || 0,
      }));

      const res = await insertPtnDiet({
        COCD: '1',
        DIVCD: '1',
        LOCCD: '1',
        DietRemark: '',
        strDetail: detail,
      });

      if (res?.RecordSaved?.toLowerCase() === 'true') {
        Alert.alert('Diet Order', 'Diet order saved successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
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

  return (
    <Screen>
      <AppHeader
        title="New Diet Order"
        subtitle={`IP No: ${patient.PATIENT_ID} · Bed ${patient.PATIENT_BEDNO}`}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={rows}
        keyExtractor={(item, index) => `${item.MealTmCd}-${item.DietCd}-${index}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.typeSection}>
            <Text style={styles.sectionLabel}>Diet Type</Text>
            <View style={styles.chipsWrap}>
              {dietTypes.map(type => {
                const active = selectedType?.cd === type.cd;
                return (
                  <TouchableOpacity
                    key={type.cd}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => selectType(type)}>
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{type.dcd}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {rows.length > 0 || loadingMeals ? <Text style={styles.sectionLabel}>Meal / Diet Options</Text> : null}
          </View>
        }
        ListEmptyComponent={
          !loadingMeals && !loadingTypes ? (
            <EmptyState icon="food-off-outline" title="No meal options for this diet type" />
          ) : undefined
        }
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <TouchableOpacity style={styles.checkboxWrap} onPress={() => toggleInHouse(index)} hitSlop={8}>
              <Icon
                name={item.InHouse ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
                color={item.InHouse ? colors.primary : colors.textMuted}
              />
              <Text style={styles.checkboxLabel}>In house</Text>
            </TouchableOpacity>
            <View style={styles.rowInfo}>
              <Text style={styles.mealDesc} numberOfLines={2}>
                {item.MealTmDesc} · {item.DietDesc}
              </Text>
              <View style={styles.rowInputs}>
                <TextField
                  placeholder="Qty"
                  keyboardType="numeric"
                  value={item.qtyText}
                  onChangeText={text => setQty(index, text)}
                  style={styles.qtyInput}
                />
                <TextField
                  placeholder="Remark (optional)"
                  value={item.Remarks}
                  onChangeText={text => setRemark(index, text)}
                  style={styles.remarkInput}
                />
              </View>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Button
          label="Submit Diet Order"
          onPress={handleSubmit}
          loading={submitting}
          fullWidth
          disabled={rows.length === 0}
        />
      </View>

      <LoadingOverlay
        visible={loadingTypes || loadingMeals}
        label={loadingTypes ? 'Loading diet types…' : 'Loading meal options…'}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  typeSection: { marginBottom: spacing.md },
  sectionLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipLabel: { ...typography.caption, color: colors.textSecondary },
  chipLabelActive: { color: colors.primaryDark, fontFamily: typography.captionStrong.fontFamily },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  checkboxWrap: { alignItems: 'center', width: 64, paddingTop: spacing.xs },
  checkboxLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  rowInfo: { flex: 1 },
  mealDesc: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: spacing.sm },
  rowInputs: { flexDirection: 'row', gap: spacing.sm },
  qtyInput: { width: 70 },
  remarkInput: { flex: 1 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});

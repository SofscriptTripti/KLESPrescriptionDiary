import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Card, LoadingOverlay, EmptyState } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getDietDetail, getDietList } from '../../api/services/diet';
import type { RootScreenProps } from '../../navigation/types';
import type { DietDetailModel, DietModel } from '../../types/models';

const Tab = createMaterialTopTabNavigator();

/** Mirrors DietModel.OrderDateTime ("dd-MM hh:mm tt") from the MAUI model. */
function formatOrderDateTime(ordDate?: string, ordTime?: string): string {
  const d = ordDate ? new Date(ordDate) : null;
  const t = ordTime ? new Date(ordTime) : null;
  const datePart =
    d && !isNaN(d.getTime())
      ? `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : '';
  const timePart =
    t && !isNaN(t.getTime()) ? t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
  return [datePart, timePart].filter(Boolean).join(' ');
}

/** MealTm is a bare time-of-day string in the API response; parse defensively. */
function formatMealTime(mealTm?: string): string {
  if (!mealTm) return '';
  let d = new Date(mealTm);
  if (isNaN(d.getTime())) {
    d = new Date(`1970-01-01T${mealTm}`);
  }
  if (isNaN(d.getTime())) return mealTm;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

interface MealGroup {
  header: string;
  desc: string;
}

/** Mirrors CurrentDietPage/AdvanceDietPage/HistoryDietPage's CreateData(): groups the flat
 * DietDetailModel[] by MealTmDesc, in first-seen order, joining DietDesc as a bullet list. */
function groupDietDetails(details: DietDetailModel[]): MealGroup[] {
  const order: string[] = [];
  const byMeal = new Map<string, { lines: string[]; time: string }>();

  for (const d of details) {
    const key = d.MealTmDesc || 'Meal';
    if (!byMeal.has(key)) {
      order.push(key);
      byMeal.set(key, { lines: [], time: formatMealTime(d.MealTm) });
    }
    byMeal.get(key)!.lines.push(d.DietDesc);
  }

  return order.map(key => {
    const g = byMeal.get(key)!;
    return {
      header: g.time ? `${key} ${g.time}` : key,
      desc: g.lines.map(line => `• ${line}`).join('\n'),
    };
  });
}

interface DietOrderRowProps {
  item: DietModel;
  ipno: string;
}

function DietOrderRow({ item, ipno }: DietOrderRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<DietDetailModel[] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const grouped = useMemo(() => groupDietDetails(details ?? []), [details]);

  async function handlePress() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (details !== null) return; // already fetched — just re-expand
    setLoadingDetail(true);
    try {
      const result = await getDietDetail({ ipno, ordNo: item.OrdNo });
      setDetails(result);
    } catch {
      Alert.alert('Error', 'Failed to load diet detail');
      setDetails([]);
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Icon name="food-apple-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.info}>
            <Text style={styles.dietTyp} numberOfLines={1}>
              {item.DietTyp}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {formatOrderDateTime(item.OrdDate, item.OrdTime)}
              {item.UserId ? ` · ${item.UserId}` : ''}
            </Text>
            {item.Remarks ? (
              <Text style={styles.remark} numberOfLines={expanded ? undefined : 1}>
                Remark: {item.Remarks}
              </Text>
            ) : null}
          </View>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </View>

        {expanded ? (
          <View style={styles.detailWrap}>
            {loadingDetail ? (
              <ActivityIndicator color={colors.primary} />
            ) : grouped.length === 0 ? (
              <Text style={styles.meta}>No meal details found</Text>
            ) : (
              grouped.map(g => (
                <View key={g.header} style={styles.mealBlock}>
                  <Text style={styles.mealHeader}>{g.header}</Text>
                  <Text style={styles.mealDesc}>{g.desc}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}
      </Card>
    </TouchableOpacity>
  );
}

interface DietOrderListProps {
  data: DietModel[];
  ipno: string;
  emptyLabel: string;
}

function DietOrderList({ data, ipno, emptyLabel }: DietOrderListProps) {
  return (
    <FlatList
      data={data}
      keyExtractor={item => String(item.OrdNo)}
      contentContainerStyle={[styles.list, data.length === 0 && styles.emptyContainer]}
      ListEmptyComponent={<EmptyState icon="food-off-outline" title={emptyLabel} />}
      renderItem={({ item }) => <DietOrderRow item={item} ipno={ipno} />}
    />
  );
}

export function DietListScreen({ navigation, route }: RootScreenProps<'DietList'>) {
  const { patient } = route.params;
  const [current, setCurrent] = useState<DietModel[]>([]);
  const [advance, setAdvance] = useState<DietModel[]>([]);
  const [history, setHistory] = useState<DietModel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getDietList(patient.PATIENT_ID);
      const c: DietModel[] = [];
      const a: DietModel[] = [];
      const h: DietModel[] = [];
      for (const item of list) {
        if (item.OrdFlg === 2) c.push(item);
        else if (item.OrdFlg === 3) a.push(item);
        else if (item.OrdFlg === 1) h.push(item);
      }
      setCurrent(c);
      setAdvance(a);
      setHistory(h);
    } catch {
      Alert.alert('Error', 'Failed to load diet records');
    } finally {
      setLoading(false);
    }
  }, [patient.PATIENT_ID]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <AppHeader
        title="Diet"
        subtitle={`IP No: ${patient.PATIENT_ID} · Bed ${patient.PATIENT_BEDNO}`}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate('InsertDietRecord', { patient })}
            hitSlop={8}
            style={styles.addBtn}>
            <Icon name="plus" size={24} color={colors.textOnPrimary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.tabsWrap}>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarIndicatorStyle: styles.tabIndicator,
            tabBarLabelStyle: styles.tabLabel,
            tabBarStyle: styles.tabBar,
          }}>
          <Tab.Screen name="Current">
            {() => <DietOrderList data={current} ipno={patient.PATIENT_ID} emptyLabel="No current diet orders" />}
          </Tab.Screen>
          <Tab.Screen name="Advance">
            {() => <DietOrderList data={advance} ipno={patient.PATIENT_ID} emptyLabel="No advance diet orders" />}
          </Tab.Screen>
          <Tab.Screen name="History">
            {() => <DietOrderList data={history} ipno={patient.PATIENT_ID} emptyLabel="No diet history" />}
          </Tab.Screen>
        </Tab.Navigator>
      </View>

      <LoadingOverlay visible={loading} label="Loading diet records…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addBtn: { padding: spacing.xs },
  tabsWrap: { flex: 1 },
  tabBar: { backgroundColor: colors.surface, elevation: 0, shadowOpacity: 0 },
  tabIndicator: { backgroundColor: colors.primary, height: 3 },
  tabLabel: { ...typography.captionStrong, textTransform: 'none' },
  list: { padding: spacing.lg, paddingTop: spacing.md },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
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
  dietTyp: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  remark: { ...typography.caption, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  detailWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  mealBlock: { marginBottom: spacing.sm },
  mealHeader: { ...typography.captionStrong, color: colors.primary, marginBottom: 2 },
  mealDesc: { ...typography.body, color: colors.textPrimary },
});

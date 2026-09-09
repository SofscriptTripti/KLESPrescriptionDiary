import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Screen, AppHeader, Card, LoadingOverlay, EmptyState } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getCurrentMedOrders } from '../../api/services/medicines';
import { getMode } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';
import type { MedicineModel } from '../../types/models';

const Tab = createMaterialTopTabNavigator();

function isActiveOrder(item: MedicineModel): boolean {
  return String(item.ISORDCLOSED).toLowerCase() === 'false';
}

function formatDate(value: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

interface MedsListContextValue {
  all: MedicineModel[];
  active: MedicineModel[];
  closed: MedicineModel[];
}

const MedsListContext = React.createContext<MedsListContextValue>({ all: [], active: [], closed: [] });

function MedicineRow({ item }: { item: MedicineModel }) {
  const active = isActiveOrder(item);
  return (
    <Card style={styles.card}>
      <View style={styles.rowTop}>
        <Text style={styles.itemDesc} numberOfLines={2}>
          {item.ORDITEMDESC}
        </Text>
        <View style={[styles.pill, active ? styles.pillActive : styles.pillClosed]}>
          <Text style={[styles.pillLabel, active ? styles.pillLabelActive : styles.pillLabelClosed]}>
            {active ? 'Active' : 'Closed'}
          </Text>
        </View>
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {item.DOSAGEDESC || '-'} · {item.FREQDESC || '-'}
      </Text>
      <Text style={styles.metaMuted}>Ordered {formatDate(item.ORDDT)}</Text>
    </Card>
  );
}

function MedsList({ data }: { data: MedicineModel[] }) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item, idx) => `${item.ORDNO}-${item.ORDSRNO}-${idx}`}
      contentContainerStyle={[styles.list, data.length === 0 && styles.emptyContainer]}
      ListEmptyComponent={<EmptyState icon="pill" title="No medicines found" />}
      renderItem={({ item }) => <MedicineRow item={item} />}
    />
  );
}

function AllTab() {
  const { all } = useContext(MedsListContext);
  return <MedsList data={all} />;
}
function ActiveTab() {
  const { active } = useContext(MedsListContext);
  return <MedsList data={active} />;
}
function ClosedTab() {
  const { closed } = useContext(MedsListContext);
  return <MedsList data={closed} />;
}

export function MedicineListScreen({ navigation, route }: RootScreenProps<'MedicineList'>) {
  const { patient } = route.params;
  const [orders, setOrders] = useState<MedicineModel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mode = (await getMode()) || 'ip';
      const list = await getCurrentMedOrders(patient, mode);
      setOrders(list);
    } catch {
      Alert.alert('Error', 'Failed to load medicines');
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  const active = useMemo(() => orders.filter(isActiveOrder), [orders]);
  const closed = useMemo(() => orders.filter(item => !isActiveOrder(item)), [orders]);

  return (
    <Screen>
      <AppHeader
        title="Medicines"
        subtitle={patient.PATIENT_NAME}
        onBack={() => navigation.goBack()}
        right={
          // Matches MedicineReqPage.xaml's ToolbarItems exactly: just RMO + "+" —
          // no calendar/schedule icon, no pending-request icon. "+" is a floating
          // action button here instead (see below), so only RMO stays in the header.
          <TouchableOpacity
            style={styles.headerBtn}
            hitSlop={8}
            onPress={() => {
              const docCd = Number(patient.PATIENT_DOCCD);
              navigation.navigate('RMO', { docCd: Number.isNaN(docCd) ? 0 : docCd });
            }}>
            <Icon name="doctor" size={22} color={colors.textOnPrimary} />
          </TouchableOpacity>
        }
      />

      <MedsListContext.Provider value={{ all: orders, active, closed }}>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarIndicatorStyle: { backgroundColor: colors.primary },
            tabBarLabelStyle: { ...typography.captionStrong, textTransform: 'none' },
            tabBarStyle: { backgroundColor: colors.surface },
          }}>
          <Tab.Screen name="All" component={AllTab} options={{ title: `All (${orders.length})` }} />
          <Tab.Screen name="Active" component={ActiveTab} options={{ title: `Active (${active.length})` }} />
          <Tab.Screen name="Closed" component={ClosedTab} options={{ title: `Closed (${closed.length})` }} />
        </Tab.Navigator>
      </MedsListContext.Provider>

      {/* Floating action button — matches the original's "+" toolbar item's
          destination (NewMedicineRequestPage), just styled as a FAB per instruction. */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('NewMedicineRequest', { patient })}>
        <Icon name="plus" size={28} color={colors.textOnPrimary} />
      </TouchableOpacity>

      <LoadingOverlay visible={loading} label="Loading medicines…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBtn: { padding: spacing.xs },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  list: { padding: spacing.lg, paddingTop: spacing.md },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  itemDesc: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  pillActive: { backgroundColor: colors.successLight },
  pillClosed: { backgroundColor: colors.surfaceAlt },
  pillLabel: { ...typography.caption },
  pillLabelActive: { color: colors.success },
  pillLabelClosed: { color: colors.textMuted },
  meta: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  metaMuted: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});

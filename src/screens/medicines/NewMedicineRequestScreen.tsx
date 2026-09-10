import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Button, Card, LoadingOverlay, EmptyState } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getAllMedicineList, getFavMedicineList } from '../../api/services/medicines';
import type { RootScreenProps } from '../../navigation/types';
import type { GenMedicineListModel } from '../../types/models';

type ListMode = 'all' | 'fav';

export function NewMedicineRequestScreen({ navigation, route }: RootScreenProps<'NewMedicineRequest'>) {
  const { patient, preselected } = route.params;
  const [mode, setMode] = useState<ListMode>('all');
  const [allMeds, setAllMeds] = useState<GenMedicineListModel[]>([]);
  const [favMeds, setFavMeds] = useState<GenMedicineListModel[]>([]);
  const [loadedAll, setLoadedAll] = useState(false);
  const [loadedFav, setLoadedFav] = useState(false);
  const [loading, setLoading] = useState(false);
  // Matches AllMedicineRequestPage.xaml's 3-column search panel (Generic / Item Cd /
  // Item Name) — present in the shipped layout but wired up as three independent filters.
  const [genericQuery, setGenericQuery] = useState('');
  const [itemCdQuery, setItemCdQuery] = useState('');
  const [itemNameQuery, setItemNameQuery] = useState('');
  // The "cart" — items chosen so far. Pre-seeded from `preselected` when returning
  // here via "Add New" on the Confirm/Save screen, so nothing already picked is lost.
  const [selected, setSelected] = useState<Map<string, GenMedicineListModel>>(
    () => new Map((preselected ?? []).map(m => [m.item_cd, m])),
  );

  // `preselected` also arrives on later visits — via "Add New", or via Confirm
  // Request's back/cancel threading back its (possibly trimmed) cart — but the
  // useState initializer above only runs on first mount. Re-sync on every
  // subsequent change so medicines removed on Confirm Request stop showing as
  // checked here. Skip the very first run since the initializer already covered it.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setSelected(new Map((preselected ?? []).map(m => [m.item_cd, m])));
  }, [preselected]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllMedicineList();
      setAllMeds(list);
      setLoadedAll(true);
    } catch {
      Alert.alert('Error', 'Failed to load medicines');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFav = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getFavMedicineList(patient);
      setFavMeds(list);
      setLoadedFav(true);
    } catch {
      Alert.alert('Error', 'Failed to load favourites');
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useEffect(() => {
    if (mode === 'all' && !loadedAll) loadAll();
    if (mode === 'fav' && !loadedFav) loadFav();
  }, [mode, loadedAll, loadedFav, loadAll, loadFav]);

  const source = mode === 'all' ? allMeds : favMeds;
  const filtered = useMemo(() => {
    const generic = genericQuery.trim().toLowerCase();
    const itemCd = itemCdQuery.trim().toLowerCase();
    const itemName = itemNameQuery.trim().toLowerCase();
    if (!generic && !itemCd && !itemName) return source;
    return source.filter(
      m =>
        (!generic || m.gen_nm?.toLowerCase().includes(generic)) &&
        (!itemCd || m.item_cd?.toLowerCase().includes(itemCd)) &&
        (!itemName || m.item_desc?.toLowerCase().includes(itemName)),
    );
  }, [source, genericQuery, itemCdQuery, itemNameQuery]);

  function toggle(item: GenMedicineListModel) {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(item.item_cd)) next.delete(item.item_cd);
      else next.set(item.item_cd, item);
      return next;
    });
  }

  const hasQuery = !!(genericQuery || itemCdQuery || itemNameQuery);
  function clearSearch() {
    setGenericQuery('');
    setItemCdQuery('');
    setItemNameQuery('');
  }

  function viewCart() {
    if (selected.size === 0) {
      Alert.alert('New Medicine Request', 'Add at least one medicine to the cart');
      return;
    }
    navigation.navigate('ConfirmMedRequest', { patient, selected: Array.from(selected.values()) });
  }

  return (
    <Screen>
      <AppHeader
        title="New Medicine Request"
        subtitle={patient.PATIENT_NAME}
        onBack={() => navigation.goBack()}
        right={
          // Matches NewMedicineRequestPage.xaml's ToolbarItem (Text="RMO",
          // Clicked="Handle_Clicked" -> RMOPage(0), generic, not patient-scoped).
          <TouchableOpacity onPress={() => navigation.navigate('RMO', { docCd: 0 })} style={styles.headerBtn}>
            <Icon name="doctor" size={22} color={colors.textOnPrimary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'all' && styles.toggleBtnActive]}
          onPress={() => setMode('all')}>
          <Icon name="format-list-bulleted" size={16} color={mode === 'all' ? colors.textOnPrimary : colors.textSecondary} />
          <Text style={[styles.toggleLabel, mode === 'all' && styles.toggleLabelActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'fav' && styles.toggleBtnActive]}
          onPress={() => setMode('fav')}>
          <Icon name="star" size={16} color={mode === 'fav' ? colors.textOnPrimary : colors.textSecondary} />
          <Text style={[styles.toggleLabel, mode === 'fav' && styles.toggleLabelActive]}>Favourites</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.searchCard}>
        <View style={styles.searchHeader}>
          <Icon name="magnify" size={16} color={colors.primary} />
          <Text style={styles.searchHeaderText}>Search Medicines</Text>
          {hasQuery ? (
            <TouchableOpacity onPress={clearSearch} hitSlop={8} style={styles.clearAllBtn}>
              <Text style={styles.clearAllText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.searchRow}>
          <SearchField
            icon="flask-outline"
            placeholder="Generic"
            value={genericQuery}
            onChangeText={setGenericQuery}
          />
          <SearchField
            icon="barcode-scan"
            placeholder="Item Cd"
            value={itemCdQuery}
            onChangeText={setItemCdQuery}
          />
          <SearchField
            icon="text-box-search-outline"
            placeholder="Item Name"
            value={itemNameQuery}
            onChangeText={setItemNameQuery}
          />
        </View>
      </Card>

      <View style={styles.tableHeader}>
        <View style={styles.checkboxCol} />
        <Text style={[styles.tableHeaderLabel, styles.colGeneric]}>Generic Name</Text>
        <Text style={[styles.tableHeaderLabel, styles.colItemCd]}>Item Cd</Text>
        <Text style={[styles.tableHeaderLabel, styles.colItemName]}>Item Name</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.item_cd}
        contentContainerStyle={[styles.list, filtered.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="pill"
              title="No medicines found"
              subtitle={mode === 'fav' ? 'No favourite medicines for this doctor' : undefined}
            />
          ) : undefined
        }
        renderItem={({ item }) => {
          const checked = selected.has(item.item_cd);
          return (
            <TouchableOpacity
              style={[styles.row, checked && styles.rowChecked]}
              onPress={() => toggle(item)}>
              <View style={styles.checkboxCol}>
                <Icon
                  name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={20}
                  color={checked ? colors.primary : colors.textMuted}
                />
              </View>
              <Text style={[styles.rowCell, styles.colGeneric]} numberOfLines={2}>
                {item.gen_nm}
              </Text>
              <Text style={[styles.rowCell, styles.colItemCd]} numberOfLines={1}>
                {item.item_cd}
              </Text>
              <Text style={[styles.rowCell, styles.colItemName]} numberOfLines={2}>
                {item.item_desc}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <Button
          label={selected.size === 0 ? 'Add to Cart' : `View Cart (${selected.size})`}
          onPress={viewCart}
          disabled={selected.size === 0}
          fullWidth
        />
      </View>
      <LoadingOverlay visible={loading} label="Loading medicines…" />
    </Screen>
  );
}

interface SearchFieldProps {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

/** A single icon-prefixed search column, with its own inline clear (×) button
 * that only shows once it has text — a quick way to confirm each field is
 * actually live/working, not just decorative. */
function SearchField({ icon, placeholder, value, onChangeText }: SearchFieldProps) {
  return (
    <View style={styles.searchCol}>
      <Icon name={icon} size={15} color={colors.textMuted} style={styles.searchColIcon} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        style={styles.searchColInput}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8} style={styles.searchColClear}>
          <Icon name="close-circle" size={15} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: { padding: spacing.xs },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleLabel: { ...typography.bodyStrong, color: colors.textSecondary },
  toggleLabelActive: { color: colors.textOnPrimary },
  searchCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  searchHeaderText: { ...typography.captionStrong, color: colors.textSecondary, flex: 1 },
  clearAllBtn: { padding: spacing.xs },
  clearAllText: { ...typography.captionStrong, color: colors.accent },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  searchCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
  },
  searchColIcon: { marginRight: 4 },
  searchColInput: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  searchColClear: { paddingLeft: 4 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  tableHeaderLabel: { ...typography.captionStrong, color: colors.textOnPrimary },
  checkboxCol: { width: 24, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowChecked: { backgroundColor: colors.primaryLight },
  rowCell: { ...typography.caption, color: colors.textPrimary },
  colGeneric: { flex: 1 },
  colItemCd: { width: 80 },
  colItemName: { flex: 1.6 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});

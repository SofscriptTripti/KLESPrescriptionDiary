import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Button, TextField, LoadingOverlay, EmptyState } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getAllMedicineList, getFavMedicineList } from '../../api/services/medicines';
import type { RootScreenProps } from '../../navigation/types';
import type { GenMedicineListModel } from '../../types/models';

type ListMode = 'all' | 'fav';

export function NewMedicineRequestScreen({ navigation, route }: RootScreenProps<'NewMedicineRequest'>) {
  const { patient } = route.params;
  const [mode, setMode] = useState<ListMode>('all');
  const [allMeds, setAllMeds] = useState<GenMedicineListModel[]>([]);
  const [favMeds, setFavMeds] = useState<GenMedicineListModel[]>([]);
  const [loadedAll, setLoadedAll] = useState(false);
  const [loadedFav, setLoadedFav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Map<string, GenMedicineListModel>>(new Map());

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
    if (!query.trim()) return source;
    const q = query.trim().toLowerCase();
    return source.filter(
      m => m.item_desc?.toLowerCase().includes(q) || m.gen_nm?.toLowerCase().includes(q),
    );
  }, [source, query]);

  function toggle(item: GenMedicineListModel) {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(item.item_cd)) next.delete(item.item_cd);
      else next.set(item.item_cd, item);
      return next;
    });
  }

  function handleNext() {
    if (selected.size === 0) {
      Alert.alert('New Medicine Request', 'Select at least one medicine');
      return;
    }
    navigation.navigate('ConfirmMedRequest', { patient, selected: Array.from(selected.values()) });
  }

  return (
    <Screen>
      <AppHeader title="New Medicine Request" subtitle={patient.PATIENT_NAME} onBack={() => navigation.goBack()} />

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

      <View style={styles.searchWrap}>
        <TextField
          placeholder="Search medicine"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
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
            <TouchableOpacity style={styles.row} onPress={() => toggle(item)}>
              <Icon
                name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
                color={checked ? colors.primary : colors.textMuted}
              />
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel} numberOfLines={2}>
                  {item.item_desc}
                </Text>
                {item.gen_nm ? (
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {item.gen_nm}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <Button label={`Next (${selected.size} selected)`} onPress={handleNext} fullWidth />
      </View>
      <LoadingOverlay visible={loading} label="Loading medicines…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchInput: { marginBottom: 0 },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowInfo: { flex: 1 },
  rowLabel: { ...typography.body, color: colors.textPrimary },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});

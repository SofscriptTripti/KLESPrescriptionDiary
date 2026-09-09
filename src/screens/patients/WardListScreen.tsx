import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Button, LoadingOverlay, EmptyState } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getWardList } from '../../api/services/patients';
import type { RootScreenProps } from '../../navigation/types';
import type { WardModel } from '../../types/models';

export function WardListScreen({ navigation }: RootScreenProps<'WardList'>) {
  const [wards, setWards] = useState<WardModel[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const list = await getWardList();
      setWards(list);
    } catch {
      Alert.alert('Error', 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }

  function toggle(wardCd: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(wardCd)) next.delete(wardCd);
      else next.add(wardCd);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev => (prev.size === wards.length ? new Set() : new Set(wards.map(w => w.WardCd))));
  }

  function handleSubmit() {
    if (selected.size === 0) {
      Alert.alert('Ward List', 'Please select ward');
      return;
    }
    const wardString = Array.from(selected).join(',');
    navigation.navigate('PatientList', { wardCd: wardString });
  }

  return (
    <Screen>
      <AppHeader title="Select Ward" onBack={() => navigation.goBack()} />
      <TouchableOpacity style={styles.selectAllRow} onPress={toggleAll} disabled={wards.length === 0}>
        <Icon
          name={selected.size === wards.length && wards.length > 0 ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={22}
          color={colors.primary}
        />
        <Text style={styles.selectAllLabel}>Select all</Text>
      </TouchableOpacity>

      <FlatList
        data={wards}
        keyExtractor={item => String(item.WardCd)}
        contentContainerStyle={wards.length === 0 && styles.emptyContainer}
        ListEmptyComponent={!loading ? <EmptyState icon="hospital-building" title="No wards found" /> : undefined}
        renderItem={({ item }) => {
          const checked = selected.has(item.WardCd);
          return (
            <TouchableOpacity style={styles.row} onPress={() => toggle(item.WardCd)}>
              <Icon
                name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
                color={checked ? colors.primary : colors.textMuted}
              />
              <Text style={styles.rowLabel}>{item.WardDcd}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <Button label={`Continue (${selected.size} selected)`} onPress={handleSubmit} fullWidth />
      </View>
      <LoadingOverlay visible={loading} label="Loading wards…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  selectAllLabel: { ...typography.bodyStrong, color: colors.textPrimary },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowLabel: { ...typography.body, color: colors.textPrimary },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
});

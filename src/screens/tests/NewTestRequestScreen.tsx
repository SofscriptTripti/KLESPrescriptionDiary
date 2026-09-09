import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, TextField, Button, LoadingOverlay, EmptyState } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { getAllTestList, insertTestOrder } from '../../api/services/tests';
import { getMode, getUser } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';
import type { TestSrvModel } from '../../types/models';

function testKey(item: TestSrvModel): string {
  return `${item.ChrgCd}_${item.SrvCd}`;
}

export function NewTestRequestScreen({ navigation, route }: RootScreenProps<'NewTestRequest'>) {
  const { patient } = route.params;
  const [catalog, setCatalog] = useState<TestSrvModel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllTestList();
      setCatalog(list);
    } catch {
      Alert.alert('Error', 'Failed to load test catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return catalog;
    const q = query.trim().toLowerCase();
    return catalog.filter(
      t => t.SrvDesc?.toLowerCase().includes(q) || t.SrvCatgDesc?.toLowerCase().includes(q),
    );
  }, [catalog, query]);

  const selectedTests = useMemo(
    () => catalog.filter(t => selected.has(testKey(t))),
    [catalog, selected],
  );

  function toggle(item: TestSrvModel) {
    const key = testKey(item);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSubmitPress() {
    if (selectedTests.length === 0) {
      Alert.alert('New Test Request', 'Please select at least one test');
      return;
    }
    const names = selectedTests.map(t => t.SrvDesc).filter(Boolean);
    const preview = names.slice(0, 3).join(', ') + (names.length > 3 ? `, +${names.length - 3} more` : '');
    Alert.alert(
      'Confirm Test Request',
      `Submit ${selectedTests.length} test(s) for ${patient.PATIENT_NAME}?\n${preview}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: submit },
      ],
    );
  }

  async function submit() {
    setSubmitting(true);
    try {
      const user = await getUser();
      if (!user) {
        Alert.alert('Error', 'User session not found. Please log in again.');
        return;
      }
      const mode = await getMode();
      const res = await insertTestOrder(patient, user, mode, selectedTests);
      if (res?.RecordSaved?.toLowerCase() === 'true') {
        Alert.alert('Tests', 'Record Saved', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert('Error', res?.ReturnMsg || 'Some error occurred. Try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to submit test request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="New Test Request" subtitle={patient.PATIENT_NAME} onBack={() => navigation.goBack()} />

      <View style={styles.searchWrap}>
        <TextField
          placeholder="Search tests"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={testKey}
        contentContainerStyle={[styles.list, filtered.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={
          !loading ? <EmptyState icon="test-tube-off" title="No tests found" /> : undefined
        }
        renderItem={({ item }) => {
          const checked = selected.has(testKey(item));
          return (
            <TouchableOpacity style={styles.row} onPress={() => toggle(item)} activeOpacity={0.7}>
              <Icon
                name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
                color={checked ? colors.primary : colors.textMuted}
              />
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel} numberOfLines={2}>
                  {item.SrvDesc}
                </Text>
                {item.SrvCatgDesc ? (
                  <Text style={styles.rowSubLabel} numberOfLines={1}>
                    {item.SrvCatgDesc}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <Button
          label={`Submit (${selectedTests.length} selected)`}
          onPress={handleSubmitPress}
          fullWidth
          disabled={submitting}
        />
      </View>
      <LoadingOverlay visible={loading} label="Loading test catalog…" />
      <LoadingOverlay visible={submitting} label="Submitting request…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchInput: { marginBottom: 0 },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowInfo: { flex: 1 },
  rowLabel: { ...typography.body, color: colors.textPrimary },
  rowSubLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});

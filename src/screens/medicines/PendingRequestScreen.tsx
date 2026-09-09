import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Card, LoadingOverlay, EmptyState } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { getPendingRequestDetail, getPendingRequestList } from '../../api/services/medicines';
import type { RootScreenProps } from '../../navigation/types';
import type { MedRequestDtlModel, PendingRequestModel } from '../../types/models';

function rowKey(item: PendingRequestModel): string {
  return `${item.PtnNo}-${item.RqDocn}`;
}

export function PendingRequestScreen({ navigation, route }: RootScreenProps<'PendingRequest'>) {
  const { patient } = route.params;
  const [requests, setRequests] = useState<PendingRequestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, MedRequestDtlModel[]>>({});
  const [detailLoadingKey, setDetailLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const list = await getPendingRequestList(patient.PATIENT_WARDCD || '0');
      setRequests(list);
    } catch {
      Alert.alert('Error', 'Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(item: PendingRequestModel) {
    const key = rowKey(item);
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    if (!details[key]) {
      setDetailLoadingKey(key);
      try {
        const dtl = await getPendingRequestDetail(item.PtnNo, item.RqDocn);
        setDetails(prev => ({ ...prev, [key]: dtl }));
      } catch {
        Alert.alert('Error', 'Failed to load request detail');
      } finally {
        setDetailLoadingKey(null);
      }
    }
  }

  return (
    <Screen>
      <AppHeader title="Pending Requests" subtitle={patient.PATIENT_NAME} onBack={() => navigation.goBack()} />
      <FlatList
        data={requests}
        keyExtractor={rowKey}
        contentContainerStyle={[styles.list, requests.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={
          !loading ? <EmptyState icon="clipboard-clock-outline" title="No pending requests" /> : undefined
        }
        renderItem={({ item }) => {
          const key = rowKey(item);
          const expanded = expandedKey === key;
          const rowDetails = details[key];
          return (
            <TouchableOpacity onPress={() => toggleExpand(item)} activeOpacity={0.85}>
              <Card style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.PtnNm}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      IP No: {item.PtnNo} · Bed {item.BedNo} · {item.Ward}
                    </Text>
                  </View>
                  <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textMuted} />
                </View>

                {expanded ? (
                  <View style={styles.detailWrap}>
                    {detailLoadingKey === key ? (
                      <Text style={styles.detailMuted}>Loading…</Text>
                    ) : !rowDetails || rowDetails.length === 0 ? (
                      <Text style={styles.detailMuted}>No item details found</Text>
                    ) : (
                      rowDetails.map((d, idx) => (
                        <View key={`${d.ItemCd}-${idx}`} style={styles.detailRow}>
                          <Text style={styles.detailItem} numberOfLines={2}>
                            {d.ItemDesc}
                          </Text>
                          <Text style={styles.detailMeta}>
                            Req {d.RqQty ?? '-'} · Issued {d.IssQty ?? '-'} · {d.RqSts ?? '-'}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                ) : null}
              </Card>
            </TouchableOpacity>
          );
        }}
      />
      <LoadingOverlay visible={loading} label="Loading pending requests…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingTop: spacing.md },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  info: { flex: 1 },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  detailWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  detailMuted: { ...typography.caption, color: colors.textMuted },
  detailRow: { gap: 2 },
  detailItem: { ...typography.body, color: colors.textPrimary },
  detailMeta: { ...typography.caption, color: colors.textMuted },
});

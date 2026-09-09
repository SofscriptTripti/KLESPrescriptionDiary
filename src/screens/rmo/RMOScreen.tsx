import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Card, LoadingOverlay, EmptyState } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getRMOList } from '../../api/services/rmo';
import type { RootScreenProps } from '../../navigation/types';
import type { RMOModel } from '../../types/models';

/** Mirrors PatientListScreen's waNumber helper — WhatsApp needs a bare digit string,
 * prefixing the India country code for a 10-digit local mobile number. */
function waNumber(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

export function RMOScreen({ navigation, route }: RootScreenProps<'RMO'>) {
  const docCd = route.params?.docCd ?? 0;
  const [rmos, setRmos] = useState<RMOModel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getRMOList(docCd);
      setRmos(list);
    } catch {
      Alert.alert('Error', 'Failed to load RMOs');
    } finally {
      setLoading(false);
    }
  }, [docCd]);

  useEffect(() => {
    load();
  }, [load]);

  function call(mobile?: string) {
    if (!mobile) return;
    Linking.openURL(`tel:${mobile}`).catch(() => Alert.alert('Call', 'Unable to make call'));
  }
  function sms(mobile?: string) {
    if (!mobile) return;
    Linking.openURL(`sms:${mobile}`).catch(() => Alert.alert('SMS', 'Unable to send SMS'));
  }
  function whatsapp(mobile?: string) {
    if (!mobile) return;
    Linking.openURL(`https://wa.me/${waNumber(mobile)}`).catch(() =>
      Alert.alert('WhatsApp', 'Unable to open WhatsApp'),
    );
  }
  function email(address?: string) {
    if (!address) return;
    Linking.openURL(`mailto:${address}`).catch(() => Alert.alert('Email', 'Unable to open email'));
  }

  return (
    <Screen>
      <AppHeader title="RMO Contacts" subtitle={`${rmos.length} doctor(s)`} onBack={() => navigation.goBack()} />

      <FlatList
        data={rmos}
        keyExtractor={(item, idx) => `${item.doccd}-${idx}`}
        contentContainerStyle={[styles.list, rmos.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={
          !loading ? <EmptyState icon="account-tie-voice-outline" title="No RMOs found" /> : undefined
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Icon name="account-tie" size={22} color={colors.primary} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.docname}
                </Text>
                {item.docspltydcd ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.docspltydcd}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => call(item.docmobile)}>
                <Icon name="phone-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => sms(item.docmobile)}>
                <Icon name="message-text-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => whatsapp(item.docmobile)}>
                <Icon name="whatsapp" size={18} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => email(item.docemail)}>
                <Icon name="email-outline" size={18} color={colors.info} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
      <LoadingOverlay visible={loading} label="Loading RMOs…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingTop: spacing.md },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentLight,
    marginRight: spacing.md,
  },
  info: { flex: 1 },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, Card } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { getUser, setMode } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';
import type { User } from '../../types/models';

interface MenuTile {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  onPress?: () => void;
}

export function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  const [user, setLocalUser] = useState<User | null>(null);

  useEffect(() => {
    getUser().then(setLocalUser);
  }, []);

  async function openIpFlow() {
    await setMode('ip');
    if (!user) return;
    if (user.UserTyp === '1' || user.UserTyp === '2') {
      navigation.navigate('PatientList', undefined);
    } else if (user.UserTyp === '3') {
      navigation.navigate('WardList');
    }
  }

  async function openOpFlow() {
    await setMode('op');
    navigation.navigate('OPPatientList');
  }

  const tiles: MenuTile[] = [
    {
      key: 'ip',
      icon: 'bed-outline' as any,
      title: 'IP Patients',
      subtitle: 'In-patient prescriptions & records',
      enabled: true,
      onPress: openIpFlow,
    },
    {
      key: 'op',
      icon: 'account-injury-outline',
      title: 'OP Patients',
      subtitle: 'Out-patient list',
      enabled: true,
      onPress: openOpFlow,
    },
    {
      key: 'rmo',
      icon: 'doctor',
      title: 'RMO',
      subtitle: 'Resident medical officers',
      enabled: true,
      onPress: () => navigation.navigate('RMO', undefined),
    },
  ];

  return (
    <Screen padded>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome{user ? `, ${user.USERNAME}` : ''}</Text>
        <Text style={styles.sub}>What would you like to do?</Text>
      </View>

      <View style={styles.grid}>
        {tiles.map(tile => (
          <TouchableOpacity
            key={tile.key}
            activeOpacity={0.8}
            onPress={tile.onPress}
            style={styles.tileWrap}>
            <Card style={[styles.tile, !tile.enabled && styles.tileDisabled]}>
              <View style={styles.iconBadge}>
                <Icon name={tile.icon} size={28} color={colors.primary} />
              </View>
              <Text style={styles.tileTitle}>{tile.title}</Text>
              <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
              {!tile.enabled ? <Text style={styles.soon}>Coming soon</Text> : null}
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, marginBottom: spacing.xl },
  welcome: { ...typography.h1, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  grid: { gap: spacing.md },
  tileWrap: { marginBottom: spacing.md },
  tile: { flexDirection: 'column' },
  tileDisabled: { opacity: 0.55 },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tileTitle: { ...typography.h3, color: colors.textPrimary },
  tileSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  soon: { ...typography.label, color: colors.warning, marginTop: spacing.sm },
});

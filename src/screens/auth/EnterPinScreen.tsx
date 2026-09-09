import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen, Button, TextField, LoadingOverlay } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { getDeviceId } from '../../utils/deviceId';
import { fetchAuthToken, getUserMst, validateUser } from '../../api/services/auth';
import { getUserMobileNo, setUser } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';

export function EnterPinScreen({ navigation }: RootScreenProps<'EnterPin'>) {
  const [mobileNo, setMobileNo] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getUserMobileNo().then(setMobileNo);
  }, []);

  async function handleSubmit() {
    if (pin.trim().length !== 4) {
      Alert.alert('Validation', 'Enter a valid pin number');
      return;
    }

    setLoading(true);
    try {
      const deviceId = await getDeviceId();

      const validated = await validateUser({
        AppID: 3,
        COCD: '1',
        DIVCD: 1,
        LOCCD: 1,
        UserMobileNo: mobileNo,
        PINCode: pin.trim(),
        ValidFor: 'PIN',
        deviceIMEI: deviceId,
      });
      if (!validated) {
        Alert.alert('Validate User', 'Mobile not registered');
        return;
      }

      const [user] = await Promise.all([
        getUserMst({ COCD: '1', DIVCD: 1, LOCCD: 1, UserMobileNo: mobileNo, deviceID: deviceId }),
        fetchAuthToken(),
      ]);

      if (!user) {
        Alert.alert('Validate User', 'Doctor not registered');
        return;
      }

      await setUser(user);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch {
      Alert.alert('Validate User', 'Mobile not registered');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen padded>
      <View style={styles.content}>
        <Text style={styles.title}>Enter your PIN</Text>
        <Text style={styles.subtitle}>Registered mobile: {mobileNo}</Text>

        <View style={styles.form}>
          <TextField
            label="4-digit PIN"
            placeholder="••••"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            value={pin}
            onChangeText={setPin}
          />
          <Button label="Unlock" onPress={handleSubmit} loading={loading} fullWidth />
          <TouchableOpacity
            style={styles.changePinLink}
            onPress={() => navigation.navigate('ChangePin')}>
            <Text style={styles.changePinText}>Change PIN</Text>
          </TouchableOpacity>
        </View>
      </View>
      <LoadingOverlay visible={loading} label="Signing in…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  form: { width: '100%' },
  changePinLink: { alignSelf: 'center', marginTop: spacing.lg, padding: spacing.sm },
  changePinText: { ...typography.bodyStrong, color: colors.accent },
});

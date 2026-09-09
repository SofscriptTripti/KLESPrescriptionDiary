import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { Screen, Button, TextField, LoadingOverlay } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { getDeviceId } from '../../utils/deviceId';
import { getUserMst, updateUserMst, validateUser } from '../../api/services/auth';
import { setUser, setUserMobileNo } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';

const logo = require('../../assets/images/kles_logo.png');

export function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const [mobileNo, setMobileNo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmed = mobileNo.trim();
    if (!trimmed || trimmed.length < 10) {
      Alert.alert('Validation', 'Enter a valid mobile number');
      return;
    }

    setLoading(true);
    try {
      const imei = await getDeviceId();

      const validated = await validateUser({
        AppID: 3,
        COCD: '1',
        DIVCD: 1,
        LOCCD: 1,
        UserMobileNo: trimmed,
        PINCode: ' ',
        ValidFor: 'Mobile',
        deviceIMEI: imei,
      });
      if (!validated) {
        Alert.alert('Validate User', 'Mobile is not registered / ValidateUser Failed');
        return;
      }

      const updated = await updateUserMst({
        COCD: '1',
        DIVCD: 1,
        LOCCD: 1,
        deviceID: imei,
        deviceIMEI: imei,
        UserID: ' ',
        UserMobileNo: trimmed,
      });
      if (!updated) {
        Alert.alert('Update User', 'Mobile is not registered / UpdateUser Failed');
        return;
      }
      await setUserMobileNo(trimmed);

      const user = await getUserMst({
        COCD: '1',
        DIVCD: 1,
        LOCCD: 1,
        UserMobileNo: trimmed,
        deviceID: imei,
      });
      if (!user) {
        Alert.alert('Validate User', 'Doctor is not registered on server / ValidateUser Failed');
        return;
      }
      await setUser(user);
      navigation.replace('EnterPin');
    } catch {
      Alert.alert('Validate User', 'Mobile is not registered / ValidateUser Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen padded>
      <View style={styles.content}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>KLES Prescription Diary</Text>
        <Text style={styles.subtitle}>Sign in with your registered mobile number</Text>

        <View style={styles.form}>
          <TextField
            label="Mobile number"
            placeholder="Enter 10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={13}
            value={mobileNo}
            onChangeText={setMobileNo}
          />
          <Button label="Continue" onPress={handleSubmit} loading={loading} fullWidth />
        </View>
      </View>
      <LoadingOverlay visible={loading} label="Validating…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 96, height: 96, marginBottom: spacing.lg },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  form: { width: '100%' },
});

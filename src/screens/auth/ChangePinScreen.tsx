import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Screen, AppHeader, Button, Card, TextField, LoadingOverlay } from '../../components';
import { spacing } from '../../theme';
import { getDeviceId } from '../../utils/deviceId';
import { updateUserPin } from '../../api/services/auth';
import { getUserId, getUserMobileNo } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';

export function ChangePinScreen({ navigation }: RootScreenProps<'ChangePin'>) {
  const [mobileNo, setMobileNo] = useState('');
  const [userId, setUserId] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getUserMobileNo().then(setMobileNo);
    getUserId().then(setUserId);
  }, []);

  async function handleSubmit() {
    if (oldPin.trim().length !== 4) {
      Alert.alert('Change PIN', 'Enter the old pin no');
      return;
    }
    if (newPin.trim().length !== 4) {
      Alert.alert('Change PIN', 'Enter the new pin no');
      return;
    }
    if (confirmPin.trim().length !== 4) {
      Alert.alert('Change PIN', 'Confirm the new pin no');
      return;
    }
    if (oldPin === newPin) {
      Alert.alert('Change PIN', 'New pin should be different from old pin');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Change PIN', 'Confirm the new pin no');
      return;
    }

    setLoading(true);
    try {
      const imei = await getDeviceId();
      const ok = await updateUserPin({
        COCD: '1',
        DIVCD: 1,
        LOCCD: 1,
        deviceID: imei,
        deviceIMEI: imei,
        UserID: userId,
        UserMobileNo: mobileNo,
        AppID: 3,
        oldPinCode: oldPin.trim(),
        newPinCode: newPin.trim(),
      });

      if (ok) {
        Alert.alert('API Response', 'UpdUserPinCd returned true: PIN changed successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('API Response', 'UpdUserPinCd returned false: PIN change failed.');
      }
    } catch (err) {
      console.error('[ChangePinScreen] Change PIN error:', err);
      Alert.alert('API Error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Change PIN" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Card style={styles.card}>
            <TextField
              label="Old PIN"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              value={oldPin}
              onChangeText={setOldPin}
            />
            <TextField
              label="New PIN"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              value={newPin}
              onChangeText={setNewPin}
            />
            <TextField
              label="Confirm new PIN"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              value={confirmPin}
              onChangeText={setConfirmPin}
            />
            <Button label="Update PIN" onPress={handleSubmit} loading={loading} fullWidth />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <LoadingOverlay visible={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { padding: spacing.lg, flexGrow: 1 },
  card: { padding: spacing.xl },
});

import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Screen, AppHeader, Button, TextField, LoadingOverlay } from '../../components';
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
        Alert.alert('Change Pin', 'Pin changed successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Change Pin', 'Some error occurred. Try again');
      }
    } catch {
      Alert.alert('Change Pin', 'Some error occurred. Try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Change PIN" onBack={() => navigation.goBack()} />
      <View style={styles.form}>
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
      </View>
      <LoadingOverlay visible={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.lg },
});

import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Button, Card, LoadingOverlay } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { getDeviceId } from '../../utils/deviceId';
import { fetchAuthToken, getUserMst, validateUser } from '../../api/services/auth';
import { getUserMobileNo, setMode, setUser } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';

export function EnterPinScreen({ navigation }: RootScreenProps<'EnterPin'>) {
  const [mobileNo, setMobileNo] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getUserMobileNo().then(setMobileNo);
  }, []);

  // Alert titles/messages below are transcribed verbatim from EnterPin.xaml.cs
  // (DisplayAlert calls) so the RN app shows the same user-facing text as MAUI,
  // instead of raw API/technical wording.
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
      await setMode('ip');
      if (user.UserTyp === '3') {
        navigation.reset({ index: 0, routes: [{ name: 'WardList' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'PatientList', params: undefined }] });
      }
    } catch (err) {
      console.error('[EnterPinScreen] PIN validation error:', err);
      Alert.alert('Validate User', 'Mobile not registered');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <AppHeader
        title="Security PIN"
        subtitle={mobileNo ? `Mobile: ${mobileNo}` : undefined}
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('Login'))}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          
          {/* Lock Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconBadgeContainer}>
              <View style={styles.iconGlowRing} />
              <View style={styles.iconBadge}>
                <Icon name="shield-key-outline" size={64} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.screenTitle}>Security Authorization</Text>
            
            {mobileNo ? (
              <View style={styles.mobilePill}>
                <Icon name="cellphone-check" size={14} color={colors.primary} />
                <Text style={styles.mobilePillText}>Verified Mobile: +91 {mobileNo}</Text>
              </View>
            ) : null}
          </View>

          {/* Main Card */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Enter Your 4-Digit PIN</Text>
              <Text style={styles.cardSubtitle}>
                Provide your security PIN to unlock doctor access & prescription records.
              </Text>
            </View>

            {/* Stable TextInput Box */}
            <View style={styles.fieldContainer}>
              <View style={styles.inputBox}>
                <Icon name="lock-outline" size={20} color={colors.primary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter 4-digit PIN"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  value={pin}
                  onChangeText={setPin}
                />
              </View>
            </View>

            <Button
              label="Unlock Application"
              onPress={handleSubmit}
              loading={loading}
              fullWidth
              style={styles.submitBtn}
            />

            <TouchableOpacity
              style={styles.changePinBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ChangePin')}>
              <Icon name="lock-reset" size={16} color={colors.accent} />
              <Text style={styles.changePinText}>Forgot or Change Security PIN?</Text>
            </TouchableOpacity>
          </Card>

          {/* Footer Security Note */}
          <View style={styles.footerContainer}>
            <Icon name="incognito" size={16} color={colors.textMuted} />
            <Text style={styles.footerText}>
              Keep your PIN confidential. Required for doctor authorization.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
      <LoadingOverlay visible={loading} label="Loading..." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: -spacing.md,
    marginBottom: spacing.xl,
  },
  iconBadgeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconGlowRing: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.primaryLight,
    opacity: 0.6,
  },
  iconBadge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryLight,
    ...shadow.card,
  },
  screenTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  mobilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  mobilePillText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  card: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  fieldContainer: {
    marginBottom: spacing.xl,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  submitBtn: {
    height: 52,
    borderRadius: radius.md,
  },
  changePinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  changePinText: {
    ...typography.bodyStrong,
    color: colors.accent,
    fontSize: 14,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
});

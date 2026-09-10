import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import type { User } from '../../types/models';

export function EnterPinScreen({ navigation }: RootScreenProps<'EnterPin'>) {
  const [mobileNo, setMobileNo] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  // Mirrors MainScreen.xaml/.xaml.cs: after a successful PIN, MAUI shows a
  // page with two hardcoded buttons ("IP List" / "OP List" — not API-driven)
  // and branches by UserTyp on IP. Shown here as a modal, gating navigation
  // until the user picks one.
  const [pendingUser, setPendingUser] = useState<User | null>(null);

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
      setPendingUser(user);
    } catch (err) {
      console.error('[EnterPinScreen] PIN validation error:', err);
      Alert.alert('Validate User', 'Mobile not registered');
    } finally {
      setLoading(false);
    }
  }

  // Mirrors MainScreen.xaml.cs's Handle_Clicked (IP List): UserTyp "1"/"2" go
  // to the regular patient list, "3" (RMO/ward-level user) goes to the ward
  // list instead.
  async function choosePatientType(type: 'ip' | 'op') {
    const user = pendingUser;
    setPendingUser(null);
    await setMode(type);
    if (type === 'op') {
      navigation.reset({ index: 0, routes: [{ name: 'OPPatientList' }] });
      return;
    }
    if (user?.UserTyp === '3') {
      navigation.reset({ index: 0, routes: [{ name: 'WardList' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'PatientList', params: undefined }] });
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

      {/* Mirrors MainScreen.xaml's "IP List" / "OP List" buttons — shown once,
          right after PIN validation, as a required choice before proceeding. */}
      <Modal visible={!!pendingUser} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconBadge}>
              <Icon name="account-question-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Select Patient Type</Text>
            <Text style={styles.modalSubtitle}>Choose which patient list you want to open.</Text>

            <TouchableOpacity
              style={styles.typeOption}
              activeOpacity={0.8}
              onPress={() => choosePatientType('ip')}>
              <View style={styles.typeIconBadge}>
                <Icon name="bed-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.typeTextWrap}>
                <Text style={styles.typeTitle}>IP Patient</Text>
                <Text style={styles.typeSubtitle}>In-patient prescriptions & records</Text>
              </View>
              <Icon name="chevron-right" size={22} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.typeOption}
              activeOpacity={0.8}
              onPress={() => choosePatientType('op')}>
              <View style={styles.typeIconBadge}>
                <Icon name="account-injury-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.typeTextWrap}>
                <Text style={styles.typeTitle}>OP Patient</Text>
                <Text style={styles.typeSubtitle}>Out-patient list</Text>
              </View>
              <Icon name="chevron-right" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  modalIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  typeIconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTextWrap: { flex: 1 },
  typeTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  typeSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});

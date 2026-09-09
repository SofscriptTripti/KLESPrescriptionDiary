import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, Button, Card, LoadingOverlay } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { getDeviceId } from '../../utils/deviceId';
import { getUserMst, updateUserMst, validateUser } from '../../api/services/auth';
import { setUser, setUserMobileNo } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';

const logo = require('../../assets/images/kles_logo.png');

export function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const [mobileNo, setMobileNo] = useState('');
  const [loading, setLoading] = useState(false);

  // Alert titles/messages below are transcribed verbatim from LoginPage.xaml.cs
  // (DisplayAlert / ToastHelp calls) so the RN app shows the same user-facing
  // text as MAUI, instead of raw API/technical wording.
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
    } catch (err) {
      console.error('[LoginScreen] Login process error:', err);
      Alert.alert('Validate User', 'Mobile is not registered / ValidateUser Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          
          {/* Hero Branding Section */}
          <View style={styles.heroSection}>
            <View style={styles.logoBadgeContainer}>
              <View style={styles.logoGlowRing} />
              <View style={styles.logoCard}>
                <Image source={logo} style={styles.logo} resizeMode="contain" />
              </View>
            </View>
            <Text style={styles.appTitle}>KLES Prescription Diary</Text>
            <View style={styles.portalTag}>
              <Icon name="shield-check" size={14} color={colors.primary} />
              <Text style={styles.portalTagText}>Official Doctor & Medical Staff Portal</Text>
            </View>
          </View>

          {/* Main Input Card */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Icon name="cellphone-text" size={24} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Mobile Verification</Text>
              <Text style={styles.cardSubtitle}>
                Enter your registered mobile number to receive access and authorize your device.
              </Text>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
              <View style={styles.inputBox}>
                <Icon
                  name="phone-in-talk"
                  size={20}
                  color={colors.primary}
                  style={styles.phoneIcon}
                />
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.flagText}>🇮🇳</Text>
                  <Text style={styles.countryCodeText}>+91</Text>
                  <View style={styles.codeDivider} />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobileNo}
                  onChangeText={setMobileNo}
                  autoFocus={false}
                />
                {mobileNo.length === 10 ? (
                  <Icon name="check-circle" size={20} color={colors.success} style={styles.checkIcon} />
                ) : null}
              </View>
            </View>

            <Button
              label="Continue to Sign In"
              onPress={handleSubmit}
              loading={loading}
              fullWidth
              style={styles.submitBtn}
            />

            <View style={styles.securityHint}>
              <Icon name="lock-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.securityHintText}>
                Your number is verified securely with KLES Hospital Server
              </Text>
            </View>
          </Card>

          {/* Footer Security Badge */}
          <View style={styles.footerContainer}>
            <Icon name="shield-lock-outline" size={16} color={colors.textMuted} />
            <Text style={styles.footerText}>256-Bit Encrypted Hospital System Connection</Text>
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
    marginBottom: spacing.xl * 1.5,
  },
  logoBadgeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoGlowRing: {
    position: 'absolute',
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: colors.primaryLight,
    opacity: 0.6,
  },
  logoCard: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryLight,
    ...shadow.card,
  },
  logo: { width: 96, height: 96 },
  appTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  portalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  portalTagText: {
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
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
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
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 54,
  },
  phoneIcon: {
    marginRight: spacing.xs,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.xs,
  },
  flagText: {
    fontSize: 16,
    marginRight: 4,
  },
  countryCodeText: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    fontSize: 15,
  },
  codeDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingVertical: 0,
    letterSpacing: 0.5,
  },
  checkIcon: {
    marginLeft: spacing.xs,
  },
  submitBtn: {
    height: 52,
    borderRadius: radius.md,
  },
  securityHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  securityHintText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
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

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, radius, shadow, spacing, typography } from '../theme';

interface PatientTypeModalProps {
  visible: boolean;
  onSelect: (type: 'ip' | 'op') => void;
  /** Omit to make the choice mandatory (no backdrop/close dismissal) — used
   * right after PIN entry, per MainScreen.xaml.cs having no way past its
   * IP/OP buttons other than picking one. Pass it on every other screen so
   * reopening this modal (e.g. from a list screen's back button) can be
   * cancelled without forcing a switch. */
  onDismiss?: () => void;
}

/** Mirrors MainScreen.xaml's "IP List" / "OP List" buttons — the two
 * hardcoded options MAUI shows (RMO is a separate toolbar icon there, not a
 * third option here). */
export function PatientTypeModal({ visible, onSelect, onDismiss }: PatientTypeModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onDismiss?.()}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => onDismiss?.()}>
        {/* activeOpacity={1} + no-op onPress: claims the touch so taps inside
            the box don't fall through to the backdrop's dismiss handler. */}
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.box}>
          {onDismiss ? (
            <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={onDismiss} hitSlop={8}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
          <View style={styles.iconBadge}>
            <Icon name="account-question-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Select Patient Type</Text>
          <Text style={styles.subtitle}>Choose which patient list you want to open.</Text>

          <TouchableOpacity style={styles.option} activeOpacity={0.8} onPress={() => onSelect('ip')}>
            <View style={styles.optionIcon}>
              <Icon name="bed-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>IP Patient</Text>
              <Text style={styles.optionSubtitle}>In-patient prescriptions & records</Text>
            </View>
            <Icon name="chevron-right" size={22} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} activeOpacity={0.8} onPress={() => onSelect('op')}>
            <View style={styles.optionIcon}>
              <Icon name="account-injury-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>OP Patient</Text>
              <Text style={styles.optionSubtitle}>Out-patient list</Text>
            </View>
            <Icon name="chevron-right" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  box: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  optionSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});

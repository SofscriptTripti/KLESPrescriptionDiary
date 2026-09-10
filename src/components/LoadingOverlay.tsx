import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface LoadingOverlayProps {
  visible: boolean;
  label?: string;
}

/**
 * Blocking loader overlay — replaces MAUI's ProgressLoader popup.
 *
 * Rendered as a plain in-tree View (not a react-native `Modal`) so it never overlaps a
 * screen's own `Modal` (e.g. a picker). Two `Modal`s transitioning in the same render batch
 * (one dismissing, one presenting) leaves an orphaned, touch-absorbing native view on iOS —
 * this component used to be a `Modal` itself and froze screens after the first picker
 * selection because of exactly that.
 */
export function LoadingOverlay({ visible, label = 'Loading…' }: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <View style={styles.backdrop} pointerEvents="auto">
      <View style={styles.box}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  label: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
});

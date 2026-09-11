import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView, Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface ScreenProps extends ViewProps {
  edges?: Edge[];
  padded?: boolean;
}

/**
 * Common full-screen container: themed background + safe-area handling.
 *
 * The 'top' edge is handled manually (a grey strip sized to the status-bar
 * inset) rather than via SafeAreaView, because Android's status bar is
 * always transparent under edge-to-edge — this strip is what's actually
 * visible behind its icons, not a StatusBar background color.
 */
export function Screen({ children, style, edges, padded, ...rest }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const resolvedEdges = edges ?? ['top', 'bottom', 'left', 'right'];
  const showTopInset = resolvedEdges.includes('top');

  return (
    <SafeAreaView
      style={[styles.safe, style]}
      edges={resolvedEdges.filter(edge => edge !== 'top')}
      {...rest}>
      {showTopInset ? <View style={{ height: insets.top, backgroundColor: colors.statusBar }} /> : null}
      <View style={[styles.body, padded && styles.padded]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  padded: { paddingHorizontal: 16 },
});

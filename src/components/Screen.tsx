import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface ScreenProps extends ViewProps {
  edges?: Edge[];
  padded?: boolean;
}

/** Common full-screen container: themed background + safe-area handling. */
export function Screen({ children, style, edges, padded, ...rest }: ScreenProps) {
  return (
    <SafeAreaView
      style={[styles.safe, style]}
      edges={edges ?? ['top', 'bottom', 'left', 'right']}
      {...rest}>
      <View style={[styles.body, padded && styles.padded]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  padded: { paddingHorizontal: 16 },
});

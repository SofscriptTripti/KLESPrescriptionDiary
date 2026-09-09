import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** Optional avatar/icon rendered before the title (e.g. a patient's gender avatar). */
  avatar?: React.ReactNode;
  centerTitle?: boolean;
}

/** Themed screen header — teal bar, back chevron, optional right-side action. */
export function AppHeader({ title, subtitle, onBack, right, avatar, centerTitle }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
            <Icon name="chevron-left" size={26} color={colors.textOnPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={[styles.centerWrap, centerTitle && styles.centered]}>
        {avatar ? <View style={styles.avatar}>{avatar}</View> : null}
        <View style={[styles.titleWrap, centerTitle && styles.titleWrapCenter]}>
          <Text style={[styles.title, centerTitle && styles.textCenter]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, centerTitle && styles.textCenter]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  left: { flexDirection: 'row', alignItems: 'center', minWidth: 32 },
  centerWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  centered: { justifyContent: 'center' },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs },
  avatar: { marginRight: spacing.sm },
  titleWrap: { flexShrink: 1 },
  titleWrapCenter: { alignItems: 'center' },
  title: { ...typography.h3, color: colors.textOnPrimary },
  subtitle: { ...typography.caption, color: colors.primaryLight, marginTop: 2 },
  textCenter: { textAlign: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', minWidth: 32, justifyContent: 'flex-end' },
});

import React from 'react';
import { Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme, useTheme, useThemedStyles } from '../theme';

type AppDestination = 'library' | 'account';

interface AppBottomNavigationProps {
  active: AppDestination;
  onOpenLibrary: () => void;
  onOpenAccount: () => void;
}

export function AppBottomNavigation({ active, onOpenLibrary, onOpenAccount }: AppBottomNavigationProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const items: Array<{
    key: AppDestination;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    activeIcon: React.ComponentProps<typeof Ionicons>['name'];
    onPress: () => void;
  }> = [
    { key: 'library', label: 'Thư viện', icon: 'library-outline', activeIcon: 'library', onPress: onOpenLibrary },
    { key: 'account', label: 'Tài khoản', icon: 'person-outline', activeIcon: 'person', onPress: onOpenAccount },
  ];

  return <View style={styles.container} accessibilityRole="tablist">
    {items.map(item => {
      const selected = active === item.key;
      return <TouchableOpacity key={item.key} accessibilityRole="tab" accessibilityState={{ selected }}
        accessibilityLabel={item.label} style={styles.item} onPress={item.onPress} disabled={selected} activeOpacity={0.75}>
        <View style={[styles.iconWrap, selected && styles.iconWrapActive]}>
          <Ionicons name={selected ? item.activeIcon : item.icon} size={21} color={selected ? theme.colors.textInverse : theme.colors.textMuted} />
        </View>
        <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}

const createStyles = (theme: AppTheme): {
  container: ViewStyle; item: ViewStyle; iconWrap: ViewStyle; iconWrapActive: ViewStyle;
  label: TextStyle; labelActive: TextStyle;
} => ({
  container: { minHeight: 62, flexShrink: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.border, paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xs, ...theme.shadows.md },
  item: { flex: 1, minHeight: 49, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xxs },
  iconWrap: { minWidth: 48, height: 28, borderRadius: theme.radius.full, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: theme.colors.primary },
  label: { ...theme.typography.caption, color: theme.colors.textMuted, fontWeight: '700' },
  labelActive: { color: theme.colors.primary, fontWeight: '900' },
});

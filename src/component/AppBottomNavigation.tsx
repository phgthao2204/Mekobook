import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

type AppDestination = 'library' | 'account';

interface AppBottomNavigationProps {
  active: AppDestination;
  onOpenLibrary: () => void;
  onOpenAccount: () => void;
}

export function AppBottomNavigation({ active, onOpenLibrary, onOpenAccount }: AppBottomNavigationProps) {
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
          <Ionicons name={selected ? item.activeIcon : item.icon} size={21} color={selected ? colors.surface : colors.muted} />
        </View>
        <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  container: { minHeight: 62, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 28, paddingTop: 7, paddingBottom: 5,
    elevation: 10, shadowColor: '#0F172A', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 8 },
  item: { flex: 1, minHeight: 49, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconWrap: { minWidth: 48, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: colors.primary },
  label: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  labelActive: { color: colors.primary, fontWeight: '900' },
});

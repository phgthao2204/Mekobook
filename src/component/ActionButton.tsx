import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { colors } from '../constants/theme';
export function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress}
    style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 10, marginTop: 12 }}>
    <Text style={{ color: colors.surface, fontWeight: '600' }}>{label}</Text>
  </TouchableOpacity>;
}

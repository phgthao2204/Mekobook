import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
export function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return <TouchableOpacity accessibilityRole="button" onPress={onPress}
    style={{ backgroundColor: theme.colors.primary, padding: theme.spacing.md,
      borderRadius: theme.radius.md, marginTop: theme.spacing.md }}>
    <Text style={[theme.typography.button, { color: theme.colors.textInverse }]}>{label}</Text>
  </TouchableOpacity>;
}

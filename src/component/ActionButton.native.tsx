import React from 'react';
import { Host, Button } from '@expo/ui';
import { useTheme } from '../theme';
export function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return <Host matchContents seedColor={theme.colors.primary} style={{ marginTop: theme.spacing.md }}>
    <Button label={label} onPress={onPress} />
  </Host>;
}

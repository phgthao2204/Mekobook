import React from 'react';
import { Host, Button } from '@expo/ui';
import { colors } from '../constants/theme';
export function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Host matchContents seedColor={colors.primary} style={{ marginTop: 12 }}>
    <Button label={label} onPress={onPress} />
  </Host>;
}

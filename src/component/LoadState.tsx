import React from 'react';
import { ActivityIndicator, Text, TextStyle, View, ViewStyle } from 'react-native';
import { AppTheme, useTheme, useThemedStyles } from '../theme';
import { ActionButton } from './ActionButton';
export function LoadState({ message = 'Đang tải dữ liệu...', error, onRetry, onBack }: {
  message?: string; error?: string; onRetry?: () => void; onBack?: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return <View style={styles.container}>
    {!error && <ActivityIndicator size="large" color={theme.colors.primary} />}
    <Text style={[styles.message, error ? { color: theme.colors.error } : null]}>{error || message}</Text>
    {error && onRetry && <ActionButton label="Thử lại" onPress={onRetry} />}
    {onBack && <ActionButton label="Quay lại" onPress={onBack} />}
  </View>;
}
const createStyles = (theme: AppTheme): { container: ViewStyle; message: TextStyle } => ({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, backgroundColor: theme.colors.background },
  message: { ...theme.typography.body, color: theme.colors.text, textAlign: 'center', marginVertical: theme.spacing.lg },
});

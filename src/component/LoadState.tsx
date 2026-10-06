import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { ActionButton } from './ActionButton';
export function LoadState({ message = 'Đang tải dữ liệu...', error, onRetry, onBack }: {
  message?: string; error?: string; onRetry?: () => void; onBack?: () => void;
}) {
  return <View style={styles.container}>
    {!error && <ActivityIndicator size="large" color={colors.primary} />}
    <Text style={[styles.message, error ? { color: colors.error } : null]}>{error || message}</Text>
    {error && onRetry && <ActionButton label="Thử lại" onPress={onRetry} />}
    {onBack && <ActionButton label="Quay lại" onPress={onBack} />}
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  message: { color: colors.text, textAlign: 'center', marginVertical: 16 },
});

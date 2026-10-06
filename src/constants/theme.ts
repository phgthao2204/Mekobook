import { DefaultTheme } from '@react-navigation/native';
export const colors = {
  primary: '#059669', background: '#F8FAFC', surface: '#FFFFFF',
  text: '#0F172A', muted: '#64748B', border: '#E2E8F0', error: '#B91C1C',
};
export const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background,
    card: colors.surface, text: colors.text, border: colors.border },
};

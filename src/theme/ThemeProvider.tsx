import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { ColorSchemeName, StyleSheet, useColorScheme } from 'react-native';
import { darkColors, lightColors, ThemeColors } from './colors';
import { radius, shadows } from './effects';
import { spacing } from './spacing';
import { typography } from './typography';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>;

export interface AppTheme {
  mode: ResolvedThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
}

interface ThemeContextValue extends AppTheme {
  preference: ThemeMode;
  setPreference: (mode: ThemeMode) => void;
}

export function createAppTheme(mode: ResolvedThemeMode): AppTheme {
  return { mode, isDark: mode === 'dark', colors: mode === 'dark' ? darkColors : lightColors,
    typography, spacing, radius, shadows };
}

const defaultTheme = createAppTheme('light');
const ThemeContext = createContext<ThemeContextValue>({ ...defaultTheme, preference: 'system', setPreference: () => {} });

function resolveMode(preference: ThemeMode, system: ColorSchemeName): ResolvedThemeMode {
  return preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
}

export function ThemeProvider({ children, initialMode = 'light' }: PropsWithChildren<{ initialMode?: ThemeMode }>) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<ThemeMode>(initialMode);
  const value = useMemo<ThemeContextValue>(() => ({
    ...createAppTheme(resolveMode(preference, system)), preference, setPreference,
  }), [preference, system]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function useThemedStyles<T>(factory: (theme: AppTheme) => T): T {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme) as StyleSheet.NamedStyles<unknown>) as T, [factory, theme]);
}

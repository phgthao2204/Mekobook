export const palette = {
  emerald50: '#ECFDF5', emerald100: '#D1FAE5', emerald200: '#A7F3D0',
  emerald400: '#34D399', emerald500: '#10B981', emerald600: '#059669', emerald700: '#047857', emerald800: '#065F46',
  slate50: '#F8FAFC', slate100: '#F1F5F9', slate200: '#E2E8F0', slate300: '#CBD5E1',
  slate400: '#94A3B8', slate500: '#64748B', slate600: '#475569', slate700: '#334155', slate800: '#1E293B', slate900: '#0F172A',
  red50: '#FEF2F2', red200: '#FECACA', red400: '#F87171', red600: '#DC2626', red700: '#B91C1C',
  amber50: '#FFFBEB', amber200: '#FDE68A', amber500: '#F59E0B', amber700: '#B45309',
  blue50: '#EFF6FF', blue500: '#3B82F6', blue600: '#2563EB',
  violet500: '#8B5CF6', pink500: '#EC4899', white: '#FFFFFF', black: '#000000',
} as const;

export interface ThemeColors {
  primary: string; primaryPressed: string; primarySoft: string; secondary: string;
  background: string; surface: string; surfaceRaised: string; surfaceMuted: string;
  text: string; textSecondary: string; textMuted: string; textInverse: string; muted: string;
  border: string; borderStrong: string;
  error: string; errorSoft: string; success: string; successSoft: string;
  warning: string; warningSoft: string; info: string; infoSoft: string;
  disabled: string; overlay: string; shadow: string;
}

export const lightColors: ThemeColors = {
  primary: palette.emerald600, primaryPressed: palette.emerald700, primarySoft: palette.emerald50,
  secondary: palette.blue600,
  background: palette.slate50, surface: palette.white, surfaceRaised: palette.white, surfaceMuted: palette.slate100,
  text: palette.slate900, textSecondary: palette.slate600, textMuted: palette.slate500, textInverse: palette.white, muted: palette.slate500,
  border: palette.slate200, borderStrong: palette.slate300,
  error: palette.red700, errorSoft: palette.red50, success: palette.emerald600, successSoft: palette.emerald50,
  warning: palette.amber700, warningSoft: palette.amber50, info: palette.blue600, infoSoft: palette.blue50,
  disabled: palette.slate400, overlay: 'rgba(15, 23, 42, 0.56)', shadow: palette.slate900,
};

export const darkColors: ThemeColors = {
  primary: palette.emerald400, primaryPressed: palette.emerald500, primarySoft: '#123D35',
  secondary: '#60A5FA',
  background: '#0B1220', surface: '#111827', surfaceRaised: '#18212F', surfaceMuted: palette.slate800,
  text: palette.slate50, textSecondary: palette.slate300, textMuted: palette.slate400, textInverse: palette.slate900, muted: palette.slate400,
  border: palette.slate700, borderStrong: palette.slate600,
  error: palette.red400, errorSoft: '#3F1D24', success: palette.emerald400, successSoft: '#123D35',
  warning: '#FBBF24', warningSoft: '#422F12', info: '#60A5FA', infoSoft: '#172F52',
  disabled: palette.slate500, overlay: 'rgba(2, 6, 23, 0.76)', shadow: palette.black,
};

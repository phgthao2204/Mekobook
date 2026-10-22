import { ViewStyle } from 'react-native';
import { palette } from './colors';

export const radius = { none: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 999 } as const;

export const shadows: Record<'none' | 'sm' | 'md' | 'lg', ViewStyle> = {
  none: {},
  sm: { elevation: 2, shadowColor: palette.slate900, shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  md: { elevation: 4, shadowColor: palette.slate900, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  lg: { elevation: 8, shadowColor: palette.slate900, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
};

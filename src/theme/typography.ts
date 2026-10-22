import { Platform, TextStyle } from 'react-native';

export const fontFamilies = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
  medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }) as string,
  bold: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
} as const;

const style = (fontSize: number, lineHeight: number, fontWeight: TextStyle['fontWeight'] = '400'): TextStyle => ({
  fontFamily: fontWeight === '400' ? fontFamilies.regular : fontWeight === '500' || fontWeight === '600' ? fontFamilies.medium : fontFamilies.bold,
  fontSize, lineHeight, fontWeight,
});

export const typography = {
  h1: style(32, 40, '800'),
  h2: style(28, 36, '800'),
  h3: style(24, 32, '800'),
  h4: style(20, 28, '700'),
  h5: style(18, 24, '700'),
  h6: style(16, 22, '700'),
  bodyLarge: style(16, 24),
  body: style(14, 20),
  bodyMedium: style(14, 20, '600'),
  bodySmall: style(12, 18),
  label: style(13, 18, '700'),
  caption: style(11, 16),
  button: style(14, 20, '700'),
} as const;

export type TypographyToken = keyof typeof typography;

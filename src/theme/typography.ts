// Reuses the same OpenSans family the MAUI app shipped (Resources/Fonts), linked
// via react-native.config.js -> assets/fonts.
export const fonts = {
  regular: 'OpenSans-Regular',
  semibold: 'OpenSans-Semibold',
} as const;

export const typography = {
  h1: { fontFamily: fonts.semibold, fontSize: 26, lineHeight: 32 },
  h2: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 27 },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
} as const;

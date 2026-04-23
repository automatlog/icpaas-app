// src/theme/index.js
// icpaas.ai Brand Theme — Studio-Editorial flow overlay

import { Platform, useColorScheme } from 'react-native';

// Studio-editorial palette — light (paper) variant
export const LightEditorial = {
  scheme: 'light',
  paper: '#F4EFE6',
  paperWarm: '#EAE2D2',
  paperSoft: '#FBF7EE',
  ink: '#0E0D0C',
  inkSoft: '#3C3A36',
  inkMute: '#8A867E',
  rule: 'rgba(14,13,12,0.12)',
  ruleSoft: 'rgba(14,13,12,0.06)',
  oxblood: '#7A2129',
  oxbloodDeep: '#4E161B',
  sage: '#748B7A',
  umber: '#A15E2A',
  gold: '#B08839',
  sky: '#2F5D62',
  press: 'rgba(122,33,41,0.08)',
  gradA: '#7A2129',
  gradB: '#B08839',
  gradC: '#2F5D62',
  barTrack: 'rgba(14,13,12,0.08)',
};

// Studio-editorial palette — dark (charcoal) variant
export const DarkEditorial = {
  scheme: 'dark',
  paper: '#14120E',
  paperWarm: '#1F1C16',
  paperSoft: '#201C16',
  ink: '#F5EDD9',
  inkSoft: '#C4B994',
  inkMute: '#8A836E',
  rule: 'rgba(245,237,217,0.14)',
  ruleSoft: 'rgba(245,237,217,0.06)',
  oxblood: '#E08A7F',
  oxbloodDeep: '#F0B5AB',
  sage: '#A1B79F',
  umber: '#D99263',
  gold: '#D9B65C',
  sky: '#7DA8AE',
  press: 'rgba(224,138,127,0.14)',
  gradA: '#E08A7F',
  gradB: '#D9B65C',
  gradC: '#7DA8AE',
  barTrack: 'rgba(245,237,217,0.12)',
};

// Back-compat static export — light palette. Prefer useEditorial() for adaptive.
export const Editorial = LightEditorial;

export const useEditorial = () => {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DarkEditorial : LightEditorial;
};

// Feed (dark social) palette — oversize typography, vibrant card tints, gradient CTA
export const Feed = {
  bg: '#0A0A0D',
  bgSoft: '#141418',
  bgInput: '#1C1C22',
  bgCard: '#16161B',
  text: '#FFFFFF',
  textMuted: '#9A9AA2',
  textDim: '#5C5C63',
  border: '#26262E',
  rule: 'rgba(255,255,255,0.08)',
  ruleSoft: 'rgba(255,255,255,0.04)',

  accentPink: '#FF4D7E',
  accentOrange: '#FF8A3D',
  accentPurple: '#B765E8',
  accentMagenta: '#E6428A',
  accentCyan: '#5CD4E0',

  tintPeach: '#E8B799',
  tintMint: '#8FCFBD',
  tintLavender: '#D4B3E8',
  tintYellow: '#E8D080',
  tintRose: '#F2A8B3',
  tintSage: '#9CB89A',
  tintClay: '#CB8A75',

  gradA: '#FF4D7E',
  gradB: '#FF8A3D',
  gradC: '#B765E8',
};

export const LightFeed = {
  bg: '#FAFAFB',
  bgSoft: '#F2F2F5',
  bgInput: '#ECECEF',
  bgCard: '#FFFFFF',
  text: '#0A0A0D',
  textMuted: '#5C5C63',
  textDim: '#9A9AA2',
  border: '#DCDCE2',
  rule: 'rgba(10,10,13,0.08)',
  ruleSoft: 'rgba(10,10,13,0.04)',

  accentPink: '#E6428A',
  accentOrange: '#FF7A22',
  accentPurple: '#9A47D4',
  accentMagenta: '#C93370',
  accentCyan: '#2FB8C4',

  tintPeach: '#E8B799',
  tintMint: '#8FCFBD',
  tintLavender: '#D4B3E8',
  tintYellow: '#E8D080',
  tintRose: '#F2A8B3',
  tintSage: '#9CB89A',
  tintClay: '#CB8A75',

  gradA: '#E6428A',
  gradB: '#FF7A22',
  gradC: '#9A47D4',
};

export const useFeed = () => {
  const scheme = useColorScheme();
  return scheme === 'light' ? LightFeed : Feed;
};

// Colors is remapped to Feed (dark social) tokens so legacy screens inherit the unified palette.
export const Colors = {
  // Brand
  primary: '#B765E8',
  secondary: '#FF4D7E',
  primaryLight: 'rgba(183,101,232,0.14)',
  secondaryLight: 'rgba(255,77,126,0.14)',

  // Gradient stops
  gradientStart: '#534AB7',
  gradientMid: '#FF8A3D',
  gradientEnd: '#B765E8',

  // Channel colors (muted for dark feed)
  whatsapp: '#4BD08D',
  whatsappDark: '#2F9B67',
  sms: '#B765E8',
  rcs: '#E8D080',
  ivr: '#5CD4E0',
  missedCall: '#FF4D7E',

  // Backgrounds (dark feed)
  background: '#0A0A0D',
  backgroundAlt: '#141418',
  card: '#16161B',
  cardAlt: '#1C1C22',

  // Text (dark feed)
  textDark: '#FFFFFF',
  textMuted: '#9A9AA2',
  textLight: '#5C5C63',

  // Status
  success: '#4BD08D',
  warning: '#E8D080',
  danger: '#FF4D7E',
  info: '#5CD4E0',

  // UI
  border: '#26262E',
  divider: 'rgba(255,255,255,0.08)',
  shadow: 'rgba(0,0,0,0.4)',
  overlay: 'rgba(0,0,0,0.7)',

  // Nav
  navBackground: '#141418',
  navActive: '#FFFFFF',
  navInactive: '#5C5C63',

  white: '#FFFFFF',
  black: '#000000',
};

export const Fonts = {
  regular: 'DMSans-Regular',
  medium: 'DMSans-Medium',
  semiBold: 'DMSans-SemiBold',
  bold: 'DMSans-Bold',
  mono: 'DMMono-Regular',
  monoMedium: 'DMMono-Medium',
  // Editorial additions — platform-safe serif/sans stacks for Studio aesthetic
  display: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia, "Times New Roman", "Hoefler Text", serif',
  }),
  displayItalic: Platform.select({
    ios: 'Georgia-Italic',
    android: 'serif',
    default: 'Georgia, "Times New Roman", serif',
  }),
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia, "Times New Roman", serif',
  }),
  sans: Platform.select({
    ios: 'Helvetica Neue',
    android: 'sans-serif',
    default: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  }),
  caps: Platform.select({
    ios: 'Helvetica Neue',
    android: 'sans-serif',
    default: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  }),
  code: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: '"SF Mono", Menlo, Consolas, "Courier New", monospace',
  }),
};

export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  hero: 32,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

export const Shadows = {
  sm: {
    shadowColor: '#534AB7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#534AB7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#534AB7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 10,
  },
};

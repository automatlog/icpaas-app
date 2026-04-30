// src/theme/index.js — icpaas.ai brand tokens (emerald-green primary).
// NativeWind handles utilities; runtime imports Brand/LightBrand + useBrand.

import { Platform, useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';

// Dark (black) brand palette — channel screens + chat
export const Brand = {
  scheme: 'dark',
  bg: '#000000',
  bgSoft: '#0F0F12',
  bgCard: '#17171B',
  bgInput: '#1F1F24',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  textDim: '#6B7280',
  border: '#1F2937',
  rule: 'rgba(255,255,255,0.08)',

  primary: '#10B981',
  primaryDeep: '#0B8A6F',
  primaryMint: '#34D399',
  primarySoft: 'rgba(16,185,129,0.18)',

  chWa: '#10B981',
  chSms: '#0B8A6F',
  chRcs: '#3B82F6',
  chVoice: '#10B981',
  chIvr: '#8B5CF6',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  gWordA: '#10B981',
  gWordB: '#06B6D4',
  gWordC: '#8B5CF6',

  gCtaA: '#EC4899',
  gCtaB: '#F97316',
  gCtaC: '#A855F7',
};

// Light (white) brand palette — home + most screens
export const LightBrand = {
  scheme: 'light',
  bg: '#FFFFFF',
  bgSoft: '#F9FAFB',
  bgCard: '#FFFFFF',
  bgInput: '#F3F4F6',
  text: '#111827',
  textMuted: '#6B7280',
  textDim: '#9CA3AF',
  border: '#E5E7EB',
  rule: '#F3F4F6',

  primary: '#0B8A6F',
  primaryDeep: '#067258',
  primaryMint: '#10B981',
  primarySoft: '#D1FAE5',

  chWa: '#10B981',
  chSms: '#0B8A6F',
  chRcs: '#3B82F6',
  chVoice: '#10B981',
  chIvr: '#8B5CF6',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  gWordA: '#10B981',
  gWordB: '#06B6D4',
  gWordC: '#8B5CF6',

  gCtaA: '#EC4899',
  gCtaB: '#F97316',
  gCtaC: '#A855F7',
};

// Theme resolution order:
//   1. Redux `theme.mode` if 'light' or 'dark' (user-controlled override)
//   2. OS preference via useColorScheme() if mode === 'system'
//   3. Light as the final fallback (app default)
export const useBrand = () => {
  const scheme = useColorScheme();
  const mode = useSelector((s) => s.theme?.mode || 'light');
  if (mode === 'dark') return Brand;
  if (mode === 'light') return LightBrand;
  // mode === 'system'
  return scheme === 'dark' ? Brand : LightBrand;
};

// Back-compat aliases for screens still on the previous Feed names. Map onto Brand.
export const Feed = Brand;
export const LightFeed = LightBrand;
export const useFeed = useBrand;

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
  // Platform-safe font stacks for cross-platform rendering
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

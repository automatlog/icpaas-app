/** @type {import('tailwindcss').Config} */
//
// Single source of truth for static colour utilities. Mirrors the LightBrand
// palette in src/theme/index.js. Use these classes for theme-INDEPENDENT
// surfaces (the brand green is the same in light + dark themes, so
// `bg-primary` works either way). For theme-AWARE values that flip between
// light and dark — `text`, `bgCard`, `border`, etc. — keep using the runtime
// `c` object from `useBrand()` via inline style.
//
// Naming groups:
//   primary*  →  brand emerald-green (CTAs, accents, status bar inset, FAB)
//   secondary →  neutral grey (cancel, secondary buttons)
//   info / success / warning / danger → status semantics
//   text / textMuted / textDim → readable typography (light theme defaults)
//   bg / bgSoft / bgCard / bgInput / border → light surfaces
//   night*    →  dark-theme surfaces (when a screen needs to hardcode dark)
//   ch*       →  per-channel accents (WhatsApp / SMS / RCS / Voice / IVR)
//   g*        →  gradient stops
module.exports = {
  content: ['./App.js', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand primary (always green — same in both themes)
        primary:     '#0B8A6F',
        primaryDeep: '#067258',
        primaryMint: '#10B981',
        primarySoft: '#D1FAE5',
        primaryLight: '#D1FAE5', // legacy alias

        // Secondary (neutral grey for cancel / outline buttons)
        secondary:     '#6B7280',
        secondaryDeep: '#4B5563',
        secondarySoft: '#F3F4F6',

        // Status / semantic
        success: '#10B981',
        warning: '#F59E0B',
        danger:  '#EF4444',
        info:    '#3B82F6',
        infoDeep: '#1D4ED8',
        infoSoft: '#DBEAFE',
        successSoft: '#D1FAE5',
        warningSoft: '#FEF3C7',
        dangerSoft: '#FEE2E2',

        // Light-theme typography
        text:      '#111827',
        textSoft:  '#374151',
        textMuted: '#6B7280',
        textDim:   '#9CA3AF',

        // Light-theme surfaces
        bg:       '#FFFFFF',
        bgSoft:   '#F9FAFB',
        bgCard:   '#FFFFFF',
        bgInput:  '#F3F4F6',
        border:   '#E5E7EB',
        rule:     '#F3F4F6',

        // Legacy "ink" aliases (kept for any class still using them)
        ink:      '#111827',
        inkSoft:  '#374151',
        inkMute:  '#6B7280',
        inkDim:   '#9CA3AF',
        ruleSoft: '#F3F4F6',

        // Dark surfaces
        nightBg:    '#000000',
        nightCard:  '#0F0F12',
        nightSoft:  '#17171B',
        nightInput: '#1F1F24',
        nightRule:  '#1F2937',
        nightInk:   '#F9FAFB',
        nightMute:  '#9CA3AF',
        nightDim:   '#6B7280',

        // Channel accents
        chWa:    '#10B981',
        chSms:   '#0B8A6F',
        chRcs:   '#8B5CF6',
        chVoice: '#F59E0B',
        chIvr:   '#8B5CF6',

        // Gradient stops — wordmark
        gWordA: '#10B981',
        gWordB: '#06B6D4',
        gWordC: '#8B5CF6',

        // Gradient stops — sign-in CTA
        gCtaA: '#EC4899',
        gCtaB: '#F97316',
        gCtaC: '#A855F7',
      },
      fontFamily: {
        sans: ['System'],
        mono: ['monospace'],
      },
    },
  },
  plugins: [],
};

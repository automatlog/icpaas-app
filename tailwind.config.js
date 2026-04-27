/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.js', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand emerald-green primary
        primary: '#0B8A6F',
        primaryDeep: '#067258',
        primaryMint: '#10B981',
        primaryLight: '#D1FAE5',

        // Surface / typography
        ink: '#111827',
        inkSoft: '#374151',
        inkMute: '#6B7280',
        inkDim: '#9CA3AF',
        rule: '#E5E7EB',
        ruleSoft: '#F3F4F6',

        // Dark surfaces
        nightBg: '#000000',
        nightCard: '#0F0F12',
        nightSoft: '#17171B',
        nightInput: '#1F1F24',
        nightRule: '#1F2937',
        nightInk: '#F9FAFB',
        nightMute: '#9CA3AF',
        nightDim: '#6B7280',

        // Channel accents
        chWa: '#10B981',
        chSms: '#0B8A6F',
        chRcs: '#3B82F6',
        chVoice: '#10B981',
        chIvr: '#8B5CF6',

        // Status
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',

        // Gradient stops — wordmark (loading)
        gWordA: '#10B981',
        gWordB: '#06B6D4',
        gWordC: '#8B5CF6',

        // Gradient stops — sign-in CTA / sign-in underline
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

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.js', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Feed dark — mirrors src/theme Feed palette
        bg: '#0A0A0D',
        bgSoft: '#141418',
        bgInput: '#1C1C22',
        bgCard: '#16161B',
        ink: '#FFFFFF',
        textMuted: '#9A9AA2',
        textDim: '#5C5C63',
        rule: '#26262E',

        pink: '#FF4D7E',
        orange: '#FF8A3D',
        purple: '#B765E8',
        cyan: '#5CD4E0',

        peach: '#E8B799',
        mint: '#8FCFBD',
        lavender: '#D4B3E8',
        yellow: '#E8D080',
        rose: '#F2A8B3',
        sage: '#9CB89A',
        clay: '#CB8A75',
      },
      fontFamily: {
        sans: ['System'],
        mono: ['monospace'],
      },
    },
  },
  plugins: [],
};

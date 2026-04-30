// src/store/slices/themeSlice.js — user-controlled theme override.
// Default is 'light'. The Profile screen exposes a toggle to switch to
// 'dark'. Setting 'system' (not currently surfaced in UI) makes the app
// follow the OS preference. `useBrand()` reads this slice and falls back
// to useColorScheme() when mode === 'system'.
import { createSlice } from '@reduxjs/toolkit';

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: 'light', // 'light' | 'dark' | 'system'
  },
  reducers: {
    setThemeMode(state, action) {
      const next = action.payload;
      if (next === 'light' || next === 'dark' || next === 'system') {
        state.mode = next;
      }
    },
    toggleDarkMode(state) {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
    },
  },
});

export const { setThemeMode, toggleDarkMode } = themeSlice.actions;
export const selectThemeMode = (s) => s.theme?.mode || 'light';
export default themeSlice.reducer;

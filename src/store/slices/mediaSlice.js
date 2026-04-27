import { createSlice } from '@reduxjs/toolkit';

const initialState = [];

const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    addMedia(state, action) {
      const next = action.payload;
      if (!next?.fileId) return state;
      const i = state.findIndex((m) => m.fileId === next.fileId);
      if (i === -1) return [next, ...state];
      const copy = state.slice();
      copy[i] = { ...copy[i], ...next };
      return copy;
    },
    updateMedia(state, action) {
      const { fileId, ...patch } = action.payload || {};
      if (!fileId) return state;
      return state.map((m) => (m.fileId === fileId ? { ...m, ...patch } : m));
    },
    removeMedia(state, action) {
      return state.filter((m) => m.fileId !== action.payload);
    },
    setMedia(_state, action) {
      return Array.isArray(action.payload) ? action.payload : [];
    },
  },
});

export const { addMedia, updateMedia, removeMedia, setMedia } = mediaSlice.actions;
export default mediaSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';

const templatesSlice = createSlice({
  name: 'templates',
  initialState: [],
  reducers: {
    setTemplates(_state, action) {
      return Array.isArray(action.payload) ? action.payload : [];
    },
  },
});

export const { setTemplates } = templatesSlice.actions;
export default templatesSlice.reducer;

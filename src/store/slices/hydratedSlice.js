import { createSlice } from '@reduxjs/toolkit';

const hydratedSlice = createSlice({
  name: 'hydrated',
  initialState: false,
  reducers: {
    setHydrated(_state, action) {
      return Boolean(action.payload);
    },
  },
});

export const { setHydrated } = hydratedSlice.actions;
export default hydratedSlice.reducer;

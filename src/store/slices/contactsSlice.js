import { createSlice } from '@reduxjs/toolkit';

const upsertById = (items, next) => {
  const i = items.findIndex((item) => item.id === next.id);
  if (i === -1) return [next, ...items];
  const copy = items.slice();
  copy[i] = { ...copy[i], ...next };
  return copy;
};

const contactsSlice = createSlice({
  name: 'contacts',
  initialState: [],
  reducers: {
    setContacts(_state, action) {
      return Array.isArray(action.payload) ? action.payload : [];
    },
    upsertContact(state, action) {
      return upsertById(state, action.payload);
    },
  },
});

export const { setContacts, upsertContact } = contactsSlice.actions;
export default contactsSlice.reducer;

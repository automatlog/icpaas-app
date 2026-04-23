import { createSlice } from '@reduxjs/toolkit';

const upsertById = (items, next) => {
  const i = items.findIndex((item) => item.id === next.id);
  if (i === -1) return [next, ...items];
  const copy = items.slice();
  copy[i] = { ...copy[i], ...next };
  return copy;
};

const sumUnread = (items) =>
  items.reduce((total, conv) => total + (conv.unread || 0), 0);

const initialState = {
  list: [],
  badge: 0,
};

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    setConversations(state, action) {
      const list = Array.isArray(action.payload) ? action.payload : [];
      state.list = list;
      state.badge = sumUnread(list);
    },
    upsertConversation(state, action) {
      const next = upsertById(state.list, action.payload);
      state.list = next;
      state.badge = sumUnread(next);
    },
  },
});

export const { setConversations, upsertConversation } = conversationsSlice.actions;
export default conversationsSlice.reducer;

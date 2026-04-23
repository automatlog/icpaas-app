import { createSlice } from '@reduxjs/toolkit';

const messagesSlice = createSlice({
  name: 'messages',
  initialState: {},
  reducers: {
    setConversationMessages(state, action) {
      const { conversationId, messages } = action.payload;
      state[conversationId] = Array.isArray(messages) ? messages : [];
    },
    appendConversationMessage(state, action) {
      const { conversationId, message } = action.payload;
      state[conversationId] = [...(state[conversationId] || []), message];
    },
    updateConversationMessage(state, action) {
      const { conversationId, messageId, updates } = action.payload;
      const list = state[conversationId] || [];
      state[conversationId] = list.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m,
      );
    },
  },
});

export const {
  setConversationMessages,
  appendConversationMessage,
  updateConversationMessage,
} = messagesSlice.actions;
export default messagesSlice.reducer;

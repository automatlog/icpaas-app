import { createSlice, nanoid } from '@reduxjs/toolkit';

// Notification kinds — drive the icon + color tint in the UI.
// kind: 'balance' | 'campaign-success' | 'campaign-stuck' | 'campaign-failed'
//     | 'template-created' | 'system' | 'info'

const initialState = {
  list: [],          // [{ id, kind, title, body, ts, read }]
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    pushNotification: {
      reducer(state, action) {
        state.list.unshift(action.payload);
        if (state.list.length > 100) state.list.pop();
      },
      prepare({ kind, title, body }) {
        return {
          payload: {
            id: nanoid(),
            kind: kind || 'info',
            title: title || 'Notification',
            body: body || '',
            ts: Date.now(),
            read: false,
          },
        };
      },
    },
    removeNotification(state, action) {
      state.list = state.list.filter((n) => n.id !== action.payload);
    },
    markAllRead(state) {
      state.list.forEach((n) => { n.read = true; });
    },
    clearNotifications() {
      return initialState;
    },
  },
});

export const {
  pushNotification,
  removeNotification,
  markAllRead,
  clearNotifications,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;

// --- Selectors ---
export const selectNotifications = (s) => s.notifications.list;
export const selectUnreadCount   = (s) => s.notifications.list.filter((n) => !n.read).length;

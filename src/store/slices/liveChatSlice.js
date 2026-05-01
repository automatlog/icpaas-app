// Live Agent state — mirrors OmniApp's WhatsApp Live Chat surface.
// See docs/connection.md §7 for the slice shape and action contract.
import { createSlice } from '@reduxjs/toolkit';

const emptyCounts = {
  AllCount: 0,
  UnAssignedCount: 0,
  AssignedCount: 0,
  UnReadChatCount: 0,
  RepliedChatCount: 0,
  BlockContacts: 0,
  FavouriteContacts: 0,
  OpenChat: 0,
  PendingChat: 0,
  SolvedChat: 0,
};

const initialState = {
  connection: {
    status: 'idle', // idle | connecting | connected | reconnecting | disconnected
    error: null,
    lastConnectedAt: null,
  },
  channels: [],
  selectedChannel: 'All',
  counts: emptyCounts,
  chatList: {
    filter: 'All',
    search: '',
    pageIndex: 1,
    totalPages: 1,
    totalCount: 0,
    items: [],
    loading: false,
  },
  threads: {}, // { [waId]: { channel, messages: [], oldestId, hasMore, loading } }
  activeWaId: null,
  activeChannel: null,
};

const ensureThread = (state, waId) => {
  if (!state.threads[waId]) {
    state.threads[waId] = {
      channel: null,
      messages: [],
      oldestId: null,
      hasMore: true,
      loading: false,
    };
  }
  return state.threads[waId];
};

// Returns the WAInboxId field from a ChatModel, defending against casing
// drift between SQL/ClickHouse projections.
const messageInboxId = (msg) =>
  msg?.WAInboxId ?? msg?.waInboxId ?? msg?.id ?? null;

const messageId = (msg) => msg?.MessageId ?? msg?.messageId ?? null;

const liveChatSlice = createSlice({
  name: 'liveChat',
  initialState,
  reducers: {
    // ---------- connection lifecycle ----------
    connectionStatusChanged(state, action) {
      const { status, error = null } = action.payload || {};
      state.connection.status = status;
      state.connection.error = error;
      if (status === 'connected') {
        state.connection.lastConnectedAt = Date.now();
      }
    },

    // ---------- chat list ----------
    setChannels(state, action) {
      state.channels = Array.isArray(action.payload) ? action.payload : [];
    },
    setSelectedChannel(state, action) {
      state.selectedChannel = action.payload || 'All';
    },
    setFilter(state, action) {
      state.chatList.filter = action.payload || 'All';
      state.chatList.pageIndex = 1;
    },
    setSearch(state, action) {
      state.chatList.search = action.payload || '';
      state.chatList.pageIndex = 1;
    },
    setCounts(state, action) {
      state.counts = { ...emptyCounts, ...(action.payload || {}) };
    },
    chatListLoading(state, action) {
      state.chatList.loading = action.payload !== false;
    },
    setChatList(state, action) {
      const { items, currentPage = 1, totalPages = 1, totalCount = 0 } = action.payload || {};
      state.chatList.items = Array.isArray(items) ? items : [];
      state.chatList.pageIndex = currentPage;
      state.chatList.totalPages = totalPages;
      state.chatList.totalCount = totalCount;
      state.chatList.loading = false;
    },
    appendChatList(state, action) {
      const { items, currentPage, totalPages, totalCount } = action.payload || {};
      const existingIds = new Set(state.chatList.items.map((c) => c.WANumber || c.wa_id));
      const fresh = (items || []).filter(
        (c) => !existingIds.has(c.WANumber || c.wa_id),
      );
      state.chatList.items = [...state.chatList.items, ...fresh];
      if (currentPage) state.chatList.pageIndex = currentPage;
      if (totalPages) state.chatList.totalPages = totalPages;
      if (typeof totalCount === 'number') state.chatList.totalCount = totalCount;
      state.chatList.loading = false;
    },

    // ---------- threads ----------
    setActive(state, action) {
      const { waId, channel } = action.payload || {};
      state.activeWaId = waId || null;
      state.activeChannel = channel || null;
    },
    threadLoading(state, action) {
      const { waId, loading = true } = action.payload || {};
      if (!waId) return;
      const thread = ensureThread(state, waId);
      thread.loading = loading;
    },
    setThread(state, action) {
      // First page load (no beforeId). Replaces messages.
      const { waId, channel, messages = [], hasMore = false } = action.payload || {};
      if (!waId) return;
      const thread = ensureThread(state, waId);
      thread.channel = channel || thread.channel;
      thread.messages = messages;
      thread.hasMore = hasMore;
      thread.oldestId = messages.length ? messageInboxId(messages[0]) : null;
      thread.loading = false;
    },
    prependThread(state, action) {
      // Cursor scroll-up. Prepends older messages, recomputes oldestId.
      const { waId, messages = [], hasMore = false } = action.payload || {};
      if (!waId) return;
      const thread = ensureThread(state, waId);
      thread.messages = [...messages, ...thread.messages];
      thread.hasMore = hasMore;
      thread.oldestId = thread.messages.length ? messageInboxId(thread.messages[0]) : thread.oldestId;
      thread.loading = false;
    },

    // ---------- realtime arrivals ----------
    receiveLiveMessage(state, action) {
      const chat = action.payload;
      const waId = chat?.wa_id || chat?.SenderNumber;
      if (!waId) return;

      // 1. Append to thread if open.
      const thread = state.threads[waId];
      if (thread) {
        thread.messages = [...thread.messages, chat];
      }

      // 2. Upsert into chat list (move to top, refresh preview).
      const existing = state.chatList.items.findIndex(
        (c) => (c.WANumber || c.wa_id) === waId,
      );
      const preview = {
        WANumber: waId,
        WABANumber: chat.WABANumber,
        ProfileName: chat.ProfileName,
        LastUserMessage: chat.MessageText,
        LastMessageOn: chat.ReceivedDate,
        WAInboxId: chat.WAInboxId,
        UnReadCount:
          state.activeWaId === waId
            ? 0
            : ((existing >= 0 ? state.chatList.items[existing].UnReadCount : 0) || 0) + 1,
      };
      if (existing >= 0) {
        const merged = { ...state.chatList.items[existing], ...preview };
        const next = state.chatList.items.slice();
        next.splice(existing, 1);
        state.chatList.items = [merged, ...next];
      } else {
        state.chatList.items = [preview, ...state.chatList.items];
      }
    },
    updateUnreadCount(state, action) {
      const { waId, count } = action.payload || {};
      if (!waId) return;
      const i = state.chatList.items.findIndex(
        (c) => (c.WANumber || c.wa_id) === waId,
      );
      if (i >= 0) {
        state.chatList.items[i] = { ...state.chatList.items[i], UnReadCount: count };
      }
    },
    // Local-only — clears the unread badge for a wa_id without waiting for
    // a SignalR UpdateUnreadCount echo. Dispatched optimistically when the
    // mark-as-read POST fires so the chat list reacts instantly.
    clearUnreadFor(state, action) {
      const { waId } = action.payload || {};
      if (!waId) return;
      const i = state.chatList.items.findIndex(
        (c) => (c.WANumber || c.wa_id) === waId,
      );
      if (i >= 0) {
        state.chatList.items[i] = { ...state.chatList.items[i], UnReadCount: 0 };
      }
    },
    updateDeliveryStatus(state, action) {
      // Payload: { messageId, status, timestamp }
      const { messageId: mid, status } = action.payload || {};
      if (!mid || !status) return;
      Object.values(state.threads).forEach((thread) => {
        const idx = thread.messages.findIndex((m) => messageId(m) === mid);
        if (idx >= 0) {
          thread.messages[idx] = { ...thread.messages[idx], DeliveryStatus: status };
        }
      });
    },

    // ---------- send flow ----------
    optimisticSend(state, action) {
      // { tempId, waId, row }
      const { waId, row } = action.payload || {};
      if (!waId || !row) return;
      const thread = ensureThread(state, waId);
      thread.messages = [...thread.messages, row];
    },
    sendResolved(state, action) {
      // { tempId, waId, patch }
      const { tempId, waId, patch = {} } = action.payload || {};
      if (!waId) return;
      const thread = state.threads[waId];
      if (!thread) return;
      thread.messages = thread.messages.map((m) =>
        m.WAInboxId === tempId ? { ...m, ...patch, DeliveryStatus: patch.DeliveryStatus || 'Sent' } : m,
      );
    },
    sendFailed(state, action) {
      const { tempId, waId, error } = action.payload || {};
      if (!waId) return;
      const thread = state.threads[waId];
      if (!thread) return;
      thread.messages = thread.messages.map((m) =>
        m.WAInboxId === tempId ? { ...m, DeliveryStatus: 'Failed', ErrorMessage: error || 'Send failed' } : m,
      );
    },

    // ---------- reset ----------
    resetLiveChat() {
      return initialState;
    },
  },
});

export const {
  connectionStatusChanged,
  setChannels,
  setSelectedChannel,
  setFilter,
  setSearch,
  setCounts,
  chatListLoading,
  setChatList,
  appendChatList,
  setActive,
  threadLoading,
  setThread,
  prependThread,
  receiveLiveMessage,
  updateUnreadCount,
  clearUnreadFor,
  updateDeliveryStatus,
  optimisticSend,
  sendResolved,
  sendFailed,
  resetLiveChat,
} = liveChatSlice.actions;

// ---------- selectors ----------
export const selectConnection = (state) => state.liveChat.connection;
export const selectChannels = (state) => state.liveChat.channels;
export const selectSelectedChannel = (state) => state.liveChat.selectedChannel;
export const selectCounts = (state) => state.liveChat.counts;
export const selectChatList = (state) => state.liveChat.chatList;
export const selectActiveWaId = (state) => state.liveChat.activeWaId;
export const selectActiveChannel = (state) => state.liveChat.activeChannel;
export const selectThread = (waId) => (state) => state.liveChat.threads[waId];
export const selectUnreadBadgeTotal = (state) =>
  state.liveChat.chatList.items.reduce(
    (sum, c) => sum + (c.UnReadCount || 0),
    0,
  );

export default liveChatSlice.reducer;

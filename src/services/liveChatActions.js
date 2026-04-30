// Thunk-style helpers that call LiveChatAPI and dispatch into liveChatSlice.
// Screens import these instead of touching the API/slice directly so the
// fetch-then-dispatch pattern stays in one place.
import { LiveChatAPI } from './api';
import {
  setChannels,
  setCounts,
  setChatList,
  appendChatList,
  chatListLoading,
  setThread,
  prependThread,
  threadLoading,
} from '../store/slices/liveChatSlice';

// Tolerates both the camelCase JSON the controller emits and the PascalCase
// model property names — a few endpoints differ.
const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
};

// ---------- channels ----------
export const loadChannels = () => async (dispatch) => {
  try {
    const res = await LiveChatAPI.getChannels();
    const list = Array.isArray(res) ? res : pick(res, 'data', 'channels') || [];
    dispatch(setChannels(list));
    return list;
  } catch (e) {
    dispatch(setChannels([]));
    return [];
  }
};

// ---------- counts ----------
export const loadCounts = ({ channel = 'All', chatType = 'All' } = {}) => async (dispatch) => {
  try {
    const res = await LiveChatAPI.getCounts(channel, chatType);
    const counts = res?.data || res || {};
    dispatch(setCounts(counts));
    return counts;
  } catch (e) {
    return null;
  }
};

// ---------- chat list (page 1) ----------
export const loadChatList = ({ channel = 'All', chatType = 'All', search = '' } = {}) =>
  async (dispatch) => {
    dispatch(chatListLoading(true));
    try {
      const res = await LiveChatAPI.getChatList({ channel, chatType, search, pageIndex: 1 });
      dispatch(setChatList({
        items: pick(res, 'allChats', 'AllChats') || [],
        currentPage: pick(res, 'currentPage', 'CurrentPage') || 1,
        totalPages: pick(res, 'totalPages', 'TotalPages') || 1,
        totalCount: pick(res, 'totalCount', 'TotalCount') || 0,
      }));
      return res;
    } catch (e) {
      dispatch(setChatList({ items: [], currentPage: 1, totalPages: 1, totalCount: 0 }));
      return null;
    }
  };

// ---------- chat list (paginate) ----------
export const loadMoreChatList = ({ channel = 'All', chatType = 'All', search = '', pageIndex }) =>
  async (dispatch) => {
    dispatch(chatListLoading(true));
    try {
      const res = await LiveChatAPI.getChatList({ channel, chatType, search, pageIndex });
      dispatch(appendChatList({
        items: pick(res, 'allChats', 'AllChats') || [],
        currentPage: pick(res, 'currentPage', 'CurrentPage') || pageIndex,
        totalPages: pick(res, 'totalPages', 'TotalPages') || 1,
        totalCount: pick(res, 'totalCount', 'TotalCount') || 0,
      }));
      return res;
    } catch (e) {
      dispatch(chatListLoading(false));
      return null;
    }
  };

// ---------- messages (first page, no cursor) ----------
export const loadMessages = ({ waId, channel, chatType = 'active' }) => async (dispatch) => {
  if (!waId || !channel) return null;
  dispatch(threadLoading({ waId, loading: true }));
  try {
    const res = await LiveChatAPI.getMessages({
      senderNumber: waId,
      channelNumber: channel,
      chatType,
    });
    dispatch(setThread({
      waId,
      channel,
      messages: pick(res, 'chatList', 'ChatList') || [],
      hasMore: !!pick(res, 'hasMore', 'HasMore'),
    }));
    return res;
  } catch (e) {
    dispatch(setThread({ waId, channel, messages: [], hasMore: false }));
    return null;
  }
};

// ---------- messages (scroll-up, with cursor) ----------
export const loadOlderMessages = ({ waId, channel, oldestId, chatType = 'active' }) =>
  async (dispatch) => {
    if (!waId || !channel || !oldestId) return null;
    dispatch(threadLoading({ waId, loading: true }));
    try {
      const res = await LiveChatAPI.getMessages({
        senderNumber: waId,
        channelNumber: channel,
        chatType,
        beforeId: oldestId,
      });
      dispatch(prependThread({
        waId,
        messages: pick(res, 'chatList', 'ChatList') || [],
        hasMore: !!pick(res, 'hasMore', 'HasMore'),
      }));
      return res;
    } catch (e) {
      dispatch(threadLoading({ waId, loading: false }));
      return null;
    }
  };

// Thunk-style helpers that call LiveChatAPI and dispatch into liveChatSlice.
// Screens import these instead of touching the API/slice directly so the
// fetch-then-dispatch pattern stays in one place.
import { LiveChatAPI } from './api';
import * as sender from './liveAgentSender';
import {
  setChannels,
  setCounts,
  setChatList,
  appendChatList,
  chatListLoading,
  setThread,
  prependThread,
  threadLoading,
  optimisticSend,
  sendResolved,
  sendFailed,
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

// ---------- send (any Meta Cloud API kind, with optimistic + reconciliation) ----------
//
// Goes through liveAgentSender → gsauth.com proxy → Meta. Optimistic row
// renders immediately; once Meta returns the wamid we patch the row's
// MessageId so subsequent DeliveryStatusUpdate events from SignalR can
// match by id (closes the gap documented in connection.md §8).
//
// Args:
//   waId               recipient (the customer's wa_id)
//   channel            WABA display number from the chat row
//   kind               'text' | 'image' | 'video' | 'audio' | 'document' |
//                      'sticker' | 'location' | 'contacts' |
//                      'interactiveButtons' | 'interactiveList' |
//                      'template' | 'reaction' | 'raw'
//   payload            kind-specific payload (see liveAgentSender.js)
//   replyToMessageId   optional — quote-reply to an earlier message
//   previewText        what to render in the optimistic bubble
//   previewType        what to set as MessageType on the optimistic row
//
// Returns: { ok: true, wamid } or { ok: false, error }.
export const sendLiveChatMessage = ({
  waId,
  channel,
  kind = 'text',
  payload = {},
  replyToMessageId,
  previewText,
  previewType,
}) => async (dispatch) => {
  if (!waId || !channel) {
    return { ok: false, error: 'Missing waId or channel.' };
  }

  const tempId = `temp-${Date.now()}`;
  const previewBody =
    previewText ??
    payload.message ??
    payload.caption ??
    (kind === 'location' ? '📍 Location' :
      kind === 'audio' ? '🎵 Audio message' :
      kind === 'sticker' ? '✨ Sticker' :
      `[${kind}]`);

  const tempRow = {
    WAInboxId: tempId,
    MessageId: null,
    wa_id: waId,
    SenderNumber: waId,
    MessageText: previewBody,
    MessageType: previewType || kind,
    ChatType: 'OUT',
    DeliveryStatus: 'Sending',
    ReceivedDate: new Date().toISOString(),
    WABANumber: channel,
    ReplyToMessageId: replyToMessageId || null,
  };
  dispatch(optimisticSend({ waId, row: tempRow }));

  try {
    const metaResponse = await sender.sendByKind({
      kind,
      to: waId,
      channel,
      replyToMessageId,
      payload,
    });
    const wamid = sender.extractWamid(metaResponse);

    dispatch(sendResolved({
      tempId,
      waId,
      patch: {
        MessageId: wamid,         // ← this is what enables status-update reconciliation
        DeliveryStatus: 'Sent',
        // Replace the temp inbox id with the canonical wamid so later
        // DeliveryStatusUpdate matches via the same key.
        WAInboxId: wamid || tempId,
      },
    }));
    return { ok: true, wamid };
  } catch (err) {
    dispatch(sendFailed({
      tempId,
      waId,
      error: err?.message || 'Send failed',
    }));
    return { ok: false, error: err?.message || 'Send failed' };
  }
};

// Convenience wrappers — same return shape as sendLiveChatMessage.
export const sendText      = (a) => sendLiveChatMessage({ ...a, kind: 'text',     payload: { message: a.message, previewUrl: a.previewUrl } });
export const sendImage     = (a) => sendLiveChatMessage({ ...a, kind: 'image',    payload: { link: a.link, id: a.id, caption: a.caption } });
export const sendVideo     = (a) => sendLiveChatMessage({ ...a, kind: 'video',    payload: { link: a.link, id: a.id, caption: a.caption } });
export const sendAudio     = (a) => sendLiveChatMessage({ ...a, kind: 'audio',    payload: { link: a.link, id: a.id } });
export const sendDocument  = (a) => sendLiveChatMessage({ ...a, kind: 'document', payload: { link: a.link, id: a.id, filename: a.filename, caption: a.caption } });
export const sendSticker   = (a) => sendLiveChatMessage({ ...a, kind: 'sticker',  payload: { link: a.link, id: a.id } });
export const sendLocation  = (a) => sendLiveChatMessage({ ...a, kind: 'location', payload: { latitude: a.latitude, longitude: a.longitude, name: a.name, address: a.address } });
export const sendContacts  = (a) => sendLiveChatMessage({ ...a, kind: 'contacts', payload: { contacts: a.contacts } });
export const sendButtons   = (a) => sendLiveChatMessage({ ...a, kind: 'interactiveButtons', payload: a });
export const sendList      = (a) => sendLiveChatMessage({ ...a, kind: 'interactiveList',    payload: a });
export const sendTemplate  = (a) => sendLiveChatMessage({ ...a, kind: 'template', payload: { name: a.name, language: a.language, components: a.components } });
export const sendReaction  = (a) => sendLiveChatMessage({ ...a, kind: 'reaction', payload: { messageId: a.messageId, emoji: a.emoji } });

// Re-export the media upload so the composer can attach files in two steps:
//   1) const { id } = await uploadMedia({ channel, file, mimeType });
//   2) dispatch(sendImage({ waId, channel, id, caption }));
export const uploadMedia = sender.uploadMedia;

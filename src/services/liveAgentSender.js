// src/services/liveAgentSender.js
//
// Live Agent → WhatsApp Cloud API send surface.
//
// Routes through gsauth.com (the icpaas Meta proxy) which attaches the
// per-WABA Meta access token server-side based on the caller's bearer.
// Mobile never holds an FBAccessToken. See docs/whatsapp-cloud-api.md for
// payload semantics and docs/connection.md for why we don't go through
// OmniApp's UserLiveChat/SendChatMessage (302 cookie-auth).
//
// Every function returns Meta's response so callers can read
// `messages[0].id` (the wamid) and reconcile optimistic UI rows against
// later DeliveryStatusUpdate webhooks.
//
// Coverage matches docs/whatsapp-cloud-api.md sections 1–14:
//   text · image · video · audio · document · sticker · location ·
//   contacts · interactive (button + list) · template · reaction ·
//   media upload · raw envelope · reply/quote context.

import axios from 'axios';
import * as secureStorage from './secureStorage';
import { ChannelsAPI } from './api';

const META_VERSION = 'v24.0';
const PROXY_HOST = 'https://gsauth.com';
const TOKEN_KEY = 'icpaas_token';

// Tiny dedicated axios instance so we control the version segment + can
// swap host without touching the app-wide `api` instance.
const meta = axios.create({
  baseURL: PROXY_HOST,
  timeout: 20000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

meta.interceptors.request.use(async (config) => {
  const token = await secureStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Pass-through unwrap; mirrors the response shape callers expect from
// Meta's Graph API: { messaging_product, contacts, messages: [{ id }] }.
meta.interceptors.response.use(
  (res) => res.data,
  (err) =>
    Promise.reject({
      message:
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Send failed',
      status: err?.response?.status,
      data: err?.response?.data,
    }),
);

// ---------- E.164 normalisation ----------
// Tolerates 10-digit Indian numbers (defaults +91), strips +/spaces/dashes.
const normalize = (raw) => {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

// ---------- channel → phoneNumberId resolution ----------
// LiveAgentChat passes the WABA *display number* as `channel`. Meta's
// /messages endpoint needs the phoneNumberId. Resolve via ChannelsAPI
// (gsauth) which returns both fields for every channel the user owns.
let channelCache = null;
const loadChannelMap = async () => {
  if (channelCache) return channelCache;
  try {
    const res = await ChannelsAPI.list();
    const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    channelCache = list;
    return list;
  } catch (_) {
    channelCache = [];
    return [];
  }
};

export const invalidateChannelCache = () => {
  channelCache = null;
};

export const resolvePhoneNumberId = async (channelOrWabaNumber) => {
  if (!channelOrWabaNumber) {
    // No channel hint → fall back to the user's default channel.
    const def = await ChannelsAPI.getDefault();
    return def?.phoneNumberId;
  }
  // Already a phoneNumberId? phoneNumberIds are 15+ digits; WABA display
  // numbers are 10–14 digits. Heuristic — if a channel match exists by
  // wabaNumber, prefer that. Otherwise treat the input as the id itself.
  const list = await loadChannelMap();
  const byWaba = list.find(
    (ch) =>
      String(ch.wabaNumber || ch.WABANumber || '').replace(/[^\d]/g, '') ===
      String(channelOrWabaNumber).replace(/[^\d]/g, ''),
  );
  if (byWaba?.phoneNumberId) return byWaba.phoneNumberId;
  return channelOrWabaNumber;
};

// ---------- one shape, applied to every send ----------
const envelope = (to, type, contentKey, content, extras = {}) => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: normalize(to) || to,
  type,
  [contentKey]: content,
  ...extras,
});

const post = async (channel, body) => {
  const phoneNumberId = await resolvePhoneNumberId(channel);
  if (!phoneNumberId) throw { message: 'Could not resolve phoneNumberId for channel.' };
  return meta.post(`/${META_VERSION}/${phoneNumberId}/messages`, body);
};

// ---------- text ----------
export const sendText = ({ to, channel, message, replyToMessageId, previewUrl = false }) => {
  const body = envelope(to, 'text', 'text', { body: message, preview_url: previewUrl });
  if (replyToMessageId) body.context = { message_id: replyToMessageId };
  return post(channel, body);
};

// ---------- media (link OR id) ----------
const mediaContent = (link, id, extras = {}) => {
  const c = { ...extras };
  if (id) c.id = id;
  else c.link = link;
  return c;
};

export const sendImage = ({ to, channel, link, id, caption, replyToMessageId }) => {
  const body = envelope(to, 'image', 'image', mediaContent(link, id, caption ? { caption } : {}));
  if (replyToMessageId) body.context = { message_id: replyToMessageId };
  return post(channel, body);
};

export const sendVideo = ({ to, channel, link, id, caption, replyToMessageId }) => {
  const body = envelope(to, 'video', 'video', mediaContent(link, id, caption ? { caption } : {}));
  if (replyToMessageId) body.context = { message_id: replyToMessageId };
  return post(channel, body);
};

export const sendAudio = ({ to, channel, link, id, replyToMessageId }) => {
  const body = envelope(to, 'audio', 'audio', mediaContent(link, id));
  if (replyToMessageId) body.context = { message_id: replyToMessageId };
  return post(channel, body);
};

export const sendDocument = ({ to, channel, link, id, filename, caption, replyToMessageId }) => {
  const extras = {};
  if (filename) extras.filename = filename;
  if (caption) extras.caption = caption;
  const body = envelope(to, 'document', 'document', mediaContent(link, id, extras));
  if (replyToMessageId) body.context = { message_id: replyToMessageId };
  return post(channel, body);
};

export const sendSticker = ({ to, channel, link, id, replyToMessageId }) => {
  const body = envelope(to, 'sticker', 'sticker', mediaContent(link, id));
  if (replyToMessageId) body.context = { message_id: replyToMessageId };
  return post(channel, body);
};

// ---------- location ----------
export const sendLocation = ({ to, channel, latitude, longitude, name, address, replyToMessageId }) => {
  const location = { latitude, longitude };
  if (name) location.name = name;
  if (address) location.address = address;
  const body = envelope(to, 'location', 'location', location);
  if (replyToMessageId) body.context = { message_id: replyToMessageId };
  return post(channel, body);
};

// ---------- contacts (vCard-equivalent, multiple supported) ----------
export const sendContacts = ({ to, channel, contacts, replyToMessageId }) => {
  const list = Array.isArray(contacts) ? contacts : [contacts];
  const body = envelope(to, 'contacts', 'contacts', list);
  if (replyToMessageId) body.context = { message_id: replyToMessageId };
  return post(channel, body);
};

// ---------- interactive — reply buttons (max 3) ----------
export const sendInteractiveButtons = ({
  to, channel,
  bodyText, headerText, footerText,
  buttons, // [{ id, title }]
  header,  // { type:'image'|'video'|'document', link?|id?, ... } overrides headerText
  replyToMessageId,
}) => {
  const interactive = {
    type: 'button',
    body: { text: bodyText || '' },
    action: {
      buttons: (buttons || []).slice(0, 3).map((b) => ({
        type: 'reply',
        reply: { id: b.id, title: b.title },
      })),
    },
  };
  if (header) interactive.header = header;
  else if (headerText) interactive.header = { type: 'text', text: headerText };
  if (footerText) interactive.footer = { text: footerText };

  const body = envelope(to, 'interactive', 'interactive', interactive);
  if (replyToMessageId) body.context = { message_id: replyToMessageId };
  return post(channel, body);
};

// ---------- interactive — list (max 10 sections, 10 rows total) ----------
export const sendInteractiveList = ({
  to, channel,
  bodyText, headerText, footerText,
  buttonLabel = 'Choose',
  sections, // [{ title, rows: [{ id, title, description? }] }]
  replyToMessageId,
}) => {
  const interactive = {
    type: 'list',
    body: { text: bodyText || '' },
    action: {
      button: buttonLabel,
      sections: (sections || []).map((s) => ({
        title: s.title,
        rows: (s.rows || []).map((r) => ({
          id: r.id,
          title: r.title,
          ...(r.description ? { description: r.description } : {}),
        })),
      })),
    },
  };
  if (headerText) interactive.header = { type: 'text', text: headerText };
  if (footerText) interactive.footer = { text: footerText };

  const body = envelope(to, 'interactive', 'interactive', interactive);
  if (replyToMessageId) body.context = { message_id: replyToMessageId };
  return post(channel, body);
};

// ---------- template (Meta-approved; only message type allowed > 24 h) ----------
export const sendTemplate = ({ to, channel, name, language = 'en_US', components = [] }) => {
  const body = envelope(to, 'template', 'template', {
    name,
    language: { code: language },
    components,
  });
  return post(channel, body);
};

// ---------- reaction (emoji on a previous message) ----------
export const sendReaction = ({ to, channel, messageId, emoji = '' }) => {
  const body = envelope(to, 'reaction', 'reaction', { message_id: messageId, emoji });
  return post(channel, body);
};

// ---------- media upload — POST /{phoneNumberId}/media (multipart) ----------
// `file` accepts the RN { uri, name, type } shape OR a Blob/File on web.
export const uploadMedia = async ({ channel, file, mimeType }) => {
  const phoneNumberId = await resolvePhoneNumberId(channel);
  if (!phoneNumberId) throw { message: 'Could not resolve phoneNumberId for channel.' };

  const fd = new FormData();
  fd.append('messaging_product', 'whatsapp');
  fd.append('type', mimeType);
  fd.append('file', file);

  return meta.post(`/${META_VERSION}/${phoneNumberId}/media`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ---------- raw escape hatch ----------
// For payloads not yet covered above (e.g. carousel templates, limited-time
// offers). Caller builds the full Meta /messages body.
export const sendRaw = ({ channel, payload }) => post(channel, payload);

// ---------- unified dispatcher ----------
// Single entry point used by liveChatActions. `kind` selects the helper;
// `payload` carries that helper's named arguments.
export const sendByKind = ({ kind, to, channel, replyToMessageId, payload = {} }) => {
  const common = { to, channel, replyToMessageId };
  switch (kind) {
    case 'text':
      return sendText({ ...common, ...payload });
    case 'image':
      return sendImage({ ...common, ...payload });
    case 'video':
      return sendVideo({ ...common, ...payload });
    case 'audio':
      return sendAudio({ ...common, ...payload });
    case 'document':
      return sendDocument({ ...common, ...payload });
    case 'sticker':
      return sendSticker({ ...common, ...payload });
    case 'location':
      return sendLocation({ ...common, ...payload });
    case 'contacts':
      return sendContacts({ ...common, ...payload });
    case 'interactiveButtons':
      return sendInteractiveButtons({ ...common, ...payload });
    case 'interactiveList':
      return sendInteractiveList({ ...common, ...payload });
    case 'template':
      return sendTemplate({ to, channel, ...payload });
    case 'reaction':
      return sendReaction({ to, channel, ...payload });
    case 'raw':
      return sendRaw({ channel, payload: payload.payload });
    default:
      return Promise.reject({ message: `Unknown send kind: ${kind}` });
  }
};

// ---------- response helpers ----------
// Pull the wamid out of Meta's response shape. Returns null when missing
// (e.g. proxy-side failure with non-Meta-shaped error envelope).
export const extractWamid = (metaResponse) => {
  const messages = metaResponse?.messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  return messages[0]?.id || null;
};

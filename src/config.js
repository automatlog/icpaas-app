// Runtime configuration for icpaas-app.
// Plain JS constants — no env loader needed. Change in one place.

// Host that serves OmniApp REST endpoints (UserLiveChat/* etc.) AND the
// SignalR hub /whatsAppProgressHub. Same origin for both.
export const OMNI_HOST = 'https://icpaas.in';

// Path of the WhatsApp Live Agent SignalR hub on OMNI_HOST.
export const OMNI_REALTIME_PATH = '/whatsAppProgressHub';

// Page size used by GetChatList — matches the OmniApp web default.
export const LIVE_CHAT_PAGE_SIZE = 16;

// Page size used by GetUserChatMessages cursor-based pagination.
export const LIVE_CHAT_MESSAGE_PAGE_SIZE = 50;

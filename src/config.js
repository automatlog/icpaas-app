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

// REST path on OMNI_HOST that exchanges username + password for a bearer
// token usable by both axios and the SignalR accessTokenFactory.
//
// Set to null while the backend endpoint is TBD — the login thunk will
// fall back to the hard-coded demo credentials. Once the backend ships
// (e.g. POST /api/auth/mobile-token returning { token, user }), set this
// to its path and real auth flips on automatically.
export const OMNI_AUTH_LOGIN_PATH = null;

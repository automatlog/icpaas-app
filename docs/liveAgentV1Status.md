# Live Agent v1 — Verification status

> Snapshot of where the v1 build stands against the seven acceptance criteria from [connection.md §12](./connection.md#12-v1-acceptance-criteria). Built phases 1–7. Local checks pass; backend-dependent criteria are blocked on the same items flagged in [connection.md §2](./connection.md#2-open-questions-must-resolve-before-coding).

## Self-checks completed

- ✅ All 15 new/modified files compile cleanly under `babel-preset-expo`.
- ✅ All 30 existing Jest tests pass with the new middleware, slice, and auth thunk in place (including the 4 `authSlice` tests pinning demo-creds behavior).
- ✅ Mock `InboxScreen` and `ChatScreen` remain wired to legacy routes — nothing existing was broken.

## Acceptance criteria

| # | Criterion | Status | Notes |
|---|---|---|---|
| 1 | Login with a real OmniApp username/password succeeds and a bearer is stored | 🟡 **Blocked on backend** | Thunk is built ([authSlice.js](../src/store/slices/authSlice.js)); set `OMNI_AUTH_LOGIN_PATH` in [config.js](../src/config.js) once endpoint exists. Demo `omniuser/Omni@1234` works for now. |
| 2 | Live Agent inbox loads chat list from `GetChatList`; counts match `GetChatCount` | 🟡 **Blocked on real auth** | UI + actions wired ([LiveAgentInbox.js](../src/screens/whatsapp/LiveAgentInbox.js), [liveChatActions.js](../src/services/liveChatActions.js)). Demo bearer fails OmniApp 401 → empty inbox + offline pill. Will work the moment criterion 1 unblocks. |
| 3 | Opening a conversation loads messages from `GetUserChatMessages`; scrolling up paginates with `beforeId` | 🟡 **Blocked on real auth** | Cursor pagination in place ([LiveAgentChat.js](../src/screens/whatsapp/LiveAgentChat.js); inverted FlatList; `loadOlderMessages` keyed off `oldestId`). |
| 4 | Sending a text reply reaches the customer's WhatsApp; row updates Sent → Delivered → Read | 🟡 **Blocked on real auth + send-response patch** | Send + optimistic + status icons are in. **Backend gap:** `SendChatMessage` doesn't echo back `MessageId`, so optimistic rows can't reconcile to incoming `DeliveryStatusUpdate` events. Documented in [connection.md §8](./connection.md#8-send-flow-the-non-trivial-bit). |
| 5 | Foregrounded customer message appears in inbox + thread under 2 s, no manual refresh | 🟡 **Blocked on real auth + SignalR connect** | SignalR singleton + `receiveLiveMessage` reducer + chat-list upsert + thread append all wired ([realtime.js](../src/services/realtime.js), [liveChatSlice.js](../src/store/slices/liveChatSlice.js)). Notifier middleware adds vibration + toast ([liveChatNotifier.js](../src/store/middleware/liveChatNotifier.js)). |
| 6 | Killing WiFi 30 s and restoring → automatic reconnect; missed inbound appears within 5 s | 🟡 **Blocked on real auth + SignalR connect** | `withAutomaticReconnect([0,2000,5000,10000,30000])` in place; `RealtimeProvider` re-connects on app foreground. Refetch-on-reconnect for missed events is **not** wired yet — see "Known v1 gap" below. |
| 7 | Logout closes SignalR connection (verify `OnDisconnectedAsync` fires server-side) | ✅ **Wired locally** | `logoutAndCleanup` thunk clears bearer + dispatches `resetLiveChat` + `logout`. `RealtimeProvider` watches `auth.isAuthenticated` and calls `realtime.stop()` automatically. Server-side log confirmation needs a real connect first. |

## Known v1 gaps (intentional)

These are listed in [connection.md §11–§13](./connection.md#11-files-we-expect-to-add--change-preview-only--not-building-yet) as "v2 / out of scope" but worth restating here:

- **Refetch on reconnect** ([connection.md §10](./connection.md#10-failure-modes-the-design-must-handle), criterion 6 above). After `signalR.onreconnected` fires, the slice doesn't currently re-issue `loadChatList` + `loadMessages` for the active conversation. The active screen will silently miss any events that fired during the drop. Add this to `RealtimeProvider` once we have a real connection to test against.
- **Background notifications.** SignalR drops on app suspend; foreground inbound notifications work, background ones don't. Needs FCM/APNs.
- **Notification sound.** Vibration + toast cover the cue today. Sound deferred — needs `expo-audio` (native module → EAS build) plus an audio asset.
- **Mark-as-read on chat open.** OmniApp web has a `MarkMessagesAsRead` call when a chat is opened; mobile doesn't yet. Inbound badge clears locally but the server-side unread state isn't updated.
- **Templates / media / location send.** v2.
- **Agent assignment UI.** v2 — bottom sheet from chat header.

## What ships in v1

A WhatsApp Live Agent surface with full real-time plumbing, ready to flip on the moment the backend ships its mobile-token endpoint:

- Server-driven inbox with channel selector, server-side filter chips with badge counts, debounced search, infinite-scroll pagination, pull-to-refresh, connection-status pill.
- Server-driven chat thread with cursor-based scroll-up pagination, optimistic send, delivery-status icons (Sent → Delivered → Read → Failed), 24-hour service-window banner that warns at <1 h and locks at expiry.
- SignalR singleton tied to the auth lifecycle — connects on login, reconnects on app foreground, stops on logout. Inbound messages dispatch into Redux, vibrate the device, and show a toast banner unless the user is in that conversation.
- Mock `InboxScreen` / `ChatScreen` left untouched — current SMS/RCS/Voice flows continue to work. Retire those after the backend endpoints are confirmed working.

## Files added (Live Agent build)

- [src/config.js](../src/config.js)
- [src/services/realtime.js](../src/services/realtime.js)
- [src/services/liveChatActions.js](../src/services/liveChatActions.js)
- [src/store/slices/liveChatSlice.js](../src/store/slices/liveChatSlice.js)
- [src/store/middleware/liveChatNotifier.js](../src/store/middleware/liveChatNotifier.js)
- [src/components/RealtimeProvider.js](../src/components/RealtimeProvider.js)
- [src/screens/whatsapp/LiveAgentInbox.js](../src/screens/whatsapp/LiveAgentInbox.js)
- [src/screens/whatsapp/LiveAgentChat.js](../src/screens/whatsapp/LiveAgentChat.js)

## Files changed

- [App.js](../App.js) — wraps navigator in `<RealtimeProvider>`
- [src/services/api.js](../src/services/api.js) — adds `omniApi` axios instance + `LiveChatAPI` namespace + `buildLiveChatTextForm`; `attachAuth` reads bearer from AsyncStorage with `DEFAULT_API_TOKEN` fallback
- [src/store/index.js](../src/store/index.js) — registers `liveChatReducer` + `liveChatNotifier` middleware; blacklists `liveChat` from persist
- [src/store/slices/authSlice.js](../src/store/slices/authSlice.js) — `login` thunk supports real token exchange when `OMNI_AUTH_LOGIN_PATH` is set; new `logoutAndCleanup` thunk
- [src/screens/shared/ProfileScreen.js](../src/screens/shared/ProfileScreen.js) — logout dispatches `logoutAndCleanup`
- [src/screens/shared/DashboardScreen.js](../src/screens/shared/DashboardScreen.js) — Live Agent entry-point card with connection-status dot and unread badge
- [src/navigation/AppNavigator.js](../src/navigation/AppNavigator.js) — registers `LiveAgentInbox` and `LiveAgentChat` routes
- [.env](../.env) — purged the ClickHouse credentials that were exposed (would have been bundled into the APK)

## How to flip on real auth (one change — once backend is ready)

Edit [src/config.js](../src/config.js):

```js
// before
export const OMNI_AUTH_LOGIN_PATH = null;

// after — once backend ships POST /api/auth/mobile-token
export const OMNI_AUTH_LOGIN_PATH = '/api/auth/mobile-token';
```

Expected response shape: `{ token: string, user: { username, name, role } }`. Adjust `tryRemoteLogin` in [authSlice.js](../src/store/slices/authSlice.js) if the backend uses different field names.

## Live probe results (verified 2026-05-01)

Tested against `https://icpaas.in` with the demo bearer `cabb46ed-…d20e6073b120` (UserId 102):

| Probe | Result | Implication |
|---|---|---|
| `POST /api/auth/mobile-token` | **404** | Endpoint not deployed. Tried 6 path variations (`/api/v1/auth/...`, `/AuthService/MobileToken`, etc.) — all 404. Don't set `OMNI_AUTH_LOGIN_PATH`. |
| `GET /api/v1/user/balance` with bearer | **200** | Bearer is valid for the existing icpaas.in REST API surface. |
| `POST /whatsAppProgressHub/negotiate` with bearer | **200** | SignalR accepts the bearer at negotiate. **Available transports: SSE + LongPolling — no WebSockets.** Hard-coding `transport: HttpTransportType.WebSockets` would have failed; the singleton was already updated to let SignalR pick. |
| `GET /WAMessage/UserLiveChat/GetChannels` with bearer | **302 → /AuthService/SignIn** | Live Chat MVC controllers don't honor bearer auth — they require an ASP.NET session cookie. Same will be true for every `UserLiveChat/*` endpoint we wired. |

## Backend gaps that block v1 turn-on

Even with the bearer in hand, two server-side changes are required:

1. **Add bearer-auth scheme to `UserLiveChatController`** (and any sibling controllers we call). Currently `[Authorize]` resolves to cookie auth only → 302. The token validator must map `cabb46ed-…d20e6073b120` to UserId 102 / username `omniuser` (and similarly for other tokens / users).
2. **Add the same bearer scheme to `WhatsAppProgressHub`** so `OnConnectedAsync` resolves `Context.User.Identity.Name` from the bearer. Without it the connection never joins `waba_OMNIUSER`, so broadcasts from `MessageHandlerService.HandleIncomingMessageAsync` won't reach this client.

Once both land, `OMNI_AUTH_LOGIN_PATH` can stay `null` — the demo login already seeds the bearer that everything else uses. (A dedicated `/api/auth/mobile-token` endpoint is only needed if we want users to authenticate by username/password rather than pasting a long-lived bearer.)

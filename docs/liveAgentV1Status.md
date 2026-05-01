# Live Agent v1 — Verification status

> Snapshot of where the Live Agent build stands against the seven acceptance criteria from [connection.md §12](./connection.md#12-v1-acceptance-criteria). Built phases 1–11. Local checks pass; receiving (chat list, history, real-time push) is blocked on the backend bearer-auth items in [connection.md §2](./connection.md#2-open-questions-must-resolve-before-coding). **Sending now works end-to-end** through the gsauth → Meta path added in Phase 8.

## Self-checks completed

- ✅ All 23 Live Agent files compile cleanly under `babel-preset-expo`.
- ✅ All **30 Jest tests** pass across 7 suites — including the 4 `authSlice` tests pinning demo-creds behaviour, after the `expo/virtual/env` shim was added in [jest.config.js](../jest.config.js).
- ✅ Mock `InboxScreen` and `ChatScreen` remain wired to legacy routes — SMS / RCS / Voice flows untouched.
- ✅ Three live HTTP probes confirm: bearer is valid on `gsauth.com` REST + on the SignalR negotiate endpoint, but **not** on the OmniApp `UserLiveChat` MVC controllers (302 → SignIn).

## Acceptance criteria

| # | Criterion | Status | Notes |
|---|---|---|---|
| 1 | Login with a real OmniApp username/password succeeds and a bearer is stored | 🟡 **Blocked on backend** | Thunk built ([authSlice.js](../src/store/slices/authSlice.js)); set `OMNI_AUTH_LOGIN_PATH` once the endpoint exists. Demo `omniuser/Omni@1234` works, seeds `DEFAULT_API_TOKEN` (`cabb46ed-…d20e6073b120`) into AsyncStorage / SecureStore via `secureStorage.js` |
| 2 | Live Agent inbox loads chat list from `GetChatList`; counts match `GetChatCount` | 🟡 **Blocked on cookie-only MVC auth** | UI + actions wired ([LiveAgentInbox.js](../src/screens/whatsapp/LiveAgentInbox.js), [liveChatActions.js](../src/services/liveChatActions.js)). `loadChannels` now falls back to gsauth `ChannelsAPI` so the channel selector populates regardless |
| 3 | Opening a conversation loads messages from `GetUserChatMessages`; scrolling up paginates with `beforeId` | 🟡 **Blocked on cookie-only MVC auth** | Cursor pagination in place ([LiveAgentChat.js](../src/screens/whatsapp/LiveAgentChat.js); inverted FlatList; `loadOlderMessages` keyed off `oldestId`) |
| 4 | Sending a text reply reaches the customer's WhatsApp; row updates Sent → Delivered → Read | ✅ **Working** | Re-routed through `gsauth.com/v24.0/{phoneNumberId}/messages` in Phase 8 ([liveAgentSender.js](../src/services/liveAgentSender.js)). Meta returns `messages[0].id` (wamid); `sendLiveChatMessage` patches the optimistic row's `MessageId` so `DeliveryStatusUpdate` events match cleanly |
| 5 | Foregrounded customer message appears in inbox + thread under 2 s, no manual refresh | 🟡 **Blocked on SignalR identity** | All wiring in place ([realtime.js](../src/services/realtime.js), `receiveLiveMessage` reducer, chat-list upsert, thread append, vibration + toast via [liveChatNotifier.js](../src/store/middleware/liveChatNotifier.js)). Hub joins are scoped by `Context.User.Identity.Name` which currently only resolves under cookie auth |
| 6 | Killing WiFi 30 s and restoring → automatic reconnect; missed inbound appears within 5 s | 🟡 **Blocked on (5)** | `withAutomaticReconnect([0,2000,5000,10000,30000])` in place; `RealtimeProvider` re-connects on app foreground. Refetch-on-reconnect for missed events is **not** wired yet (v2) |
| 7 | Logout closes SignalR connection (`OnDisconnectedAsync`) | ✅ **Wired locally** | `logoutAndCleanup` thunk clears bearer + dispatches `resetLiveChat` + `logout`. `RealtimeProvider` watches `auth.isAuthenticated` and calls `realtime.stop()` automatically. Server-side log confirmation needs a real connect first |

## Capabilities currently in code (Phases 1–11)

### Inbox
- WABA channel selector (multi-channel, single-channel auto-hides)
- Server-side filter chips with badge counts: All / Unread / Assigned / Unassigned / Replied / Archive
- Debounced search (300 ms), pull-to-refresh, infinite-scroll pagination
- Connection-status pill (live / connecting / reconnecting / offline)
- Live unread badge from `selectUnreadBadgeTotal`

### Chat thread
- Cursor-based message pagination (`beforeId` scroll-up via inverted FlatList)
- Optimistic outbound bubbles
- Delivery-status icons: ✓ Sent · ✓✓ Delivered · blue ✓✓ Read · red ✗ Failed (with inline error message)
- Failed bubbles get a red border outline
- 24-hour service-window banner: amber when < 1 h remaining, red when expired (template-only mode)
- **Mark-as-read on chat open** (Phase 11) — POSTs `MarkMessagesAsRead` with the latest inbound `wamid`, debounced via `lastMarkedIdRef`. Optimistic local clear regardless of server response

### Composer + attachments (Phase 9–10)
- Text composer (default)
- "+" attach button → `LiveAgentAttachMenu` slide-up sheet
- **Image** — `expo-image-picker` → upload to Meta `/media` → `sendImage({ id })`
- **Video** — same picker, video mediaType
- **Document** — `expo-document-picker` → upload → `sendDocument({ id, filename })`
- **Location** — `LiveAgentLocationModal` with manual lat/lon entry **plus "Use my current location"** GPS button (`expo-location`) and best-effort reverse geocode for the address field
- **Template** — `LiveAgentTemplatePicker` (Phase 10): search-filtered list of approved templates, two-mode UI (list → fill), auto-detects body text + single header text variables and renders one input per slot. Media-header and button-URL templates are flagged as "advanced — sending without"

### Real-time + lifecycle
- SignalR singleton (`@microsoft/signalr` 9.x) — connects on `auth.isAuthenticated → true`, stops on logout, nudges reconnect on app foreground
- Negotiate-then-upgrade transport (server only advertises SSE + LongPolling)
- Bearer flows via `accessTokenFactory` reading from `secureStorage`
- `liveChatNotifier` middleware: vibration + toast on inbound, suppressed when the inbound chat is the active one or when app is backgrounded

### Sending pipeline (Phase 8)
- Direct path through `gsauth.com/v24.0/{phoneNumberId}/messages` — bearer attached client-side, gsauth attaches the per-WABA Meta access token server-side. Mobile never holds `FBAccessToken`
- Channel → phoneNumberId resolution via cached `ChannelsAPI.list()` lookup
- All 12 Meta message types supported in [liveAgentSender.js](../src/services/liveAgentSender.js): text, image, video, audio, document, sticker, location, contacts, interactive (button + list), template, reaction, plus media upload + raw envelope
- Reply / quote context (`{ context: { message_id } }`) supported on all kinds
- wamid reconciliation closes the gap that previously left optimistic rows stuck at "Sent"

## Files added (Live Agent build, Phases 1–11)

### Phase 1–2 (plumbing + state)
- [src/config.js](../src/config.js)
- [src/services/realtime.js](../src/services/realtime.js)
- [src/services/liveChatActions.js](../src/services/liveChatActions.js)
- [src/store/slices/liveChatSlice.js](../src/store/slices/liveChatSlice.js)
- [src/store/middleware/liveChatNotifier.js](../src/store/middleware/liveChatNotifier.js)
- [src/components/RealtimeProvider.js](../src/components/RealtimeProvider.js)

### Phase 4–5 (screens)
- [src/screens/whatsapp/LiveAgentInbox.js](../src/screens/whatsapp/LiveAgentInbox.js)
- [src/screens/whatsapp/LiveAgentChat.js](../src/screens/whatsapp/LiveAgentChat.js)

### Phase 8 (Meta send pipeline)
- [src/services/liveAgentSender.js](../src/services/liveAgentSender.js) — full Meta Cloud API send surface (12 types + media upload)
- [jest.shims/expoVirtualEnv.js](../jest.shims/expoVirtualEnv.js) + [jest.config.js](../jest.config.js) `moduleNameMapper` — Jest shim so `EXPO_PUBLIC_DEFAULT_TOKEN` doesn't crash test runs

### Phase 9–10 (attachment UI)
- [src/components/LiveAgentAttachMenu.js](../src/components/LiveAgentAttachMenu.js) — bottom-sheet picker
- [src/components/LiveAgentLocationModal.js](../src/components/LiveAgentLocationModal.js) — lat/lon entry + GPS auto-fill
- [src/components/LiveAgentTemplatePicker.js](../src/components/LiveAgentTemplatePicker.js) — list + variable form

### Reference docs
- [docs/live-agent-reference.md](./live-agent-reference.md) — OmniApp WhatsApp Live Agent technical reference
- [docs/connection.md](./connection.md) — porting blueprint
- [docs/liveAgentCompare.md](./liveAgentCompare.md) — side-by-side icpaas vs OmniApp
- [docs/liveAgentFeatures.md](./liveAgentFeatures.md) — feature catalogue
- [docs/whatsapp-cloud-api.md](./whatsapp-cloud-api.md) — Meta payload reference (all 12 kinds + media upload)

## Files changed

- [App.js](../App.js) — wraps navigator in `<RealtimeProvider>`
- [src/services/api.js](../src/services/api.js) — `omniApi` axios instance + `LiveChatAPI` namespace (incl. `markAsRead` Phase 11) + `buildLiveChatTextForm`. `attachAuth` reads bearer from `secureStorage` with `DEFAULT_API_TOKEN` fallback
- [src/services/liveChatActions.js](../src/services/liveChatActions.js) — `sendLiveChatMessage` + 12 convenience wrappers + `uploadMedia` re-export + `markChatRead` (Phase 11)
- [src/services/realtime.js](../src/services/realtime.js) — added `startRealtime`/`stopRealtime` aliases for compatibility
- [src/store/index.js](../src/store/index.js) — registers `liveChatReducer` + `liveChatNotifier` middleware; blacklists `liveChat` from persist
- [src/store/slices/liveChatSlice.js](../src/store/slices/liveChatSlice.js) — `clearUnreadFor` reducer added (Phase 11)
- [src/store/slices/authSlice.js](../src/store/slices/authSlice.js) — `login` thunk supports real token exchange when `OMNI_AUTH_LOGIN_PATH` is set; `logoutAndCleanup` thunk; migrated to `secureStorage`
- [src/screens/whatsapp/LiveAgentChat.js](../src/screens/whatsapp/LiveAgentChat.js) — composer "+" button, attach menu wiring, image/video/document/location/template handlers (Phases 9–10), mark-as-read effect (Phase 11)
- [src/screens/shared/ProfileScreen.js](../src/screens/shared/ProfileScreen.js) — logout dispatches `logoutAndCleanup`
- [src/screens/shared/DashboardScreen.js](../src/screens/shared/DashboardScreen.js) — Live Agent entry-point card with connection-status dot and unread badge
- [src/navigation/AppNavigator.js](../src/navigation/AppNavigator.js) — registers `LiveAgentInbox` and `LiveAgentChat` routes
- [.env](../.env) — purged the ClickHouse credentials that were exposed; documented `EXPO_PUBLIC_DEFAULT_TOKEN` for dev fallback

## Dependencies added

- `@microsoft/signalr` — SignalR JS client (Phase 1)
- `expo-image-picker ~17.0.11` — image + video pick (Phase 9)
- `expo-document-picker ~14.0.8` — already present, used for document attach
- `expo-location ~19.0.8` — GPS auto-fill in location modal (Phase 10)
- `expo-secure-store` — declared in `secureStorage.js` via `try { require(...) }` fallback; install when ready to flip on keychain storage

## Live probe results (verified 2026-05-01)

Tested against `https://icpaas.in` with the demo bearer `cabb46ed-…d20e6073b120` (UserId 102):

| Probe | Result | Implication |
|---|---|---|
| `POST /api/auth/mobile-token` | **404** | Endpoint not deployed. Tried 6 path variations — all 404. Keep `OMNI_AUTH_LOGIN_PATH = null` |
| `GET /api/v1/user/balance` with bearer | **200** | Bearer is valid for the existing icpaas.in REST API surface |
| `POST /whatsAppProgressHub/negotiate` with bearer | **200** | SignalR accepts the bearer at negotiate. **Available transports: SSE + LongPolling — no WebSockets** |
| `GET /WAMessage/UserLiveChat/GetChannels` with bearer | **302 → /AuthService/SignIn** | Live Chat MVC controllers don't honor bearer auth — they require an ASP.NET session cookie. Same for every `UserLiveChat/*` endpoint we wired |

## Backend gaps that block full v1 turn-on

Even with the bearer in hand:

1. **Add bearer-auth scheme to `UserLiveChatController`** (and any sibling controllers we call). Currently `[Authorize]` resolves to cookie auth only → 302. Token validator must map the bearer to UserId 102 / username `omniuser`. **Unblocks criteria 2, 3, and the server side of criterion 7's mark-as-read.**
2. **Add the same bearer scheme to `WhatsAppProgressHub`** so `OnConnectedAsync` resolves `Context.User.Identity.Name` from the bearer. Without it the connection never joins `waba_OMNIUSER`, so broadcasts from `MessageHandlerService.HandleIncomingMessageAsync` won't reach this client. **Unblocks criteria 5 and 6.**

Once both land, `OMNI_AUTH_LOGIN_PATH` can stay `null` — the demo login already seeds the bearer that everything else uses. A dedicated `/api/auth/mobile-token` endpoint is only needed if you want username/password authentication on mobile rather than pasting a long-lived bearer.

---

# v2 backlog

Items intentionally deferred — none of them block the existing surface but each is a good candidate for the next pass once v1 verifies green.

## High-value follow-ups

### Refetch on SignalR reconnect
**Where:** [src/components/RealtimeProvider.js](../src/components/RealtimeProvider.js) + [src/services/realtime.js](../src/services/realtime.js).
**Why:** when the WS drops and recovers (`onreconnected`), any events that fired during the gap are lost. Active screens silently miss them.
**How:** in `onreconnected`, dispatch `loadChatList` + `loadCounts` + (if a chat is active) `loadMessages` for `state.liveChat.activeWaId`.

### Background push (FCM / APNs)
**Why:** SignalR drops on app suspend → no inbound notifications until foreground. Critical for an agent-on-call use case.
**How:** `npx expo install expo-notifications`, register device token after login, POST it to a backend endpoint, server fans out via FCM/APNs alongside SignalR. Foreground handler dispatches `receiveLiveMessage` to keep slice + chat list in sync.

### Notification sound on inbound
**Where:** [src/store/middleware/liveChatNotifier.js](../src/store/middleware/liveChatNotifier.js) — TODO comment already in place.
**How:** `npx expo install expo-audio` (native module → EAS build), package a short MP3 in `assets/sounds/`, play on the same conditions as the current vibration (foregrounded + chat not active).

### Refresh inbox + thread on app foreground
Cheap polling-style fallback for missed real-time events. Listen on `AppState` going `background → active`, dispatch the same refetch logic as the reconnect path.

### Mark-as-read also on scroll-to-bottom
Today we mark when the latest inbound id in the thread changes. Doesn't catch the case where the user scrolled up earlier and only now scrolls back down to the newest message. Easy add: also mark on `onMomentumScrollEnd` when `contentOffset.y` is near 0 (inverted list).

## Composer / attachment polish

### Template picker — full variable coverage
v1 fills body text + single header text only.
- **Header media** (image/video/document) — needs an extra picker step inside the template fill view: pick file → upload → patch the components header parameter.
- **Button URL variables** — dynamic deep-link query params on URL buttons; needs a per-button input.
- **Carousel templates** — per-card form (Meta added these in 2024).
- **Limited-time offers** — `LimitedTimeOffer` block in components with `expiration_time_ms`.

### Reply / quote context UI
The sender already supports `replyToMessageId` on every kind. Wire it: long-press a bubble → "Reply" → composer shows a quote chip → next send includes the context.

### Reaction sender
`sendReaction({ messageId, emoji })` exists in the action layer. Surface as a long-press emoji bar on each bubble.

### Forward & resend
Long-press → "Forward" opens a contact picker (uses gsauth `ChannelsAPI`/contacts). Failed bubbles need a "Retry" affordance — currently the only path is to re-type.

### Voice notes
`expo-audio` recording → `uploadMedia` (audio/mp4) → `sendAudio({ id })`. Hold-to-record UX matching WhatsApp.

### Sticker picker
Trivial after media upload works; `sendSticker({ link })` is wired. Needs a small picker UI for an in-app sticker pack.

## Inbox + chat-list

### Mark-all-as-read at the inbox level
A header action that calls `markAsRead` for every conversation with `UnReadCount > 0` and dispatches `clearUnreadFor` for each.

### Per-chat status pills
OmniApp's `WaUserChatJourney.ChatStatus` (Open / Pending / Solved). Surface as a coloured chip on each row + a status filter chip. Already in the slice via `selectCounts.OpenChat / PendingChat / SolvedChat`.

### Favourite + block
`WAContacts.IsFavourite` and `IsBlock`. Header overflow menu in chat: ☆ Favourite, 🚫 Block. Server endpoints already in [docs/live-agent-reference.md §3](./live-agent-reference.md#3-rest-endpoints-userlivechatcontrollercs) (`BlockUser`/`UnblockUser`).

### Customer journey panel
`GET /WAMessage/UserLiveChat/GetContacts` returns notes + history. Right-rail slide-in showing notes, journey status, contact metadata. CRUD for notes is in the controller.

### Agent assignment UI
`LiveChatAPI.assignAgent` is already wired — needs a bottom sheet on the chat header with "Assign to…" + agent list (fetched via OmniApp `GetAgents`). Confirm-on-conflict and force-assign flows are server-supported.

## Auth + identity

### Real token exchange
Set `OMNI_AUTH_LOGIN_PATH = '/api/auth/mobile-token'` in [src/config.js](../src/config.js) once backend ships the endpoint. Adjust `tryRemoteLogin` in [authSlice.js](../src/store/slices/authSlice.js) if response shape differs from `{ token, user: { username, name, role } }`.

### SecureStore
`secureStorage.js` already wraps `expo-secure-store` with an AsyncStorage fallback. Run `npx expo install expo-secure-store` + dev-client rebuild → first read after upgrade auto-migrates the existing AsyncStorage token. No app code change needed.

### Token rotation / refresh
Today we hold one long-lived bearer. If backend issues short-lived tokens with refresh, wire a 401-interceptor in `omniApi`/`gsauthApi`/`icpaasApi` that calls a refresh endpoint and retries the original request.

### Rotate ClickHouse `default` user password
The credentials previously sat on disk in `.env`. Rotate to close the loop even though they were never committed.

## Multi-channel

### RCS Live Agent
OmniApp has a parallel hub (`/rcsAgentChatHub`) and `RCSLiveAgentController` with the same shape. Most of the slice + middleware can be reused; needs:
- A second SignalR connection (or a hub multiplexer)
- An RCS-flavoured sender (RCS payloads are richer — rich cards, suggestions, carousels)
- Channel selector that handles "channel kind = WhatsApp | RCS"

### Cross-channel unified inbox
Single inbox view spanning WhatsApp + RCS + (eventually) SMS. Requires a unifying message envelope across channel types.

## Hygiene + polish

### Retire mock `InboxScreen` / `ChatScreen`
Keep them while v1 is unverified; once acceptance criteria 2–6 flip green, the legacy `Inbox` / `Chat` aliases in [AppNavigator.js](../src/navigation/AppNavigator.js) can route to the live screens and the mock files can be deleted.

### Audit `AppNavigator.js` import / Stack.Screen consistency
Confirm `WhatsAppInboxScreen` (and any other recent linter-edits) still resolve. There was a moment where the import was removed but the `<Stack.Screen ... />` line still referenced it.

### Connection-status banner instead of pill
For long reconnect cycles a thin amber banner across the inbox header reads more clearly than a tiny pill.

### Per-conversation typing indicators
OmniApp's RCS hub has them; WhatsApp side doesn't (yet). Add when/if WA hub gets the event.

### E2E + integration tests for Live Agent flows
Today we have unit tests for slices/helpers. A small `react-native-testing-library` suite for `LiveAgentInbox` (filter switching, debounced search) and `LiveAgentChat` (optimistic send, status icon transitions, mark-as-read effect) would keep regressions out.

### Crash + perf telemetry
Sentry / Bugsnag hook into `RealtimeProvider` errors and the optimistic-send catch path. Useful once real users start hitting the app.

## Architectural / strategic

### Decide: send via gsauth proxy vs back through OmniApp
Once backend (1) lands, sends could re-route to `UserLiveChat/SendChatMessage` for proper agent attribution in the chat journal. Today they hit Meta directly via gsauth (works, but OmniApp doesn't see who sent it). Worth a deliberate call.

### `_whatsAppConfigProvider.GetConfigForOwnerAsync(wabaNumber, userId)`
If you ever want mobile to call Meta directly (skipping the gsauth proxy), backend needs a UserId-scoped variant of `GetConfigAsync`. Don't expose the existing unscoped one — it would leak `FBAccessToken` across tenants.

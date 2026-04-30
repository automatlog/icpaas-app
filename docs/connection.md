# Connecting icpaas-app to OmniApp's WhatsApp Live Agent backend

> **Scope.** This document scopes the work needed to make icpaas-app a real-time WhatsApp Live Agent client against the OmniApp backend documented in [live-agent-reference.md](./live-agent-reference.md).
> **Status: design-only.** No code is being written until this is approved.

---

## 1. What we're connecting to

OmniApp exposes two transports the mobile client must speak to:

| Transport | URL pattern | Purpose | Auth |
|---|---|---|---|
| HTTPS REST | `https://<omni-host>/WAMessage/UserLiveChat/...` | List chats, fetch messages, send replies, assign agents, fetch metadata | ASP.NET cookie auth today; will need bearer/token bridging for mobile |
| SignalR (WebSocket) | `wss://<omni-host>/whatsAppProgressHub` | Push: `ReceivedMessage`, `UpdateUnreadCount`, `DeliveryStatusUpdate`, `ReceivePresence` | Same identity → server adds connection to group `waba_<USERNAME upper>` |

Both must agree on the **same authenticated user identity** — SignalR binds the connection to a group derived from `Context.User.Identity.Name`, so until the mobile request is authenticated as a specific OmniApp user, no broadcasts will reach it.

---

## 2. Open questions (must resolve before coding)

These need backend confirmation. They block implementation, not design.

1. **Auth bridge for mobile.** OmniApp uses ASP.NET Identity cookies today. The mobile app needs either (a) a token-issuing endpoint that returns a bearer the SignalR `accessTokenFactory` can use, or (b) a same-site cookie obtained via a webview login. Recommendation: add a `POST /api/auth/mobile-token` endpoint that swaps username/password for a JWT, and configure SignalR to accept `?access_token=<jwt>` on the WebSocket query string (the standard SignalR pattern when cookies aren't available).
2. **CORS / WebSocket from RN.** Confirm OmniApp host accepts cross-origin WebSocket upgrades from the mobile app's origin. Native RN WebSockets ignore CORS; web build does not.
3. **Username collision with `omniuser` demo.** The current icpaas-app login is hard-coded to `omniuser / Omni@1234` and seeds `DEFAULT_API_TOKEN`. Real OmniApp usernames will need to override that — see §6.
4. **Are agent attachments hosted publicly?** OmniApp serves media from `/WhatsAppMedia/LiveAgent/<UserName>/...`. Mobile clients need either a signed URL or the same auth cookie/bearer to download.
5. **Push when app is backgrounded.** SignalR drops on app suspend. For background notifications we'd need FCM/APNs in addition to SignalR. Out of scope for v1 — document but don't build.

---

## 3. Library choices

| Concern | Pick | Why |
|---|---|---|
| SignalR client | `@microsoft/signalr` (npm) | Official; works in RN with `withUrl(url, { transport: HttpTransportType.WebSockets, skipNegotiation: true })`. Avoids the negotiate POST that needs cookies. |
| WebSocket polyfill | None needed | RN ships a WebSocket global. |
| Form-data uploads | Built-in `FormData` | Already used elsewhere in RN; works with axios. |
| Date display | `moment` | Already a dependency ([package.json:29](../package.json#L29)). |

`@microsoft/signalr` adds ~120 KB gzipped; acceptable for the value.

Install: `npm i @microsoft/signalr`.

---

## 4. Connection lifecycle

The SignalR client must be a **singleton bound to the app session**, not to any one screen. Mounting it inside `InboxScreen` would tear the socket down on every navigation away.

```
App.js
  └─ <Provider store={store}>
       └─ <RealtimeProvider>          ← new component
            └─ <RootNavigator />
```

`RealtimeProvider` responsibilities:

1. On mount + when `auth.isAuthenticated` becomes true → call `connect()`.
2. On `logout` action → call `stop()`.
3. On app state change `active → background` → keep connection (let SignalR's automatic reconnect handle drops).
4. On reconnect → re-fetch the active chat list and current conversation messages (a missed `ReceivedMessage` while reconnecting must not leave the UI stale).

Reference shape:

```js
// src/services/realtime.js
import * as signalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../store';
import { receiveLiveMessage, updateUnreadCount, updateDeliveryStatus }
  from '../store/slices/liveChatSlice';

let connection = null;

export async function connect(host) {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${host}/whatsAppProgressHub`, {
      transport: signalR.HttpTransportType.WebSockets,
      skipNegotiation: true,
      accessTokenFactory: () => AsyncStorage.getItem('icpaas_token'),
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  connection.on('ReceivedMessage', chat =>
    store.dispatch(receiveLiveMessage(chat)));
  connection.on('UpdateUnreadCount', (waId, count) =>
    store.dispatch(updateUnreadCount({ waId, count })));
  connection.on('DeliveryStatusUpdate', s =>
    store.dispatch(updateDeliveryStatus(s)));

  connection.onreconnected(() => store.dispatch({ type: 'liveChat/reconnected' }));
  connection.onclose(err => store.dispatch({ type: 'liveChat/disconnected', error: err?.message }));

  await connection.start();
  return connection;
}

export async function stop() {
  if (!connection) return;
  await connection.stop();
  connection = null;
}
```

Group membership is implicit — server-side `OnConnectedAsync` adds the connection to `waba_<USERNAME upper>`. Client doesn't call `joinGroup`.

---

## 5. REST surface (minimum for v1)

Only seven endpoints are required to ship a usable Live Agent. Everything else (templates, media library, exports, block/unblock, notes, journey) is v2.

| Use | Method + Path | Notes |
|---|---|---|
| List channels | `GET /WAMessage/UserLiveChat/GetChannels` | Populates a channel picker on the inbox header. |
| Chat-list badges | `POST /WAMessage/UserLiveChat/GetChatCount` | Body `{ channel, chatType }`. Drives the filter chips with counts. |
| Chat list | `POST /WAMessage/UserLiveChat/GetChatList` | Body `{ channel, chatType, search, pageIndex, pageSize }`. **Note:** active chats are server-windowed to the last 24 h. |
| Message history | `GET /WAMessage/UserLiveChat/GetUserChatMessages?senderNumber=&channelNumber=&chatType=&beforeId=&pageSize=50` | **Cursor-based.** Persist the oldest `WAInboxId` per conversation; pass it as `beforeId` on scroll-up. |
| Send | `POST /WAMessage/UserLiveChat/SendChatMessage` (multipart) | Fields `File[], Number, WaInboxId, Channel, ChatType, Message, ReplyToMessageId, Latitude?, Longitude?, LocationURL`. |
| Status timeline | `GET /WAMessage/UserLiveChat/getAllStatus?messageId=...` | Optional — used when user taps a message to inspect delivery. |
| Assign agent | `POST /WAMessage/UserLiveChat/AssignAgent` | Body `{ agentId, waNumber, channel, force }`. v1 may omit if every login is the assigned agent. |

These map onto a new namespace in [src/services/api.js](../src/services/api.js):

```js
export const LiveChatAPI = {
  getChannels:    ()                            => api.get('/WAMessage/UserLiveChat/GetChannels'),
  getCounts:      (channel, chatType)           => api.post('/WAMessage/UserLiveChat/GetChatCount', { channel, chatType }),
  getChatList:    ({ channel, chatType, search, pageIndex = 1, pageSize = 16 }) =>
    api.post(`/WAMessage/UserLiveChat/GetChatList?channel=${channel}&chatType=${chatType}&pageIndex=${pageIndex}&pageSize=${pageSize}`,
             { Search: search }),
  getMessages:    ({ senderNumber, channelNumber, chatType = 'active', beforeId, pageSize = 50 }) =>
    api.get('/WAMessage/UserLiveChat/GetUserChatMessages',
            { params: { senderNumber, channelNumber, chatType, beforeId, pageSize } }),
  sendMessage:    (formData) => api.post('/WAMessage/UserLiveChat/SendChatMessage', formData,
                                         { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAllStatus:   (messageId)                   => api.get('/WAMessage/UserLiveChat/getAllStatus', { params: { messageId } }),
  assignAgent:    ({ agentId, waNumber, channel, force = false }) =>
    api.post('/WAMessage/UserLiveChat/AssignAgent', { agentId, waNumber, channel, force }),
};
```

Note: the existing axios instance points at `https://gsauth.com` ([api.js:40](../src/services/api.js#L40)). The Live Chat endpoints live on the OmniApp host, not gsauth, so we need a third axios instance `omniApi` keyed off a configurable `OMNI_HOST` (env or runtime config).

---

## 6. Auth glue

Today's flow ([authSlice.js](../src/store/slices/authSlice.js)):

```
LoginScreen → authSlice.login('omniuser', 'Omni@1234')
            → AsyncStorage.setItem('icpaas_token', DEFAULT_API_TOKEN)
            → loginSuccess({username, name, role})
```

That has to become:

```
LoginScreen → POST /api/auth/mobile-token  { username, password }
            → response: { token, user: { id, name, parentId, isAgent, isAllChatAssign } }
            → AsyncStorage.setItem('icpaas_token', token)
            → loginSuccess(user)
            → realtime.connect(OMNI_HOST)        ← new
```

The bearer is consumed by:
1. `attachAuth` interceptor in api.js → `Authorization: Bearer ...`
2. SignalR `accessTokenFactory` → `?access_token=<jwt>` on the WS upgrade

Logout symmetrically calls `realtime.stop()` before clearing storage.

---

## 7. Redux: a new `liveChatSlice`

The existing [conversationsSlice](../src/store/slices/conversationsSlice.js) and [messagesSlice](../src/store/slices/messagesSlice.js) are conversation-shape-agnostic and could be extended in place. **Recommendation:** add a separate `liveChatSlice` instead. Reasons:
- Live Chat has fields the existing slices don't model: `WABANumber` (channel), `wa_id`, `AgentId`, `DeliveryStatus`, `MessageType`, cursor `WAInboxId`, server-side counts.
- Keeps the mock inbox/chat screens working while live agent is built side by side.
- Easier to delete or feature-flag if the integration is dropped.

Proposed shape:

```js
{
  liveChat: {
    connection: { status: 'idle'|'connecting'|'connected'|'reconnecting'|'disconnected', error: null },
    channels: [{ wabaNumber, displayName, ... }],
    selectedChannel: 'All' | wabaNumber,
    counts: {  // from GetChatCount
      AllCount, UnAssignedCount, AssignedCount, UnReadChatCount,
      RepliedChatCount, BlockContacts, FavouriteContacts,
      OpenChat, PendingChat, SolvedChat,
    },
    chatList: {
      filter: 'All',                    // see filter table in §6 of reference
      pageIndex: 1,
      totalPages: 1,
      items: [WebChatsModel...],        // ordered, latest first
      loading: false,
    },
    threads: {
      [waId]: {
        channel: wabaNumber,
        messages: [ChatModel...],       // ordered, oldest first
        oldestId: WAInboxId | null,     // cursor for scroll-up
        hasMore: true,
        loading: false,
      }
    },
    activeWaId: null,
    activeChannel: null,
  }
}
```

Action map:

| Action | Source |
|---|---|
| `liveChat/setChannels` | `LiveChatAPI.getChannels` resolved |
| `liveChat/setCounts` | `LiveChatAPI.getCounts` resolved |
| `liveChat/setChatList` | `LiveChatAPI.getChatList` resolved (replace) |
| `liveChat/appendChatList` | `LiveChatAPI.getChatList` resolved (paginate) |
| `liveChat/setThread` | `LiveChatAPI.getMessages` resolved with no `beforeId` |
| `liveChat/prependThread` | `LiveChatAPI.getMessages` resolved with `beforeId` (scroll-up) |
| `liveChat/receiveLiveMessage` | SignalR `ReceivedMessage` |
| `liveChat/updateUnreadCount` | SignalR `UpdateUnreadCount` |
| `liveChat/updateDeliveryStatus` | SignalR `DeliveryStatusUpdate` |
| `liveChat/optimisticSend` | dispatched before `LiveChatAPI.sendMessage` |
| `liveChat/sendResolved` | replaces optimistic row with server `MessageId` |
| `liveChat/sendFailed` | marks row red |
| `liveChat/setActive` | user opens a chat |
| `liveChat/connection/*` | RealtimeProvider lifecycle |

Selectors derive UI from there:
- `selectChatListForRender(state)` — filtered by current `selectedChannel` and search.
- `selectMessagesForActive(state)` — `state.liveChat.threads[activeWaId]?.messages`.
- `selectUnreadBadgeTotal(state)` — sum of `UnReadCount` across `chatList.items`.

Persist config: add `'liveChat'` to the persist blacklist or whitelist only `connection.status` (live data is server-of-record; persisting it would show stale chats on relaunch).

---

## 8. Send flow (the non-trivial bit)

Optimistic UI is necessary because Meta round-trips can be 200 ms – 5 s.

```
User taps Send
  ├─ build local row {id: tempId, ChatType: 'OUT', DeliveryStatus: 'Sending', ...}
  ├─ dispatch optimisticSend(tempId, row)
  ├─ build FormData (File[], Number, Channel, Message, ReplyToMessageId, lat/lon)
  ├─ LiveChatAPI.sendMessage(formData)
  │     └─ resolves { Success, Message } — but the controller does NOT echo back the wamid
  ├─ on success: dispatch sendResolved(tempId, { DeliveryStatus: 'Sent' })
  │   └─ subsequent SignalR DeliveryStatusUpdate events upgrade Sent → Delivered → Read
  └─ on failure: dispatch sendFailed(tempId, errorMessage)
```

Because the send response doesn't return the `MessageId`, the optimistic row will sit at status `Sent` until SignalR's `DeliveryStatusUpdate` arrives. The match is by `MessageId`, but our optimistic row only has `tempId`. Three options:

a. **Inflate from next `ReceivedMessage` / list refetch** — heavy.
b. **Patch OmniApp** to return `{ Success, Message, MessageId }`. Cleanest. (Recommended.)
c. **Match heuristically** on `(wa_id, MessageText, Now ± 5s)`. Fragile; skip.

Resolve before coding — see §2.

---

## 9. Receive flow

```
SignalR fires ReceivedMessage(chat: ChatModel)
  ├─ dispatch receiveLiveMessage(chat)
  │   ├─ if threads[chat.wa_id] exists → push to messages
  │   ├─ upsert into chatList.items (move to top, update LastMessage)
  │   └─ if activeWaId !== chat.wa_id → bump UnReadCount
  └─ play notification sound IF app foregrounded AND chat not active
```

Background notifications (app suspended): not in v1; defer to FCM/APNs.

Read-receipt on agent side (mark inbound messages as read when user opens the conversation): OmniApp uses `MarkMessagesAsRead` server-side called from the chat-open handler — verify this exists in the controller (it isn't in the v1 endpoint set above). If absent, document as a v2 gap.

---

## 10. Failure modes the design must handle

| Failure | Behavior |
|---|---|
| SignalR drops | `withAutomaticReconnect` retries 0/2/5/10/30 s. UI banner: "Reconnecting…". On success: silently refetch active list+thread to recover missed events. |
| Token expires mid-session | API 401 → dispatch `auth/logout` → realtime.stop() → navigate to LoginScreen. |
| Send fails (network) | Row stays in `Sending` with retry chip; tap to redispatch. |
| Send fails (Meta error, e.g. outside 24 h window) | Row goes red; show server's `Message` string. |
| `GetChatList` returns 0 with non-zero counts | Most likely an agent-scoping mismatch (`IsAllChatAssign` flag) — show empty state with "Check agent assignment in OmniApp web" hint. |
| Two devices logged in as same user | Both join the same SignalR group, both receive every event — fine. Sends are independent. No conflict. |

---

## 11. Files we expect to add / change (preview only — not building yet)

**New:**
- [src/services/realtime.js](../src/services/realtime.js) — SignalR singleton.
- [src/store/slices/liveChatSlice.js](../src/store/slices/liveChatSlice.js) — state above.
- [src/components/RealtimeProvider.js](../src/components/RealtimeProvider.js) — connect / disconnect lifecycle.
- [src/screens/whatsapp/LiveAgentInbox.js](../src/screens/whatsapp/LiveAgentInbox.js) — new screen, parallel to mock InboxScreen.
- [src/screens/whatsapp/LiveAgentChat.js](../src/screens/whatsapp/LiveAgentChat.js) — new screen, parallel to mock ChatScreen.

**Changed:**
- [src/services/api.js](../src/services/api.js) — add `omniApi` axios instance + `LiveChatAPI` namespace.
- [src/store/index.js](../src/store/index.js) — register `liveChatSlice`, blacklist or selectively whitelist persist.
- [src/store/slices/authSlice.js](../src/store/slices/authSlice.js) — replace hard-coded login with real token exchange; trigger `realtime.connect()` on success and `realtime.stop()` on logout.
- [src/navigation/AppNavigator.js](../src/navigation/AppNavigator.js) — register the two new screens, add a tile/entry from Dashboard.
- [App.js](../App.js) — wrap navigator in `RealtimeProvider`.

The existing mock inbox/chat screens stay untouched until v1 is verified, then can be deleted in a follow-up.

**Configuration:**
- An env-driven `OMNI_HOST` constant. Without it the app should refuse to connect rather than silently failing — surface in a banner at top of inbox.

---

## 12. v1 acceptance criteria

A reviewer can mark v1 done when, on a fresh install:

1. Login with a real OmniApp username/password succeeds and a bearer is stored.
2. The Live Agent inbox loads the chat list from `GetChatList` (not mocks) and the badge counts match `GetChatCount`.
3. Opening a conversation loads messages from `GetUserChatMessages` and scrolling up paginates with `beforeId`.
4. Sending a text reply reaches the customer's WhatsApp and the row updates `Sent → Delivered → Read` via SignalR.
5. With the app foregrounded, a customer sending a new message causes the inbox to update and the conversation to append in under 2 s, without manual refresh.
6. Killing WiFi for 30 s and restoring it triggers automatic reconnect; the missed inbound message appears within 5 s of reconnect.
7. Logging out closes the SignalR connection (verify in OmniApp logs that `OnDisconnectedAsync` fires).

v2 features explicitly **out of scope** for v1: templates, media send, location send, agent assignment UI, archive view, exports, notes, customer-journey panel, block/unblock, welcome/off-hour config, push notifications when backgrounded.

---

## 13. Risks

- **Auth bridge is the critical path.** If OmniApp can't issue bearers acceptable to SignalR's `accessTokenFactory`, the rest is moot. Get sign-off from backend before front-end work starts.
- **Username case sensitivity.** Server uses `userName.ToUpper()` for group naming. The login response must include the canonical username — using a typed-in string risks group-name drift.
- **24-hour active window.** New users will be confused why old chats vanish from the inbox. Either surface the "Archive" filter in the UI or add an "Older" hint chip.
- **Send response missing `MessageId`** — see §8. Push for the OmniApp patch.
- **Singleton SignalR + RN fast-refresh** — during dev, hot reload may leave a stale connection alive. The provider must guard against double-`start()` and the dev menu should expose a "reconnect" action.

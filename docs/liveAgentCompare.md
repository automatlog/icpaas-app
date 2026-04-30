# Live Agent — icpaas-app vs OmniApp side-by-side

> **Scope.** Compare the icpaas-app code that already exists ([InboxScreen](../src/screens/whatsapp/InboxScreen.js), [ChatScreen](../src/screens/whatsapp/ChatScreen.js), Redux slices, API surface) with what the OmniApp WhatsApp Live Agent does (see [live-agent-reference.md](./live-agent-reference.md)). Identify what stays, what changes, what's missing, what's irrelevant.
> Pairs with the porting blueprint in [connection.md](./connection.md).

---

## 1. One-line verdict

The icpaas-app shells (inbox list + chat thread + send composer) are **structurally compatible** with what Live Agent needs — same column layout, same bubble patterns, same Redux split (list slice + per-conversation message slice). The gap is **not UI**. The gap is everything that makes the data live: real REST calls, a websocket, a richer message model, cursor pagination, delivery-status updates, channel scoping, and agent identity.

So the recommended path is **extend, then replace** — keep the existing screens working against mocks, build a parallel `LiveAgent*` pair against the real backend, then retire the mocks once parity is reached.

---

## 2. Feature-by-feature comparison

Legend: ✅ already present · ⚠️ partial / placeholder · ❌ missing · ➖ N/A for mobile

| Capability | icpaas-app today | OmniApp Live Agent | Action |
|---|---|---|---|
| **Conversation list** | ✅ Mock list, hard-coded ([InboxScreen.js:43-52](../src/screens/whatsapp/InboxScreen.js#L43-L52)). Falls back to mock when API rejects. | Server-paginated `WebChatsModel[]`, last-24h window, server-side counts | Replace mock + fallback with `LiveChatAPI.getChatList` + `getCounts`. |
| **Channel filter chips** | ✅ Local filter `All / WhatsApp / SMS / RCS / Unread` ([InboxScreen.js:14-20](../src/screens/whatsapp/InboxScreen.js#L14-L20)) | Server-side `chatType` in {`All`, `UnRead`, `Assigned`, `UnAssigned`, `Replied`, `Open`, `Pending`, `Solved`, `Favourite`, `Blocked`, `archive`} | New chip set, query-param-driven; `WhatsApp/SMS/RCS` chips disappear in WA-only Live Agent. |
| **Channel selector (multi-WABA)** | ❌ | `GetChannels` returns active `WABAChannels` for the user; agent picks one or "All" | Add a header pill or top-of-list dropdown. |
| **Search** | ✅ Local `name` substring ([InboxScreen.js:96-104](../src/screens/whatsapp/InboxScreen.js#L96-L104)) | Server-side substring on `wa_id` + `ProfileName` | Pass `Search` in `GetChatList` body; debounce 300 ms. |
| **Unread badge per row** | ✅ from mock `cv.unread` | Server `WebChatsModel.UnReadCount` | Direct mapping. |
| **Online dot** | ✅ from mock `cv.online` | OmniApp Live Agent doesn't track customer presence | Drop the dot, or repurpose for "in 24-h service window". |
| **Pagination of inbox** | ❌ Renders the entire array | `pageIndex` + `pageSize=16`, returns `totalPages`, `totalCount` | Add infinite scroll on FlatList `onEndReached`. |
| **Pull-to-refresh** | ✅ ([InboxScreen.js:186](../src/screens/whatsapp/InboxScreen.js#L186)) | — | Keep, but refetch page 1 + counts. |
| **FAB to compose new** | ✅ ([InboxScreen.js:238-245](../src/screens/whatsapp/InboxScreen.js#L238-L245)) | OmniApp opens new chat by typing a number into composer of an existing chat (no "new chat" UX) | Repurpose FAB to "new conversation" modal that asks for number + WABA channel and pre-fills a fresh `ChatScreen`. |
| **Message thread** | ✅ Mock messages ([ChatScreen.js:18-24](../src/screens/whatsapp/ChatScreen.js#L18-L24)) | `ChatModel[]` from `GetUserChatMessages`, **cursor-based** | Rewrite loader; track `oldestId` per thread for scroll-up. |
| **Day separators** | ✅ ([ChatScreen.js:110-122](../src/screens/whatsapp/ChatScreen.js#L110-L122)) | UI-only feature in OmniApp web too | Keep as is. |
| **Bubble status icons** | ✅ check / check-done / blue check ([ChatScreen.js:202-208](../src/screens/whatsapp/ChatScreen.js#L202-L208)) | Driven by `DeliveryStatus` field updated via `DeliveryStatusUpdate` SignalR event | Keep the renderer; rewire to read `DeliveryStatus`. |
| **Send text** | ✅ Working — `WhatsAppAPI.sendReply` is real ([api.js:549](../src/services/api.js#L549)) | `POST SendChatMessage` multipart | Swap call to `LiveChatAPI.sendMessage`. |
| **Optimistic local row** | ✅ ([ChatScreen.js:87-95](../src/screens/whatsapp/ChatScreen.js#L87-L95)) | Same pattern; OmniApp web also optimistic | Keep, but key by `tempId` and reconcile when SignalR delivers the canonical row. |
| **Quick-reply templates** | ⚠️ 4 hard-coded canned responses ([ChatScreen.js:26-31](../src/screens/whatsapp/ChatScreen.js#L26-L31)) | Server `GetTemplatesForUser` returns `WATemplates` (Meta-approved) | v2 — replace with `LiveChatAPI.getTemplates()` + variable-fill UI. |
| **Reply-to / quoted messages** | ❌ | `ReplyToMessageId` + `ReplyToText` rendered as a quote chip above the bubble | Add bubble decoration + composer state; back-end already supports it. |
| **Attach file** | ❌ ("+" button toggles templates only) | Image/video/document/audio + caption | v2 — needs `expo-document-picker` (already a dep) + `expo-image-picker` (not a dep) + multipart wiring. |
| **Send location** | ❌ | `Latitude/Longitude/LocationURL` fields on `SendChatMessage` | v2. |
| **Emoji picker** | ⚠️ icon present, no picker ([ChatScreen.js:259-261](../src/screens/whatsapp/ChatScreen.js#L259-L261)) | `emoji-mart` in OmniApp web | v2 — RN needs a different picker library. |
| **Notification sound on receive** | ❌ | `new Audio('/soundfileDownload/wa-message-notification.mp3').play()` | Add `expo-av` ping when foregrounded + chat not active. |
| **Push when app backgrounded** | ❌ | OmniApp browser tabs go silent too — relies on tab being open | Out of scope. Note in README. |
| **Typing indicator** | ❌ | Server hub method exists for RCS, **not implemented for WhatsApp** in OmniApp | Skip — parity. |
| **Presence (agent online/offline)** | ❌ | Hub method `UpdatePresence`/`ReceivePresence` exists; not surfaced in WA Live Chat UI | Skip — parity. |
| **Agent assignment UI** | ⚠️ Mock roster screen ([AgentScreen.js](../src/screens/shared/AgentScreen.js)) — disconnected from chat | `POST AssignAgent` with confirm-on-conflict logic | v2 — bottom-sheet from chat header. |
| **Block / Unblock contact** | ❌ | `POST BlockUser/UnblockUser` | v2 — overflow menu in chat header. |
| **Customer journey notes** | ❌ | `GET GetContacts` returns notes + history; web sidebar shows it | v2 — slide-in panel from right of chat. |
| **Welcome / off-hour auto-reply config** | ❌ | `AgentChatConfig` screens with payload editors | v3 — settings screen, low priority for mobile. |
| **Export chat as CSV** | ❌ | `ExportChat` endpoint | Skip on mobile. |
| **24-hour service window countdown** | ❌ | Web shows `remainingTime` / `isWindowExpiringSoon` to warn agent before window closes | v2 — important UX cue; add a banner above composer. |
| **Real-time fan-out (websocket)** | ❌ — no socket of any kind | SignalR group `waba_<USERNAME upper>` | The whole point of this work. See [connection.md §4](./connection.md). |

Headline: of ~30 capabilities, icpaas-app has **9 working**, **5 partial/placeholder**, **15 missing**. The 15 missing decompose into a small v1 (real REST + SignalR + delivery status) and a longer v2 backlog.

---

## 3. Code-level mapping

### 3.1 InboxScreen.js → LiveAgentInbox

| Existing line(s) | Today | Replace with |
|---|---|---|
| [L43-52](../src/screens/whatsapp/InboxScreen.js#L43-L52) `MOCK_CONVERSATIONS` | hard-coded array | delete |
| [L82-92](../src/screens/whatsapp/InboxScreen.js#L82-L92) `fetchConversations` calls `WhatsAppAPI.getConversations` (always rejects → falls back to mock) | mock fallback | `LiveChatAPI.getChatList({channel, chatType, search, pageIndex})` + `LiveChatAPI.getCounts(channel, chatType)`; dispatch `setChatList` / `setCounts` |
| [L96-104](../src/screens/whatsapp/InboxScreen.js#L96-L104) local `filter` + `search` | client-side filtering | server-side query params; client only owns the input strings |
| [L14-20](../src/screens/whatsapp/InboxScreen.js#L14-L20) `FILTERS_OMNI` chips | channel mix | rewrite as `[All, UnRead, Assigned, UnAssigned, Replied, Archive]` with badge counts from `state.liveChat.counts` |
| Whole component subscribes to `state.conversations.list` | mock slice | subscribe to selector `selectChatListForRender(state)` from `liveChatSlice` |
| FAB → `navigation.navigate('Send')` | route to existing `SendMessageScreen` | route to a new `LiveAgentNewChat` modal (or reuse Send for v1) |
| Online dot | mock `cv.online` | drop, or replace with 24-h-window indicator |

Estimated: 60% of the file unchanged (NativeWind layout, header, search bar, FlatList rendering); the data binding and filter logic are rewritten.

### 3.2 ChatScreen.js → LiveAgentChat

| Existing line(s) | Today | Replace with |
|---|---|---|
| [L18-24](../src/screens/whatsapp/ChatScreen.js#L18-L24) `MOCK_MESSAGES` | hard-coded array | delete |
| [L70-79](../src/screens/whatsapp/ChatScreen.js#L70-L79) `loadMessages` calls `WhatsAppAPI.getMessages(conversation.id)` (rejects → mock) | mock fallback | `LiveChatAPI.getMessages({senderNumber: conv.wa_id, channelNumber: conv.wabaNumber, chatType, beforeId: undefined})`; dispatch `setThread` |
| Missing: scroll-up pagination | n/a | on `onStartReached`, call same with `beforeId = state.threads[waId].oldestId`; dispatch `prependThread` |
| [L83-101](../src/screens/whatsapp/ChatScreen.js#L83-L101) `sendMessage` | builds local row, calls `WhatsAppAPI.sendReply` (real Cloud API), updates row | build `FormData` with `Number, Channel, Message, ReplyToMessageId`; call `LiveChatAPI.sendMessage`; dispatch `optimisticSend` then `sendResolved`/`sendFailed`. **Don't bypass OmniApp** — it owns persistence + agent attribution. |
| [L57](../src/screens/whatsapp/ChatScreen.js#L57) selector `state.messages[conversation.id]` | mock slice keyed by conversation id | selector against `state.liveChat.threads[conv.wa_id].messages` |
| [L202-208](../src/screens/whatsapp/ChatScreen.js#L202-L208) status icons branched on `'read'`/`'delivered'`/else | string literal status | branch on `DeliveryStatus` enum (`Sent`/`Delivered`/`Read`/`Failed`) — also needs a red ✗ icon for `Failed` |
| [L26-31](../src/screens/whatsapp/ChatScreen.js#L26-L31) `QUICK_TEMPLATES` | hard-coded canned responses | v1: keep as quick canned text; v2: swap for real WA templates with variable fill |
| [L242-248](../src/screens/whatsapp/ChatScreen.js#L242-L248) "+" button toggles templates | local UI only | v2: turn into an attachment menu (template / image / document / location) |
| Header [L153-158](../src/screens/whatsapp/ChatScreen.js#L153-L158) call + overflow icons | non-functional | overflow → block/unblock + journey panel (v2) |
| Missing: 24-h window banner | n/a | add a thin chip above composer when `now - lastInbound > 23h` |

Estimated: 50% unchanged.

### 3.3 Redux

| Existing | Action |
|---|---|
| [conversationsSlice.js](../src/store/slices/conversationsSlice.js) — `list` of generic conversations + `badge` total | **Keep untouched** for the mock screens. New `liveChatSlice` lives alongside it. |
| [messagesSlice.js](../src/store/slices/messagesSlice.js) — `{conversationId: msg[]}` | **Keep untouched** for now. Live Agent uses `liveChat.threads[waId]` keyed by `wa_id` (because OmniApp identifies a chat by wa_id+wabaNumber, not by an arbitrary id). |
| [authSlice.js](../src/store/slices/authSlice.js) — hard-coded `omniuser/Omni@1234`, seeds `DEFAULT_API_TOKEN` | Replace login thunk with real token exchange. Add `realtime.connect()` after `loginSuccess` and `realtime.stop()` on `logout`. See [connection.md §6](./connection.md#6-auth-glue). |
| [store/index.js](../src/store/index.js) | Register `liveChatReducer`. Blacklist `liveChat` from persist (server is source of truth). |

### 3.4 API surface

| Existing | Action |
|---|---|
| `api` axios instance → `https://gsauth.com` ([api.js:53-60](../src/services/api.js#L53-L60)) | Keep — used by current Send pipeline. |
| `icpaasApi` axios instance → `https://icpaas.in` ([api.js:62-68](../src/services/api.js#L62-L68)) | Keep — Voice/IVR. |
| `attachAuth` always uses `DEFAULT_API_TOKEN` ([api.js:73-76](../src/services/api.js#L73-L76)) | **Change** — read from AsyncStorage so real bearers flow through. The hard-coded fallback is a demo crutch that breaks real-user identity. |
| `WhatsAppAPI.getConversations` / `getMessages` are stubbed `unsupported(...)` ([api.js:578-579](../src/services/api.js#L578-L579)) | Leave the stubs (they belong to the mock screens). New `LiveChatAPI` namespace handles the real calls — see [connection.md §5](./connection.md#5-rest-surface-minimum-for-v1). |
| `WhatsAppAPI.sendReply` ([api.js:549](../src/services/api.js#L549)) — sends directly via Meta Cloud API | **Don't use it from Live Agent.** OmniApp must own the send so its DB sees the OUT row. Live Agent calls `LiveChatAPI.sendMessage` instead. The existing `sendReply` stays for the standalone Send screen. |
| Need third axios instance for `https://<omni-host>` | **Add** `omniApi` with `attachAuth` interceptor. |

---

## 4. UX / theming

The two new screens should reuse:

- The same `C.dark` / `C.light` palette objects.
- `softBg`, `inputBg`, `textInk`, `textMuted`, `textDim` className helpers.
- The `Ionicons` set (no new icon library).
- The bubble shape, day-separator style, and FAB style — they're already on-brand.

What needs to look different in Live Agent (so it's clear this is the live-data screen, not the mock):
- Title `WhatsApp Live` instead of `Inbox` / `WhatsApp Inbox`.
- A small connection-status pill in the header (`live` / `reconnecting` / `offline`), driven by `state.liveChat.connection.status`.
- A WABA channel pill next to the title when more than one channel is configured.

---

## 5. AgentScreen — keep, retire, or repurpose?

[AgentScreen.js](../src/screens/shared/AgentScreen.js) is a static roster of mock agents (status, queue, avg time). It does not connect to any chat or routing system. Two options:

a. **Repurpose** it to show real OmniApp agents from `GET /WAMessage/UserLiveChat/GetAgents`, with their currently-assigned chat counts. Use it as the surface that opens the AssignAgent bottom-sheet. This justifies keeping the screen.
b. **Retire** it. The mock data is misleading and the dashboard tile that links to it can be removed.

Recommendation: **(a) for v2.** Don't touch in v1.

---

## 6. The "what's NOT in OmniApp Live Agent" gap

Worth calling out so we don't expect parity in the wrong direction:

- icpaas-app has SMS, RCS, Voice, IVR. OmniApp WhatsApp Live Chat is WhatsApp-only — RCS has its own parallel hub (`/rcsAgentChatHub`). If you later want RCS Live Agent, expect a similar but distinct integration.
- icpaas-app has campaign builders. Live Agent is reactive — campaigns aren't part of it.
- icpaas-app's mock dashboard shows wallet balance, channel tiles, recent activity. Live Agent has none of that. The Live Agent screen should be reachable from the dashboard but doesn't replace it.

---

## 7. Recommended sequence (no estimates, just order)

If/when this gets greenlit:

1. Resolve the open questions in [connection.md §2](./connection.md#2-open-questions-must-resolve-before-coding) — especially auth bridge.
2. Add `omniApi` axios instance + `LiveChatAPI` namespace.
3. Add `liveChatSlice` + selectors.
4. Add `realtime.js` singleton + `RealtimeProvider`.
5. Build `LiveAgentInbox` (read-only at first — render server data, no send).
6. Build `LiveAgentChat` history view + cursor pagination.
7. Wire the send composer.
8. Wire SignalR receive + delivery-status updates.
9. Add reconnect handling (banner + refetch).
10. Replace login thunk with real auth.
11. Run the v1 acceptance criteria from [connection.md §12](./connection.md#12-v1-acceptance-criteria).
12. Retire mock InboxScreen + ChatScreen, or feature-flag them behind a dev-only menu.

After v1 ships, prioritize the v2 list by which gap your real users hit first (likely: media send, then templates, then 24-h window banner, then assign/block).

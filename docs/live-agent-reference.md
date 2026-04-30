# OmniApp WhatsApp Live Agent — Working Logic Reference

## Context

The user (icpaas-app developer) wants a written reference of how the **WhatsApp Live Agent / Live Chat** feature works inside OmniApp at `C:\Users\AMAN\Downloads\AlotPlugins\OmniApp`. **Documentation only — no code changes to icpaas-app.** Scope is WhatsApp only (RCS path is parallel but separate).

OmniApp is an ASP.NET Core (MVC) backend with a KnockoutJS + SignalR frontend. The Live Chat feature is the agent-facing console where humans handle inbound WhatsApp conversations from end customers via the Meta WhatsApp Business Cloud API (WABA).

---

## 1. End-to-end flow at a glance

```
                ┌─────────────────────────────────────────┐
 Customer ───►  │ Meta WhatsApp Cloud API                 │
 (WhatsApp)     └──────────────┬──────────────────────────┘
                               │ webhook POST
                               ▼
                ┌──────────────────────────────────────────┐
                │ MetaWabaWebhookProcessor                 │
                │ (4 bounded Channel<T> queues, 5M cap)    │
                │  • user-initiated messages               │
                │  • delivery/read statuses                │
                │  • template events                       │
                │  • wrapper-client events                 │
                └──────────────┬───────────────────────────┘
                               │ batch consumer loops
                               ▼
                ┌──────────────────────────────────────────┐
                │ WAInboxService / agent-assignment / DB   │
                │  • SQL Server  → WAInbox (transactional) │
                │  • ClickHouse  → omnidb.wainbox + status │
                │  • auto-reply (welcome / off-hours)      │
                └──────────────┬───────────────────────────┘
                               │
                               ▼
                ┌──────────────────────────────────────────┐
                │ MessageHandlerService                    │
                │ → WhatsAppProgressHub                    │
                │ broadcasts to SignalR group              │
                │ "waba_<USERNAME_UPPER>"                  │
                └──────────────┬───────────────────────────┘
                               │ SignalR
                               ▼
                ┌──────────────────────────────────────────┐
                │ Browser: UserLiveChat/Index.cshtml +     │
                │ Livechat.ko.js (KnockoutJS observables)  │
                │  • appends message to chat list          │
                │  • bumps unread count                    │
                │  • plays notification sound              │
                └──────────────────────────────────────────┘
                               ▲
 Agent reply ──► REST POST ────┘  /WAMessage/UserLiveChat/SendChatMessage
                                  → WAInboxService.SendChatMessageAsync()
                                  → Meta Cloud API /messages
                                  → persist OUT row + return to UI
                                  → later: status webhook updates ✓ → ✓✓ → ✓✓(read)
```

---

## 2. Critical files

### Backend (C#)

| Layer | Path | Role |
|---|---|---|
| Controller | `OmniApp.UI/Areas/WAMessage/Controllers/UserLiveChatController.cs` | All Live Chat REST endpoints (~32k lines) |
| Controller | `OmniApp.UI/Areas/WAMessage/Controllers/AgentListController.cs` | Agent CRUD, channel assignment, "login as agent" |
| Service | `OmniApp.Services/RepoServices/WAInboxService.cs` | Inbox queries + send-message orchestration |
| Service | `OmniApp.Services/RepoServices/WAAgentService.cs` | Agent ↔ wa_id mappings, keyword routing |
| Service | `OmniApp.Services/RepoServices/WAUserChatBoxService.cs` | Chat-list helpers |
| SignalR | `OmniApp.Services/SignalRHubs/WhatsAppProgressHub.cs` | Hub at `/whatsAppProgressHub`, group per user |
| SignalR | `OmniApp.Services/SignalRHubs/Handler/MessageHandlerService.cs` | Server-side broadcast helper |
| Webhook | `OmniApp.Services/MetaWAServices/Webhook/MetaWabaWebhookProcessor.cs` | Meta webhook ingestion + queues |
| Domain | `OmniApp.Domain/WhatsAppModels/ChatCountRequestModel.cs` | `ChatModel`, `WebChatsModel`, `ChatCountRequestModel` |

### Frontend

| Path | Role |
|---|---|
| `OmniApp.UI/Areas/WAMessage/Views/UserLiveChat/Index.cshtml` | Two-pane chat UI (chat list left, conversation right) |
| `OmniApp.UI/wwwroot/projectlibs/WhatsApp/Livechat.ko.js` | Main `ChatViewModel` (KnockoutJS observables, SignalR client) |
| `OmniApp.UI/wwwroot/projectlibs/WhatsApp/AgentChatConfig.ko.js` | Welcome / off-hour auto-reply settings UI |

---

## 3. REST endpoints (UserLiveChatController.cs)

Base: `/WAMessage/UserLiveChat/...`

### Page & context
- `GET  Index` (L43) — render the live chat view; reads `TempData["SenderNumber"]`.
- `POST SetSenderNumber(senderNumber)` (L80) — stash chosen sender for redirects.

### Channel / contact / agent metadata
- `GET  GetChannels` (L95) — active `WABAChannels` for the logged-in user.
- `POST GetContactsDetails(waIds[], channels[])` (L119) — bulk lookup `{wa_id → {FavouriteUser, Name, …}}`.
- `GET  GetContacts(number, channel)` (L154) — `{notes, contact: {IsFavourite, IsBlock, CreatedDate}, history}`.
- `GET  GetAgents` (L212) — sibling agents under same parent (excludes current user).
- `GET  GetTemplatesForUser` (L239) — active `WATemplates`.
- `GET  GetAgentMedia(wabaNumber, number)` (L303) — media library grouped by mime: `{image[], video[], document[]}`.
- `GET  getAllStatus(messageId)` (L335) — per-message delivery status timeline.

### Chat list
- `POST GetChatCount(channel, chatType)` (L353) — `ChatCountRequestModel { AllCount, UnAssignedCount, AssignedCount, UnReadChatCount, RepliedChatCount, BlockContacts, FavouriteContacts, OpenChat, PendingChat, SolvedChat }`. ClickHouse-aggregated.
- `POST GetChatList(channel, chatType, [FromBody] SearchRequest, pageIndex=1, pageSize=16)` (L447) — paginated chat list grouped by `wa_id`. **Filter map** (see §6). Active chats use a hardcoded **last-24-hour window** (`fromDate = Now-24h`, `toDate = Now`).

### Messages
- `GET  GetUserChatMessages(senderNumber, channelNumber, chatType, beforeId?, pageSize=50)` (L716) — **cursor-based** message history. `beforeId` is the oldest already-loaded `WAInboxId`; service resolves its `MessageDate` and returns rows older than that. Returns `{chatList, hasMore, pageSize, canSendTemplate}` — `canSendTemplate` from `WAAgentMapping.IsSendTemplate`.

### Agent assignment
- `POST AssignAgent(agentId, waNumber, channel, force=false)` (L878) — 4-case logic:
  1. agent has `IsAllChatAssign` → block ("no additional assignment needed").
  2. no existing mapping → insert.
  3. mapping to same agent → "already assigned".
  4. mapping to other agent + `force=false` → return `{confirmNeeded:true, existingAgentId}`; with `force=true` → reassign + write journey row.
- `POST ForceAssignAgent(agentId, waNumber)` (L1214) — shortcut for case 4.

### Send
- `POST SendChatMessage` multipart (L1409) — params: `File[], Number, WaInboxId, Channel, ChatType, Message, ReplyToMessageId, Latitude?, Longitude?, LocationURL`. Validates: at least one of file/text/location; checks unsubscribe list. Delegates to `waInboxService.SendChatMessageAsync(...)`. Returns `{Success, Message}`.
- `POST SubmitTemplate([FromForm] SubmitTemplateRequests)` (L1471) — sends a Meta-approved template. Parses header/body/button variable arrays (`WADataItem[]`), maps them onto `WhatsAppTemplateRequest.Component`, supports carousels and `LimitedTimeOffer`.

### Utilities
- `GET  ExportChat(waNumber)` (L1693) — single-chat CSV (with UTF BOM).
- `POST ExportAllChats(channel, fromDate, toDate)` (L1785) — bulk CSV → ZIP → DownloadSector → email notification.
- `POST BlockUser / UnblockUser(number, wabaNumber)` (L1859) — toggles `WAContacts.IsBlock`.

---

## 4. Service layer

### WAInboxService.SendChatMessageAsync
Builds the Meta WABA Cloud API payload, calls `whatsAppBusinessClient`, persists to **both** SQL and ClickHouse.

**Text** →
```csharp
new TextMessageRequest {
  To = normalizedNumber,
  Text = new WhatsAppText { Body = message, PreviewUrl = false },
  Context = replyToMessageId != null
    ? new TextMessageContext { MessageId = replyToMessageId } : null
}
```

**Media** → upload to Meta first to obtain `MediaId`, then `MediaMessageRequest` (image/video/audio/document variant chosen by mime).

**Location** → `LocationMessageRequest { Latitude, Longitude }`.

**Persistence**:
- `WAInbox` (SQL Server) — every message, both directions, with `DeliveryStatus="Sent"` initially for outbound.
- `omnidb.wainbox` (ClickHouse) via `IWAInboxClickHouseService.InsertAsync` — outbound mirror used for analytics, list queries, exports.
- `omnidb.wainboxstatus` — separate row stream for sent/delivered/read/failed transitions.

### WAInboxService — read paths
- `GetChatHistoryCount(...)` (L115) → ClickHouse count + SQL stored proc `GetContactCountsAsync` for blocked / favourite / open / pending / solved totals.
- `GetChatConversationList(condition, params, isArchive, pageIndex, pageSize)` → grouped-by-`wa_id` chat list, ordered by latest `ReceivedDate`.
- `GetUserMessages(... beforeDate?)` → message page; `beforeDate` enables scroll-up.
- `GetAgentNamesForChatsAsync(...)` → `Dictionary<int agentId, string agentName>` for hydrating chat rows.
- `GetLastMessageDateById(beforeId, userId)` → resolves cursor → `DateTime`.

### WAAgentService — agent mapping
- `GetActiveChannelList(userId)` — channels where `Status=1`.
- `GetAssignedAgent(userId, waNumber)` — existing `WAAgentMapping`.
- `InsertAgentintoMapping / UpdateAgentChatByAgentId / DeleteAgentMappingById`.
- `GetMappedAgentList(userId, agentUserId)` — every wa_id an agent owns.
- `GetAgentNamesByNumbersAsync(waIds, userId)` → `Dictionary<wa_id, List<agentName>>` (chat may be co-assigned).
- `GetAssignAgentById(userId, agentId)` — does this agent have `IsAllChatAssign`?
- **`AssignAgentBasedOnKeywords(wabaNumber, messageText)`** — keyword router used during webhook ingestion: scans inbound text and auto-assigns to the keyword-mapped agent.

---

## 5. SignalR — real-time fan-out

### Hub: `WhatsAppProgressHub` (URL `/whatsAppProgressHub`)
```csharp
// L17
private static string GroupForUser(string userName) => $"waba_{userName.ToUpper()}";

// L18-32  OnConnectedAsync
//   adds Context.ConnectionId to group "waba_<USER UPPER>"
// L35-44  OnDisconnectedAsync removes from same group
```
**One group per OmniApp username.** All of an agent's open browser tabs live in the same group; broadcasts hit them all.

Hub methods:
- `UpdatePresence(status)` (L47) — stores in a `ConcurrentDictionary<userId, status>`, broadcasts `ReceivePresence(userId, status)` to `Clients.Others`.
- `GetUserStatus(userId)` (L58) — returns cached status (default `"offline"`).
- `RecievedMessage(ChatModel chat, string userName)` (L62) — client→server relay; delegates to `MessageHandlerService.HandleIncomingMessageAsync`.

### MessageHandlerService.HandleIncomingMessageAsync (L57–129)
1. `unread = GetUnreadCountAsync(chat.SenderNumber, chat.UserId)`.
2. `groupName = "waba_" + userName.ToUpper()`.
3. `Clients.Group(groupName).SendAsync("ReceivedMessage", chat)`.
4. `Clients.Group(groupName).SendAsync("UpdateUnreadCount", chat.SenderNumber, unread)`.

Auto-reply (L162–189): looks up `WAAgentChatConfig` for `(WABA, Agent)`; sends `WelcomePayload` for new contacts when enabled, `OffHourPayload` for existing contacts when current time is outside business hours.

New-contact bootstrap (L130–160): on first inbound from a `wa_id`, inserts `WAContacts` + `WaUserChatJourney { ChatStatus="Open" }`.

### Client events emitted to the browser
| Event | Payload | When |
|---|---|---|
| `ReceivedMessage` | full `ChatModel` | every inbound webhook message after persistence |
| `UpdateUnreadCount` | `(senderNumber, count)` | paired with `ReceivedMessage` |
| `DeliveryStatusUpdate` | `WaMessageStatusModel { messageId, status, timestamp }` | from status-webhook batch consumer |
| `ReceivePresence` | `(userId, status)` | from `UpdatePresence` |

---

## 6. Chat-list filters (the `chatType` parameter)

| `chatType` | Effective predicate | Notes |
|---|---|---|
| `All` | none | Default |
| `UnRead` | `DeliveryStatus='Sent' AND ChatType='IN'` | Inbound messages not yet marked read |
| `Assigned` | `wa_id IN (allowedWaIds)` | Agent-scoped |
| `UnAssigned` | `wa_id NOT IN (allowedWaIds)` | Agent-scoped |
| `Replied` | `ChatType='OUT'` | Conversations the agent has replied to |
| `Open` / `Pending` / `Solved` | `WaUserChatJourney.ChatStatus = ...` | Contact-status filter |
| `Favourite` | `WAContacts.IsFavourite=1` | |
| `Blocked` / `Block` | `WAContacts.IsBlock=1` | |
| `archive` | `ReceivedDate < Now-24h` AND no message in last 24h | Time-based |

**Always-on agent overlay**: if the user is an agent and **not** `IsAllChatAssign`, the predicate `wa_id IN (allowedWaIds)` is ANDed onto every filter, where `allowedWaIds = SELECT wa_id FROM WAAgentMapping WHERE AgentUserId = current`.

Search (`SearchRequest.Search`) is case-insensitive substring match against `wa_id` and `ProfileName`.

---

## 7. Pagination

- **Chat list** (`GetChatList`): classic `pageIndex` / `pageSize` (default 16) → ClickHouse `LIMIT/OFFSET`. Returns `{currentPage, totalPages, totalCount, allChats}`.
- **Message history** (`GetUserChatMessages`): **cursor-based** via `beforeId` (`ulong WAInboxId`). Service resolves `beforeDate` via `GetLastMessageDateById`, then `WHERE ReceivedDate < @beforeDate ORDER BY MessageDate ASC LIMIT pageSize`. `hasMore = chatList.Count >= pageSize`.

---

## 8. Webhook ingestion (MetaWabaWebhookProcessor)

Constructor (L89–172) creates four bounded `Channel<T>` queues (capacity 5,000,000, drop-oldest) and spawns one consumer task per queue:

| Queue | Consumer | Purpose |
|---|---|---|
| `_webhookDelieryEvents` | `ProcessWebhookDelieryEventsLoopAsync` | Sent / Delivered / Read / Failed status updates |
| `_webhookUserInitiatedMesssages` | `ProcessUserUserInitiatedMesssagesLoopAsync` | Inbound customer messages |
| `_userWebhookEvents` | `ProcessUserWebhookLoopAsync` | Template approval / business-account events |
| `_userWrapperWebhookEvents` | `ProcessWrapperUserWebhookLoopAsync` | Wrapper-client mode events |

### Public enqueue API (L175–223)
```csharp
EnqueueMessageStatusAsync(MetaWebhookEvent e)
EnqueueUserInitiatedMessageAsync(MetaWebhookEvent e)
EnqueueTemplateWebhookAsync(MetaWebhookEvent e)
```
The MVC webhook endpoint deserialises Meta's payload then calls one of these — non-blocking, the HTTP response returns 200 immediately (Meta retries otherwise).

### Status processing (L225–427)
Meta envelope `entry[].changes[].value.statuses[]`:
```json
{ "id":"wamid.xxx", "status":"sent|delivered|read|failed",
  "timestamp":1700000000,
  "pricing":{"billable":true,"category":"service|utility|marketing|authentication"},
  "biz_opaque_callback_data":"PART_ID|UNIQUE_ID|CAMPAIGN_ID" }
```
Parse `biz_opaque_callback_data` → `WaMessageIdInfo`, decide refund eligibility (`failed`, or `delivered/read + utility + non-billable`), then **batch insert** `WAMessageStatusUpdate` into ClickHouse and invoke `_handler(_wabaChannels, list)` which broadcasts `DeliveryStatusUpdate` over SignalR.

### Inbound message processing (L604+)
Meta envelope `entry[].changes[].value.messages[]` covering: `text`, `image`, `video`, `audio`, `document`, `location`, `interactive` (`button_reply` / `list_reply`), `button`, `template`, `contacts`, `sticker`.

Pipeline:
1. Extract `messageId`, `wa_id`, profile name, type, payload (`text.body`, `image.id`+mime, `location.lat/long`, etc.).
2. Agent routing — `AssignAgentBasedOnKeywords` → fall back to existing `WAAgentMapping` → fall back to `AgentId=0`.
3. Special tokens — `"stop"`/`"unsubscribe"` → add to `WAUnsubscribedNumbers` + send confirmation; `"start"` → reactivate.
4. Build `ChatModel { ChatType="IN", DeliveryStatus="Delivered", ... }`.
5. Persist to `omnidb.wainbox`.
6. `HandleAutoMessages` (welcome / off-hours).
7. `messageHandlerService.HandleIncomingMessageAsync(chat, userName)` → SignalR fan-out (§5).

### Verification
Standard Meta GET handshake: server echoes `hub.challenge` query param when `hub.verify_token` matches the configured value. (Endpoint lives in the WAMessage area; not in the processor itself.)

---

## 9. Frontend (Livechat.ko.js + Index.cshtml)

**Stack** (`Index.cshtml`): KnockoutJS 3.5, `microsoft-signalr` 7.0.5, moment.js 2.30, emoji-mart, pdf.js 2.16, litepicker.

### `ChatViewModel` observables (L357+)
```js
// list / nav
isArchiveMode, selectedChatType("All"), selectedChannel("All"), search("")
currentChatId, currentNumber, currentChannel

// composer
messageText(""), selectedFile(null), replyToMessageId, replyToText, replyToName

// contact panel
UnReadCount(0), isFavourite(false), isBlocked(false), AssignedTo(), customerJourney([])

// 24-hour service window
remainingTime("24:00"), isWindowExpiringSoon()

// chat status
chatStatusText(""), chatStatusClass("")

// notes
notes([]), newNote(""), selectedNote(null)
```
Computed: `isChatSelected = !!currentChatId()`, `isChatResolved = activeChat()?.chatStatusText()==="Solved"`.

### SignalR client (canonical pattern in this codebase)
```js
const connection = new signalR.HubConnectionBuilder()
  .withUrl("/whatsAppProgressHub")
  .withAutomaticReconnect([0, 2000, 5000, 10000])
  .build();

connection.on("ReceivedMessage", chat => {
  vm.handleReceivedMessage(chat);                    // upsert chat list + append msg
  new Audio("/soundfileDownload/wa-message-notification.mp3").play().catch(()=>{});
});
connection.on("UpdateUnreadCount", (waId, count) => vm.handleUnreadCount(waId, count));
connection.on("DeliveryStatusUpdate", s => vm.updateMessageStatus(s));

connection.start();
```

### Send flow (form submit)
Builds `FormData` → `POST /WAMessage/UserLiveChat/SendChatMessage`:
- `File` (multi), `Number`, `WaInboxId`, `Channel`, `ChatType`, `Message`, `ReplyToMessageId`, optional `Latitude`/`Longitude`/`LocationURL`.

On `{Success:true}` the UI optimistically appends the OUT bubble (status `Sent ✓`); subsequent `DeliveryStatusUpdate` events upgrade it to `✓✓` then blue `✓✓` (read), or red ✗ on `Failed`.

### AgentChatConfig.ko.js (auto-reply settings)
Per-`(WABANumber, Agent)` welcome and off-hour configuration.
```js
welcomeEnabled, welcomeSelectedType("text"|"image"|"video"|"document"),
welcomeMessageText, welcomeMediaUrl, welcomeCaption, welcomeFileName, welcomeTemplateId
offHoursEnabled, offHourSelectedType, offHourMessageText, offHourMediaUrl, ...
```
Switch toggles POST to `/WAMessage/AgentChatConfig/SaveWelcomeSetting` and `/SaveOffHourSetting` with `{isEnabled, wabaNumber}`.

---

## 10. Data models

### `ChatModel` (`OmniApp.Domain/WhatsAppModels/ChatCountRequestModel.cs` L41–108)
```csharp
WAInboxId, ProfileName, wa_id, SenderNumber, RecipentNumber,
MessageId, ReplyToMessageId, ReplyToText, MessageText,
ConversationType,                 // CUSTOMER_INITIATED | BUSINESS_INITIATED | CUSTOMER_REPLY
MessageType,                      // text|image|video|audio|document|location|template|interactive|sticker
ReceivedDate,
MediaMimeType, MediaId, MediaURL,
UserId,
ChatType,                         // IN | OUT
DeliveryStatus,                   // Sent | Delivered | Read | Failed
WABANumber, ReceivedPayload,      // raw webhook JSON kept for diagnostics
AgentId, TemplateName, ErrorMessage, UnreadCount
```

### `WebChatsModel` (chat-list row) — same file L18–39
```csharp
Chats[],                          // last-N ChatModel for preview
UnReadCount, LastMessageOn, ProfileName,
WANumber,                         // contact wa_id
WABANumber,                       // channel
TimePassed, LastActive, WAInboxId,
AssignedTo,                       // "Agent A, Agent B"
LastUserMessage,
AllCount, UnAssingnedCount, AssignedCount, UnChatReadCount, RepliedCount,
IsFavouriteUser
```

### `ChatCountRequestModel` (badges) — L3–16
```csharp
AllCount, UnAssignedCount, AssignedCount, UnReadChatCount,
RepliedChatCount, BlockContacts, FavouriteContacts,
OpenChat, PendingChat, SolvedChat
```

### `WAAgentMapping` (agent ↔ chat)
```csharp
WAAgentMApId, AgentUserId, UserId,
wa_id,                            // null when IsAllChatAssign
AssignedDate,
IsAllChatAssign, IsSendTemplate
```

### Send request (multipart form)
```text
File: IFormFile[],  Number, WaInboxId, Channel, ChatType,
Message, ReplyToMessageId, Latitude?, Longitude?, LocationURL
→ { Success: bool, Message: string }
```

### Status update (ClickHouse + SignalR)
```csharp
WAMessageStatusUpdate { MessageId, DeliveryStatus, ReceivedDate, UserId, ErrorMessage }
```

---

## 11. Multi-tenant + agent scoping rules

- **Tenant key** = `UserId` on every WAInbox row. Agents inherit via `ParentId` → queries always run against the parent's data.
- **Channel ownership** = `WABAChannels.UserId`.
- **Agent visibility** is one of three states:
  1. `IsAllChatAssign = true` → agent sees every wa_id under their parent.
  2. mapping rows with specific `wa_id`s → agent sees only those.
  3. no mapping → empty inbox until something is assigned.
- **Routing on inbound**: keyword match → existing mapping → unassigned (`AgentId=0`).

---

## 12. Auto-reply rules (welcome / off-hours)

Config table `WAAgentChatConfig`:
```sql
ConfigId, UserId, WABANumber, AgentId,
isWelcomeMessage BIT, WelcomePayload JSON,    -- {Type, MessageText, Caption, FileName, MediaUrl}
isOffHourMessage BIT, OffHourPayload JSON,
OffHourStart TIME, OffHourEnd TIME, OffHourDays VARCHAR(7)
```
Triggered inside `MessageHandlerService.HandleAutoMessages`:
- **Welcome** when `isWelcomeMessage && isNewContact` — sent via `whatsAppBusinessClient.SendTextMessageAsync` / `SendMediaMessageAsync` using the WABA's `PhoneNumberId` + `FBAccessToken`.
- **Off-hour** when `isOffHourMessage && IsOffHourNow(model) && !isNewContact`.
Payload `Type` is `text | image | video | document`.

---

## 13. Templates & media

- Template send goes through `SubmitTemplate` → `SendTemplateMessageAsync`. Variables arrive as `WADataItem[]` for header / body / each button, are mapped onto `WhatsAppTemplateRequest.Component.{Header,Body,Buttons,Carousel}.Example.*`. `LimitedTimeOffer` block supported.
- Media uploads use `MediaHelperService.SaveMediaFileAsync(... ChatMediaType.Template / LiveAgent ...)` → saved to `/WhatsAppMedia/LiveAgent/<UserName>/`, returns `LiveUrl`. Meta API limits enforced by Meta: image 5 MB, video 5 MB, audio 16 MB, document 100 MB; sticker `image/webp`.

---

## 14. Delivery-status timeline (typical)

```
T0       agent SEND
T0+~150ms  Meta returns wamid → row inserted, status="Sent", UI shows ✓
T0+0.5–5s  Meta webhook "sent"        → ClickHouse update, broadcast (no UI delta)
T0+5–500s  Meta webhook "delivered"   → status="Delivered", UI ✓✓
T0+>read   Meta webhook "read"        → status="Read", UI blue ✓✓
on failure  Meta webhook "failed"     → status="Failed" + ErrorMessage, refund logic if applicable
```
Status webhooks are batch-flushed (~500 ms) before SignalR broadcast.

---

## 15. Notes for porting concepts to icpaas-app (reference only — do not implement)

When the user later decides to add a Live Agent surface to icpaas-app (Expo + Redux Toolkit + axios + AsyncStorage), the OmniApp model maps cleanly onto a React Native client:

- **Transport**: `@microsoft/signalr` JS client works inside React Native (with the `withUrl(... , { transport: HttpTransportType.WebSockets })` option). Subscribe to the same three events: `ReceivedMessage`, `UpdateUnreadCount`, `DeliveryStatusUpdate`.
- **Auth**: SignalR connection needs the same bearer used by axios — pass `accessTokenFactory: () => AsyncStorage.getItem("icpaas_token")`.
- **State**: a `liveChatSlice` mirroring the controller's response shapes — `chatList`, `messagesByWaId`, `counts`, `currentWaId`, `currentChannel`. The existing `conversationsSlice` / `messagesSlice` are close enough to extend rather than replace.
- **REST surface needed**: only `GetChannels`, `GetChatList`, `GetChatCount`, `GetUserChatMessages` (cursor!), `SendChatMessage` (multipart), `AssignAgent`, `getAllStatus`. Templates/media/export are optional v2.
- **Cursor pagination on messages** is the non-obvious bit — the mobile UI must remember the oldest `WAInboxId` per conversation and pass it as `beforeId` for scroll-up.
- **Group naming** is `waba_<USERNAME upper>` server-side; nothing to do client-side beyond connecting authenticated.

---

## 16. Verification (how the user can sanity-check this doc)

Open the OmniApp solution and confirm by reading these spots:

1. **Group naming** — `OmniApp.Services/SignalRHubs/WhatsAppProgressHub.cs:17` (`GroupForUser`).
2. **Inbound fan-out** — `OmniApp.Services/SignalRHubs/Handler/MessageHandlerService.cs:57` (`HandleIncomingMessageAsync`) — verify `ReceivedMessage` + `UpdateUnreadCount` are the events emitted.
3. **Webhook queues** — `OmniApp.Services/MetaWAServices/Webhook/MetaWabaWebhookProcessor.cs:89` (constructor) and `:175` (enqueue methods).
4. **Send endpoint** — `OmniApp.UI/Areas/WAMessage/Controllers/UserLiveChatController.cs:1409` (`SendChatMessage`).
5. **Cursor pagination** — `UserLiveChatController.cs:716` (`GetUserChatMessages`, look for `beforeId`).
6. **Filter map** — `UserLiveChatController.cs:517–688` (the big `switch`/`if` chain inside `GetChatList`).
7. **Auto-reply** — `MessageHandlerService.cs:162–189`.
8. **Frontend SignalR setup** — `OmniApp.UI/wwwroot/projectlibs/WhatsApp/Livechat.ko.js` (search `HubConnectionBuilder`).

If any of those don't match, the upstream code may have evolved — re-read that specific file and update the corresponding section above.

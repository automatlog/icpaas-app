# OmniApp WhatsApp Live Agent — Feature Catalogue

> A product-oriented description of what an agent can actually **do** inside OmniApp's WhatsApp Live Agent. For the architecture, endpoints, and event payloads see [live-agent-reference.md](./live-agent-reference.md). For how this maps onto icpaas-app see [liveAgentCompare.md](./liveAgentCompare.md).
>
> Scope: WhatsApp only (RCS has a parallel feature set living under `RCSLiveAgent`).

---

## 1. Inbox

### 1.1 Multi-channel inbox
The agent can be associated with one or more **WABA channels** (each channel = one Meta Business phone number). The header lets them pick a single channel or `All` to see traffic across every channel they're authorised on.

### 1.2 Filter chips with live counts
The chat list collapses by `wa_id` (one row per customer) and can be filtered by:

| Filter | Shows |
|---|---|
| `All` | Everything in the last 24 h |
| `UnRead` | Inbound messages still in `Sent` state (not yet read by the agent) |
| `Assigned` | Chats this agent has been mapped to |
| `UnAssigned` | Chats with no agent owner |
| `Replied` | Chats this agent has answered |
| `Open` / `Pending` / `Solved` | Customer-journey status set by the agent |
| `Favourite` | Contacts the agent has starred |
| `Blocked` | Contacts blocked from messaging back |
| `Archive` | Conversations with no message in the last 24 h |

Each chip displays a server-aggregated count, refreshed via `GetChatCount`.

### 1.3 Search
Case-insensitive substring match against the customer's WhatsApp number (`wa_id`) and their WhatsApp profile name. Runs server-side so it works across the entire history, not just the loaded page.

### 1.4 24-hour service window
WhatsApp business policy: once 24 h have passed since the customer's last message, only template messages are allowed. The inbox visualises this with a `remainingTime` countdown and an `isWindowExpiringSoon` flag, so the agent knows when to switch from free-form to templates.

### 1.5 Pagination
Chat list is paged at 16 rows per page, ordered by latest activity. Server returns total count and total pages so the UI can render a "loading more…" indicator on scroll.

---

## 2. Conversation view

### 2.1 Message history
A scrollable thread of all messages exchanged with the customer, oldest at top. Loaded 50 messages at a time using **cursor-based pagination** (`beforeId` = oldest message currently in view), so large histories stay performant.

### 2.2 Day separators and time stamps
Each message shows its time; the thread inserts a date divider whenever the calendar day changes between consecutive messages.

### 2.3 Reply-to / quoted messages
Either side can reply to a specific earlier message. Quoted messages render as a chip above the new bubble showing a snippet of the original; agents can compose a reply by tapping any inbound bubble.

### 2.4 Delivery-status icons
Outbound bubbles update through four states:
- `Sent` — accepted by Meta (single ✓)
- `Delivered` — handset acknowledged (double ✓)
- `Read` — customer opened the chat (blue double ✓)
- `Failed` — Meta returned an error; the bubble flips to a red ✗ with the error message visible on tap

Updates arrive in real time via SignalR — no need to refresh.

### 2.5 Per-message status timeline
Tapping a message opens a small timeline panel: every intermediate webhook (`sent` → `delivered` → `read` → `failed`) with its precise timestamp. Useful when a customer claims they didn't receive something.

---

## 3. Composing & sending

### 3.1 Plain text reply
The most common path: type into the composer, press send. The bubble appears optimistically as `Sent` and upgrades to `Delivered`/`Read` as Meta's status webhooks arrive.

### 3.2 Media attachments
Agent can attach and send:
- **Images** — JPEG, PNG, WebP, GIF (up to 5 MB)
- **Videos** — MP4, WebM (up to 16 MB)
- **Audio** — MP3, OGG, WAV (up to 16 MB)
- **Documents** — PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX (up to 100 MB)
- **Stickers** — WebP only

Each can carry a caption (image/video/document). Files are uploaded via the OmniApp server, which forwards to Meta's media endpoint and stores a permanent reference in the local media library.

### 3.3 Location share
Agent can send a pinned location (latitude + longitude, optional URL). The recipient sees an interactive WhatsApp location card.

### 3.4 Template messages
Pre-approved Meta templates can be sent at any time — and are the **only** allowed message type once the 24 h customer-service window has expired.

The template composer supports:
- **Header variables** — text or media placeholder
- **Body variables** — multiple `{{1}}`, `{{2}}` slots
- **Button variables** — for dynamic CTA URLs and quick replies
- **Carousel templates** — multi-card horizontal scroll
- **Limited-time offers** — countdown templates with an `ExpirationDate`

Each variable is captured in a small form with examples shown so the agent can preview the rendered message before sending.

### 3.5 Quick text snippets
Beyond Meta templates, the composer can offer agent-curated quick replies (canned text that doesn't require Meta approval — only usable inside the 24 h window).

### 3.6 Emoji picker
Inline emoji panel via `emoji-mart` for quick reactions and natural conversation tone.

### 3.7 Media library
A side panel lists every file the agent has previously sent in this chat, grouped by mime type (`image`, `video`, `document`). Convenient for re-sending the same brochure / price list without re-uploading.

### 3.8 Optimistic UI
Outbound messages render in the thread immediately on send; the underlying API call resolves in the background. Failed sends flip the bubble red with a retry affordance.

---

## 4. Real-time notifications

### 4.1 Live message arrival
Inbound messages from customers reach the agent's UI within seconds of Meta receiving them, via the `ReceivedMessage` SignalR event. No polling, no manual refresh.

### 4.2 Multi-tab synchronisation
An agent with two browser tabs open sees both tabs update simultaneously — both join the same SignalR group keyed by username.

### 4.3 Unread badge
Per-chat unread counters increment automatically on incoming messages (`UpdateUnreadCount` event) and decrement when the agent opens the chat.

### 4.4 Notification sound
A short audio clip plays on each inbound message when the tab is focused and the relevant chat isn't already open. Suppressed when the chat is active to avoid noise.

### 4.5 Reconnect handling
SignalR reconnects automatically after network drops (back-off: 0/2/5/10 s). On reconnect the UI silently refetches the active chat list and current thread to fill any gap.

### 4.6 Agent presence (limited)
A presence channel exists (`UpdatePresence` / `ReceivePresence`) so other agents can see who's online. Used minimally in the WA Live Chat surface today; the data is available for future routing logic.

---

## 5. Contact management

### 5.1 Customer profile panel
Right-rail panel for the active conversation showing:
- WhatsApp profile name + `wa_id`
- First-seen / created date
- Favourite / blocked flags
- Custom notes (CRUD by the agent)
- Conversation history with this contact across past sessions

### 5.2 Notes
Free-form notes stored against the contact. Each note carries author + timestamp. Agents can add, edit, delete. Useful for handover between shifts.

### 5.3 Favourite contacts
One-click star to mark a customer as favourite. The `Favourite` filter chip surfaces them. Useful for VIPs or recurring escalations.

### 5.4 Block / Unblock
Agent can block a number — server flips `WAContacts.IsBlock`. Blocked numbers' inbound messages are still received (Meta doesn't know) but are siloed so they don't interrupt the agent. Unblock restores normal flow.

### 5.5 Customer journey status
Each conversation has a status the agent moves through: `Open` → `Pending` → `Solved`. The status drives the corresponding filter chips and lets supervisors see workload distribution.

---

## 6. Agent routing & assignment

### 6.1 Keyword-based auto-routing
When a customer's first message contains a configured keyword (e.g. "billing", "tech"), the system auto-assigns the chat to the matching agent via `AssignAgentBasedOnKeywords`. No human dispatcher needed for predictable categories.

### 6.2 Existing-mapping continuity
Subsequent messages from the same customer go to the agent who already owns that mapping. Once assigned, conversations stay sticky — the customer doesn't bounce between agents.

### 6.3 Manual assignment
A supervisor (or any user with the right role) can manually assign a chat to an agent. If the chat is already assigned to someone else, the system asks for confirmation before reassigning, surfacing who the current owner is.

### 6.4 Force reassignment
The confirmation can be skipped via `ForceAssignAgent` for cases where the supervisor knows the original owner is offline or has handed off.

### 6.5 "All chats" agents
An agent with the `IsAllChatAssign` flag sees every conversation under their parent account — used for solo operators or admin oversight. Manual per-chat assignment is blocked for these agents (they already see everything).

### 6.6 Multi-agent visibility on one chat
A single conversation can have multiple agents mapped to it (e.g. a sales rep + their manager). Both see it in their `Assigned` filter; the chat header shows `AssignedTo: "Agent A, Agent B"`.

### 6.7 Unassigned bucket
Conversations with no mapping land in `UnAssigned`, where any eligible agent can claim them.

---

## 7. Auto-replies

### 7.1 Welcome message
First time a new customer messages the business, an automatic reply can be sent — text or media payload — to acknowledge receipt. Configured per `(WABA channel, agent)` pair so different lines of business can have different tones.

### 7.2 Off-hours auto-reply
Outside configured business hours (start time, end time, days-of-week), a different automated payload fires. Agents can reassure customers that the message will be picked up next morning without needing to staff overnight.

### 7.3 Auto-reply payload types
Both welcome and off-hours payloads can be: `text`, `image` (with caption), `video` (with caption), or `document` (with filename + caption).

### 7.4 Configuration UI
A dedicated settings screen lets the agent/admin toggle each rule on/off, edit the payload, and pick which `(WABA, agent)` pair the rule applies to. Changes take effect immediately on the next inbound message.

---

## 8. Templates & template management

### 8.1 Template library
All Meta-approved WhatsApp templates registered against the agent's parent account are visible in a list, with name, category, language, and preview text.

### 8.2 Variable fill
For templates with placeholders, the composer renders a small form — one input per variable — with the example values from Meta shown as hints. Preview updates live.

### 8.3 Carousel templates
Multi-card carousels (introduced by Meta in 2024) are supported end-to-end: each card has its own header media, body, and CTA buttons.

### 8.4 Limited-time offers
A special template variant with an `ExpirationDate` that renders a countdown on the customer's device. The composer captures the expiry and forwards it to Meta correctly.

### 8.5 Send-template permission
A per-agent `IsSendTemplate` flag controls whether that agent can send templates at all. Useful for restricting marketing-template sends to senior agents (which can incur charges).

---

## 9. Bulk operations & admin

### 9.1 Single-chat export
Export the entire conversation with one customer to CSV. UTF BOM included so spreadsheets render Indic / non-Latin scripts correctly.

### 9.2 Bulk export
Export every conversation in a date range across a channel. Server zips the CSVs and emails the agent a download link when ready (asynchronous because it can be large).

### 9.3 Unsubscribe management
- Customer texts `stop` or `unsubscribe` → number is added to `WAUnsubscribedNumbers`, an automated confirmation goes back, and any later attempts to send to that number are blocked at the API level.
- Customer texts `start` → number is removed from the list and a reactivation confirmation goes back.
- Agents see unsubscribed contacts marked accordingly and cannot accidentally message them.

### 9.4 Refund tracking
Failed sends and certain non-billable status combinations (e.g. utility messages where Meta didn't charge) are added to a refund-tracking list, so finance can reconcile against Meta's invoice.

---

## 10. Multi-tenant / multi-user model

### 10.1 Parent → agent hierarchy
The platform supports a parent account (the business) with multiple agent users underneath. Agents inherit the parent's WABA channels and templates; their own actions are attributed to them individually for reporting.

### 10.2 Channel ownership
Each WABA channel belongs to a parent account. Agents see only channels their parent owns and they have been authorised on.

### 10.3 Login-as-agent
Admins can impersonate an agent ("login as user") from the agent management screen — useful for support and debugging.

### 10.4 Role gating
The whole Live Chat surface is gated by ASP.NET role + product entitlement (`[ProductAccess(EnumProducts.WAMessage)]`). Customers without the WhatsApp product see no Live Chat link.

---

## 11. Persistence & history

### 11.1 Dual-database write
Every message is written to **SQL Server** (transactional, system of record) **and** **ClickHouse** (analytics / list queries / exports). Reads use ClickHouse for speed; writes hit both so nothing is lost if one is degraded.

### 11.2 Raw payload retention
The original Meta webhook JSON is kept on every message row (`ReceivedPayload`) so any future bug or edge case can be replayed and diagnosed without losing fidelity.

### 11.3 Status history
Delivery status transitions are stored separately (`omnidb.wainboxstatus`) — the system can show "delivered at 12:01:03, read at 14:22:18" rather than just the latest state.

---

## 12. Scale-oriented features

### 12.1 Bounded webhook queues
Inbound webhooks land in one of four bounded `Channel<T>` queues (5 M capacity each, drop-oldest mode). Spikes from Meta don't block the HTTP response or topple the process — they just deepen the queue.

### 12.2 Background batch consumers
Each queue has a dedicated consumer task that drains in batches and bulk-inserts into ClickHouse. Throughput stays high without sacrificing per-message ordering.

### 12.3 Group-targeted broadcasts
SignalR fans out to a per-user group rather than every connected client, so a busy tenant doesn't impact others' message latency.

### 12.4 Auto-reconnect with back-off
Clients reconnect automatically with capped exponential back-off so a thundering-herd reconnect after a backend restart is smooth.

---

## 13. What the WhatsApp Live Agent does **not** do (as of this reading)

Worth knowing so expectations stay grounded:

- **Typing indicators** for inbound customer typing — the RCS sister hub has them; WhatsApp Live Chat does not.
- **Voice / video calling** — WhatsApp Cloud API doesn't expose calls to business accounts in this stack.
- **Skill-based / load-balanced auto-routing** beyond keyword and sticky mapping. No round-robin, no longest-idle.
- **SLA timers, queue priority, callback queues** — agent productivity tooling is minimal beyond the journey statuses.
- **In-app push when the browser is closed** — agent must keep a tab open. No mobile push, no email-on-incoming.
- **Bulk archiving / merging duplicate contacts** — surface-level CRM features that aren't wired in.
- **AI-assisted draft replies, summarisation, sentiment** — none of that integrated today.
- **Cross-channel unified inbox** — WhatsApp Live Chat is WhatsApp-only; RCS has its own console. No one-pane view of both.

These are useful as "v-next" candidates if Live Agent is being productised further.

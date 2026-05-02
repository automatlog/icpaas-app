# Activity Logs

Datewise log of tasks performed on the icpaas-app codebase. Each `## YYYY-MM-DD` is a day; each `### YYYY-MM-DD HH:MM` is a snapshot taken automatically at the end of a Claude Code session (throttled to ~1 hour so consecutive turns don't spam the file).

Tasks are written pointwise — one bullet per change so you can scan a day at a glance.

---

## 2026-05-02

### 2026-05-02 (session summary — backfilled manually)

**P1 batch — quality + UX**
- Extracted `BottomTabBar` to `src/components/BottomTabBar.js` (re-exported from `DashboardScreen.js` for back-compat).
- Converted 5 screens to `useBrand` (LiveAgentChat, BotId, SenderId, CallerId, WabaChannel).
- Profile token UX: label "Public API Key" → "API Token", added secret-warning confirm dialog before copy, `secureTextEntry` on saved token.
- Built `formDraftsSlice` + `useFormDraft` hook; wired into SendMessage / WhatsApp CreateTemplate / WhatsApp Campaign Step1+Step3 (clear-on-success).
- Built `usePullToRefresh` hook; wired into Profile / Voice Config / SMS Config / ClickToCall / ApiDocs / Notifications.
- Installed `expo-haptics`, built `haptics` service; wired into BottomTabBar (FAB heavier than tab taps), CampaignPicker / ChatsPicker selections, ToggleRow, Profile theme switch.
- Installed `expo-notifications` + `expo-device`; built `pushNotifications` service (foreground handler + Android channel + redux→OS bridge); initialized from `App.js`. Lazy-required to silence the SDK 53 warning on Android Expo Go.

**P2 batch — performance + polish**
- Added `getItemLayout` to the LiveAgent inbox FlatList (fixed-height rows).
- Accessibility labels on shared components (GradientButton, CampaignPicker, ChatsPicker, InfoRow, Select) and high-traffic icon-only buttons across the four ID screens + LiveAgentChat composer.
- Built `Skeleton` primitive (`SkeletonRow`, `SkeletonCard`); replaced spinner placeholders on LiveAgentInbox + 3 ID screens.
- Built `EmptyState` component with halo illustration + accent corner icons + CTA; replaced flat empty states on LiveAgentInbox + 3 ID screens.
- BottomTabBar Chats tab now shows live unread badge from `selectUnreadBadgeTotal`.
- Built `formatCurrency` (Intl.NumberFormat-backed, formatter cache); replaced 3 hardcoded `₹` sites in DashboardScreen + ReportScreen + Voice CampaignScreen.
- Extended canonical `CHANNELS` with `softTint`; SendMessageScreen now derives chip rail from canonical instead of duplicating.
- TypeScript bootstrap: `typescript` + `@types` installed, `tsconfig.json` with `allowJs`, `.d.ts` shims for channels / useFormDraft / usePullToRefresh / format / haptics / pushNotifications.

**Bug fixes + dev-mode noise**
- Fixed `ReferenceError: 'BottomTabBar' doesn't exist` in DashboardScreen (re-export only exposed to other modules; added explicit local import).
- Added `Constants.appOwnership === 'expo'` gate in pushNotifications service to silence Android Expo Go SDK 53 warning.
- Bumped Redux `serializableCheck.warnAfter` to 200 ms and added `ignoredPaths: ['liveChat', 'templates', 'formDrafts', 'media']` to silence middleware slowness warnings on the heavy slices.

**Header / dialog unification**
- Migrated ~17 screens to the canonical `ScreenHeader` (Templates, CreateTemplate, ID screens, Notifications, ApiDocs, Contacts, MediaLibrary, Config, Agent, SendMessage, Campaign Step1/2/3 + List + Detail).
- Upgraded `AlertDialogHost` to a modern style — large iconified halo, gradient CTA tinted by tone (info/success/warning/danger), matching the LoginScreen sign-in error reference.
- Replaced ~30+ `Alert.alert` calls across BotId / SenderId / CallerId / WabaChannel / RCS Campaign + CreateTemplate / SMS Campaign + CreateTemplate / Voice Campaign + ClickToCall / SendMessage / Contacts / MediaLibrary / WhatsApp ChatScreen / Campaign Step1 with `dialog.*` (warning / error / info / success / confirm).

**Templates UX**
- Send icon on a template card now routes to the channel-specific campaign composer with the template pre-selected (WhatsApp wizard via `draft.templateName`; RCS / SMS via `route.params.templateName` and load-effect pre-select).
- Tapping a template card opens a `TemplatePreviewModal` — bubble preview (header + body + footer + buttons), category/language/status pills, identifier metadata, "Use in Campaign" CTA, floating circular close button anchored top-right.
- Pagination: initial 8 cards, `onEndReached` bumps `displayCount` by 8, tappable "Load more · N remaining" footer fallback, "N templates · end of list" caption when drained. Search and category filter walk the full list — pagination just gates how many of the matches paint.

**Campaign / Chats picker visual**
- White circle background (was tinted brand-soft).
- Per-channel icon color: WhatsApp `#25D366`, RCS `#3B82F6`, Voice `#F97316`, SMS `#A78BFA`.
- Bigger icons + circles (52 → 64 px circle, 24 → 30 px icon); arc radius bumped to keep clean spacing.
- Subtle neutral shadow (`#0F172A` at y:4, opacity 0.18) replacing the brand-tinted glow.

---

> **Auto-maintenance**: a Stop hook in `.claude/settings.local.json` runs `.claude/hooks/update-logs.ps1` after each Claude Code session. The hook is throttled to ~1 hour: it skips if the most recent `### YYYY-MM-DD HH:MM` entry is less than 55 minutes old. New entries pull bullets from `git log --since='1 hour ago'` (commit subjects), falling back to `git status --porcelain` (uncommitted changes) when there are no recent commits.

### 2026-05-02 13:07
- modified: logs.md


### 2026-05-02 16:51
- modified: App.js
- modified: app.json
- modified: package-lock.json
- modified: package.json
- modified: src/components/CampaignPicker.js
- modified: src/components/ChatsPicker.js
- modified: src/navigation/AppNavigator.js
- modified: src/screens/rcs/BotIdScreen.js


### 2026-05-02 17:53
- modified: App.js
- modified: app.json
- modified: package-lock.json
- modified: package.json
- modified: src/components/CampaignPicker.js
- modified: src/components/ChatsPicker.js
- modified: src/components/LiveAgentAttachMenu.js
- modified: src/components/LiveAgentTemplatePicker.js


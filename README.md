# icpaas.ai Omnichannel Android App
### React Native · Direct REST API · All 5 Screens

Built for **icpaas.ai — Smart Technology** (ESTD. 2015)

---

## 📁 Project Structure

```
icpaas-app/
├── App.js                          ← Root entry point + auth gate
├── package.json
│
├── src/
│   ├── theme/
│   │   └── index.js                ← Colors, Fonts, Spacing, Radii, Shadows
│   │
│   ├── services/
│   │   └── api.js                  ← All icpaas.ai REST API calls
│   │                                 AuthAPI, AnalyticsAPI, WhatsAppAPI,
│   │                                 SMSAPI, IVRAPI, CampaignAPI,
│   │                                 ContactsAPI, MissedCallAPI,
│   │                                 RCSAPI, WebhookAPI
│   │
│   ├── components/
│   │   └── index.js                ← Shared UI: GradientButton, Card,
│   │                                 StatCard, Pill, ChannelTag, Avatar,
│   │                                 SearchBar, ProgressBar, MetricRow...
│   │
│   ├── navigation/
│   │   └── AppNavigator.js         ← Bottom tab nav + stacks
│   │
│   └── screens/
│       ├── LoginScreen.js          ← API token setup
│       ├── DashboardScreen.js      ← Live stats + quick actions
│       ├── InboxScreen.js          ← Multi-channel chat list
│       ├── ChatScreen.js           ← WhatsApp/SMS reply window
│       ├── CampaignsScreen.js      ← Active + scheduled campaigns
│       ├── ContactsScreen.js       ← Contacts with lead scoring
│       └── IVRScreen.js            ← Live call monitor + outbound trigger
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- Node.js 18+
- React Native CLI
- Android Studio + Android SDK
- Java 17

### 2. Clone & Install

```bash
# Install dependencies
cd icpaas-app
npm install

# Android specific
cd android && ./gradlew clean && cd ..

# Link native modules
npx react-native-asset  # for fonts

# Start Metro
npx react-native start

# Run on Android
npx react-native run-android
```

### 3. Fonts Setup

Add to `android/app/src/main/assets/fonts/`:
- `DMSans-Regular.ttf`
- `DMSans-Medium.ttf`
- `DMSans-SemiBold.ttf`
- `DMSans-Bold.ttf`
- `DMMono-Regular.ttf`
- `DMMono-Medium.ttf`

Download from: https://fonts.google.com/specimen/DM+Sans

---

## 🔑 API Configuration

### Connect your gsauth account:

1. Open the app → Login screen
2. Enter your **Bearer token**
3. Tap **Connect Account**

The token is stored in `AsyncStorage` and sent as:
```
Authorization: Bearer <token>
```

### API Base URL
```
https://gsauth.com
```

---

## 🗄️ Prisma Database

This repo now includes a local Prisma SQLite database for development data and server-side utilities.

Database files:
- Prisma schema: `prisma/schema.prisma`
- Prisma config: `prisma.config.js`
- SQLite database: `prisma/dev.db`
- Seed script: `prisma/seed.js`

Available scripts:

```bash
npm run prisma:generate
npm run prisma:bootstrap
npm run prisma:seed
npm run prisma:studio
```

Notes:
- The Prisma database is a Node-side utility layer. It is not consumed directly by the React Native bundle.
- The local SQLite file is configured through `.env` with `DATABASE_URL="file:./prisma/dev.db"`.

---

## 📡 API Endpoints Used

| Area | Endpoint | Method |
|------|----------|--------|
| WhatsApp Channels | `/v23.0/channels` | GET |
| WhatsApp Templates | `/v23.0/{wabaBusinessId}/message_templates` | GET / POST |
| WhatsApp Template by ID | `/v23.0/{wabaBusinessId}/message_templates/{templateId}` | GET |
| WhatsApp Send Message | `/v23.0/{phoneNumberId}/messages` | POST |
| RCS Bot IDs | `/api/v1/rcs/getBotIds` | GET |
| RCS Templates | `/api/v1/rcs/getTemplate?botid={botId}` | POST |
| RCS Create Template | `/api/v1/rcs/createtemplate` | POST |
| RCS Send Message | `/api/v1/rcs/sendmessage` | POST |
| SMS Sender IDs | `/api/v1/sms/senderId` | GET |
| SMS Templates | `/api/v1/sms/getTemplate?senderId={senderId}` | GET |
| SMS Create Template | `/api/v1/sms/createtemplate` | POST |
| SMS Send Message | `/api/v1/sms/mt` | POST |

---

## 🎨 Design System

All UI constants in `src/theme/index.js`:

| Token | Value |
|-------|-------|
| `Colors.primary` | `#534AB7` (icpaas purple) |
| `Colors.secondary` | `#D4537E` (icpaas pink) |
| `Colors.whatsapp` | `#25D366` |
| `Colors.background` | `#F0EEF9` |

---

## 📱 App Features

### 🏠 Dashboard
- Live channel stats (WA + SMS + IVR + RCS + Missed Call)
- Channel filter pills (All / WhatsApp / SMS / IVR / RCS)
- Animated live call waveform
- Auto-refresh every 15 seconds
- Quick action grid
- Today's summary with revenue impact

### 💬 Inbox
- Multi-channel chat list (WhatsApp, SMS, RCS)
- Filter by channel / unread / assigned
- Search by name or message
- Online presence indicator
- Unread badge count

### 💬 Chat
- Full message thread
- Send WhatsApp replies via API
- Quick template chips (Send Proposal, Pricing, Schedule Demo...)
- File attachment support
- Real-time message status (✓ sent, ✓✓ delivered, ✓✓ read)

### 📢 Campaigns
- Active campaign cards with live progress bars
- Delivery metrics (delivered %, CTR, revenue)
- Create campaign modal (WA / SMS / RCS / IVR / Voice)
- Pause / resume campaigns
- Scheduled campaigns with countdown

### 👥 Contacts
- Full contact list with lead scoring
- Channel opt-in dots (🟢 WA · 🟣 SMS · 🟡 RCS)
- Filter by Hot / Warm / New / Cold / WA Opt-in
- Add contact modal with channel opt-ins
- Lead score bar (0–100)

### 📞 IVR Monitor
- **Live call counter** with real-time duration ticker
- Animated sound wave for active calls
- Recent call history with operator + circle + route
- Missed call leads with webhook delivery time
- **Trigger outbound call** modal (number + flow ID)
- Auto-polls live calls every 10 seconds

---

## 🔔 Webhook Placeholders

When icpaas.ai fires webhooks to your CRM, use these in your Raw Body:

```
%caller%           → Caller phone number
%cdrid%            → Call detail record ID
%channel%          → IVR channel / DID
%destination%      → Destination number
%incallstatus%     → ANSWERED / MISSED
%incalldatetime%   → Call date and time
%operator%         → JIO / Airtel / Vi / BSNL
%circle%           → Gujarat / Maharashtra / Delhi...
%invalue%          → IVR keypress input
%recordingfile%    → Recording URL
%anstime%          → Answer timestamp
%endtime%          → End timestamp
%inbillsec%        → Billed seconds
```

---

## 🛡️ Security Notes

- **Never hardcode API tokens** in source code
- Token currently stored in `AsyncStorage`; use Keychain/Keystore-backed secure storage before production
- All API calls use HTTPS
- Token sent only in headers, never in URL params
- Add `android:networkSecurityConfig` for production

---

## 📦 Dependencies

```json
"@react-navigation/native"        ← Navigation
"@react-navigation/bottom-tabs"   ← Tab bar
"@react-navigation/native-stack"  ← Screen stacks
"react-native-linear-gradient"    ← Gradient buttons/header
"axios"                           ← HTTP client for icpaas.ai API
"@react-native-async-storage"     ← Token storage
"react-native-flash-message"      ← Toast notifications
"react-native-svg"                ← Charts
"moment"                          ← Date/time formatting
```

---

## 📞 Support

**icpaas.ai — Smart Technology**  
📧 info@icpaas.ai  
🌐 icpaas.ai  
📍 Vadodara, Gujarat, India  
ESTD. 2015

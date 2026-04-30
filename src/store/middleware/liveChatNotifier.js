// Side-effect middleware for live-chat arrivals.
//
// Fires a brief Vibration + a toast banner when:
//   • the inbound message is for a wa_id other than the one currently open
//   • the app is foregrounded (background notifications would need FCM/APNs,
//     which is out of v1 scope — see docs/connection.md §10)
//
// SignalR → realtime.js dispatches `liveChat/receiveLiveMessage`. The slice
// updates state synchronously; this middleware reads the post-action state
// to decide whether to notify.
//
// TODO (v2 polish): play a short notification sound. Requires either
// `expo-audio` (recommended) or `expo-av` plus a packaged audio asset
// (e.g. assets/sounds/wa-ping.mp3). Both are native modules and require an
// EAS build / dev client, so deferred until needed.

import { Vibration, AppState } from 'react-native';
import toast from '../../services/toast';
import { receiveLiveMessage } from '../slices/liveChatSlice';

const VIBRATE_MS = 40;

const liveChatNotifier = (store) => (next) => (action) => {
  const result = next(action);

  if (action.type !== receiveLiveMessage.type) return result;

  const chat = action.payload;
  const waId = chat?.wa_id || chat?.SenderNumber;
  if (!waId) return result;

  // Don't notify for the conversation the user is already looking at.
  const state = store.getState();
  if (state?.liveChat?.activeWaId === waId) return result;

  // Don't notify if the app is in the background. The OS handles those via
  // push notifications which we don't have wired in v1.
  if (AppState.currentState !== 'active') return result;

  try { Vibration.vibrate(VIBRATE_MS); } catch (_) {}

  const title = chat.ProfileName || waId;
  const preview = (chat.MessageText || '').slice(0, 80) || 'New message';
  try {
    toast.info(title, preview, { duration: 2200 });
  } catch (_) {}

  return result;
};

export default liveChatNotifier;

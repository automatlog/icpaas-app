// src/services/haptics.js
//
// Centralized haptic feedback. Wrapping expo-haptics here keeps screens free
// of try/catch boilerplate and gives us one place to:
//   - swallow errors on platforms that lack the engine (e.g. some Androids
//     with vibration disabled)
//   - tune what each semantic event feels like, project-wide
//   - disable haptics globally later (e.g. via a Profile toggle) without
//     touching every call site
//
// Usage:
//   import haptics from '../services/haptics';
//   haptics.tap();         // light impact — generic UI tap
//   haptics.select();      // selection change — pickers, toggles
//   haptics.success();     // positive notification — send/save success
//   haptics.warning();     // amber notification
//   haptics.error();       // negative notification — failures
//   haptics.heavy();       // strong impact — destructive confirm, FAB open
import * as Haptics from 'expo-haptics';

const safe = (fn) => {
  try { return fn(); } catch { /* haptics are nice-to-have; never crash */ }
};

const haptics = {
  tap:     () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium:  () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy:   () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  select:  () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error:   () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export default haptics;

// src/services/dialog.js — imperative SweetAlert-style dialog API.
// Mount <AlertDialogHost /> once near the root of the app; this service
// publishes events the host listens to. Returns Promises so callers can
// await user response, replacing React Native's blocking Alert.alert.
//
// Usage:
//   const ok = await dialog.confirm({ title: 'Sign out?', danger: true });
//   await dialog.success({ title: 'Saved', message: 'Template stored.' });

let listeners = [];
let nextId = 0;

export const subscribe = (fn) => {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
};

const emit = (action, payload) => listeners.forEach((l) => l(action, payload));

const show = (config) => new Promise((resolve) => {
  const id = ++nextId;
  emit('show', { id, ...config, _resolve: resolve });
});

const dialog = {
  /** Single-button informational alert. */
  alert: ({ title, message, confirmText = 'OK', tone = 'info', icon } = {}) =>
    show({
      kind: 'alert',
      tone,
      icon: icon || iconFor(tone, 'alert'),
      title,
      message,
      buttons: [{ text: confirmText, value: true, kind: 'primary' }],
    }),

  /** Two-button yes/no confirmation. Resolves true if confirmed, false if cancelled. */
  confirm: ({
    title, message,
    confirmText = 'Confirm', cancelText = 'Cancel',
    danger = false, tone, icon,
  } = {}) =>
    show({
      kind: 'confirm',
      tone: tone || (danger ? 'danger' : 'info'),
      icon: icon || iconFor(tone || (danger ? 'danger' : 'info'), 'confirm'),
      title,
      message,
      buttons: [
        { text: cancelText, value: false, kind: 'cancel' },
        { text: confirmText, value: true, kind: danger ? 'danger' : 'primary' },
      ],
    }),

  success: (opts = {}) => dialog.alert({ tone: 'success', ...opts }),
  error:   (opts = {}) => dialog.alert({ tone: 'danger', ...opts }),
  warning: (opts = {}) => dialog.alert({ tone: 'warning', ...opts }),
  info:    (opts = {}) => dialog.alert({ tone: 'info', ...opts }),
};

const iconFor = (tone, kind) => {
  if (kind === 'confirm') return tone === 'danger' ? 'warning' : 'help-circle';
  if (tone === 'success') return 'checkmark-circle';
  if (tone === 'danger')  return 'close-circle';
  if (tone === 'warning') return 'warning';
  return 'information-circle';
};

export default dialog;

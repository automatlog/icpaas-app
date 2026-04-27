// src/services/toast.js — tiny toast helper over react-native-flash-message.
// Provides toast.success / toast.error / toast.info / toast.warning with
// brand-aligned colors. Mirrors the API surface of `react-hot-toast`.

import { showMessage, hideMessage } from 'react-native-flash-message';

const COLORS = {
  success: { bg: '#0B8A6F', text: '#FFFFFF', accent: '#10B981' },
  error:   { bg: '#B91C1C', text: '#FFFFFF', accent: '#EF4444' },
  warning: { bg: '#B45309', text: '#FFFFFF', accent: '#F59E0B' },
  info:    { bg: '#1D4ED8', text: '#FFFFFF', accent: '#3B82F6' },
};

const ICONS = {
  success: 'success',
  error: 'danger',
  warning: 'warning',
  info: 'info',
};

const base = (type, title, body, opts = {}) => {
  const c = COLORS[type] || COLORS.info;
  showMessage({
    message: title,
    description: body,
    type,
    icon: ICONS[type],
    backgroundColor: c.bg,
    color: c.text,
    duration: opts.duration ?? 2600,
    floating: true,
    position: opts.position || 'top',
    statusBarHeight: 28,
    style: { borderRadius: 14, marginHorizontal: 12, marginTop: 6 },
    titleStyle: { fontWeight: '700', fontSize: 14 },
    textStyle: { fontSize: 12, marginTop: 2, opacity: 0.95 },
  });
};

const toast = (title, body, opts) => base('info', title, body, opts);
toast.success = (title, body, opts) => base('success', title, body, opts);
toast.error   = (title, body, opts) => base('error', title, body, opts);
toast.warning = (title, body, opts) => base('warning', title, body, opts);
toast.info    = (title, body, opts) => base('info', title, body, opts);
toast.dismiss = () => hideMessage();

export default toast;

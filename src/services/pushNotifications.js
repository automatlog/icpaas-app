// src/services/pushNotifications.js
//
// Local + remote push notifications via expo-notifications.
//
// What this module does today:
//   - Registers a foreground handler so notifications scheduled while the
//     app is in the foreground actually surface as banners.
//   - Sets up the Android notification channel.
//   - Politely requests POST permission.
//   - Bridges in-app notificationsSlice events into OS notifications so
//     existing pushNotification(...) calls also produce a real banner.
//   - Exposes getExpoPushToken() so a backend can later register the
//     device for remote push.
//
// Expo Go on Android dropped remote-push support in SDK 53 and prints a
// loud red error the moment the expo-notifications native module is
// loaded. We *avoid loading the module entirely* in that environment by
// using lazy require() instead of a static import — Metro still bundles
// the dep, but the native bridge never gets touched, so the warning
// never fires.
//
// Development builds and iOS continue to work normally.
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { store } from '../store';
import { pushNotification } from '../store/slices/notificationsSlice';

const isExpoGoOnAndroid =
  Platform.OS === 'android' && Constants?.appOwnership === 'expo';

let configured = false;
let unsubscribe = null;
let lastBridgedId = null;

// Lazy module accessors. Kept inside helpers so even importing this file
// from inside an Expo-Go-on-Android session doesn't reach into the native
// expo-notifications module (which is what triggers the SDK 53 warning).
let _Notifications = null;
let _Device = null;
const getNotifications = () => {
  if (isExpoGoOnAndroid) return null;
  if (!_Notifications) {
    // eslint-disable-next-line global-require
    _Notifications = require('expo-notifications');
  }
  return _Notifications;
};
const getDevice = () => {
  if (!_Device) {
    // eslint-disable-next-line global-require
    _Device = require('expo-device');
  }
  return _Device;
};

const installForegroundHandler = () => {
  const N = getNotifications();
  if (!N) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList:   true,
      shouldPlaySound:  true,
      shouldSetBadge:   false,
    }),
  });
};

const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;
  const N = getNotifications();
  if (!N) return;
  await N.setNotificationChannelAsync('default', {
    name: 'OmniApp',
    importance: N.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#10B981',
  });
};

const requestPermission = async () => {
  const N = getNotifications();
  const D = getDevice();
  if (!N || !D) return false;
  if (!D.isDevice) return false;
  const existing = await N.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (existing.status === 'denied') return false;
  const next = await N.requestPermissionsAsync();
  return next.status === 'granted';
};

const presentLocal = async ({ title, body, data }) => {
  const N = getNotifications();
  if (!N) return;
  try {
    await N.scheduleNotificationAsync({
      content: { title, body, data: data || {} },
      trigger: null,
    });
  } catch {
    // No permission / no engine — silently drop. The in-app inbox row
    // already exists in redux.
  }
};

const bridgeReduxToOs = () => {
  if (unsubscribe) return;
  unsubscribe = store.subscribe(() => {
    const list = store.getState().notifications?.list || [];
    const head = list[0];
    if (!head || head.id === lastBridgedId) return;
    lastBridgedId = head.id;
    presentLocal({ title: head.title, body: head.body, data: { kind: head.kind, id: head.id } });
  });
};

export const initPushNotifications = async () => {
  if (configured) return;
  configured = true;
  if (isExpoGoOnAndroid) {
    // Skip — the in-app notificationsSlice still works; users just don't
    // get OS banners until they switch to a development build.
    return;
  }
  installForegroundHandler();
  await ensureAndroidChannel();
  await requestPermission();
  bridgeReduxToOs();
};

export const getExpoPushToken = async () => {
  const N = getNotifications();
  const D = getDevice();
  if (!N || !D || !D.isDevice) return null;
  const granted = await requestPermission();
  if (!granted) return null;
  try {
    const res = await N.getExpoPushTokenAsync();
    return res?.data || null;
  } catch {
    return null;
  }
};

export const notify = ({ kind, title, body, data }) => {
  store.dispatch(pushNotification({ kind, title, body }));
  if (data) presentLocal({ title, body, data });
};

export default {
  init: initPushNotifications,
  getExpoPushToken,
  notify,
};

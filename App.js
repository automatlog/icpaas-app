// App.js — icpaas.ai root (Redux + NativeWind).
// Layout: a green outer parent (`c.primary`) holds a white inner panel that
// uses safe-area inset MARGINS, so every screen gets a green band above the
// status bar and below the system nav automatically — no per-screen edits
// needed. Screens render edge-to-edge inside the white panel; absolute
// children (BottomTabBar, modals) sit at the inner panel's edges, with
// the green margin showing beyond.
import './global.css';
import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar, View, Platform, LogBox } from 'react-native';

// expo-notifications prints an informational WARN on every bundle load in
// Expo Go because Android remote-push was removed in SDK 53. The warning
// is harmless — local notifications still work — and disappears the moment
// you switch to a development build. Suppress it in dev so the Metro
// console stays scannable.
LogBox.ignoreLogs([
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications: Android Push notifications (remote notifications)',
]);
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import FlashMessage from 'react-native-flash-message';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import LoadingScreen from './src/screens/auth/LoadingScreen';
import AlertDialogHost from './src/components/AlertDialog';
import ErrorBoundary from './src/components/ErrorBoundary';
import RealtimeProvider from './src/components/RealtimeProvider';
import { store, persistor } from './src/store';
import { setHydrated } from './src/store/slices/hydratedSlice';
import { useFeed } from './src/theme';
import { initPushNotifications } from './src/services/pushNotifications';

function AppInner() {
  const c = useFeed(); // honours theme.mode override (default light)
  const insets = useSafeAreaInsets();

  const isHydrated = useSelector((s) => s.hydrated);
  const isLoggedIn = useSelector((s) => s.auth.isAuthenticated);
  const dispatch = useDispatch();
  const [bootDone, setBootDone] = useState(false);

  // Safety net — mark hydrated within 4s even if rehydrate stalls
  useEffect(() => {
    const t = setTimeout(() => {
      if (!store.getState().hydrated) dispatch(setHydrated(true));
    }, 4000);
    return () => clearTimeout(t);
  }, [dispatch]);

  // Push notifications: requests permission, configures the foreground
  // handler + Android channel, and bridges redux notification entries to
  // OS banners. Safe to call repeatedly — internally idempotent.
  useEffect(() => {
    initPushNotifications();
  }, []);

  // The OS status bar (Android) and the area behind it (iOS) match the
  // inset bands so transitions are seamless.
  const statusBarBg = c.primary;
  const barStyle = 'light-content'; // green status bar reads with light text

  // Inner panel uses margins so the parent green leaks through above the
  // status bar inset and below the gesture / nav bar inset. We apply a
  // floor of 24px on top so Android phones not in edge-to-edge mode (which
  // report insets.top: 0) still get a visible green strip.
  const innerStyle = useMemo(() => ({
    flex: 1,
    backgroundColor: c.bg,
    marginTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 0),
    marginBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 0 : 0),
  }), [c.bg, insets.top, insets.bottom]);

  const outerStyle = useMemo(() => ({ flex: 1, backgroundColor: c.primary }), [c.primary]);

  if (!bootDone) {
    return (
      <View style={outerStyle}>
        <StatusBar barStyle={barStyle} backgroundColor={statusBarBg} />
        <View style={innerStyle}>
          <LoadingScreen onFinish={() => setBootDone(true)} />
        </View>
      </View>
    );
  }

  return (
    <View style={outerStyle}>
      <StatusBar barStyle={barStyle} backgroundColor={statusBarBg} />
      <View style={innerStyle}>
        {/* ErrorBoundary catches render-phase throws in the navigator
            tree so a single buggy screen can't blank the whole app. */}
        <ErrorBoundary>
          <RealtimeProvider>
            {isLoggedIn && isHydrated ? <AppNavigator /> : <AuthNavigator />}
          </RealtimeProvider>
        </ErrorBoundary>
      </View>
      <FlashMessage position="top" />
      <AlertDialogHost />
    </View>
  );
}

function OnRehydrate() {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(setHydrated(true)); }, [dispatch]);
  return null;
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <OnRehydrate />
          <AppInner />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

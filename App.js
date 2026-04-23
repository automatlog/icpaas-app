// App.js — icpaas.ai Studio-Editorial Flow Root (Redux)
import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar, View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FlashMessage from 'react-native-flash-message';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import { store, persistor } from './src/store';
import { setHydrated } from './src/store/slices/hydratedSlice';
import { LightEditorial, DarkEditorial } from './src/theme';

function AppInner() {
  const scheme = useColorScheme();
  const ed = useMemo(() => (scheme === 'dark' ? DarkEditorial : LightEditorial), [scheme]);

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

  const rootStyle = useMemo(() => ({ flex: 1, backgroundColor: ed.paper }), [ed]);
  const barStyle = scheme === 'dark' ? 'light-content' : 'dark-content';

  if (!bootDone) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle={barStyle} backgroundColor={ed.paper} />
        <View style={rootStyle}>
          <LoadingScreen onFinish={() => setBootDone(true)} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={barStyle} backgroundColor={ed.paper} />
      <View style={rootStyle}>
        {isLoggedIn && isHydrated ? <AppNavigator /> : <LoginScreen />}
      </View>
      <FlashMessage position="top" />
    </SafeAreaProvider>
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
        <OnRehydrate />
        <AppInner />
      </PersistGate>
    </Provider>
  );
}

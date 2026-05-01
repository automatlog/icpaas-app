import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

import authReducer from './slices/authSlice';
import hydratedReducer from './slices/hydratedSlice';
import conversationsReducer from './slices/conversationsSlice';
import messagesReducer from './slices/messagesSlice';
import contactsReducer from './slices/contactsSlice';
import campaignsReducer from './slices/campaignsSlice';
import templatesReducer from './slices/templatesSlice';
import mediaReducer from './slices/mediaSlice';
import notificationsReducer from './slices/notificationsSlice';
import groupsReducer from './slices/groupsSlice';
import themeReducer from './slices/themeSlice';
import liveChatReducer from './slices/liveChatSlice';
import formDraftsReducer from './slices/formDraftsSlice';
import liveChatNotifier from './middleware/liveChatNotifier';

const rootReducer = combineReducers({
  auth: authReducer,
  hydrated: hydratedReducer,
  conversations: conversationsReducer,
  messages: messagesReducer,
  contacts: contactsReducer,
  campaigns: campaignsReducer,
  templates: templatesReducer,
  media: mediaReducer,
  notifications: notificationsReducer,
  groups: groupsReducer,
  theme: themeReducer,
  liveChat: liveChatReducer,
  formDrafts: formDraftsReducer,
});

const persistConfig = {
  key: 'icpaas-app-state',
  version: 1,
  storage: AsyncStorage,
  // hydrated  → runtime-only flag.
  // liveChat  → server is source of truth; persisting would show stale chats
  //             and stale connection status on relaunch.
  blacklist: ['hydrated', 'liveChat'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefault) =>
    getDefault({
      // The serializable check walks the entire state tree on every
      // action — fine in theory, but slices like `liveChat` (threads
      // with hundreds of message objects) and `templates` (nested
      // component arrays from gsauth) push the walk past the 32 ms
      // warning threshold and made dev mode chatty. We exclude those
      // hot slices and bump the warn threshold for the rest. The check
      // is a no-op in production builds anyway.
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredPaths: ['liveChat', 'templates', 'formDrafts', 'media'],
        warnAfter: 200,
      },
      // Same story for the immutability check — walking deeply nested
      // template + thread objects exceeded the default budget.
      immutableCheck: { warnAfter: 200 },
    }).concat(liveChatNotifier),
});

export const persistor = persistStore(store);

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

// Back-compat alias so legacy imports keep working — selector form over Redux state.
export const useAppStore = (selector) => useSelector(selector);

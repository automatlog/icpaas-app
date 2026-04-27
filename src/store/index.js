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

const rootReducer = combineReducers({
  auth: authReducer,
  hydrated: hydratedReducer,
  conversations: conversationsReducer,
  messages: messagesReducer,
  contacts: contactsReducer,
  campaigns: campaignsReducer,
  templates: templatesReducer,
  media: mediaReducer,
});

const persistConfig = {
  key: 'icpaas-app-state',
  version: 1,
  storage: AsyncStorage,
  // Don't persist the hydrated flag — it's runtime-only
  blacklist: ['hydrated'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

// Back-compat alias so legacy imports keep working — selector form over Redux state.
export const useAppStore = (selector) => useSelector(selector);

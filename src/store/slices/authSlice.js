import { createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import * as secureStorage from '../../services/secureStorage';
import { AuthAPI, DEFAULT_API_TOKEN } from '../../services/api';
import { OMNI_HOST, OMNI_AUTH_LOGIN_PATH } from '../../config';
import { resetLiveChat } from './liveChatSlice';

const initialState = {
  isAuthenticated: false,
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action) {
      state.isAuthenticated = true;
      state.user = action.payload;
    },
    logout() {
      return initialState;
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;

// ---------------------------------------------------------------------------
// Real auth path. Tries OMNI_HOST + OMNI_AUTH_LOGIN_PATH expecting
//   POST { username, password } → { token, user: { username, name, role, ... } }
// Returns null when the path isn't configured yet so the thunk falls back to
// the hard-coded demo creds.
// ---------------------------------------------------------------------------
const tryRemoteLogin = async (username, password) => {
  if (!OMNI_AUTH_LOGIN_PATH) return null;

  try {
    const res = await axios.post(
      `${OMNI_HOST}${OMNI_AUTH_LOGIN_PATH}`,
      { username, password },
      { timeout: 15000, headers: { Accept: 'application/json' } },
    );
    const data = res?.data || {};
    const token = data.token || data.accessToken || data.access_token;
    if (!token) {
      return { ok: false, error: data.message || 'Login response missing token.' };
    }
    return {
      ok: true,
      token,
      user: data.user || { username, name: username, role: 'Agent' },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Sign-in failed.',
    };
  }
};

// ---------------------------------------------------------------------------
// Login thunk.
//   1. If OMNI_AUTH_LOGIN_PATH is configured, attempt real auth first.
//   2. Otherwise (or if real auth was misconfigured), accept the demo creds
//      and seed DEFAULT_API_TOKEN so existing flows keep working.
// ---------------------------------------------------------------------------
export const login = ({ username, password }) => async (dispatch) => {
  // Real auth path (skipped when OMNI_AUTH_LOGIN_PATH is null).
  const remote = await tryRemoteLogin(username, password);
  if (remote) {
    if (!remote.ok) return { ok: false, error: remote.error };
    await secureStorage.setItem('icpaas_token', remote.token);
    dispatch(loginSuccess(remote.user));
    return { ok: true };
  }

  // Demo fallback — kept until backend ships the mobile-token endpoint.
  if (username !== 'omniuser' || password !== 'Omni@1234') {
    return { ok: false, error: 'Use username "omniuser" and password "Omni@1234".' };
  }

  const existing = await AuthAPI.getToken();
  if (!existing) await AuthAPI.saveCredentials(DEFAULT_API_TOKEN);

  dispatch(loginSuccess({
    username: 'omniuser',
    name: 'Omniuser',
    role: 'Super Admin',
  }));
  return { ok: true };
};

// ---------------------------------------------------------------------------
// Logout thunk. Replaces the bare `logout` action in screens because the
// reducer alone doesn't clear the AsyncStorage bearer or reset live chat
// state. RealtimeProvider observes `isAuthenticated` and stops the SignalR
// connection automatically once this dispatches.
// ---------------------------------------------------------------------------
export const logoutAndCleanup = () => async (dispatch) => {
  try {
    await AuthAPI.clearCredentials();
  } catch (_) {
    // Storage failures are non-fatal — proceed to reset Redux state anyway.
  }
  dispatch(resetLiveChat());
  dispatch(logout());
};

export default authSlice.reducer;

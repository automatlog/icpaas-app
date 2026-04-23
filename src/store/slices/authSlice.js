import { createSlice } from '@reduxjs/toolkit';
import { AuthAPI, DEFAULT_API_TOKEN } from '../../services/api';

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

// Thunk: validates demo credentials, seeds the API bearer, then dispatches loginSuccess
export const login = ({ username, password }) => async (dispatch) => {
  if (username !== 'admin' || password !== 'Pass@1234') {
    return { ok: false, error: 'Use username "admin" and password "Pass@1234".' };
  }

  // Seed the default bearer so all screens can call gsauth.com + icpaas.in.
  // User can override via Config > Save & test balance.
  const existing = await AuthAPI.getToken();
  if (!existing) await AuthAPI.saveCredentials(DEFAULT_API_TOKEN);

  dispatch(loginSuccess({
    username: 'admin',
    name: 'Administrator',
    role: 'Super Admin',
  }));
  return { ok: true };
};

export default authSlice.reducer;

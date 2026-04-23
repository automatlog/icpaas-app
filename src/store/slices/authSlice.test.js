// In-memory AsyncStorage mock so the thunk can seed/read tokens under Jest.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: (k) => Promise.resolve(store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, v); return Promise.resolve(); },
      removeItem: (k) => { store.delete(k); return Promise.resolve(); },
      multiRemove: (keys) => { keys.forEach((k) => store.delete(k)); return Promise.resolve(); },
    },
  };
});

import authReducer, { loginSuccess, logout, login } from './authSlice';

describe('authSlice', () => {
  const initial = { isAuthenticated: false, user: null };

  test('loginSuccess sets user and flips isAuthenticated', () => {
    const next = authReducer(initial, loginSuccess({ username: 'admin', name: 'Administrator', role: 'Super Admin' }));
    expect(next.isAuthenticated).toBe(true);
    expect(next.user).toEqual({ username: 'admin', name: 'Administrator', role: 'Super Admin' });
  });

  test('logout resets state', () => {
    const loggedIn = { isAuthenticated: true, user: { username: 'admin' } };
    expect(authReducer(loggedIn, logout())).toEqual(initial);
  });

  test('login thunk rejects bad credentials without dispatching', async () => {
    const dispatch = jest.fn();
    const result = await login({ username: 'x', password: 'y' })(dispatch);
    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('login thunk accepts admin/Pass@1234 and dispatches loginSuccess', async () => {
    const dispatch = jest.fn();
    const result = await login({ username: 'admin', password: 'Pass@1234' })(dispatch);
    expect(result).toEqual({ ok: true });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: loginSuccess.type }));
  });
});

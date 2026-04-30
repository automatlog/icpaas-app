// Owns the lifecycle of the SignalR connection.
//
//   isAuthenticated → true   → realtime.connect()
//   isAuthenticated → false  → realtime.stop()
//   app backgrounded         → leave alone (auto-reconnect handles drops)
//
// Children render unchanged; this provider only wires effects.
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import * as realtime from '../services/realtime';

export default function RealtimeProvider({ children }) {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    let cancelled = false;

    if (isAuthenticated && !wasAuthenticated.current) {
      wasAuthenticated.current = true;
      realtime.connect().catch(() => {
        // connect() already dispatched disconnected with error; nothing else
        // to do here. Reconnect attempts happen automatically on next call.
      });
    } else if (!isAuthenticated && wasAuthenticated.current) {
      wasAuthenticated.current = false;
      realtime.stop().catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Foreground returns: nudge a reconnect if we lost the socket while the OS
  // suspended the JS thread. SignalR's automatic reconnect handles most of
  // this, but iOS in particular can leave the socket in a half-open state.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && wasAuthenticated.current && !realtime.isConnected()) {
        realtime.connect().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  return children;
}
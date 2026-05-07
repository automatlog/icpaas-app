import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import {
  startRealtime,
  stopRealtime,
  isConnected,
  refetchAfterReconnect,
} from '../services/realtime';

export default function RealtimeProvider({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (isAuthenticated) {
      startRealtime();
    } else {
      stopRealtime();
    }

    return () => {
      stopRealtime();
    };
  }, [isAuthenticated]);

  // App returning to the foreground — SignalR's auto-reconnect handles most
  // network drops, but iOS in particular can leave the socket half-open
  // after a long suspend. Two recoveries fire here:
  //   • If the socket is dead, kick a fresh connect.
  //   • If the socket is alive, run the same refetch we use post-reconnect
  //     in case events fired while the JS thread was paused.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (!isAuthenticated) return;
      if (prev !== 'active' && next === 'active') {
        if (isConnected()) {
          refetchAfterReconnect();
        } else {
          startRealtime().catch(() => {});
        }
      }
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  return children;
}
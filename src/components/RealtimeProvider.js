import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { startRealtime, stopRealtime } from '../services/realtime';

export default function RealtimeProvider({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth);

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

  return children;
}
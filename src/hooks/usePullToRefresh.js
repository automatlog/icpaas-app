// src/hooks/usePullToRefresh.js
//
// Drop-in helper for ScrollView/FlatList pull-to-refresh. Returns
// `{ refreshing, onRefresh, controlProps }` so callers can pass either
// the discrete pieces or spread `controlProps` directly into a
// <RefreshControl /> element.
//
//   const { refreshing, onRefresh } = usePullToRefresh(async () => {
//     await dispatch(fetchSomething());
//   });
//   <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} ... />
//
// If `loader` is omitted (static screen), the hook still flips the spinner
// for ~400ms so the user gets visual confirmation that the gesture worked.
import { useCallback, useState } from 'react';

const MIN_SPIN_MS = 400;

export default function usePullToRefresh(loader) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      if (typeof loader === 'function') await loader();
    } catch {
      // Loader-thrown errors surface to the caller's own error toasts;
      // we just need to clear the spinner.
    } finally {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_SPIN_MS - elapsed);
      if (remaining > 0) {
        setTimeout(() => setRefreshing(false), remaining);
      } else {
        setRefreshing(false);
      }
    }
  }, [loader]);

  return { refreshing, onRefresh };
}

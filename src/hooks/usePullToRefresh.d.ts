// Type shim for src/hooks/usePullToRefresh.js
export default function usePullToRefresh(
  loader?: () => Promise<unknown> | unknown,
): {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
};

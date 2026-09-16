import { useCallback, useEffect, useState } from "react";
import { describeError } from "../lib/errors";

interface UseSheetsDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Generic loading/error/data wrapper around any sheetsStore read — used by
// every admin list screen so they don't each hand-roll the same
// try/catch/loading dance.
export function useSheetsData<T>(fetcher: (() => Promise<T>) | null, deps: unknown[]): UseSheetsDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!fetcher) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}

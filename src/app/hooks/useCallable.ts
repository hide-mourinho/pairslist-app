import { useState, useCallback } from 'react';
import { getFunctions, httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import { app } from '../../lib/firebase';

export function useCallable<T = any, R = any>(functionName: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const call = useCallback(async (data: T): Promise<R | null> => {
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions(app, 'asia-northeast1');
      const callable = httpsCallable<T, R>(functions, functionName);
      const result: HttpsCallableResult<R> = await callable(data);
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [functionName]);

  return { call, loading, error };
}
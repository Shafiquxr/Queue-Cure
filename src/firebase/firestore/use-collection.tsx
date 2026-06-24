'use client';

import { useEffect, useState, useRef } from 'react';
import { Query, onSnapshot, DocumentData, collection, QueryConstraint, query } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

function getQueryKey(q: Query | null): string {
  if (!q) return '';
  try {
    const internal = (q as any)._query;
    const path = internal?.path?.segments?.join('/') || '';
    const filters = JSON.stringify(internal?.filters || []);
    const orderBy = JSON.stringify(internal?.orderBy || []);
    const key = `${path}|${filters}|${orderBy}`;
    return key.length > 1 ? key : JSON.stringify(q);
  } catch {
    return JSON.stringify(q);
  }
}

export function useCollection<T = DocumentData>(q: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const queryRef = useRef(q);
  queryRef.current = q;

  const queryKey = getQueryKey(q as Query | null);

  useEffect(() => {
    const currentQuery = queryRef.current;
    if (!currentQuery) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      currentQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data({ serverTimestamps: 'estimate' }),
        })) as T[];
        setData(docs);
        setLoading(false);
      },
      async (serverError) => {
        const path = (currentQuery as any)._query?.path?.segments?.join('/') || 'unknown-path';
        const permissionError = new FirestorePermissionError({
          path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [queryKey]);

  return { data, loading, error };
}

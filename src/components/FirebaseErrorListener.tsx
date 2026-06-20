'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: Error) => {
      // In development, we want to see the rich error
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
      
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have access to this resource.',
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => errorEmitter.off('permission-error', handlePermissionError);
  }, [toast]);

  return null;
}

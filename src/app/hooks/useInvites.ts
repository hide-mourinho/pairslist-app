import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';
import type { 
  CreateInviteRequest, 
  CreateInviteResponse,
  AcceptInviteRequest,
  AcceptInviteResponse 
} from '../types';

export const useInvites = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createInvite = async (listId: string, oneTime = true): Promise<CreateInviteResponse> => {
    try {
      setLoading(true);
      setError(null);
      
      const createInviteFunction = httpsCallable<CreateInviteRequest, CreateInviteResponse>(
        functions,
        'createInvite'
      );
      
      const result = await createInviteFunction({ listId, oneTime });
      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create invite';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async (token: string): Promise<AcceptInviteResponse> => {
    try {
      setLoading(true);
      setError(null);
      
      const acceptInviteFunction = httpsCallable<AcceptInviteRequest, AcceptInviteResponse>(
        functions,
        'acceptInvite'
      );
      
      const result = await acceptInviteFunction({ token });
      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept invite';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createInvite,
    acceptInvite,
    loading,
    error,
  };
};
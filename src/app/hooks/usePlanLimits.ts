import { useState } from 'react';
import { useCallable } from './useCallable';

interface PlanLimitsResponse {
  allowed: boolean;
  isPro: boolean;
  reason?: string;
  message?: string;
}

interface PlanLimitsRequest {
  action: 'create_list' | 'add_member';
  listId?: string;
}

export const usePlanLimits = () => {
  const { call: checkLimits, loading } = useCallable<PlanLimitsRequest, PlanLimitsResponse>('checkPlanLimits');
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    reason?: 'FREE_LIST_LIMIT' | 'FREE_MEMBER_LIMIT';
    message?: string;
  }>({
    isOpen: false
  });

  const checkPlanLimit = async (action: 'create_list' | 'add_member', listId?: string): Promise<boolean> => {
    try {
      const result = await checkLimits({ action, listId });
      
      if (result && !result.allowed) {
        setUpgradeModal({
          isOpen: true,
          reason: result.reason as 'FREE_LIST_LIMIT' | 'FREE_MEMBER_LIMIT',
          message: result.message
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Plan limit check failed:', error);
      // On error, allow the action to proceed (fail open)
      return true;
    }
  };

  const closeUpgradeModal = () => {
    setUpgradeModal({ isOpen: false });
  };

  return {
    checkPlanLimit,
    upgradeModal,
    closeUpgradeModal,
    loading
  };
};
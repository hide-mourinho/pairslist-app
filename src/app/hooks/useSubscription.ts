import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  initializeRevenueCat,
  getCustomerInfo,
  getOfferings,
  purchasePackage,
  restorePurchases,
  identifyUser,
  logoutUser,
  isProUser,
  getWebSubscriptionStatus,
  type CustomerInfo,
  type Offering,
  type Package
} from '../../lib/revenuecat';
import { Capacitor } from '@capacitor/core';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export interface SubscriptionState {
  customerInfo: CustomerInfo | null;
  offerings: Offering[];
  isLoading: boolean;
  isPro: boolean;
  error: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    customerInfo: null,
    offerings: [],
    isLoading: true,
    isPro: false,
    error: null,
  });

  const updateState = (updates: Partial<SubscriptionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Initialize RevenueCat and load customer info
  useEffect(() => {
    const initialize = async () => {
      if (!user) {
        updateState({ isLoading: false });
        return;
      }

      try {
        updateState({ isLoading: true, error: null });

        if (Capacitor.isNativePlatform()) {
          await initializeRevenueCat();
          await identifyUser(user.uid);
          
          const [customerInfo, offerings] = await Promise.all([
            getCustomerInfo(),
            getOfferings()
          ]);

          updateState({
            customerInfo,
            offerings,
            isPro: isProUser(customerInfo),
            isLoading: false
          });

          // Sync with Firestore
          if (customerInfo) {
            await syncProStatusWithFirestore(customerInfo);
          }
        } else {
          // Web fallback - check Firestore for pro status
          const proStatus = await getProStatusFromFirestore();
          const webCustomerInfo = getWebSubscriptionStatus();
          
          updateState({
            customerInfo: webCustomerInfo,
            offerings: [],
            isPro: proStatus,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Failed to initialize subscription:', error);
        updateState({
          error: error instanceof Error ? error.message : 'Subscription initialization failed',
          isLoading: false
        });
      }
    };

    initialize();
  }, [user]);

  const getProStatusFromFirestore = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const entitlementDoc = await getDoc(doc(db, `users/${user.uid}/entitlements/pro`));
      return entitlementDoc.exists() && entitlementDoc.data()?.active === true;
    } catch (error) {
      console.error('Failed to get pro status from Firestore:', error);
      return false;
    }
  };

  const syncProStatusWithFirestore = async (customerInfo: CustomerInfo) => {
    if (!user) return;

    try {
      const isActive = isProUser(customerInfo);
      await setDoc(doc(db, `users/${user.uid}/entitlements/pro`), {
        active: isActive,
        updatedAt: new Date(),
        source: 'revenuecat'
      });
    } catch (error) {
      console.error('Failed to sync pro status with Firestore:', error);
    }
  };

  const purchase = async (packageToPurchase: Package) => {
    try {
      updateState({ isLoading: true, error: null });
      
      const result = await purchasePackage(packageToPurchase);
      const newCustomerInfo = result.customerInfo;
      
      updateState({
        customerInfo: newCustomerInfo,
        isPro: isProUser(newCustomerInfo),
        isLoading: false
      });

      // Sync with Firestore
      await syncProStatusWithFirestore(newCustomerInfo);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Purchase failed';
      updateState({ error: errorMessage, isLoading: false });
      throw error;
    }
  };

  const restore = async () => {
    try {
      updateState({ isLoading: true, error: null });
      
      const restoredCustomerInfo = await restorePurchases();
      
      updateState({
        customerInfo: restoredCustomerInfo,
        isPro: isProUser(restoredCustomerInfo),
        isLoading: false
      });

      // Sync with Firestore
      await syncProStatusWithFirestore(restoredCustomerInfo);

      return restoredCustomerInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Restore failed';
      updateState({ error: errorMessage, isLoading: false });
      throw error;
    }
  };

  const refresh = async () => {
    try {
      updateState({ isLoading: true, error: null });
      
      const customerInfo = await getCustomerInfo();
      
      updateState({
        customerInfo,
        isPro: isProUser(customerInfo),
        isLoading: false
      });

      // Sync with Firestore
      if (customerInfo) {
        await syncProStatusWithFirestore(customerInfo);
      }

      return customerInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Refresh failed';
      updateState({ error: errorMessage, isLoading: false });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
      updateState({
        customerInfo: null,
        offerings: [],
        isPro: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to logout from RevenueCat:', error);
    }
  };

  return {
    ...state,
    purchase,
    restore,
    refresh,
    logout
  };
};
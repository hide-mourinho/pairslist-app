import { Capacitor } from '@capacitor/core';

// Conditional imports for native-only packages
let Purchases: any = null;
let LOG_LEVEL: any = null;

const loadRevenueCat = async () => {
  if (Capacitor.isNativePlatform() && !Purchases) {
    try {
      // Use Function constructor to avoid TypeScript static analysis
      const importRevenueCat = new Function('return import("@revenuecat/purchases-capacitor")');
      const revenueCatModule = await importRevenueCat();
      Purchases = revenueCatModule.Purchases;
      LOG_LEVEL = revenueCatModule.LOG_LEVEL;
    } catch (error) {
      console.warn('RevenueCat not available:', error);
    }
  }
};

export interface CustomerInfo {
  activeSubscriptions: string[];
  entitlements: {
    active: Record<string, EntitlementInfo>;
  };
}

export interface EntitlementInfo {
  identifier: string;
  isActive: boolean;
  productIdentifier: string;
}

export interface Package {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    title: string;
    price: string;
    priceString: string;
  };
}

export interface Offering {
  identifier: string;
  packages: Package[];
}

let isInitialized = false;

export const initializeRevenueCat = async () => {
  if (isInitialized || !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await loadRevenueCat();
    
    if (!Purchases) {
      console.warn('RevenueCat not available on this platform');
      return;
    }

    const apiKey = process.env.VITE_REVENUECAT_API_KEY;
    if (!apiKey) {
      console.warn('RevenueCat API key not configured');
      return;
    }

    await Purchases.setLogLevel(LOG_LEVEL.INFO);
    await Purchases.configure({ apiKey });
    
    isInitialized = true;
    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
  }
};

export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (!Capacitor.isNativePlatform() || !isInitialized || !Purchases) {
    return null;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
};

export const getOfferings = async (): Promise<Offering[]> => {
  if (!Capacitor.isNativePlatform() || !isInitialized || !Purchases) {
    return [];
  }

  try {
    const offerings = await Purchases.getOfferings();
    return Object.values(offerings.offerings || {});
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return [];
  }
};

export const purchasePackage = async (packageToPurchase: Package) => {
  if (!Capacitor.isNativePlatform() || !isInitialized || !Purchases) {
    throw new Error('RevenueCat not available on this platform');
  }

  try {
    const purchaseResult = await Purchases.purchasePackage({
      aPackage: packageToPurchase
    });
    return purchaseResult;
  } catch (error) {
    console.error('Purchase failed:', error);
    throw error;
  }
};

export const restorePurchases = async () => {
  if (!Capacitor.isNativePlatform() || !isInitialized || !Purchases) {
    throw new Error('RevenueCat not available on this platform');
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.customerInfo;
  } catch (error) {
    console.error('Restore purchases failed:', error);
    throw error;
  }
};

export const identifyUser = async (userId: string) => {
  if (!Capacitor.isNativePlatform() || !isInitialized || !Purchases) {
    return;
  }

  try {
    await Purchases.logIn({ appUserID: userId });
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
};

export const logoutUser = async () => {
  if (!Capacitor.isNativePlatform() || !isInitialized || !Purchases) {
    return;
  }

  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('Failed to logout user:', error);
  }
};

// Web fallback functions for development
export const getWebSubscriptionStatus = (): CustomerInfo => {
  // Mock data for web development
  return {
    activeSubscriptions: [],
    entitlements: {
      active: {}
    }
  };
};

export const isProUser = (customerInfo: CustomerInfo | null): boolean => {
  if (!customerInfo) return false;
  return customerInfo.entitlements.active['pro']?.isActive === true;
};
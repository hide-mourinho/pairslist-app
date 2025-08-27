// gtag types

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const initGA4 = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
  if (!measurementId || import.meta.env.DEV) {
    console.log('GA4 disabled in development mode or measurement ID not configured');
    return;
  }

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag function
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  // Configure GA4
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    // Respect user privacy
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
};

// Set user ID when user logs in
export const setUserId = (userId: string) => {
  if (window.gtag) {
    window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
      user_id: userId,
    });
  }
};

// Analytics events for key user actions
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

// Specific event trackers
export const analytics = {
  // List events
  listCreate: (listId: string) => {
    trackEvent('list_create', {
      event_category: 'lists',
      list_id: listId,
    });
  },

  listDelete: (listId: string) => {
    trackEvent('list_delete', {
      event_category: 'lists',
      list_id: listId,
    });
  },

  // Item events
  itemAdd: (listId: string, itemId: string) => {
    trackEvent('item_add', {
      event_category: 'items',
      list_id: listId,
      item_id: itemId,
    });
  },

  itemCheck: (listId: string, itemId: string, checked: boolean) => {
    trackEvent('item_check', {
      event_category: 'items',
      list_id: listId,
      item_id: itemId,
      checked: checked,
    });
  },

  itemUpdate: (listId: string, itemId: string) => {
    trackEvent('item_update', {
      event_category: 'items',
      list_id: listId,
      item_id: itemId,
    });
  },

  itemDelete: (listId: string, itemId: string) => {
    trackEvent('item_delete', {
      event_category: 'items',
      list_id: listId,
      item_id: itemId,
    });
  },

  // Invite events
  inviteCreate: (listId: string, inviteToken: string) => {
    trackEvent('invite_create', {
      event_category: 'invites',
      list_id: listId,
      invite_token: inviteToken,
    });
  },

  inviteAccept: (listId: string, inviteToken: string) => {
    trackEvent('invite_accept', {
      event_category: 'invites',
      list_id: listId,
      invite_token: inviteToken,
    });
  },

  inviteRevoke: (listId: string, inviteToken: string) => {
    trackEvent('invite_revoke', {
      event_category: 'invites',
      list_id: listId,
      invite_token: inviteToken,
    });
  },

  // Member events
  memberRoleChange: (listId: string, targetUid: string, newRole: string) => {
    trackEvent('member_role_change', {
      event_category: 'members',
      list_id: listId,
      target_uid: targetUid,
      new_role: newRole,
    });
  },

  memberRemove: (listId: string, targetUid: string) => {
    trackEvent('member_remove', {
      event_category: 'members',
      list_id: listId,
      target_uid: targetUid,
    });
  },

  memberLeave: (listId: string) => {
    trackEvent('member_leave', {
      event_category: 'members',
      list_id: listId,
    });
  },

  // Auth events
  signUp: (method: string) => {
    trackEvent('sign_up', {
      event_category: 'auth',
      method: method,
    });
  },

  signIn: (method: string) => {
    trackEvent('login', {
      event_category: 'auth',
      method: method,
    });
  },

  signOut: () => {
    trackEvent('logout', {
      event_category: 'auth',
    });
  },

  // Push notification events
  notificationEnable: () => {
    trackEvent('notification_enable', {
      event_category: 'notifications',
    });
  },

  notificationDisable: () => {
    trackEvent('notification_disable', {
      event_category: 'notifications',
    });
  },
};
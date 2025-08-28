import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { v4 as uuidv4 } from 'uuid';

initializeApp();

const db = getFirestore();
const messaging = getMessaging();
const REGION = 'asia-northeast1';

export const createInvite = onCall({ region: REGION }, async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { listId, oneTime = true } = data;
  
  if (!listId) {
    throw new HttpsError('invalid-argument', 'listId is required');
  }

  try {
    const memberRef = db.doc(`lists/${listId}/members/${auth.uid}`);
    const memberDoc = await memberRef.get();
    
    if (!memberDoc.exists || memberDoc.data()?.role !== 'owner') {
      throw new HttpsError('permission-denied', 'Only list owners can create invites');
    }

    const inviteToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    await db.doc(`invites/${inviteToken}`).set({
      listId,
      createdBy: auth.uid,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      oneTime,
    });

    const appUrl = process.env.APP_URL || process.env.VITE_PUBLIC_APP_URL || 'https://pairslist-933b1.web.app';
    const inviteUrl = `${appUrl}/accept-invite?token=${inviteToken}`;

    return {
      url: inviteUrl,
      token: inviteToken,
    };
  } catch (error) {
    console.error('Error creating invite:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      listId,
      uid: auth.uid,
    });
    throw new HttpsError('internal', 'Failed to create invite');
  }
});

export const acceptInvite = onCall({ region: REGION }, async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { token } = data;
  
  if (!token) {
    throw new HttpsError('invalid-argument', 'token is required');
  }

  try {
    const inviteRef = db.doc(`invites/${token}`);
    const inviteDoc = await inviteRef.get();
    
    if (!inviteDoc.exists) {
      throw new HttpsError('not-found', 'Invalid or expired invite');
    }

    const invite = inviteDoc.data();
    if (!invite) {
      throw new HttpsError('not-found', 'Invalid invite data');
    }

    // Check if invite is revoked
    if (invite.revoked) {
      throw new HttpsError('failed-precondition', 'Invite has been revoked');
    }

    if (invite.expiresAt.toDate() < new Date()) {
      await inviteRef.delete();
      throw new HttpsError('failed-precondition', 'Invite has expired');
    }

    const memberRef = db.doc(`lists/${invite.listId}/members/${auth.uid}`);
    const existingMember = await memberRef.get();

    if (!existingMember.exists) {
      await memberRef.set({
        role: 'editor',
        joinedAt: FieldValue.serverTimestamp(),
      });
    }

    if (invite.oneTime) {
      await inviteRef.delete();
    }

    return {
      ok: true,
      listId: invite.listId,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error accepting invite:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      token,
      uid: auth.uid,
    });
    throw new HttpsError('internal', 'Failed to accept invite');
  }
});

export const revokeInvite = onCall({ region: REGION }, async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { token } = data;
  
  if (!token) {
    throw new HttpsError('invalid-argument', 'token is required');
  }

  try {
    const inviteRef = db.doc(`invites/${token}`);
    const inviteDoc = await inviteRef.get();
    
    if (!inviteDoc.exists) {
      throw new HttpsError('not-found', 'Invite not found');
    }

    const invite = inviteDoc.data();
    if (!invite) {
      throw new HttpsError('not-found', 'Invalid invite data');
    }

    // Check if user is owner of the list
    const memberRef = db.doc(`lists/${invite.listId}/members/${auth.uid}`);
    const memberDoc = await memberRef.get();
    
    if (!memberDoc.exists || memberDoc.data()?.role !== 'owner') {
      throw new HttpsError('permission-denied', 'Only list owners can revoke invites');
    }

    await inviteRef.update({
      revoked: true,
      revokedBy: auth.uid,
      revokedAt: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error revoking invite:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      token,
      uid: auth.uid,
    });
    throw new HttpsError('internal', 'Failed to revoke invite');
  }
});

export const updateMemberRole = onCall({ region: REGION }, async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { listId, targetUid, role } = data;
  
  if (!listId || !targetUid || !role) {
    throw new HttpsError('invalid-argument', 'listId, targetUid, and role are required');
  }

  if (role !== 'owner' && role !== 'editor') {
    throw new HttpsError('invalid-argument', 'Role must be either "owner" or "editor"');
  }

  try {
    // Check if user is owner
    const currentUserRef = db.doc(`lists/${listId}/members/${auth.uid}`);
    const currentUserDoc = await currentUserRef.get();
    
    if (!currentUserDoc.exists || currentUserDoc.data()?.role !== 'owner') {
      throw new HttpsError('permission-denied', 'Only list owners can update member roles');
    }

    // Get target member
    const targetMemberRef = db.doc(`lists/${listId}/members/${targetUid}`);
    const targetMemberDoc = await targetMemberRef.get();
    
    if (!targetMemberDoc.exists) {
      throw new HttpsError('not-found', 'Target member not found');
    }

    const currentRole = targetMemberDoc.data()?.role;
    
    // If changing from owner to editor, ensure there's at least one other owner
    if (currentRole === 'owner' && role === 'editor') {
      const membersSnapshot = await db.collection(`lists/${listId}/members`)
        .where('role', '==', 'owner')
        .get();
      
      if (membersSnapshot.size <= 1) {
        throw new HttpsError('failed-precondition', 'Cannot remove the last owner from the list');
      }
    }

    await targetMemberRef.update({
      role,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error updating member role:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      listId,
      targetUid,
      role,
      uid: auth.uid,
    });
    throw new HttpsError('internal', 'Failed to update member role');
  }
});

export const removeMember = onCall({ region: REGION }, async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { listId, targetUid } = data;
  
  if (!listId || !targetUid) {
    throw new HttpsError('invalid-argument', 'listId and targetUid are required');
  }

  try {
    // Check if user is owner
    const currentUserRef = db.doc(`lists/${listId}/members/${auth.uid}`);
    const currentUserDoc = await currentUserRef.get();
    
    if (!currentUserDoc.exists || currentUserDoc.data()?.role !== 'owner') {
      throw new HttpsError('permission-denied', 'Only list owners can remove members');
    }

    // Get target member
    const targetMemberRef = db.doc(`lists/${listId}/members/${targetUid}`);
    const targetMemberDoc = await targetMemberRef.get();
    
    if (!targetMemberDoc.exists) {
      throw new HttpsError('not-found', 'Target member not found');
    }

    const targetRole = targetMemberDoc.data()?.role;
    
    // If removing an owner, ensure there's at least one other owner
    if (targetRole === 'owner') {
      const ownersSnapshot = await db.collection(`lists/${listId}/members`)
        .where('role', '==', 'owner')
        .get();
      
      if (ownersSnapshot.size <= 1) {
        throw new HttpsError('failed-precondition', 'Cannot remove the last owner from the list');
      }
    }

    await targetMemberRef.delete();

    return { ok: true };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error removing member:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      listId,
      targetUid,
      uid: auth.uid,
    });
    throw new HttpsError('internal', 'Failed to remove member');
  }
});

export const leaveList = onCall({ region: REGION }, async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { listId } = data;
  
  if (!listId) {
    throw new HttpsError('invalid-argument', 'listId is required');
  }

  try {
    const memberRef = db.doc(`lists/${listId}/members/${auth.uid}`);
    const memberDoc = await memberRef.get();
    
    if (!memberDoc.exists) {
      throw new HttpsError('not-found', 'You are not a member of this list');
    }

    const memberData = memberDoc.data();
    
    // If user is an owner, ensure there's at least one other owner
    if (memberData?.role === 'owner') {
      const ownersSnapshot = await db.collection(`lists/${listId}/members`)
        .where('role', '==', 'owner')
        .get();
      
      if (ownersSnapshot.size <= 1) {
        throw new HttpsError('failed-precondition', 'Cannot leave: you are the last owner of this list');
      }
    }

    await memberRef.delete();

    return { ok: true };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error leaving list:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      listId,
      uid: auth.uid,
    });
    throw new HttpsError('internal', 'Failed to leave list');
  }
});

export const sendItemNotifications = onDocumentWritten(
  { document: 'lists/{listId}/items/{itemId}', region: REGION },
  async (event) => {
    const { listId, itemId } = event.params;
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    // Skip if document was deleted
    if (!after) {
      return;
    }

    // Determine the type of change
    let notificationText = '';
    let changeType = '';

    if (!before) {
      // New item added
      changeType = 'added';
      notificationText = `「${after.title}」を追加しました`;
    } else if (before.checked !== after.checked) {
      // Check status changed
      changeType = after.checked ? 'checked' : 'unchecked';
      notificationText = after.checked 
        ? `「${after.title}」をチェックしました`
        : `「${after.title}」のチェックを外しました`;
    } else if (before.title !== after.title || before.note !== after.note || before.qty !== after.qty) {
      // Item updated
      changeType = 'updated';
      notificationText = `「${after.title}」を更新しました`;
    } else {
      // No significant change
      return;
    }

    // Collect all device tokens from members (excluding the user who made the change)
    let deviceTokens: string[] = [];

    try {
      // Get all members of the list
      const membersSnapshot = await db.collection(`lists/${listId}/members`).get();
      const memberUids = membersSnapshot.docs.map(doc => doc.id);

      if (memberUids.length === 0) {
        return;
      }

      // Get the user who made the change (from auth context or updatedBy field)
      const changedByUid = after.updatedBy || after.createdBy;
      
      // Get user details for the notification
      let changedByName = 'Someone';
      if (changedByUid) {
        try {
          const userDoc = await db.doc(`users/${changedByUid}`).get();
          const userData = userDoc.data();
          changedByName = userData?.displayName || 'Someone';
        } catch (error) {
          console.warn('Could not get user data:', error);
        }
      }

      
      for (const memberUid of memberUids) {
        // Skip the user who made the change
        if (memberUid === changedByUid) {
          continue;
        }

        try {
          const tokensSnapshot = await db.collection(`users/${memberUid}/deviceTokens`).get();
          tokensSnapshot.docs.forEach(doc => {
            const tokenData = doc.data();
            if (tokenData.platform === 'web' && tokenData.token) {
              deviceTokens.push(tokenData.token);
            }
          });
        } catch (error) {
          console.warn(`Could not get device tokens for user ${memberUid}:`, error);
        }
      }

      if (deviceTokens.length === 0) {
        console.log('No device tokens found for notification');
        return;
      }

      // Send notifications
      const title = 'PairsList';
      const body = `${changedByName} ${notificationText}`;
      
      const message = {
        notification: {
          title,
          body,
        },
        data: {
          listId,
          itemId,
          changeType,
          url: `/lists/${listId}`
        },
        tokens: deviceTokens,
      };

      const response = await messaging.sendEachForMulticast(message);
      
      // Handle failed tokens
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Failed to send notification to token ${deviceTokens[idx]}:`, resp.error);
          failedTokens.push(deviceTokens[idx]);
        }
      });

      // Clean up invalid tokens
      if (failedTokens.length > 0) {
        const batch = db.batch();
        for (const memberUid of memberUids) {
          for (const token of failedTokens) {
            const tokenRef = db.doc(`users/${memberUid}/deviceTokens/${token}`);
            batch.delete(tokenRef);
          }
        }
        await batch.commit();
        console.log(`Cleaned up ${failedTokens.length} invalid tokens`);
      }

      console.log(`Sent ${response.successCount} notifications for ${changeType} in list ${listId}`);

    } catch (error) {
      console.error('Error sending notifications:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        listId,
        itemId,
        changeType,
        deviceTokensCount: deviceTokens.length,
      });
    }
  }
);

export const cleanupInvites = onSchedule({
  schedule: 'every day 18:00',
  region: REGION,
  timeZone: 'Asia/Tokyo',
}, async () => {
  const now = new Date();
  const invitesRef = db.collection('invites');
  const expiredInvites = await invitesRef
    .where('expiresAt', '<=', now)
    .get();

  const batch = db.batch();
  let count = 0;
  
  expiredInvites.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Cleaned up ${count} expired invites`);
  }
});

// Account deletion functions
export const requestAccountDeletion = onCall({ region: REGION }, async (request) => {
  const { auth } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    // Check if user owns any lists with other members
    const listsSnapshot = await db.collection('lists')
      .where('owner', '==', auth.uid)
      .get();
    
    for (const listDoc of listsSnapshot.docs) {
      const membersSnapshot = await db.collection(`lists/${listDoc.id}/members`).get();
      
      // If there are other members and user is the sole owner, prevent deletion
      if (membersSnapshot.size > 1) {
        const memberRoles = membersSnapshot.docs.map(doc => doc.data().role);
        const ownerCount = memberRoles.filter(role => role === 'owner').length;
        
        if (ownerCount === 1) {
          throw new HttpsError(
            'failed-precondition',
            'アカウントを削除する前に、共有リストの所有権を他のメンバーに譲渡してください'
          );
        }
      }
    }

    // Mark account for deletion
    await db.doc(`users/${auth.uid}`).set({
      deletionRequestedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error requesting account deletion:', error);
    throw new HttpsError('internal', 'アカウント削除リクエストの処理に失敗しました');
  }
});

export const deleteAccountNow = onCall({ region: REGION }, async (request) => {
  const { auth } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    await deleteUserData(auth.uid);
    
    // Delete Firebase Auth user
    const { getAuth } = await import('firebase-admin/auth');
    await getAuth().deleteUser(auth.uid);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting account immediately:', error);
    throw new HttpsError('internal', 'アカウントの即時削除に失敗しました');
  }
});

// Scheduled function to delete accounts after 7 days
export const processScheduledDeletions = onSchedule({
  schedule: 'every day 02:00',
  region: REGION,
  timeZone: 'Asia/Tokyo',
}, async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const usersToDelete = await db.collection('users')
    .where('deletionRequestedAt', '<=', sevenDaysAgo)
    .get();
  
  let deletedCount = 0;
  
  for (const userDoc of usersToDelete.docs) {
    try {
      await deleteUserData(userDoc.id);
      
      // Delete Firebase Auth user
      const { getAuth } = await import('firebase-admin/auth');
      try {
        await getAuth().deleteUser(userDoc.id);
      } catch (authError) {
        console.warn(`Auth user ${userDoc.id} may already be deleted:`, authError);
      }
      
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete user ${userDoc.id}:`, error);
    }
  }
  
  if (deletedCount > 0) {
    console.log(`Deleted ${deletedCount} accounts after 7-day grace period`);
  }
});

// Helper function to delete all user data
async function deleteUserData(uid: string): Promise<void> {
  const batch = db.batch();
  
  // Delete owned lists and their subcollections
  const ownedListsSnapshot = await db.collection('lists')
    .where('owner', '==', uid)
    .get();
  
  for (const listDoc of ownedListsSnapshot.docs) {
    const listId = listDoc.id;
    
    // Check if there are other members
    const membersSnapshot = await db.collection(`lists/${listId}/members`).get();
    
    if (membersSnapshot.size === 1) {
      // User is the only member, delete the entire list
      
      // Delete items
      const itemsSnapshot = await db.collection(`lists/${listId}/items`).get();
      itemsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete members
      membersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete the list itself
      batch.delete(listDoc.ref);
    } else {
      // Remove user from members
      const userMemberRef = db.doc(`lists/${listId}/members/${uid}`);
      batch.delete(userMemberRef);
      
      // Transfer ownership if user is the sole owner
      const memberRoles = membersSnapshot.docs.map(doc => ({ 
        uid: doc.id, 
        role: doc.data().role 
      }));
      const owners = memberRoles.filter(m => m.role === 'owner' && m.uid !== uid);
      
      if (owners.length === 0) {
        // Transfer ownership to the first available member
        const nextOwner = memberRoles.find(m => m.uid !== uid);
        if (nextOwner) {
          batch.update(db.doc(`lists/${listId}/members/${nextOwner.uid}`), {
            role: 'owner'
          });
          batch.update(listDoc.ref, {
            owner: nextOwner.uid
          });
        }
      }
    }
  }
  
  // Delete user's membership in other lists
  const allListsSnapshot = await db.collection('lists').get();
  
  for (const listDoc of allListsSnapshot.docs) {
    if (listDoc.data().owner === uid) continue; // Already handled above
    
    const memberRef = db.doc(`lists/${listDoc.id}/members/${uid}`);
    const memberDoc = await memberRef.get();
    
    if (memberDoc.exists) {
      batch.delete(memberRef);
    }
  }
  
  // Delete invites created by user
  const invitesSnapshot = await db.collection('invites')
    .where('createdBy', '==', uid)
    .get();
  
  invitesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  
  // Delete user document and subcollections
  const userRef = db.doc(`users/${uid}`);
  
  // Delete device tokens
  const deviceTokensSnapshot = await db.collection(`users/${uid}/deviceTokens`).get();
  deviceTokensSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  
  // Delete user document
  batch.delete(userRef);
  
  // Commit the batch
  await batch.commit();
}

// RevenueCat webhook handler
export const revenuecatWebhook = onCall({ region: REGION, cors: true }, async (request) => {
  // This should actually be an onRequest function, but for simplicity we'll use onCall
  // In production, use onRequest with proper webhook signature validation
  const { data } = request;
  
  if (!data || !data.event) {
    throw new HttpsError('invalid-argument', 'Invalid webhook data');
  }

  const { event } = data;
  
  try {
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'SUBSCRIPTION_EXTENDED':
      case 'SUBSCRIPTION_PAUSED':
      case 'SUBSCRIPTION_RESUMED':
        await handleSubscriptionEvent(event);
        break;
      
      case 'CANCELLATION':
      case 'EXPIRATION':
      case 'BILLING_ISSUE':
      case 'PRODUCT_CHANGE':
        await handleSubscriptionEvent(event);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
    throw new HttpsError('internal', 'Webhook processing failed');
  }
});

async function handleSubscriptionEvent(event: any) {
  const appUserId = event.app_user_id;
  if (!appUserId) {
    console.warn('No app_user_id in webhook event');
    return;
  }

  // Determine if user has active Pro entitlement
  let hasProAccess = false;
  
  if (event.subscriber && event.subscriber.entitlements) {
    const proEntitlement = event.subscriber.entitlements['pro'];
    hasProAccess = proEntitlement && proEntitlement.expires_date && 
      new Date(proEntitlement.expires_date) > new Date();
  }

  // Update Firestore entitlement
  await db.doc(`users/${appUserId}/entitlements/pro`).set({
    active: hasProAccess,
    updatedAt: FieldValue.serverTimestamp(),
    source: 'revenuecat_webhook',
    eventType: event.type,
    lastEventId: event.id
  });

  console.log(`Updated Pro entitlement for user ${appUserId}: ${hasProAccess}`);
}

// Plan limits validation
export const checkPlanLimits = onCall({ region: REGION }, async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { action, listId } = data;
  
  // Check if user has Pro access
  const proEntitlementDoc = await db.doc(`users/${auth.uid}/entitlements/pro`).get();
  const isPro = proEntitlementDoc.exists && proEntitlementDoc.data()?.active === true;
  
  if (isPro) {
    return { allowed: true, isPro: true };
  }

  // Apply Free plan limits
  switch (action) {
    case 'create_list':
      const ownedListsSnapshot = await db.collection('lists')
        .where('owner', '==', auth.uid)
        .get();
      
      if (ownedListsSnapshot.size >= 3) {
        return {
          allowed: false,
          isPro: false,
          reason: 'FREE_LIST_LIMIT',
          message: 'Freeプランではリストは3つまでです。Proプランにアップグレードしてください。'
        };
      }
      break;
      
    case 'add_member':
      if (!listId) {
        throw new HttpsError('invalid-argument', 'listId is required for add_member action');
      }
      
      const membersSnapshot = await db.collection(`lists/${listId}/members`).get();
      
      if (membersSnapshot.size >= 5) {
        return {
          allowed: false,
          isPro: false,
          reason: 'FREE_MEMBER_LIMIT',
          message: 'Freeプランでは1つのリストに5人までです。Proプランにアップグレードしてください。'
        };
      }
      break;
      
    default:
      // Unknown action, allow by default
      break;
  }
  
  return { allowed: true, isPro: false };
});
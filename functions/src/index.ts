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
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { v4 as uuidv4 } from 'uuid';

initializeApp();

const db = getFirestore();

export const createInvite = onCall(async (request) => {
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
      createdAt: new Date(),
      expiresAt,
      oneTime,
    });

    const appUrl = process.env.VITE_PUBLIC_APP_URL || 'http://localhost:5173';
    const inviteUrl = `${appUrl}/accept-invite?token=${inviteToken}`;

    return {
      url: inviteUrl,
      token: inviteToken,
    };
  } catch (error) {
    console.error('Error creating invite:', error);
    throw new HttpsError('internal', 'Failed to create invite');
  }
});

export const acceptInvite = onCall(async (request) => {
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

    if (invite.expiresAt.toDate() < new Date()) {
      await inviteRef.delete();
      throw new HttpsError('failed-precondition', 'Invite has expired');
    }

    const memberRef = db.doc(`lists/${invite.listId}/members/${auth.uid}`);
    const existingMember = await memberRef.get();

    if (!existingMember.exists) {
      await memberRef.set({
        role: 'editor',
        joinedAt: new Date(),
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
    console.error('Error accepting invite:', error);
    throw new HttpsError('internal', 'Failed to accept invite');
  }
});
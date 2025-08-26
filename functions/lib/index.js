"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptInvite = exports.createInvite = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const uuid_1 = require("uuid");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
exports.createInvite = (0, https_1.onCall)(async (request) => {
    var _a;
    const { auth, data } = request;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { listId, oneTime = true } = data;
    if (!listId) {
        throw new https_1.HttpsError('invalid-argument', 'listId is required');
    }
    try {
        const memberRef = db.doc(`lists/${listId}/members/${auth.uid}`);
        const memberDoc = await memberRef.get();
        if (!memberDoc.exists || ((_a = memberDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'owner') {
            throw new https_1.HttpsError('permission-denied', 'Only list owners can create invites');
        }
        const inviteToken = (0, uuid_1.v4)();
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
    }
    catch (error) {
        console.error('Error creating invite:', error);
        throw new https_1.HttpsError('internal', 'Failed to create invite');
    }
});
exports.acceptInvite = (0, https_1.onCall)(async (request) => {
    const { auth, data } = request;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { token } = data;
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'token is required');
    }
    try {
        const inviteRef = db.doc(`invites/${token}`);
        const inviteDoc = await inviteRef.get();
        if (!inviteDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Invalid or expired invite');
        }
        const invite = inviteDoc.data();
        if (!invite) {
            throw new https_1.HttpsError('not-found', 'Invalid invite data');
        }
        if (invite.expiresAt.toDate() < new Date()) {
            await inviteRef.delete();
            throw new https_1.HttpsError('failed-precondition', 'Invite has expired');
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
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        console.error('Error accepting invite:', error);
        throw new https_1.HttpsError('internal', 'Failed to accept invite');
    }
});
//# sourceMappingURL=index.js.map
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, functions } from '../../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { analytics } from '../../lib/analytics';

export interface Member {
  uid: string;
  role: 'owner' | 'editor';
  joinedAt: Date;
  updatedAt?: Date;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

export const useMembers = (listId: string) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const membersRef = collection(db, `lists/${listId}/members`);
    const q = query(membersRef, orderBy('joinedAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const membersList: Member[] = [];
          
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const uid = docSnap.id;
            
            // Fetch user details
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
            
            membersList.push({
              uid,
              role: data.role,
              joinedAt: data.joinedAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate(),
              displayName: userData?.displayName || 'Unknown User',
              email: userData?.email,
              photoURL: userData?.photoURL,
            });
          }
          
          setMembers(membersList);
          setError(null);
        } catch (err) {
          console.error('Error fetching members:', err);
          setError('Failed to load members');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error in members subscription:', err);
        setError('Failed to load members');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [listId]);

  const updateMemberRole = async (targetUid: string, role: 'owner' | 'editor') => {
    try {
      const updateRole = httpsCallable(functions, 'updateMemberRole');
      await updateRole({ listId, targetUid, role });
      
      // Track analytics
      analytics.memberRoleChange(listId, targetUid, role);
      
      return { ok: true };
    } catch (error) {
      console.error('Failed to update member role:', error);
      throw error;
    }
  };

  const removeMember = async (targetUid: string) => {
    try {
      const remove = httpsCallable(functions, 'removeMember');
      await remove({ listId, targetUid });
      
      // Track analytics
      analytics.memberRemove(listId, targetUid);
      
      return { ok: true };
    } catch (error) {
      console.error('Failed to remove member:', error);
      throw error;
    }
  };

  const leaveList = async () => {
    try {
      const leave = httpsCallable(functions, 'leaveList');
      await leave({ listId });
      
      // Track analytics
      analytics.memberLeave(listId);
      
      return { ok: true };
    } catch (error) {
      console.error('Failed to leave list:', error);
      throw error;
    }
  };

  const revokeInvite = async (token: string) => {
    try {
      const revoke = httpsCallable(functions, 'revokeInvite');
      await revoke({ token });
      
      // Track analytics
      analytics.inviteRevoke(listId, token);
      
      return { ok: true };
    } catch (error) {
      console.error('Failed to revoke invite:', error);
      throw error;
    }
  };

  return {
    members,
    loading,
    error,
    updateMemberRole,
    removeMember,
    leaveList,
    revokeInvite,
  };
};
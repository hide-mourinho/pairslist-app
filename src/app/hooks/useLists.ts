import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from './useAuth';
import { analytics } from '../../lib/analytics';
import type { ShoppingList } from '../types';

export const useLists = () => {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLists([]);
      setLoading(false);
      return;
    }

    // Query lists where user is a member using array-contains
    const listsQuery = query(
      collection(db, 'lists'),
      where('members', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      listsQuery,
      (snapshot) => {
        try {
          const userLists: ShoppingList[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              createdBy: data.createdBy,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            };
          });
          
          setLists(userLists);
          setError(null);
          setLoading(false);
        } catch (err) {
          console.error('Error fetching lists:', err);
          setError(err instanceof Error ? err.message : 'An error occurred');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error in lists subscription:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const createList = async (name: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const listRef = await addDoc(collection(db, 'lists'), {
        name,
        createdBy: user.uid,
        members: [user.uid],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await setDoc(doc(db, `lists/${listRef.id}/members/${user.uid}`), {
        role: 'owner',
        joinedAt: Timestamp.now(),
      });
      
      // Track analytics
      analytics.listCreate(listRef.id);

      return listRef.id;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create list');
      throw error;
    }
  };

  const updateList = async (listId: string, updates: { name?: string }) => {
    try {
      await updateDoc(doc(db, 'lists', listId), {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update list');
      throw error;
    }
  };

  const deleteList = async (listId: string) => {
    try {
      await deleteDoc(doc(db, 'lists', listId));
      
      // Track analytics
      analytics.listDelete(listId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete list');
      throw error;
    }
  };

  return {
    lists,
    loading,
    error,
    createList,
    updateList,
    deleteList,
  };
};
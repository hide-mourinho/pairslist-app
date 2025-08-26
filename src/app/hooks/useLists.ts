import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  setDoc,
  collectionGroup,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from './useAuth';
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

    // Query the user's memberships directly using collection group
    const memberQuery = query(
      collectionGroup(db, 'members'),
      where('__name__', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      memberQuery,
      async (snapshot) => {
        try {
          const userLists: ShoppingList[] = [];
          
          // Get the parent list documents for each membership
          const listPromises = snapshot.docs.map(async (memberDoc) => {
            try {
              // Extract list ID from the member document path
              const listId = memberDoc.ref.parent.parent?.id;
              if (!listId) return null;

              // Get the list document
              const listDocRef = doc(db, 'lists', listId);
              const listDoc = await getDoc(listDocRef);
              
              if (listDoc.exists()) {
                const data = listDoc.data();
                return {
                  id: listId,
                  name: data.name,
                  createdBy: data.createdBy,
                  createdAt: data.createdAt?.toDate() || new Date(),
                  updatedAt: data.updatedAt?.toDate() || new Date(),
                };
              }
            } catch (err) {
              console.warn(`Failed to fetch list for member doc ${memberDoc.id}:`, err);
            }
            return null;
          });

          const results = await Promise.all(listPromises);
          const filteredLists = results.filter((list): list is ShoppingList => list !== null);
          
          // Sort by updatedAt descending
          filteredLists.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
          
          setLists(filteredLists);
          setError(null);
        } catch (err) {
          console.error('Error fetching lists:', err);
          setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
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
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await setDoc(doc(db, `lists/${listRef.id}/members/${user.uid}`), {
        role: 'owner',
        joinedAt: Timestamp.now(),
      });

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
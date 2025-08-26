import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from './useAuth';
import type { ShoppingItem } from '../types';

export const useListItems = (listId: string) => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!listId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `lists/${listId}/items`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const itemsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          })) as ShoppingItem[];

          const sortedItems = itemsList.sort((a, b) => {
            if (a.checked !== b.checked) {
              return a.checked ? 1 : -1;
            }
            return b.createdAt.getTime() - a.createdAt.getTime();
          });

          setItems(sortedItems);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [listId]);

  const addItem = async (title: string, note?: string, qty?: number) => {
    if (!user || !listId) throw new Error('User not authenticated or list not found');

    try {
      await addDoc(collection(db, `lists/${listId}/items`), {
        title,
        note: note || '',
        qty: qty || 1,
        checked: false,
        assignedTo: null,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      await updateDoc(doc(db, 'lists', listId), {
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add item');
      throw error;
    }
  };

  const updateItem = async (itemId: string, updates: {
    title?: string;
    note?: string;
    qty?: number;
    checked?: boolean;
    assignedTo?: string | null;
  }) => {
    if (!listId) throw new Error('List not found');

    try {
      await updateDoc(doc(db, `lists/${listId}/items`, itemId), {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      await updateDoc(doc(db, 'lists', listId), {
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update item');
      throw error;
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!listId) throw new Error('List not found');

    try {
      await deleteDoc(doc(db, `lists/${listId}/items`, itemId));
      
      await updateDoc(doc(db, 'lists', listId), {
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete item');
      throw error;
    }
  };

  const toggleItemCheck = async (itemId: string, checked: boolean) => {
    await updateItem(itemId, { checked });
  };

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    toggleItemCheck,
  };
};
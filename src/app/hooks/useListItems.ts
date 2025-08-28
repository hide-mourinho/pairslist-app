import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  runTransaction,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from './useAuth';
import { analytics } from '../../lib/analytics';
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
      orderBy('updatedAt', 'desc')
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
            dueAt: doc.data().dueAt || null,
            repeat: doc.data().repeat || 'none',
            remindAt: doc.data().remindAt || [],
            assigneeUid: doc.data().assigneeUid || null,
          })) as ShoppingItem[];

          const sortedItems = itemsList.sort((a, b) => {
            if (a.checked !== b.checked) {
              return a.checked ? 1 : -1;
            }
            return b.updatedAt.getTime() - a.updatedAt.getTime();
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

  const addItem = async (
    title: string, 
    options?: {
      note?: string;
      qty?: number;
      dueAt?: Timestamp | null;
      repeat?: 'none' | 'daily' | 'weekly' | 'weekdays';
      assigneeUid?: string | null;
    }
  ) => {
    if (!user || !listId) throw new Error('User not authenticated or list not found');

    try {
      const batch = writeBatch(db);
      const itemRef = doc(collection(db, `lists/${listId}/items`));
      const listRef = doc(db, 'lists', listId);
      
      const newItem = {
        title,
        note: options?.note || '',
        qty: options?.qty || 1,
        checked: false,
        assignedTo: null, // Legacy field for backward compatibility
        dueAt: options?.dueAt || null,
        repeat: options?.repeat || 'none',
        remindAt: [],
        assigneeUid: options?.assigneeUid || null,
        createdBy: user.uid,
        updatedBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      batch.set(itemRef, newItem);
      
      batch.update(listRef, {
        updatedAt: serverTimestamp(),
      });
      
      await batch.commit();
      
      // Track analytics
      analytics.itemAdd(listId, itemRef.id);
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
    dueAt?: Timestamp | null;
    repeat?: 'none' | 'daily' | 'weekly' | 'weekdays';
    remindAt?: Timestamp[];
    assigneeUid?: string | null;
  }, options?: { optimistic?: boolean }) => {
    if (!listId || !user) throw new Error('List not found or user not authenticated');

    // Find current item for optimistic UI
    const currentItem = items.find(item => item.id === itemId);
    
    if (options?.optimistic && currentItem) {
      // Apply optimistic update
      const optimisticItem = {
        ...currentItem,
        ...updates,
        updatedAt: new Date(),
        updatedBy: user.uid,
      };
      setItems(prev => prev.map(item => item.id === itemId ? optimisticItem : item));
    }

    try {
      await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, `lists/${listId}/items`, itemId);
        const listRef = doc(db, 'lists', listId);
        
        transaction.update(itemRef, {
          ...updates,
          updatedBy: user.uid,
          updatedAt: serverTimestamp(),
        });
        
        transaction.update(listRef, {
          updatedAt: serverTimestamp(),
        });
      });
      
      // Track analytics
      if (updates.checked !== undefined) {
        analytics.itemCheck(listId, itemId, updates.checked);
      } else {
        analytics.itemUpdate(listId, itemId);
      }
    } catch (error) {
      // Rollback optimistic update on error
      if (options?.optimistic && currentItem) {
        setItems(prev => prev.map(item => item.id === itemId ? currentItem : item));
      }
      setError(error instanceof Error ? error.message : 'Failed to update item');
      throw error;
    }
  };

  const deleteItem = async (itemId: string, options?: { optimistic?: boolean }) => {
    if (!listId) throw new Error('List not found');

    // Find current item for optimistic UI
    const currentItem = items.find(item => item.id === itemId);
    
    if (options?.optimistic && currentItem) {
      // Apply optimistic delete
      setItems(prev => prev.filter(item => item.id !== itemId));
    }

    try {
      const batch = writeBatch(db);
      const itemRef = doc(db, `lists/${listId}/items`, itemId);
      const listRef = doc(db, 'lists', listId);
      
      batch.delete(itemRef);
      batch.update(listRef, {
        updatedAt: serverTimestamp(),
      });
      
      await batch.commit();
      
      // Track analytics
      analytics.itemDelete(listId, itemId);
    } catch (error) {
      // Rollback optimistic delete on error
      if (options?.optimistic && currentItem) {
        setItems(prev => [...prev, currentItem].sort((a, b) => {
          if (a.checked !== b.checked) {
            return a.checked ? 1 : -1;
          }
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        }));
      }
      setError(error instanceof Error ? error.message : 'Failed to delete item');
      throw error;
    }
  };

  const toggleItemCheck = async (itemId: string, checked: boolean) => {
    await updateItem(itemId, { checked }, { optimistic: true });
  };

  const setItemDue = async (itemId: string, dueAt: Timestamp | null, repeat: 'none' | 'daily' | 'weekly' | 'weekdays' = 'none') => {
    await updateItem(itemId, { dueAt, repeat });
  };

  const setItemAssignee = async (itemId: string, assigneeUid: string | null) => {
    await updateItem(itemId, { assigneeUid });
  };

  const addReminder = async (itemId: string, remindAt: Timestamp) => {
    const currentItem = items.find(item => item.id === itemId);
    if (!currentItem) throw new Error('Item not found');
    
    const newReminders = [...currentItem.remindAt, remindAt].sort((a, b) => a.toMillis() - b.toMillis());
    await updateItem(itemId, { remindAt: newReminders });
  };

  const removeReminder = async (itemId: string, reminderIndex: number) => {
    const currentItem = items.find(item => item.id === itemId);
    if (!currentItem) throw new Error('Item not found');
    
    const newReminders = currentItem.remindAt.filter((_, index) => index !== reminderIndex);
    await updateItem(itemId, { remindAt: newReminders });
  };

  // Filtering helpers
  const getItemsDue = (beforeDate?: Date) => {
    const cutoff = beforeDate || new Date();
    return items.filter(item => 
      item.dueAt && 
      item.dueAt.toDate() <= cutoff &&
      !item.checked
    );
  };

  const getItemsByAssignee = (assigneeUid: string) => {
    return items.filter(item => item.assigneeUid === assigneeUid);
  };

  const getOverdueItems = () => {
    const now = new Date();
    return items.filter(item => 
      item.dueAt && 
      item.dueAt.toDate() < now &&
      !item.checked
    );
  };

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    toggleItemCheck,
    setItemDue,
    setItemAssignee,
    addReminder,
    removeReminder,
    getItemsDue,
    getItemsByAssignee,
    getOverdueItems,
  };
};
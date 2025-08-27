import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface UserInfo {
  displayName: string;
  email?: string;
  photoURL?: string;
}

const userCache = new Map<string, UserInfo>();

export const useUserInfo = (uid: string | undefined) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid) {
      setUserInfo(null);
      return;
    }

    // Check cache first
    if (userCache.has(uid)) {
      setUserInfo(userCache.get(uid)!);
      return;
    }

    const fetchUserInfo = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const info: UserInfo = {
            displayName: data.displayName || 'Unknown User',
            email: data.email,
            photoURL: data.photoURL,
          };
          userCache.set(uid, info);
          setUserInfo(info);
        } else {
          const fallbackInfo: UserInfo = { displayName: 'Unknown User' };
          userCache.set(uid, fallbackInfo);
          setUserInfo(fallbackInfo);
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        const fallbackInfo: UserInfo = { displayName: 'Unknown User' };
        setUserInfo(fallbackInfo);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [uid]);

  return { userInfo, loading };
};

export const formatLastUpdated = (updatedAt: Date, _updatedBy: string, userInfo: UserInfo | null) => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60));
  
  const userName = userInfo?.displayName || 'Unknown User';
  const timeStr = updatedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  
  if (diffInMinutes < 1) {
    return `${userName}が たった今 更新`;
  } else if (diffInMinutes < 60) {
    return `${userName}が ${diffInMinutes}分前に更新`;
  } else {
    return `${userName}が ${timeStr} に更新`;
  }
};
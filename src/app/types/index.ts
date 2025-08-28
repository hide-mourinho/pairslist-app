import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: Date;
}

export interface ShoppingList {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListMember {
  uid: string;
  role: 'owner' | 'editor';
  joinedAt: Date;
}

export interface ShoppingItem {
  id: string;
  title: string;
  note?: string;
  qty?: number;
  checked: boolean;
  assignedTo?: string | null;
  dueAt: Timestamp | null;
  repeat: 'none' | 'daily' | 'weekly' | 'weekdays';
  remindAt: Timestamp[];
  assigneeUid: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface Invite {
  id: string;
  listId: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  oneTime: boolean;
}

export interface CreateInviteRequest {
  listId: string;
  oneTime?: boolean;
}

export interface CreateInviteResponse {
  url: string;
  token: string;
}

export interface AcceptInviteRequest {
  token: string;
}

export interface AcceptInviteResponse {
  ok: boolean;
  listId?: string;
}

export interface FCMToken {
  token: string;
  platform: 'web' | 'android' | 'ios';
  createdAt: Date;
  lastUsed: Date;
}

export interface NotificationSettings {
  enabled: boolean;
  reminders: boolean;
  assignments: boolean;
  silentHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
  };
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  fcmTokens: FCMToken[];
  notificationSettings: NotificationSettings;
  createdAt: Date;
  updatedAt: Date;
}
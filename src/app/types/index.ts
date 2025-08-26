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
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
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
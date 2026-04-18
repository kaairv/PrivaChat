import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: string;
  lastSeen?: Timestamp;
  createdAt: Timestamp;
}

export interface Chat {
  id: string;
  members: string[]; // usernames
  memberUids: string[]; // auth uids
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: Timestamp;
  };
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

export interface Message {
  id: string;
  senderId: string;
  senderUid: string;
  text: string;
  type: 'text' | 'image';
  createdAt: Timestamp;
}

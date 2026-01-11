
export enum ListingType {
  BUY_SELL = 'BUY_SELL',
  SERVICES = 'SERVICES',
  JOBS = 'JOBS',
  PROPERTY = 'PROPERTY',
  PROMOTION = 'PROMOTION'
}

export type SyncStatus = 'SYNCED' | 'PENDING' | 'OFFLINE' | 'ERROR';

export interface User {
  id: string;
  username: string;
  name: string;
  photoUrl: string;
  location: string;
  accountType: 'INDIVIDUAL' | 'BUSINESS';
  joinedDate: string;
  isVerified: boolean;
  listingCount: number;
  rating?: number;
  tags?: string[];
  syncStatus?: SyncStatus;
}

export interface Listing {
  id: string;
  ownerId: string;
  ownerName: string;
  type: ListingType;
  category: string;
  title: string;
  shortDescription?: string;
  description: string;
  price: number | 'NEGOTIABLE';
  images: string[];
  location: string;
  createdAt: string; 
  isBoosted: boolean;
  views: number;
  contactMethod: {
    inAppChat: boolean;
    whatsapp: string;
  };
  syncStatus?: SyncStatus;
}

export interface Handshake {
  id: string;
  chatId: string;
  sellerId: string;
  buyerId: string;
  listingId: string;
  agreedPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
  timestamp: string;
  syncStatus?: SyncStatus;
}

export interface Clip {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhoto: string;
  videoUrl: string;
  caption: string;
  listingId?: string;
  likes: number;
  views: number;
  createdAt: string;
  syncStatus?: SyncStatus;
}

export interface Story {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhoto: string;
  imageUrl: string;
  createdAt: string;
  isLive?: boolean;
}

export interface ChatSession {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string;
  lastMessage: string;
  lastTimestamp: string;
  listingId?: string;
  syncStatus?: SyncStatus;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'BOOST' | 'HANDSHAKE_ESCROW';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  provider: 'MTN' | 'AIRTEL' | 'WALLET';
  description: string;
  timestamp: string;
  syncStatus?: SyncStatus;
}

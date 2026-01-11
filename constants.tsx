
import React from 'react';
import { ListingType, Listing, User, ChatSession } from './types';

export const CATEGORIES = [
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'fashion', name: 'Fashion', icon: '👕' },
  { id: 'home', name: 'Home & Living', icon: '🏠' },
  { id: 'agriculture', name: 'Agriculture', icon: '🌾' },
  { id: 'auto', name: 'Automotive', icon: '🚗' },
  { id: 'skills', name: 'Skills & Trades', icon: '🛠️' },
  { id: 'gigs', name: 'Quick Gigs', icon: '⚡' },
];

export const CURRENCY_MAP: Record<string, string> = {
  'ZMW': 'ZK',
  'USD': '$',
  'GHS': '₵',
  'NGN': '₦',
  'KES': 'KSh',
  'ZAR': 'R'
};

// Fix: Add getCurrencySymbol to resolve import error in Admin.tsx
export const getCurrencySymbol = (code: string) => CURRENCY_MAP[code] || 'ZK';

export const EXCHANGE_RATES: Record<string, number> = {
  'ZMW': 1,
  'USD': 0.038,
  'GHS': 0.5,
  'NGN': 0.02,
  'KES': 0.2
};

export const formatPrice = (price: number | 'NEGOTIABLE', targetCurrency: string = 'ZMW') => {
  if (price === 'NEGOTIABLE') return 'NEGOTIABLE';
  const symbol = CURRENCY_MAP[targetCurrency] || 'ZK';
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  const displayPrice = price * rate;
  return `${symbol}${displayPrice.toLocaleString(undefined, { 
    minimumFractionDigits: targetCurrency === 'USD' ? 2 : 0,
    maximumFractionDigits: targetCurrency === 'USD' ? 2 : 0 
  })}`;
};

export const MOCK_USER: User = {
  id: 'u1',
  username: 'kwame_hustles',
  name: 'Kwame Mensah',
  photoUrl: 'https://picsum.photos/200/200?random=1',
  location: 'Lusaka, Zambia',
  accountType: 'BUSINESS',
  joinedDate: 'Jan 2024',
  isVerified: true,
  listingCount: 12
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

export const MOCK_LISTINGS: Listing[] = [
  {
    id: 'l1',
    ownerId: 'u2',
    ownerName: 'Zambia Tech Hub',
    type: ListingType.BUY_SELL,
    category: 'Electronics',
    title: 'Solar Inverters for Power Backups',
    shortDescription: 'Stay powered through the mesh ☀️',
    description: 'Perfect for Load Shedding! 5kVA Hybrid Inverters with lithium batteries. Stay powered through the mesh.',
    price: 15500,
    images: ['https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800'],
    location: 'Lusaka, Zambia',
    createdAt: hoursAgo(2),
    isBoosted: true,
    views: 890,
    contactMethod: { inAppChat: true, whatsapp: '+260971234567' }
  },
  {
    id: 'l2',
    ownerId: 'u3',
    ownerName: 'Lusaka Fashion',
    type: ListingType.BUY_SELL,
    category: 'Fashion',
    title: 'Boutique Collection - Chitenge Wear',
    shortDescription: 'Authentic styles for every vibe ✨',
    description: 'Beautifully crafted local wear for weddings and office. Authentic Zambian styles.',
    price: 450,
    images: ['https://images.unsplash.com/photo-1544441893-675973e31985?w=800'],
    location: 'Lusaka, Zambia',
    createdAt: hoursAgo(8),
    isBoosted: false,
    views: 120,
    contactMethod: { inAppChat: true, whatsapp: '+260970000000' }
  },
  {
    id: 'l3',
    ownerId: 'u4',
    ownerName: 'Musa Repairs',
    type: ListingType.SERVICES,
    category: 'Skills & Trades',
    title: 'Certified Electrician & Solar Installer',
    shortDescription: 'Quick & reliable mesh tech 🛠️',
    description: 'Solar panel installation and general electrical maintenance. Quick and reliable mesh technician.',
    price: 1500,
    images: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800'],
    location: 'Kitwe, Zambia',
    createdAt: hoursAgo(24),
    isBoosted: false,
    views: 89,
    contactMethod: { inAppChat: true, whatsapp: '+260960000000' }
  }
];

export const MOCK_CHATS: ChatSession[] = [
  {
    id: 'c1',
    partnerId: 'u2',
    partnerName: 'Zambia Tech Hub',
    partnerPhoto: 'https://ui-avatars.com/api/?name=Zambia+Tech&background=020617&color=fff&bold=true',
    lastMessage: 'Is the inverter available for collection today?',
    lastTimestamp: '10:45 AM'
  }
];

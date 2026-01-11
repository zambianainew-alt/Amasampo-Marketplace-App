
import { Listing, ChatSession, Transaction, User, Clip, Story, Handshake, SyncStatus } from '../types';

const DB_NAME = 'AmasampoDB_v14'; 
const DB_VERSION = 14;
const STORES = {
  LISTINGS: 'listings',
  CHATS: 'chats',
  MESSAGES: 'messages',
  USER_DATA: 'user_data',
  TRANSACTIONS: 'transactions',
  WALLET: 'wallet',
  FAVORITES: 'favorites',
  METADATA: 'metadata',
  CLIPS: 'clips',
  STORIES: 'stories',
  FOLLOWS: 'follows',
  HANDSHAKES: 'handshakes',
  SYNC_QUEUE: 'sync_queue'
};

const SYNC_CHANNEL = new BroadcastChannel('amasampo_sync_mesh');

export class StorageService {
  private db: IDBDatabase | null = null;
  private listeners: Set<() => void> = new Set();
  private isSyncing: boolean = false;

  constructor() {
    SYNC_CHANNEL.onmessage = (e) => {
      if (e.data.source !== window.name) {
        this.notifyListeners();
      }
    };
    // Aggressive sync check for mobile reliability
    setInterval(() => this.processSyncQueue(), 15000);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  broadcast(type: string, payload?: any) {
    SYNC_CHANNEL.postMessage({ type, payload, timestamp: Date.now(), source: window.name });
    this.notifyListeners();
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        Object.values(STORES).forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            const keyPath = (store === 'wallet' || store === 'user_data') ? 'userId' : 'id';
            db.createObjectStore(store, { keyPath });
          }
        });
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- PERSISTENCE ENGINE ---
  
  private async addToSyncQueue(store: string, data: any, action: 'PUT' | 'DELETE') {
    const db = await this.getDB();
    const syncItem = {
      id: `sync_${Date.now()}_${Math.random()}`,
      store,
      data: JSON.parse(JSON.stringify(data)), // Clone to avoid IDB structured clone issues
      action,
      timestamp: Date.now()
    };
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    await new Promise((res) => {
      tx.objectStore(STORES.SYNC_QUEUE).put(syncItem);
      tx.oncomplete = res;
    });
    this.processSyncQueue();
  }

  async processSyncQueue() {
    if (this.isSyncing) return;
    const db = await this.getDB();
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const req = store.getAll();

    req.onsuccess = async () => {
      const items = req.result;
      if (items.length === 0) return;

      this.isSyncing = true;
      this.broadcast('MESH_SYNC_START');
      
      console.log(`[CLOUD PERSISTENCE] Syncing ${items.length} records...`);
      
      for (const item of items) {
        // Simulation of actual API post to a centralized node
        await new Promise(r => setTimeout(r, 400));
        
        // Finalize local state
        const updateTx = db.transaction(item.store, 'readwrite');
        const targetStore = updateTx.objectStore(item.store);
        const recordReq = targetStore.get(item.data.id || item.data.userId);
        
        await new Promise((res) => {
          recordReq.onsuccess = () => {
            if (recordReq.result) {
              recordReq.result.syncStatus = 'SYNCED';
              targetStore.put(recordReq.result);
            }
            res(null);
          };
        });

        // Remove from queue
        const deleteTx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        deleteTx.objectStore(STORES.SYNC_QUEUE).delete(item.id);
      }
      
      this.isSyncing = false;
      this.broadcast('MESH_SYNC_COMPLETE');
    };
  }

  // --- CORE STORE WRAPPERS ---

  async saveHandshake(hs: Handshake): Promise<void> {
    const db = await this.getDB();
    const data = { ...hs, syncStatus: 'PENDING' as SyncStatus };
    const tx = db.transaction(STORES.HANDSHAKES, 'readwrite');
    tx.objectStore(STORES.HANDSHAKES).put(data);
    await this.addToSyncQueue(STORES.HANDSHAKES, data, 'PUT');
    this.broadcast('HANDSHAKE_UPDATED');
  }

  async getHandshakeByChat(chatId: string): Promise<Handshake | null> {
    const db = await this.getDB();
    const req = db.transaction(STORES.HANDSHAKES, 'readonly').objectStore(STORES.HANDSHAKES).getAll();
    return new Promise(r => req.onsuccess = () => {
      const found = (req.result || []).find((h: Handshake) => h.chatId === chatId);
      r(found || null);
    });
  }

  async saveListing(listing: Listing): Promise<void> {
    const db = await this.getDB();
    const clean = { 
      ...listing, 
      createdAt: listing.createdAt || new Date().toISOString(),
      syncStatus: 'PENDING' as SyncStatus
    };
    const tx = db.transaction(STORES.LISTINGS, 'readwrite');
    tx.objectStore(STORES.LISTINGS).put(clean);
    await this.addToSyncQueue(STORES.LISTINGS, clean, 'PUT');
    this.broadcast('LISTING_UPDATED');
  }

  async getAllListings(): Promise<Listing[]> {
    const db = await this.getDB();
    const req = db.transaction(STORES.LISTINGS, 'readonly').objectStore(STORES.LISTINGS).getAll();
    return new Promise(r => req.onsuccess = () => {
      const results = (req.result || []) as Listing[];
      r(results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    });
  }

  async getListingById(id: string): Promise<Listing | null> {
    const db = await this.getDB();
    const req = db.transaction(STORES.LISTINGS, 'readonly').objectStore(STORES.LISTINGS).get(id);
    return new Promise(r => req.onsuccess = () => r(req.result || null));
  }

  async saveClip(clip: Clip): Promise<void> {
    const db = await this.getDB();
    const clean = { ...clip, syncStatus: 'PENDING' as SyncStatus };
    const tx = db.transaction(STORES.CLIPS, 'readwrite');
    tx.objectStore(STORES.CLIPS).put(clean);
    await this.addToSyncQueue(STORES.CLIPS, clean, 'PUT');
    this.broadcast('CLIP_NEW');
  }

  async getAllClips(): Promise<Clip[]> {
    const db = await this.getDB();
    const req = db.transaction(STORES.CLIPS, 'readonly').objectStore(STORES.CLIPS).getAll();
    return new Promise(r => req.onsuccess = () => r(req.result || []));
  }

  async saveStory(story: Story): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(STORES.STORIES, 'readwrite');
    tx.objectStore(STORES.STORIES).put(story);
    this.broadcast('STORY_NEW');
  }

  async getStories(): Promise<Story[]> {
    const db = await this.getDB();
    const req = db.transaction(STORES.STORIES, 'readonly').objectStore(STORES.STORIES).getAll();
    return new Promise(r => req.onsuccess = () => r(req.result || []));
  }

  async toggleFollow(targetId: string): Promise<boolean> {
    const db = await this.getDB();
    const tx = db.transaction(STORES.FOLLOWS, 'readwrite');
    const store = tx.objectStore(STORES.FOLLOWS);
    const existing = await new Promise(r => {
      const req = store.get(targetId);
      req.onsuccess = () => r(req.result);
    });

    if (existing) {
      store.delete(targetId);
      this.broadcast('FOLLOW_UPDATED');
      return false;
    } else {
      store.put({ id: targetId, timestamp: Date.now() });
      this.broadcast('FOLLOW_UPDATED');
      return true;
    }
  }

  async getFollows(): Promise<string[]> {
    const db = await this.getDB();
    const req = db.transaction(STORES.FOLLOWS, 'readonly').objectStore(STORES.FOLLOWS).getAll();
    return new Promise(r => req.onsuccess = () => r((req.result || []).map((f: any) => f.id)));
  }

  async toggleFavorite(listing: Listing): Promise<boolean> {
    const db = await this.getDB();
    const tx = db.transaction(STORES.FAVORITES, 'readwrite');
    const store = tx.objectStore(STORES.FAVORITES);
    const existing = await new Promise(r => {
      const req = store.get(listing.id);
      req.onsuccess = () => r(req.result);
    });

    if (existing) {
      store.delete(listing.id);
      this.broadcast('FAV_UPDATED');
      return false;
    } else {
      store.put(listing);
      this.broadcast('FAV_UPDATED');
      return true;
    }
  }

  async getFavorites(): Promise<Listing[]> {
    const db = await this.getDB();
    const req = db.transaction(STORES.FAVORITES, 'readonly').objectStore(STORES.FAVORITES).getAll();
    return new Promise(r => req.onsuccess = () => r(req.result || []));
  }

  async getBalance(userId: string): Promise<number> {
    const db = await this.getDB();
    const req = db.transaction(STORES.WALLET, 'readonly').objectStore(STORES.WALLET).get(userId);
    return new Promise(r => req.onsuccess = () => r(req.result?.balance || 0));
  }

  async updateBalance(userId: string, newBalance: number): Promise<void> {
    const db = await this.getDB();
    const data = { userId, balance: newBalance, lastUpdated: Date.now(), syncStatus: 'PENDING' as SyncStatus };
    const tx = db.transaction(STORES.WALLET, 'readwrite');
    tx.objectStore(STORES.WALLET).put(data);
    await this.addToSyncQueue(STORES.WALLET, data, 'PUT');
    this.broadcast('WALLET_UPDATED');
  }

  async saveTransaction(txData: Transaction): Promise<void> {
    const db = await this.getDB();
    const data = { ...txData, syncStatus: 'PENDING' as SyncStatus };
    const tx = db.transaction(STORES.TRANSACTIONS, 'readwrite');
    tx.objectStore(STORES.TRANSACTIONS).put(data);
    await this.addToSyncQueue(STORES.TRANSACTIONS, data, 'PUT');
    this.broadcast('TX_NEW');
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    const db = await this.getDB();
    const req = db.transaction(STORES.TRANSACTIONS, 'readonly').objectStore(STORES.TRANSACTIONS).getAll();
    return new Promise(r => req.onsuccess = () => {
      const list = (req.result || []).filter((t: any) => t.userId === userId);
      r(list.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp)));
    });
  }

  async saveChatSession(session: ChatSession): Promise<void> {
    const db = await this.getDB();
    const data = { ...session, syncStatus: 'PENDING' as SyncStatus };
    const tx = db.transaction(STORES.CHATS, 'readwrite');
    tx.objectStore(STORES.CHATS).put(data);
    await this.addToSyncQueue(STORES.CHATS, data, 'PUT');
    this.broadcast('CHAT_NEW');
  }

  async getAllChatSessions(): Promise<ChatSession[]> {
    const db = await this.getDB();
    const req = db.transaction(STORES.CHATS, 'readonly').objectStore(STORES.CHATS).getAll();
    return new Promise(r => req.onsuccess = () => r(req.result || []));
  }

  async getChatSession(id: string): Promise<ChatSession | null> {
    const db = await this.getDB();
    const req = db.transaction(STORES.CHATS, 'readonly').objectStore(STORES.CHATS).get(id);
    return new Promise(r => req.onsuccess = () => r(req.result || null));
  }

  async saveMessage(chatId: string, message: any): Promise<void> {
    const db = await this.getDB();
    const securedMsg = { ...message, id: message.id || `msg_${Date.now()}`, chatId };
    const tx = db.transaction(STORES.MESSAGES, 'readwrite');
    tx.objectStore(STORES.MESSAGES).put(securedMsg);
    this.broadcast('MSG_NEW');
  }

  async getMessages(chatId: string): Promise<any[]> {
    const db = await this.getDB();
    const req = db.transaction(STORES.MESSAGES, 'readonly').objectStore(STORES.MESSAGES).getAll();
    return new Promise(r => req.onsuccess = () => {
      const msgs = (req.result || []).filter((m: any) => m.chatId === chatId);
      r(msgs.sort((a: any, b: any) => a.id.localeCompare(b.id)));
    });
  }

  async setMetadata(key: string, value: any): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(STORES.METADATA, 'readwrite');
    tx.objectStore(STORES.METADATA).put({ id: key, value });
    this.broadcast('METADATA_UPDATED');
  }

  async getMetadata(key: string): Promise<any> {
    const db = await this.getDB();
    const req = db.transaction(STORES.METADATA, 'readonly').objectStore(STORES.METADATA).get(key);
    return new Promise(r => req.onsuccess = () => r(req.result?.value || null));
  }

  async incrementViews(id: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(STORES.LISTINGS, 'readwrite');
    const store = tx.objectStore(STORES.LISTINGS);
    const req = store.get(id);
    req.onsuccess = () => {
      const data = req.result;
      if (data) {
        data.views = (data.views || 0) + 1;
        store.put(data);
      }
    };
  }
}

export const storage = new StorageService();

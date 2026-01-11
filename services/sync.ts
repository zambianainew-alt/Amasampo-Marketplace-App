
import { storage } from './storage';
import { notifications } from './notification';
import { GoogleGenAI, Type } from "@google/genai";
import { ListingType } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CITIES = ['Lusaka', 'Kitwe', 'Ndola', 'Livingstone', 'Chipata', 'Kabwe', 'Solwezi', 'Mansah'];
const VENDOR_PREFIXES = ['Mama', 'Bana', 'Ba', 'Smart', 'Quick', 'Trust', 'Zambian'];
const VENDOR_NAMES = ['Sarah', 'Chileshe', 'Mwape', 'Lindi', 'Bwalya', 'Mutale', 'Junior'];

export class SyncService {
  private syncInterval: number | null = null;
  private heartbeatInterval: number | null = null;
  private nodeCount: number = 142;

  getCurrentState() {
    return {
      status: 'CONNECTED',
      nodes: this.nodeCount,
      strength: 98,
      region: 'Zambia Central'
    };
  }

  startMeshSync() {
    if (this.syncInterval) return;

    this.scheduleNextDiscovery();
    
    storage.broadcast('MESH_HEARTBEAT', this.getCurrentState());

    this.heartbeatInterval = window.setInterval(() => {
      const drift = Math.floor(Math.random() * 5) - 2;
      this.nodeCount = Math.max(120, this.nodeCount + drift);
      
      const isOnline = Math.random() > 0.03;
      storage.broadcast('MESH_HEARTBEAT', { 
        status: isOnline ? 'CONNECTED' : 'RECONNECTING',
        nodes: this.nodeCount,
        strength: isOnline ? (85 + Math.floor(Math.random() * 15)) : 0,
        region: 'Zambia Central'
      });
    }, 5000);
  }

  private scheduleNextDiscovery() {
    const delay = Math.floor(Math.random() * 45000) + 45000;
    this.syncInterval = window.setTimeout(async () => {
      await this.discoverNewHustle();
      this.scheduleNextDiscovery();
    }, delay);
  }

  stopMeshSync() {
    if (this.syncInterval) clearTimeout(this.syncInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.syncInterval = null;
    this.heartbeatInterval = null;
  }

  private async discoverNewHustle() {
    const city = CITIES[Math.floor(Math.random() * CITIES.length)];
    const vendor = `${VENDOR_PREFIXES[Math.floor(Math.random() * VENDOR_PREFIXES.length)]} ${VENDOR_NAMES[Math.floor(Math.random() * VENDOR_NAMES.length)]}`;
    const type = Object.values(ListingType)[Math.floor(Math.random() * 5)] as ListingType;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a single marketplace listing for a person in ${city}, Zambia named ${vendor}. 
                   The type is ${type}. 
                   Return JSON with: 
                   - title (short, punchy)
                   - shortDescription (a 5-word catchy tagline with an emoji)
                   - description (1 sentence, local vibe)
                   - price (in Zambian Kwacha, reasonable).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              shortDescription: { type: Type.STRING },
              description: { type: Type.STRING },
              price: { type: Type.NUMBER }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      
      const discovery = {
        id: `mesh_${Math.random().toString(36).substr(2, 9)}`,
        ownerId: `u_${Math.random().toString(36).substr(2, 9)}`,
        ownerName: vendor,
        type,
        category: 'Mesh Discovery',
        title: data.title || 'Discovered Hustle',
        shortDescription: data.shortDescription || 'New on the mesh 📡',
        description: data.description || 'Verified on the Amasampo digital mesh.',
        price: data.price || 100,
        images: [`https://picsum.photos/600/600?random=${Math.random()}`],
        location: `${city}, Zambia`,
        timestamp: 'Just Discovered',
        isBoosted: Math.random() > 0.85,
        views: Math.floor(Math.random() * 50),
        contactMethod: { inAppChat: true, whatsapp: '+260970000000' },
        isMeshDiscovery: true
      };

      await storage.saveListing(discovery as any);
      
      // Native Push Trigger
      notifications.notify(
        `📡 Mesh Discovery: ${data.title}`,
        `${vendor} in ${city} just deployed a new hustle node.`,
        discovery.images[0]
      );

      storage.broadcast('GLOBAL_ALERT', {
        message: `${vendor} in ${city} just posted: ${data.title}`,
        type: 'DISCOVERY'
      });

    } catch (e) {
      console.warn('Mesh Discovery generated an error (likely rate limit), skipping turn.');
    }
  }
}

export const syncMesh = new SyncService();

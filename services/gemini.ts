
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const safeParseJSON = (text: string, fallback: any) => {
  try {
    const jsonMatch = text.match(/```(?:json)?([\s\S]*?)```/);
    const cleanText = jsonMatch ? jsonMatch[1].trim() : text.trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Gemini JSON Parse Error:", e, "Raw Text:", text);
    return fallback;
  }
};

export const getIntelligentSearch = async (query: string, listings: any[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `CONTEXT: AMASAMPO is a Zambian hustle marketplace.
                 QUERY: "${query}"
                 LISTINGS: ${JSON.stringify(listings.slice(0, 40))}
                 TASK: Find the best matches based on intent, category, and local relevance. Return only a JSON array of IDs.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return safeParseJSON(response.text || "[]", listings.slice(0, 5).map(l => l.id));
  } catch (error) {
    return listings.slice(0, 10).map(l => l.id);
  }
};

export const getMarketInsight = async (hustleTitle: string, localPrice: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Compare the local price of "${hustleTitle}" which is "${localPrice}" to current market trends in Southern Africa. Use web search to verify if this is a competitive deal for the Lusaka/Zambian market.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return {
      analysis: response.text,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (e) {
    return { analysis: "Market mesh synchronization offline.", sources: [] };
  }
};

export const generateVeoVibe = async (prompt: string, imageBase64: string) => {
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `A dynamic, high-energy cinematic promo for ${prompt}. Professional marketing aesthetic, studio lighting, smooth camera movement.`,
    image: {
      imageBytes: imageBase64.split(',')[1],
      mimeType: 'image/png',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '9:16'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const getAssistantResponse = async (userMessage: string, context: any, dialect: string = 'ENGLISH') => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are the Amasampo Mesh Guide. Use local Zambian flair.
                 User Message: "${userMessage}"
                 Dialect Requested: ${dialect}.
                 Platform Context: ${JSON.stringify(context)}
                 Help the user find products, manage their wallet, or navigate the marketplace.
                 Return JSON with "text" and "action" (e.g., NAVIGATE_EXPLORE, NAVIGATE_WALLET).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            action: { type: Type.STRING, nullable: true }
          }
        }
      }
    });
    return safeParseJSON(response.text || "", { text: "I'm ready to help you hustle!", action: null });
  } catch (e) {
    return { text: "Mesh signal weak. Try again shortly.", action: null };
  }
};

export const getNearbyHustlesOnMap = async (query: string, lat: number, lng: number) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find businesses relating to "${query}" near coordinates ${lat}, ${lng}. Highlight verified nodes first.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } }
      },
    });
    return {
      text: response.text,
      places: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (e) { return { text: "Map discovery node offline.", places: [] }; }
};

export const generateListingImage = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `High-quality commercial product photograph of ${prompt}, clean white studio background, professional lighting, 4k.` }] },
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (e) { return null; }
};

export const getSellerResponse = async (history: any[], sellerName: string, listingTitle: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history,
      config: {
        systemInstruction: `You are ${sellerName} on Amasampo selling ${listingTitle}. You are a savvy Zambian entrepreneur. Be friendly, use local slang occasionally (e.g. 'mwebantu', 'sharp sharp'), and try to close a deal.`
      }
    });
    return response.text || "I'm ready for a handshake!";
  } catch (e) { return "Let's talk business!"; }
};

export const moderateListing = async (title: string, description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Evaluate the following marketplace post for safety, legality, and policy compliance.
                 Title: ${title}
                 Description: ${description}
                 Return JSON with "safe" (boolean) and "reason" (string).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { safe: { type: Type.BOOLEAN }, reason: { type: Type.STRING } }
        }
      }
    });
    return safeParseJSON(response.text || "", { safe: true, reason: "" });
  } catch (e) { return { safe: true, reason: "" }; }
};

export const generateWhatsAppOutreach = async (listing: any, userName: string, tone: string = 'POLITE'): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a short, conversion-focused WhatsApp message from ${userName} to a seller for the item: "${listing.title}". Tone: ${tone}. Include a polite Zambian greeting like 'Muli bwanji'.`,
    });
    return response.text?.trim() || `Hi, I saw your hustle for ${listing.title} on Amasampo!`;
  } catch (e) { return `Hi, is ${listing.title} still available?`; }
};

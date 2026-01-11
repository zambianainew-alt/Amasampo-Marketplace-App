
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_LISTINGS, formatPrice } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { generateWhatsAppOutreach, getMarketInsight } from '../services/gemini';
import { storage } from '../services/storage';
import { Listing, ChatSession } from '../types';
import { formatRelativeTime } from '../utils/format';
import { GoogleGenAI, Modality } from '@google/genai';

// Live API Helpers
const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
};

const encodePCM = (data: Float32Array): string => {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const ListingDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currency, user, isAuthenticated } = useAuth();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSellerVerified, setIsSellerVerified] = useState(false);
  const [showWAPreview, setShowWAPreview] = useState(false);
  const [showLiveNegotiate, setShowLiveNegotiate] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [marketAnalysis, setMarketAnalysis] = useState<string | null>(null);
  
  // Live State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const [selectedTone, setSelectedTone] = useState<'POLITE' | 'BARGAIN' | 'EXPRESS'>('POLITE');
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [isGeneratingWA, setIsGeneratingWA] = useState(false);

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = { light: [30], medium: [60], heavy: [100] };
      navigator.vibrate(patterns[style]);
    }
  };

  const loadListing = async () => {
    if (!id) return;
    const custom = await storage.getListingById(id);
    let currentListing: Listing | null = custom || MOCK_LISTINGS.find(l => l.id === id) || null;
    if (!currentListing) { navigate('/'); return; }
    
    setListing(currentListing);
    storage.incrementViews(id);
    
    const verified = await storage.getMetadata(`wa_verified_${currentListing.ownerId}`);
    setIsSellerVerified(!!verified);

    const follows = await storage.getFollows();
    setIsFollowing(follows.includes(currentListing.ownerId));

    getMarketInsight(currentListing.title, formatPrice(currentListing.price, currency)).then(res => {
      setMarketAnalysis(res.analysis);
    });

    setLoading(false);
  };

  useEffect(() => { loadListing(); return storage.subscribe(loadListing); }, [id]);

  useEffect(() => {
    if (showWAPreview && listing) handleRegenerateWA(selectedTone);
  }, [showWAPreview, selectedTone]);

  const handleToggleFollow = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!listing) return;
    const result = await storage.toggleFollow(listing.ownerId);
    setIsFollowing(result);
    triggerHaptic('medium');
    storage.broadcast('GLOBAL_ALERT', { 
      message: result ? `Linked with ${listing.ownerName}'s node.` : `Unlinked from ${listing.ownerName}.`, 
      type: 'SUCCESS' 
    });
  };

  const handleRegenerateWA = async (tone: 'POLITE' | 'BARGAIN' | 'EXPRESS') => {
    if (!listing) return;
    setIsGeneratingWA(true);
    const msg = await generateWhatsAppOutreach(listing, user?.name || "a buyer", tone);
    setGeneratedMsg(msg);
    setIsGeneratingWA(false);
  };

  const startLiveBargain = async () => {
    if (!(window as any).aistudio?.hasSelectedApiKey || !(await (window as any).aistudio.hasSelectedApiKey())) {
      await (window as any).aistudio.openSelectKey();
    }

    setIsLiveActive(true);
    setLiveTranscript('Syncing Mesh Voice Stream...');
    triggerHaptic('heavy');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      if (outCtx.state === 'suspended') await outCtx.resume();
      if (inCtx.state === 'suspended') await inCtx.resume();
      
      audioContextRef.current = outCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: `You are the AI Bargaining Assistant for ${listing?.ownerName}. 
                              You are selling ${listing?.title} for ${listing?.price} ${currency}. 
                              Be savvy and use local Zambian flair. 
                              Negotiate fairly but don't drop the price more than 15%. If a deal is reached, say 'HANDSHAKE CONFIRMED'.`,
        },
        callbacks: {
          onopen: () => {
            setLiveTranscript('Node Active. Speak Now.');
            const source = inCtx.createMediaStreamSource(stream);
            const processor = inCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const input = e.inputBuffer.getChannelData(0);
              const sum = input.reduce((a, b) => a + Math.abs(b), 0);
              setAudioLevel(sum / input.length);
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encodePCM(input), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(processor);
            processor.connect(inCtx.destination);
          },
          onmessage: async (msg) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const data = decodeBase64(audioData);
              const buffer = await decodeAudioData(data, outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsLiveActive(false),
          onerror: (e) => { console.error(e); setIsLiveActive(false); }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      console.error(e);
      setIsLiveActive(false);
      storage.broadcast('GLOBAL_ALERT', { message: 'Voice Node Timeout.', type: 'ERROR' });
    }
  };

  const stopLiveBargain = () => {
    if (sessionRef.current) sessionRef.current.close();
    setIsLiveActive(false);
    setShowLiveNegotiate(false);
    triggerHaptic('light');
  };

  if (loading || !listing) return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <div className="w-12 h-12 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="bg-[#020617] min-h-screen relative text-slate-100">
      <div className="relative h-[50vh]">
        <div className="absolute top-8 left-6 right-6 z-20 flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="w-14 h-14 flex items-center justify-center glass rounded-[1.8rem] text-white shadow-2xl active:scale-90 transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setShowLiveNegotiate(true)} className="glass px-6 py-3 rounded-2xl flex items-center gap-3 border border-emerald-500/30 shadow-xl">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live Negotiator</span>
            </button>
          </div>
        </div>
        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
      </div>

      <div className="px-6 py-12 space-y-10 -mt-20 bg-[#020617] rounded-t-[4rem] relative shadow-[0_-30px_60px_rgba(0,0,0,0.5)] pb-48">
        <div className="flex flex-col gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-emerald-500/20">{listing.category}</span>
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest bg-slate-900 px-3 py-1.5 rounded-full border border-white/5 shadow-sm">📍 {listing.location}</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-5xl font-[900] text-white tracking-tighter leading-tight">{listing.title}</h1>
              {listing.shortDescription && <p className="text-lg font-bold text-emerald-500 tracking-tight italic opacity-90">{listing.shortDescription}</p>}
            </div>
          </div>
          
          <div className="bento-card p-10 flex items-center justify-between border-white/5 bg-slate-900/50">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Mesh Quote</p>
              <p className="text-5xl font-[900] text-emerald-400 tracking-tighter">{formatPrice(listing.price, currency)}</p>
            </div>
            <div className="w-16 h-16 bg-emerald-600 rounded-[2rem] flex items-center justify-center text-white text-3xl shadow-[0_0_20px_rgba(16,185,129,0.4)]">💰</div>
          </div>
        </div>

        {marketAnalysis && (
          <div className="bento-card p-8 bg-emerald-500/5 border-emerald-500/20 shadow-sm animate-in fade-in">
             <div className="flex items-center gap-2 mb-4">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_#10b981]"></div>
               <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Market Intelligence Sync</p>
             </div>
             <p className="text-sm font-bold text-slate-300 leading-relaxed italic">"{marketAnalysis}"</p>
          </div>
        )}

        <section className="space-y-5">
          <p className="text-[11px] font-[900] text-slate-600 uppercase tracking-[0.2em] ml-2">Node Merchant</p>
          <div onClick={() => navigate(`/shop/${listing.ownerId}`)} className="bento-card p-8 bg-slate-900 hover:bg-slate-800 group transition-all duration-500 cursor-pointer flex items-center gap-6 border-white/5 shadow-xl active:scale-95">
            <div className="relative">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(listing.ownerName)}&background=10b981&color=fff&bold=true`} className="w-20 h-20 rounded-3xl border-4 border-slate-950 shadow-md group-hover:border-emerald-500/30 transition-all" alt="" />
              {isSellerVerified && <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-slate-900 flex items-center justify-center text-xs shadow-lg">✅</div>}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">{listing.ownerName}</h3>
                <button onClick={(e) => { e.stopPropagation(); handleToggleFollow(); }} className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${isFollowing ? 'bg-emerald-600 text-white' : 'border border-white/10 text-slate-500 group-hover:text-white'}`}>{isFollowing ? 'Following' : 'Follow'}</button>
              </div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Scan merchant node →</p>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <p className="text-[11px] font-[900] text-slate-600 uppercase tracking-[0.2em] ml-2">Hustle Specs</p>
          <div className="bento-card p-10 bg-slate-900/50 border-white/5"><p className="text-slate-400 leading-relaxed font-semibold text-xl">{listing.description}</p></div>
        </section>

        <div className="fixed bottom-12 left-8 right-8 grid grid-cols-2 gap-5 z-40 max-w-lg mx-auto">
          <button onClick={() => navigate(`/chats`)} className="flex flex-col items-center justify-center gap-1 py-7 bg-slate-950 text-white rounded-[2.8rem] shadow-2xl active:scale-95 transition-all border border-white/5">
             <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Deal Mesh</span>
          </button>
          <button onClick={() => setShowWAPreview(true)} className="flex flex-col items-center justify-center gap-1 py-7 bg-emerald-600 text-white rounded-[2.8rem] shadow-[0_15px_30px_rgba(16,185,129,0.3)] active:scale-95 transition-all">
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.03a11.934 11.934 0 001.576 5.961L0 24l6.135-1.61a11.871 11.871 0 005.915 1.592h.005c6.637 0 12.032-5.396 12.035-12.032.003-3.218-1.248-6.242-3.522-8.514z" /></svg>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">WhatsApp</span>
          </button>
        </div>
      </div>

      {showLiveNegotiate && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center p-6 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 rounded-[3.5rem] p-12 shadow-3xl space-y-8 border border-white/10 animate-in slide-in-from-bottom-20">
            <header className="flex justify-between items-center text-center">
              <div className="w-full">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-4">Live Mesh Voice Link</p>
                <h2 className="text-4xl font-[900] text-white tracking-tighter uppercase leading-none">Hustle Haggle</h2>
              </div>
            </header>
            <div className="relative aspect-square rounded-full bg-slate-950 flex flex-col items-center justify-center p-12 border-4 border-emerald-500/10 overflow-hidden">
               <div className="absolute inset-0 bg-emerald-500/10 transition-all duration-75" style={{ opacity: audioLevel * 5 }}></div>
               {isLiveActive ? (
                 <div className="flex gap-1.5 h-32 items-center">
                   {[...Array(12)].map((_, i) => (
                     <div key={i} className="w-2 bg-emerald-500 rounded-full transition-all duration-75 shadow-[0_0_10px_#10b981]" style={{ height: `${20 + (audioLevel * 100 * (i % 3 + 1))}px` }}></div>
                   ))}
                 </div>
               ) : (
                 <div className="text-8xl animate-bounce drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">🎙️</div>
               )}
            </div>
            <p className="text-sm font-bold text-slate-400 text-center px-4 leading-relaxed">
              {isLiveActive ? liveTranscript : "Connect your voice node to haggle directly with the merchant's agent."}
            </p>
            <div className="flex gap-4 pt-4">
              <button onClick={stopLiveBargain} className="flex-1 py-6 bg-slate-800 text-slate-500 font-black rounded-[2rem] uppercase tracking-widest text-[10px]">Close Node</button>
              {!isLiveActive && <button onClick={startLiveBargain} className="flex-1 py-6 bg-emerald-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/30">Connect Now</button>}
            </div>
          </div>
        </div>
      )}

      {showWAPreview && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 rounded-[3.5rem] p-12 shadow-3xl space-y-10 border border-white/10 animate-in slide-in-from-bottom-20">
            <header className="flex justify-between items-center">
              <div><h2 className="text-4xl font-[900] text-white tracking-tighter uppercase leading-none">AI Outreach</h2></div>
              <button onClick={() => setShowWAPreview(false)} className="p-4 bg-slate-800 rounded-[1.6rem] shadow-sm"><svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </header>
            <div className="flex p-2 bg-slate-800 rounded-[2rem]">
              {(['POLITE', 'BARGAIN', 'EXPRESS'] as const).map(tone => (
                <button key={tone} onClick={() => setSelectedTone(tone)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-[1.4rem] transition-all ${selectedTone === tone ? 'bg-slate-950 text-emerald-400 shadow-xl scale-105' : 'text-slate-500'}`}>{tone}</button>
              ))}
            </div>
            <div className="relative p-10 bg-slate-950 rounded-[3rem] border border-white/5 shadow-inner min-h-[180px] flex items-center justify-center">
               {isGeneratingWA ? <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div> : <p className="text-xl font-bold text-emerald-400 italic leading-relaxed text-center">"{generatedMsg}"</p>}
            </div>
            <button onClick={() => {
              const waNumber = listing.contactMethod.whatsapp.replace('+', '').replace(/\s/g, '');
              window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(generatedMsg)}`, '_blank');
              setShowWAPreview(false);
            }} className="w-full py-8 bg-emerald-600 text-white font-black rounded-[2.5rem] shadow-2xl text-xs uppercase tracking-[0.3em] active:scale-[0.98]">Deploy WhatsApp Outreach</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingDetail;

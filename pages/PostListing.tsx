
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListingType } from '../types';
import { moderateListing, generateListingImage, generateVeoVibe } from '../services/gemini';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';

const PostListing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '', 
    shortDescription: '',
    description: '', 
    price: '', 
    type: ListingType.BUY_SELL, 
    category: 'Electronics', 
    location: 'Lusaka, Zambia', 
    whatsapp: ''
  });

  const [image, setImage] = useState<string | null>(null);
  const [vibeVideo, setVibeVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingVibe, setGeneratingVibe] = useState(false);
  const [waVerified, setWaVerified] = useState(false);
  const [error, setError] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    else {
      storage.getMetadata(`wa_verified_${user?.id}`).then(val => { if (val) setWaVerified(true); });
      setFormData(prev => ({ ...prev, whatsapp: user?.phone || '' }));
    }
  }, [isAuthenticated, navigate, user]);

  const handleDetectLocation = () => {
    setIsDetectingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({ ...prev, location: `Node (${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)})` }));
          setIsDetectingLocation(false);
          storage.broadcast('GLOBAL_ALERT', { message: 'Location synced!', type: 'SUCCESS' });
        },
        () => { setError("Access denied."); setIsDetectingLocation(false); }
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async () => {
    if (!formData.title) { setError("Title needed."); return; }
    setGeneratingImage(true);
    const aiImage = await generateListingImage(`${formData.title}`);
    if (aiImage) setImage(aiImage);
    else setError("Generation failed.");
    setGeneratingImage(false);
  };

  const handleGenerateVibe = async () => {
    if (!image || !formData.title) { setError("Title and image needed for vibe."); return; }
    
    if (!(window as any).aistudio?.hasSelectedApiKey || !(await (window as any).aistudio.hasSelectedApiKey())) {
      await (window as any).aistudio.openSelectKey();
    }

    setGeneratingVibe(true);
    try {
      const videoUrl = await generateVeoVibe(formData.title, image);
      setVibeVideo(videoUrl);
      storage.broadcast('GLOBAL_ALERT', { message: 'Veo Cinematic Protocol active!', type: 'SUCCESS' });
    } catch (e) { 
      setError("Vibe failed. Node rejected deployment."); 
      console.error(e);
    }
    setGeneratingVibe(false);
  };

  const handlePost = async () => {
    if (!formData.title || !formData.description || !formData.price) { setError('Data missing.'); return; }
    if (!waVerified) { setError('Verify WhatsApp in Vault.'); return; }
    setLoading(true);
    const moderation = await moderateListing(formData.title, formData.description);
    if (!moderation.safe) { setError(moderation.reason); setLoading(false); return; }

    const id = `l_${Math.random().toString(36).substr(2, 9)}`;
    const newListing = {
      id, 
      ownerId: user?.id || 'anon', 
      ownerName: user?.name || 'Seller',
      type: formData.type, 
      category: formData.category, 
      title: formData.title, 
      shortDescription: formData.shortDescription,
      description: formData.description,
      price: parseFloat(formData.price) || 0, 
      images: [image || ''], 
      location: formData.location, 
      createdAt: new Date().toISOString(),
      isBoosted: false, 
      views: 0, 
      contactMethod: { inAppChat: true, whatsapp: formData.whatsapp }
    };

    if (vibeVideo) {
      await storage.saveClip({
        id: `clip_${id}`, ownerId: user!.id, ownerName: user!.name, ownerPhoto: user!.photoUrl,
        videoUrl: vibeVideo, caption: formData.description, listingId: id, likes: 0, views: 0, createdAt: new Date().toISOString()
      });
    }

    await storage.saveListing(newListing);
    navigate('/');
  };

  const inputClasses = "w-full px-8 py-6 bg-slate-900 border border-white/5 rounded-[2.5rem] outline-none font-bold text-white focus:ring-4 ring-emerald-500/10 transition-all placeholder:text-slate-700";
  const labelClasses = "text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4 mb-2 block";

  return (
    <div className="px-6 py-8 space-y-8 max-w-2xl mx-auto pb-32 bg-[#020617]">
      <header>
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-1">Marketplace Node Deployment</p>
        <h1 className="text-4xl font-[900] text-white tracking-tighter uppercase">Launch Hustle</h1>
      </header>

      <div className="space-y-10">
        <section className="space-y-4">
           <label className={labelClasses}>Identity & Visuals</label>
           <div className={`aspect-video rounded-[3.5rem] border-4 border-dashed flex items-center justify-center transition-all overflow-hidden bg-slate-900 shadow-inner ${image ? 'border-emerald-500' : 'border-slate-800'}`}>
              {image ? <img src={image} className="w-full h-full object-cover" alt="Preview" /> : <p className="text-[10px] font-black uppercase text-slate-700">Capture your asset</p>}
           </div>
           
           <div className="flex gap-3">
              <button onClick={handleGenerateImage} disabled={generatingImage} className="flex-1 py-5 bg-emerald-600 text-white font-black rounded-3xl text-[9px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                {generatingImage ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '🪄 Dream AI'}
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-5 bg-slate-800 text-white font-black rounded-3xl text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">📸 Lens</button>
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
           </div>

           {image && (
             <button onClick={handleGenerateVibe} disabled={generatingVibe} className={`w-full py-6 rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] border-2 transition-all flex items-center justify-center gap-3 ${vibeVideo ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-emerald-500/40 hover:text-emerald-400'}`}>
                {generatingVibe ? <><div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div> SYNCING VEO PROMO...</> : vibeVideo ? '✅ Vibe Promo Ready' : '🎬 Generate AI Vibe Video (Veo)'}
             </button>
           )}
        </section>

        <div className="space-y-6">
          <div>
            <label className={labelClasses}>Hustle Title</label>
            <input type="text" className={inputClasses} placeholder="e.g. Vintage Leather Jacket" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
          </div>

          <div>
            <label className={labelClasses}>Short Description (Feed Preview)</label>
            <input type="text" className={`${inputClasses} text-emerald-400`} placeholder="e.g. Fresh from the source ⚡" value={formData.shortDescription} onChange={(e) => setFormData({...formData, shortDescription: e.target.value})} />
          </div>

          <div>
            <label className={labelClasses}>Full Description</label>
            <textarea rows={4} className={`${inputClasses} rounded-[2.5rem]`} placeholder="Describe your hustle in detail..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Price (ZK)</label>
              <input type="number" className={inputClasses} placeholder="0.00" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
            </div>
            <div>
              <label className={labelClasses}>Node Location</label>
              <div className="relative"><input type="text" className={inputClasses} placeholder="LOCATION" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} /><button onClick={handleDetectLocation} className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-500">📍</button></div>
            </div>
          </div>
        </div>

        {error && <p className="text-[10px] font-black text-rose-500 uppercase text-center animate-pulse">{error}</p>}
        <button onClick={handlePost} disabled={loading} className="w-full py-8 bg-emerald-600 text-white font-black rounded-[3rem] shadow-[0_20px_40px_rgba(16,185,129,0.2)] active:scale-[0.98] transition-all text-sm uppercase tracking-[0.3em] hover:bg-emerald-500">{loading ? 'MODERATING NODE...' : 'DEPLOY TO MESH'}</button>
      </div>
    </div>
  );
};

export default PostListing;

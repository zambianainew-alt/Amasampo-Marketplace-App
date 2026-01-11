
import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES, MOCK_LISTINGS } from '../constants';
import ListingCard from '../components/ListingCard';
import AdBanner from '../components/AdBanner';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/storage';
import { Story, Listing } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [selectedCat, setSelectedCat] = useState('all');
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const storyTimerRef = useRef<number | null>(null);
  
  const loadData = async () => {
    const custom = await storage.getAllListings();
    const combined = [...custom];
    MOCK_LISTINGS.forEach(mock => {
      if (!combined.find(c => c.id === mock.id)) combined.push(mock);
    });
    
    setAllListings(combined);

    const savedStories = await storage.getStories();
    const follows = await storage.getFollows();
    
    // Logic: See follows + own stories + random verified merchant stories
    const displayStories = savedStories.filter(s => 
      follows.includes(s.ownerId) || 
      s.ownerId === user?.id || 
      s.isLive
    );
    
    setStories(displayStories);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    return storage.subscribe(loadData);
  }, [user?.id]);

  useEffect(() => {
    if (activeStory) {
      setStoryProgress(0);
      storyTimerRef.current = window.setInterval(() => {
        setStoryProgress(prev => {
          if (prev >= 100) { handleCloseStory(); return 100; }
          return prev + 1;
        });
      }, 50);
    } else {
      if (storyTimerRef.current) clearInterval(storyTimerRef.current);
    }
    return () => { if (storyTimerRef.current) clearInterval(storyTimerRef.current); };
  }, [activeStory]);

  const handleCloseStory = () => { setActiveStory(null); setStoryProgress(0); };

  const handleAddStory = () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const newStory: Story = {
            id: `story_${Date.now()}`,
            ownerId: user!.id,
            ownerName: user!.name,
            ownerPhoto: user!.photoUrl,
            imageUrl: reader.result as string,
            createdAt: new Date().toISOString()
          };
          await storage.saveStory(newStory);
          storage.broadcast('GLOBAL_ALERT', { message: 'Story synced to the mesh!', type: 'SUCCESS' });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const filteredListings = selectedCat === 'all' 
    ? allListings 
    : allListings.filter(l => l.category.toLowerCase().includes(selectedCat.toLowerCase()));

  return (
    <div className="px-6 py-8 space-y-12 max-w-2xl mx-auto bg-[#020617]">
      {/* 🚀 New Status/Story Bar */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-[900] text-slate-500 uppercase tracking-widest">Mesh Live Feed</h2>
          {stories.length > 0 && <span className="text-[9px] font-black text-emerald-500 uppercase animate-pulse">● {stories.length} Nodes Online</span>}
        </div>
        <div className="flex gap-5 overflow-x-auto hide-scrollbar pb-2 -mx-6 px-6">
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <button onClick={handleAddStory} className="w-20 h-20 rounded-[2rem] border-2 border-dashed border-white/10 flex items-center justify-center bg-slate-900 active:scale-90 transition-all group">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:bg-emerald-500 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </div>
            </button>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Share Sync</span>
          </div>

          {stories.map(story => (
            <div key={story.id} className="flex-shrink-0 flex flex-col items-center gap-2 group" onClick={() => setActiveStory(story)}>
              <div className="w-20 h-20 rounded-[2.2rem] p-1 border-2 border-emerald-500 shadow-2xl cursor-pointer group-active:scale-95 transition-all overflow-hidden bg-slate-900 relative">
                <img src={story.ownerPhoto} className="w-full h-full rounded-[1.8rem] object-cover border-2 border-slate-950" alt="" />
                {story.isLive && <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_red]"></div>}
              </div>
              <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest truncate w-20 text-center">{story.ownerName.split(' ')[0]}</span>
            </div>
          ))}
          
          {/* Mock Active Nodes if empty */}
          {stories.length === 0 && [1,2].map(i => (
             <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 opacity-40 grayscale">
               <div className="w-20 h-20 rounded-[2.2rem] p-1 border-2 border-slate-800 bg-slate-900">
                  <div className="w-full h-full rounded-[1.8rem] bg-slate-800"></div>
               </div>
               <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
             </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Discovery Protocol</p>
          <h2 className="text-5xl font-[900] text-white tracking-tighter leading-none">Scan the<br/><span className="text-emerald-500 text-glow">local mesh.</span></h2>
        </div>
        
        <div onClick={() => navigate('/explore')} className="group relative flex items-center bg-slate-900 border border-white/5 rounded-[2.2rem] p-2 shadow-2xl hover:border-emerald-500/50 transition-all cursor-pointer">
          <div className="bg-emerald-600 text-white p-4 rounded-[1.6rem] shadow-lg group-hover:bg-emerald-500 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <span className="ml-5 text-sm font-bold text-slate-600 uppercase tracking-widest">Search 142 active nodes...</span>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-[11px] font-[900] text-slate-400 uppercase tracking-widest">Network Sectors</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id === selectedCat ? 'all' : cat.id)} className={`flex-shrink-0 min-w-[120px] p-6 rounded-[2.2rem] border transition-all duration-500 ${selectedCat === cat.id ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)] scale-105' : 'bg-slate-900 border-white/5 text-slate-300 shadow-sm hover:border-emerald-500/50'}`}>
              <span className="text-3xl block mb-4">{cat.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-widest block">{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-[900] text-slate-400 uppercase tracking-widest">Verified Feed</h2>
        </div>
        <div className="grid grid-cols-2 gap-6 pb-12">
          {filteredListings.map(listing => (
            <ListingCard key={listing.id} listing={listing} onClick={() => navigate(`/listing/${listing.id}`)} />
          ))}
        </div>
        <AdBanner />
      </section>

      {activeStory && (
        <div className="fixed inset-0 z-[200] bg-black animate-in fade-in duration-300 flex flex-col">
          <div className="absolute top-0 left-0 right-0 z-10 p-6 pt-[calc(env(safe-area-inset-top)+24px)] flex flex-col gap-4 bg-gradient-to-b from-black to-transparent">
             <div className="flex gap-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-75 shadow-[0_0_10px_#10b981]" style={{ width: `${storyProgress}%` }} />
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <img src={activeStory.ownerPhoto} className="w-10 h-10 rounded-xl border border-white/20" alt="" />
                   <div>
                      <h4 className="text-sm font-black text-white tracking-tight">{activeStory.ownerName}</h4>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active Node</p>
                   </div>
                </div>
                <button onClick={handleCloseStory} className="p-3 bg-white/10 rounded-xl text-white backdrop-blur-md">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
             <img src={activeStory.imageUrl} className="w-full max-h-screen object-contain" alt="" />
          </div>
          <div className="p-10 pb-[calc(env(safe-area-inset-bottom)+40px)] bg-gradient-to-t from-black to-transparent">
             <button onClick={() => { handleCloseStory(); navigate(`/shop/${activeStory.ownerId}`); }} className="w-full py-6 bg-emerald-600 text-white font-black rounded-[2rem] text-[10px] uppercase tracking-widest shadow-2xl">View Merchant Profile</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

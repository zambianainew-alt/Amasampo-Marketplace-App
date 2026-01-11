
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/storage';
import ListingCard from '../components/ListingCard';

const SavedItems: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavs = async () => {
    const favs = await storage.getFavorites();
    setItems(favs);
    setLoading(false);
  };

  useEffect(() => {
    loadFavs();
    const sub = storage.subscribe(loadFavs);
    return sub;
  }, []);

  return (
    <div className="px-6 py-10 space-y-10 max-w-2xl mx-auto pb-32">
      <header className="space-y-2">
        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">Identity Vault</p>
        <h1 className="text-4xl font-[900] text-slate-950 tracking-tighter uppercase">Saved Hustles</h1>
        <p className="text-sm text-slate-500 font-medium">Monitor and track your high-priority deals.</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-6">
          {[1,2].map(i => <div key={i} className="aspect-[4/5] bg-slate-100 rounded-[2.5rem] animate-pulse"></div>)}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 gap-6">
          {items.map(item => (
            <ListingCard key={item.id} listing={item} onClick={() => navigate(`/listing/${item.id}`)} />
          ))}
        </div>
      ) : (
        <div className="bento-card py-24 px-10 text-center space-y-6 flex flex-col items-center">
          <div className="w-24 h-24 bg-white border border-slate-100 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl group transition-all">
             <svg className="w-10 h-10 text-slate-200 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
             </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-950 tracking-tight">Vault Empty</h3>
            <p className="text-sm text-slate-400 font-medium max-w-[200px] mx-auto">No hustles bookmarked in your digital identity node yet.</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="px-10 py-5 bg-slate-950 text-white font-black rounded-3xl text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
          >
            Scan The Mesh
          </button>
        </div>
      )}
    </div>
  );
};

export default SavedItems;

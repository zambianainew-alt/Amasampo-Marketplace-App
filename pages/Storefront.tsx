
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../services/storage';
import ListingCard from '../components/ListingCard';

const Storefront: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendorListings, setVendorListings] = useState<any[]>([]);
  const [vendorInfo, setVendorInfo] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCat, setSelectedCat] = useState('All');
  const [loading, setLoading] = useState(true);
  const [totalReach, setTotalReach] = useState(0);

  useEffect(() => {
    const loadStore = async () => {
      setLoading(true);
      const all = await storage.getAllListings();
      const shopItems = all.filter(l => l.ownerId === id);
      setVendorListings(shopItems);
      
      const views = shopItems.reduce((acc, curr) => acc + (curr.views || 0), 0);
      setTotalReach(views);

      const cats = Array.from(new Set(shopItems.map(i => i.category)));
      setCategories(['All', ...cats]);

      if (shopItems.length > 0) {
        setVendorInfo({
          name: shopItems[0].ownerName,
          location: shopItems[0].location,
          joined: 'Jan 2024',
          photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(shopItems[0].ownerName)}&background=020617&color=fff&bold=true`
        });
      }
      setLoading(false);
    };
    loadStore();
  }, [id]);

  const filtered = selectedCat === 'All' 
    ? vendorListings 
    : vendorListings.filter(i => i.category === selectedCat);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div></div>;

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-20">
      <div className="bg-white px-6 pt-16 pb-12 border-b relative rounded-b-[4rem] shadow-xl">
        <button onClick={() => navigate(-1)} className="absolute top-6 left-6 p-4 bg-slate-50 rounded-2xl text-slate-900 border border-slate-100 shadow-sm active:scale-90 transition-all">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-emerald-500 rounded-[2.5rem] blur-2xl opacity-10 animate-pulse"></div>
            <img src={vendorInfo?.photo} className="w-32 h-32 rounded-[2.8rem] border-4 border-white shadow-2xl relative z-10 object-cover" alt="" />
            <div className="absolute -bottom-2 -right-2 p-2 bg-emerald-500 rounded-2xl border-4 border-white shadow-xl z-20">
              <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
            </div>
          </div>
          <h1 className="text-4xl font-[900] text-slate-950 tracking-tighter leading-none">{vendorInfo?.name}</h1>
          <div className="flex items-center gap-2 mt-3">
             <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Verified Merchant Hub</span>
             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">📍 {vendorInfo?.location.split(',')[0]}</span>
          </div>
          
          <div className="grid grid-cols-3 gap-3 w-full mt-10">
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
               <p className="text-2xl font-[900] text-slate-950 tracking-tighter">4.9</p>
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Trust</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
               <p className="text-2xl font-[900] text-slate-950 tracking-tighter">{vendorListings.length}</p>
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Actives</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
               <p className="text-2xl font-[900] text-emerald-600 tracking-tighter">{totalReach > 1000 ? (totalReach/1000).toFixed(1)+'k' : totalReach}</p>
               <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1">Reach</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-10 space-y-8">
        <div className="flex items-center justify-between px-2">
           <h2 className="text-[11px] font-[900] text-slate-900 uppercase tracking-widest">Market Sectors</h2>
           <p className="text-[9px] font-black text-slate-300 uppercase">Synchronized</p>
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 -mx-6 px-6">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-8 py-4 whitespace-nowrap text-[10px] font-black uppercase tracking-widest rounded-2xl border transition-all duration-500 ${selectedCat === cat ? 'bg-slate-950 text-white border-slate-950 shadow-2xl scale-105' : 'bg-white text-slate-400 border-slate-100 shadow-sm hover:border-emerald-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {filtered.map(listing => (
            <div key={listing.id} className="animate-in fade-in slide-in-from-bottom-2">
              <ListingCard listing={listing} onClick={() => navigate(`/listing/${listing.id}`)} />
            </div>
          ))}
        </div>
        
        {filtered.length === 0 && (
          <div className="py-32 text-center space-y-6">
             <div className="text-5xl opacity-20">📦</div>
             <p className="text-sm font-black text-slate-300 uppercase tracking-[0.3em]">No items detected in this hub</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Storefront;

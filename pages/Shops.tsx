
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/storage';

const Shops: React.FC = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVendors = async () => {
      const all = await storage.getAllListings();
      // Group by ownerId to identify unique shops
      const shopMap = new Map();
      all.forEach(l => {
        if (!shopMap.has(l.ownerId)) {
          shopMap.set(l.ownerId, {
            id: l.ownerId,
            name: l.ownerName,
            location: l.location,
            count: 1,
            photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(l.ownerName)}&background=020617&color=fff&bold=true`
          });
        } else {
          shopMap.get(l.ownerId).count++;
        }
      });
      setVendors(Array.from(shopMap.values()));
      setLoading(false);
    };
    loadVendors();
  }, []);

  return (
    <div className="px-6 py-10 space-y-10 max-w-2xl mx-auto pb-32">
      <header className="space-y-2">
        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">Node Network</p>
        <h1 className="text-4xl font-[900] text-slate-950 tracking-tighter uppercase">Merchant Mesh</h1>
        <p className="text-sm text-slate-500 font-medium">Connect with verified local storefronts.</p>
      </header>

      <div className="grid gap-6">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-[2.5rem] animate-pulse"></div>)
        ) : vendors.length > 0 ? (
          vendors.map(v => (
            <div 
              key={v.id}
              onClick={() => navigate(`/shop/${v.id}`)}
              className="p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_4px_20px_rgba(15,23,42,0.02)] flex items-center gap-6 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all cursor-pointer group"
            >
              <img src={v.photo} className="w-20 h-20 rounded-[1.8rem] border-4 border-slate-50 shadow-sm group-hover:border-emerald-100 transition-colors" alt="" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-slate-950 group-hover:text-emerald-600 transition-colors tracking-tight">{v.name}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">📍 {v.location}</p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-black px-3 py-1 rounded-full text-[9px] uppercase tracking-widest border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {v.count} Actives
                  </div>
                  <span className="text-[9px] bg-slate-50 text-slate-500 font-black px-3 py-1 rounded-full uppercase tracking-widest border border-slate-100">Verified Node</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-lg transition-all">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          ))
        ) : (
          <div className="bento-card py-24 px-10 text-center space-y-6 flex flex-col items-center">
             <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-inner">🌐</div>
             <div className="space-y-2">
               <h3 className="text-xl font-black text-slate-950 tracking-tight">Mesh Quiet</h3>
               <p className="text-sm text-slate-400 font-medium max-w-[220px] mx-auto">No merchant nodes active in your current sync radius.</p>
             </div>
             <button onClick={() => navigate('/post')} className="px-8 py-4 bg-slate-950 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl">Activate Shop Hub</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Shops;

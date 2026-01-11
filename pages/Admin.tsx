
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_LISTINGS, formatPrice } from '../constants';
import { storage } from '../services/storage';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [platformRevenue, setPlatformRevenue] = useState(0);
  const [adRevenue, setAdRevenue] = useState(0);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const rev = await storage.getMetadata('platform_revenue') || 0;
    const ads = await storage.getMetadata('ad_revenue') || 0;
    const all = await storage.getAllListings();
    setPlatformRevenue(rev);
    setAdRevenue(ads);
    setListings(all);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    return storage.subscribe(loadData);
  }, []);

  const clearEarnings = async () => {
    if (window.confirm("Purge Platform Ledger? This resets all simulated earnings.")) {
      await storage.setMetadata('platform_revenue', 0);
      await storage.setMetadata('ad_revenue', 0);
      storage.broadcast('GLOBAL_ALERT', { message: 'Ledger Purged.', type: 'SUCCESS' });
    }
  };

  return (
    <div className="px-6 py-10 space-y-10 max-w-2xl mx-auto pb-32">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-1">Network Command Center</p>
          <h1 className="text-4xl font-[900] text-slate-950 tracking-tighter uppercase leading-none">Admin Control</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={clearEarnings}
            className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-rose-400 hover:text-rose-600 transition-colors"
            title="Purge Ledger"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          <button 
            onClick={() => navigate('/profile')} 
            className="w-12 h-12 bg-slate-950 rounded-2xl shadow-lg flex items-center justify-center text-white hover:bg-emerald-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-5">
        <div className="bento-card p-8 bg-slate-950 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-2">Network Yield (Comm.)</p>
          <p className="text-4xl font-[900] tracking-tighter">{formatPrice(platformRevenue, 'ZMW')}</p>
          <div className="mt-4 flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             <p className="text-[8px] font-bold text-slate-400 uppercase">Handshake Commissions</p>
          </div>
        </div>

        <div className="bento-card p-8 bg-emerald-600 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
          <p className="text-[9px] text-white/60 font-black uppercase tracking-widest mb-2">Marketing Yield (Ads)</p>
          <p className="text-4xl font-[900] tracking-tighter">ZK {adRevenue.toFixed(2)}</p>
          <div className="mt-4 flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
             <p className="text-[8px] font-bold text-white/60 uppercase">AdMob Simulation Active</p>
          </div>
        </div>
        
        <div className="col-span-2 bento-card p-8 bg-white border-slate-100 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Total Mesh Nodes</p>
            <p className="text-4xl font-[900] text-slate-950 tracking-tighter">{listings.length}</p>
          </div>
          <div className="text-right">
             <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">Protocol Health</p>
             <p className="text-xl font-black text-slate-900 tracking-tighter">98.4% Uptime</p>
          </div>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
           <h2 className="text-[11px] font-[900] text-slate-900 uppercase tracking-widest">Active Node Sync</h2>
           <button className="text-[10px] font-black text-emerald-600 uppercase">Full Protocol Log</button>
        </div>
        
        <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-lg">
          <div className="divide-y divide-slate-50">
            {listings.slice(0, 5).map(listing => (
              <div key={listing.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <img src={listing.images[0]} className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-sm" alt="" />
                  <div>
                    <p className="text-sm font-black text-slate-950 truncate max-w-[140px]">{listing.title}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{listing.ownerName} • {listing.location.split(',')[0]}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {listing.isBoosted && <span className="bg-emerald-50 text-emerald-600 p-2 rounded-xl text-[10px]">🚀</span>}
                  <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          {listings.length > 5 && (
            <div className="p-4 text-center border-t border-slate-50">
               <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Load More Node Clusters...</button>
            </div>
          )}
        </div>
      </section>

      <section className="bento-card p-10 bg-slate-950 text-white shadow-2xl space-y-6">
        <h3 className="text-xl font-black tracking-tight">Global Mesh Announcement</h3>
        <p className="text-sm text-slate-400 font-medium">Broadcast a signal to all active nodes in the region.</p>
        <textarea 
          className="w-full p-6 bg-slate-900 border border-white/5 rounded-3xl text-sm outline-none focus:ring-4 ring-emerald-500/20 transition-all text-emerald-400 font-bold"
          placeholder="ENTER TRANSMISSION..."
          rows={3}
        />
        <button className="w-full py-6 bg-emerald-600 text-white font-black rounded-3xl text-xs uppercase tracking-[0.3em] active:scale-95 transition-all shadow-[0_20px_40px_rgba(16,185,129,0.2)]">
          DEPLOY BROADCAST
        </button>
      </section>
    </div>
  );
};

export default Admin;

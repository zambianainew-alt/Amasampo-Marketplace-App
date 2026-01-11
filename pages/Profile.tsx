
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';
import { payments } from '../services/payment';
import ListingCard from '../components/ListingCard';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [userListings, setUserListings] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);

  const isAdmin = user?.id === 'google_demo_123' || user?.email === 'admin@amasampo.com';

  const loadProfileData = async () => {
    if (isAuthenticated && user) {
      const all = await storage.getAllListings();
      setUserListings(all.filter(l => l.ownerId === user.id));
      const b = await storage.getBalance(user.id);
      setBalance(b);
    }
  };

  useEffect(() => {
    loadProfileData();
    return storage.subscribe(loadProfileData);
  }, [isAuthenticated, user]);

  const handleBoost = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    try {
      await payments.payForBoost(user!.id, listingId);
      loadProfileData();
    } catch (err: any) {
      storage.broadcast('GLOBAL_ALERT', { message: err.message, type: 'ERROR' });
    }
  };

  if (!isAuthenticated) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center space-y-8 bg-[#020617]">
       <div className="w-32 h-32 bg-slate-900 rounded-[3rem] shadow-2xl flex items-center justify-center text-5xl border border-white/5">👤</div>
       <div className="space-y-2">
         <h2 className="text-4xl font-[900] text-white tracking-tighter">Enter the Mesh</h2>
         <p className="text-slate-500 font-medium text-sm">Create your digital identity to start trading.</p>
       </div>
       <button onClick={() => navigate('/login')} className="w-full max-w-xs py-5 bg-emerald-600 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest text-[10px]">Enter Marketplace</button>
    </div>
  );

  return (
    <div className="px-6 py-10 space-y-8 max-w-2xl mx-auto pb-32 bg-[#020617]">
      <section className="grid grid-cols-12 gap-5">
        <div className="col-span-12 md:col-span-8 bento-card p-10 flex items-center gap-8 relative overflow-hidden bg-slate-900 border-white/5">
           <img 
            src={user?.photoUrl} 
            className="w-24 h-24 rounded-[2.2rem] border-4 border-slate-950 shadow-2xl object-cover" 
            alt="" 
           />
           <div className="space-y-1">
             <h1 className="text-4xl font-[900] text-white tracking-tighter leading-none">{user?.name}</h1>
             <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em]">{isAdmin ? 'Network Administrator' : 'Verified Hub Owner'}</p>
           </div>
           <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <button 
          onClick={logout}
          className="col-span-12 md:col-span-4 bento-card p-10 flex flex-col items-center justify-center bg-rose-500/5 border-rose-500/20 group transition-all active:scale-95"
        >
          <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm transition-colors group-hover:bg-rose-500 group-hover:text-white mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Disconnect</span>
        </button>
      </section>

      {isAdmin && (
        <section className="animate-in fade-in slide-in-from-top-4">
          <button 
            onClick={() => navigate('/admin')}
            className="w-full bento-card p-8 bg-slate-950 text-white flex items-center justify-between border-emerald-500/20 shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-all"
          >
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-14 h-14 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-2xl border border-emerald-500/20 group-hover:bg-emerald-600 transition-colors">🎮</div>
              <div className="text-left">
                <h3 className="text-xl font-black tracking-tight">Network Command Center</h3>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mt-1">Platform Control Node • Authorized Access</p>
              </div>
            </div>
            <svg className="w-6 h-6 text-slate-700 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </section>
      )}

      <section className="grid grid-cols-3 gap-5">
        {[
          { label: 'Hustles', val: userListings.length, icon: '📦' },
          { label: 'Vault', val: balance.toLocaleString(), icon: '💰' },
          { label: 'Trust', val: '99%', icon: '🛡️' }
        ].map((stat, i) => (
          <div key={i} className="bento-card p-8 flex flex-col items-center justify-center text-center space-y-2 bg-slate-900 border-white/5">
            <span className="text-2xl">{stat.icon}</span>
            <p className="text-3xl font-[900] text-white tracking-tighter">{stat.val}</p>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[11px] font-[900] text-slate-400 uppercase tracking-widest">My Marketplace Nodes</h2>
          <button onClick={() => navigate('/post')} className="text-[11px] font-black text-emerald-500 uppercase">Deploy New +</button>
        </div>

        {userListings.length > 0 ? (
          <div className="grid grid-cols-2 gap-6">
            {userListings.map(listing => (
              <div key={listing.id} className="relative group">
                <ListingCard 
                  listing={listing} 
                  onClick={() => navigate(`/listing/${listing.id}`)} 
                />
                {!listing.isBoosted && (
                  <button 
                    onClick={(e) => handleBoost(e, listing.id)}
                    className="absolute bottom-4 left-4 right-4 py-3 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                  >
                    🚀 Boost Node (25 ZK)
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bento-card p-20 text-center flex flex-col items-center space-y-4 bg-slate-900 border-white/5">
             <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center text-3xl">🍃</div>
             <div className="space-y-1">
               <p className="text-xl font-black text-white tracking-tighter">Your node is quiet.</p>
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Post an item to activate sync</p>
             </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;


import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { syncMesh } from '../services/sync';
import { storage } from '../services/storage';
import { notifications } from '../services/notification';
import MeshGuide from './MeshGuide';

interface LayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, hideNav }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  
  const [meshMeta, setMeshMeta] = useState({ status: 'CONNECTED', nodes: 142, strength: 98, region: 'Zambia Central' });
  const [alert, setAlert] = useState<{message: string, type: string} | null>(null);
  const [unreadChats, setUnreadChats] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncState, setSyncState] = useState<'IDLE' | 'SYNCING'>('IDLE');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number>(0);

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = { light: [30], medium: [60], heavy: [100] };
      navigator.vibrate(patterns[style]);
    }
  };

  const loadCounters = async () => {
    const chats = await storage.getAllChatSessions();
    setUnreadChats(chats.length > 0 ? chats.length : 0);
  };

  useEffect(() => {
    syncMesh.startMeshSync();
    loadCounters();
    
    const channel = new BroadcastChannel('amasampo_sync_mesh');
    channel.onmessage = (event) => {
      if (event.data.type === 'MESH_HEARTBEAT') setMeshMeta(event.data.payload);
      if (event.data.type === 'MESH_SYNC_START') setSyncState('SYNCING');
      if (event.data.type === 'MESH_SYNC_COMPLETE') setSyncState('IDLE');
      if (event.data.type === 'GLOBAL_ALERT') {
        setAlert(event.data.payload);
        if (event.data.payload.type === 'DISCOVERY') setUnreadNotifs(prev => prev + 1);
        setTimeout(() => setAlert(null), 5000);
      }
    };

    const unsubStorage = storage.subscribe(loadCounters);

    return () => { 
      syncMesh.stopMeshSync(); 
      channel.close(); 
      unsubStorage();
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollContainerRef.current?.scrollTop === 0) {
      touchStartRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const diff = touchY - touchStartRef.current;
    if (diff > 120 && scrollContainerRef.current?.scrollTop === 0 && !isRefreshing) {
      triggerHaptic('heavy');
      setIsRefreshing(true);
      storage.processSyncQueue().then(() => {
        setTimeout(() => {
          setIsRefreshing(false);
          triggerHaptic('light');
        }, 800);
      });
    }
  };

  const navItems = [
    { label: 'Explore', path: '/', icon: (active: boolean) => (
      <svg className={`w-7 h-7 ${active ? 'text-emerald-500' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
    )},
    { label: 'Vibes', path: '/vibes', icon: (active: boolean) => (
      <svg className={`w-7 h-7 ${active ? 'text-emerald-500' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )},
    { label: 'Map', path: '/map', icon: (active: boolean) => (
      <svg className={`w-7 h-7 ${active ? 'text-emerald-500' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )},
    { label: 'Vault', path: '/wallet', icon: (active: boolean) => (
      <svg className={`w-7 h-7 ${active ? 'text-emerald-500' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3-3v8a3 3 0 003 3z" /></svg>
    )},
    { label: 'Identity', path: '/profile', icon: (active: boolean) => (
      <svg className={`w-7 h-7 ${active ? 'text-emerald-500' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    )}
  ];

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-100 overflow-hidden pt-[env(safe-area-inset-top)]">
      <MeshGuide />
      
      {alert && (
        <div className="fixed top-28 left-6 right-6 z-[100] animate-in slide-in-from-top-12 duration-500 pointer-events-none">
          <div className={`max-w-md mx-auto glass border-2 ${alert.type === 'SUCCESS' ? 'border-emerald-500/50' : 'border-slate-800'} rounded-[2.2rem] p-6 shadow-2xl flex items-center gap-5`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${alert.type === 'SUCCESS' ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
              {alert.type === 'SUCCESS' ? '✅' : '📡'}
            </div>
            <p className="text-sm font-black text-white leading-tight uppercase tracking-tight">{alert.message}</p>
          </div>
        </div>
      )}

      <header className="px-6 py-5 flex items-center justify-between glass border-b border-white/5 relative z-50">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => { triggerHaptic(); navigate('/'); }}>
          <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-[0_0_15px_rgba(16,185,129,0.4)] relative">
            A
            {syncState === 'SYNCING' && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-[#020617] animate-ping"></span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-[900] tracking-tighter text-white uppercase leading-none">Amasampo</h1>
            <p className="text-[7px] font-black text-emerald-500 tracking-[0.3em] uppercase mt-0.5">
              {syncState === 'SYNCING' ? 'Syncing To Cloud...' : 'Cloud Mesh Connected'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
             onClick={() => { triggerHaptic(); navigate('/chats'); }} 
             className="relative p-3.5 bg-slate-900 border border-white/5 text-white rounded-[1.2rem] shadow-sm active:scale-90 transition-all hover:bg-slate-800"
           >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              {unreadChats > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#020617] animate-in zoom-in">
                  {unreadChats}
                </span>
              )}
           </button>
           <button 
             onClick={() => { triggerHaptic(); setUnreadNotifs(0); navigate('/notifications'); }} 
             className="relative p-3.5 bg-slate-900 border border-white/5 text-white rounded-[1.2rem] shadow-sm active:scale-90 transition-all hover:bg-slate-800"
           >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-[#020617] animate-pulse"></span>
              )}
           </button>
           <button 
             onClick={() => { triggerHaptic('medium'); navigate('/post'); }} 
             className="p-3.5 bg-emerald-600 text-white rounded-[1.2rem] shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-90 transition-all ml-1"
           >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
           </button>
        </div>
      </header>

      <div 
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="flex-1 overflow-y-auto hide-scrollbar bg-[#020617]"
      >
        {isRefreshing && (
          <div className="h-20 flex items-center justify-center animate-in slide-in-from-top-full duration-300 bg-emerald-500/5">
             <div className="flex gap-2 items-center">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mr-2">Syncing Pulse</p>
                <div className="flex gap-1.5 h-4 items-center">
                  <span className="w-1.5 h-4 bg-emerald-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-4 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.1s]"></span>
                  <span className="w-1.5 h-4 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                </div>
             </div>
          </div>
        )}
        {children}
      </div>

      {!hideNav && (
        <nav className="px-6 py-6 pb-[calc(24px+env(safe-area-inset-bottom))] bg-gradient-to-t from-[#020617] to-transparent">
          <div className="glass border border-white/10 shadow-3xl rounded-[2.5rem] p-3 flex items-center justify-around max-w-lg mx-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button 
                  key={item.label} 
                  onClick={() => { triggerHaptic(); navigate(item.path); }} 
                  className="relative flex flex-col items-center justify-center p-3 group transition-all"
                >
                  {item.icon(isActive)}
                  {isActive && (
                    <div className="absolute -bottom-1 w-1 h-1 bg-emerald-500 rounded-full animate-in zoom-in shadow-[0_0_10px_#10b981]"></div>
                  )}
                  <span className={`text-[8px] mt-1 font-black uppercase tracking-widest transition-colors ${isActive ? 'text-emerald-500' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;

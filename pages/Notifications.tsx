
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';

interface Notification {
  id: string;
  type: 'DISCOVERY' | 'SALE' | 'MESSENGER' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
}

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const MOCK_NOTIFICATIONS: Notification[] = [
    {
      id: 'n1',
      type: 'DISCOVERY',
      title: 'New Mesh Hustle',
      message: 'Zambia Tech Hub just deployed a new Solar Inverter node near you.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      isRead: false,
      link: '/listing/l1'
    },
    {
      id: 'n2',
      type: 'MESSENGER',
      title: 'Message Received',
      message: 'Musa Repairs is asking about your availability for a welding gig.',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      isRead: true,
      link: '/chats'
    },
    {
      id: 'n3',
      type: 'SYSTEM',
      title: 'Vault Sync Complete',
      message: 'Your recent deposit of 500 ZK has been finalized on the ledger.',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      isRead: true,
      link: '/wallet'
    }
  ];

  useEffect(() => {
    // In a real app, we'd fetch from storage/API
    setTimeout(() => {
      setNotifications(MOCK_NOTIFICATIONS);
      setLoading(false);
    }, 500);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'DISCOVERY': return '📡';
      case 'SALE': return '💰';
      case 'MESSENGER': return '💬';
      case 'SYSTEM': return '🛡️';
      default: return '🔔';
    }
  };

  if (!isAuthenticated) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center space-y-8">
       <div className="w-32 h-32 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center text-5xl">🔔</div>
       <div className="space-y-2">
         <h2 className="text-3xl font-[900] text-slate-950 tracking-tighter">Stay Connected</h2>
         <p className="text-slate-500 font-medium text-sm">Log in to receive real-time mesh activity updates.</p>
       </div>
       <button onClick={() => navigate('/login')} className="w-full max-w-xs py-5 bg-slate-950 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest text-[10px]">Enter Marketplace</button>
    </div>
  );

  return (
    <div className="px-6 py-10 space-y-10 max-w-2xl mx-auto pb-32">
      <header className="space-y-2">
        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">Mesh Stream</p>
        <h1 className="text-4xl font-[900] text-slate-950 tracking-tighter uppercase">Activity</h1>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white border border-slate-50 rounded-[2.5rem] animate-pulse"></div>)}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map(notif => (
            <div 
              key={notif.id}
              onClick={() => {
                markAsRead(notif.id);
                if (notif.link) navigate(notif.link);
              }}
              className={`p-6 bg-white border rounded-[2.5rem] shadow-[0_4px_20px_rgba(15,23,42,0.02)] flex items-start gap-5 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99] transition-all cursor-pointer group ${!notif.isRead ? 'border-emerald-100 ring-1 ring-emerald-50' : 'border-slate-50'}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm ${!notif.isRead ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                {getTypeIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`font-black tracking-tight group-hover:text-emerald-600 transition-colors ${!notif.isRead ? 'text-slate-950' : 'text-slate-500'}`}>{notif.title}</h3>
                  {!notif.isRead && <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 shrink-0"></div>}
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-2 line-clamp-2">{notif.message}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bento-card py-24 px-10 text-center space-y-6 flex flex-col items-center">
          <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-inner">📡</div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-950 tracking-tight">Mesh Quiet</h3>
            <p className="text-sm text-slate-400 font-medium max-w-[220px] mx-auto">No activity signals detected in your sector lately.</p>
          </div>
        </div>
      )}

      {notifications.length > 0 && (
        <button 
          onClick={() => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}
          className="w-full py-5 bg-slate-50 border border-slate-100 text-slate-400 font-black rounded-3xl text-[10px] uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all"
        >
          Clear Protocol Signals
        </button>
      )}
    </div>
  );
};

export default Notifications;

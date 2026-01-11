
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_CHATS } from '../constants';
import { storage } from '../services/storage';
import { ChatSession } from '../types';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChats = async () => {
    const savedSessions = await storage.getAllChatSessions();
    // Merge mock chats with real ones, ensuring unique IDs
    const combined = [...savedSessions];
    MOCK_CHATS.forEach(mock => {
      if (!combined.find(c => c.id === mock.id)) {
        combined.push(mock as ChatSession);
      }
    });
    setChats(combined.sort((a, b) => b.lastTimestamp.localeCompare(a.lastTimestamp)));
    setLoading(false);
  };

  useEffect(() => {
    loadChats();
    const unsubscribe = storage.subscribe(loadChats);
    return unsubscribe;
  }, []);

  return (
    <div className="px-6 py-8 space-y-8 bg-slate-50 min-h-screen">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Deals & Gigs</h1>
        <p className="text-sm text-slate-500 font-medium">Coordinate your marketplace business.</p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-[2rem] animate-pulse"></div>)}
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => navigate(`/chat/${chat.id}`)}
              className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-[2rem] hover:shadow-lg cursor-pointer transition-all active:scale-[0.98] group"
            >
              <div className="relative">
                <img src={chat.partnerPhoto} className="w-16 h-16 rounded-2xl border-4 border-slate-50 shadow-sm object-cover" alt="" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-black text-slate-900 truncate tracking-tight">{chat.partnerName}</h3>
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{chat.lastTimestamp}</span>
                </div>
                <p className="text-xs text-slate-500 truncate font-medium group-hover:text-slate-900 transition-colors">{chat.lastMessage}</p>
              </div>
            </div>
          ))}
          
          {chats.length === 0 && (
            <div className="py-20 flex flex-col items-center text-center text-slate-300 space-y-6">
               <div className="p-8 bg-white border border-slate-100 rounded-[3rem] shadow-sm">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-black text-slate-900 tracking-tight">Inbox Empty</p>
                <p className="text-sm font-medium mt-1">Start chatting with sellers to make offers.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Chat;


import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssistantResponse } from '../services/gemini';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';

const DIALECTS = [
  { id: 'ENGLISH', name: 'English', flag: '🇬🇧' },
  { id: 'BEMBA', name: 'Bemba', flag: '🇿🇲' },
  { id: 'NYANJA', name: 'Nyanja', flag: '🇿🇲' }
];

const MeshGuide: React.FC = () => {
  const navigate = useNavigate();
  const { user, currency } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialect, setDialect] = useState('ENGLISH');
  const [balance, setBalance] = useState(0);
  const [messages, setMessages] = useState<any[]>([
    { role: 'ai', text: "Muli bwanji! I'm your Amasampo Mesh Guide. Need help navigating the marketplace or managing your wallet?" }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) {
      storage.getBalance(user.id).then(setBalance);
    }
    const unsub = storage.subscribe(() => {
      if (user?.id) storage.getBalance(user.id).then(setBalance);
    });
    return unsub;
  }, [user?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg = { role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    const result = await getAssistantResponse(query, { 
      currentPath: window.location.hash,
      time: new Date().toLocaleTimeString(),
      user: user?.name || 'Anonymous Node',
      wallet: { balance, currency },
      meshStatus: 'HIGH_STRENGTH'
    }, dialect);
    
    setMessages(prev => [...prev, { role: 'ai', text: result.text }]);
    
    if (result.action) {
      setTimeout(() => {
        const routes: Record<string, string> = {
          'NAVIGATE_EXPLORE': '/explore',
          'NAVIGATE_WALLET': '/wallet',
          'NAVIGATE_POST': '/post',
          'NAVIGATE_SHOPS': '/shops',
          'NAVIGATE_SAVED': '/saved'
        };
        const path = routes[result.action];
        if (path) {
          navigate(path);
          setIsOpen(false);
        }
      }, 1500);
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-6 z-40 w-14 h-14 bg-slate-950 text-white rounded-[1.4rem] flex items-center justify-center shadow-2xl border-4 border-white active:scale-90 transition-all hover:bg-emerald-600 group"
        aria-label="Ask Mesh Guide"
      >
        <div className="relative">
          <span className="text-xl">🤖</span>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl flex flex-col h-[80vh] animate-in slide-in-from-bottom-20 overflow-hidden">
            <header className="p-8 border-b flex flex-col gap-6 bg-slate-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-2xl shadow-lg ring-4 ring-slate-900/10">🤖</div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900">Mesh Guide</h2>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Live Node Connection</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-red-50 transition-colors border border-slate-100">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex gap-2">
                {DIALECTS.map(d => (
                  <button 
                    key={d.id}
                    onClick={() => setDialect(d.id)}
                    className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${dialect === d.id ? 'bg-slate-950 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                  >
                    {d.flag} {d.name}
                  </button>
                ))}
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 hide-scrollbar bg-white">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] px-6 py-4 rounded-[2rem] shadow-sm ${m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none shadow-xl' : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'}`}>
                    <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                   <div className="flex items-center gap-2 bg-slate-50 px-6 py-4 rounded-[2rem] rounded-tl-none border border-slate-100">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-150"></div>
                   </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t bg-slate-50">
              <div className="flex items-center gap-3 bg-white p-2 rounded-[2rem] shadow-xl border border-slate-100 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                <input 
                  className="flex-1 bg-transparent border-none outline-none px-5 text-sm font-medium text-slate-800"
                  placeholder="Ask for help or navigation..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend}
                  disabled={loading || !query.trim()}
                  className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-slate-950 disabled:opacity-20"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l7-7-7-7M5 12h14" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MeshGuide;

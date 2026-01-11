
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_CHATS, formatPrice } from '../constants';
import { getSellerResponse } from '../services/gemini';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';
import { payments } from '../services/payment';
import { ChatSession, Handshake } from '../types';
import Layout from '../components/Layout';

const ChatDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, currency } = useAuth();
  
  const [chatInfo, setChatInfo] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [handshake, setHandshake] = useState<Handshake | null>(null);
  const [showHandshakeModal, setShowHandshakeModal] = useState(false);
  const [handshakeAmount, setHandshakeAmount] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    if (!id) return;
    
    let session = await storage.getChatSession(id);
    if (!session) {
      session = (MOCK_CHATS.find(c => c.id === id) as ChatSession) || null;
    }
    setChatInfo(session);

    const hs = await storage.getHandshakeByChat(id);
    setHandshake(hs);

    const history = await storage.getMessages(id);
    if (history.length === 0 && session) {
      const initial = { role: 'model', text: session.lastMessage, timestamp: session.lastTimestamp };
      await storage.saveMessage(id, initial);
      setMessages([initial]);
    } else {
      setMessages(history);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    return storage.subscribe(loadData);
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !id || !chatInfo) return;
    
    const userMsg = { role: 'user' as const, text: input, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    await storage.saveMessage(id, userMsg);
    
    await storage.saveChatSession({
        ...chatInfo,
        lastMessage: input,
        lastTimestamp: userMsg.timestamp
    });

    setInput('');
    setIsTyping(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));
    history.push({ role: 'user', parts: [{ text: input }] });

    const aiResponse = await getSellerResponse(history, chatInfo.partnerName, "this listing");
    
    const modelMsg = { role: 'model' as const, text: aiResponse, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setIsTyping(false);
    setMessages(prev => [...prev, modelMsg]);
    await storage.saveMessage(id, modelMsg);
    
    await storage.saveChatSession({
        ...chatInfo,
        lastMessage: aiResponse,
        lastTimestamp: modelMsg.timestamp
    });
  };

  const handleProposeHandshake = async () => {
    if (!id || !chatInfo || !handshakeAmount) return;
    const newHs: Handshake = {
      id: `hs_${Date.now()}`,
      chatId: id,
      sellerId: chatInfo.partnerId,
      buyerId: user?.id || 'anon',
      listingId: chatInfo.listingId || 'unknown',
      agreedPrice: parseFloat(handshakeAmount),
      status: 'PENDING',
      timestamp: new Date().toISOString()
    };
    await storage.saveHandshake(newHs);
    setHandshake(newHs);
    setShowHandshakeModal(false);
    
    // Auto-message for context
    const systemMsg = { 
      role: 'user', 
      text: `🤝 MESH PROPOSAL: I'm offering ${formatPrice(newHs.agreedPrice, currency)}. Confirm handshake?`, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    setMessages(prev => [...prev, systemMsg]);
    await storage.saveMessage(id, systemMsg);
  };

  const handleConfirmHandshake = async () => {
    if (!handshake || !chatInfo) return;
    
    // Trigger Platform Monetization (Commission)
    await payments.finalizeHandshake(handshake.buyerId, handshake.sellerId, handshake.agreedPrice);
    
    const updatedHs: Handshake = { ...handshake, status: 'CONFIRMED' };
    await storage.saveHandshake(updatedHs);
    setHandshake(updatedHs);

    const systemMsg = { 
      role: 'model', 
      text: `✅ HANDSHAKE LOCKED. Deal for ${formatPrice(handshake.agreedPrice, currency)} is confirmed on the mesh ledger. Service fees processed.`, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    setMessages(prev => [...prev, systemMsg]);
    await storage.saveMessage(id, systemMsg);
    
    storage.broadcast('GLOBAL_ALERT', { message: 'Deal finalized! Commission logged.', type: 'SUCCESS' });
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <Layout hideNav>
      <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50 relative overflow-hidden">
        <header className="sticky top-0 z-30 px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex items-center gap-3">
              <img src={chatInfo?.partnerPhoto} className="w-10 h-10 rounded-2xl object-cover border border-slate-100" alt="" />
              <div>
                <h2 className="font-black text-slate-900 tracking-tight">{chatInfo?.partnerName}</h2>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                   <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active Sync</p>
                </div>
              </div>
            </div>
          </div>
          
          {handshake && handshake.status === 'PENDING' && chatInfo?.partnerId !== user?.id ? (
             <button 
              onClick={handleConfirmHandshake}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl animate-bounce"
            >
              Confirm 🤝
            </button>
          ) : (
            <button 
              onClick={() => setShowHandshakeModal(true)}
              disabled={handshake?.status === 'CONFIRMED'}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${handshake?.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-950 text-white shadow-lg shadow-slate-950/20'}`}
            >
              {handshake?.status === 'CONFIRMED' ? `🤝 LOCKED: ${formatPrice(handshake.agreedPrice, currency)}` : handshake ? `🤝 PROPOSED: ${formatPrice(handshake.agreedPrice, currency)}` : 'Initiate Handshake'}
            </button>
          )}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-6 hide-scrollbar pb-32">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
              <div className={`max-w-[85%] px-5 py-4 rounded-[1.8rem] shadow-sm ${msg.role === 'user' ? 'bg-slate-950 text-white rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'}`}>
                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                <p className={`text-[8px] mt-2 uppercase font-black tracking-widest ${msg.role === 'user' ? 'text-white/40' : 'text-slate-300'}`}>{msg.timestamp}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white px-5 py-4 rounded-[1.8rem] rounded-tl-none border border-slate-100 flex gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 bg-emerald-200 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-emerald-200 rounded-full animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 bg-emerald-200 rounded-full animate-bounce delay-200"></span>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-12">
          <div className="flex items-center gap-3 bg-white p-2 rounded-[2.2rem] border border-slate-200 shadow-2xl focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
            <input 
              type="text" 
              className="flex-1 bg-transparent border-none outline-none px-5 text-sm font-bold text-slate-800"
              placeholder="Strike a deal..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-14 h-14 bg-slate-950 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-20"
            >
              <svg className="w-6 h-6 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {showHandshakeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 space-y-8 animate-in zoom-in duration-300">
               <div className="text-center space-y-2">
                 <div className="w-20 h-20 bg-emerald-50 rounded-full mx-auto flex items-center justify-center text-4xl mb-4">🤝</div>
                 <h3 className="text-2xl font-[900] text-slate-950 uppercase tracking-tighter">Propose Handshake</h3>
                 <p className="text-sm text-slate-500 font-medium">Locked price will be logged on the mesh ledger.</p>
               </div>
               
               <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Agreed Amount (ZK)</label>
                 <input 
                   autoFocus
                   type="number" 
                   className="w-full text-center text-5xl font-[900] tracking-tighter outline-none text-slate-950 placeholder:text-slate-100"
                   placeholder="000"
                   value={handshakeAmount}
                   onChange={e => setHandshakeAmount(e.target.value)}
                 />
               </div>

               <div className="flex flex-col gap-3">
                 <button onClick={handleProposeHandshake} disabled={!handshakeAmount} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-[11px] hover:bg-emerald-700 transition-colors">Broadcast Proposal</button>
                 <button onClick={() => setShowHandshakeModal(false)} className="w-full py-5 bg-slate-50 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-[11px]">Cancel</button>
               </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ChatDetail;


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice } from '../constants';
import { storage } from '../services/storage';
import { payments } from '../services/payment';
import { Transaction } from '../types';

const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const { user, currency } = useAuth();
  
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAction, setShowAction] = useState<'DEPOSIT' | 'WITHDRAW' | 'VERIFY' | null>(null);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => { loadData(); return storage.subscribe(loadData); }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const b = await storage.getBalance(user!.id);
    const txs = await storage.getTransactions(user!.id);
    const verified = await storage.getMetadata(`wa_verified_${user!.id}`);
    setBalance(b);
    setTransactions(txs);
    setIsVerified(!!verified);
    setLoading(false);
  };

  const handleExecute = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    setIsProcessing(true);
    try {
      if (showAction === 'DEPOSIT') await payments.processDeposit(user!.id, Number(amount), 'MTN', user?.phone || '');
      else await payments.processWithdrawal(user!.id, Number(amount), 'MTN', user?.phone || '');
      setShowAction(null);
      setAmount('');
    } catch (e: any) { storage.broadcast('GLOBAL_ALERT', { message: e.message, type: 'ERROR' }); }
    setIsProcessing(false);
  };

  const handleVerify = async () => {
    setIsProcessing(true);
    // Simulate complex check
    await new Promise(r => setTimeout(r, 2500));
    await storage.setMetadata(`wa_verified_${user!.id}`, true);
    setIsVerified(true);
    setShowAction(null);
    storage.broadcast('GLOBAL_ALERT', { message: 'Trust Handshake Complete. Node Verified.', type: 'SUCCESS' });
    setIsProcessing(false);
  };

  return (
    <div className="px-6 py-10 space-y-8 max-w-lg mx-auto pb-32">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-[900] text-slate-950 tracking-tighter">Vault</h1>
        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center cursor-pointer" onClick={() => navigate(-1)}><svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></div>
      </header>

      <div className="relative aspect-[16/9] bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px]"></div>
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-4">Amasampo Node Balance</p>
            <h2 className="text-6xl font-[900] tracking-tighter text-glow">{loading ? '...' : formatPrice(balance, currency)}</h2>
          </div>
          <div className="flex justify-between items-center">
             <div className={`px-4 py-2 rounded-2xl border ${isVerified ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400'}`}>
               <p className="text-[8px] font-black uppercase tracking-widest">{isVerified ? '✅ Trusted Hub' : '🛡️ Standard Node'}</p>
             </div>
             {!isVerified && (
               <button onClick={() => setShowAction('VERIFY')} className="px-6 py-2 bg-emerald-600 text-white text-[9px] font-black rounded-xl uppercase tracking-widest animate-pulse">Verify Node</button>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setShowAction('DEPOSIT')} className="bento-card p-8 flex flex-col items-center gap-4 group transition-all bg-white"><div className="w-16 h-16 bg-emerald-50 rounded-[1.8rem] flex items-center justify-center text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Add Funds</span></button>
        <button onClick={() => setShowAction('WITHDRAW')} className="bento-card p-8 flex flex-col items-center gap-4 group transition-all bg-white"><div className="w-16 h-16 bg-rose-50 rounded-[1.8rem] flex items-center justify-center text-rose-600 transition-colors group-hover:bg-rose-600 group-hover:text-white"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" /></svg></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Cash Out</span></button>
      </div>

      <section className="bento-card p-10 space-y-8 bg-white">
        <div className="flex items-center justify-between"><h2 className="text-[11px] font-[900] text-slate-900 uppercase tracking-widest">Node Ledger</h2></div>
        <div className="space-y-6">
          {transactions.length > 0 ? transactions.map(tx => (
            <div key={tx.id} className="flex items-center justify-between animate-in slide-in-from-right-4">
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${tx.type === 'DEPOSIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{tx.type === 'DEPOSIT' ? '💰' : '💳'}</div>
                <div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-slate-900 truncate">{tx.description}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(tx.timestamp).toLocaleDateString()}</p></div>
              </div>
              <p className={`text-lg font-black tracking-tighter ml-4 ${tx.type === 'DEPOSIT' ? 'text-emerald-500' : 'text-slate-950'}`}>{tx.type === 'DEPOSIT' ? '+' : '-'}{formatPrice(tx.amount, currency)}</p>
            </div>
          )) : <div className="py-12 text-center opacity-20 font-black text-[10px] uppercase">Quiet Mesh</div>}
        </div>
      </section>

      {showAction && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-6 bg-slate-950/40 backdrop-blur-xl animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-[3.5rem] p-12 space-y-10 animate-in slide-in-from-bottom-20 shadow-2xl">
            {showAction === 'VERIFY' ? (
              <div className="space-y-8 text-center">
                 <div className="w-24 h-24 bg-emerald-100 rounded-full mx-auto flex items-center justify-center text-5xl">🛡️</div>
                 <div>
                   <h3 className="text-3xl font-[900] tracking-tighter text-slate-950 uppercase">Trust Protocol</h3>
                   <p className="text-sm text-slate-500 font-medium mt-2">Sync your official identity to become a Verified Hub Owner. Boosts reach by 300%.</p>
                 </div>
                 <button onClick={handleVerify} disabled={isProcessing} className="w-full py-8 bg-emerald-600 text-white font-black rounded-[2.5rem] shadow-2xl transition-all text-sm uppercase tracking-[0.2em]">{isProcessing ? 'SCANNING IDENTITY...' : 'Authorize Sync'}</button>
                 <button onClick={() => setShowAction(null)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancel</button>
              </div>
            ) : (
              <div className="space-y-8">
                <header className="flex justify-between items-center"><h3 className="text-3xl font-[900] tracking-tighter text-slate-950 uppercase">{showAction}</h3><button disabled={isProcessing} onClick={() => setShowAction(null)} className="p-3 bg-slate-50 rounded-2xl"><svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></header>
                <div className="space-y-4"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Enter Amount (ZK)</label><input autoFocus disabled={isProcessing} type="number" className="w-full text-center text-7xl font-[900] tracking-tighter outline-none text-slate-950 placeholder:text-slate-100 bg-transparent" placeholder="00" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                <button onClick={handleExecute} disabled={isProcessing || !amount} className={`w-full py-8 text-white font-black rounded-[2.5rem] shadow-2xl transition-all text-sm uppercase tracking-[0.2em] ${isProcessing ? 'bg-emerald-600' : 'bg-slate-950'}`}>{isProcessing ? 'SYNCING...' : 'Confirm Handshake'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;

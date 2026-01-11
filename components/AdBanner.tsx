
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';

interface AdBannerProps {
  slot?: string;
  type?: 'BANNER' | 'RECTANGLE';
}

const MOCK_ADS = [
  { company: 'Zamtel Mesh', text: 'Unlimited Data for Hustlers. 5G Sync active.', cta: 'Upgrade', icon: '📡' },
  { company: 'Stanbic Bank', text: 'Quick Gigs, Faster Loans. Apply in-mesh.', cta: 'Check', icon: '🏦' },
  { company: 'Airtel Money', text: 'Send ZK across the mesh with 0% fees.', cta: 'Sync', icon: '💸' },
  { company: 'MTN MoMo', text: 'Cash out at any node with Amasampo Pay.', cta: 'Active', icon: '📱' }
];

const AdBanner: React.FC<AdBannerProps> = ({ slot = "home_bottom", type = 'BANNER' }) => {
  const [adIdx, setAdIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const rotateAd = () => {
    setAdIdx(prev => (prev + 1) % MOCK_ADS.length);
  };

  useEffect(() => {
    // Log impression for Admin analytics
    const logImpression = async () => {
      const rev = await storage.getMetadata('ad_revenue') || 0;
      // Professional Yield: Approximately $0.05 simulated yield per impression cluster
      await storage.setMetadata('ad_revenue', rev + 0.05);
    };
    
    if (isVisible) logImpression();

    const interval = setInterval(rotateAd, 15000);
    return () => clearInterval(interval);
  }, [isVisible]);

  const ad = MOCK_ADS[adIdx];

  if (!isVisible) return null;

  return (
    <div className={`relative w-full overflow-hidden transition-all duration-700 animate-in fade-in slide-in-from-bottom-4 ${type === 'BANNER' ? 'h-24' : 'h-64'}`}>
      <div className="absolute inset-0 bg-slate-900 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden flex items-center px-6 group">
        <div className="absolute top-2 right-4 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
           <span className="text-[7px] font-black text-white uppercase tracking-widest">Sponsored Node</span>
           <button onClick={() => setIsVisible(false)} className="text-white hover:text-rose-500 transition-colors">
             <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
        
        <div className="flex items-center gap-4 w-full">
           <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-xl border border-white/10 shrink-0 group-hover:scale-110 transition-transform">
             {ad.icon}
           </div>
           <div className="flex-1 min-w-0">
              <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest truncate">{ad.company}</h4>
              <p className="text-xs font-bold text-white/80 line-clamp-1">{ad.text}</p>
           </div>
           <button className="px-5 py-2.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg active:scale-90 transition-all shrink-0 hover:bg-emerald-500">
             {ad.cta}
           </button>
        </div>
        
        {/* AdMob Visual Progress Indicators */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500/10">
           <div key={adIdx} className="h-full bg-emerald-500 animate-[progress_15s_linear]" style={{ width: '0%' }}></div>
        </div>
      </div>
      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default AdBanner;

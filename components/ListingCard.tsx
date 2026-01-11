
import React, { useState, useEffect } from 'react';
import { Listing } from '../types';
import { formatPrice } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';
import { formatRelativeTime } from '../utils/format';

interface ListingCardProps {
  listing: Listing & { isMeshDiscovery?: boolean };
  onClick: () => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onClick }) => {
  const { currency } = useAuth();
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    const checkFav = async () => {
      const favs = await storage.getFavorites();
      setIsFav(favs.some(f => f.id === listing.id));
    };
    checkFav();
    return storage.subscribe(checkFav);
  }, [listing.id]);

  const toggleFav = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await storage.toggleFavorite(listing);
    setIsFav(result);
  };

  return (
    <div 
      onClick={onClick}
      className={`group relative bg-[#0f172a] rounded-[2.5rem] border ${listing.isBoosted ? 'border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-white/5'} overflow-hidden shadow-2xl transition-all duration-500 hover:-translate-y-2 active:scale-95 cursor-pointer`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-800">
        <img 
          src={listing.images[0]} 
          alt={listing.title} 
          className="object-cover w-full h-full transition-transform duration-1000 group-hover:scale-110 opacity-90 group-hover:opacity-100"
        />
        
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {listing.isBoosted && (
            <div className="bg-emerald-600 px-3 py-1.5 rounded-full shadow-lg border border-emerald-400/30 animate-pulse">
              <span className="text-[8px] font-black text-white uppercase tracking-widest">🚀 BOOSTED NODE</span>
            </div>
          )}
          <div className="glass px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{listing.category}</span>
          </div>
        </div>

        <button 
          onClick={toggleFav}
          className={`absolute top-4 right-4 p-3 rounded-2xl transition-all shadow-xl z-10 ${isFav ? 'bg-rose-500 text-white' : 'glass text-slate-400 hover:text-rose-500'}`}
        >
          <svg className="w-5 h-5" fill={isFav ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      <div className="p-5 space-y-2">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-white leading-tight line-clamp-1">{listing.title}</h3>
          {listing.shortDescription && (
            <p className="text-[10px] font-bold text-slate-500 line-clamp-1 tracking-tight italic">
              {listing.shortDescription}
            </p>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
           <div className="space-y-0.5">
             <p className={`text-lg font-black tracking-tighter ${listing.isBoosted ? 'text-emerald-400' : 'text-white'}`}>
               {formatPrice(listing.price, currency)}
             </p>
             <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
               {formatRelativeTime(listing.createdAt)}
             </p>
           </div>
           <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-800 px-2.5 py-1.5 rounded-xl border border-white/5">
             📍 {listing.location.split(',')[0]}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;

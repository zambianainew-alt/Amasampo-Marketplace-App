
import React, { useState, useEffect } from 'react';
import { MOCK_LISTINGS, CATEGORIES } from '../constants';
import ListingCard from '../components/ListingCard';
import { useNavigate } from 'react-router-dom';
import { getIntelligentSearch } from '../services/gemini';
import { storage } from '../services/storage';
import { ListingType } from '../types';

const Explore: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [allListings, setAllListings] = useState<any[]>([]);
  const [filteredListings, setFilteredListings] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [activeType, setActiveType] = useState<ListingType | 'ALL'>('ALL');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [selectedRegion, setSelectedRegion] = useState('ALL');

  const REGIONS = ['ALL', 'Lusaka', 'Kitwe', 'Ndola', 'Livingstone', 'Chipata', 'Kabwe', 'Solwezi'];

  const loadAllData = async () => {
    const custom = await storage.getAllListings();
    const combined = [...custom];
    MOCK_LISTINGS.forEach(mock => {
      if (!combined.find(c => c.id === mock.id)) combined.push(mock);
    });
    setAllListings(combined);
    applyFilters(combined, query);
  };

  useEffect(() => {
    loadAllData();
    return storage.subscribe(loadAllData);
  }, []);

  const applyFilters = (listings: any[], currentQuery: string) => {
    let result = [...listings];

    if (currentQuery.trim() && !isSearching) {
      const q = currentQuery.toLowerCase();
      result = result.filter(l => 
        l.title.toLowerCase().includes(q) || 
        l.description.toLowerCase().includes(q)
      );
    }

    if (activeType !== 'ALL') result = result.filter(l => l.type === activeType);
    result = result.filter(l => {
      if (typeof l.price === 'string') return true;
      return l.price >= priceRange[0] && l.price <= priceRange[1];
    });
    if (selectedRegion !== 'ALL') result = result.filter(l => l.location.toLowerCase().includes(selectedRegion.toLowerCase()));

    // MONETIZATION LOGIC: Prioritize Boosted Nodes at the top of the feed
    result.sort((a, b) => {
      if (a.isBoosted === b.isBoosted) return b.createdAt.localeCompare(a.createdAt);
      return a.isBoosted ? -1 : 1;
    });

    setFilteredListings(result);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim()) {
        setIsSearching(true);
        try {
          const relevantIds = await getIntelligentSearch(query, allListings);
          const aiFiltered = allListings.filter(l => relevantIds.includes(l.id));
          applyFilters(aiFiltered, query);
        } catch (e) {
          applyFilters(allListings, query);
        } finally {
          setIsSearching(false);
        }
      } else {
        applyFilters(allListings, query);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, activeType, priceRange, selectedRegion, allListings]);

  return (
    <div className="px-6 py-8 space-y-8 max-w-2xl mx-auto pb-32 bg-[#020617] text-slate-100">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-1">Global Market Explorer</p>
          <h1 className="text-4xl font-[900] text-white tracking-tighter uppercase leading-none">Discover</h1>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20">
           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
           <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Discovery Active</span>
        </div>
      </header>

      <div className="sticky top-[72px] z-40 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3 p-5 bg-slate-900 border border-white/5 rounded-[2rem] shadow-2xl focus-within:ring-4 ring-emerald-500/10 transition-all group">
            <svg className={`w-6 h-6 ${isSearching ? 'text-emerald-500 animate-spin' : 'text-slate-500 group-focus-within:text-emerald-500'} transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              {isSearching ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              )}
            </svg>
            <input 
              type="text"
              className="w-full text-sm outline-none bg-transparent font-bold text-white placeholder:text-slate-700"
              placeholder="Query the mesh..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`w-16 h-16 flex items-center justify-center rounded-[1.8rem] transition-all border shadow-2xl active:scale-90 ${showFilters ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20' : 'bg-slate-900 text-white border-white/5'}`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
          </button>
        </div>

        {showFilters && (
          <div className="animate-in slide-in-from-top-4 duration-300 grid grid-cols-2 gap-4">
            <div className="col-span-2 bento-card p-6 bg-slate-900 border-emerald-500/20">
              <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-4">Price Mesh (ZK)</label>
              <div className="space-y-4">
                <input 
                  type="range" 
                  min="0" 
                  max="50000" 
                  step="500"
                  value={priceRange[1]} 
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between items-center text-[10px] font-black text-emerald-500">
                  <span>ZK 0</span>
                  <span className="bg-slate-950 px-3 py-1 rounded-lg shadow-sm border border-emerald-500/30">UP TO ZK {priceRange[1].toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bento-card p-6 bg-slate-900 border-white/5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Region Lock</label>
              <select 
                value={selectedRegion} 
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full bg-slate-950 border-none outline-none text-xs font-black uppercase tracking-widest text-slate-300 p-2 rounded-xl"
              >
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="bento-card p-6 bg-slate-900 border-white/5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Sector Sync</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(ListingType).slice(0, 4).map(type => (
                  <button 
                    key={type}
                    onClick={() => setActiveType(activeType === type ? 'ALL' : type)}
                    className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-tighter transition-all ${activeType === type ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-600'}`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            
            <button 
              onClick={() => { setActiveType('ALL'); setPriceRange([0, 50000]); setSelectedRegion('ALL'); }}
              className="col-span-2 py-4 bg-slate-800 text-slate-500 font-black rounded-2xl text-[9px] uppercase tracking-widest border border-white/5"
            >
              Reset Protocol
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 pb-20">
        {filteredListings.length > 0 ? (
          filteredListings.map(listing => (
            <div key={listing.id} className="animate-in fade-in zoom-in duration-300">
              <ListingCard listing={listing} onClick={() => navigate(`/listing/${listing.id}`)} />
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-900 rounded-[3rem] flex items-center justify-center mx-auto border border-white/5 shadow-2xl">
                <svg className="w-10 h-10 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <p className="text-xl font-black text-slate-500 tracking-tighter uppercase">No nodes detected.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;

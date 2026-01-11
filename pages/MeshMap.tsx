
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNearbyHustlesOnMap } from '../services/gemini';
import { storage } from '../services/storage';

const MeshMap: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('welding services');
  const [loading, setLoading] = useState(false);
  const [mapData, setMapData] = useState<{ text: string, places: any[] }>({ text: '', places: [] });
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  const handleSearch = async () => {
    if (!coords) {
      storage.broadcast('GLOBAL_ALERT', { message: 'GPS Node not synced.', type: 'ERROR' });
      return;
    }
    setLoading(true);
    const result = await getNearbyHustlesOnMap(query, coords.lat, coords.lng);
    setMapData(result);
    setLoading(false);
  };

  return (
    <div className="px-6 py-8 space-y-8 max-w-2xl mx-auto pb-32">
      <header>
        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-1">Visual Discovery Protocol</p>
        <h1 className="text-4xl font-[900] text-slate-950 tracking-tighter uppercase">Mesh Map</h1>
        <p className="text-sm text-slate-500 font-medium">Locate physical nodes in your sync radius.</p>
      </header>

      <div className="flex gap-3 bg-white p-2 rounded-[2.2rem] border border-slate-100 shadow-xl focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
        <input 
          className="flex-1 bg-transparent border-none outline-none px-6 text-sm font-black text-slate-800 placeholder:text-slate-200"
          placeholder="What are you looking for?"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button 
          onClick={handleSearch}
          disabled={loading || !coords}
          className="w-14 h-14 bg-slate-950 text-white rounded-[1.4rem] flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-20"
        >
          {loading ? (
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          )}
        </button>
      </div>

      {!coords && (
        <div className="bento-card p-10 bg-slate-50 border-slate-100 text-center space-y-4">
           <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center text-2xl shadow-sm">📍</div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
             Syncing your GPS node...<br/>Please allow location access.
           </p>
        </div>
      )}

      {mapData.text && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div className="bento-card p-8 bg-white border-emerald-50 shadow-emerald-500/5">
              <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Mesh Intelligence Analysis
              </h3>
              <p className="text-slate-700 leading-relaxed font-semibold text-lg">{mapData.text}</p>
           </div>

           <div className="grid gap-4">
              {mapData.places.map((chunk, idx) => (
                chunk.maps && (
                  <a 
                    key={idx} 
                    href={chunk.maps.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bento-card p-6 flex items-center justify-between group hover:bg-slate-950 transition-all duration-500 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl group-hover:bg-emerald-500 transition-colors">🏪</div>
                       <div>
                         <h4 className="font-black text-slate-900 tracking-tight group-hover:text-white transition-colors">{chunk.maps.title || "Business Node"}</h4>
                         <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest group-hover:text-emerald-400">View on System Map</p>
                       </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                )
              ))}
           </div>
        </div>
      )}
      
      {!mapData.text && coords && !loading && (
        <div className="py-20 text-center opacity-20">
           <p className="text-[10px] font-black uppercase tracking-[0.3em]">Search to manifest local nodes</p>
        </div>
      )}
    </div>
  );
};

export default MeshMap;

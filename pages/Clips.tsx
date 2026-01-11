
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/storage';
import { Clip, Story } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatRelativeTime } from '../utils/format';

interface HeartBurst {
  id: number;
}

const DEPLOYMENT_STATUSES = [
  "Optimizing Bitrate...",
  "Applying Temporal Trims...",
  "Fragmenting Video Streams...",
  "Generating Peer-to-Peer Hashes...",
  "Syncing with Mesh Gateway...",
  "Broadcasting to Region Zambia Central...",
  "Finalizing Deployment..."
];

const MAX_FILE_SIZE_MB = 50;

const Clips: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [clips, setClips] = useState<Clip[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClipIdx, setActiveClipIdx] = useState(0);
  const [likedStatus, setLikedStatus] = useState<Record<string, boolean>>({});
  const [followedStatus, setFollowedStatus] = useState<Record<string, boolean>>({});
  const [heartBursts, setHeartBursts] = useState<Record<string, HeartBurst[]>>({});
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState<Record<string, boolean>>({});
  const [clipProgress, setClipProgress] = useState<Record<string, number>>({});
  const [clipDuration, setClipDuration] = useState<Record<string, number>>({});
  
  // Story states
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const storyTimerRef = useRef<number | null>(null);

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(DEPLOYMENT_STATUSES[0]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  
  // Trimming states
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [rawDuration, setRawDuration] = useState(0);
  const [uploadPreviewProgress, setUploadPreviewProgress] = useState(0);
  const [isDraggingHandle, setIsDraggingHandle] = useState<'NONE' | 'START' | 'END'>('NONE');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPreviewRef = useRef<HTMLVideoElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ time: number, clipId: string }>({ time: 0, clipId: '' });
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Fix: Separate raw count for logic and formatted count for display to avoid TS errors and fix logic bugs
  const getRawFollowerCount = (ownerId: string, isCurrentlyFollowing: boolean): number => {
    let hash = 0;
    for (let i = 0; i < ownerId.length; i++) {
      hash = ownerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const base = Math.abs(hash % 5000) + 200;
    return isCurrentlyFollowing ? base + 1 : base;
  };

  const getMockFollowerCount = (ownerId: string, isCurrentlyFollowing: boolean): string => {
    const final = getRawFollowerCount(ownerId, isCurrentlyFollowing);
    return final > 1000 ? `${(final / 1000).toFixed(1)}k` : final.toString();
  };

  const MOCK_CLIPS: Clip[] = [
    {
      id: 'clip_1',
      ownerId: 'u2',
      ownerName: 'Zambia Tech',
      ownerPhoto: 'https://ui-avatars.com/api/?name=Zambia+Tech&background=020617&color=fff&bold=true',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      caption: 'Loadshedding? Never heard of it! ☀️ 5kVA full setup ready for delivery in Lusaka.',
      listingId: 'l1',
      likes: 1240,
      views: 5600,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'clip_2',
      ownerId: 'u3',
      ownerName: 'Lusaka Fashion',
      ownerPhoto: 'https://ui-avatars.com/api/?name=Lusaka+Fashion&background=020617&color=fff&bold=true',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      caption: 'Handcrafted Chitenge. Perfect for your next Kitchen Party. 👗✨',
      listingId: 'l2',
      likes: 890,
      views: 3200,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    }
  ];

  const getMockFollowerCountForDisplay = (ownerId: string, isCurrentlyFollowing: boolean) => {
    return getMockFollowerCount(ownerId, isCurrentlyFollowing);
  };

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = { light: [30], medium: [60], heavy: [100] };
      navigator.vibrate(patterns[style]);
    }
  };

  const loadData = async () => {
    const savedClips = await storage.getAllClips();
    setClips([...MOCK_CLIPS, ...savedClips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    
    const savedStories = await storage.getStories();
    const follows = await storage.getFollows();
    const filteredStories = savedStories.filter(s => follows.includes(s.ownerId) || s.ownerId === user?.id);
    setStories(filteredStories);
    
    const status: Record<string, boolean> = {};
    follows.forEach(id => {
      status[id] = true;
    });
    setFollowedStatus(status);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsub = storage.subscribe(loadData);
    return unsub;
  }, [user?.id]);

  useEffect(() => {
    Object.keys(videoRefs.current).forEach((id, index) => {
      const video = videoRefs.current[id];
      if (video) {
        if (index === activeClipIdx) {
          video.play().catch(e => console.log('Auto-play blocked', e));
          setIsPaused(prev => ({ ...prev, [id]: false }));
        } else {
          video.pause();
          video.currentTime = 0;
          setIsPaused(prev => ({ ...prev, [id]: true }));
        }
      }
    });
  }, [activeClipIdx, loading, clips]);

  useEffect(() => {
    if (activeStory) {
      setStoryProgress(0);
      storyTimerRef.current = window.setInterval(() => {
        setStoryProgress(prev => {
          if (prev >= 100) {
            handleCloseStory();
            return 100;
          }
          return prev + 1;
        });
      }, 50);
    } else {
      if (storyTimerRef.current) clearInterval(storyTimerRef.current);
    }
    return () => { if (storyTimerRef.current) clearInterval(storyTimerRef.current); };
  }, [activeStory]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, clientHeight } = scrollRef.current;
      const idx = Math.round(scrollTop / clientHeight);
      if (idx !== activeClipIdx) setActiveClipIdx(idx);
    }
  };

  const handleCloseStory = () => {
    setActiveStory(null);
    setStoryProgress(0);
  };

  const triggerHeartBurst = (clipId: string) => {
    const burstId = Date.now();
    setHeartBursts(prev => ({
      ...prev,
      [clipId]: [...(prev[clipId] || []), { id: burstId }]
    }));
    setTimeout(() => {
      setHeartBursts(prev => ({
        ...prev,
        [clipId]: (prev[clipId] || []).filter(h => h.id !== burstId)
      }));
    }, 800);
  };

  const handleVideoTap = (clipId: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (lastTapRef.current.clipId === clipId && (now - lastTapRef.current.time) < DOUBLE_TAP_DELAY) {
      if (!likedStatus[clipId]) setLikedStatus(prev => ({ ...prev, [clipId]: true }));
      triggerHeartBurst(clipId);
    } else {
      togglePlayPause(clipId);
    }
    lastTapRef.current = { time: now, clipId };
  };

  const togglePlayPause = (clipId: string) => {
    const video = videoRefs.current[clipId];
    if (video) {
      if (video.paused) {
        video.play();
        setIsPaused(prev => ({ ...prev, [clipId]: false }));
      } else {
        video.pause();
        setIsPaused(prev => ({ ...prev, [clipId]: true }));
      }
    }
  };

  const handleTimeUpdate = (clipId: string) => {
    const video = videoRefs.current[clipId];
    if (video) {
      setClipProgress(prev => ({ ...prev, [clipId]: video.currentTime }));
    }
  };

  const handleLoadedMetadata = (clipId: string) => {
    const video = videoRefs.current[clipId];
    if (video) {
      setClipDuration(prev => ({ ...prev, [clipId]: video.duration }));
    }
  };

  const handleSeek = (clipId: string, value: string) => {
    const video = videoRefs.current[clipId];
    if (video) {
      const time = parseFloat(value);
      video.currentTime = time;
      setClipProgress(prev => ({ ...prev, [clipId]: time }));
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 10);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}.${milliseconds}`;
  };

  const toggleLike = (clipId: string) => {
    setLikedStatus(prev => ({ ...prev, [clipId]: !prev[clipId] }));
  };

  const toggleFollow = (ownerId: string, ownerName: string) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    const isFollowing = !followedStatus[ownerId];
    setFollowedStatus(prev => ({ ...prev, [ownerId]: isFollowing }));
    storage.toggleFollow(ownerId);
    storage.broadcast('GLOBAL_ALERT', { 
      message: isFollowing ? `Syncing with ${ownerName}'s node...` : `Unlinked from ${ownerName}.`, 
      type: 'SUCCESS' 
    });
  };

  const handleShare = async (clip: Clip) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = clip.listingId ? `${baseUrl}#/listing/${clip.listingId}` : `${baseUrl}#/vibes`;
    const shareData = {
      title: `Amasampo | Hustle by ${clip.ownerName}`,
      text: `${clip.caption}\n\nCheck this out on Amasampo!`,
      url: shareUrl,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        storage.broadcast('GLOBAL_ALERT', { message: 'Product link copied!', type: 'SUCCESS' });
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      storage.broadcast('GLOBAL_ALERT', { message: 'Link copied to clipboard!', type: 'SUCCESS' });
    }
  };

  const handleAddStory = () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const newStory: Story = {
            id: `story_${Date.now()}`,
            ownerId: user!.id,
            ownerName: user!.name,
            ownerPhoto: user!.photoUrl,
            imageUrl: reader.result as string,
            createdAt: new Date().toISOString()
          };
          await storage.saveStory(newStory);
          storage.broadcast('GLOBAL_ALERT', { message: 'Story updated on the mesh!', type: 'SUCCESS' });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleFileClick = () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setUploadError("Format rejected. Please select a valid video node.");
        return;
      }
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > MAX_FILE_SIZE_MB) {
        setUploadError(`Payload too large. Max allowed size: ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      if (selectedVideo) URL.revokeObjectURL(selectedVideo);
      const url = URL.createObjectURL(file);
      setSelectedVideo(url);
      setShowUploadModal(true);
    }
  };

  const handleUploadPreviewMetadata = (e: any) => {
    const duration = e.target.duration;
    setRawDuration(duration);
    setTrimStart(0);
    setTrimEnd(duration);
  };

  const handleUploadPreviewTimeUpdate = (e: any) => {
    const video = e.target as HTMLVideoElement;
    setUploadPreviewProgress(video.currentTime);
    // Force loop within trim bounds when NOT dragging handles
    if (isDraggingHandle === 'NONE') {
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
        video.play();
      } else if (video.currentTime < trimStart) {
        video.currentTime = trimStart;
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedVideo || !user) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        const statusIdx = Math.floor((i / 100) * (DEPLOYMENT_STATUSES.length - 1));
        setUploadStatus(DEPLOYMENT_STATUSES[statusIdx]);
        await new Promise(r => setTimeout(r, 200));
      }
      const newClip: Clip = {
        id: `clip_${Date.now()}`,
        ownerId: user.id,
        ownerName: user.name,
        ownerPhoto: user.photoUrl,
        videoUrl: selectedVideo, 
        caption: caption || 'Hustle update! 🚀',
        likes: 0,
        views: 0,
        createdAt: new Date().toISOString()
      };
      await storage.saveClip(newClip);
      setIsUploading(false);
      setShowUploadModal(false);
      setSelectedVideo(null);
      setCaption('');
      storage.broadcast('GLOBAL_ALERT', { message: 'Clip deployed to mesh!', type: 'SUCCESS' });
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(err.message || "Deployment failed.");
    }
  };

  const handleTrimHandleMove = (e: React.ChangeEvent<HTMLInputElement>, type: 'START' | 'END') => {
    const val = parseFloat(e.target.value);
    if (type === 'START') {
      if (val < trimEnd - 0.5) {
        setTrimStart(val);
        if (uploadPreviewRef.current) uploadPreviewRef.current.currentTime = val;
      }
    } else {
      if (val > trimStart + 0.5) {
        setTrimEnd(val);
        if (uploadPreviewRef.current) uploadPreviewRef.current.currentTime = val;
      }
    }
    triggerHaptic('light');
  };

  const snapStartToCurrent = () => {
    if (uploadPreviewRef.current) {
      const current = uploadPreviewRef.current.currentTime;
      if (current < trimEnd - 0.5) {
        setTrimStart(current);
        triggerHaptic('medium');
      }
    }
  };

  const snapEndToCurrent = () => {
    if (uploadPreviewRef.current) {
      const current = uploadPreviewRef.current.currentTime;
      if (current > trimStart + 0.5) {
        setTrimEnd(current);
        triggerHaptic('medium');
      }
    }
  };

  if (loading) return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {/* Top Controls & Stories Bar */}
      <div className="absolute top-12 left-0 right-0 z-40 px-6 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="w-14 h-14 glass rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl active:scale-90 transition-all border border-white/20"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button 
            onClick={handleFileClick}
            className="w-14 h-14 bg-emerald-600 rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl active:scale-90 transition-all border border-emerald-500/50"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </button>
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl active:scale-90 transition-all border border-white/20"
          >
            {isMuted ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
          <input type="file" accept="video/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        </div>

        {/* Stories Horizontal Feed */}
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
           <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
             <button 
               onClick={handleAddStory}
               className="w-16 h-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center bg-white/5 backdrop-blur-md active:scale-90 transition-all"
             >
               <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
               </div>
             </button>
             <span className="text-[8px] font-black text-white uppercase tracking-widest drop-shadow-md">New Story</span>
           </div>

           {stories.map(story => (
             <div 
               key={story.id} 
               className="flex-shrink-0 flex flex-col items-center gap-1.5"
               onClick={(e) => { e.stopPropagation(); setActiveStory(story); }}
             >
               <div className="w-16 h-16 rounded-full p-0.5 border-2 border-emerald-500 shadow-xl cursor-pointer active:scale-95 transition-all overflow-hidden bg-black/20 backdrop-blur-sm">
                 <img src={story.ownerPhoto} className="w-full h-full rounded-full object-cover border-2 border-transparent" alt="" />
               </div>
               <span className="text-[8px] font-black text-white uppercase tracking-widest drop-shadow-md truncate w-16 text-center">{story.ownerName.split(' ')[0]}</span>
             </div>
           ))}
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-[calc(100vh)] overflow-y-scroll snap-y snap-mandatory hide-scrollbar bg-slate-950 overscroll-none"
      >
        {clips.map((clip, i) => (
          <div 
            key={clip.id} 
            className="relative h-[calc(100vh)] w-full snap-start overflow-hidden bg-black"
            onClick={() => handleVideoTap(clip.id)}
          >
            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10"></div>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none z-10"></div>

            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center pointer-events-none">
               <video 
                 ref={el => { videoRefs.current[clip.id] = el; }}
                 src={clip.videoUrl} 
                 loop 
                 muted={isMuted || i !== activeClipIdx}
                 playsInline
                 preload="auto"
                 className="w-full h-full object-cover"
                 onTimeUpdate={() => handleTimeUpdate(clip.id)}
                 onLoadedMetadata={() => handleLoadedMetadata(clip.id)}
               />
            </div>

            {/* Play/Pause Overlay */}
            {isPaused[clip.id] && (
              <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                <div className="w-20 h-20 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 animate-in zoom-in duration-200">
                  <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
            )}

            {/* Heart Bursts */}
            <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
              {(heartBursts[clip.id] || []).map(burst => (
                <div key={burst.id} className="absolute animate-heart-burst text-white">
                   <svg className="w-32 h-32 fill-current filter drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]" viewBox="0 0 24 24">
                     <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                   </svg>
                </div>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="absolute right-6 bottom-40 z-20 flex flex-col items-center gap-6">
               <div className="flex flex-col items-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); toggleLike(clip.id); }} className={`w-14 h-14 backdrop-blur-2xl border rounded-[1.6rem] flex items-center justify-center shadow-3xl active:scale-75 transition-all ${likedStatus[clip.id] ? 'bg-rose-500 border-rose-400 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}>
                    <svg className="w-7 h-7" fill={likedStatus[clip.id] ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  </button>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${likedStatus[clip.id] ? 'text-rose-400' : 'text-slate-300'}`}>{clip.likes + (likedStatus[clip.id] ? 1 : 0)}</span>
               </div>
               <div className="flex flex-col items-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/chat/new?to=${clip.ownerId}`); }} className="w-14 h-14 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[1.6rem] flex items-center justify-center text-white shadow-3xl active:scale-75 transition-all hover:bg-emerald-600">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  </button>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Deal</span>
               </div>
               <div className="flex flex-col items-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); handleShare(clip); }} className="w-14 h-14 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[1.6rem] flex items-center justify-center text-white shadow-3xl active:scale-75 transition-all hover:bg-emerald-600">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </button>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Share</span>
               </div>
            </div>

            {/* Bottom Info & Controls */}
            <div className="absolute left-6 right-6 bottom-10 z-20 space-y-6">
               <div className="flex flex-col gap-4 pointer-events-auto pr-16">
                 <div onClick={(e) => { e.stopPropagation(); navigate(`/shop/${clip.ownerId}`); }} className="flex items-center gap-4 cursor-pointer group/profile">
                    <div className="relative">
                       <img src={clip.ownerPhoto} className="w-14 h-14 rounded-2xl border-2 border-white/30 shadow-2xl transition-all group-hover/profile:border-emerald-500" alt="" />
                       {/* Fix: Use getRawFollowerCount directly to avoid TS error with parseInt and fix logic correctness */}
                       {getRawFollowerCount(clip.ownerId, false) > 1000 && (
                         <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center shadow-lg">
                           <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                         </div>
                       )}
                    </div>
                    <div className="flex-1">
                       <div className="flex items-center gap-3">
                         <h3 className="text-xl font-black text-white tracking-tight group-hover/profile:text-emerald-400 transition-colors drop-shadow-lg">{clip.ownerName}</h3>
                         <button onClick={(e) => { e.stopPropagation(); toggleFollow(clip.ownerId, clip.ownerName); }} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${followedStatus[clip.ownerId] ? 'bg-emerald-500 text-white shadow-lg' : 'border border-white/40 text-white bg-white/10 backdrop-blur-md hover:bg-white/20'}`}>{followedStatus[clip.ownerId] ? 'Following' : 'Follow'}</button>
                       </div>
                       
                       <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                          {/* Total Views */}
                          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-xl border border-white/10 backdrop-blur-md shadow-sm">
                             <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                               <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                               <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                             </svg>
                             <span className="text-[9px] font-black text-white uppercase tracking-widest">{clip.views > 1000 ? (clip.views / 1000).toFixed(1) + 'k' : clip.views}</span>
                          </div>
                          
                          {/* Total Likes */}
                          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-xl border border-white/10 backdrop-blur-md shadow-sm">
                             <svg className="w-3 h-3 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
                               <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                             </svg>
                             <span className="text-[9px] font-black text-white uppercase tracking-widest">{(clip.likes + (likedStatus[clip.id] ? 1 : 0)) > 1000 ? ((clip.likes + (likedStatus[clip.id] ? 1 : 0)) / 1000).toFixed(1) + 'k' : (clip.likes + (likedStatus[clip.id] ? 1 : 0))}</span>
                          </div>
                          
                          {/* Follower Count */}
                          <div className="flex items-center gap-1.5 bg-emerald-500/20 px-2.5 py-1 rounded-xl border border-emerald-500/20 backdrop-blur-md shadow-sm">
                             <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                               <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                             </svg>
                             <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{getMockFollowerCount(clip.ownerId, !!followedStatus[clip.ownerId])}</span>
                          </div>

                          <div className="flex items-center ml-auto">
                             <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">{formatRelativeTime(clip.createdAt)}</p>
                          </div>
                       </div>
                    </div>
                 </div>
                 <p className="text-sm text-slate-100 font-medium leading-relaxed line-clamp-2 drop-shadow-md">{clip.caption}</p>
               </div>

               {/* Custom Video Playback Controls */}
               <div className="w-full space-y-3 pointer-events-auto">
                 <div className="flex items-center justify-between px-1">
                   <div className="flex items-center gap-4">
                     <button 
                       onClick={(e) => { e.stopPropagation(); togglePlayPause(clip.id); }}
                       className="text-white hover:text-emerald-400 transition-colors drop-shadow-lg"
                     >
                       {isPaused[clip.id] ? (
                         <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                       ) : (
                         <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                       )}
                     </button>
                     <div className="flex items-baseline gap-1.5">
                       <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-lg">{formatTime(clipProgress[clip.id] || 0)}</span>
                       <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">/</span>
                       <span className="text-[10px] font-black text-white/60 uppercase tracking-widest drop-shadow-lg">{formatTime(clipDuration[clip.id] || 0)}</span>
                     </div>
                   </div>
                   {clip.listingId && (
                     <button onClick={(e) => { e.stopPropagation(); navigate(`/listing/${clip.listingId}`); }} className="px-4 py-1.5 bg-emerald-600 hover:bg-white hover:text-emerald-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest shadow-2xl transition-all">
                        Buy Node
                     </button>
                   )}
                 </div>

                 <div className="relative group/seeker px-1">
                    <input 
                      type="range"
                      min="0"
                      max={clipDuration[clip.id] || 0}
                      step="0.01"
                      value={clipProgress[clip.id] || 0}
                      onChange={(e) => { e.stopPropagation(); handleSeek(clip.id, e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer outline-none transition-all accent-emerald-500 hover:h-1.5 overflow-hidden"
                      style={{
                        background: `linear-gradient(to right, #10b981 0%, #10b981 ${(clipProgress[clip.id] || 0) / (clipDuration[clip.id] || 1) * 100}%, rgba(255,255,255,0.2) ${(clipProgress[clip.id] || 0) / (clipDuration[clip.id] || 1) * 100}%, rgba(255,255,255,0.2) 100%)`
                      }}
                    />
                 </div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal with Trimming */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in overflow-y-auto pt-10 pb-10">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-8 shadow-3xl space-y-6 animate-in slide-in-from-bottom-20 my-auto border border-slate-100">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-[900] text-slate-950 tracking-tighter uppercase leading-none">Trim Workspace</h2>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">Precision Asset Preparation</p>
              </div>
              <button onClick={() => { setShowUploadModal(false); setSelectedVideo(null); }} className="p-3 bg-slate-100 rounded-2xl active:scale-90 transition-all">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </header>

            <div className="aspect-[9/16] max-h-[280px] w-full bg-slate-900 rounded-[2.5rem] overflow-hidden border-4 border-slate-50 relative group">
               {selectedVideo && (
                 <video 
                   ref={uploadPreviewRef}
                   src={selectedVideo} 
                   className="w-full h-full object-cover" 
                   autoPlay 
                   loop 
                   muted
                   onLoadedMetadata={handleUploadPreviewMetadata}
                   onTimeUpdate={handleUploadPreviewTimeUpdate}
                 />
               )}
               {/* Playhead Marker */}
               <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div className="h-full bg-emerald-500 transition-all duration-75" style={{ width: `${(uploadPreviewProgress / rawDuration) * 100}%` }}></div>
               </div>
            </div>

            {/* TRIMMING CONTROLS */}
            <div className="space-y-6 bento-card p-6 bg-slate-50 border-slate-100 shadow-inner">
               <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Hustle Segment</h3>
                  <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-widest">
                    {formatTime(trimEnd - trimStart)} Loop
                  </div>
               </div>

               {/* Timeline View */}
               <div className="relative h-20 bg-slate-200 rounded-xl overflow-hidden border border-slate-100">
                  {/* Highlighted Selection area */}
                  <div 
                    className="absolute h-full bg-emerald-500/20 border-x-4 border-emerald-500/60 transition-all"
                    style={{ 
                      left: `${(trimStart / rawDuration) * 100}%`, 
                      width: `${((trimEnd - trimStart) / rawDuration) * 100}%` 
                    }}
                  />
                  
                  {/* Interactive Handle Overlays */}
                  <div className="absolute inset-0 z-20">
                    <input 
                      type="range" min="0" max={rawDuration} step="0.01" value={trimStart}
                      onMouseDown={() => setIsDraggingHandle('START')} onMouseUp={() => setIsDraggingHandle('NONE')}
                      onTouchStart={() => setIsDraggingHandle('START')} onTouchEnd={() => setIsDraggingHandle('NONE')}
                      onChange={(e) => handleTrimHandleMove(e, 'START')}
                      className="absolute inset-x-0 top-0 w-full h-full opacity-0 cursor-pointer z-30 pointer-events-auto"
                    />
                    <input 
                      type="range" min="0" max={rawDuration} step="0.01" value={trimEnd}
                      onMouseDown={() => setIsDraggingHandle('END')} onMouseUp={() => setIsDraggingHandle('NONE')}
                      onTouchStart={() => setIsDraggingHandle('END')} onTouchEnd={() => setIsDraggingHandle('NONE')}
                      onChange={(e) => handleTrimHandleMove(e, 'END')}
                      className="absolute inset-x-0 top-0 w-full h-full opacity-0 cursor-pointer z-40 pointer-events-auto"
                    />
                  </div>

                  {/* Visual Thumb Handles */}
                  <div className="absolute inset-x-0 top-0 pointer-events-none h-full z-10">
                     <div 
                       className="absolute w-8 h-full bg-emerald-500 rounded-lg shadow-xl flex flex-col items-center justify-center -translate-x-4"
                       style={{ left: `${(trimStart / rawDuration) * 100}%` }}
                     >
                        <div className="w-1 h-6 bg-white/50 rounded-full"></div>
                        <div className="absolute -top-6 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">START</div>
                     </div>
                     <div 
                       className="absolute w-8 h-full bg-emerald-500 rounded-lg shadow-xl flex flex-col items-center justify-center -translate-x-4"
                       style={{ left: `${(trimEnd / rawDuration) * 100}%` }}
                     >
                        <div className="w-1 h-6 bg-white/50 rounded-full"></div>
                        <div className="absolute -bottom-6 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">END</div>
                     </div>
                  </div>
               </div>

               {/* Precision Snap Buttons */}
               <div className="flex gap-3">
                  <button 
                    onClick={snapStartToCurrent}
                    className="flex-1 py-4 bg-white border border-slate-100 rounded-2xl flex flex-col items-center gap-1 hover:border-emerald-300 transition-all active:scale-95"
                  >
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mark Current</span>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Set Start</span>
                  </button>
                  <button 
                    onClick={snapEndToCurrent}
                    className="flex-1 py-4 bg-white border border-slate-100 rounded-2xl flex flex-col items-center gap-1 hover:border-emerald-300 transition-all active:scale-95"
                  >
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mark Current</span>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Set End</span>
                  </button>
               </div>

               <div className="flex justify-between items-center px-2">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Trim Start</span>
                    <span className="text-xs font-mono font-bold text-slate-900">{formatTime(trimStart)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Trim End</span>
                    <span className="text-xs font-mono font-bold text-slate-900">{formatTime(trimEnd)}</span>
                  </div>
               </div>
            </div>

            <textarea 
              className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none font-medium text-slate-900 text-sm focus:ring-4 focus:ring-emerald-500/5 transition-all" 
              placeholder="Caption this hustle snippet... ✨" 
              rows={2} 
              value={caption} 
              onChange={(e) => setCaption(e.target.value)} 
            />

            <button 
              onClick={handleUpload} 
              disabled={isUploading} 
              className="w-full py-8 bg-slate-950 text-white font-black rounded-[2.5rem] shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 group"
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>DEPLOYING...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 group-hover:translate-y-[-2px] transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  <span>BROADCAST FRAGMENT</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clips;

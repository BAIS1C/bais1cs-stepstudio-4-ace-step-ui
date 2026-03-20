import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { CreatePanel } from './components/CreatePanel';
import { SongList } from './components/SongList';
import { RightSidebar } from './components/RightSidebar';
import { Player } from './components/Player';
import { LibraryView } from './components/LibraryView';
import { CreatePlaylistModal, AddToPlaylistModal } from './components/PlaylistModals';
import { VideoGeneratorModal } from './components/VideoGeneratorModal';
import { UsernameModal } from './components/UsernameModal';
import { UserProfile } from './components/UserProfile';
import { SettingsModal } from './components/SettingsModal';
import { SongProfile } from './components/SongProfile';
import { Song, GenerationParams, View, Playlist } from './types';
import { generateApi, songsApi, playlistsApi, getAudioUrl } from './services/api';
import { useAuth } from './context/AuthContext';
import { useResponsive } from './context/ResponsiveContext';
import { List } from 'lucide-react';
import { PlaylistDetail } from './components/PlaylistDetail';
import { Toast, ToastType } from './components/Toast';
import { SearchPage } from './components/SearchPage';

/* ═══════════════════════════════════════════════════════════════
   DEMO MODE — detected when embedded in Strands demoOS
   Prepopulates the library with Strands soundtracks and shows
   demo mode indicators for temporary storage.
   ═══════════════════════════════════════════════════════════════ */
const IS_DEMO = typeof window !== 'undefined' && (
  window.location.pathname.startsWith('/stepstudio') ||
  window.parent !== window // iframe
);

const STRANDS_DEMO_TRACKS: Song[] = [
  { id: 'strands-01', title: 'Aaah-Hole (K.A.R.R.S ARABESQUE PROG MIX)', lyrics: '', style: 'Progressive Electronic', audioUrl: '/audio/soundtrack/Aaah-Hole.mp3', coverUrl: '', duration: '4:20', createdAt: new Date('2026-01-01'), tags: ['strands', 'prog'], isPublic: true, likeCount: 42, viewCount: 120, creator: 'SpacemanTheDJ' },
  { id: 'strands-02', title: 'Dot dot dot! (National Lumpinis Squeak Mix)', lyrics: '', style: 'Experimental', audioUrl: '/audio/soundtrack/Dash Dot.mp3', coverUrl: '', duration: '3:45', createdAt: new Date('2026-01-02'), tags: ['strands', 'morse'], isPublic: true, likeCount: 38, viewCount: 95, creator: 'SpacemanTheDJ' },
  { id: 'strands-03', title: 'Hack the Lie (NIN Compoop mix)', lyrics: '', style: 'Industrial', audioUrl: '/audio/soundtrack/Hack the Lie.mp3', coverUrl: '', duration: '4:10', createdAt: new Date('2026-01-03'), tags: ['strands', 'industrial'], isPublic: true, likeCount: 56, viewCount: 180, creator: 'SpacemanTheDJ' },
  { id: 'strands-04', title: 'Dot dot dot! (Looks Eastern Euro I like Mix)', lyrics: '', style: 'Eastern Electronic', audioUrl: '/audio/soundtrack/Nation.mp3', coverUrl: '', duration: '3:55', createdAt: new Date('2026-01-04'), tags: ['strands', 'eastern'], isPublic: true, likeCount: 33, viewCount: 88, creator: 'SpacemanTheDJ' },
  { id: 'strands-05', title: 'Noisy Nation (Dot Dot Dash Mix)', lyrics: '', style: 'Noise Electronic', audioUrl: '/audio/soundtrack/Noisy Nation (dash dot mix).mp3', coverUrl: '', duration: '3:30', createdAt: new Date('2026-01-05'), tags: ['strands', 'noise'], isPublic: true, likeCount: 29, viewCount: 72, creator: 'SpacemanTheDJ' },
  { id: 'strands-06', title: 'Nya Nya Strands Bed Remix', lyrics: '', style: 'Ambient', audioUrl: '/audio/soundtrack/Nya Nya Strands Bed Remix.mp3', coverUrl: '', duration: '5:00', createdAt: new Date('2026-01-06'), tags: ['strands', 'ambient'], isPublic: true, likeCount: 45, viewCount: 134, creator: 'SpacemanTheDJ' },
  { id: 'strands-07', title: 'Drift Away (Dawns Fender Bender Mix)', lyrics: '', style: 'Chill Electronic', audioUrl: '/audio/soundtrack/Strands Drift Away.mp3', coverUrl: '', duration: '4:30', createdAt: new Date('2026-01-07'), tags: ['strands', 'chill'], isPublic: true, likeCount: 67, viewCount: 210, creator: 'SpacemanTheDJ' },
  { id: 'strands-08', title: 'Strands Investigation Bed', lyrics: '', style: 'Soundtrack', audioUrl: '/audio/soundtrack/Strands Investigation Bed.mp3', coverUrl: '', duration: '3:20', createdAt: new Date('2026-01-08'), tags: ['strands', 'soundtrack'], isPublic: true, likeCount: 24, viewCount: 65, creator: 'SpacemanTheDJ' },
  { id: 'strands-09', title: 'XYZ (Scatty XYZ miix)', lyrics: '', style: 'Game Theme', audioUrl: '/audio/soundtrack/Strands The Game (Scatty mcMuffin Mix) - Spaceman The DJ.mp3', coverUrl: '', duration: '4:45', createdAt: new Date('2026-01-09'), tags: ['strands', 'game'], isPublic: true, likeCount: 51, viewCount: 155, creator: 'SpacemanTheDJ' },
  { id: 'strands-10', title: 'XG Tweak Something Aint Wuxia', lyrics: '', style: 'Wuxia Electronic', audioUrl: '/audio/soundtrack/Strands Theme (XG Tweak Something Aint Wuxia Mix).mp3', coverUrl: '', duration: '4:15', createdAt: new Date('2026-01-10'), tags: ['strands', 'wuxia'], isPublic: true, likeCount: 39, viewCount: 108, creator: 'SpacemanTheDJ' },
  { id: 'strands-11', title: 'StrandsnationXYZ (Spelling Bee Mix)', lyrics: '', style: 'Synthpop', audioUrl: '/audio/soundtrack/StrandsnationXYZ (Spelling Bee Mix).mp3', coverUrl: '', duration: '3:50', createdAt: new Date('2026-01-11'), tags: ['strands', 'synthpop'], isPublic: true, likeCount: 31, viewCount: 82, creator: 'SpacemanTheDJ' },
  { id: 'strands-12', title: 'Yeah! (Ron Hubbard was a Badass Mix)', lyrics: '', style: 'Synthwave', audioUrl: '/audio/soundtrack/StrandsnationXYZ (Synthwave Morse Mix).mp3', coverUrl: '', duration: '4:00', createdAt: new Date('2026-01-12'), tags: ['strands', 'synthwave'], isPublic: true, likeCount: 48, viewCount: 142, creator: 'SpacemanTheDJ' },
  { id: 'strands-13', title: 'Together (Prog Remix)', lyrics: '', style: 'Progressive', audioUrl: '/audio/soundtrack/Together (Remix).mp3', coverUrl: '', duration: '5:15', createdAt: new Date('2026-01-13'), tags: ['strands', 'prog'], isPublic: true, likeCount: 73, viewCount: 245, creator: 'SpacemanTheDJ' },
  { id: 'strands-14', title: 'Wakawakawaka Phonky', lyrics: '', style: 'Phonk', audioUrl: '/audio/soundtrack/Wakawakawaka Phonky.mp3', coverUrl: '', duration: '3:15', createdAt: new Date('2026-01-14'), tags: ['strands', 'phonk'], isPublic: true, likeCount: 35, viewCount: 97, creator: 'SpacemanTheDJ' },
  { id: 'strands-15', title: 'Strands Theme (Run it Mother f&cker Mix)', lyrics: '', style: 'Breakbeat', audioUrl: '/audio/soundtrack/who is god and why did yu do this.mp3', coverUrl: '', duration: '4:05', createdAt: new Date('2026-01-15'), tags: ['strands', 'breakbeat'], isPublic: true, likeCount: 62, viewCount: 198, creator: 'SpacemanTheDJ' },
];

export default function App() {
  // Responsive
  const { isMobile, isDesktop } = useResponsive();

  // Auth
  const { user, token, isAuthenticated, isLoading: authLoading, setupUser, logout } = useAuth();
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  // Track multiple concurrent generation jobs
  const activeJobsRef = useRef<Map<string, { tempId: string; pollInterval: ReturnType<typeof setInterval> }>>(new Map());
  const [activeJobCount, setActiveJobCount] = useState(0);

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Navigation State - default to create view
  const [currentView, setCurrentView] = useState<View>('create');

  // Content State
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());
  const [playQueue, setPlayQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);

  // Selection State
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('all');

  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  // Mobile UI Toggle
  const [mobileShowList, setMobileShowList] = useState(false);

  // Modals
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);

  // Video Modal
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [songForVideo, setSongForVideo] = useState<Song | null>(null);

  // Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Profile View
  const [viewingUsername, setViewingUsername] = useState<string | null>(null);

  // Song View
  const [viewingSongId, setViewingSongId] = useState<string | null>(null);

  // Playlist View
  const [viewingPlaylistId, setViewingPlaylistId] = useState<string | null>(null);

  // Reuse State
  const [reuseData, setReuseData] = useState<{ song: Song, timestamp: number } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const playNextRef = useRef<() => void>(() => {});

  // Mobile Details Modal State
  const [showMobileDetails, setShowMobileDetails] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  // Show username modal if not authenticated and not loading
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setShowUsernameModal(true);
      // In demo mode, seed the library even before auth
      if (IS_DEMO && songs.length === 0) {
        setSongs(STRANDS_DEMO_TRACKS);
      }
    }
  }, [authLoading, isAuthenticated]);

  // Load Playlists
  useEffect(() => {
    if (token) {
      playlistsApi.getMyPlaylists(token)
        .then(res => setPlaylists(res.playlists))
        .catch(err => console.error('Failed to load playlists', err));
    } else {
      setPlaylists([]);
    }
  }, [token]);

  // Cleanup active jobs on unmount
  useEffect(() => {
    return () => {
      // Clear all polling intervals when component unmounts
      activeJobsRef.current.forEach(({ pollInterval }) => {
        clearInterval(pollInterval);
      });
      activeJobsRef.current.clear();
    };
  }, []);

  const handleShowDetails = (song: Song) => {
    setSelectedSong(song);
    setShowMobileDetails(true);
  };

  // Reuse Handler
  const handleReuse = (song: Song) => {
    setReuseData({ song, timestamp: Date.now() });
    setCurrentView('create');
    setMobileShowList(false);
  };

  // Song Update Handler
  const handleSongUpdate = (updatedSong: Song) => {
    setSongs(prev => prev.map(s => s.id === updatedSong.id ? updatedSong : s));
    if (selectedSong?.id === updatedSong.id) {
      setSelectedSong(updatedSong);
    }
  };

  // Navigate to Profile Handler
  const handleNavigateToProfile = (username: string) => {
    setViewingUsername(username);
    setCurrentView('profile');
    window.history.pushState({}, '', `/@${username}`);
  };

  // Back from Profile Handler
  const handleBackFromProfile = () => {
    setViewingUsername(null);
    setCurrentView('create');
    window.history.pushState({}, '', '/');
  };

  // Navigate to Song Handler
  const handleNavigateToSong = (songId: string) => {
    setViewingSongId(songId);
    setCurrentView('song');
    window.history.pushState({}, '', `/song/${songId}`);
  };

  // Back from Song Handler
  const handleBackFromSong = () => {
    setViewingSongId(null);
    setCurrentView('create');
    window.history.pushState({}, '', '/');
  };

  // Theme Effect
  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // URL Routing Effect
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);

      // Handle ?song= query parameter
      const songParam = params.get('song');
      if (songParam) {
        setViewingSongId(songParam);
        setCurrentView('song');
        window.history.replaceState({}, '', `/song/${songParam}`);
        return;
      }

      if (path === '/create' || path === '/') {
        setCurrentView('create');
        setMobileShowList(false);
      } else if (path === '/library') {
        setCurrentView('library');
      } else if (path.startsWith('/@')) {
        const username = path.substring(2);
        if (username) {
          setViewingUsername(username);
          setCurrentView('profile');
        }
      } else if (path.startsWith('/song/')) {
        const songId = path.substring(6);
        if (songId) {
          setViewingSongId(songId);
          setCurrentView('song');
        }
      } else if (path.startsWith('/playlist/')) {
        const playlistId = path.substring(10);
        if (playlistId) {
          setViewingPlaylistId(playlistId);
          setCurrentView('playlist');
        }
      } else if (path === '/search') {
        setCurrentView('search');
      }
    };

    handleUrlChange();

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Load Songs Effect
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const loadSongs = async () => {
      try {
        const [mySongsRes, likedSongsRes] = await Promise.all([
          songsApi.getMySongs(token),
          songsApi.getLikedSongs(token)
        ]);

        const mapSong = (s: any): Song => ({
          id: s.id,
          title: s.title,
          lyrics: s.lyrics,
          style: s.style,
          coverUrl: `https://picsum.photos/seed/${s.id}/400/400`,
          duration: s.duration && s.duration > 0 ? `${Math.floor(s.duration / 60)}:${String(Math.floor(s.duration % 60)).padStart(2, '0')}` : '0:00',
          createdAt: new Date(s.created_at || s.createdAt),
          tags: s.tags || [],
          audioUrl: getAudioUrl(s.audio_url, s.id),
          isPublic: s.is_public,
          likeCount: s.like_count || 0,
          viewCount: s.view_count || 0,
          userId: s.user_id,
          creator: s.creator,
        });

        const mySongs = mySongsRes.songs.map(mapSong);
        const likedSongs = likedSongsRes.songs.map(mapSong);

        const songsMap = new Map<string, Song>();
        [...mySongs, ...likedSongs].forEach(s => songsMap.set(s.id, s));

        // In demo mode, merge Strands soundtrack as seed library
        if (IS_DEMO) {
          STRANDS_DEMO_TRACKS.forEach(t => {
            if (!songsMap.has(t.id)) songsMap.set(t.id, t);
          });
        }

        // Preserve any generating songs (temp songs)
        setSongs(prev => {
          const generatingSongs = prev.filter(s => s.isGenerating);
          const loadedSongs = Array.from(songsMap.values());
          return [...generatingSongs, ...loadedSongs];
        });

        const likedIds = new Set(likedSongs.map(s => s.id));
        setLikedSongIds(likedIds);

      } catch (error) {
        console.error('Failed to load songs:', error);
        // In demo mode, seed with Strands soundtrack even if API fails
        if (IS_DEMO) {
          setSongs(prev => {
            const generatingSongs = prev.filter(s => s.isGenerating);
            return [...generatingSongs, ...STRANDS_DEMO_TRACKS];
          });
        }
      }
    };

    loadSongs();
  }, [isAuthenticated, token]);

  // Player Logic
  const getActiveQueue = (song?: Song) => {
    if (playQueue.length > 0) return playQueue;
    if (song && songs.some(s => s.id === song.id)) return songs;
    return songs;
  };

  const playNext = useCallback(() => {
    if (!currentSong) return;
    const queue = getActiveQueue(currentSong);
    if (queue.length === 0) return;

    const currentIndex = queueIndex >= 0 && queue[queueIndex]?.id === currentSong.id
      ? queueIndex
      : queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex === -1) return;

    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    let nextIndex;
    if (isShuffle) {
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (queue.length > 1 && nextIndex === currentIndex);
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }

    const nextSong = queue[nextIndex];
    setQueueIndex(nextIndex);
    setCurrentSong(nextSong);
    setIsPlaying(true);
  }, [currentSong, queueIndex, isShuffle, repeatMode, playQueue, songs]);

  const playPrevious = useCallback(() => {
    if (!currentSong) return;
    const queue = getActiveQueue(currentSong);
    if (queue.length === 0) return;

    const currentIndex = queueIndex >= 0 && queue[queueIndex]?.id === currentSong.id
      ? queueIndex
      : queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex === -1) return;

    if (currentTime > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }

    let prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * queue.length);
    }

    const prevSong = queue[prevIndex];
    setQueueIndex(prevIndex);
    setCurrentSong(prevSong);
    setIsPlaying(true);
  }, [currentSong, queueIndex, currentTime, isShuffle, playQueue, songs]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  // Audio Setup
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = "anonymous";
    const audio = audioRef.current;
    audio.volume = volume;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const applyPendingSeek = () => {
      if (pendingSeekRef.current === null) return;
      if (audio.seekable.length === 0) return;
      const target = pendingSeekRef.current;
      const safeTarget = Number.isFinite(audio.duration)
        ? Math.min(Math.max(target, 0), audio.duration)
        : Math.max(target, 0);
      audio.currentTime = safeTarget;
      setCurrentTime(safeTarget);
      pendingSeekRef.current = null;
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      applyPendingSeek();
    };

    const onCanPlay = () => {
      applyPendingSeek();
    };

    const onProgress = () => {
      applyPendingSeek();
    };

    const onEnded = () => {
      playNextRef.current();
    };

    const onError = (e: Event) => {
      if (audio.error && audio.error.code !== 1) {
        console.error("Audio playback error:", audio.error);
        if (audio.error.code === 4) {
          showToast('This song is no longer available.', 'error');
        } else {
          showToast('Unable to play this song.', 'error');
        }
      }
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('progress', onProgress);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('progress', onProgress);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Handle Playback State
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong?.audioUrl) return;

    const playAudio = async () => {
      try {
        await audio.play();
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Playback failed:", err);
          if (err.name === 'NotSupportedError') {
            showToast('This song is no longer available.', 'error');
          }
          setIsPlaying(false);
        }
      }
    };

    if (audio.src !== currentSong.audioUrl) {
      audio.src = currentSong.audioUrl;
      audio.load();
      if (isPlaying) playAudio();
    } else {
      if (isPlaying) playAudio();
      else audio.pause();
    }
  }, [currentSong, isPlaying]);

  // Handle Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Helper to cleanup a job and check if all jobs are done
  const cleanupJob = useCallback((jobId: string, tempId: string) => {
    const jobData = activeJobsRef.current.get(jobId);
    if (jobData) {
      clearInterval(jobData.pollInterval);
      activeJobsRef.current.delete(jobId);
    }

    // Remove temp song
    setSongs(prev => prev.filter(s => s.id !== tempId));

    // Update active job count
    setActiveJobCount(activeJobsRef.current.size);

    // If no more active jobs, set isGenerating to false
    if (activeJobsRef.current.size === 0) {
      setIsGenerating(false);
    }
  }, []);

  // Refresh songs list (called when any job completes successfully)
  const refreshSongsList = useCallback(async () => {
    if (!token) return;
    try {
      const response = await songsApi.getMySongs(token);
      const loadedSongs: Song[] = response.songs.map(s => ({
        id: s.id,
        title: s.title,
        lyrics: s.lyrics,
        style: s.style,
        coverUrl: `https://picsum.photos/seed/${s.id}/400/400`,
        duration: s.duration && s.duration > 0 ? `${Math.floor(s.duration / 60)}:${String(Math.floor(s.duration % 60)).padStart(2, '0')}` : '0:00',
        createdAt: new Date(s.created_at),
        tags: s.tags || [],
        audioUrl: getAudioUrl(s.audio_url, s.id),
        isPublic: s.is_public,
        likeCount: s.like_count || 0,
        viewCount: s.view_count || 0,
        userId: s.user_id,
        creator: s.creator,
      }));

      // Preserve any generating songs that aren't in the loaded list
      setSongs(prev => {
        const generatingSongs = prev.filter(s => s.isGenerating);
        const mergedSongs = [...generatingSongs];
        for (const song of loadedSongs) {
          if (!mergedSongs.some(s => s.id === song.id)) {
            mergedSongs.push(song);
          }
        }
        // Sort by creation date, newest first
        return mergedSongs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      });
    } catch (error) {
      console.error('Failed to refresh songs:', error);
    }
  }, [token]);

  // Handlers
  const handleGenerate = async (params: GenerationParams) => {
    if (!isAuthenticated || !token) {
      setShowUsernameModal(true);
      return;
    }

    setIsGenerating(true);
    setCurrentView('create');
    setMobileShowList(false);

    // Create unique temp ID for this job
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempSong: Song = {
      id: tempId,
      title: params.title || 'Generating...',
      lyrics: '',
      style: params.style,
      coverUrl: 'https://picsum.photos/200/200?blur=10',
      duration: '--:--',
      createdAt: new Date(),
      isGenerating: true,
      tags: params.customMode ? ['custom'] : ['simple'],
      isPublic: true
    };

    setSongs(prev => [tempSong, ...prev]);
    setSelectedSong(tempSong);
    setShowRightSidebar(true);

    try {
      const job = await generateApi.startGeneration({
        customMode: params.customMode,
        songDescription: params.songDescription,
        lyrics: params.lyrics,
        style: params.style,
        title: params.title,
        instrumental: params.instrumental,
        vocalLanguage: params.vocalLanguage,
        duration: params.duration,
        bpm: params.bpm,
        keyScale: params.keyScale,
        timeSignature: params.timeSignature,
        inferenceSteps: params.inferenceSteps,
        guidanceScale: params.guidanceScale,
        batchSize: params.batchSize,
        randomSeed: params.randomSeed,
        seed: params.seed,
        thinking: params.thinking,
        audioFormat: params.audioFormat,
        inferMethod: params.inferMethod,
        shift: params.shift,
        lmTemperature: params.lmTemperature,
        lmCfgScale: params.lmCfgScale,
        lmTopK: params.lmTopK,
        lmTopP: params.lmTopP,
        lmNegativePrompt: params.lmNegativePrompt,
        referenceAudioUrl: params.referenceAudioUrl,
        sourceAudioUrl: params.sourceAudioUrl,
        audioCodes: params.audioCodes,
        repaintingStart: params.repaintingStart,
        repaintingEnd: params.repaintingEnd,
        instruction: params.instruction,
        audioCoverStrength: params.audioCoverStrength,
        taskType: params.taskType,
        useAdg: params.useAdg,
        cfgIntervalStart: params.cfgIntervalStart,
        cfgIntervalEnd: params.cfgIntervalEnd,
        customTimesteps: params.customTimesteps,
        useCotMetas: params.useCotMetas,
        useCotCaption: params.useCotCaption,
        useCotLanguage: params.useCotLanguage,
        autogen: params.autogen,
        constrainedDecodingDebug: params.constrainedDecodingDebug,
        allowLmBatch: params.allowLmBatch,
        getScores: params.getScores,
        getLrc: params.getLrc,
        scoreScale: params.scoreScale,
        lmBatchChunkSize: params.lmBatchChunkSize,
        trackName: params.trackName,
        completeTrackClasses: params.completeTrackClasses,
        isFormatCaption: params.isFormatCaption,
      }, token);

      // Poll for completion - each job has its own polling interval
      const pollInterval = setInterval(async () => {
        try {
          const status = await generateApi.getStatus(job.jobId, token);

          // Update queue position on the temp song
          setSongs(prev => prev.map(s => {
            if (s.id === tempId) {
              return {
                ...s,
                queuePosition: status.status === 'queued' ? status.queuePosition : undefined,
              };
            }
            return s;
          }));

          if (status.status === 'succeeded' && status.result) {
            cleanupJob(job.jobId, tempId);
            await refreshSongsList();

            if (window.innerWidth < 768) {
              setMobileShowList(true);
            }
          } else if (status.status === 'failed') {
            cleanupJob(job.jobId, tempId);
            console.error(`Job ${job.jobId} failed:`, status.error);
            showToast(`Generation failed: ${status.error || 'Unknown error'}`, 'error');
          }
        } catch (pollError) {
          console.error(`Polling error for job ${job.jobId}:`, pollError);
          cleanupJob(job.jobId, tempId);
        }
      }, 2000);

      // Track this job
      activeJobsRef.current.set(job.jobId, { tempId, pollInterval });
      setActiveJobCount(activeJobsRef.current.size);

      // Timeout after 10 minutes
      setTimeout(() => {
        if (activeJobsRef.current.has(job.jobId)) {
          console.warn(`Job ${job.jobId} timed out`);
          cleanupJob(job.jobId, tempId);
          showToast('Generation timed out', 'error');
        }
      }, 600000);

    } catch (e) {
      console.error('Generation error:', e);
      setSongs(prev => prev.filter(s => s.id !== tempId));

      // Only set isGenerating to false if no other jobs are running
      if (activeJobsRef.current.size === 0) {
        setIsGenerating(false);
      }
      showToast('Generation failed. Please try again.', 'error');
    }
  };

  const togglePlay = () => {
    if (!currentSong) return;
    setIsPlaying(!isPlaying);
  };

  const playSong = (song: Song, list?: Song[]) => {
    const nextQueue = list && list.length > 0
      ? list
      : (playQueue.length > 0 && playQueue.some(s => s.id === song.id))
          ? playQueue
          : (songs.some(s => s.id === song.id) ? songs : [song]);
    const nextIndex = nextQueue.findIndex(s => s.id === song.id);
    setPlayQueue(nextQueue);
    setQueueIndex(nextIndex);

    if (currentSong?.id !== song.id) {
      const updatedSong = { ...song, viewCount: (song.viewCount || 0) + 1 };
      setCurrentSong(updatedSong);
      setSelectedSong(updatedSong);
      setIsPlaying(true);
      setSongs(prev => prev.map(s => s.id === song.id ? updatedSong : s));
      songsApi.trackPlay(song.id, token).catch(err => console.error('Failed to track play:', err));
    } else {
      togglePlay();
    }
    if (currentSong?.id === song.id) {
      setSelectedSong(song);
    }
    setShowRightSidebar(true);
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isNaN(audio.duration) || audio.readyState < 1 || audio.seekable.length === 0) {
      pendingSeekRef.current = time;
      return;
    }
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const toggleLike = async (songId: string) => {
    if (!token) return;

    const isLiked = likedSongIds.has(songId);

    // Optimistic update
    setLikedSongIds(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(songId);
      else next.add(songId);
      return next;
    });

    setSongs(prev => prev.map(s => {
      if (s.id === songId) {
        const newCount = (s.likeCount || 0) + (isLiked ? -1 : 1);
        return { ...s, likeCount: Math.max(0, newCount) };
      }
      return s;
    }));

    if (selectedSong?.id === songId) {
      setSelectedSong(prev => prev ? {
        ...prev,
        likeCount: Math.max(0, (prev.likeCount || 0) + (isLiked ? -1 : 1))
      } : null);
    }

    // Persist to database
    try {
      await songsApi.toggleLike(songId, token);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Revert on error
      setLikedSongIds(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(songId);
        else next.delete(songId);
        return next;
      });
    }
  };

  const handleDeleteSong = async (song: Song) => {
    if (!token) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${song.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // Call API to delete song
      await songsApi.deleteSong(song.id, token);

      // Remove from songs list
      setSongs(prev => prev.filter(s => s.id !== song.id));

      // Remove from liked songs if it was liked
      setLikedSongIds(prev => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });

      // Handle if deleted song is currently selected
      if (selectedSong?.id === song.id) {
        setSelectedSong(null);
      }

      // Handle if deleted song is currently playing
      if (currentSong?.id === song.id) {
        setCurrentSong(null);
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
      }

      // Remove from play queue if present
      setPlayQueue(prev => prev.filter(s => s.id !== song.id));

      showToast('Song deleted successfully');
    } catch (error) {
      console.error('Failed to delete song:', error);
      showToast('Failed to delete song', 'error');
    }
  };

  const createPlaylist = async (name: string, description: string) => {
    if (!token) return;
    try {
      const res = await playlistsApi.create(name, description, true, token);
      setPlaylists(prev => [res.playlist, ...prev]);

      if (songToAddToPlaylist) {
        await playlistsApi.addSong(res.playlist.id, songToAddToPlaylist.id, token);
        setSongToAddToPlaylist(null);
        playlistsApi.getMyPlaylists(token).then(r => setPlaylists(r.playlists));
      }
      showToast('Playlist created successfully!');
    } catch (error) {
      console.error('Create playlist error:', error);
      showToast('Failed to create playlist', 'error');
    }
  };

  const openAddToPlaylistModal = (song: Song) => {
    setSongToAddToPlaylist(song);
    setIsAddToPlaylistModalOpen(true);
  };

  const addSongToPlaylist = async (playlistId: string) => {
    if (!songToAddToPlaylist || !token) return;
    try {
      await playlistsApi.addSong(playlistId, songToAddToPlaylist.id, token);
      setSongToAddToPlaylist(null);
      showToast('Song added to playlist');
      playlistsApi.getMyPlaylists(token).then(r => setPlaylists(r.playlists));
    } catch (error) {
      console.error('Add song error:', error);
      showToast('Failed to add song to playlist', 'error');
    }
  };

  const handleNavigateToPlaylist = (playlistId: string) => {
    setViewingPlaylistId(playlistId);
    setCurrentView('playlist');
    window.history.pushState({}, '', `/playlist/${playlistId}`);
  };

  const handleBackFromPlaylist = () => {
    setViewingPlaylistId(null);
    setCurrentView('library');
    window.history.pushState({}, '', '/library');
  };

  const openVideoGenerator = (song: Song) => {
    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    }
    setSongForVideo(song);
    setIsVideoModalOpen(true);
  };

  // Handle username setup
  const handleUsernameSubmit = async (username: string) => {
    await setupUser(username);
    setShowUsernameModal(false);
  };

  /* ═══════════════════════════════════════════════════════════════
     VIDEO STUDIO UPLOADER — Local use only. Upload an audio file
     and open the video generator directly, no song record needed.
     ═══════════════════════════════════════════════════════════════ */
  const VideoStudioUploader = ({ onOpenVideoForSong }: { onOpenVideoForSong: (song: Song) => void }) => {
    const [dragOver, setDragOver] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|ogg|m4a|aac)$/i)) {
        return;
      }
      const blobUrl = URL.createObjectURL(file);
      const tempSong: Song = {
        id: `upload-${Date.now()}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        lyrics: '',
        style: 'Uploaded',
        coverUrl: '',
        duration: '0:00',
        createdAt: new Date(),
        tags: ['uploaded'],
        audioUrl: blobUrl,
        isPublic: false,
      };
      onOpenVideoForSong(tempSong);
    };

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ background: '#0a0a0f' }}>
        <div className="max-w-md w-full text-center space-y-6">
          <div style={{ fontSize: '2.5rem', filter: 'grayscale(0.3)' }}>🎬</div>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#00C2FF', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
            Video Studio
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.6 }}>
            Upload an audio file to create a music video with visualizers, effects, and your custom presets.
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: dragOver ? '2px solid #00C2FF' : '2px dashed rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '3rem 2rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: dragOver ? 'rgba(0,194,255,0.06)' : 'rgba(255,255,255,0.02)',
              transform: dragOver ? 'scale(1.02)' : 'scale(1)',
            }}
            onMouseEnter={(e) => { if (!dragOver) { e.currentTarget.style.borderColor = 'rgba(0,194,255,0.4)'; e.currentTarget.style.background = 'rgba(0,194,255,0.03)'; }}}
            onMouseLeave={(e) => { if (!dragOver) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.flac,.ogg,.m4a,.aac,audio/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '2rem', opacity: 0.7 }}>📂</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: dragOver ? '#00C2FF' : '#e5e7eb' }}>
                {dragOver ? 'Drop it here' : 'Drag & drop audio file'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>
                or click to browse · MP3, WAV, FLAC, OGG, M4A
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.6rem', color: '#374151' }}>
            Video is rendered in-browser using WebAssembly FFmpeg. Nothing is uploaded to any server.
          </p>
        </div>
      </div>
    );
  };

  // Render Layout Logic
  const renderContent = () => {
    switch (currentView) {
      case 'library':
        return (
          <LibraryView
            likedSongs={songs.filter(s => likedSongIds.has(s.id))}
            playlists={playlists}
            onPlaySong={playSong}
            onCreatePlaylist={() => {
              setSongToAddToPlaylist(null);
              setIsCreatePlaylistModalOpen(true);
            }}
            onSelectPlaylist={(p) => handleNavigateToPlaylist(p.id)}
          />
        );

      case 'profile':
        if (!viewingUsername) return null;
        return (
          <UserProfile
            username={viewingUsername}
            onBack={handleBackFromProfile}
            onPlaySong={playSong}
            onNavigateToProfile={handleNavigateToProfile}
            onNavigateToPlaylist={handleNavigateToPlaylist}
            currentSong={currentSong}
            isPlaying={isPlaying}
            likedSongIds={likedSongIds}
            onToggleLike={toggleLike}
          />
        );

      case 'playlist':
        if (!viewingPlaylistId) return null;
        return (
          <PlaylistDetail
            playlistId={viewingPlaylistId}
            onBack={handleBackFromPlaylist}
            onPlaySong={playSong}
            onSelect={(s) => {
              setSelectedSong(s);
              setShowRightSidebar(true);
            }}
            onNavigateToProfile={handleNavigateToProfile}
          />
        );

      case 'song':
        if (!viewingSongId) return null;
        return (
          <SongProfile
            songId={viewingSongId}
            onBack={handleBackFromSong}
            onPlay={playSong}
            onNavigateToProfile={handleNavigateToProfile}
            currentSong={currentSong}
            isPlaying={isPlaying}
            likedSongIds={likedSongIds}
            onToggleLike={toggleLike}
          />
        );

      case 'search':
        return (
          <SearchPage
            onPlaySong={playSong}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onNavigateToProfile={handleNavigateToProfile}
            onNavigateToSong={handleNavigateToSong}
            onNavigateToPlaylist={handleNavigateToPlaylist}
          />
        );

      case 'video-studio':
        return <VideoStudioUploader onOpenVideoForSong={(song) => { setSongForVideo(song); setIsVideoModalOpen(true); }} />;

      case 'create':
      default:
        return (
          <div className="flex h-full overflow-hidden relative w-full">
            {/* Create Panel */}
            <div className={`
              ${mobileShowList ? 'hidden md:block' : 'w-full'}
              md:w-[320px] lg:w-[360px] flex-shrink-0 h-full border-r border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-suno-panel relative z-10 transition-colors duration-300
            `}>
              <CreatePanel
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                initialData={reuseData}
              />
            </div>

            {/* Song List */}
            <div className={`
              ${!mobileShowList ? 'hidden md:flex' : 'flex'}
              flex-1 flex-col h-full overflow-hidden bg-white dark:bg-suno-DEFAULT transition-colors duration-300
            `}>
              <SongList
                songs={songs}
                currentSong={currentSong}
                selectedSong={selectedSong}
                likedSongIds={likedSongIds}
                isPlaying={isPlaying}
                onPlay={playSong}
                onSelect={(s) => {
                  setSelectedSong(s);
                  setShowRightSidebar(true);
                }}
                onToggleLike={toggleLike}
                onAddToPlaylist={openAddToPlaylistModal}
                onOpenVideo={openVideoGenerator}
                onShowDetails={handleShowDetails}
                onNavigateToProfile={handleNavigateToProfile}
                onReusePrompt={handleReuse}
                onDelete={handleDeleteSong}
              />
            </div>

            {/* Right Sidebar */}
            {showRightSidebar && (
              <div className="hidden xl:block w-[360px] flex-shrink-0 h-full bg-zinc-50 dark:bg-suno-panel relative z-10 border-l border-zinc-200 dark:border-white/5 transition-colors duration-300">
                <RightSidebar
                  song={selectedSong}
                  onClose={() => setShowRightSidebar(false)}
                  onOpenVideo={() => selectedSong && openVideoGenerator(selectedSong)}
                  onReuse={handleReuse}
                  onSongUpdate={handleSongUpdate}
                  onNavigateToProfile={handleNavigateToProfile}
                  onNavigateToSong={handleNavigateToSong}
                  isLiked={selectedSong ? likedSongIds.has(selectedSong.id) : false}
                  onToggleLike={toggleLike}
                  onPlay={playSong}
                  isPlaying={isPlaying}
                  currentSong={currentSong}
                  onDelete={handleDeleteSong}
                />
              </div>
            )}

            {/* Mobile Toggle Button */}
            <div className="md:hidden absolute top-4 right-4 z-50">
              <button
                onClick={() => setMobileShowList(!mobileShowList)}
                className="bg-zinc-800 text-white px-4 py-2 rounded-full shadow-lg border border-white/10 flex items-center gap-2 text-sm font-bold"
              >
                {mobileShowList ? 'Create Song' : 'View List'}
                <List size={16} />
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-suno-DEFAULT text-zinc-900 dark:text-white font-sans antialiased selection:bg-accent-500/30 transition-colors duration-300">
      {IS_DEMO && (
        <div className="flex items-center justify-center gap-3 px-4 py-1.5 text-[11px] tracking-wider font-medium"
          style={{ background: 'linear-gradient(90deg, rgba(0,194,255,0.08), rgba(139,92,246,0.08), rgba(240,0,184,0.08))', borderBottom: '1px solid rgba(0,194,255,0.12)', color: '#a0aec0' }}>
          <span style={{ color: '#00C2FF' }}>DEMO MODE</span>
          <span>·</span>
          <span>Uploads cleared after generation</span>
          <span>·</span>
          <span>Max 30s · 5 gens/hour</span>
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentView={currentView}
          onNavigate={(v) => {
            setCurrentView(v);
            if (v === 'create') {
              setMobileShowList(false);
              window.history.pushState({}, '', '/');
            } else if (v === 'library') {
              window.history.pushState({}, '', '/library');
            } else if (v === 'search') {
              window.history.pushState({}, '', '/search');
            }
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
          user={user}
          onLogin={() => setShowUsernameModal(true)}
          onLogout={logout}
          onOpenSettings={() => setShowSettingsModal(true)}
        />

        <main className="flex-1 flex overflow-hidden relative">
          {renderContent()}
        </main>
      </div>

      <Player
        currentSong={currentSong}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        onNext={playNext}
        onPrevious={playPrevious}
        volume={volume}
        onVolumeChange={setVolume}
        isShuffle={isShuffle}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        repeatMode={repeatMode}
        onToggleRepeat={() => setRepeatMode(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none')}
        isLiked={currentSong ? likedSongIds.has(currentSong.id) : false}
        onToggleLike={() => currentSong && toggleLike(currentSong.id)}
        onNavigateToSong={handleNavigateToSong}
        onOpenVideo={() => currentSong && openVideoGenerator(currentSong)}
        onReusePrompt={() => currentSong && handleReuse(currentSong)}
        onAddToPlaylist={() => currentSong && openAddToPlaylistModal(currentSong)}
        onDelete={() => currentSong && handleDeleteSong(currentSong)}
      />

      <CreatePlaylistModal
        isOpen={isCreatePlaylistModalOpen}
        onClose={() => setIsCreatePlaylistModalOpen(false)}
        onCreate={createPlaylist}
      />
      <AddToPlaylistModal
        isOpen={isAddToPlaylistModalOpen}
        onClose={() => setIsAddToPlaylistModalOpen(false)}
        playlists={playlists}
        onSelect={addSongToPlaylist}
        onCreateNew={() => {
          setIsAddToPlaylistModalOpen(false);
          setIsCreatePlaylistModalOpen(true);
        }}
      />
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
      />
      <VideoGeneratorModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        song={songForVideo}
      />
      <UsernameModal
        isOpen={showUsernameModal}
        onSubmit={handleUsernameSubmit}
      />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigateToProfile={handleNavigateToProfile}
      />

      {/* Mobile Details Modal */}
      {showMobileDetails && selectedSong && (
        <div className="fixed inset-0 z-50 flex justify-end xl:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowMobileDetails(false)}
          />
          <div className="relative w-full max-w-md h-full bg-zinc-50 dark:bg-suno-panel shadow-2xl animate-in slide-in-from-right duration-300 border-l border-white/10">
            <RightSidebar
              song={selectedSong}
              onClose={() => setShowMobileDetails(false)}
              onOpenVideo={() => selectedSong && openVideoGenerator(selectedSong)}
              onReuse={handleReuse}
              onSongUpdate={handleSongUpdate}
              onNavigateToProfile={handleNavigateToProfile}
              onNavigateToSong={handleNavigateToSong}
              isLiked={selectedSong ? likedSongIds.has(selectedSong.id) : false}
              onToggleLike={toggleLike}
              onPlay={playSong}
              isPlaying={isPlaying}
              currentSong={currentSong}
              onDelete={handleDeleteSong}
            />
          </div>
        </div>
      )}
    </div>
  );
}

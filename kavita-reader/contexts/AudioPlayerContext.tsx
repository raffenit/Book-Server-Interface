import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode,
} from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { absAPI, ABSLibraryItem, ABSAudioTrack, ABSPlaybackSession } from '../services/audiobookshelfAPI';

export interface NowPlaying {
  item: ABSLibraryItem;
  session: ABSPlaybackSession;
  tracks: ABSAudioTrack[];
  trackIndex: number;
}

interface AudioPlayerContextType {
  nowPlaying: NowPlaying | null;
  isPlaying: boolean;
  currentTime: number;       // seconds within current track
  totalTime: number;         // total session duration seconds
  sessionTime: number;       // absolute position across all tracks
  play: (item: ABSLibraryItem, startTime?: number) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;         // seek within current track
  seekSession: (absSeconds: number) => Promise<void>; // seek to absolute session position
  skipForward: (seconds?: number) => Promise<void>;
  skipBack: (seconds?: number) => Promise<void>;
  stop: () => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType>({
  nowPlaying: null,
  isPlaying: false,
  currentTime: 0,
  totalTime: 0,
  sessionTime: 0,
  play: async () => {},
  togglePlayPause: async () => {},
  seek: async () => {},
  seekSession: async () => {},
  skipForward: async () => {},
  skipBack: async () => {},
  stop: async () => {},
});

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const syncInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Computed: absolute position across all tracks
  const sessionTime = (() => {
    if (!nowPlaying) return 0;
    const track = nowPlaying.tracks[nowPlaying.trackIndex];
    return (track?.startOffset ?? 0) + currentTime;
  })();

  // Configure audio session on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    return () => { cleanupSound(); };
  }, []);

  async function cleanupSound() {
    stopSyncInterval();
    if (soundRef.current) {
      try { await soundRef.current.unloadAsync(); } catch {}
      soundRef.current = null;
    }
  }

  function stopSyncInterval() {
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
      syncInterval.current = null;
    }
  }

  function startSyncInterval(session: ABSPlaybackSession) {
    stopSyncInterval();
    syncInterval.current = setInterval(async () => {
      if (!soundRef.current) return;
      try {
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) return;
        const positionSec = (status.positionMillis ?? 0) / 1000;
        await absAPI.syncProgress(session.id, positionSec, session.duration);
      } catch {}
    }, 30000); // sync every 30s
  }

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setCurrentTime((status.positionMillis ?? 0) / 1000);
    setIsPlaying(status.isPlaying ?? false);

    // Auto-advance to next track when one finishes
    if (status.didJustFinish) {
      advanceTrack();
    }
  }, [nowPlaying]);

  async function advanceTrack() {
    setNowPlaying(prev => {
      if (!prev) return prev;
      const nextIndex = prev.trackIndex + 1;
      if (nextIndex >= prev.tracks.length) return prev; // last track
      loadTrack(prev, nextIndex, 0);
      return { ...prev, trackIndex: nextIndex };
    });
  }

  async function loadTrack(np: NowPlaying, trackIndex: number, startPositionSec: number) {
    await cleanupSound();
    const track = np.tracks[trackIndex];
    if (!track) return;

    const uri = absAPI.resolveTrackUrl(track.contentUrl);
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      {
        positionMillis: Math.floor(startPositionSec * 1000),
        shouldPlay: true,
      },
      onPlaybackStatusUpdate,
    );
    soundRef.current = sound;
    setCurrentTime(startPositionSec);
    setTotalTime(track.duration);
    setIsPlaying(true);
    startSyncInterval(np.session);
  }

  const play = useCallback(async (item: ABSLibraryItem, startTime?: number) => {
    // If same item, just resume
    if (nowPlaying?.item.id === item.id && soundRef.current) {
      await soundRef.current.playAsync();
      setIsPlaying(true);
      return;
    }

    await cleanupSound();

    const resumeAt = startTime ?? item.userMediaProgress?.currentTime ?? 0;
    const session = await absAPI.startPlaybackSession(item.id, resumeAt);
    const tracks = session.audioTracks;
    if (!tracks?.length) return;

    // Find which track the resume position falls in
    let trackIndex = 0;
    let offsetWithinTrack = resumeAt;
    for (let i = 0; i < tracks.length; i++) {
      const trackEnd = tracks[i].startOffset + tracks[i].duration;
      if (resumeAt < trackEnd) {
        trackIndex = i;
        offsetWithinTrack = resumeAt - tracks[i].startOffset;
        break;
      }
    }

    const np: NowPlaying = { item, session, tracks, trackIndex };
    setNowPlaying(np);
    await loadTrack(np, trackIndex, offsetWithinTrack);
  }, [nowPlaying]);

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  }, []);

  const seek = useCallback(async (seconds: number) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(Math.max(0, seconds) * 1000);
    setCurrentTime(Math.max(0, seconds));
  }, []);

  const seekSession = useCallback(async (absSeconds: number) => {
    if (!nowPlaying) return;
    const { tracks } = nowPlaying;
    // Find which track this absolute time falls in
    for (let i = 0; i < tracks.length; i++) {
      const trackEnd = tracks[i].startOffset + tracks[i].duration;
      if (absSeconds < trackEnd || i === tracks.length - 1) {
        const offsetWithinTrack = absSeconds - tracks[i].startOffset;
        if (i === nowPlaying.trackIndex) {
          await seek(offsetWithinTrack);
        } else {
          setNowPlaying(prev => prev ? { ...prev, trackIndex: i } : prev);
          await loadTrack(nowPlaying, i, offsetWithinTrack);
        }
        return;
      }
    }
  }, [nowPlaying, seek]);

  const skipForward = useCallback(async (seconds = 30) => {
    if (!soundRef.current || !nowPlaying) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    const pos = (status.positionMillis ?? 0) / 1000;
    const track = nowPlaying.tracks[nowPlaying.trackIndex];
    const remaining = track.duration - pos;
    if (remaining <= seconds) {
      // jump to next track
      await advanceTrack();
    } else {
      await seek(pos + seconds);
    }
  }, [nowPlaying, seek]);

  const skipBack = useCallback(async (seconds = 15) => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    const pos = (status.positionMillis ?? 0) / 1000;
    await seek(Math.max(0, pos - seconds));
  }, [seek]);

  const stop = useCallback(async () => {
    if (nowPlaying?.session) {
      const status = soundRef.current ? await soundRef.current.getStatusAsync().catch(() => null) : null;
      const pos = status?.isLoaded ? (status.positionMillis ?? 0) / 1000 : 0;
      await absAPI.closeSession(nowPlaying.session.id, pos, nowPlaying.session.duration);
    }
    await cleanupSound();
    setNowPlaying(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setTotalTime(0);
  }, [nowPlaying]);

  return (
    <AudioPlayerContext.Provider value={{
      nowPlaying, isPlaying, currentTime, totalTime, sessionTime,
      play, togglePlayPause, seek, seekSession, skipForward, skipBack, stop,
    }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export const useAudioPlayer = () => useContext(AudioPlayerContext);

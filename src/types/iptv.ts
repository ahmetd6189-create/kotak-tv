export interface MediaItem {
  id: string;
  title: string;
  posterUrl: string;
  backdropUrl?: string;
  rating: number; // e.g. 85 for %85
  releaseDate: string; // e.g. "29 Tem 2026"
  genre: string;
  duration?: string;
  description: string;
  type: 'movie' | 'series';
  rank: number;
  seasonCount?: number;
  episodesCount?: number;
  streamUrl?: string;
}

export interface EPGProgram {
  id: string;
  title: string;
  startTime: string; // "22:15"
  endTime: string;   // "04:00"
  progressPercent: number; // 0 to 100
  description: string;
  category: string;
}

export interface Channel {
  id: string;
  name: string;
  logo: string;
  category: string;
  currentProgram: EPGProgram;
  nextProgram?: {
    title: string;
    startTime: string;
  };
  streamUrl: string;
  quality: '4K' | 'FHD' | 'HD';
  isFavorite?: boolean;
  isKidsFriendly?: boolean;
}

export interface CategoryItem {
  id: string;
  name: string;
  channelCount: number;
  badge?: string; // e.g. "CANLI"
  iconName?: string;
  isKidsFriendly?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  url: string;
  type: 'm3u' | 'xtream';
  serverUrl?: string;
  username?: string;
  password?: string;
  addedAt: string;
  channelCount?: number;
}

export type MainTab = 'ANASAYFA' | 'CANLI' | 'FILM' | 'DIZI';
export type BottomNavTab = 'ANASAYFA' | 'EPG' | 'TV KANALI' | 'DAHA FAZLA';

export interface UserProfile {
  id: string;
  name: string;
  type: 'adult' | 'kids';
  avatar: string;
  description: string;
}

export interface EpgReminder {
  id: string;
  programTitle: string;
  channelName: string;
  channelId: string;
  startTime: string;
  date: string;
  createdAt: number;
}

export interface AudioTrack {
  id: string;
  language: string;
  label: string;
  codec: string;
}

export interface SubtitleTrack {
  id: string;
  language: string;
  label: string;
  source: 'embedded' | 'opensubtitles';
  srtText?: string;
}

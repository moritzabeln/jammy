export interface User {
  id: string;
  displayName: string;
  email?: string;
  profileImage?: string;
  spotifyId: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
}

export interface ListeningSession {
  id: string;
  hostId: string;
  hostName: string;
  createdAt: number;
  isActive: boolean;
  participants: string[]; // User IDs
  currentTrack?: SpotifyTrack;
  playbackState?: PlaybackState;
}

export interface PlaybackState {
  isPlaying: boolean;
  progressMs: number;
  timestamp: number;
  trackId?: string;
  trackUri?: string;
  duration?: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt?: string;
  uri: string;
  duration: number;
}

export interface Friend {
  id: string;
  displayName: string;
  profileImage?: string;
  isOnline: boolean;
  currentSessionId?: string;
}

export interface SessionUpdate {
  sessionId: string;
  playbackState: PlaybackState;
  currentTrack?: SpotifyTrack;
  timestamp: number;
}

export interface User {
  id: string;
  displayName: string;
  email?: string;
  profileImage?: string;
  spotifyId: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  isOnline?: boolean;
  lastSeen?: number;
  currentSessionId?: string;
  autoSessionId?: string; // Automatically created session when user opens app
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
  // Server-side timestamp from Firebase (eliminates clock drift)
  serverTimestamp?: number;
  // Client timestamp when update was received (for network delay calculation)
  receivedAt?: number;
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
  autoSessionId?: string; // Friend's auto-created session
  currentTrack?: SpotifyTrack;
  playbackState?: PlaybackState;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserImage?: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export interface SessionUpdate {
  sessionId: string;
  playbackState: PlaybackState;
  currentTrack?: SpotifyTrack;
  timestamp: number;
}

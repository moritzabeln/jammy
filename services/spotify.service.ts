import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { PlaybackState, SpotifyTrack } from '../types';

WebBrowser.maybeCompleteAuthSession();

const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!;

// Platform-specific redirect URIs
const getRedirectUri = () => {
  if (Platform.OS === 'web') {
    // Use HTTPS redirect for web
    return process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI_WEB || 'https://localhost:8081';
  } else {
    // Use exp:// or custom scheme for mobile
    return process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI_MOBILE || makeRedirectUri({ scheme: 'jammy' });
  }
};

const SPOTIFY_REDIRECT_URI = getRedirectUri();

console.log('🌐 Platform:', Platform.OS);
console.log('🔗 Redirect URI:', SPOTIFY_REDIRECT_URI);

// Spotify API endpoints
const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

const scopes = [
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
];

export class SpotifyService {
  private static accessToken: string | null = null;
  private static refreshToken: string | null = null;
  private static tokenExpiresAt: number | null = null;

  // Authentication
  static getAuthConfig() {
    return {
      clientId: SPOTIFY_CLIENT_ID,
      scopes,
      usePKCE: true,
      redirectUri: SPOTIFY_REDIRECT_URI,
      discovery,
    };
  }

  static async setTokens(accessToken: string, refreshToken: string, expiresIn: number) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiresAt = Date.now() + expiresIn * 1000;

    // Store tokens
    await AsyncStorage.setItem('spotify_access_token', accessToken);
    await AsyncStorage.setItem('spotify_refresh_token', refreshToken);
    await AsyncStorage.setItem('spotify_token_expires_at', this.tokenExpiresAt.toString());
  }

  static async loadTokens() {
    try {
      const accessToken = await AsyncStorage.getItem('spotify_access_token');
      const refreshToken = await AsyncStorage.getItem('spotify_refresh_token');
      const expiresAt = await AsyncStorage.getItem('spotify_token_expires_at');

      if (accessToken && refreshToken && expiresAt) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiresAt = parseInt(expiresAt);
        
        // Check if token is expired
        if (this.isTokenExpired()) {
          await this.refreshAccessToken();
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading tokens:', error);
      return false;
    }
  }

  static isTokenExpired(): boolean {
    if (!this.tokenExpiresAt) return true;
    return Date.now() >= this.tokenExpiresAt - 60000; // Refresh 1 minute before expiry
  }

  static async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: SPOTIFY_CLIENT_ID,
      }).toString(),
    });

    const data = await response.json();
    
    if (data.access_token) {
      await this.setTokens(
        data.access_token,
        data.refresh_token || this.refreshToken!,
        data.expires_in
      );
    }
  }

  static async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    
    await AsyncStorage.multiRemove([
      'spotify_access_token',
      'spotify_refresh_token',
      'spotify_token_expires_at',
    ]);
  }

  // API Requests
  private static async makeRequest(endpoint: string, method: string = 'GET', body?: any) {
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }

    console.log(`Making Spotify API request to ${endpoint}`);
    console.log('Access token exists:', !!this.accessToken);
    console.log('Access token (first 20 chars):', this.accessToken?.substring(0, 20));

    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`Response status for ${endpoint}:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Spotify API error for ${endpoint}:`, errorText);
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    // Some endpoints return 204 No Content
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // User Profile
  static async getCurrentUser() {
    return this.makeRequest('/me');
  }

  // Playback State
  static async getCurrentPlayback(): Promise<any> {
    try {
      return await this.makeRequest('/me/player');
    } catch (error) {
      console.error('Error getting current playback:', error);
      return null;
    }
  }

  static async getCurrentlyPlaying(): Promise<SpotifyTrack | null> {
    try {
      const data = await this.makeRequest('/me/player/currently-playing');
      
      if (!data || !data.item) return null;

      return {
        id: data.item.id,
        name: data.item.name,
        artist: data.item.artists.map((a: any) => a.name).join(', '),
        album: data.item.album.name,
        albumArt: data.item.album.images[0]?.url,
        uri: data.item.uri,
        duration: data.item.duration_ms,
      };
    } catch (error) {
      console.error('Error getting currently playing:', error);
      return null;
    }
  }

  static async getPlaybackState(): Promise<PlaybackState | null> {
    try {
      const data = await this.getCurrentPlayback();
      
      if (!data) return null;

      return {
        isPlaying: data.is_playing,
        progressMs: data.progress_ms,
        timestamp: Date.now(),
        trackId: data.item?.id,
        trackUri: data.item?.uri,
        duration: data.item?.duration_ms,
      };
    } catch (error) {
      console.error('Error getting playback state:', error);
      return null;
    }
  }

  // Combined method to get both playback state and track info in one call
  static async getPlaybackStateAndTrack(): Promise<{ 
    state: PlaybackState | null; 
    track: SpotifyTrack | null;
  }> {
    try {
      const data = await this.getCurrentPlayback();
      
      if (!data || !data.item) {
        return { state: null, track: null };
      }

      const state: PlaybackState = {
        isPlaying: data.is_playing,
        progressMs: data.progress_ms,
        timestamp: Date.now(),
        trackId: data.item.id,
        trackUri: data.item.uri,
        duration: data.item.duration_ms,
      };

      const track: SpotifyTrack = {
        id: data.item.id,
        name: data.item.name,
        artist: data.item.artists.map((a: any) => a.name).join(', '),
        album: data.item.album.name,
        albumArt: data.item.album.images[0]?.url,
        uri: data.item.uri,
        duration: data.item.duration_ms,
      };

      return { state, track };
    } catch (error) {
      console.error('Error getting playback state and track:', error);
      return { state: null, track: null };
    }
  }

  // Playback Control
  static async play(trackUri?: string, positionMs?: number) {
    const body: any = {};
    
    if (trackUri) {
      body.uris = [trackUri];
    }
    
    if (positionMs !== undefined) {
      body.position_ms = positionMs;
    }

    return this.makeRequest('/me/player/play', 'PUT', Object.keys(body).length > 0 ? body : undefined);
  }

  static async pause() {
    return this.makeRequest('/me/player/pause', 'PUT');
  }

  static async seek(positionMs: number) {
    return this.makeRequest(`/me/player/seek?position_ms=${positionMs}`, 'PUT');
  }

  static async skipToNext() {
    return this.makeRequest('/me/player/next', 'POST');
  }

  static async skipToPrevious() {
    return this.makeRequest('/me/player/previous', 'POST');
  }

  // Sync playback to match another user's state
  static async syncPlayback(playbackState: PlaybackState, track?: SpotifyTrack) {
    try {
      // If track is different, start playing the new track
      if (track && track.uri) {
        await this.play(track.uri, playbackState.progressMs);
      } else if (playbackState.trackUri) {
        await this.play(playbackState.trackUri, playbackState.progressMs);
      } else {
        // Just seek to position if same track
        await this.seek(playbackState.progressMs);
      }

      // Match play/pause state
      if (!playbackState.isPlaying) {
        await this.pause();
      }
    } catch (error) {
      console.error('Error syncing playback:', error);
    }
  }

  // Get available devices
  static async getDevices() {
    const data = await this.makeRequest('/me/player/devices');
    return data?.devices || [];
  }
}

export { useAuthRequest };

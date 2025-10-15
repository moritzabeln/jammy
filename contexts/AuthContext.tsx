import { signOut as firebaseSignOut, signInAnonymously } from 'firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth } from '../config/firebase';
import { FirebaseService } from '../services/firebase.service';
import { SpotifyService } from '../services/spotify.service';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (accessToken: string, refreshToken: string, expiresIn: number) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const clearError = () => {
    setError(null);
  };

  const loadUser = async () => {
    try {
      setError(null);
      // Sign in to Firebase anonymously first
      await signInAnonymously(auth);
      
      const hasTokens = await SpotifyService.loadTokens();
      
      if (hasTokens) {
        const spotifyUser = await SpotifyService.getCurrentUser();
        
        const userData: User = {
          id: spotifyUser.id,
          spotifyId: spotifyUser.id,
          displayName: spotifyUser.display_name,
          email: spotifyUser.email,
          profileImage: spotifyUser.images?.[0]?.url,
        };

        await FirebaseService.createOrUpdateUser(userData);
        await FirebaseService.updateUserPresence(userData.id, true);
        
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load user session';
      setError(errorMessage);
      await SpotifyService.clearTokens();
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (accessToken: string, refreshToken: string, expiresIn: number) => {
    try {
      setError(null);
      // Sign in to Firebase anonymously first
      await signInAnonymously(auth);
      
      await SpotifyService.setTokens(accessToken, refreshToken, expiresIn);
      const spotifyUser = await SpotifyService.getCurrentUser();
      
      const userData: User = {
        id: spotifyUser.id,
        spotifyId: spotifyUser.id,
        displayName: spotifyUser.display_name,
        email: spotifyUser.email,
        profileImage: spotifyUser.images?.[0]?.url,
      };

      await FirebaseService.createOrUpdateUser(userData);
      await FirebaseService.updateUserPresence(userData.id, true);
      
      setUser(userData);
    } catch (error) {
      console.error('Error signing in:', error);
      let errorMessage = 'Failed to sign in';
      
      if (error instanceof Error) {
        if (error.message.includes('403')) {
          errorMessage = 'Access denied. Please check your Spotify app permissions and scopes.';
        } else if (error.message.includes('401')) {
          errorMessage = 'Invalid credentials. Please try logging in again.';
        } else if (error.message.includes('PERMISSION_DENIED')) {
          errorMessage = 'Firebase permission denied. Please check your database rules.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      if (user) {
        await FirebaseService.updateUserPresence(user.id, false);
      }
      await SpotifyService.clearTokens();
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      setError(errorMessage);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

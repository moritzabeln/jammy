import { get, off, onValue, push, ref, remove, set, update } from 'firebase/database';
import { database } from '../config/firebase';
import { Friend, ListeningSession, PlaybackState, SpotifyTrack, User } from '../types';

export class FirebaseService {
  // User Management
  static async createOrUpdateUser(user: User): Promise<void> {
    const userRef = ref(database, `users/${user.id}`);
    
    // Check if user exists first
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      // User exists - only update specific fields, preserve friends and other data
      console.log('📝 Updating existing user:', user.id);
      await update(userRef, {
        displayName: user.displayName,
        email: user.email,
        profileImage: user.profileImage,
        spotifyId: user.spotifyId,
        lastSeen: Date.now(),
      });
    } else {
      // New user - create with initial data
      console.log('✨ Creating new user:', user.id);
      await set(userRef, {
        displayName: user.displayName,
        email: user.email,
        profileImage: user.profileImage,
        spotifyId: user.spotifyId,
        lastSeen: Date.now(),
        isOnline: false,
        friends: {},
      });
    }
  }

  static async getUser(userId: string): Promise<User | null> {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val() : null;
  }

  static async updateUserPresence(userId: string, isOnline: boolean): Promise<void> {
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, {
      isOnline,
      lastSeen: Date.now(),
    });
  }

  // Session Management
  static async createSession(hostId: string, hostName: string): Promise<string> {
    const sessionsRef = ref(database, 'sessions');
    const newSessionRef = push(sessionsRef);
    const sessionId = newSessionRef.key!;

    const session: ListeningSession = {
      id: sessionId,
      hostId,
      hostName,
      createdAt: Date.now(),
      isActive: true,
      participants: [hostId],
    };

    await set(newSessionRef, session);
    
    // Update user's current session
    await update(ref(database, `users/${hostId}`), {
      currentSessionId: sessionId,
    });

    return sessionId;
  }

  static async joinSession(sessionId: string, userId: string): Promise<void> {
    const participantsRef = ref(database, `sessions/${sessionId}/participants`);
    const snapshot = await get(participantsRef);
    const participants = snapshot.exists() ? snapshot.val() : [];
    
    if (!participants.includes(userId)) {
      participants.push(userId);
      await set(participantsRef, participants);
    }

    // Update user's current session
    await update(ref(database, `users/${userId}`), {
      currentSessionId: sessionId,
    });
  }

  static async leaveSession(sessionId: string, userId: string): Promise<void> {
    const participantsRef = ref(database, `sessions/${sessionId}/participants`);
    const snapshot = await get(participantsRef);
    const participants: string[] = snapshot.exists() ? snapshot.val() : [];
    
    const updatedParticipants = participants.filter(id => id !== userId);
    
    if (updatedParticipants.length === 0) {
      // No participants left, end the session
      await this.endSession(sessionId);
    } else {
      await set(participantsRef, updatedParticipants);
    }

    // Remove user's current session
    await update(ref(database, `users/${userId}`), {
      currentSessionId: null,
    });
  }

  static async endSession(sessionId: string): Promise<void> {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    await update(sessionRef, {
      isActive: false,
    });
  }

  // Playback Sync
  static async updatePlaybackState(
    sessionId: string,
    playbackState: PlaybackState,
    currentTrack?: SpotifyTrack
  ): Promise<void> {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    const update_data: any = {
      playbackState: {
        ...playbackState,
        timestamp: Date.now(),
      },
    };

    if (currentTrack) {
      update_data.currentTrack = currentTrack;
    }

    await update(sessionRef, update_data);
  }

  static subscribeToSession(
    sessionId: string,
    callback: (session: ListeningSession | null) => void
  ): () => void {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    
    onValue(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    });

    // Return unsubscribe function
    return () => off(sessionRef);
  }

  static subscribeToPlaybackState(
    sessionId: string,
    callback: (playbackState: PlaybackState | null) => void
  ): () => void {
    const playbackRef = ref(database, `sessions/${sessionId}/playbackState`);
    
    onValue(playbackRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    });

    return () => off(playbackRef);
  }

  // Get active sessions
  static async getActiveSessions(): Promise<ListeningSession[]> {
    const sessionsRef = ref(database, 'sessions');
    const snapshot = await get(sessionsRef);
    
    if (!snapshot.exists()) return [];

    const sessions: ListeningSession[] = [];
    snapshot.forEach((childSnapshot) => {
      const session = childSnapshot.val();
      if (session.isActive) {
        sessions.push(session);
      }
    });

    return sessions;
  }

  static subscribeToActiveSessions(
    callback: (sessions: ListeningSession[]) => void
  ): () => void {
    const sessionsRef = ref(database, 'sessions');
    
    onValue(sessionsRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const sessions: ListeningSession[] = [];
      snapshot.forEach((childSnapshot) => {
        const session = childSnapshot.val();
        if (session.isActive) {
          sessions.push(session);
        }
      });

      callback(sessions);
    });

    return () => off(sessionsRef);
  }

  // Friends Management
  static async addFriend(userId: string, friendId: string): Promise<void> {
    const friendRef = ref(database, `users/${userId}/friends/${friendId}`);
    await set(friendRef, true);

    const userFriendRef = ref(database, `users/${friendId}/friends/${userId}`);
    await set(userFriendRef, true);
  }

  static async getFriends(userId: string): Promise<string[]> {
    const friendsRef = ref(database, `users/${userId}/friends`);
    const snapshot = await get(friendsRef);
    
    if (!snapshot.exists()) return [];

    return Object.keys(snapshot.val());
  }

  // Generate a shareable friend link code
  static async generateFriendLink(userId: string): Promise<string> {
    console.log('🔵 FirebaseService.generateFriendLink called with userId:', userId);
    
    const linkCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    console.log('🔑 Generated link code:', linkCode);
    
    const linkRef = ref(database, `friendLinks/${linkCode}`);
    console.log('📍 Database path:', `friendLinks/${linkCode}`);
    
    const linkData = {
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    
    console.log('💾 Attempting to write link data:', linkData);
    
    try {
      await set(linkRef, linkData);
      console.log('✅ Friend link saved successfully to database');
    } catch (error) {
      console.error('❌ Error saving friend link to database:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
      });
      throw error;
    }

    console.log('🎉 Returning link code:', linkCode);
    return linkCode;
  }

  // Accept a friend link and add the friend
  static async acceptFriendLink(linkCode: string, currentUserId: string): Promise<{ success: boolean; friendId?: string; error?: string }> {
    const linkRef = ref(database, `friendLinks/${linkCode}`);
    const snapshot = await get(linkRef);

    if (!snapshot.exists()) {
      return { success: false, error: 'Invalid friend link' };
    }

    const linkData = snapshot.val();
    
    if (linkData.expiresAt < Date.now()) {
      await remove(linkRef);
      return { success: false, error: 'Friend link has expired' };
    }

    const friendId = linkData.userId;

    if (friendId === currentUserId) {
      return { success: false, error: 'Cannot add yourself as a friend' };
    }

    // Check if already friends
    const existingFriendRef = ref(database, `users/${currentUserId}/friends/${friendId}`);
    const existingSnapshot = await get(existingFriendRef);

    if (existingSnapshot.exists()) {
      return { success: false, error: 'Already friends with this user' };
    }

    // Add friend relationship
    await this.addFriend(currentUserId, friendId);

    return { success: true, friendId };
  }

  // Remove a friend
  static async removeFriend(userId: string, friendId: string): Promise<void> {
    const friendRef = ref(database, `users/${userId}/friends/${friendId}`);
    await remove(friendRef);

    const userFriendRef = ref(database, `users/${friendId}/friends/${userId}`);
    await remove(userFriendRef);
  }

  // Get detailed friend information
  static async getFriendDetails(userId: string): Promise<Friend[]> {
    const friendIds = await this.getFriends(userId);
    const friends: Friend[] = [];

    for (const friendId of friendIds) {
      const userRef = ref(database, `users/${friendId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Get friend's current track if they have an active session
        let currentTrack: SpotifyTrack | undefined;
        let playbackState: PlaybackState | undefined;
        
        if (userData.autoSessionId) {
          const sessionRef = ref(database, `sessions/${userData.autoSessionId}`);
          const sessionSnapshot = await get(sessionRef);
          
          if (sessionSnapshot.exists()) {
            const sessionData = sessionSnapshot.val();
            currentTrack = sessionData.currentTrack;
            playbackState = sessionData.playbackState;
          }
        }

        friends.push({
          id: friendId,
          displayName: userData.displayName,
          profileImage: userData.profileImage,
          isOnline: userData.isOnline || false,
          currentSessionId: userData.currentSessionId,
          autoSessionId: userData.autoSessionId,
          currentTrack,
          playbackState,
        });
      }
    }

    return friends;
  }

  // Subscribe to friends list updates
  static subscribeToFriends(
    userId: string,
    callback: (friends: Friend[]) => void
  ): () => void {
    const friendsRef = ref(database, `users/${userId}/friends`);
    
    const updateFriends = async () => {
      const friends = await this.getFriendDetails(userId);
      callback(friends);
    };

    // Initial load
    updateFriends();

    // Listen to changes in friend list
    onValue(friendsRef, () => {
      updateFriends();
    });

    // Also listen to changes in users data (online status, sessions)
    const usersRef = ref(database, 'users');
    onValue(usersRef, () => {
      updateFriends();
    });

    // Also listen to session changes
    const sessionsRef = ref(database, 'sessions');
    onValue(sessionsRef, () => {
      updateFriends();
    });

    return () => {
      off(friendsRef);
      off(usersRef);
      off(sessionsRef);
    };
  }

  // Auto-session management (created when user opens app)
  static async createAutoSession(userId: string, userName: string): Promise<string> {
    // Check if user already has an auto session
    const userRef = ref(database, `users/${userId}`);
    const userSnapshot = await get(userRef);
    
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      if (userData.autoSessionId) {
        // Check if session still exists and is active
        const existingSessionRef = ref(database, `sessions/${userData.autoSessionId}`);
        const existingSnapshot = await get(existingSessionRef);
        
        if (existingSnapshot.exists() && existingSnapshot.val().isActive) {
          return userData.autoSessionId;
        }
      }
    }

    // Create new auto session
    const sessionsRef = ref(database, 'sessions');
    const newSessionRef = push(sessionsRef);
    const sessionId = newSessionRef.key!;

    const session: ListeningSession = {
      id: sessionId,
      hostId: userId,
      hostName: userName,
      createdAt: Date.now(),
      isActive: true,
      participants: [userId],
    };

    await set(newSessionRef, session);
    
    // Update user's auto session ID
    await update(userRef, {
      autoSessionId: sessionId,
      currentSessionId: sessionId,
    });

    return sessionId;
  }

  // Clean up auto session when user closes app
  static async cleanupAutoSession(userId: string): Promise<void> {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) return;

    const userData = snapshot.val();
    if (!userData.autoSessionId) return;

    const sessionRef = ref(database, `sessions/${userData.autoSessionId}`);
    const sessionSnapshot = await get(sessionRef);

    if (sessionSnapshot.exists()) {
      const session = sessionSnapshot.val();
      
      // Only end session if user is the only participant
      if (session.participants && session.participants.length === 1) {
        await update(sessionRef, { isActive: false });
      } else {
        // Remove user from participants
        const updatedParticipants = session.participants.filter((id: string) => id !== userId);
        await update(sessionRef, { participants: updatedParticipants });
      }
    }

    // Clear auto session reference
    await update(userRef, {
      autoSessionId: null,
      currentSessionId: null,
    });
  }
}

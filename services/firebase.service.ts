import { get, off, onValue, push, ref, set, update } from 'firebase/database';
import { database } from '../config/firebase';
import { ListeningSession, PlaybackState, SpotifyTrack, User } from '../types';

export class FirebaseService {
  // User Management
  static async createOrUpdateUser(user: User): Promise<void> {
    const userRef = ref(database, `users/${user.id}`);
    await set(userRef, {
      displayName: user.displayName,
      email: user.email,
      profileImage: user.profileImage,
      spotifyId: user.spotifyId,
      lastSeen: Date.now(),
    });
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
}

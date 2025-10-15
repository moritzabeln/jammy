import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { FirebaseService } from '../services/firebase.service';
import { ListeningSession } from '../types';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<ListeningSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = FirebaseService.subscribeToActiveSessions((activeSessions) => {
      setSessions(activeSessions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateSession = async () => {
    if (!user) return;

    try {
      const sessionId = await FirebaseService.createSession(user.id, user.displayName);
      router.push(`/session/${sessionId}` as any);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleJoinSession = (sessionId: string) => {
    router.push(`/session/${sessionId}` as any);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const renderSession = ({ item }: { item: ListeningSession }) => {
    const isHost = item.hostId === user?.id;
    const participantCount = item.participants?.length || 0;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.sessionCard,
          pressed && styles.sessionCardPressed,
        ]}
        onPress={() => handleJoinSession(item.id)}
      >
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionHost}>{item.hostName}</Text>
          {isHost && <Text style={styles.hostBadge}>HOST</Text>}
        </View>
        
        {item.currentTrack && (
          <View style={styles.trackInfo}>
            {item.currentTrack.albumArt && (
              <Image
                source={{ uri: item.currentTrack.albumArt }}
                style={styles.albumArt}
              />
            )}
            <View style={styles.trackDetails}>
              <Text style={styles.trackName} numberOfLines={1}>
                {item.currentTrack.name}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {item.currentTrack.artist}
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.sessionFooter}>
          <Text style={styles.participants}>
            👥 {participantCount} {participantCount === 1 ? 'listener' : 'listeners'}
          </Text>
          {item.playbackState?.isPlaying && (
            <Text style={styles.playing}>▶️ Playing</Text>
          )}
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.displayName}</Text>
        </View>
        <Pressable onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.createButton,
          pressed && styles.createButtonPressed,
        ]}
        onPress={handleCreateSession}
      >
        <Text style={styles.createButtonText}>+ Create Listening Session</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Active Sessions</Text>

      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No active sessions</Text>
          <Text style={styles.emptyStateSubtext}>
            Create a session to start listening with friends
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.sessionList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  welcomeText: {
    color: '#B3B3B3',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  signOutText: {
    color: '#B3B3B3',
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#1DB954',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 30,
  },
  createButtonPressed: {
    opacity: 0.8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  sessionList: {
    paddingHorizontal: 20,
  },
  sessionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sessionCardPressed: {
    opacity: 0.8,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionHost: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  hostBadge: {
    backgroundColor: '#1DB954',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trackInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  albumArt: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  trackDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  trackName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackArtist: {
    color: '#B3B3B3',
    fontSize: 14,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participants: {
    color: '#B3B3B3',
    fontSize: 14,
  },
  playing: {
    color: '#1DB954',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#B3B3B3',
    fontSize: 14,
    textAlign: 'center',
  },
});

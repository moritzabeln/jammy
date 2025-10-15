import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { FirebaseService } from '../../services/firebase.service';
import { SpotifyService } from '../../services/spotify.service';
import { ListeningSession, PlaybackState, SpotifyTrack, User } from '../../types';

export default function SessionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [session, setSession] = useState<ListeningSession | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const isHost = session?.hostId === user?.id;
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;

    // Join the session
    FirebaseService.joinSession(id, user.id);

    // Subscribe to session updates
    const unsubscribe = FirebaseService.subscribeToSession(id, (updatedSession) => {
      if (!updatedSession) {
        Alert.alert('Session Ended', 'This session has been ended by the host.');
        router.back();
        return;
      }

      setSession(updatedSession);
      setCurrentTrack(updatedSession.currentTrack || null);
      setPlaybackState(updatedSession.playbackState || null);
      setLoading(false);

      // Load participant details
      loadParticipants(updatedSession.participants || []);
    });

    return () => {
      unsubscribe();
      if (user) {
        FirebaseService.leaveSession(id, user.id);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (playbackCheckRef.current) {
        clearInterval(playbackCheckRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  // Host: Broadcast playback state
  useEffect(() => {
    if (!isHost || !id) return;

    const broadcastPlayback = async () => {
      try {
        // Use combined method to reduce API calls from 2 to 1
        const { state, track } = await SpotifyService.getPlaybackStateAndTrack();
        
        if (state) {
          // Detect track changes
          const trackChanged = lastTrackIdRef.current !== state.trackId;
          
          if (trackChanged) {
            console.log('Track changed detected!', state.trackId);
            lastTrackIdRef.current = state.trackId || null;
          }
          
          await FirebaseService.updatePlaybackState(id, state, track || undefined);
        }
      } catch (error) {
        console.error('Error broadcasting playback:', error);
      }
    };

    // Broadcast immediately
    broadcastPlayback();

    // Then broadcast every 1 second (reduced from 2 seconds for faster updates)
    syncIntervalRef.current = setInterval(broadcastPlayback, 1000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isHost, id]);

  // Listener: Sync to host's playback
  useEffect(() => {
    if (isHost || !playbackState || !id) return;

    const syncToHost = async () => {
      try {
        setSyncing(true);
        
        // Get current local playback
        const localState = await SpotifyService.getPlaybackState();
        
        // Check if track changed - sync immediately if so
        const trackChanged = localState?.trackId !== playbackState.trackId;
        
        if (trackChanged) {
          console.log('Syncing to new track:', playbackState.trackId);
          await SpotifyService.syncPlayback(playbackState, currentTrack || undefined);
          return;
        }
        
        // Check if we need to sync position
        const timeDiff = playbackState.timestamp ? Date.now() - playbackState.timestamp : 0;
        const expectedProgress = playbackState.progressMs + timeDiff;
        const progressDiff = localState 
          ? Math.abs(localState.progressMs - expectedProgress)
          : 5000;

        // Sync if position is off by more than 2 seconds (reduced from 3)
        if (!localState || progressDiff > 2000) {
          await SpotifyService.syncPlayback(
            {
              ...playbackState,
              progressMs: expectedProgress,
            },
            currentTrack || undefined
          );
        }
      } catch (error) {
        console.error('Error syncing to host:', error);
      } finally {
        setSyncing(false);
      }
    };

    syncToHost();

    // Check and sync every 2 seconds (reduced from 5 seconds for faster sync)
    playbackCheckRef.current = setInterval(syncToHost, 2000);

    return () => {
      if (playbackCheckRef.current) {
        clearInterval(playbackCheckRef.current);
      }
    };
  }, [isHost, playbackState, currentTrack, id]);

  const loadParticipants = async (participantIds: string[]) => {
    try {
      const users = await Promise.all(
        participantIds.map(async (userId) => {
          const userData = await FirebaseService.getUser(userId);
          return userData;
        })
      );
      setParticipants(users.filter((u): u is User => u !== null));
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const handlePlayPause = async () => {
    if (!isHost) return;

    try {
      if (playbackState?.isPlaying) {
        await SpotifyService.pause();
      } else {
        await SpotifyService.play();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      Alert.alert('Error', 'Failed to control playback. Make sure Spotify is open and active.');
    }
  };

  const handleSkipNext = async () => {
    if (!isHost) return;

    try {
      await SpotifyService.skipToNext();
    } catch (error) {
      console.error('Error skipping track:', error);
    }
  };

  const handleSkipPrevious = async () => {
    if (!isHost) return;

    try {
      await SpotifyService.skipToPrevious();
    } catch (error) {
      console.error('Error skipping track:', error);
    }
  };

  const handleLeave = async () => {
    if (isHost) {
      Alert.alert(
        'End Session',
        'Are you sure you want to end this session for everyone?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End Session',
            style: 'destructive',
            onPress: async () => {
              if (id) {
                await FirebaseService.endSession(id);
              }
              router.back();
            },
          },
        ]
      );
    } else {
      if (id && user) {
        await FirebaseService.leaveSession(id, user.id);
      }
      router.back();
    }
  };

  const renderParticipant = ({ item }: { item: User }) => (
    <View style={styles.participant}>
      {item.profileImage ? (
        <Image source={{ uri: item.profileImage }} style={styles.participantImage} />
      ) : (
        <View style={[styles.participantImage, styles.participantImagePlaceholder]}>
          <Text style={styles.participantInitial}>
            {item.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={styles.participantName} numberOfLines={1}>
        {item.displayName}
      </Text>
      {item.id === session?.hostId && (
        <Text style={styles.hostIndicator}>👑</Text>
      )}
    </View>
  );

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentProgress = () => {
    if (!playbackState) return 0;
    
    const timeDiff = playbackState.timestamp ? Date.now() - playbackState.timestamp : 0;
    const currentProgress = playbackState.isPlaying 
      ? playbackState.progressMs + timeDiff 
      : playbackState.progressMs;
    
    return Math.min(currentProgress, playbackState.duration || 0);
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
        <Pressable onPress={handleLeave} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        {syncing && (
          <View style={styles.syncIndicator}>
            <ActivityIndicator size="small" color="#1DB954" />
            <Text style={styles.syncText}>Syncing...</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {currentTrack ? (
          <View style={styles.nowPlaying}>
            {currentTrack.albumArt && (
              <Image
                source={{ uri: currentTrack.albumArt }}
                style={styles.albumArtLarge}
              />
            )}
            <Text style={styles.trackNameLarge} numberOfLines={2}>
              {currentTrack.name}
            </Text>
            <Text style={styles.trackArtistLarge} numberOfLines={1}>
              {currentTrack.artist}
            </Text>

            {playbackState && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          ((getCurrentProgress() / (playbackState.duration || 1)) * 100)
                        }%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>
                    {formatTime(getCurrentProgress())}
                  </Text>
                  <Text style={styles.timeText}>
                    {formatTime(playbackState.duration || 0)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noTrack}>
            <Text style={styles.noTrackText}>
              {isHost ? 'Start playing music on Spotify' : 'Waiting for host to play music'}
            </Text>
          </View>
        )}

        {isHost && (
          <View style={styles.controls}>
            <Pressable
              onPress={handleSkipPrevious}
              style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
            >
              <Text style={styles.controlIcon}>⏮</Text>
            </Pressable>
            
            <Pressable
              onPress={handlePlayPause}
              style={({ pressed }) => [
                styles.controlButtonLarge,
                pressed && styles.controlButtonPressed,
              ]}
            >
              <Text style={styles.controlIconLarge}>
                {playbackState?.isPlaying ? '⏸' : '▶️'}
              </Text>
            </Pressable>
            
            <Pressable
              onPress={handleSkipNext}
              style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
            >
              <Text style={styles.controlIcon}>⏭</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.participantsSection}>
          <Text style={styles.participantsTitle}>
            Listening ({participants.length})
          </Text>
          <FlatList
            data={participants}
            renderItem={renderParticipant}
            keyExtractor={(item, index) => item?.id || `participant-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.participantsList}
          />
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.leaveButton,
          pressed && styles.leaveButtonPressed,
        ]}
        onPress={handleLeave}
      >
        <Text style={styles.leaveButtonText}>
          {isHost ? 'End Session' : 'Leave Session'}
        </Text>
      </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#1DB954',
    fontSize: 16,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncText: {
    color: '#1DB954',
    fontSize: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  nowPlaying: {
    alignItems: 'center',
    marginBottom: 40,
  },
  albumArtLarge: {
    width: 280,
    height: 280,
    borderRadius: 8,
    marginBottom: 30,
  },
  trackNameLarge: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  trackArtistLarge: {
    color: '#B3B3B3',
    fontSize: 18,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: 30,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1DB954',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: '#B3B3B3',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
    marginBottom: 40,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonPressed: {
    opacity: 0.7,
  },
  controlIcon: {
    fontSize: 24,
  },
  controlIconLarge: {
    fontSize: 32,
  },
  noTrack: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noTrackText: {
    color: '#B3B3B3',
    fontSize: 16,
    textAlign: 'center',
  },
  participantsSection: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  participantsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  participantsList: {
    gap: 15,
  },
  participant: {
    alignItems: 'center',
    width: 80,
  },
  participantImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  participantImagePlaceholder: {
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInitial: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  participantName: {
    color: '#B3B3B3',
    fontSize: 12,
    textAlign: 'center',
  },
  hostIndicator: {
    fontSize: 16,
    marginTop: 4,
  },
  leaveButton: {
    marginHorizontal: 20,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#FF4444',
    alignItems: 'center',
  },
  leaveButtonPressed: {
    opacity: 0.7,
  },
  leaveButtonText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

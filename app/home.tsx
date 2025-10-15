import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { FirebaseService } from '../services/firebase.service';
import { Friend } from '../types';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    try {
      setError(null);
      const unsubscribe = FirebaseService.subscribeToFriends(user.id, (friendsList) => {
        setFriends(friendsList);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading friends:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load friends';
      setError(errorMessage);
      setLoading(false);
    }
  }, [user]);

  const handleShareFriendLink = async () => {
    console.log('🔵 Share friend link clicked');
    
    if (!user) {
      console.log('❌ No user found');
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    console.log('✅ User authenticated:', user.id);

    try {
      setError(null);
      console.log('🔄 Generating friend link for user:', user.id);
      
      const linkCode = await FirebaseService.generateFriendLink(user.id);
      
      console.log('✅ Friend link generated successfully:', linkCode);
      
      // Always show the code in the UI for easy copying
      setGeneratedCode(linkCode);
      
      try {
        const shareResult = await Share.share({
          message: `Add me on Jammy! Use this code: ${linkCode}`,
          title: 'Add me as a friend on Jammy',
        });

        console.log('📤 Share result:', shareResult);
        
        if (shareResult && shareResult.action === Share.sharedAction) {
          console.log('✅ Content shared successfully');
        } else if (shareResult && shareResult.action === Share.dismissedAction) {
          console.log('ℹ️ Share dialog dismissed');
        } else {
          console.log('ℹ️ Share completed (no action data returned - this is normal on web)');
        }
      } catch {
        // If Share API fails (common on web), that's okay - we're showing the code in UI
        console.log('ℹ️ Share API not available, code is shown in UI');
      }
    } catch (error) {
      console.error('❌ Error sharing friend link:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate friend link';
      setError(errorMessage);
      Alert.alert('Error Sharing Friend Link', errorMessage);
    }
  };

  const handleAddFriend = async () => {
    console.log('🔵 Add friend clicked');
    
    if (!user || !friendCode.trim()) {
      console.log('❌ No user or empty friend code');
      return;
    }

    console.log('✅ Adding friend with code:', friendCode.trim().toUpperCase());

    try {
      setError(null);
      setAddingFriend(true);
      
      console.log('🔄 Accepting friend link...');
      const result = await FirebaseService.acceptFriendLink(
        friendCode.trim().toUpperCase(),
        user.id
      );

      console.log('📥 Friend link result:', result);

      if (result.success) {
        console.log('✅ Friend added successfully:', result.friendId);
        Alert.alert('Success', 'Friend added successfully!');
        setFriendCode('');
        setShowAddFriend(false);
      } else {
        console.log('❌ Failed to add friend:', result.error);
        Alert.alert('Error', result.error || 'Failed to add friend');
      }
    } catch (error) {
      console.error('❌ Error adding friend:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to add friend';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setAddingFriend(false);
    }
  };

  const handleJoinFriend = (friend: Friend) => {
    if (!friend.autoSessionId) {
      Alert.alert('Unavailable', `${friend.displayName} is not currently in a session`);
      return;
    }
    
    router.push(`/session/${friend.autoSessionId}` as any);
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;

    try {
      await Clipboard.setStringAsync(generatedCode);
      console.log('✅ Code copied to clipboard:', generatedCode);
      // Show a brief success message
      Alert.alert('Copied!', 'Friend code copied to clipboard');
    } catch (error) {
      console.error('❌ Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy code to clipboard');
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const getPlaybackStatus = (friend: Friend): string => {
    if (!friend.isOnline) return 'Offline';
    if (!friend.currentTrack) return 'Online';
    if (friend.playbackState?.isPlaying) return 'Listening';
    return 'Paused';
  };

  const renderFriend = ({ item }: { item: Friend }) => {
    const playbackStatus = getPlaybackStatus(item);
    const canJoin = item.isOnline && item.autoSessionId;

    return (
      <View style={styles.friendCard}>
        <View style={styles.friendHeader}>
          <View style={styles.friendInfo}>
            {item.profileImage ? (
              <Image
                source={{ uri: item.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.profilePlaceholder]}>
                <Text style={styles.profileInitial}>
                  {item.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.friendDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.friendName}>{item.displayName}</Text>
                <View style={[
                  styles.statusDot,
                  item.isOnline ? styles.statusOnline : styles.statusOffline
                ]} />
              </View>
              <Text style={styles.statusText}>{playbackStatus}</Text>
            </View>
          </View>

          {canJoin && (
            <Pressable
              style={({ pressed }) => [
                styles.joinButton,
                pressed && styles.joinButtonPressed,
              ]}
              onPress={() => handleJoinFriend(item)}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </Pressable>
          )}
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
      </View>
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

      <View style={styles.actionButtons}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.shareButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={handleShareFriendLink}
        >
          <Text style={styles.actionButtonText}>📤 Share Friend Link</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.addButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => setShowAddFriend(!showAddFriend)}
        >
          <Text style={styles.actionButtonText}>
            {showAddFriend ? '✕ Cancel' : '➕ Add Friend'}
          </Text>
        </Pressable>
      </View>

      {generatedCode && (
        <View style={styles.generatedCodeContainer}>
          <Text style={styles.generatedCodeTitle}>Your Friend Code:</Text>
          <Pressable
            style={({ pressed }) => [
              styles.codeBox,
              pressed && styles.codeBoxPressed,
            ]}
            onPress={handleCopyCode}
          >
            <Text style={styles.codeText}>{generatedCode}</Text>
            <Text style={styles.copyHint}>Tap to copy</Text>
          </Pressable>
          <Text style={styles.codeInstruction}>
            Share this code with friends so they can add you!
          </Text>
        </View>
      )}

      {showAddFriend && (
        <View style={styles.addFriendContainer}>
          <TextInput
            style={styles.codeInput}
            placeholder="Enter friend code"
            placeholderTextColor="#666"
            value={friendCode}
            onChangeText={setFriendCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Pressable
            style={({ pressed }) => [
              styles.addFriendButton,
              pressed && styles.addFriendButtonPressed,
              (!friendCode.trim() || addingFriend) && styles.addFriendButtonDisabled,
            ]}
            onPress={handleAddFriend}
            disabled={!friendCode.trim() || addingFriend}
          >
            {addingFriend ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.addFriendButtonText}>Add</Text>
            )}
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionTitle}>Friends</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {friends.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No friends yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Share your friend link or add friends with their code
          </Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.friendsList}
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
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  shareButton: {
    backgroundColor: '#1DB954',
  },
  addButton: {
    backgroundColor: '#535353',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  generatedCodeContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#1DB954',
  },
  generatedCodeTitle: {
    color: '#1DB954',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  codeBox: {
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  codeBoxPressed: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1DB954',
  },
  codeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  copyHint: {
    color: '#1DB954',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  codeInstruction: {
    color: '#B3B3B3',
    fontSize: 12,
    textAlign: 'center',
  },
  addFriendContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  addFriendButton: {
    backgroundColor: '#1DB954',
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  addFriendButtonPressed: {
    opacity: 0.8,
  },
  addFriendButtonDisabled: {
    backgroundColor: '#535353',
    opacity: 0.5,
  },
  addFriendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  errorContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  friendsList: {
    paddingHorizontal: 20,
  },
  friendCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  friendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profilePlaceholder: {
    backgroundColor: '#535353',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  friendDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  friendName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOnline: {
    backgroundColor: '#1DB954',
  },
  statusOffline: {
    backgroundColor: '#666',
  },
  statusText: {
    color: '#B3B3B3',
    fontSize: 14,
  },
  joinButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  joinButtonPressed: {
    opacity: 0.8,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  trackInfo: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  albumArt: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  trackDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  trackName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackArtist: {
    color: '#B3B3B3',
    fontSize: 13,
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

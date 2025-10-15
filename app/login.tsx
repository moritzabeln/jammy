import { useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { SpotifyService, useAuthRequest } from '../services/spotify.service';

export default function LoginScreen() {
  const { signIn, user } = useAuth();
  const router = useRouter();
  
  const [request, response, promptAsync] = useAuthRequest(
    SpotifyService.getAuthConfig(),
    SpotifyService.getAuthConfig().discovery
  );

  const exchangeCodeForToken = useCallback(async (code: string) => {
    try {
      const config = SpotifyService.getAuthConfig();
      
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
          code_verifier: request?.codeVerifier || '',
        }).toString(),
      });

      const data = await response.json();
      
      if (data.access_token) {
        await signIn(data.access_token, data.refresh_token, data.expires_in);
      }
    } catch (error) {
      console.error('Error exchanging code for token:', error);
    }
  }, [request, signIn]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      exchangeCodeForToken(code);
    }
  }, [response, exchangeCodeForToken]);

  useEffect(() => {
    if (user) {
      router.replace('/home' as any);
    }
  }, [user, router]);

  const handleLogin = async () => {
    await promptAsync();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>Jammy</Text>
        <Text style={styles.subtitle}>Listen together with friends</Text>
        
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleLogin}
          disabled={!request}
        >
          {!request ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>🎵 Connect with Spotify</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          You&apos;ll need a Spotify Premium account to use this app
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1DB954',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#B3B3B3',
    marginBottom: 60,
  },
  button: {
    backgroundColor: '#1DB954',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    minWidth: 250,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disclaimer: {
    marginTop: 40,
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

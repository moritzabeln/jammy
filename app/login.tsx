import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { SpotifyService, useAuthRequest } from '../services/spotify.service';

export default function LoginScreen() {
  const { signIn, user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [request, response, promptAsync] = useAuthRequest(
    SpotifyService.getAuthConfig(),
    SpotifyService.getAuthConfig().discovery
  );

  const exchangeCodeForToken = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const config = SpotifyService.getAuthConfig();
      
      console.log('Exchanging code for token...');
      console.log('Redirect URI:', config.redirectUri);
      console.log('Client ID:', config.clientId);
      
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
      
      console.log('Token response status:', response.status);
      console.log('Token response data:', data);
      
      if (!response.ok) {
        console.error('Token exchange failed:', data);
        const errorMessage = data.error_description || data.error || 'Failed to authenticate with Spotify';
        setError(errorMessage);
        Alert.alert(
          'Authentication Failed',
          `Could not connect to Spotify: ${errorMessage}`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (data.access_token) {
        console.log('Got access token, signing in...');
        await signIn(data.access_token, data.refresh_token, data.expires_in);
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      Alert.alert(
        'Login Error',
        `Something went wrong during login: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
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
    try {
      setError(null);
      await promptAsync();
    } catch (error) {
      console.error('Error prompting login:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start login';
      setError(errorMessage);
      Alert.alert(
        'Login Error',
        `Could not start Spotify login: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
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
          disabled={!request || isLoading}
        >
          {!request || isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>🎵 Connect with Spotify</Text>
            </>
          )}
        </Pressable>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

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
  errorContainer: {
    marginTop: 20,
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    maxWidth: 300,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  disclaimer: {
    marginTop: 40,
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

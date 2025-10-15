import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const currentPath = segments.join('/');
    const isOnLoginScreen = currentPath.includes('login');

    if (!user && !isOnLoginScreen) {
      // Redirect to login if not authenticated
      router.replace('/login' as any);
    } else if (user && isOnLoginScreen) {
      // Redirect to home if authenticated and on login screen
      router.replace('/home' as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="home" />
      <Stack.Screen name="session/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

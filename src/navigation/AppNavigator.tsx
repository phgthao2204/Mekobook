import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { BookCatalog } from '../screens/books/BookCatalog';
import { AccountScreen } from '../screens/account/AccountScreen';
import { BookDetailScreen } from '../screens/books/BookDetailScreen';
import { BookLoadingScreen } from '../screens/reader/BookLoadingScreen';
import { ReaderScreen } from '../screens/reader/ReaderScreen';
import { SplashScreen } from '../screens/splash/SplashScreen';
import { useTheme } from '../theme';
import { RootStackParamList } from './types';
const Stack = createNativeStackNavigator<RootStackParamList>();
function LoginRoute() {
  const { signIn } = useAuth();
  return <LoginScreen onLogin={signIn} />;
}
function LibraryRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Library'>) {
  const { session } = useAuth();
  if (!session) return null;
  return <BookCatalog user={session.user} onOpenAccount={() => navigation.navigate('Account')}
    onSelectBook={book => navigation.navigate('BookDetail', { bookId: book.id })} />;
}
function AccountRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Account'>) {
  const { session, signOut, refreshProfile } = useAuth();
  if (!session) return null;
  return <AccountScreen user={session.user} onBack={() => navigation.goBack()}
    onOpenLibrary={() => navigation.navigate('Library')}
    onLogout={signOut} onRefreshProfile={refreshProfile} />;
}
export function AppNavigator() {
  const { session, restoring } = useAuth();
  const theme = useTheme();
  const [splashFinished, setSplashFinished] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSplashFinished(true), 1000);
    return () => clearTimeout(timer);
  }, []);
  if (restoring || !splashFinished) return <SplashScreen />;
  const baseNavigationTheme = theme.isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = { ...baseNavigationTheme, dark: theme.isDark, colors: {
    ...baseNavigationTheme.colors, primary: theme.colors.primary, background: theme.colors.background,
    card: theme.colors.surface, text: theme.colors.text, border: theme.colors.border,
    notification: theme.colors.error,
  } };
  return <NavigationContainer theme={navigationTheme}>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!session ? <Stack.Screen name="Login" component={LoginRoute} /> : <>
        <Stack.Screen name="Library" component={LibraryRoute} />
        <Stack.Screen name="Account" component={AccountRoute} />
        <Stack.Screen name="BookDetail" component={BookDetailScreen} />
        <Stack.Screen name="BookLoading" component={BookLoadingScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Reader" component={ReaderScreen} options={{ animation: 'fade' }} />
      </>}
    </Stack.Navigator>
  </NavigationContainer>;
}

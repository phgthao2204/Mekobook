import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { BookCatalog } from '../screens/books/BookCatalog';
import { BookDetailScreen } from '../screens/books/BookDetailScreen';
import { BookLoadingScreen } from '../screens/reader/BookLoadingScreen';
import { ReaderScreen } from '../screens/reader/ReaderScreen';
import { LoadState } from '../component/LoadState';
import { navigationTheme } from '../constants/theme';
import { RootStackParamList } from './types';
const Stack = createNativeStackNavigator<RootStackParamList>();
function LoginRoute() {
  const { signIn } = useAuth();
  return <LoginScreen onLogin={signIn} />;
}
function LibraryRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Library'>) {
  const { session, signOut } = useAuth();
  if (!session) return null;
  return <BookCatalog user={session.user} onLogout={signOut}
    onSelectBook={book => navigation.navigate('BookDetail', { bookId: book.id })} />;
}
export function AppNavigator() {
  const { session, restoring } = useAuth();
  if (restoring) return <LoadState message="Đang khôi phục phiên đăng nhập..." />;
  return <NavigationContainer theme={navigationTheme}>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!session ? <Stack.Screen name="Login" component={LoginRoute} /> : <>
        <Stack.Screen name="Library" component={LibraryRoute} />
        <Stack.Screen name="BookDetail" component={BookDetailScreen} />
        <Stack.Screen name="BookLoading" component={BookLoadingScreen} />
        <Stack.Screen name="Reader" component={ReaderScreen} />
      </>}
    </Stack.Navigator>
  </NavigationContainer>;
}

/**
 * MEKOBOOK MOBILE - 3D FLIPBOOK VIEWER APPLICATION
 * Main entry point integrating Liferay 7.4 CE Objects & StPageFlip 3D Engine
 * ZERO EMOJIS - PURE VECTOR ICONS - LIGHT MODE & GREEN THEME
 */

import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, AppState, View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthSession, Book } from './src/types';
import { LoginScreen } from './src/components/auth/LoginScreen';
import { BookCatalog } from './src/components/books/BookCatalog';
import { FlipbookViewer, FlipbookViewerRef } from './src/components/flipbook/FlipbookViewer';
import { FlipbookControls } from './src/components/flipbook/FlipbookControls';
import { saveReadingProgress } from './src/services/api';
import { login, logout, refreshSession, restoreSession } from './src/services/auth';

function AppContent() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [restoringSession, setRestoringSession] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);

  const viewerRef = useRef<FlipbookViewerRef>(null);
  const progressDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    restoreSession()
      .then(setSession)
      .finally(() => setRestoringSession(false));

    return () => {
      if (progressDebounceTimer.current) {
        clearTimeout(progressDebounceTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    const refreshIn = Math.max(1_000, session.expiresAt - Date.now() - 60_000);
    const timer = setTimeout(() => {
      const renew = session.refreshToken
        ? refreshSession(session)
        : Promise.reject(new Error('Phiên đăng nhập đã hết hạn.'));
      renew
        .then(setSession)
        .catch(async () => {
          await logout();
          setSelectedBook(null);
          setSession(null);
        });
    }, refreshIn);

    return () => clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || session.expiresAt > Date.now() + 60_000) return;

      if (!session.refreshToken) {
        logout().finally(() => setSession(null));
        return;
      }

      refreshSession(session)
        .then(setSession)
        .catch(async () => {
          await logout();
          setSelectedBook(null);
          setSession(null);
        });
    });

    return () => subscription.remove();
  }, [session]);

  // Exact total pages of the book matching 1:1 with content and TOC
  const totalPages = selectedBook?.totalPages || 35;

  // Handle page turn from 3D Flipbook WebView
  // Áp dụng Debounce 1.5s: Chỉ khi người đọc dừng lại ở trang đó mới gửi 1 request lưu tiến độ lên Liferay
  const handlePageChange = (page: number, _engineTotalPages: number) => {
    setCurrentPage(page);
    if (selectedBook) {
      if (progressDebounceTimer.current) {
        clearTimeout(progressDebounceTimer.current);
      }
      progressDebounceTimer.current = setTimeout(() => {
        saveReadingProgress(selectedBook.id, page, totalPages);
      }, 1500);
    }
  };

  // Flipbook Navigation Triggers
  const handleNextPage = () => {
    viewerRef.current?.flipNext();
  };

  const handlePrevPage = () => {
    viewerRef.current?.flipPrev();
  };

  if (restoringSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        onLogin={async (username, password) => {
          const nextSession = await login(username, password);
          setSession(nextSession);
        }}
      />
    );
  }

  return (
    <View style={styles.viewerContainer}>
      <StatusBar
        hidden={selectedBook !== null && !controlsVisible}
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={true}
      />

      {/* RENDER CATALOG OR FLIPBOOK VIEWER */}
      {!selectedBook ? (
        <BookCatalog
          user={session.user}
          onLogout={async () => {
            await logout();
            setSelectedBook(null);
            setSession(null);
          }}
          onSelectBook={(book) => {
            setCurrentPage(1);
            setControlsVisible(true);
            setSelectedBook(book);
          }}
        />
      ) : (
        <View style={styles.viewerContainer}>
          {/* CORE 3D FLIPBOOK ENGINE COMPONENT */}
          <FlipbookViewer
            ref={viewerRef}
            book={selectedBook}
            initialPage={currentPage}
            onPageChange={handlePageChange}
            onToggleControls={() => setControlsVisible((prev) => !prev)}
          />

          {/* OVERLAY CONTROLS (HEADER & NAVIGATION) */}
          <FlipbookControls
            book={selectedBook}
            currentPage={currentPage}
            totalPages={totalPages}
            visible={controlsVisible}
            onBack={() => setSelectedBook(null)}
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
            onJumpToPage={(page) => viewerRef.current?.goToPage(page)}
          />
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  viewerContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
});

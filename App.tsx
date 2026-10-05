/**
 * MEKOBOOK MOBILE - 3D FLIPBOOK VIEWER APPLICATION
 * Main entry point integrating Liferay 7.4 CE Objects & StPageFlip 3D Engine
 * ZERO EMOJIS - PURE VECTOR ICONS - LIGHT MODE & GREEN THEME
 */

import React, { useState, useRef } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Book } from './src/types';
import { BookCatalog } from './src/components/books/BookCatalog';
import { FlipbookViewer, FlipbookViewerRef } from './src/components/flipbook/FlipbookViewer';
import { FlipbookControls } from './src/components/flipbook/FlipbookControls';
import { saveReadingProgress } from './src/services/api';

export default function App() {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);

  const viewerRef = useRef<FlipbookViewerRef>(null);
  const progressDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

const styles = StyleSheet.create({
  viewerContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
});

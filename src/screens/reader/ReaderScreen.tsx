import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, StatusBar, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { FlipbookViewer, FlipbookViewerRef } from '../../component/flipbook/FlipbookViewer';
import { FlipbookControls } from '../../component/flipbook/FlipbookControls';
import { ReaderSettingsModal } from '../../component/flipbook/ReaderSettingsModal';
import { LoadState } from '../../component/LoadState';
import { colors } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { createAnnotation, createBookmark, deleteAnnotation, deleteBookmark, getBookAnnotations, getBookBookmarks } from '../../services/api';
import { saveLocalReadingProgress } from '../../services/localReadingProgress';
import { errorMessage } from '../../services/http';
import { Annotation, AnnotationInput, Bookmark } from '../../types';
export function ReaderScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Reader'>) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { book, initialPage } = route.params;
  const [preferences, setPreferences] = useState(route.params.preferences);
  const resolvedPreferences = useMemo(() => ({ ...preferences,
    themeMode: preferences.themeMode === 'SYSTEM'
      ? (systemColorScheme === 'dark' ? 'DARK' : 'LIGHT') as 'DARK' | 'LIGHT' : preferences.themeMode,
  }), [preferences, systemColorScheme]);
  const enginePreferences = useMemo(() => ({
    ...resolvedPreferences,
    // Keep compatibility with preferences previously saved by the API, but
    // always use the stable one-page reader experience.
    dualPageMode: false,
  }), [resolvedPreferences]);
  const [page, setPage] = useState(initialPage);
  const pageRef = useRef(initialPage);
  const [openingPage, setOpeningPage] = useState(initialPage);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [zoomRailVisible, setZoomRailVisible] = useState(false);
  const [zoomExpanded, setZoomExpanded] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(true);
  const [annotationsLoading, setAnnotationsLoading] = useState(true);
  const [bookmarksError, setBookmarksError] = useState('');
  const [annotationsError, setAnnotationsError] = useState('');
  const [marksReload, setMarksReload] = useState(0);
  const [bookmarkSaving, setBookmarkSaving] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#EF4444');
  const [drawingWidth, setDrawingWidth] = useState(0.004);
  const viewer = useRef<FlipbookViewerRef>(null);
  const readerOpacity = useRef(new Animated.Value(0)).current;
  const zoomRailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistPage = (value: number) => {
    if (!session?.user.id) return;
    void saveLocalReadingProgress(session.user.id, book.id, value, book.totalPages).catch(() => {});
  };
  const handlePageChange = (next: number) => {
    pageRef.current = next;
    setPage(next);
    setZoom(1);
    if (!session?.user.id) return;
    if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
    progressSaveTimer.current = setTimeout(() => {
      progressSaveTimer.current = null;
      persistPage(pageRef.current);
    }, 250);
  };
  const revealZoomRail = (scale: number) => {
    setZoom(scale);
    setZoomRailVisible(true);
    setZoomExpanded(false);
    if (zoomRailTimer.current) clearTimeout(zoomRailTimer.current);
    zoomRailTimer.current = setTimeout(() => {
      setZoomRailVisible(false);
      setZoomExpanded(false);
    }, 1800);
  };
  useEffect(() => () => {
    if (zoomRailTimer.current) clearTimeout(zoomRailTimer.current);
  }, []);
  useEffect(() => () => {
    if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
    persistPage(pageRef.current);
  }, [book.id, book.totalPages, session?.user.id]);
  useEffect(() => {
    let active = true;
    setBookmarksLoading(true);
    setAnnotationsLoading(true);
    setBookmarksError('');
    setAnnotationsError('');
    Promise.allSettled([getBookBookmarks(book.id), getBookAnnotations(book.id)]).then(([bookmarkResult, annotationResult]) => {
      if (!active) return;
      if (bookmarkResult.status === 'fulfilled') setBookmarks(bookmarkResult.value);
      else { setBookmarks([]); setBookmarksError(errorMessage(bookmarkResult.reason)); }
      if (annotationResult.status === 'fulfilled') setAnnotations(annotationResult.value);
      else { setAnnotations([]); setAnnotationsError(errorMessage(annotationResult.reason)); }
      setBookmarksLoading(false);
      setAnnotationsLoading(false);
    });
    return () => { active = false; };
  }, [book.id, marksReload]);
  const currentBookmark = bookmarks.find(item => item.pageNumber === page);
  const toggleBookmark = async () => {
    if (bookmarkSaving) return;
    setBookmarkSaving(true);
    try {
      if (currentBookmark) {
        await deleteBookmark(currentBookmark.id);
        setBookmarks(items => items.filter(item => item.id !== currentBookmark.id));
      } else {
        const created = await createBookmark({ bookId: book.id, pageNumber: page,
          bookmarkTitle: `Trang ${page}`, colorTag: '#F59E0B' });
        setBookmarks(items => [...items, created].sort((a, b) => a.pageNumber - b.pageNumber));
      }
    } catch (cause) {
      Alert.alert('Không thể cập nhật đánh dấu', errorMessage(cause));
    } finally { setBookmarkSaving(false); }
  };
  const saveDrawing = async (drawing: AnnotationInput) => {
    const temporaryId = -Date.now();
    const optimistic: Annotation = { ...drawing, id: temporaryId };
    setAnnotations(items => [...items, optimistic]);
    try {
      const created = await createAnnotation(drawing);
      setAnnotations(items => items.map(item => item.id === temporaryId ? created : item));
    } catch (cause) {
      setAnnotations(items => items.filter(item => item.id !== temporaryId));
      Alert.alert('Không thể lưu nét vẽ', errorMessage(cause));
    }
  };
  const removeAnnotation = async (annotation: Annotation) => {
    const previous = annotations;
    setAnnotations(items => items.filter(item => item.id !== annotation.id));
    try { await deleteAnnotation(annotation.id); }
    catch (cause) {
      setAnnotations(previous);
      Alert.alert('Không thể xóa nét vẽ', errorMessage(cause));
    }
  };
  useEffect(() => {
    if (ready || error) return;
    const timer = setTimeout(() => setError('Nội dung sách phản hồi quá lâu. Vui lòng thử lại.'), 20000);
    return () => clearTimeout(timer);
  }, [ready, error, attempt]);
  return <View style={styles.screen}>
    <StatusBar hidden={ready && !visible} barStyle={resolvedPreferences.themeMode === 'DARK' ? 'light-content' : 'dark-content'} />
    <Animated.View style={[styles.viewer, { opacity: readerOpacity }]}>
      <FlipbookViewer key={attempt} ref={viewer} book={book} accessToken={session?.accessToken} annotations={annotations}
        drawingMode={{ enabled: drawingMode, color: drawingColor, strokeWidth: drawingWidth }} onDrawingCreated={saveDrawing}
        initialPage={openingPage} preferences={enginePreferences}
        onPageChange={handlePageChange} onToggleControls={() => setVisible(x => !x)}
        onZoomChange={revealZoomRail}
        onReady={() => {
          setReady(true);
          setError('');
          Animated.timing(readerOpacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
        }} onError={setError} />
    </Animated.View>
    {(!ready || error) ? <View style={StyleSheet.absoluteFill}>
      <LoadState message={`Đang mở ${book.title} — trang ${openingPage}...`} error={error} onBack={navigation.goBack}
        onRetry={() => { readerOpacity.setValue(0); setError(''); setReady(false); setZoom(1); setOpeningPage(page); setAttempt(x => x + 1); }} />
    </View> : <>
      <FlipbookControls book={book} currentPage={page} totalPages={book.totalPages} visible={visible}
        themeMode={resolvedPreferences.themeMode}
        onBack={navigation.goBack} onPrevPage={() => viewer.current?.flipPrev()} onNextPage={() => viewer.current?.flipNext()}
        onJumpToPage={target => viewer.current?.goToPage(target)} onOpenSettings={() => setSettingsVisible(true)}
        bookmarks={bookmarks} annotations={annotations} bookmarksLoading={bookmarksLoading} annotationsLoading={annotationsLoading}
        bookmarksError={bookmarksError} annotationsError={annotationsError}
        onRetryBookmarks={() => setMarksReload(value => value + 1)} onRetryAnnotations={() => setMarksReload(value => value + 1)}
        onToggleBookmark={toggleBookmark} currentPageBookmarked={!!currentBookmark} bookmarkSaving={bookmarkSaving}
        drawingMode={drawingMode} drawingColor={drawingColor} drawingWidth={drawingWidth}
        onToggleDrawing={() => { setDrawingMode(value => !value); setVisible(true); }}
        onDrawingColorChange={setDrawingColor} onDrawingWidthChange={setDrawingWidth}
        onDeleteBookmark={async bookmark => {
          try { await deleteBookmark(bookmark.id); setBookmarks(items => items.filter(item => item.id !== bookmark.id)); }
          catch (cause) { Alert.alert('Không thể xóa đánh dấu', errorMessage(cause)); }
        }} onDeleteAnnotation={removeAnnotation} />
      {(visible || zoomRailVisible) && <View style={[styles.zoom, {
        top: insets.top + 76,
        backgroundColor: resolvedPreferences.themeMode === 'DARK' ? '#18212F' : resolvedPreferences.themeMode === 'SEPIA' ? '#EADFC8' : colors.surface,
      }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mở các mức phóng trang"
          style={styles.zoomCurrent} onPress={() => setZoomExpanded(value => !value)}>
          <Text style={[styles.zoomValue, { color: resolvedPreferences.themeMode === 'DARK' ? '#F8FAFC' : colors.primary }]}>
            {Math.round(zoom * 100)}%
          </Text>
        </TouchableOpacity>
        {zoomExpanded && [1, 1.5, 2, 3].map(scale => <TouchableOpacity key={scale} accessibilityRole="button"
          accessibilityLabel={`Phóng trang ${scale * 100}%`}
          style={[styles.zoomButton, Math.abs(zoom - scale) < 0.01 && styles.zoomButtonActive]}
          onPress={() => { setZoom(scale); setZoomExpanded(false); viewer.current?.zoom(scale); }}>
          <Text style={[styles.zoomText, {
            color: Math.abs(zoom - scale) < 0.01 ? colors.surface : resolvedPreferences.themeMode === 'DARK' ? '#CBD5E1' : colors.muted,
          }]}>{scale * 100}%</Text>
        </TouchableOpacity>)}
      </View>}
    </>}
    <ReaderSettingsModal visible={settingsVisible} value={preferences} onClose={() => setSettingsVisible(false)}
      onApply={next => {
        setSettingsVisible(false);
        const requiresEngineRestart = next.pageTurnEffect !== preferences.pageTurnEffect;
        setPreferences(next);
        setZoom(1);
        if (requiresEngineRestart) {
          readerOpacity.setValue(0);
          setOpeningPage(page);
          setError('');
          setReady(false);
          setAttempt(value => value + 1);
        }
      }} />
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, viewer: { flex: 1 },
  zoom: { position: 'absolute', right: 12, minHeight: 38, padding: 4, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 13, elevation: 5, shadowColor: '#0F172A', shadowOpacity: 0.14,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  zoomCurrent: { minWidth: 52, height: 34, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  zoomValue: { textAlign: 'center', fontSize: 12, fontWeight: '900' },
  zoomButton: { minWidth: 48, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginLeft: 3 },
  zoomButtonActive: { backgroundColor: colors.primary },
  zoomText: { fontSize: 12, fontWeight: '700' },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, AppState, Modal, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { usePreventRemove } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { FlipbookViewer, FlipbookViewerRef } from '../../component/flipbook/FlipbookViewer';
import { FlipbookControls } from '../../component/flipbook/FlipbookControls';
import { ReaderSettingsModal } from '../../component/flipbook/ReaderSettingsModal';
import { LoadState } from '../../component/LoadState';
import { colors } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { createAnnotation, createBookmark, deleteAnnotation, deleteBookmark, getBookAnnotations, getBookBookmarks, updateAnnotation } from '../../services/api';
import { saveLocalReadingProgress } from '../../services/localReadingProgress';
import { errorMessage } from '../../services/http';
import { Annotation, AnnotationInput, AnnotationPoint, Bookmark, UserPreference } from '../../types';
const PENDING_DRAWING_ID = -1;
export function ReaderScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Reader'>) {
  const { session } = useAuth();
  const systemColorScheme = useColorScheme();
  const { book, initialPage } = route.params;
  // Reader always starts in the app's light presentation. Users can still
  // switch to Dark, Sepia or System from the reading settings for this session.
  const [preferences, setPreferences] = useState<UserPreference>({
    ...route.params.preferences,
    themeMode: 'LIGHT',
    brightness: 1,
  });
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
  const [readerChrome, setReaderChrome] = useState({ top: 82, bottom: 118 });
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
  const [pendingDrawing, setPendingDrawing] = useState<AnnotationInput | null>(null);
  const [annotationEditor, setAnnotationEditor] = useState<{ drawing: AnnotationInput; annotation?: Annotation } | null>(null);
  const [annotationNote, setAnnotationNote] = useState('');
  const [annotationSaving, setAnnotationSaving] = useState(false);
  const viewer = useRef<FlipbookViewerRef>(null);
  const requestedPage = useRef<number | null>(null);
  const jumpFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readerOpacity = useRef(new Animated.Value(0)).current;
  const progressSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  usePreventRemove(!!pendingDrawing, ({ data }) => {
    Alert.alert('Nét vẽ chưa được lưu', 'Bạn muốn tiếp tục chỉnh sửa hay bỏ nét vẽ và rời khỏi sách?', [
      { text: 'Tiếp tục vẽ', style: 'cancel', onPress: () => { setDrawingMode(true); setVisible(true); } },
      { text: 'Xem để lưu', onPress: () => {
        setDrawingMode(false); setVisible(true); setAnnotationNote('');
        if (pendingDrawing) setAnnotationEditor({ drawing: pendingDrawing });
      } },
      { text: 'Bỏ và rời đi', style: 'destructive', onPress: () => {
        setPendingDrawing(null);
        setAnnotations(items => items.filter(item => item.id !== PENDING_DRAWING_ID));
        navigation.dispatch(data.action);
      } },
    ]);
  });
  const persistPage = (value: number) => {
    if (!session?.user.id) return;
    void saveLocalReadingProgress(session.user.id, book.id, value, book.totalPages).catch(() => {});
  };
  const handlePageChange = (next: number) => {
    pageRef.current = next;
    setPage(next);
    setZoom(1);
    if (requestedPage.current === next) {
      requestedPage.current = null;
      if (jumpFallbackTimer.current) clearTimeout(jumpFallbackTimer.current);
      jumpFallbackTimer.current = null;
    }
    if (!session?.user.id) return;
    if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
    progressSaveTimer.current = setTimeout(() => {
      progressSaveTimer.current = null;
      persistPage(pageRef.current);
    }, 5000);
  };
  useEffect(() => () => {
    if (jumpFallbackTimer.current) clearTimeout(jumpFallbackTimer.current);
  }, []);
  useEffect(() => () => {
    if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
    persistPage(pageRef.current);
  }, [book.id, book.totalPages, session?.user.id]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
        progressSaveTimer.current = null;
        persistPage(pageRef.current);
      }
    });
    return () => subscription.remove();
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
  const pendingCoordinates = pendingDrawing?.coordinateData;
  const pendingStrokeCount = Array.isArray(pendingCoordinates) && pendingCoordinates.length
    ? (Array.isArray(pendingCoordinates[0]) ? pendingCoordinates.length : 1) : 0;
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
  const appendDrawingStroke = (drawing: AnnotationInput) => {
    const points = Array.isArray(drawing.coordinateData) ? drawing.coordinateData as AnnotationPoint[] : [];
    setPendingDrawing(current => {
      const previous = current?.coordinateData;
      const strokes: AnnotationPoint[][] = Array.isArray(previous)
        ? (Array.isArray(previous[0]) ? previous as AnnotationPoint[][] : [previous as AnnotationPoint[]]) : [];
      const next: AnnotationInput = current
        ? { ...current, color: drawing.color, strokeWidth: drawing.strokeWidth, coordinateData: [...strokes, points] }
        : { ...drawing, coordinateData: [points] };
      setAnnotations(items => [...items.filter(item => item.id !== PENDING_DRAWING_ID), { ...next, id: PENDING_DRAWING_ID }]);
      return next;
    });
  };
  const editDrawingNote = (annotation: Annotation) => {
    setAnnotationNote(annotation.noteText || '');
    setAnnotationEditor({ drawing: annotation, annotation });
  };
  const finishAnnotationEdit = async (saveNote: boolean) => {
    if (!annotationEditor || annotationSaving) return;
    const noteText = saveNote ? annotationNote.trim() : '';
    setAnnotationSaving(true);
    try {
      if (annotationEditor.annotation) {
        const updated = await updateAnnotation(annotationEditor.annotation.id, { noteText });
        setAnnotations(items => items.map(item => item.id === updated.id ? updated : item));
      } else {
        const created = await createAnnotation({ ...annotationEditor.drawing, ...(noteText ? { noteText } : {}) });
        setAnnotations(items => items.map(item => item.id === PENDING_DRAWING_ID ? created : item));
        setPendingDrawing(null);
      }
      setAnnotationEditor(null); setAnnotationNote('');
    } catch (cause) {
      Alert.alert('Không thể lưu ghi chú', errorMessage(cause));
    } finally { setAnnotationSaving(false); }
  };
  const removeAnnotation = async (annotation: Annotation) => {
    if (annotation.id === PENDING_DRAWING_ID) {
      setPendingDrawing(current => {
        if (!current) return null;
        const value = current.coordinateData;
        const strokes: AnnotationPoint[][] = Array.isArray(value)
          ? (Array.isArray(value[0]) ? value as AnnotationPoint[][] : [value as AnnotationPoint[]]) : [];
        const remaining = strokes.slice(0, -1);
        if (!remaining.length) {
          setAnnotations(items => items.filter(item => item.id !== PENDING_DRAWING_ID));
          return null;
        }
        const next = { ...current, coordinateData: remaining };
        setAnnotations(items => items.map(item => item.id === PENDING_DRAWING_ID ? { ...next, id: PENDING_DRAWING_ID } : item));
        return next;
      });
      return;
    }
    const previous = annotations;
    setAnnotations(items => items.filter(item => item.id !== annotation.id));
    try { await deleteAnnotation(annotation.id); }
    catch (cause) {
      setAnnotations(previous);
      Alert.alert('Không thể xóa nét vẽ', errorMessage(cause));
    }
  };
  const confirmRemoveAnnotation = (annotation: Annotation) => {
    if (annotation.id === PENDING_DRAWING_ID) { void removeAnnotation(annotation); return; }
    Alert.alert('Xóa chú thích?', 'Nét vẽ hoặc ghi chú này sẽ bị xóa khỏi sách.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => void removeAnnotation(annotation) },
    ]);
  };
  useEffect(() => {
    if (ready || error) return;
    const timer = setTimeout(() => setError('Nội dung sách phản hồi quá lâu. Vui lòng thử lại.'), 20000);
    return () => clearTimeout(timer);
  }, [ready, error, attempt]);
  return <View style={styles.screen}>
    <StatusBar hidden={ready && !visible} barStyle={resolvedPreferences.themeMode === 'DARK' ? 'light-content' : 'dark-content'} />
    <Animated.View style={[styles.viewer, {
      opacity: readerOpacity,
      marginTop: ready && visible ? readerChrome.top : 0,
      marginBottom: ready && visible && !drawingMode ? readerChrome.bottom : 0,
    }]}>
      <FlipbookViewer key={attempt} ref={viewer} book={book} accessToken={session?.accessToken} annotations={annotations}
        drawingMode={{ enabled: drawingMode, color: drawingColor, strokeWidth: drawingWidth }} onDrawingCreated={drawing => {
          appendDrawingStroke(drawing);
        }}
        initialPage={openingPage} preferences={enginePreferences}
        onPageChange={handlePageChange} onToggleControls={() => setVisible(x => !x)}
        onZoomChange={setZoom}
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
        onTopBarHeightChange={height => setReaderChrome(current => current.top === height ? current : { ...current, top: height })}
        onFooterHeightChange={height => setReaderChrome(current => current.bottom === height ? current : { ...current, bottom: height })}
        zoom={zoom} onZoomChange={scale => { setZoom(scale); viewer.current?.zoom(scale); }}
        onBack={navigation.goBack} onPrevPage={() => viewer.current?.flipPrev()} onNextPage={() => viewer.current?.flipNext()}
        onJumpToPage={target => {
          requestedPage.current = target;
          if (jumpFallbackTimer.current) clearTimeout(jumpFallbackTimer.current);
          viewer.current?.goToPage(target);
          jumpFallbackTimer.current = setTimeout(() => {
            jumpFallbackTimer.current = null;
            if (pageRef.current === target) { requestedPage.current = null; return; }
            requestedPage.current = null;
            pageRef.current = target;
            setPage(target);
            setOpeningPage(target);
            setZoom(1);
            setError('');
            setReady(false);
            readerOpacity.setValue(0);
            setAttempt(value => value + 1);
          }, 1400);
        }} onOpenSettings={() => setSettingsVisible(true)}
        bookmarks={bookmarks} annotations={annotations} bookmarksLoading={bookmarksLoading} annotationsLoading={annotationsLoading}
        bookmarksError={bookmarksError} annotationsError={annotationsError}
        onRetryBookmarks={() => setMarksReload(value => value + 1)} onRetryAnnotations={() => setMarksReload(value => value + 1)}
        onToggleBookmark={toggleBookmark} currentPageBookmarked={!!currentBookmark} bookmarkSaving={bookmarkSaving}
        drawingMode={drawingMode} drawingColor={drawingColor} drawingWidth={drawingWidth} drawingLocked={!!pendingDrawing}
        drawingStrokeCount={pendingStrokeCount}
        onToggleDrawing={() => {
          if (drawingMode && pendingDrawing) {
            setDrawingMode(false); setVisible(true); setAnnotationNote(''); setAnnotationEditor({ drawing: pendingDrawing });
          } else { setDrawingMode(value => !value); setVisible(true); }
        }}
        onCancelDrawing={() => {
          const discard = () => {
            setPendingDrawing(null);
            setAnnotations(items => items.filter(item => item.id !== PENDING_DRAWING_ID));
            setDrawingMode(false);
            setVisible(true);
          };
          if (!pendingDrawing) { discard(); return; }
          Alert.alert('Hủy nét vẽ?', 'Các nét chưa lưu trên trang này sẽ bị xóa.', [
            { text: 'Tiếp tục vẽ', style: 'cancel' },
            { text: 'Hủy nét vẽ', style: 'destructive', onPress: discard },
          ]);
        }}
        onDrawingColorChange={setDrawingColor} onDrawingWidthChange={setDrawingWidth}
        onDeleteBookmark={async bookmark => {
          try { await deleteBookmark(bookmark.id); setBookmarks(items => items.filter(item => item.id !== bookmark.id)); }
          catch (cause) { Alert.alert('Không thể xóa đánh dấu', errorMessage(cause)); }
        }} onDeleteAnnotation={confirmRemoveAnnotation} onEditAnnotation={editDrawingNote}
        onSelectAnnotation={annotation => { viewer.current?.selectAnnotation(annotation.id, annotation.pageNumber); setVisible(false); }} />
    </>}
    <Modal visible={!!annotationEditor} transparent animationType="fade" onRequestClose={() => {
      if (annotationEditor?.annotation) setAnnotationEditor(null);
    }}>
      <View style={styles.annotationModalBackdrop}>
        <View style={[styles.annotationModalCard, resolvedPreferences.themeMode === 'DARK' && styles.annotationModalCardDark]}>
          <View style={[styles.annotationModalIcon, resolvedPreferences.themeMode === 'DARK' && styles.annotationModalIconDark]}><Text style={styles.annotationModalIconText}>✎</Text></View>
          <Text style={[styles.annotationModalTitle, resolvedPreferences.themeMode === 'DARK' && styles.annotationTextDark]}>{annotationEditor?.annotation ? 'Sửa ghi chú nét vẽ' : 'Lưu nét vẽ trang này'}</Text>
          <Text style={[styles.annotationModalSubtitle, resolvedPreferences.themeMode === 'DARK' && styles.annotationMutedDark]}>{annotationEditor?.annotation
            ? 'Đặt nội dung dễ nhớ để nhận biết nét vẽ trong danh sách chú thích.'
            : `Các nét vừa vẽ ở trang ${annotationEditor?.drawing.pageNumber || page} sẽ được lưu thành một chú thích. Ghi chú là tùy chọn.`}</Text>
          <TextInput value={annotationNote} onChangeText={setAnnotationNote} autoFocus multiline maxLength={240}
            placeholder="Ví dụ: Công thức cần nhớ" placeholderTextColor="#94A3B8"
            style={[styles.annotationNoteInput, resolvedPreferences.themeMode === 'DARK' && styles.annotationNoteInputDark]} />
          <Text style={[styles.annotationNoteCount, resolvedPreferences.themeMode === 'DARK' && styles.annotationMutedDark]}>{annotationNote.length}/240</Text>
          {!annotationEditor?.annotation ? <View style={styles.annotationSecondaryActions}>
            <TouchableOpacity disabled={annotationSaving} style={styles.discardDrawingButton} onPress={() => {
              setAnnotations(items => items.filter(item => item.id !== PENDING_DRAWING_ID)); setPendingDrawing(null);
              setAnnotationEditor(null); setAnnotationNote('');
            }}><Text style={styles.discardDrawingText}>Bỏ nét vẽ</Text></TouchableOpacity>
            <TouchableOpacity disabled={annotationSaving} style={styles.continueDrawingButton} onPress={() => {
              setAnnotationEditor(null); setAnnotationNote(''); setDrawingMode(true); setVisible(true);
            }}><Text style={styles.continueDrawingText}>Vẽ tiếp</Text></TouchableOpacity>
          </View> : null}
          <View style={styles.annotationModalActions}>
            {annotationEditor?.annotation ? <TouchableOpacity disabled={annotationSaving} style={[styles.annotationSkipButton, resolvedPreferences.themeMode === 'DARK' && styles.annotationSkipButtonDark]} onPress={() => {
              setAnnotationEditor(null); setAnnotationNote('');
            }}><Text style={[styles.annotationSkipText, resolvedPreferences.themeMode === 'DARK' && styles.annotationMutedDark]}>Hủy</Text></TouchableOpacity> : null}
            <TouchableOpacity disabled={annotationSaving} style={[styles.annotationSaveButton, annotationSaving && styles.annotationSaveDisabled]}
              onPress={() => void finishAnnotationEdit(!!annotationNote.trim())}><Text style={styles.annotationSaveText}>{annotationSaving ? 'Đang lưu…' : annotationNote.trim() ? 'Lưu nét vẽ & ghi chú' : 'Lưu nét vẽ'}</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  annotationModalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(15,23,42,0.62)' },
  annotationModalCard: { width: '100%', maxWidth: 430, borderRadius: 20, padding: 19, backgroundColor: colors.surface },
  annotationModalCardDark: { backgroundColor: '#18212F', borderWidth: 1, borderColor: '#334155' },
  annotationModalIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', marginBottom: 12 },
  annotationModalIconDark: { backgroundColor: '#123D35' }, annotationTextDark: { color: '#F8FAFC' }, annotationMutedDark: { color: '#CBD5E1' },
  annotationModalIconText: { color: colors.primary, fontSize: 26, fontWeight: '800' },
  annotationModalTitle: { color: colors.text, fontSize: 18, fontWeight: '900' }, annotationModalSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  annotationNoteInput: { minHeight: 100, maxHeight: 150, marginTop: 15, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', color: colors.text, fontSize: 14, textAlignVertical: 'top' },
  annotationNoteInputDark: { backgroundColor: '#111827', borderColor: '#475569', color: '#F8FAFC' },
  annotationNoteCount: { color: '#94A3B8', fontSize: 10, textAlign: 'right', marginTop: 5 },
  annotationSecondaryActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  discardDrawingButton: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#FEF2F2' },
  discardDrawingText: { color: '#DC2626', fontSize: 12, fontWeight: '800' },
  continueDrawingButton: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#ECFDF5' },
  continueDrawingText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  annotationModalActions: { flexDirection: 'row', gap: 10, marginTop: 15 }, annotationSkipButton: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: colors.border }, annotationSkipText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  annotationSkipButtonDark: { borderColor: '#475569', backgroundColor: '#111827' },
  annotationSaveButton: { flex: 1.3, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.primary }, annotationSaveDisabled: { opacity: 0.45 }, annotationSaveText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
});

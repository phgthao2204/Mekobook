import React, { useEffect, useRef, useState } from 'react';
import { Appearance, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { FlipbookViewer, FlipbookViewerRef } from '../../component/flipbook/FlipbookViewer';
import { FlipbookControls } from '../../component/flipbook/FlipbookControls';
import { LoadState } from '../../component/LoadState';
import { colors } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
export function ReaderScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Reader'>) {
  const { session } = useAuth();
  const { book, initialPage } = route.params;
  const [preferences] = useState(() => ({ ...route.params.preferences,
    themeMode: route.params.preferences.themeMode === 'SYSTEM'
      ? (Appearance.getColorScheme() === 'dark' ? 'DARK' : 'LIGHT') as 'DARK' | 'LIGHT' : route.params.preferences.themeMode }));
  const [page, setPage] = useState(initialPage);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const viewer = useRef<FlipbookViewerRef>(null);
  useEffect(() => {
    if (ready || error) return;
    const timer = setTimeout(() => setError('Nội dung sách phản hồi quá lâu. Vui lòng thử lại.'), 20000);
    return () => clearTimeout(timer);
  }, [ready, error, attempt]);
  return <View style={styles.screen}>
    <StatusBar hidden={ready && !visible} barStyle={preferences.themeMode === 'DARK' ? 'light-content' : 'dark-content'} />
    <FlipbookViewer key={attempt} ref={viewer} book={book} accessToken={session?.accessToken}
      initialPage={initialPage} preferences={preferences}
      onPageChange={next => { setPage(next); setZoom(1); }} onToggleControls={() => setVisible(x => !x)}
      onReady={() => { setReady(true); setError(''); }} onError={setError} />
    {(!ready || error) ? <View style={StyleSheet.absoluteFill}>
      <LoadState message={`Đang mở ${book.title} — trang ${initialPage}...`} error={error} onBack={navigation.goBack}
        onRetry={() => { setError(''); setReady(false); setZoom(1); setPage(initialPage); setAttempt(x => x + 1); }} />
    </View> : <>
      <FlipbookControls book={book} currentPage={page} totalPages={book.totalPages} visible={visible}
        themeMode={preferences.themeMode}
        onBack={navigation.goBack} onPrevPage={() => viewer.current?.flipPrev()} onNextPage={() => viewer.current?.flipNext()}
        onJumpToPage={target => viewer.current?.goToPage(target)} />
      {visible && <View style={styles.zoom}>
        {[1, 1.5, 2, 3].map(scale => <TouchableOpacity key={scale} accessibilityRole="button"
          accessibilityLabel={`Phóng trang ${scale * 100}%`} style={styles.zoomButton}
          onPress={() => { setZoom(scale); viewer.current?.zoom(scale); }}>
          <Text style={{ color: zoom === scale ? colors.primary : colors.muted }}>{scale * 100}%</Text>
        </TouchableOpacity>)}
      </View>}
    </>}
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, zoom: { position: 'absolute', bottom: 105, alignSelf: 'center', flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, elevation: 3 },
  zoomButton: { padding: 12 },
});

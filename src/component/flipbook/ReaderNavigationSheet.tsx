import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { getMediaRequestHeaders } from '../../services/http';
import { getThumbnailUrl } from '../../services/api';
import { Annotation, Book, Bookmark } from '../../types';

export type ReaderNavigationMode = 'thumbnails' | 'bookmarks' | 'annotations';

interface ReaderNavigationSheetProps {
  visible: boolean;
  mode: ReaderNavigationMode | null;
  book: Book;
  currentPage: number;
  bookmarks: Bookmark[];
  annotations: Annotation[];
  bookmarksLoading: boolean;
  annotationsLoading: boolean;
  bookmarksError?: string;
  annotationsError?: string;
  onRetryBookmarks: () => void;
  onRetryAnnotations: () => void;
  onClose: () => void;
  onJumpToPage: (page: number) => void;
}

function safeColor(value?: string): string {
  return value && /^#[\da-f]{3,8}$/i.test(value) ? value : colors.primary;
}

function ThumbnailTile({ book, page, currentPage, onPress }: {
  book: Book; page: number; currentPage: number; onPress: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const uri = useMemo(() => getThumbnailUrl(book, page), [book, page]);
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Mở trang ${page}`}
    style={[styles.thumbnailTile, currentPage === page && styles.thumbnailTileActive]} onPress={onPress}>
    {failed ? <View style={styles.thumbnailPlaceholder}><Ionicons name="image-outline" size={26} color={colors.muted} /></View>
      : <Image source={{ uri, headers: getMediaRequestHeaders(uri) }} resizeMode="contain"
        onError={() => setFailed(true)} style={styles.thumbnailImage} />}
    <Text style={[styles.thumbnailPage, currentPage === page && styles.itemTextActive]}>{`Trang ${page}`}</Text>
  </TouchableOpacity>;
}

export function ReaderNavigationSheet(props: ReaderNavigationSheetProps) {
  const { visible, mode, book, currentPage, bookmarks, annotations, onClose, onJumpToPage } = props;
  const pages = useMemo(() => Array.from({ length: book.totalPages }, (_, index) => index + 1), [book.totalPages]);
  if (!mode) return null;
  const title = mode === 'thumbnails' ? 'Ảnh thu nhỏ' : mode === 'bookmarks' ? 'Trang đã đánh dấu' : 'Ghi chú và vùng đánh dấu';
  const loading = mode === 'bookmarks' ? props.bookmarksLoading : mode === 'annotations' ? props.annotationsLoading : false;
  const error = mode === 'bookmarks' ? props.bookmarksError : mode === 'annotations' ? props.annotationsError : '';
  const empty = mode === 'bookmarks' ? bookmarks.length === 0 : mode === 'annotations' ? annotations.length === 0 : false;

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{book.title}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng" style={styles.close}
            onPress={onClose}><Ionicons name="close" size={22} color={colors.muted} /></TouchableOpacity>
        </View>
        {loading ? <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Đang tải dữ liệu…</Text>
        </View> : error ? <View style={styles.state}>
          <Ionicons name="cloud-offline-outline" size={30} color={colors.muted} />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.retryButton}
            onPress={mode === 'bookmarks' ? props.onRetryBookmarks : props.onRetryAnnotations}>
            <Text style={styles.retryText}>Thử tải lại</Text>
          </TouchableOpacity>
        </View> : empty ? <View style={styles.state}>
          <Ionicons name={mode === 'bookmarks' ? 'bookmark-outline' : 'document-text-outline'} size={30} color={colors.muted} />
          <Text style={styles.stateText}>{mode === 'bookmarks' ? 'Chưa có trang nào được đánh dấu.' : 'Sách chưa có ghi chú hoặc vùng đánh dấu.'}</Text>
        </View> : mode === 'thumbnails' ? <FlatList
          key="thumbnails-grid" data={pages} numColumns={3} keyExtractor={page => String(page)}
          contentContainerStyle={styles.list} columnWrapperStyle={styles.thumbnailRow}
          initialNumToRender={18} maxToRenderPerBatch={18} windowSize={7}
          renderItem={({ item }) => <ThumbnailTile book={book} page={item} currentPage={currentPage}
            onPress={() => { onClose(); onJumpToPage(item); }} />}
        /> : mode === 'bookmarks' ? <FlatList<Bookmark>
          data={bookmarks} keyExtractor={(item, index) => String(item.id || `${item.pageNumber}-${index}`)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <TouchableOpacity accessibilityRole="button"
            accessibilityLabel={`Mở trang đánh dấu ${item.pageNumber}`} style={styles.listRow}
            onPress={() => { onClose(); onJumpToPage(item.pageNumber); }}>
            <View style={[styles.marker, { backgroundColor: safeColor(item.colorTag || item.colorCode) }]} />
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{item.chapterTitle || item.bookmarkTitle || `Trang ${item.pageNumber}`}</Text>
              {!!item.note && <Text style={styles.rowDetail} numberOfLines={2}>{item.note}</Text>}
            </View>
            <Text style={styles.pagePill}>{`Tr. ${item.pageNumber}`}</Text>
          </TouchableOpacity>}
        /> : <FlatList<Annotation>
          data={annotations} keyExtractor={(item, index) => String(item.id || `${item.pageNumber}-${index}`)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <TouchableOpacity accessibilityRole="button"
            accessibilityLabel={`Mở ghi chú trang ${item.pageNumber}`} style={styles.listRow}
            onPress={() => { onClose(); onJumpToPage(item.pageNumber); }}>
            <View style={[styles.marker, { backgroundColor: safeColor(item.color) }]} />
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{item.type === 'HIGHLIGHT' ? 'Vùng đánh dấu' : item.type === 'DRAWING_PEN' ? 'Nét vẽ' : 'Ghi chú'}</Text>
              {!!item.noteText && <Text style={styles.rowDetail} numberOfLines={3}>{item.noteText}</Text>}
            </View>
            <Text style={styles.pagePill}>{`Tr. ${item.pageNumber}`}</Text>
          </TouchableOpacity>}
        />}
      </SafeAreaView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.55)' },
  dismissArea: { flex: 1 },
  sheet: { maxHeight: '82%', minHeight: '42%', backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  header: { minHeight: 68, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  titleWrap: { flex: 1, marginRight: 12 },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  list: { padding: 14, paddingBottom: 28 },
  thumbnailRow: { justifyContent: 'space-between' },
  thumbnailTile: { width: '32%', marginBottom: 12, padding: 5, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  thumbnailTileActive: { borderColor: colors.primary, borderWidth: 2 },
  thumbnailImage: { width: '100%', aspectRatio: 0.72, backgroundColor: '#E2E8F0', borderRadius: 6 },
  thumbnailPlaceholder: { width: '100%', aspectRatio: 0.72, borderRadius: 6, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  thumbnailPage: { textAlign: 'center', color: colors.text, fontSize: 11, fontWeight: '700', paddingTop: 5 },
  itemTextActive: { color: colors.primary },
  listRow: { minHeight: 62, padding: 12, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface },
  marker: { width: 10, height: 34, borderRadius: 5, marginRight: 12 },
  rowCopy: { flex: 1, marginRight: 10 },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  rowDetail: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  pagePill: { color: colors.primary, fontSize: 11, fontWeight: '800', backgroundColor: '#ECFDF5', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8 },
  state: { minHeight: 180, padding: 24, alignItems: 'center', justifyContent: 'center' },
  stateText: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 10 },
  retryButton: { minHeight: 40, paddingHorizontal: 16, borderRadius: 10, marginTop: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  retryText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
});

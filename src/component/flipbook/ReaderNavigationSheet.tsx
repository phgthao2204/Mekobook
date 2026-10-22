import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
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
  onBack?: () => void;
  onClose: () => void;
  onJumpToPage: (page: number) => void;
  onDeleteBookmark: (bookmark: Bookmark) => void;
  onDeleteAnnotation: (annotation: Annotation) => void;
  onEditAnnotation: (annotation: Annotation) => void;
  onSelectAnnotation: (annotation: Annotation) => void;
}

function safeColor(value?: string): string {
  return value && /^#[\da-f]{3,8}$/i.test(value) ? value : colors.primary;
}

function annotationTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
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
  const title = mode === 'thumbnails' ? 'Trang' : mode === 'bookmarks' ? 'Trang đã đánh dấu' : 'Chú thích';
  const loading = mode === 'bookmarks' ? props.bookmarksLoading : mode === 'annotations' ? props.annotationsLoading : false;
  const error = mode === 'bookmarks' ? props.bookmarksError : mode === 'annotations' ? props.annotationsError : '';
  const empty = mode === 'bookmarks' ? bookmarks.length === 0 : mode === 'annotations' ? annotations.length === 0 : false;

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={props.onBack || onClose}>
    <View style={styles.backdrop}>
      <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.header}>
          {props.onBack ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại Công cụ đọc"
            style={styles.back} onPress={props.onBack}><Ionicons name="arrow-back" size={21} color={colors.text} /></TouchableOpacity> : null}
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{book.title}</Text>
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
          <Text style={styles.stateText}>{mode === 'bookmarks' ? 'Chưa có trang nào được đánh dấu.' : 'Sách chưa có ghi chú hoặc nét vẽ.'}</Text>
        </View> : mode === 'thumbnails' ? <FlatList
          key="thumbnails-grid" data={pages} numColumns={3} keyExtractor={page => String(page)}
          contentContainerStyle={styles.list} columnWrapperStyle={styles.thumbnailRow}
          initialNumToRender={18} maxToRenderPerBatch={18} windowSize={7}
          renderItem={({ item }) => <ThumbnailTile book={book} page={item} currentPage={currentPage}
            onPress={() => { onClose(); onJumpToPage(item); }} />}
        /> : mode === 'bookmarks' ? <FlatList<Bookmark>
          data={bookmarks} keyExtractor={(item, index) => String(item.id || `${item.pageNumber}-${index}`)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <View style={styles.listRow}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Mở trang đã đánh dấu ${item.pageNumber}`}
              style={styles.rowMain} onPress={() => { onClose(); onJumpToPage(item.pageNumber); }}>
            <View style={styles.itemIcon}><Ionicons name="bookmark" size={18} color={safeColor(item.colorTag || item.colorCode)} /></View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Trang đã đánh dấu</Text>
              <Text style={styles.rowDetail} numberOfLines={2}>{item.note || item.chapterTitle || item.bookmarkTitle || `Trang ${item.pageNumber}`}</Text>
            </View>
            <Text style={styles.pagePill}>{`Tr. ${item.pageNumber}`}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Xóa đánh dấu trang ${item.pageNumber}`}
              style={styles.deleteButton} onPress={() => props.onDeleteBookmark(item)}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>}
        /> : <FlatList<Annotation>
          data={annotations} keyExtractor={(item, index) => String(item.id || `${item.pageNumber}-${index}`)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const drawing = item.type === 'DRAWING_PEN';
            const createdAt = annotationTime(item.dateCreated);
            const fallbackTitle = drawing && createdAt ? `Nét vẽ lúc ${createdAt}` : drawing ? `Nét vẽ #${item.id}` : item.type === 'HIGHLIGHT' ? 'Vùng đánh dấu' : 'Ghi chú';
            return <View style={styles.listRow}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Mở ghi chú trang ${item.pageNumber}`}
              style={styles.rowMain} onPress={() => { onClose(); props.onSelectAnnotation(item); }}>
            <View style={styles.itemIcon}><Ionicons name={item.type === 'DRAWING_PEN' ? 'pencil' : 'document-text'} size={18} color={safeColor(item.color)} /></View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle} numberOfLines={2}>{item.noteText || fallbackTitle}</Text>
              <Text style={styles.rowDetail} numberOfLines={2}>{[drawing ? safeColor(item.color) : '', createdAt].filter(Boolean).join(' · ') || `Trang ${item.pageNumber}`}</Text>
            </View>
            <Text style={styles.pagePill}>{`Tr. ${item.pageNumber}`}</Text>
            </TouchableOpacity>
            {drawing ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Sửa ghi chú nét vẽ trang ${item.pageNumber}`}
              style={styles.editButton} onPress={() => props.onEditAnnotation(item)}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity> : null}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Xóa nét vẽ trang ${item.pageNumber}`}
              style={styles.deleteButton} onPress={() => props.onDeleteAnnotation(item)}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>; }}
        />}
      </SafeAreaView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.55)' },
  dismissArea: { flex: 1 },
  sheet: { maxHeight: '82%', minHeight: '42%', backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  header: { minHeight: 76, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  titleWrap: { flex: 1, marginRight: 12 },
  back: { width: 38, height: 38, borderRadius: 19, marginRight: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 3 },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  list: { padding: 14, paddingBottom: 28 },
  thumbnailRow: { justifyContent: 'flex-start', gap: 8 },
  thumbnailTile: { width: '31.6%', marginBottom: 12, padding: 5, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  thumbnailTileActive: { borderColor: colors.primary, borderWidth: 2 },
  thumbnailImage: { width: '100%', aspectRatio: 0.72, backgroundColor: '#E2E8F0', borderRadius: 6 },
  thumbnailPlaceholder: { width: '100%', aspectRatio: 0.72, borderRadius: 6, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  thumbnailPage: { textAlign: 'center', color: colors.text, fontSize: 11, fontWeight: '700', paddingTop: 5 },
  itemTextActive: { color: colors.primary },
  listRow: { minHeight: 62, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface },
  rowMain: { flex: 1, minHeight: 60, padding: 12, flexDirection: 'row', alignItems: 'center' },
  deleteButton: { width: 44, minHeight: 60, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.border },
  editButton: { width: 44, minHeight: 60, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.border },
  itemIcon: { width: 38, height: 38, borderRadius: 10, marginRight: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  rowCopy: { flex: 1, marginRight: 10 },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  rowDetail: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  pagePill: { color: colors.primary, fontSize: 11, fontWeight: '800', backgroundColor: '#ECFDF5', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8 },
  state: { minHeight: 180, padding: 24, alignItems: 'center', justifyContent: 'center' },
  stateText: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 10 },
  retryButton: { minHeight: 40, paddingHorizontal: 16, borderRadius: 10, marginTop: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  retryText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
});

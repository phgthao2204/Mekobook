import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, darkColors, lightColors, radius, spacing, typography } from '../../theme';
import { getMediaRequestHeaders } from '../../services/http';
import { getThumbnailUrl } from '../../services/api';
import { Annotation, Book, Bookmark, UserPreference } from '../../types';

export type ReaderNavigationMode = 'thumbnails' | 'bookmarks' | 'annotations';

interface ReaderNavigationSheetProps {
  visible: boolean;
  mode: ReaderNavigationMode | null;
  book: Book;
  currentPage: number;
  bookmarks: Bookmark[];
  annotations: Annotation[];
  themeMode?: UserPreference['themeMode'];
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

function ThumbnailTile({ book, page, currentPage, onPress, ui }: {
  book: Book; page: number; currentPage: number; onPress: () => void;
  ui: { surface: string; muted: string; text: string; textMuted: string; border: string; primary: string; primarySoft: string };
}) {
  const [failed, setFailed] = useState(false);
  const uri = useMemo(() => getThumbnailUrl(book, page), [book, page]);
  const active = currentPage === page;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Mở trang ${page}`}
    style={[styles.thumbnailTile, active && styles.thumbnailTileActive,
      { backgroundColor: active ? ui.primarySoft : ui.surface, borderColor: active ? ui.primary : ui.border }]} onPress={onPress}>
    {failed ? <View style={[styles.thumbnailPlaceholder, { backgroundColor: active ? ui.primarySoft : ui.muted }]}>
      <Text style={[styles.thumbnailPlaceholderText, { color: active ? ui.primary : ui.textMuted }]}>{active ? 'Hiện tại' : `Trang ${page}`}</Text>
    </View>
      : <Image source={{ uri, headers: getMediaRequestHeaders(uri) }} resizeMode="contain"
        onError={() => setFailed(true)} style={styles.thumbnailImage} />}
    <Text style={[styles.thumbnailPage, { color: active ? ui.primary : ui.text }]}>{`Trang ${page}`}</Text>
  </TouchableOpacity>;
}

export function ReaderNavigationSheet(props: ReaderNavigationSheetProps) {
  const { visible, mode, book, currentPage, bookmarks, annotations, onClose, onJumpToPage } = props;
  const pages = useMemo(() => Array.from({ length: book.totalPages }, (_, index) => index + 1), [book.totalPages]);
  if (!mode) return null;
  const title = mode === 'thumbnails' ? 'Danh Sách Trang Thu Nhỏ'
    : mode === 'bookmarks' ? `Bookmarks (${bookmarks.length})` : 'Quản Lý Chú Thích & Nét Vẽ';
  const titleIcon = mode === 'thumbnails' ? 'grid-outline' : mode === 'bookmarks' ? 'bookmark' : 'pencil';
  const loading = mode === 'bookmarks' ? props.bookmarksLoading : mode === 'annotations' ? props.annotationsLoading : false;
  const error = mode === 'bookmarks' ? props.bookmarksError : mode === 'annotations' ? props.annotationsError : '';
  const empty = mode === 'bookmarks' ? bookmarks.length === 0 : mode === 'annotations' ? annotations.length === 0 : false;
  const darkMode = props.themeMode === 'DARK';
  const sepiaMode = props.themeMode === 'SEPIA';
  const themeColors = darkMode ? darkColors : lightColors;
  const panelSurface = sepiaMode ? '#F3E8D1' : themeColors.surfaceRaised;
  const softSurface = sepiaMode ? '#E7D7B8' : themeColors.surfaceMuted;
  const primaryText = sepiaMode ? '#422F20' : themeColors.text;
  const mutedText = sepiaMode ? '#725A43' : themeColors.textSecondary;
  const panelBorder = sepiaMode ? '#CDBB9A' : themeColors.border;
  const primary = themeColors.primary;
  const primarySoft = sepiaMode ? '#DFCFAD' : themeColors.primarySoft;
  const thumbnailUi = { surface: softSurface, muted: sepiaMode ? '#DDCBA8' : themeColors.background,
    text: primaryText, textMuted: mutedText, border: panelBorder, primary, primarySoft };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={props.onBack || onClose}>
    <View style={styles.backdrop}>
      <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
      <SafeAreaView style={[styles.sheet, { backgroundColor: panelSurface, borderColor: panelBorder }]} edges={['bottom']}>
        <View style={[styles.header, { borderBottomColor: panelBorder }]}>
          {props.onBack ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại Công cụ đọc"
            style={[styles.back, { backgroundColor: softSurface }]} onPress={props.onBack}><Ionicons name="arrow-back" size={21} color={primaryText} /></TouchableOpacity> : null}
          <View style={styles.titleWrap}>
            <Ionicons name={titleIcon} size={17} color={mode === 'bookmarks' ? themeColors.warning : primary} />
            <Text style={[styles.title, { color: primaryText }]}>{title}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng" style={styles.close}
            onPress={onClose}><Ionicons name="close" size={22} color={mutedText} /></TouchableOpacity>
        </View>
        {loading ? <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.stateText, { color: mutedText }]}>Đang tải dữ liệu…</Text>
        </View> : error ? <View style={styles.state}>
          <Ionicons name="cloud-offline-outline" size={30} color={colors.muted} />
          <Text style={[styles.stateText, { color: mutedText }]}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.retryButton}
            onPress={mode === 'bookmarks' ? props.onRetryBookmarks : props.onRetryAnnotations}>
            <Text style={styles.retryText}>Thử tải lại</Text>
          </TouchableOpacity>
        </View> : empty ? <View style={styles.state}>
          <Ionicons name={mode === 'bookmarks' ? 'bookmark-outline' : 'document-text-outline'} size={30} color={colors.muted} />
          <Text style={[styles.stateText, { color: mutedText }]}>{mode === 'bookmarks' ? 'Chưa có trang nào được đánh dấu.' : 'Sách chưa có ghi chú hoặc nét vẽ.'}</Text>
        </View> : mode === 'thumbnails' ? <FlatList
          key="thumbnails-grid" data={pages} numColumns={3} keyExtractor={page => String(page)}
          contentContainerStyle={styles.list} columnWrapperStyle={styles.thumbnailRow}
          initialNumToRender={18} maxToRenderPerBatch={18} windowSize={7}
          renderItem={({ item }) => <ThumbnailTile book={book} page={item} currentPage={currentPage}
            ui={thumbnailUi}
            onPress={() => { onClose(); onJumpToPage(item); }} />}
        /> : mode === 'bookmarks' ? <FlatList<Bookmark>
          data={bookmarks} keyExtractor={(item, index) => String(item.id || `${item.pageNumber}-${index}`)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <View style={[styles.listRow, { backgroundColor: softSurface }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Mở trang đã đánh dấu ${item.pageNumber}`}
              style={styles.rowMain} onPress={() => { onClose(); onJumpToPage(item.pageNumber); }}>
            <View style={styles.rowCopy}>
              <Text style={[styles.rowTitle, { color: themeColors.warning }]}><Ionicons name="bookmark" size={15} color={themeColors.warning} /> {`Trang ${item.pageNumber}${item.pageNumber === currentPage ? ' (Hiện tại)' : ''}`}</Text>
              <Text style={[styles.rowDetail, { color: mutedText }]} numberOfLines={2}>{item.note || item.chapterTitle || item.bookmarkTitle || `Trang ${item.pageNumber}`}</Text>
            </View>
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
            return <View style={[styles.listRow, { backgroundColor: softSurface }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Mở ghi chú trang ${item.pageNumber}`}
              style={styles.rowMain} onPress={() => { onClose(); props.onSelectAnnotation(item); }}>
            <View style={[styles.itemIcon, { backgroundColor: softSurface }]}><Ionicons name={item.type === 'DRAWING_PEN' ? 'pencil' : 'document-text'} size={18} color={safeColor(item.color)} /></View>
            <View style={styles.rowCopy}>
              <Text style={[styles.rowTitle, { color: primaryText }]} numberOfLines={2}>{item.noteText || fallbackTitle}</Text>
              <Text style={[styles.rowDetail, { color: mutedText }]} numberOfLines={2}>{[drawing ? safeColor(item.color) : '', createdAt].filter(Boolean).join(' · ') || `Trang ${item.pageNumber}`}</Text>
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
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,23,0.72)' },
  dismissArea: { flex: 1 },
  sheet: { maxHeight: '84%', minHeight: '42%', backgroundColor: '#111B2E', borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    borderWidth: 1, borderBottomWidth: 0, borderColor: '#40506A', overflow: 'hidden' },
  header: { minHeight: 76, marginHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#334155' },
  titleWrap: { flex: 1, marginRight: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  back: { width: 38, height: 38, borderRadius: 19, marginRight: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { color: colors.text, ...typography.h6 },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 3 },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  thumbnailRow: { justifyContent: 'flex-start', gap: 8 },
  thumbnailTile: { width: '31.6%', marginBottom: 12, padding: 6, borderRadius: 8, borderWidth: 1, borderColor: '#40506A', backgroundColor: '#1C2940' },
  thumbnailTileActive: { borderWidth: 2 },
  thumbnailImage: { width: '100%', aspectRatio: 0.72, backgroundColor: '#34435A', borderRadius: 5 },
  thumbnailPlaceholder: { width: '100%', aspectRatio: 0.72, borderRadius: 5, backgroundColor: '#34435A', alignItems: 'center', justifyContent: 'center' },
  thumbnailPlaceholderText: { color: '#A9B5C7', fontSize: 11, fontWeight: '600' },
  thumbnailPage: { textAlign: 'center', color: '#D5DCE8', fontSize: 11, fontWeight: '700', paddingTop: 7, paddingBottom: 2 },
  listRow: { minHeight: 70, marginBottom: spacing.sm, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C2940' },
  rowMain: { flex: 1, minHeight: 60, padding: 12, flexDirection: 'row', alignItems: 'center' },
  deleteButton: { width: 44, minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  editButton: { width: 44, minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  itemIcon: { width: 38, height: 38, borderRadius: 10, marginRight: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  rowCopy: { flex: 1, marginRight: 10 },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  bookmarkTitle: { color: '#FBBF24' },
  rowDetail: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  pagePill: { color: colors.primary, fontSize: 11, fontWeight: '800', backgroundColor: '#ECFDF5', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8 },
  state: { minHeight: 180, padding: 24, alignItems: 'center', justifyContent: 'center' },
  stateText: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 10 },
  retryButton: { minHeight: 40, paddingHorizontal: 16, borderRadius: 10, marginTop: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  retryText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
});

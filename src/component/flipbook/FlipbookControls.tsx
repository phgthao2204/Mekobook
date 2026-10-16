/**
 * Mekobook Mobile - FlipbookControls Component
 * Minimalist navigation with Emerald Green theme (#059669) & Table of Contents (TOC) Modal
 * ZERO EMOJIS - USES PURE VECTOR ICONS (Ionicons)
 */

import { colors } from '../../constants/theme';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Annotation, Book, Bookmark, ChapterTOC, UserPreference } from '../../types';
import { getBookTOC } from '../../services/api';
import { errorMessage } from '../../services/http';
import { ReaderNavigationMode, ReaderNavigationSheet } from './ReaderNavigationSheet';
import { readingPercentage } from '../../utils/reader';

interface FlipbookControlsProps {
  book: Book;
  currentPage: number;
  totalPages: number;
  visible: boolean;
  onBack: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onJumpToPage: (page: number) => void;
  onOpenSettings: () => void;
  themeMode?: UserPreference['themeMode'];
  bookmarks: Bookmark[];
  annotations: Annotation[];
  bookmarksLoading: boolean;
  annotationsLoading: boolean;
  bookmarksError?: string;
  annotationsError?: string;
  onRetryBookmarks: () => void;
  onRetryAnnotations: () => void;
  onToggleBookmark: () => void;
  currentPageBookmarked: boolean;
  bookmarkSaving: boolean;
  drawingMode: boolean;
  drawingColor: string;
  drawingWidth: number;
  onToggleDrawing: () => void;
  onDrawingColorChange: (color: string) => void;
  onDrawingWidthChange: (width: number) => void;
  onDeleteBookmark: (bookmark: Bookmark) => void;
  onDeleteAnnotation: (annotation: Annotation) => void;
}

export const FlipbookControls: React.FC<FlipbookControlsProps> = ({
  book,
  currentPage,
  totalPages,
  visible,
  onBack,
  onPrevPage,
  onNextPage,
  onJumpToPage,
  onOpenSettings,
  themeMode = 'LIGHT',
  bookmarks,
  annotations,
  bookmarksLoading,
  annotationsLoading,
  bookmarksError,
  annotationsError,
  onRetryBookmarks,
  onRetryAnnotations,
  onToggleBookmark,
  currentPageBookmarked,
  bookmarkSaving,
  drawingMode,
  drawingColor,
  drawingWidth,
  onToggleDrawing,
  onDrawingColorChange,
  onDrawingWidthChange,
  onDeleteBookmark,
  onDeleteAnnotation,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 430;
  const [showToc, setShowToc] = useState<boolean>(false);
  const [readerMenuVisible, setReaderMenuVisible] = useState(false);
  const [tocList, setTocList] = useState<ChapterTOC[]>([]);
  const [loadingToc, setLoadingToc] = useState<boolean>(false);
  const [tocError, setTocError] = useState('');
  const [navigationMode, setNavigationMode] = useState<ReaderNavigationMode | null>(null);
  const [pagePickerVisible, setPagePickerVisible] = useState(false);
  const [pageInput, setPageInput] = useState(String(currentPage));
  const [pageInputError, setPageInputError] = useState('');

  useEffect(() => {
    let active = true;
    if (showToc && book.id) {
      setLoadingToc(true);
      setTocError('');
      getBookTOC(book.id)
        .then((items) => {
          if (active) setTocList(items);
        })
        .catch(error => { if (active) { setTocList([]); setTocError(errorMessage(error)); } })
        .finally(() => { if (active) setLoadingToc(false); });
    }
    return () => { active = false; };
  }, [showToc, book.id]);

  if (!visible) return null;

  const percentage = Math.round(readingPercentage(currentPage, totalPages));
  const latestCurrentPageDrawing = [...annotations].reverse().find(item =>
    item.pageNumber === currentPage && item.type === 'DRAWING_PEN');
  const pageLabel = currentPage === 1 && book.coverUrl ? 'Bìa sách' : `Trang ${currentPage}`;
  const readingSurface = { backgroundColor: themeMode === 'DARK' ? '#18212F' : themeMode === 'SEPIA' ? '#EADFC8' : colors.surface };
  const readingText = { color: themeMode === 'DARK' ? colors.surface : colors.text };
  const openReaderPanel = (openPanel: () => void) => {
    setReaderMenuVisible(false);
    setTimeout(openPanel, 180);
  };
  const backToReaderMenu = (closePanel: () => void) => {
    closePanel();
    setTimeout(() => setReaderMenuVisible(true), 180);
  };

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {/* TOP HEADER BAR */}
      <View style={[styles.topBar, readingSurface, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        <View style={styles.headerMain}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={readingText.color} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={[styles.bookTitle, readingText]} numberOfLines={1}>
            {book.title}
          </Text>
          {!compact && <Text style={[styles.bookAuthor, readingText]} numberOfLines={1}>
            {book.author}
          </Text>}
        </View>

        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Đi đến trang, hiện tại trang ${currentPage} trên ${totalPages}`}
          style={styles.pageBadge}
          onPress={() => { setPageInput(String(currentPage)); setPageInputError(''); setPagePickerVisible(true); }}>
          <Text style={styles.pageBadgeText}>{currentPage}/{totalPages}</Text>
        </TouchableOpacity>
        </View>
        {drawingMode && <View style={styles.drawingOptions}>
          <View style={styles.drawingControlRow}>
            {['#EF4444', '#F59E0B', '#10B981', '#2563EB', '#111827'].map(color =>
              <TouchableOpacity key={color} accessibilityRole="button" accessibilityLabel={`Chọn màu ${color}`}
                onPress={() => onDrawingColorChange(color)} style={[styles.colorSwatch, { backgroundColor: color }, drawingColor === color && styles.colorSwatchActive]} />)}
          </View>
          <View style={styles.drawingControlRow}>
            {[0.003, 0.006, 0.01].map(widthValue => <TouchableOpacity key={widthValue} accessibilityRole="button"
              accessibilityLabel={`Chọn độ dày ${widthValue}`} onPress={() => onDrawingWidthChange(widthValue)}
              style={[styles.widthOption, drawingWidth === widthValue && styles.widthOptionActive]}>
              <View style={{ width: 22, height: Math.max(2, widthValue * 700), borderRadius: 5, backgroundColor: drawingColor }} />
            </TouchableOpacity>)}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quản lý chú thích và nét vẽ"
              onPress={() => setNavigationMode('annotations')} style={styles.drawingActionButton}>
              <Ionicons name="layers-outline" size={17} color={colors.primary} /><Text style={styles.drawingActionText}>Quản lý</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Xóa nét vẽ gần nhất trên trang"
              disabled={!latestCurrentPageDrawing} onPress={() => latestCurrentPageDrawing && onDeleteAnnotation(latestCurrentPageDrawing)}
              style={[styles.drawingActionButton, styles.undoButton, !latestCurrentPageDrawing && styles.deleteDrawingButtonDisabled]}>
              <Ionicons name="arrow-undo-outline" size={17} color={latestCurrentPageDrawing ? '#DC2626' : '#94A3B8'} />
              <Text style={[styles.drawingActionText, styles.undoText, !latestCurrentPageDrawing && styles.disabledActionText]}>Hoàn tác</Text>
            </TouchableOpacity>
          </View>
        </View>}
      </View>

      {/* BOTTOM NAVIGATION & PROGRESS BAR */}
      <View style={[styles.bottomBar, readingSurface, { paddingBottom: Math.max(insets.bottom + 10, 16) }]}>
        <View style={styles.scrubberRow}>
          <TouchableOpacity
            style={styles.bottomNavAction}
            onPress={onPrevPage}
            disabled={currentPage <= 1 || drawingMode}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={21}
              color={currentPage <= 1 || drawingMode ? '#94A3B8' : colors.primary}
            />
            <Text style={[styles.bottomNavLabel, (currentPage <= 1 || drawingMode) && styles.bottomNavLabelDisabled]}>Trước</Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" accessibilityLabel={drawingMode ? 'Hoàn tất vẽ' : 'Mở công cụ đọc'}
            style={[styles.bottomNavAction, drawingMode && styles.bottomNavActionActive]}
            onPress={() => drawingMode ? onToggleDrawing() : setReaderMenuVisible(true)}>
            <Ionicons name={drawingMode ? 'checkmark' : 'ellipsis-horizontal-circle-outline'} size={21}
              color={drawingMode ? colors.surface : colors.primary} />
            <Text style={[styles.bottomNavLabel, drawingMode && styles.bottomNavLabelActive]}>{drawingMode ? 'Xong' : 'Công cụ'}</Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Chuyển đến trang"
            style={styles.progressContainer}
            onPress={() => { setPageInput(String(currentPage)); setPageInputError(''); setPagePickerVisible(true); }}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
            </View>
            <Text style={[styles.percentageText, readingText]}>
              {pageLabel} · {percentage}% hoàn thành
            </Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mở tùy chọn đọc"
            style={styles.bottomNavAction} onPress={onOpenSettings}>
            <Ionicons name="settings-outline" size={21} color={colors.primary} />
            <Text style={styles.bottomNavLabel}>Cài đặt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavAction}
            onPress={onNextPage}
            disabled={currentPage >= totalPages || drawingMode}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-forward"
              size={21}
              color={currentPage >= totalPages || drawingMode ? '#94A3B8' : colors.primary}
            />
            <Text style={[styles.bottomNavLabel, (currentPage >= totalPages || drawingMode) && styles.bottomNavLabelDisabled]}>Sau</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TABLE OF CONTENTS MODAL */}
      <Modal visible={readerMenuVisible} transparent animationType="slide" onRequestClose={() => setReaderMenuVisible(false)}>
        <View style={styles.menuBackdrop}>
          <TouchableOpacity style={styles.menuDismissArea} activeOpacity={1} onPress={() => setReaderMenuVisible(false)} />
          <SafeAreaView style={styles.readerMenuSheet} edges={['bottom']}>
            <View style={styles.readerMenuHeader}>
              <View style={styles.readerMenuHeading}>
                <Text style={styles.readerMenuTitle}>Công cụ đọc</Text>
                <Text style={styles.readerMenuBookTitle}>{book.title}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng" style={styles.modalCloseButton} onPress={() => setReaderMenuVisible(false)}>
                <Ionicons name="close" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.readerMenuGrid} showsVerticalScrollIndicator={false}>
              <Text style={styles.readerMenuSection}>ĐIỀU HƯỚNG</Text>
              <TouchableOpacity style={styles.readerMenuItem} onPress={() => openReaderPanel(() => setShowToc(true))}>
                <View style={styles.readerMenuIcon}><Ionicons name="list-outline" size={22} color={colors.primary} /></View>
                <View style={styles.readerMenuCopy}><Text style={styles.readerMenuItemTitle}>Mục lục</Text><Text style={styles.readerMenuItemHint}>Xem các chương của sách</Text></View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.readerMenuItem} onPress={() => openReaderPanel(() => setNavigationMode('thumbnails'))}>
                <View style={styles.readerMenuIcon}><Ionicons name="grid-outline" size={21} color={colors.primary} /></View>
                <View style={styles.readerMenuCopy}><Text style={styles.readerMenuItemTitle}>Trang</Text><Text style={styles.readerMenuItemHint}>Duyệt ảnh thu nhỏ và chuyển trang</Text></View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
              <Text style={styles.readerMenuSection}>CÁ NHÂN</Text>
              <TouchableOpacity disabled={bookmarkSaving} style={styles.readerMenuItem} onPress={onToggleBookmark}>
                <View style={styles.readerMenuIcon}>{bookmarkSaving ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name={currentPageBookmarked ? 'bookmark' : 'bookmark-outline'} size={21} color={currentPageBookmarked ? '#F59E0B' : colors.primary} />}</View>
                <View style={styles.readerMenuCopy}><Text style={styles.readerMenuItemTitle}>{currentPageBookmarked ? 'Bỏ đánh dấu trang' : 'Đánh dấu trang'}</Text><Text style={styles.readerMenuItemHint}>Trang {currentPage}</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.readerMenuItem} onPress={() => openReaderPanel(() => setNavigationMode('bookmarks'))}>
                <View style={styles.readerMenuIcon}><Ionicons name="bookmarks-outline" size={21} color={colors.primary} /></View>
                <View style={styles.readerMenuCopy}><Text style={styles.readerMenuItemTitle}>Trang đã đánh dấu</Text><Text style={styles.readerMenuItemHint}>{bookmarks.length} trang đã lưu</Text></View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.readerMenuItem} onPress={() => openReaderPanel(() => setNavigationMode('annotations'))}>
                <View style={styles.readerMenuIcon}><Ionicons name="layers-outline" size={21} color={colors.primary} /></View>
                <View style={styles.readerMenuCopy}><Text style={styles.readerMenuItemTitle}>Chú thích</Text><Text style={styles.readerMenuItemHint}>Xem và quản lý ghi chú, nét vẽ</Text></View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
              <Text style={styles.readerMenuSection}>SÁNG TẠO</Text>
              <TouchableOpacity style={styles.readerMenuItem} onPress={() => { setReaderMenuVisible(false); onToggleDrawing(); }}>
                <View style={styles.readerMenuIcon}><Ionicons name="pencil-outline" size={21} color={colors.primary} /></View>
                <View style={styles.readerMenuCopy}><Text style={styles.readerMenuItemTitle}>Vẽ trên trang</Text><Text style={styles.readerMenuItemHint}>Chọn màu, độ dày và bắt đầu vẽ</Text></View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={showToc}
        transparent={true}
        animationType="slide"
        onRequestClose={() => backToReaderMenu(() => setShowToc(false))}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowToc(false)}
          />
          <SafeAreaView style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại Công cụ đọc"
                style={styles.modalBackButton} onPress={() => backToReaderMenu(() => setShowToc(false))}>
                <Ionicons name="arrow-back" size={21} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconBadge}>
                  <Ionicons name="book" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Mục lục</Text>
                  <Text style={styles.modalSubtitle}>
                    {book.title}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowToc(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            {loadingToc ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Đang tải mục lục Liferay Objects...</Text>
              </View>
            ) : (
              <FlatList
                data={tocList}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.tocListContent}
                renderItem={({ item, index }) => {
                  const isLevel1 = item.level === 1;
                  // Determine if currently reading this chapter
                  const nextItem = tocList[index + 1];
                  const isCurrentChapter =
                    currentPage >= item.startPage &&
                    (!nextItem || currentPage < nextItem.startPage);

                  return (
                    <TouchableOpacity
                      style={[
                        styles.tocItem,
                        isLevel1 ? styles.tocItemLevel1 : styles.tocItemLevel2,
                        isCurrentChapter && styles.tocItemActive,
                      ]}
                      onPress={() => {
                        setShowToc(false);
                        onJumpToPage(item.startPage);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.tocTitleWrapper}>
                        {isLevel1 && <View style={styles.level1Bar} />}
                        {!isLevel1 && <View style={styles.level2Dot} />}
                        <Text
                          style={[
                            styles.tocText,
                            isLevel1 ? styles.tocTextLevel1 : styles.tocTextLevel2,
                            isCurrentChapter && styles.tocTextActive,
                          ]}
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.tocPageBadge,
                          isCurrentChapter && styles.tocPageBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tocPageText,
                            isCurrentChapter && styles.tocPageTextActive,
                          ]}
                        >
                          {isCurrentChapter ? 'Đang đọc' : `Tr. ${item.startPage}`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>{tocError || 'Chưa có mục lục cho tài liệu này'}</Text>
                  </View>
                }
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={pagePickerVisible} transparent animationType="fade"
        onRequestClose={() => setPagePickerVisible(false)}>
        <View style={styles.pagePickerBackdrop}>
          <View style={styles.pagePickerCard}>
            <Text style={styles.pagePickerTitle}>Đi đến trang</Text>
            <Text style={styles.pagePickerHint}>{`Nhập số trang từ 1 đến ${totalPages}`}</Text>
            <TextInput autoFocus accessibilityLabel="Số trang cần mở" keyboardType="number-pad" selectTextOnFocus
              value={pageInput} onChangeText={value => { setPageInput(value.replace(/\D/g, '')); setPageInputError(''); }}
              onSubmitEditing={() => {
                const target = Number(pageInput);
                if (!Number.isInteger(target) || target < 1 || target > totalPages) { setPageInputError(`Nhập số từ 1 đến ${totalPages}.`); return; }
                setPagePickerVisible(false); onJumpToPage(target);
              }}
              style={styles.pageInput} />
            {!!pageInputError && <Text style={styles.pagePickerError}>{pageInputError}</Text>}
            <View style={styles.pagePickerActions}>
              <TouchableOpacity style={styles.pagePickerCancel} onPress={() => setPagePickerVisible(false)}>
                <Text style={styles.pagePickerCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pagePickerGo} onPress={() => {
                const target = Number(pageInput);
                if (!Number.isInteger(target) || target < 1 || target > totalPages) { setPageInputError(`Nhập số từ 1 đến ${totalPages}.`); return; }
                setPagePickerVisible(false); onJumpToPage(target);
              }}>
                <Text style={styles.pagePickerGoText}>Mở trang</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ReaderNavigationSheet visible={navigationMode !== null} mode={navigationMode} book={book}
        currentPage={currentPage} bookmarks={bookmarks} annotations={annotations}
        bookmarksLoading={bookmarksLoading} annotationsLoading={annotationsLoading}
        bookmarksError={bookmarksError} annotationsError={annotationsError}
        onRetryBookmarks={onRetryBookmarks} onRetryAnnotations={onRetryAnnotations}
        onDeleteBookmark={onDeleteBookmark} onDeleteAnnotation={onDeleteAnnotation}
        onBack={() => backToReaderMenu(() => setNavigationMode(null))}
        onClose={() => setNavigationMode(null)} onJumpToPage={onJumpToPage} />
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    zIndex: 100,
  },
  topBar: {
    flexDirection: 'column',
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  headerMain: { minHeight: 44, width: '100%', flexDirection: 'row', alignItems: 'center' },
  toolsRow: { minHeight: 54, flexDirection: 'row', alignItems: 'stretch', marginTop: 7, padding: 3,
    borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border },
  toolButton: { flex: 1, minWidth: 0, borderRadius: 10, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 },
  toolDivider: { width: 1, marginVertical: 8, backgroundColor: '#CBD5E1' },
  toolLabel: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  toolButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toolLabelActive: { color: colors.surface },
  drawingOptions: { gap: 8, paddingTop: 10 },
  drawingControlRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  colorSwatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchActive: { borderColor: '#334155', transform: [{ scale: 1.15 }] },
  widthOption: { width: 34, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  widthOptionActive: { borderWidth: 2, borderColor: colors.primary },
  drawingActionButton: { minWidth: 80, height: 30, paddingHorizontal: 8, borderRadius: 8, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  drawingActionText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  undoButton: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }, undoText: { color: '#DC2626' }, disabledActionText: { color: '#94A3B8' },
  deleteDrawingButtonDisabled: { backgroundColor: '#F1F5F9', borderColor: colors.border },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  bookTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  bookAuthor: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  tocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginRight: 8,
  },
  tocButtonText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerToolButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginLeft: 6,
  },
  headerActionDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  pageBadge: {
    backgroundColor: '#F1F5F9',
    minWidth: 52,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 6,
  },
  pageBadgeText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
  },
  menuBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.55)' },
  menuDismissArea: { flex: 1 },
  readerMenuSheet: { maxHeight: '88%', backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  readerMenuHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  readerMenuHeading: { flex: 1, marginRight: 12 }, readerMenuTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  readerMenuBookTitle: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 3 },
  readerMenuGrid: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 18 },
  readerMenuSection: { color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginTop: 10, marginBottom: 2, paddingHorizontal: 10 },
  readerMenuItem: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderRadius: 12 },
  readerMenuIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', marginRight: 11 },
  readerMenuCopy: { flex: 1, marginRight: 8 }, readerMenuItemTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  readerMenuItemHint: { color: colors.muted, fontSize: 11, marginTop: 3 },
  pagePickerBackdrop: { flex: 1, padding: 24, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center' },
  pagePickerCard: { width: '100%', maxWidth: 360, padding: 20, borderRadius: 18, backgroundColor: colors.surface },
  pagePickerTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  pagePickerHint: { color: colors.muted, fontSize: 13, marginTop: 5 },
  pageInput: { height: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 16 },
  pagePickerError: { color: '#B91C1C', fontSize: 12, marginTop: 6 },
  pagePickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  pagePickerCancel: { minHeight: 42, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  pagePickerCancelText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  pagePickerGo: { minHeight: 42, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  pagePickerGoText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
  bottomBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingTop: 9,
    paddingBottom: 16,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomNavAction: { width: 48, minHeight: 46, borderRadius: 11, alignItems: 'center', justifyContent: 'center', gap: 2 },
  bottomNavActionActive: { backgroundColor: colors.primary },
  bottomNavLabel: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  bottomNavLabelActive: { color: colors.surface }, bottomNavLabelDisabled: { color: '#94A3B8' },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  progressBarBackground: {
    width: '100%',
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  percentageText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalBackButton: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  modalHeaderIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    maxWidth: 250,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tocListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  tocItemLevel1: {
    backgroundColor: colors.background,
    marginTop: 6,
  },
  tocItemLevel2: {
    paddingLeft: 28,
  },
  tocItemActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  tocTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  level1Bar: {
    width: 3,
    height: 16,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginRight: 8,
  },
  level2Dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
    marginRight: 8,
  },
  tocText: {
    flex: 1,
  },
  tocTextLevel1: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  tocTextLevel2: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
  },
  tocTextActive: {
    color: '#065F46',
    fontWeight: '800',
  },
  tocPageBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tocPageBadgeActive: {
    backgroundColor: colors.primary,
  },
  tocPageText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  tocPageTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 10,
  },
});

/**
 * Mekobook Mobile - FlipbookControls Component
 * Minimalist navigation with Emerald Green theme (#059669) & Table of Contents (TOC) Modal
 * ZERO EMOJIS - USES PURE VECTOR ICONS (Ionicons)
 */

import { colors, darkColors, lightColors, radius, spacing, typography } from '../../theme';
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
  GestureResponderEvent,
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
  onTopBarHeightChange?: (height: number) => void;
  onFooterHeightChange?: (height: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
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
  drawingLocked: boolean;
  drawingStrokeCount: number;
  onToggleDrawing: () => void;
  onCancelDrawing: () => void;
  onDrawingColorChange: (color: string) => void;
  onDrawingWidthChange: (width: number) => void;
  onDeleteBookmark: (bookmark: Bookmark) => void;
  onDeleteAnnotation: (annotation: Annotation) => void;
  onEditAnnotation: (annotation: Annotation) => void;
  onSelectAnnotation: (annotation: Annotation) => void;
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
  onTopBarHeightChange,
  onFooterHeightChange,
  zoom,
  onZoomChange,
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
  drawingLocked,
  drawingStrokeCount,
  onToggleDrawing,
  onCancelDrawing,
  onDrawingColorChange,
  onDrawingWidthChange,
  onDeleteBookmark,
  onDeleteAnnotation,
  onEditAnnotation,
  onSelectAnnotation,
}) => {
  const insets = useSafeAreaInsets();
  const [showToc, setShowToc] = useState<boolean>(false);
  const [tocPanelTab, setTocPanelTab] = useState<'toc' | 'bookmarks'>('toc');
  const [readerMenuVisible, setReaderMenuVisible] = useState(false);
  const [tocList, setTocList] = useState<ChapterTOC[]>([]);
  const [loadingToc, setLoadingToc] = useState<boolean>(false);
  const [tocError, setTocError] = useState('');
  const [tocReload, setTocReload] = useState(0);
  const [navigationMode, setNavigationMode] = useState<ReaderNavigationMode | null>(null);
  const [pagePickerVisible, setPagePickerVisible] = useState(false);
  const [pageInput, setPageInput] = useState(String(currentPage));
  const [pageInputError, setPageInputError] = useState('');
  const [progressWidth, setProgressWidth] = useState(0);
  const [previewPage, setPreviewPage] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    if (showToc && tocPanelTab === 'toc' && book.id) {
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
  }, [showToc, tocPanelTab, book.id, tocReload]);

  if (!visible) return null;

  const percentage = Math.round(readingPercentage(currentPage, totalPages));
  const displayedPage = previewPage ?? currentPage;
  const displayedPercentage = Math.round(readingPercentage(displayedPage, totalPages));
  const latestCurrentPageDrawing = [...annotations].reverse().find(item =>
    item.pageNumber === currentPage && item.type === 'DRAWING_PEN');
  const pageLabel = currentPage === 1 && book.coverUrl ? 'Bìa sách' : `Trang ${currentPage}`;
  const darkMode = themeMode === 'DARK';
  const sepiaMode = themeMode === 'SEPIA';
  const chrome = darkMode ? darkColors : lightColors;
  const chromeSurface = sepiaMode ? '#F3E8D1' : chrome.surfaceRaised;
  const chromeMuted = sepiaMode ? '#E7D7B8' : chrome.surfaceMuted;
  const chromeText = sepiaMode ? '#422F20' : chrome.text;
  const chromeSecondaryText = sepiaMode ? '#725A43' : chrome.textSecondary;
  const chromeBorder = sepiaMode ? '#CDBB9A' : chrome.border;
  const chromeBorderStrong = sepiaMode ? '#B9A580' : chrome.borderStrong;
  const readingSurface = { backgroundColor: chromeSurface, borderColor: chromeBorder };
  const readingText = { color: chromeText };
  const controlSurface = { backgroundColor: chromeMuted, borderColor: chromeBorderStrong };
  const actionColor = chrome.primary;
  const disabledColor = chrome.disabled;
  const darkButton = controlSurface;
  const pageFromProgressEvent = (event: GestureResponderEvent) => {
    if (!progressWidth || totalPages <= 1) return currentPage;
    const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / progressWidth));
    return Math.max(1, Math.min(totalPages, Math.round(ratio * (totalPages - 1)) + 1));
  };
  const previewProgress = (event: GestureResponderEvent) => {
    if (!drawingMode) setPreviewPage(pageFromProgressEvent(event));
  };
  const commitProgress = (event: GestureResponderEvent) => {
    if (drawingMode) return;
    const target = pageFromProgressEvent(event);
    setPreviewPage(null);
    if (target !== currentPage) onJumpToPage(target);
  };
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
      <View
        onLayout={event => onTopBarHeightChange?.(Math.ceil(event.nativeEvent.layout.height))}
        style={[styles.topBar, readingSurface, { paddingTop: Math.max(insets.top + 6, 12) }]}
      >
        {!drawingMode ? <View style={styles.headerMain}>
        <TouchableOpacity style={[styles.backButton, darkButton]} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={21} color={chromeText} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={[styles.hudBookTitle, { color: chromeText }]} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={[styles.hudBookAuthor, { color: chromeSecondaryText }]} numberOfLines={1}>
            {book.author}
          </Text>
        </View>

        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Bắt đầu vẽ trên trang" style={styles.hudIconButton}
          onPress={onToggleDrawing}>
          <Ionicons name="pencil" size={18} color={chromeSecondaryText} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mở mục lục và bookmark" style={styles.hudIconButton}
          onPress={() => { setTocPanelTab('toc'); setShowToc(true); }}>
          <Ionicons name="list" size={19} color={chromeSecondaryText} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mở tùy chọn đọc" style={styles.hudIconButton} onPress={onOpenSettings}>
          <Ionicons name="text" size={19} color={chromeSecondaryText} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={currentPageBookmarked ? 'Bỏ đánh dấu trang' : 'Đánh dấu trang'}
          disabled={bookmarkSaving} style={[styles.hudIconButton, currentPageBookmarked && styles.hudBookmarkActive]} onPress={onToggleBookmark}>
          {bookmarkSaving ? <ActivityIndicator size="small" color={chrome.warning} />
            : <Ionicons name={currentPageBookmarked ? 'bookmark' : 'bookmark-outline'} size={19}
              color={currentPageBookmarked ? chrome.warning : chromeSecondaryText} />}
        </TouchableOpacity>
        </View> : <View style={styles.drawingHeader}>
          <View style={styles.drawingStatusBadge}>
            <Ionicons name="lock-closed" size={12} color="#FBBF24" />
            <View><Text style={styles.drawingStatusText}>Đang khóa lật trang</Text>
              <Text style={styles.drawingStrokeCount}>{drawingStrokeCount} nét chưa lưu</Text></View>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Xóa nét vẽ gần nhất trên trang"
            disabled={!latestCurrentPageDrawing} onPress={() => latestCurrentPageDrawing && onDeleteAnnotation(latestCurrentPageDrawing)}
            style={[styles.hudDrawingButton, !latestCurrentPageDrawing && styles.hudDrawingDisabled]}>
            <Ionicons name="arrow-undo-outline" size={16} color={latestCurrentPageDrawing ? '#FCA5A5' : '#64748B'} />
            <Text style={[styles.hudDrawingText, { color: latestCurrentPageDrawing ? '#F8FAFC' : '#64748B' }]}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Hủy các nét chưa lưu"
            onPress={onCancelDrawing} style={[styles.hudDrawingButton, styles.hudCancelButton]}>
            <Ionicons name="close" size={16} color="#FCA5A5" /><Text style={[styles.hudDrawingText, { color: '#FCA5A5' }]}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Lưu nét vẽ" style={styles.hudDoneButton} onPress={onToggleDrawing}>
            <Ionicons name="save-outline" size={16} color="#FFFFFF" /><Text style={styles.hudDoneText}>Lưu</Text>
          </TouchableOpacity>
        </View>}
        {drawingMode && <View style={styles.drawingOptions}>
          <View style={styles.drawingControlRow}>
            {['#EF4444', '#F59E0B', '#10B981', '#2563EB', '#111827'].map(color =>
              <TouchableOpacity key={color} accessibilityRole="button" accessibilityLabel={`Chọn màu ${color}`}
                disabled={drawingLocked} onPress={() => onDrawingColorChange(color)}
                style={[styles.colorSwatch, { backgroundColor: color }, drawingColor === color && styles.colorSwatchActive, drawingLocked && styles.drawingOptionLocked]} />)}
          </View>
          <View style={styles.drawingControlRow}>
            {[0.003, 0.006, 0.01].map(widthValue => <TouchableOpacity key={widthValue} accessibilityRole="button"
              accessibilityLabel={`Chọn độ dày ${widthValue}`} disabled={drawingLocked} onPress={() => onDrawingWidthChange(widthValue)}
              style={[styles.widthOption, darkButton, drawingWidth === widthValue && styles.widthOptionActive, drawingLocked && styles.drawingOptionLocked]}>
              <View style={{ width: 22, height: Math.max(2, widthValue * 700), borderRadius: 5, backgroundColor: drawingColor }} />
            </TouchableOpacity>)}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quản lý chú thích và nét vẽ"
              onPress={() => setNavigationMode('annotations')} style={styles.manageAnnotationsLink}>
              <Text style={styles.manageAnnotationsText}>Quản lý chú thích</Text>
            </TouchableOpacity>
          </View>
          {drawingLocked ? <Text style={[styles.drawingLockedHint, darkMode && styles.darkActionText]}>Lưu hoặc bỏ các nét hiện tại để đổi màu và độ dày</Text> : null}
        </View>}
      </View>

      {/* BOTTOM NAVIGATION & PROGRESS BAR */}
      {!drawingMode && <View
        onLayout={event => onFooterHeightChange?.(Math.ceil(event.nativeEvent.layout.height))}
        style={[styles.bottomBar, readingSurface, { paddingBottom: Math.max(insets.bottom + 8, 12) }]}
      >
        <View style={styles.progressRow}>
          <TouchableOpacity
            style={[styles.hudNavButton, controlSurface]}
            onPress={onPrevPage}
            disabled={currentPage <= 1}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Trang trước"
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={currentPage <= 1 ? disabledColor : actionColor}
            />
          </TouchableOpacity>

          <View accessible accessibilityRole="adjustable" accessibilityLabel="Tiến trình đọc"
            accessibilityValue={{ min: 1, max: totalPages, now: displayedPage, text: `Trang ${displayedPage} trên ${totalPages}` }}
            accessibilityActions={[{ name: 'increment', label: 'Trang sau' }, { name: 'decrement', label: 'Trang trước' }, { name: 'activate', label: 'Đi đến trang' }]}
            onAccessibilityAction={event => {
              if (event.nativeEvent.actionName === 'increment' && currentPage < totalPages) onJumpToPage(currentPage + 1);
              else if (event.nativeEvent.actionName === 'decrement' && currentPage > 1) onJumpToPage(currentPage - 1);
              else if (event.nativeEvent.actionName === 'activate') { setPageInput(String(currentPage)); setPageInputError(''); setPagePickerVisible(true); }
            }}
            style={styles.progressContainer} onLayout={event => setProgressWidth(event.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => !drawingMode} onMoveShouldSetResponder={() => !drawingMode}
            onResponderGrant={previewProgress} onResponderMove={previewProgress}
            onResponderRelease={commitProgress} onResponderTerminate={() => setPreviewPage(null)}>
            <View style={[styles.progressBarBackground, darkMode && styles.darkProgressTrack]}>
              <View style={[styles.progressBarFill, { width: `${displayedPercentage}%`, backgroundColor: chrome.primary }]} />
              <View style={[styles.progressThumb, { left: `${displayedPercentage}%`, backgroundColor: chrome.primary, borderColor: chromeSurface }]} />
            </View>
            <Text style={[styles.progressPreviewText, { color: chromeSecondaryText }]}>{displayedPercentage}%</Text>
          </View>

          <TouchableOpacity
            style={[styles.hudNavButton, controlSurface]}
            onPress={onNextPage}
            disabled={currentPage >= totalPages}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Trang sau"
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={currentPage >= totalPages ? disabledColor : actionColor}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đi đến trang"
            style={[styles.quickPageButton, controlSurface]}
            onPress={() => { setPageInput(String(currentPage)); setPageInputError(''); setPagePickerVisible(true); }}>
            <Ionicons name="navigate-outline" size={16} color={actionColor} />
            <Text style={[styles.quickPageText, { color: chromeText }]}>{previewPage ? `T.${previewPage}/${totalPages}` : `${pageLabel} / ${totalPages}`}</Text>
          </TouchableOpacity>
          <View style={[styles.zoomPresetGroup, { backgroundColor: chrome.background, borderColor: chromeBorder }]} accessibilityRole="radiogroup">
            {[1, 1.5, 2, 3].map(scale => {
              const selected = Math.abs(zoom - scale) < 0.01;
              return <TouchableOpacity key={scale} accessibilityRole="radio" accessibilityState={{ selected }}
                accessibilityLabel={`Phóng trang ${scale * 100}%`} style={[styles.zoomPreset, selected && { backgroundColor: chrome.primary }]}
                onPress={() => onZoomChange(scale)}>
                <Text style={[styles.zoomPresetText, { color: chromeSecondaryText }, selected && styles.zoomPresetTextActive]}>{scale * 100}%</Text>
              </TouchableOpacity>;
            })}
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mở danh sách trang thu nhỏ"
            style={[styles.quickToolButton, controlSurface]} onPress={() => setNavigationMode('thumbnails')}>
            <Ionicons name="grid-outline" size={18} color={actionColor} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quản lý chú thích và nét vẽ"
            style={[styles.quickToolButton, controlSurface, styles.quickAnnotationsButton]} onPress={() => setNavigationMode('annotations')}>
            <Ionicons name="create-outline" size={19} color={actionColor} />
          </TouchableOpacity>
        </View>
      </View>}

      {/* TABLE OF CONTENTS MODAL */}
      <Modal visible={readerMenuVisible} transparent animationType="slide" onRequestClose={() => setReaderMenuVisible(false)}>
        <View style={styles.menuBackdrop}>
          <TouchableOpacity style={styles.menuDismissArea} activeOpacity={1} onPress={() => setReaderMenuVisible(false)} />
          <SafeAreaView style={[styles.readerMenuSheet, readingSurface]} edges={['bottom']}>
            <View style={[styles.readerMenuHeader, { borderBottomColor: chromeBorder }]}>
              <View style={styles.readerMenuHeading}>
                <Text style={[styles.readerMenuTitle, { color: chromeText }]}>Công cụ đọc</Text>
                <Text style={[styles.readerMenuBookTitle, { color: chromeSecondaryText }]}>{book.title}</Text>
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
                <Ionicons name="chevron-forward" size={18} color={chrome.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.readerMenuItem} onPress={() => openReaderPanel(() => setNavigationMode('thumbnails'))}>
                <View style={styles.readerMenuIcon}><Ionicons name="grid-outline" size={21} color={colors.primary} /></View>
                <View style={styles.readerMenuCopy}><Text style={styles.readerMenuItemTitle}>Trang</Text><Text style={styles.readerMenuItemHint}>Duyệt ảnh thu nhỏ và chuyển trang</Text></View>
                <Ionicons name="chevron-forward" size={18} color={chrome.textMuted} />
              </TouchableOpacity>
              <Text style={styles.readerMenuSection}>CÁ NHÂN</Text>
              <TouchableOpacity disabled={bookmarkSaving} style={styles.readerMenuItem} onPress={onToggleBookmark}>
                <View style={styles.readerMenuIcon}>{bookmarkSaving ? <ActivityIndicator size="small" color={chrome.primary} /> : <Ionicons name={currentPageBookmarked ? 'bookmark' : 'bookmark-outline'} size={21} color={currentPageBookmarked ? chrome.warning : chrome.primary} />}</View>
                <View style={styles.readerMenuCopy}><Text style={styles.readerMenuItemTitle}>{currentPageBookmarked ? 'Bỏ đánh dấu trang' : 'Đánh dấu trang'}</Text><Text style={styles.readerMenuItemHint}>Trang {currentPage}</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.readerMenuItem} onPress={() => openReaderPanel(() => setNavigationMode('bookmarks'))}>
                <View style={styles.readerMenuIcon}><Ionicons name="bookmarks-outline" size={21} color={colors.primary} /></View>
                <View style={styles.readerMenuCopy}><Text style={styles.readerMenuItemTitle}>Trang đã đánh dấu</Text><Text style={styles.readerMenuItemHint}>{bookmarks.length} trang đã lưu</Text></View>
                <Ionicons name="chevron-forward" size={18} color={chrome.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.readerMenuItem} onPress={() => openReaderPanel(() => setNavigationMode('annotations'))}>
                <View style={styles.readerMenuIcon}><Ionicons name="layers-outline" size={21} color={colors.primary} /></View>
                <View style={styles.readerMenuCopy}><Text style={styles.readerMenuItemTitle}>Chú thích</Text><Text style={styles.readerMenuItemHint}>Xem và quản lý ghi chú, nét vẽ</Text></View>
                <Ionicons name="chevron-forward" size={18} color={chrome.textMuted} />
              </TouchableOpacity>
              <Text style={styles.readerMenuSection}>SÁNG TẠO</Text>
              <TouchableOpacity style={styles.readerMenuItem} onPress={() => { setReaderMenuVisible(false); onToggleDrawing(); }}>
                <View style={styles.readerMenuIcon}><Ionicons name="pencil-outline" size={21} color={colors.primary} /></View>
                <View style={styles.readerMenuCopy}><Text style={styles.readerMenuItemTitle}>Vẽ trên trang</Text><Text style={styles.readerMenuItemHint}>Chọn màu, độ dày và bắt đầu vẽ</Text></View>
                <Ionicons name="chevron-forward" size={18} color={chrome.textMuted} />
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={showToc}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowToc(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowToc(false)}
          />
          <SafeAreaView style={[styles.modalSheet, readingSurface]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: chromeBorder }]}>
              <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: tocPanelTab === 'toc' }}
                style={[styles.libraryTab, tocPanelTab === 'toc' && { borderBottomColor: chrome.primary }]}
                onPress={() => setTocPanelTab('toc')}>
                <Text style={[styles.libraryTabText, { color: tocPanelTab === 'toc' ? chrome.primary : chromeSecondaryText }]}>Mục Lục</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: tocPanelTab === 'bookmarks' }}
                style={[styles.libraryTab, tocPanelTab === 'bookmarks' && { borderBottomColor: chrome.primary }]}
                onPress={() => setTocPanelTab('bookmarks')}>
                <Text style={[styles.libraryTabText, { color: tocPanelTab === 'bookmarks' ? chrome.primary : chromeSecondaryText }]}>{`Bookmarks (${bookmarks.length})`}</Text>
              </TouchableOpacity>
              <View style={styles.libraryTabSpacer} />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowToc(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={chrome.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            {tocPanelTab === 'bookmarks' ? (bookmarksLoading ? <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Đang tải bookmark...</Text>
            </View> : bookmarksError ? <View style={styles.loadingContainer}>
              <Ionicons name="cloud-offline-outline" size={30} color={chrome.textMuted} />
              <Text style={styles.loadingText}>{bookmarksError}</Text>
              <TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={onRetryBookmarks}>
                <Ionicons name="refresh-outline" size={16} color={colors.surface} />
                <Text style={styles.retryButtonText}>Thử tải lại</Text>
              </TouchableOpacity>
            </View> : <FlatList data={bookmarks} keyExtractor={(item, index) => String(item.id || `${item.pageNumber}-${index}`)}
              contentContainerStyle={styles.tocListContent}
              renderItem={({ item }) => <View style={[styles.bookmarkPanelRow, { backgroundColor: chromeMuted }]}>
                <TouchableOpacity style={styles.bookmarkPanelMain} onPress={() => { setShowToc(false); onJumpToPage(item.pageNumber); }}>
                  <Text style={[styles.bookmarkPanelTitle, { color: chrome.warning }]}><Ionicons name="bookmark" size={14} color={chrome.warning} /> {`Trang ${item.pageNumber}${item.pageNumber === currentPage ? ' (Hiện tại)' : ''}`}</Text>
                  <Text style={[styles.bookmarkPanelDetail, { color: chromeSecondaryText }]} numberOfLines={2}>{item.note || item.chapterTitle || item.bookmarkTitle || `Trang ${item.pageNumber}`}</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Xóa bookmark trang ${item.pageNumber}`}
                  style={styles.bookmarkPanelDelete} onPress={() => onDeleteBookmark(item)}>
                  <Ionicons name="trash-outline" size={18} color={chrome.error} />
                </TouchableOpacity>
              </View>}
              ListEmptyComponent={<View style={styles.loadingContainer}><Ionicons name="bookmark-outline" size={30} color={chrome.textMuted} />
                <Text style={styles.loadingText}>Chưa có trang nào được đánh dấu.</Text></View>} />) : loadingToc ? (
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
                    <Ionicons name={tocError ? 'cloud-offline-outline' : 'list-outline'} size={30} color={colors.muted} />
                    <Text style={styles.loadingText}>{tocError || 'Chưa có mục lục cho tài liệu này'}</Text>
                    {!!tocError && <TouchableOpacity accessibilityRole="button" style={styles.retryButton}
                      onPress={() => setTocReload(value => value + 1)}>
                      <Ionicons name="refresh-outline" size={16} color={colors.surface} />
                      <Text style={styles.retryButtonText}>Thử tải lại</Text>
                    </TouchableOpacity>}
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
          <View style={[styles.pagePickerCard, readingSurface]}>
            <Text style={[styles.pagePickerTitle, { color: chromeText }]}>Đi đến trang</Text>
            <Text style={[styles.pagePickerHint, { color: chromeSecondaryText }]}>{`Nhập số trang từ 1 đến ${totalPages}`}</Text>
            <TextInput autoFocus accessibilityLabel="Số trang cần mở" keyboardType="number-pad" selectTextOnFocus placeholderTextColor={chrome.textMuted}
              value={pageInput} onChangeText={value => { setPageInput(value.replace(/\D/g, '')); setPageInputError(''); }}
              onSubmitEditing={() => {
                const target = Number(pageInput);
                if (!Number.isInteger(target) || target < 1 || target > totalPages) { setPageInputError(`Nhập số từ 1 đến ${totalPages}.`); return; }
                setPagePickerVisible(false); onJumpToPage(target);
              }}
              style={[styles.pageInput, { color: chromeText, backgroundColor: chromeMuted, borderColor: chromeBorder }]} />
            {!!pageInputError && <Text style={styles.pagePickerError}>{pageInputError}</Text>}
            <View style={styles.pagePickerActions}>
              <TouchableOpacity style={[styles.pagePickerCancel, controlSurface]} onPress={() => setPagePickerVisible(false)}>
                <Text style={[styles.pagePickerCancelText, { color: chromeSecondaryText }]}>Hủy</Text>
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
        themeMode={themeMode}
        currentPage={currentPage} bookmarks={bookmarks} annotations={annotations}
        bookmarksLoading={bookmarksLoading} annotationsLoading={annotationsLoading}
        bookmarksError={bookmarksError} annotationsError={annotationsError}
        onRetryBookmarks={onRetryBookmarks} onRetryAnnotations={onRetryAnnotations}
        onDeleteBookmark={onDeleteBookmark} onDeleteAnnotation={onDeleteAnnotation}
        onEditAnnotation={onEditAnnotation} onSelectAnnotation={onSelectAnnotation}
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
    paddingHorizontal: spacing.md,
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
  hudBookTitle: { color: '#F8FAFC', ...typography.label },
  hudBookAuthor: { color: '#94A3B8', ...typography.caption, marginTop: spacing.xxs },
  hudIconButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 3 },
  hudBookmarkActive: { backgroundColor: 'rgba(251,191,36,0.14)' },
  drawingHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7 },
  drawingStatusBadge: { flex: 1, minHeight: 32, borderRadius: 9, paddingHorizontal: 10, flexDirection: 'row',
    alignItems: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.32)' },
  drawingStatusText: { color: '#FDE68A', fontSize: 10, fontWeight: '800' },
  drawingStrokeCount: { color: '#94A3B8', fontSize: 8, fontWeight: '700', marginTop: 1 },
  hudDrawingButton: { height: 34, borderRadius: 9, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5, backgroundColor: '#253244', borderWidth: 1, borderColor: '#475569' },
  hudDrawingText: { color: '#6EE7B7', fontSize: 10, fontWeight: '800' },
  hudDrawingDisabled: { opacity: 0.45 },
  hudCancelButton: { backgroundColor: '#3B2730', borderColor: '#7F1D1D' },
  hudDoneButton: { height: 34, borderRadius: 9, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 4, backgroundColor: colors.primary },
  hudDoneText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  toolsRow: { minHeight: 54, flexDirection: 'row', alignItems: 'stretch', marginTop: 7, padding: 3,
    borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border },
  toolButton: { flex: 1, minWidth: 0, borderRadius: 10, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 },
  toolDivider: { width: 1, marginVertical: 8, backgroundColor: '#CBD5E1' },
  toolLabel: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  toolButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toolLabelActive: { color: colors.surface },
  drawingOptions: { gap: 8, paddingTop: 10 },
  drawingControlRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  strokeWidthHint: { color: '#94A3B8', fontSize: 10, fontWeight: '700', marginLeft: 2 },
  manageAnnotationsLink: { minHeight: 28, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  manageAnnotationsText: { color: '#A7B3FF', fontSize: 9, fontWeight: '800', textDecorationLine: 'underline' },
  colorSwatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchActive: { borderColor: '#334155', transform: [{ scale: 1.15 }] },
  widthOption: { width: 34, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  widthOptionActive: { borderWidth: 2, borderColor: colors.primary },
  drawingActionButton: { minWidth: 80, height: 30, paddingHorizontal: 8, borderRadius: 8, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  drawingActionText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  drawingOptionLocked: { opacity: 0.42 },
  drawingLockedHint: { color: colors.muted, fontSize: 10, lineHeight: 14, textAlign: 'center' },
  undoButton: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }, undoText: { color: '#DC2626' }, disabledActionText: { color: '#94A3B8' },
  deleteDrawingButtonDisabled: { backgroundColor: '#F1F5F9', borderColor: colors.border },
  darkButton: { backgroundColor: '#253244', borderWidth: 1, borderColor: '#475569' },
  darkButtonText: { color: '#F8FAFC' }, darkActionText: { color: '#6EE7B7' },
  darkUndoButton: { backgroundColor: '#3F2830', borderColor: '#7F1D1D' }, darkUndoText: { color: '#FCA5A5' },
  darkDisabledButton: { backgroundColor: '#1E293B', borderColor: '#334155' },
  darkProgressTrack: { backgroundColor: '#475569' },
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
  readerMenuSheet: { maxHeight: '88%', backgroundColor: '#111B2E', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderWidth: 1, borderBottomWidth: 0, borderColor: '#40506A', overflow: 'hidden' },
  readerMenuHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#334155' },
  readerMenuHeading: { flex: 1, marginRight: 12 }, readerMenuTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '800' },
  readerMenuBookTitle: { color: '#94A3B8', fontSize: 12, lineHeight: 16, marginTop: 3 },
  readerMenuGrid: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 18 },
  readerMenuSection: { color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginTop: 10, marginBottom: 2, paddingHorizontal: 10 },
  readerMenuItem: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderRadius: 12, marginBottom: 3, backgroundColor: '#17243A' },
  readerMenuIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#22344E', marginRight: 11 },
  readerMenuCopy: { flex: 1, marginRight: 8 }, readerMenuItemTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '800' },
  readerMenuItemHint: { color: '#A7B3C5', fontSize: 11, marginTop: 3 },
  pagePickerBackdrop: { flex: 1, padding: 24, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center' },
  pagePickerCard: { width: '100%', maxWidth: 360, padding: 20, borderRadius: 22, backgroundColor: '#111B2E', borderWidth: 1, borderColor: '#40506A' },
  pagePickerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
  pagePickerHint: { color: '#A7B3C5', fontSize: 13, marginTop: 5 },
  pageInput: { height: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    color: '#F8FAFC', backgroundColor: '#17243A', fontSize: 17, fontWeight: '700', marginTop: 16 },
  pagePickerError: { color: '#B91C1C', fontSize: 12, marginTop: 6 },
  pagePickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  pagePickerCancel: { minHeight: 42, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#253244' },
  pagePickerCancelText: { color: '#CBD5E1', fontSize: 13, fontWeight: '700' },
  pagePickerGo: { minHeight: 42, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  pagePickerGoText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
  bottomBar: {
    backgroundColor: 'rgba(15,23,42,0.94)',
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  hudNavButton: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#253244', borderWidth: 1, borderColor: '#475569' },
  quickActionsRow: { minHeight: 38, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickPageButton: { minWidth: 98, height: 36, paddingHorizontal: 10, borderRadius: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#253244', borderWidth: 1, borderColor: '#475569' },
  quickPageText: { color: '#F8FAFC', fontSize: 10, fontWeight: '800' },
  zoomPresetGroup: { flex: 1, height: 36, padding: 3, borderRadius: 10, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#334155' },
  zoomPreset: { flex: 1, height: 28, minWidth: 0, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  zoomPresetActive: { backgroundColor: colors.primary },
  zoomPresetText: { color: '#94A3B8', fontSize: 9, fontWeight: '800' },
  zoomPresetTextActive: { color: '#FFFFFF' },
  quickToolButton: { width: 38, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#253244', borderWidth: 1, borderColor: '#475569' },
  quickAnnotationsButton: { borderColor: 'rgba(74,222,179,0.35)' },
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
    marginHorizontal: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  progressBarBackground: {
    width: '100%',
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'visible',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressThumb: { position: 'absolute', top: -5, width: 15, height: 15, marginLeft: -7.5,
    borderRadius: 8, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.surface,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  percentageText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  progressPreviewText: { position: 'absolute', top: 24, color: '#CBD5E1', fontSize: 9, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#111B2E',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#40506A',
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
    borderBottomColor: '#334155',
  },
  libraryTab: { minHeight: 42, paddingHorizontal: 2, marginRight: 20, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  libraryTabActive: { borderBottomColor: colors.primary },
  libraryTabText: { color: '#94A3B8', fontSize: 15, fontWeight: '800' },
  libraryTabTextActive: { color: '#FBBF24' },
  libraryTabSpacer: { flex: 1 },
  modalBackButton: { width: 36, height: 36, borderRadius: 18, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
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
    backgroundColor: '#22344E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    maxWidth: 250,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tocListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bookmarkPanelRow: { minHeight: 74, marginBottom: 10, borderRadius: 12, backgroundColor: '#1C2940', flexDirection: 'row', alignItems: 'center' },
  bookmarkPanelMain: { flex: 1, minHeight: 74, paddingHorizontal: 13, paddingVertical: 11, justifyContent: 'center' },
  bookmarkPanelTitle: { color: '#FBBF24', fontSize: 13, fontWeight: '900' },
  bookmarkPanelDetail: { color: '#CBD5E1', fontSize: 11, lineHeight: 15, marginTop: 4 },
  bookmarkPanelDelete: { width: 48, minHeight: 74, alignItems: 'center', justifyContent: 'center' },
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
    backgroundColor: '#F8FAFC',
    marginTop: 6,
  },
  tocItemLevel2: {
    paddingLeft: 28,
    backgroundColor: '#FFFFFF',
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
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  tocTextLevel2: {
    color: '#475569',
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
    color: '#64748B',
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
  retryButton: { minHeight: 40, marginTop: 14, paddingHorizontal: 16, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary },
  retryButtonText: { color: colors.surface, fontSize: 12, fontWeight: '800' },
});

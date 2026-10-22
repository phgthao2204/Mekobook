import { AppTheme, useTheme, useThemedStyles } from '../../theme';
import React, { useCallback, useMemo, useState, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, FlatList, Image, Platform, RefreshControl,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LibraryBook, ReadingProgress, UserAccount } from '../../types';
import { getBooks, getMediaRequestHeaders, getReadingProgresses } from '../../services/api';
import { errorMessage } from '../../services/http';
import { getLocalReadingProgress } from '../../services/localReadingProgress';
import { mergeReadingProgress, normalizeSearchText, readingPercentage } from '../../utils/reader';
import { AppBottomNavigation } from '../../component/AppBottomNavigation';
import { PersonalShelfModal } from '../../component/PersonalShelfModal';

type ViewMode = 'grid' | 'list';

interface BookCatalogProps {
  user: UserAccount;
  onSelectBook: (book: LibraryBook) => void;
  onOpenAccount: () => void;
}

function latestProgress(items: ReadingProgress[]): Map<number, ReadingProgress> {
  const result = new Map<number, ReadingProgress>();
  items.forEach((item) => {
    const old = result.get(item.bookId);
    if (!old || (item.lastReadTimestamp || 0) > (old.lastReadTimestamp || 0)) {
      result.set(item.bookId, item);
    }
  });
  return result;
}

function readingState(book: LibraryBook, theme: AppTheme) {
  if (book.progressUnavailable) return { label: 'Chưa tải tiến trình', color: theme.colors.textMuted, background: theme.colors.surfaceMuted };
  const progress = book.readingProgress;
  if (!progress || progress.currentPage < 1 || (progress.readStatus === 'NOT_STARTED' && progress.percentage <= 0)) {
    return { label: 'Chưa đọc', color: theme.colors.textMuted, background: theme.colors.surfaceMuted };
  }
  if (progress.readStatus === 'COMPLETED' || progress.currentPage >= book.totalPages) {
    return { label: 'Đã hoàn thành', color: theme.colors.success, background: theme.colors.successSoft };
  }
  return { label: 'Đang đọc', color: theme.colors.info, background: theme.colors.infoSoft };
}

function formatDate(timestamp?: number): string {
  return timestamp ? new Date(timestamp).toLocaleDateString('vi-VN') : '';
}

export const BookCatalog: React.FC<BookCatalogProps> = ({ user, onSelectBook, onOpenAccount }) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [error, setError] = useState('');
  const [progressOnlyError, setProgressOnlyError] = useState(false);
  const [progressRetrying, setProgressRetrying] = useState(false);
  const [shelvesVisible, setShelvesVisible] = useState(false);
  const requestId = useRef(0);

  const loadLibrary = useCallback(async () => {
    const version = ++requestId.current;
    setError(''); setProgressOnlyError(false);
    const remoteProgressRequest = getReadingProgresses(200)
      .then(items => ({ items }))
      .catch(reason => ({ reason }));
    try {
      const loadedBooks = await getBooks(100);
      if (version !== requestId.current) return;
      // Show the catalog as soon as its primary API responds. Progress is secondary
      // and must not keep the entire library behind a long spinner.
      setBooks(loadedBooks);
      setLoading(false);
      setRefreshing(false);

      const [progressResult, localProgressResult] = await Promise.all([
        remoteProgressRequest,
        Promise.all(loadedBooks.map(book => getLocalReadingProgress(user.id, book.id).catch(() => undefined))),
      ]);
      if (version !== requestId.current) return;
      const remoteProgressAvailable = 'items' in progressResult;
      const remoteProgressByBook = latestProgress(remoteProgressAvailable ? progressResult.items : []);
      const localProgressByBook = new Map(loadedBooks.map((book, index) => [book.id, localProgressResult[index]]));
      const remoteProgressUnavailable = !remoteProgressAvailable;
      setBooks(loadedBooks.map(book => {
        const readingProgress = mergeReadingProgress(remoteProgressByBook.get(book.id), localProgressByBook.get(book.id));
        return { ...book, readingProgress, progressUnavailable: remoteProgressUnavailable && !readingProgress };
      }));
      if (remoteProgressUnavailable) {
        setError('Đã tải sách nhưng chưa tải được tiến trình đọc.');
        setProgressOnlyError(true);
      }
    } catch (error) {
      if (version === requestId.current) { setError(errorMessage(error)); setProgressOnlyError(false); }
    } finally {
      if (version === requestId.current) { setLoading(false); setRefreshing(false); }
    }
  }, [user.id]);
  const retryProgress = async () => {
    if (progressRetrying || !books.length) return;
    setProgressRetrying(true);
    try {
      const [remoteItems, localItems] = await Promise.all([
        getReadingProgresses(200),
        Promise.all(books.map(book => getLocalReadingProgress(user.id, book.id).catch(() => undefined))),
      ]);
      const remoteByBook = latestProgress(remoteItems);
      const localByBook = new Map(books.map((book, index) => [book.id, localItems[index]]));
      setBooks(current => current.map(book => ({ ...book,
        readingProgress: mergeReadingProgress(remoteByBook.get(book.id), localByBook.get(book.id)),
        progressUnavailable: false,
      })));
      setError(''); setProgressOnlyError(false);
    } catch (reason) {
      setError(`Chưa tải được tiến trình đọc. ${errorMessage(reason)}`);
      setProgressOnlyError(true);
    } finally { setProgressRetrying(false); }
  };

  useFocusEffect(useCallback(() => {
    void loadLibrary();
    return () => { requestId.current++; };
  }, [loadLibrary]));

  const filteredBooks = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    if (!query) return books;
    return books.filter((book) =>
      normalizeSearchText(book.title).includes(query) ||
      normalizeSearchText(book.author).includes(query)
    );
  }, [books, searchQuery]);

  const renderProgress = (book: LibraryBook, compact: boolean) => {
    const progress = book.readingProgress;
    const state = readingState(book, theme);
    const percentage = progress ? Math.round(readingPercentage(progress.currentPage, book.totalPages)) : 0;
    return (
      <View style={styles.progressSection}>
        <View style={[styles.progressHeader, compact && styles.compactProgressHeader]}>
          <View style={[styles.stateBadge, { backgroundColor: state.background }]}>
            <Text style={[styles.stateText, { color: state.color }]}>{state.label}</Text>
          </View>
          {progress && progress.currentPage >= 1 ? (
            <Text style={[styles.pageProgress, compact && styles.compactPageProgress]} numberOfLines={1}>
              Trang {progress.currentPage}/{book.totalPages} · {percentage}%
            </Text>
          ) : null}
        </View>
        {progress && progress.currentPage >= 1 ? (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percentage}%` }]} />
            </View>
            {!compact && progress.lastReadTimestamp ? (
              <Text style={styles.lastRead}>Đọc gần nhất: {formatDate(progress.lastReadTimestamp)}</Text>
            ) : null}
          </>
        ) : null}
      </View>
    );
  };

  const renderBook = ({ item }: { item: LibraryBook }) => {
    const grid = viewMode === 'grid';
    return (
      <TouchableOpacity
        style={[styles.bookCard, grid ? styles.gridCard : styles.listCard]}
        onPress={() => onSelectBook(item)} activeOpacity={0.85}
      >
        <View style={[styles.coverWrapper, grid ? styles.gridCover : styles.listCover]}>
          <Image
            source={{ uri: item.coverUrl, headers: getMediaRequestHeaders(item.coverUrl) }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.pageCountBadge}>
            <Text style={styles.pageCountText}>{item.totalPages || 0} trang</Text>
          </View>
        </View>
        <View style={[styles.infoWrapper, grid && styles.gridInfo]}>
          <Text style={[styles.bookTitle, grid && styles.gridTitle]} numberOfLines={2}>{item.title}</Text>
          <View style={styles.authorRow}>
          <Ionicons name="person-outline" size={12} color={theme.colors.primary} />
            <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
          </View>
          {renderProgress(item, grid)}
          <View style={styles.footerRow}>
            <View style={[styles.accessBadge, item.isFree ? styles.freeBadge : styles.licensedBadge]}>
              <Ionicons name={item.isFree ? 'lock-open-outline' : 'shield-checkmark-outline'} size={11} color={item.isFree ? '#047857' : '#B45309'} />
              <Text style={[styles.accessText, item.isFree ? styles.freeText : styles.licensedText]}>
                {item.isFree ? 'Miễn phí' : 'Bản quyền'}
              </Text>
            </View>
            {!grid ? (
              <View style={styles.readButton}>
        <Ionicons name="book-outline" size={14} color={theme.colors.textInverse} />
                <Text style={styles.readButtonText}>
                  {item.readingProgress && item.readingProgress.currentPage > 1 ? 'Đọc tiếp' : 'Đọc sách'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.surface} />
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.appName}>MEKOBOOK</Text>
          <Text style={styles.subTitle}>Thư viện sách điện tử</Text>
        </View>
        <TouchableOpacity style={styles.userBadge} onPress={onOpenAccount} accessibilityRole="button" accessibilityLabel="Mở thông tin tài khoản">
          <View style={styles.userDot} />
          <Text style={styles.userBadgeText} numberOfLines={1}>{user.name}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toolsContainer}>
        {error ? <TouchableOpacity accessibilityRole="button" disabled={progressRetrying}
          onPress={() => progressOnlyError && books.length ? void retryProgress() : (setLoading(true), void loadLibrary())}
          style={styles.errorRetry}>
          {progressRetrying ? <ActivityIndicator size="small" color={theme.colors.error} /> : null}
          <Text style={styles.errorRetryText}>{error} {progressRetrying ? 'Đang thử lại…' : 'Chạm để thử lại.'}</Text>
        </TouchableOpacity> : null}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={theme.colors.primary} />
          <TextInput
            style={styles.searchInput} placeholder="Tìm sách hoặc tác giả"
            placeholderTextColor="#94A3B8" value={searchQuery} onChangeText={setSearchQuery}
            autoCorrect={false} returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Xóa từ khóa" hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.libraryToolbar}>
          <Text style={styles.resultCount}>{filteredBooks.length} cuốn sách</Text>
          <View style={styles.toolbarActions}>
            <TouchableOpacity style={styles.shelfButton} onPress={() => setShelvesVisible(true)} accessibilityRole="button" accessibilityLabel="Quản lý tủ sách cá nhân" hitSlop={4}>
              <Ionicons name="albums-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.shelfButtonText}>Tủ sách cá nhân</Text>
            </TouchableOpacity>
            <View style={styles.viewSwitcher}>
              <TouchableOpacity style={[styles.viewButton, viewMode === 'grid' && styles.viewButtonActive]} onPress={() => setViewMode('grid')} accessibilityRole="button" accessibilityLabel="Dạng lưới" accessibilityState={{ selected: viewMode === 'grid' }} hitSlop={5}>
                <Ionicons name="grid-outline" size={18} color={viewMode === 'grid' ? theme.colors.textInverse : theme.colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]} onPress={() => setViewMode('list')} accessibilityRole="button" accessibilityLabel="Dạng danh sách" accessibilityState={{ selected: viewMode === 'list' }} hitSlop={5}>
                <Ionicons name="list-outline" size={20} color={viewMode === 'list' ? theme.colors.textInverse : theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={styles.loadingText}>Đang tải thư viện sách...</Text></View>
      ) : (
        <FlatList
          key={viewMode} data={filteredBooks} numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.listContent}
          renderItem={renderBook}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLibrary(); }} tintColor="#059669" />}
          ListEmptyComponent={<View style={styles.centerContainer}>
            <Ionicons name={searchQuery.trim() ? 'search-outline' : 'library-outline'} size={36} color="#94A3B8" />
            <Text style={styles.emptyText}>{searchQuery.trim() ? 'Không tìm thấy sách phù hợp' : 'Thư viện chưa có sách'}</Text>
            {searchQuery.trim() ? <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchText}>Xóa từ khóa tìm kiếm</Text>
            </TouchableOpacity> : null}
          </View>}
        />
      )}
      <PersonalShelfModal visible={shelvesVisible} books={books} onSelectBook={onSelectBook}
        onClose={() => setShelvesVisible(false)} />
      <AppBottomNavigation active="library" onOpenLibrary={() => {}} onOpenAccount={onOpenAccount} />
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: Platform.OS === 'android' ? 20 : 12, paddingBottom: 14, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { flex: 1, marginRight: 12 },
  appName: { color: theme.colors.primary, fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  subTitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2, fontWeight: '500' },
  userBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primarySoft, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.primary },
  userDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.success, marginRight: 6 },
  userBadgeText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700', maxWidth: 110 },
  toolsContainer: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 46, backgroundColor: theme.colors.surface, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 14, marginHorizontal: 8 },
  errorRetry: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, marginBottom: 4, borderRadius: 10, backgroundColor: theme.colors.errorSoft },
  errorRetryText: { flex: 1, color: theme.colors.error, fontSize: 12, lineHeight: 17 },
  libraryToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  resultCount: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shelfButton: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  shelfButtonText: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  viewSwitcher: { flexDirection: 'row', backgroundColor: theme.colors.border, padding: 2, borderRadius: 9 },
  viewButton: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  viewButtonActive: { backgroundColor: theme.colors.primary },
  listContent: { paddingHorizontal: 18, paddingBottom: 24 },
  gridRow: { justifyContent: 'space-between' },
  clearSearchButton: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, backgroundColor: theme.colors.primarySoft },
  clearSearchText: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  bookCard: { backgroundColor: theme.colors.surface, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, marginBottom: 13, elevation: 2, shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  listCard: { flexDirection: 'row', minHeight: 174 },
  gridCard: { width: '48.5%' },
  coverWrapper: { position: 'relative', backgroundColor: theme.colors.border },
  listCover: { width: 118, height: 174, borderRightWidth: 1, borderRightColor: theme.colors.border },
  gridCover: { width: '100%', aspectRatio: 0.72 },
  coverImage: { width: '100%', height: '100%' },
  pageCountBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(15,23,42,0.78)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  pageCountText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  infoWrapper: { flex: 1, padding: 12 },
  gridInfo: { padding: 10 },
  bookTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  gridTitle: { fontSize: 13, lineHeight: 18, minHeight: 36 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 4 },
  bookAuthor: { flex: 1, color: theme.colors.textSecondary, fontSize: 11, fontWeight: '500' },
  progressSection: { marginTop: 9 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  compactProgressHeader: { alignItems: 'flex-start', flexDirection: 'column', gap: 4 },
  stateBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  stateText: { fontSize: 10, fontWeight: '800' },
  pageProgress: { flex: 1, color: theme.colors.textMuted, textAlign: 'right', fontSize: 9, fontWeight: '600' },
  compactPageProgress: { alignSelf: 'stretch', flex: 0, textAlign: 'left', fontSize: 10 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: theme.colors.border, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: theme.colors.info },
  lastRead: { color: theme.colors.disabled, fontSize: 9, marginTop: 4 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  accessBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  freeBadge: { backgroundColor: theme.colors.successSoft }, licensedBadge: { backgroundColor: theme.colors.warningSoft },
  accessText: { fontSize: 10, fontWeight: '800' }, freeText: { color: theme.colors.success }, licensedText: { color: theme.colors.warning },
  readButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primary, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8 },
  readButtonText: { color: theme.colors.textInverse, fontSize: 11, fontWeight: '800' },
  centerContainer: { flex: 1, minHeight: 220, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  loadingText: { color: theme.colors.textMuted, fontSize: 13, marginTop: 12 }, emptyText: { color: theme.colors.textMuted, fontSize: 14, marginTop: 10 },
});

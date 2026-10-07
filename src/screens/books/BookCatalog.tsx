import { colors } from '../../constants/theme';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Platform, RefreshControl,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LibraryBook, ReadingProgress, UserAccount } from '../../types';
import { getBooks, getMediaRequestHeaders, getReadingProgresses } from '../../services/api';
import { errorMessage } from '../../services/http';

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

function readingState(book: LibraryBook) {
  const progress = book.readingProgress;
  if (!progress || progress.currentPage < 1 || (progress.readStatus === 'NOT_STARTED' && progress.percentage <= 0)) {
    return { label: 'Chưa đọc', color: colors.muted, background: '#F1F5F9' };
  }
  if (progress.readStatus === 'COMPLETED' || progress.percentage >= 100) {
    return { label: 'Đã hoàn thành', color: '#047857', background: '#D1FAE5' };
  }
  return { label: 'Đang đọc', color: '#1D4ED8', background: '#DBEAFE' };
}

function formatDate(timestamp?: number): string {
  return timestamp ? new Date(timestamp).toLocaleDateString('vi-VN') : '';
}

export const BookCatalog: React.FC<BookCatalogProps> = ({ user, onSelectBook, onOpenAccount }) => {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [error, setError] = useState('');

  const loadLibrary = async () => {
    setError('');
    try {
      const [bookItems, progressItems] = await Promise.all([
        getBooks(100), getReadingProgresses(200),
      ]);
      const progressByBook = latestProgress(progressItems);
      setBooks(bookItems.map((book) => ({ ...book, readingProgress: progressByBook.get(book.id) })));
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadLibrary(); }, []);

  const filteredBooks = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi-VN');
    if (!query) return books;
    return books.filter((book) =>
      book.title.toLocaleLowerCase('vi-VN').includes(query) ||
      book.author.toLocaleLowerCase('vi-VN').includes(query)
    );
  }, [books, searchQuery]);

  const renderProgress = (book: LibraryBook, compact: boolean) => {
    const progress = book.readingProgress;
    const state = readingState(book);
    const percentage = Math.max(0, Math.min(100, Math.round(progress?.percentage || 0)));
    return (
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <View style={[styles.stateBadge, { backgroundColor: state.background }]}>
            <Text style={[styles.stateText, { color: state.color }]}>{state.label}</Text>
          </View>
          {progress && progress.currentPage > 1 ? (
            <Text style={styles.pageProgress} numberOfLines={1}>
              Trang {progress.currentPage}/{book.totalPages} · {percentage}%
            </Text>
          ) : null}
        </View>
        {progress && progress.currentPage > 1 ? (
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
            <Ionicons name="person-outline" size={12} color={colors.primary} />
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
                <Ionicons name="book-outline" size={14} color={colors.surface} />
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
        {error ? <TouchableOpacity accessibilityRole="button" onPress={() => { setLoading(true); loadLibrary(); }}>
          <Text style={{ color: colors.error, padding: 10 }}>{error} Chạm để thử lại.</Text>
        </TouchableOpacity> : null}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={colors.primary} />
          <TextInput
            style={styles.searchInput} placeholder="Tìm theo tên sách hoặc tác giả"
            placeholderTextColor="#94A3B8" value={searchQuery} onChangeText={setSearchQuery}
            autoCorrect={false} returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Xóa từ khóa">
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.libraryToolbar}>
          <Text style={styles.resultCount}>{filteredBooks.length} cuốn sách</Text>
          <View style={styles.viewSwitcher}>
            <TouchableOpacity style={[styles.viewButton, viewMode === 'grid' && styles.viewButtonActive]} onPress={() => setViewMode('grid')} accessibilityLabel="Dạng lưới" accessibilityState={{ selected: viewMode === 'grid' }}>
              <Ionicons name="grid-outline" size={18} color={viewMode === 'grid' ? colors.surface : colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]} onPress={() => setViewMode('list')} accessibilityLabel="Dạng danh sách" accessibilityState={{ selected: viewMode === 'list' }}>
              <Ionicons name="list-outline" size={20} color={viewMode === 'list' ? colors.surface : colors.muted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Đang tải thư viện sách...</Text></View>
      ) : (
        <FlatList
          key={viewMode} data={filteredBooks} numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.listContent}
          renderItem={renderBook}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLibrary(); }} tintColor="#059669" />}
          ListEmptyComponent={<View style={styles.centerContainer}><Ionicons name="search-outline" size={36} color="#94A3B8" /><Text style={styles.emptyText}>Không tìm thấy sách phù hợp</Text></View>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: Platform.OS === 'android' ? 20 : 12, paddingBottom: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { flex: 1, marginRight: 12 },
  appName: { color: colors.primary, fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  subTitle: { color: colors.muted, fontSize: 12, marginTop: 2, fontWeight: '500' },
  userBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#A7F3D0' },
  userDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
  userBadgeText: { color: '#065F46', fontSize: 12, fontWeight: '700', maxWidth: 110 },
  toolsContainer: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 46, backgroundColor: colors.surface, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, marginHorizontal: 8 },
  libraryToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  resultCount: { color: '#475569', fontSize: 13, fontWeight: '600' },
  viewSwitcher: { flexDirection: 'row', backgroundColor: colors.border, padding: 2, borderRadius: 9 },
  viewButton: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  viewButtonActive: { backgroundColor: colors.primary },
  listContent: { paddingHorizontal: 18, paddingBottom: 24 },
  gridRow: { justifyContent: 'space-between' },
  bookCard: { backgroundColor: colors.surface, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 13, elevation: 2, shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  listCard: { flexDirection: 'row', height: 174 },
  gridCard: { width: '48.5%' },
  coverWrapper: { position: 'relative', backgroundColor: colors.border },
  listCover: { width: 118, height: 174, borderRightWidth: 1, borderRightColor: '#D1FAE5' },
  gridCover: { width: '100%', aspectRatio: 0.72 },
  coverImage: { width: '100%', height: '100%' },
  pageCountBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(15,23,42,0.78)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  pageCountText: { color: colors.surface, fontSize: 9, fontWeight: '700' },
  infoWrapper: { flex: 1, padding: 12 },
  gridInfo: { padding: 10 },
  bookTitle: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  gridTitle: { fontSize: 13, lineHeight: 18, minHeight: 36 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 4 },
  bookAuthor: { flex: 1, color: '#475569', fontSize: 11, fontWeight: '500' },
  progressSection: { marginTop: 9 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  stateBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  stateText: { fontSize: 10, fontWeight: '800' },
  pageProgress: { flex: 1, color: colors.muted, textAlign: 'right', fontSize: 9, fontWeight: '600' },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#3B82F6' },
  lastRead: { color: '#94A3B8', fontSize: 9, marginTop: 4 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  accessBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  freeBadge: { backgroundColor: '#ECFDF5' }, licensedBadge: { backgroundColor: '#FEF3C7' },
  accessText: { fontSize: 10, fontWeight: '800' }, freeText: { color: '#047857' }, licensedText: { color: '#B45309' },
  readButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8 },
  readButtonText: { color: colors.surface, fontSize: 11, fontWeight: '800' },
  centerContainer: { flex: 1, minHeight: 220, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  loadingText: { color: colors.muted, fontSize: 13, marginTop: 12 }, emptyText: { color: colors.muted, fontSize: 14, marginTop: 10 },
});

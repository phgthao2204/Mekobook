/**
 * Mekobook Mobile - BookCatalog Component
 * Clean Light Mode with Emerald Green Theme (#059669)
 * ZERO EMOJIS - USES PURE VECTOR ICONS (Ionicons)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Book } from '../../types';
import { getBooks } from '../../services/api';
import { ENV } from '../../config/env';

interface BookCatalogProps {
  onSelectBook: (book: Book) => void;
}

export const BookCatalog: React.FC<BookCatalogProps> = ({ onSelectBook }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadBooks = async () => {
    try {
      const data = await getBooks(30);
      setBooks(data);
    } catch (err) {
      console.error('[Catalog] Error loading books:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadBooks();
  };

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>MEKOBOOK</Text>
          <Text style={styles.subTitle}>Hệ Thống Sách Điện Tử 3D Flipbook</Text>
        </View>
        <View style={styles.userBadge}>
          <View style={styles.userDot} />
          <Text style={styles.userBadgeText}>{ENV.AUTH.USERNAME}</Text>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#059669" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm sách, tài liệu giáo trình..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* CATALOG LIST */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Đang tải kho sách Liferay Staging...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookCard}
              onPress={() => onSelectBook(item)}
              activeOpacity={0.85}
            >
              {/* Cover Image */}
              <View style={styles.coverWrapper}>
                <Image
                  source={{ uri: item.coverUrl }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
                <View style={styles.pageCountBadge}>
                  <Text style={styles.pageCountText}>{item.totalPages || 0} trang</Text>
                </View>
              </View>

              {/* Book Info */}
              <View style={styles.infoWrapper}>
                <View style={styles.titleRow}>
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>

                <View style={styles.authorRow}>
                  <Ionicons name="person-outline" size={13} color="#059669" style={styles.authorIcon} />
                  <Text style={styles.bookAuthor} numberOfLines={1}>
                    {item.author}
                  </Text>
                </View>

                {item.description ? (
                  <Text style={styles.bookDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.footerRow}>
                  <View
                    style={[
                      styles.tagBadge,
                      item.isFree ? styles.freeBadge : styles.licensedBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagBadgeText,
                        item.isFree ? styles.freeBadgeText : styles.licensedBadgeText,
                      ]}
                    >
                      {item.isFree ? 'Miễn phí' : 'Bản quyền LCP'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.readButton}
                    onPress={() => onSelectBook(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="book-outline" size={14} color="#FFFFFF" style={styles.readButtonIcon} />
                    <Text style={styles.readButtonText}>Lật 3D</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Không tìm thấy tài liệu phù hợp</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  appName: {
    color: '#059669',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  subTitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  userDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  userBadgeText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginVertical: 14,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  coverWrapper: {
    width: 105,
    height: 145,
    position: 'relative',
    backgroundColor: '#F1F5F9',
    borderRightWidth: 1.5,
    borderRightColor: '#A7F3D0',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  pageCountBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pageCountText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '600',
  },
  infoWrapper: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bookTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  authorIcon: {
    marginRight: 4,
  },
  bookAuthor: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
  },
  bookDesc: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  freeBadge: {
    backgroundColor: '#ECFDF5',
  },
  freeBadgeText: {
    color: '#059669',
  },
  licensedBadge: {
    backgroundColor: '#FEF3C7',
  },
  licensedBadgeText: {
    color: '#D97706',
  },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  readButtonIcon: {
    marginRight: 5,
  },
  readButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});

/**
 * Mekobook Mobile - FlipbookControls Component
 * Minimalist navigation with Emerald Green theme (#059669) & Table of Contents (TOC) Modal
 * ZERO EMOJIS - USES PURE VECTOR ICONS (Ionicons)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Book, ChapterTOC } from '../../types';
import { getBookTOC } from '../../services/api';

interface FlipbookControlsProps {
  book: Book;
  currentPage: number;
  totalPages: number;
  visible: boolean;
  onBack: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onJumpToPage: (page: number) => void;
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
}) => {
  const [showToc, setShowToc] = useState<boolean>(false);
  const [tocList, setTocList] = useState<ChapterTOC[]>([]);
  const [loadingToc, setLoadingToc] = useState<boolean>(false);

  useEffect(() => {
    if (showToc && book.id) {
      setLoadingToc(true);
      getBookTOC(book.id)
        .then((items) => {
          setTocList(items);
        })
        .finally(() => setLoadingToc(false));
    }
  }, [showToc, book.id]);

  if (!visible) return null;

  const percentage = Math.round((currentPage / (totalPages || 1)) * 100);
  const pageLabel = currentPage === 1 && book.coverUrl ? 'Bìa sách' : `Trang ${currentPage}`;

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.bookTitle} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {book.author}
          </Text>
        </View>

        {/* TOC TRIGGER BUTTON */}
        <TouchableOpacity
          style={styles.tocButton}
          onPress={() => setShowToc(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="list" size={17} color="#059669" />
          <Text style={styles.tocButtonText}>Mục lục</Text>
        </TouchableOpacity>

        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>
            {pageLabel} ({currentPage}/{totalPages})
          </Text>
        </View>
      </View>

      {/* BOTTOM NAVIGATION & PROGRESS BAR */}
      <View style={styles.bottomBar}>
        <View style={styles.scrubberRow}>
          <TouchableOpacity
            style={[styles.navButton, currentPage <= 1 && styles.buttonDisabled]}
            onPress={onPrevPage}
            disabled={currentPage <= 1}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={currentPage <= 1 ? '#94A3B8' : '#FFFFFF'}
            />
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
            </View>
            <Text style={styles.percentageText}>
              {pageLabel} • {percentage}% hoàn thành
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.navButton, currentPage >= totalPages && styles.buttonDisabled]}
            onPress={onNextPage}
            disabled={currentPage >= totalPages}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={currentPage >= totalPages ? '#94A3B8' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* TABLE OF CONTENTS MODAL */}
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
          <SafeAreaView style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconBadge}>
                  <Ionicons name="book" size={18} color="#059669" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Mục Lục Cuốn Sách</Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {book.title}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowToc(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            {loadingToc ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#059669" />
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
                    <Text style={styles.loadingText}>Chưa có mục lục cho tài liệu này</Text>
                  </View>
                }
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
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
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  bookAuthor: {
    color: '#64748B',
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
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  pageBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pageBadgeText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  percentageText: {
    color: '#64748B',
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
    backgroundColor: '#FFFFFF',
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
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    maxWidth: 240,
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
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#059669',
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
    backgroundColor: '#059669',
  },
  tocPageText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  tocPageTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 10,
  },
});

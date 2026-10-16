import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { BookAccess } from '../../types';
import { getBookAccess } from '../../services/reader';
import { getMediaRequestHeaders } from '../../services/api';
import { errorMessage } from '../../services/http';
import { colors } from '../../constants/theme';
import { LoadState } from '../../component/LoadState';
import { clampPage, hasStartedReading, readingPercentage } from '../../utils/reader';
import { useAuth } from '../../hooks/useAuth';
import { AppBottomNavigation } from '../../component/AppBottomNavigation';
export function BookDetailScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'BookDetail'>) {
  const { session } = useAuth();
  const [access, setAccess] = useState<BookAccess | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setAccess(null); setError('');
    getBookAccess(route.params.bookId, session?.user.id).then(value => { if (active) setAccess(value); })
      .catch(reason => { if (active) setError(errorMessage(reason)); });
    return () => { active = false; };
  }, [route.params.bookId, attempt, session?.user.id]));
  if (!access) return <LoadState error={error} onRetry={() => setAttempt(x => x + 1)} onBack={navigation.goBack} />;
  const { book, licenses, canRead } = access;
  const page = clampPage(book.readingProgress?.currentPage || 1, book.totalPages);
  const started = hasStartedReading(book.readingProgress);
  const percentage = Math.round(readingPercentage(page, book.totalPages));
  const progressLabel = access.progressUnavailable
    ? 'Chưa tải được tiến trình'
    : started ? `Trang ${page}/${book.totalPages} · ${percentage}%` : 'Chưa đọc';
  const permission = book.isFree
    ? { icon: 'lock-open-outline' as const, label: 'Miễn phí', detail: 'Bạn có thể đọc toàn bộ nội dung', color: '#047857', background: '#ECFDF5', border: '#A7F3D0' }
    : access.licensesUnavailable
      ? { icon: 'alert-circle-outline' as const, label: 'Chưa kiểm tra được', detail: 'Không thể kiểm tra giấy phép lúc này', color: '#B45309', background: '#FFFBEB', border: '#FDE68A' }
      : canRead
        ? { icon: 'shield-checkmark-outline' as const, label: 'Bản quyền', detail: 'Giấy phép đọc đang còn hiệu lực', color: '#1D4ED8', background: '#EFF6FF', border: '#BFDBFE' }
        : { icon: 'lock-closed-outline' as const, label: 'Chưa có quyền đọc', detail: 'Giấy phép chưa được xác nhận', color: '#B91C1C', background: '#FEF2F2', border: '#FECACA' };
  const open = (mode: 'start' | 'continue') => navigation.navigate('BookLoading', {
    bookId: book.id,
    mode,
    preview: { title: book.title, author: book.author, coverUrl: book.coverUrl },
  });
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại thư viện" onPress={navigation.goBack} style={styles.back}>
        <Ionicons name="arrow-back" size={23} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Thông tin sách</Text>
      <View style={styles.headerSpacer} />
    </View>

    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.coverFrame}>
          <Image source={{ uri: book.coverUrl, headers: getMediaRequestHeaders(book.coverUrl) }} style={styles.cover} resizeMode="cover" />
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.title}>{book.title}</Text>
          <View style={styles.authorRow}>
            <Ionicons name="person-outline" size={15} color={colors.primary} />
            <Text style={styles.author}>{book.author}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Ionicons name="document-text-outline" size={13} color={colors.muted} /><Text style={styles.metaText}>{book.totalPages} trang</Text></View>
            {book.publicationYear ? <View style={styles.metaChip}><Ionicons name="calendar-outline" size={13} color={colors.muted} /><Text style={styles.metaText}>{book.publicationYear}</Text></View> : null}
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Tiến trình đọc</Text>
        <View style={styles.progressHeader}>
          <View style={[styles.statusBadge, !started && styles.notStartedBadge]}>
            <Text style={[styles.statusText, !started && styles.notStartedText]}>{started ? 'Đang đọc' : 'Chưa đọc'}</Text>
          </View>
          <Text style={styles.progressLabel}>{progressLabel}</Text>
        </View>
        {started && !access.progressUnavailable ? <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percentage}%` }]} /></View> : null}
        {access.progressUnavailable ? <TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={() => setAttempt(x => x + 1)}>
          <Ionicons name="refresh-outline" size={15} color={colors.primary} /><Text style={styles.retryText}>Tải lại tiến trình</Text>
        </TouchableOpacity> : null}
      </View>

      <View style={[styles.permissionCard, { backgroundColor: permission.background, borderColor: permission.border }]}>
        <View style={[styles.permissionIcon, { backgroundColor: permission.border }]}><Ionicons name={permission.icon} size={21} color={permission.color} /></View>
        <View style={styles.permissionContent}>
          <Text style={styles.permissionCaption}>QUYỀN ĐỌC</Text>
          <Text style={[styles.permissionTitle, { color: permission.color }]}>{permission.label}</Text>
          <Text style={styles.permissionDetail}>{permission.detail}</Text>
        </View>
      </View>

      {!book.isFree ? licenses.map(license => {
          const details = [
            license.status === 'EXPIRED' ? 'Đã hết hạn' : null,
            Number.isFinite(license.maxDevices) && license.maxDevices > 0
              ? `Tối đa ${license.maxDevices} thiết bị`
              : null,
          ].filter(Boolean);
          return details.length ? <Text key={license.id} style={styles.licenseDetail}>{details.join(' · ')}</Text> : null;
        }) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Thông tin xuất bản</Text>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Nhà xuất bản</Text><Text style={styles.infoValue}>{book.publisher || 'Chưa có thông tin'}</Text></View>
        <View style={styles.divider} />
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Năm xuất bản</Text><Text style={styles.infoValue}>{book.publicationYear || 'Chưa có thông tin'}</Text></View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Giới thiệu</Text>
        <Text style={styles.description}>{book.description || 'Chưa có mô tả cho cuốn sách này.'}</Text>
      </View>
    </ScrollView>

    <View style={styles.stickyActions}>
      {started ? <TouchableOpacity disabled={!canRead} accessibilityRole="button" style={[styles.secondaryButton, !canRead && styles.disabled]} onPress={() => open('start')}>
        <Ionicons name="refresh-outline" size={18} color={colors.primary} />
        <Text style={styles.secondaryButtonText}>Đọc từ đầu</Text>
      </TouchableOpacity> : null}
      <TouchableOpacity disabled={!canRead} accessibilityRole="button" style={[styles.primaryButton, started && styles.flexButton, !canRead && styles.disabled]}
        onPress={() => open(started ? 'continue' : 'start')}>
        <Ionicons name="book-outline" size={18} color={colors.surface} />
        <Text style={styles.primaryButtonText}>{started && !access.progressUnavailable ? `Đọc tiếp trang ${page}` : 'Bắt đầu đọc'}</Text>
      </TouchableOpacity>
    </View>
    <AppBottomNavigation active="library" onOpenLibrary={() => navigation.navigate('Library')}
      onOpenAccount={() => navigation.navigate('Account')} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, headerSpacer: { width: 40 },
  content: { padding: 16, paddingBottom: 24 },
  hero: { flexDirection: 'row', backgroundColor: colors.surface, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  coverFrame: { width: 112, aspectRatio: 0.72, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.border, elevation: 3, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 6 },
  cover: { width: '100%', height: '100%' }, heroInfo: { flex: 1, paddingLeft: 14, justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '800', color: colors.text },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }, author: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }, metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }, metaText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  sectionCard: { padding: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 12 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, backgroundColor: '#DBEAFE' }, statusText: { color: '#1D4ED8', fontSize: 11, fontWeight: '800' },
  notStartedBadge: { backgroundColor: '#F1F5F9' }, notStartedText: { color: colors.muted }, progressLabel: { flex: 1, color: colors.muted, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, marginTop: 11, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#3B82F6' },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, alignSelf: 'flex-end' }, retryText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  permissionCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 14 }, permissionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  permissionContent: { flex: 1, marginLeft: 12 }, permissionCaption: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 }, permissionTitle: { fontSize: 15, fontWeight: '900', marginTop: 2 }, permissionDetail: { color: '#475569', fontSize: 11, marginTop: 2 }, licenseDetail: { color: colors.muted, fontSize: 11, marginTop: -7, marginBottom: 14, paddingHorizontal: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }, infoLabel: { color: colors.muted, fontSize: 12 }, infoValue: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'right' }, divider: { height: 1, backgroundColor: colors.border, marginVertical: 11 },
  description: { color: '#475569', fontSize: 13, lineHeight: 21 },
  stickyActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, elevation: 12, shadowColor: '#0F172A', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 8 },
  primaryButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.primary }, flexButton: { flex: 1.25 }, primaryButtonText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
  secondaryButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 13, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' }, secondaryButtonText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.4 },
});

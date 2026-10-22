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
import { AppTheme, useTheme, useThemedStyles } from '../../theme';
import { LoadState } from '../../component/LoadState';
import { clampPage, hasStartedReading, readingPercentage } from '../../utils/reader';
import { useAuth } from '../../hooks/useAuth';
import { AppBottomNavigation } from '../../component/AppBottomNavigation';
import { PersonalShelfModal } from '../../component/PersonalShelfModal';
function licenseTypeLabel(value: string): string {
  if (value === 'PERPETUAL') return 'Vĩnh viễn';
  if (value === 'RENTAL') return 'Thuê có thời hạn';
  return 'Chưa xác định';
}
function licenseStatusLabel(value: string): string {
  if (value === 'ACTIVE') return 'Còn hiệu lực';
  if (value === 'EXPIRED') return 'Đã hết hạn';
  return 'Chưa xác định';
}
export function BookDetailScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'BookDetail'>) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { session } = useAuth();
  const [access, setAccess] = useState<BookAccess | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [shelvesVisible, setShelvesVisible] = useState(false);
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
    ? { icon: 'lock-open-outline' as const, label: 'Miễn phí', detail: 'Bạn có thể đọc toàn bộ nội dung', color: theme.colors.success, background: theme.colors.successSoft, border: theme.colors.success }
    : access.licensesUnavailable
      ? { icon: 'alert-circle-outline' as const, label: 'Chưa kiểm tra được', detail: 'Không thể kiểm tra giấy phép lúc này', color: theme.colors.warning, background: theme.colors.warningSoft, border: theme.colors.warning }
      : canRead
        ? { icon: 'shield-checkmark-outline' as const, label: 'Bản quyền', detail: 'Giấy phép đọc đang còn hiệu lực', color: theme.colors.info, background: theme.colors.infoSoft, border: theme.colors.info }
        : { icon: 'lock-closed-outline' as const, label: 'Chưa có quyền đọc', detail: 'Giấy phép chưa được xác nhận', color: theme.colors.error, background: theme.colors.errorSoft, border: theme.colors.error };
  const open = (mode: 'start' | 'continue') => navigation.navigate('BookLoading', {
    bookId: book.id,
    mode,
    preview: { title: book.title, author: book.author, coverUrl: book.coverUrl },
  });
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại thư viện" onPress={navigation.goBack} style={styles.back}>
        <Ionicons name="arrow-back" size={23} color={theme.colors.text} />
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
            <Ionicons name="person-outline" size={15} color={theme.colors.primary} />
            <Text style={styles.author}>{book.author}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Ionicons name="document-text-outline" size={13} color={theme.colors.textMuted} /><Text style={styles.metaText}>{book.totalPages} trang</Text></View>
            {book.publicationYear ? <View style={styles.metaChip}><Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} /><Text style={styles.metaText}>{book.publicationYear}</Text></View> : null}
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
          <Ionicons name="refresh-outline" size={15} color={theme.colors.primary} /><Text style={styles.retryText}>Tải lại tiến trình</Text>
        </TouchableOpacity> : null}
      </View>

      <View style={[styles.permissionCard, { backgroundColor: permission.background, borderColor: permission.border }]}>
        <View style={[styles.permissionIcon, { backgroundColor: permission.color }]}><Ionicons name={permission.icon} size={18} color={theme.colors.textInverse} /></View>
        <View style={styles.permissionContent}>
          <Text style={styles.permissionCaption}>QUYỀN ĐỌC</Text>
          <Text style={[styles.permissionTitle, { color: permission.color }]}>{permission.label}</Text>
          <Text style={styles.permissionDetail}>{permission.detail}</Text>
          {access.licensesUnavailable ? <TouchableOpacity accessibilityRole="button" style={styles.permissionRetry}
            onPress={() => setAttempt(value => value + 1)}>
            <Ionicons name="refresh-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.permissionRetryText}>Kiểm tra lại quyền đọc</Text>
          </TouchableOpacity> : null}
        </View>
      </View>

      {!book.isFree && licenses.length ? <View style={styles.licenseCard}>
        <View style={styles.licenseHeader}>
          <View style={styles.licenseHeaderIcon}><Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.info} /></View>
          <Text style={styles.licenseHeaderTitle}>Thông tin bản quyền</Text>
        </View>
        {licenses.map((license, index) => <View key={license.id} style={[styles.licenseBody, index > 0 && styles.licenseBodyBorder]}>
          <View style={styles.licenseRow}><Text style={styles.licenseLabel}>Loại giấy phép</Text><Text style={styles.licenseValue}>{licenseTypeLabel(license.licenseType)}</Text></View>
          <View style={styles.licenseRow}><Text style={styles.licenseLabel}>Trạng thái</Text>
            <View style={[styles.licenseBadge, license.status !== 'ACTIVE' && styles.licenseBadgeExpired]}>
              <Text style={[styles.licenseBadgeText, license.status !== 'ACTIVE' && styles.licenseBadgeTextExpired]}>{licenseStatusLabel(license.status)}</Text>
            </View>
          </View>
          <View style={styles.licenseRow}><Text style={styles.licenseLabel}>Giới hạn thiết bị</Text><Text style={styles.licenseValue}>{Number.isFinite(license.maxDevices) && license.maxDevices > 0 ? `${license.maxDevices} thiết bị` : 'Chưa xác định'}</Text></View>
          <View style={styles.licenseRow}><Text style={styles.licenseLabel}>Yêu thích</Text>
          <View style={styles.favoriteValue}><Ionicons name={license.isFavorite ? 'heart' : 'heart-outline'} size={16} color={license.isFavorite ? '#EC4899' : theme.colors.textMuted} /><Text style={styles.licenseValue}>{license.isFavorite ? 'Đã yêu thích' : 'Chưa yêu thích'}</Text></View>
          </View>
        </View>)}
      </View> : null}

      <TouchableOpacity style={styles.addToShelfButton} onPress={() => setShelvesVisible(true)} accessibilityRole="button">
        <View style={styles.addToShelfIcon}><Ionicons name="albums-outline" size={21} color={theme.colors.primary} /></View>
        <View style={styles.addToShelfContent}>
          <Text style={styles.addToShelfTitle}>Thêm vào tủ sách</Text>
          <Text style={styles.addToShelfText}>Sắp xếp cuốn sách này vào tủ sách cá nhân</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
      </TouchableOpacity>

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
        <Ionicons name="refresh-outline" size={18} color={theme.colors.primary} />
        <Text style={styles.secondaryButtonText}>Đọc từ đầu</Text>
      </TouchableOpacity> : null}
      <TouchableOpacity disabled={!canRead} accessibilityRole="button" style={[styles.primaryButton, started && styles.flexButton, !canRead && styles.disabled]}
        onPress={() => open(started ? 'continue' : 'start')}>
        <Ionicons name="book-outline" size={18} color={theme.colors.textInverse} />
        <Text style={styles.primaryButtonText}>{started && !access.progressUnavailable ? `Đọc tiếp trang ${page}` : 'Bắt đầu đọc'}</Text>
      </TouchableOpacity>
    </View>
    <PersonalShelfModal visible={shelvesVisible} bookId={book.id} onClose={() => setShelvesVisible(false)} />
    <AppBottomNavigation active="library" onOpenLibrary={() => navigation.navigate('Library')}
      onOpenAccount={() => navigation.navigate('Account')} />
  </SafeAreaView>;
}
const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceMuted },
  headerTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' }, headerSpacer: { width: 40 },
  content: { padding: 16, paddingBottom: 24 },
  hero: { flexDirection: 'row', backgroundColor: theme.colors.surface, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 14 },
  coverFrame: { width: 112, aspectRatio: 0.72, borderRadius: 10, overflow: 'hidden', backgroundColor: theme.colors.border, elevation: 3, shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 6 },
  cover: { width: '100%', height: '100%' }, heroInfo: { flex: 1, paddingLeft: 14, justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '800', color: theme.colors.text },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }, author: { flex: 1, color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }, metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.surfaceMuted, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }, metaText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  sectionCard: { padding: 15, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, marginBottom: 14 },
  sectionTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800', marginBottom: 12 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, backgroundColor: theme.colors.infoSoft }, statusText: { color: theme.colors.info, fontSize: 11, fontWeight: '800' },
  notStartedBadge: { backgroundColor: theme.colors.surfaceMuted }, notStartedText: { color: theme.colors.textMuted }, progressLabel: { flex: 1, color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: theme.colors.border, marginTop: 11, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 3, backgroundColor: theme.colors.info },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, alignSelf: 'flex-end' }, retryText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  permissionCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 14 }, permissionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  permissionContent: { flex: 1, marginLeft: 12 }, permissionCaption: { color: theme.colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 }, permissionTitle: { fontSize: 15, fontWeight: '900', marginTop: 2 }, permissionDetail: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
  permissionRetry: { minHeight: 34, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, paddingHorizontal: 11, borderRadius: 10, backgroundColor: theme.colors.surface },
  permissionRetryText: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  licenseCard: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.info, borderRadius: 16, padding: 15, marginBottom: 14 },
  licenseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }, licenseHeaderIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: theme.colors.infoSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, licenseHeaderTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  licenseBody: { gap: 10 }, licenseBodyBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 13, paddingTop: 13 },
  licenseRow: { minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, licenseLabel: { color: theme.colors.textMuted, fontSize: 12 }, licenseValue: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  licenseBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.colors.successSoft }, licenseBadgeExpired: { backgroundColor: theme.colors.errorSoft }, licenseBadgeText: { color: theme.colors.success, fontSize: 10, fontWeight: '800' }, licenseBadgeTextExpired: { color: theme.colors.error }, favoriteValue: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addToShelfButton: { minHeight: 70, flexDirection: 'row', alignItems: 'center', padding: 13, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 16, marginBottom: 14 },
  addToShelfIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primarySoft },
  addToShelfContent: { flex: 1, paddingHorizontal: 11 }, addToShelfTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800' }, addToShelfText: { color: theme.colors.textMuted, fontSize: 11, marginTop: 3 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }, infoLabel: { color: theme.colors.textMuted, fontSize: 12 }, infoValue: { flex: 1, color: theme.colors.text, fontSize: 12, fontWeight: '700', textAlign: 'right' }, divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 11 },
  description: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 21 },
  stickyActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border, elevation: 12, shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 8 },
  primaryButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 13, backgroundColor: theme.colors.primary }, flexButton: { flex: 1.25 }, primaryButtonText: { color: theme.colors.textInverse, fontSize: 13, fontWeight: '800' },
  secondaryButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 13, backgroundColor: theme.colors.primarySoft, borderWidth: 1, borderColor: theme.colors.primary }, secondaryButtonText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.4 },
});

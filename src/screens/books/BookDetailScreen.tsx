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
export function BookDetailScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'BookDetail'>) {
  const [access, setAccess] = useState<BookAccess | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setAccess(null); setError('');
    getBookAccess(route.params.bookId).then(value => { if (active) setAccess(value); })
      .catch(reason => { if (active) setError(errorMessage(reason)); });
    return () => { active = false; };
  }, [route.params.bookId, attempt]));
  if (!access) return <LoadState error={error} onRetry={() => setAttempt(x => x + 1)} onBack={navigation.goBack} />;
  const { book, licenses, canRead } = access;
  const page = book.readingProgress?.currentPage || 1;
  const open = (mode: 'start' | 'continue') => navigation.navigate('BookLoading', { bookId: book.id, mode });
  return <SafeAreaView style={styles.screen}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại thư viện" onPress={navigation.goBack} style={styles.back}>
      <Ionicons name="arrow-back" size={24} color={colors.text} />
    </TouchableOpacity>
    <ScrollView contentContainerStyle={styles.content}>
      <Image source={{ uri: book.coverUrl, headers: getMediaRequestHeaders(book.coverUrl) }} style={styles.cover} resizeMode="contain" />
      <Text style={styles.title}>{book.title}</Text>
      <Text style={styles.muted}>{book.author}</Text>
      <Text style={styles.text}>Nhà xuất bản: {book.publisher || 'Chưa có thông tin'}</Text>
      <Text style={styles.text}>Năm xuất bản: {book.publicationYear || 'Chưa có thông tin'}</Text>
      <Text style={styles.text}>{book.totalPages} trang</Text>
      <Text style={styles.text}>{book.description || 'Chưa có mô tả'}</Text>
      <Text style={styles.text}>Tiến trình: {book.readingProgress ? `Trang ${page} · ${book.readingProgress.percentage}%` : 'Chưa đọc'}</Text>
      <View style={styles.license}>
        <Text style={styles.text}>Quyền đọc: {book.isFree ? 'Miễn phí' : canRead ? 'Giấy phép còn hiệu lực' : 'Chưa có giấy phép còn hiệu lực'}</Text>
        {licenses.map(license => <Text key={license.id} style={styles.muted}>
          {license.licenseType} · {license.status === 'UNKNOWN' ? 'API chưa cung cấp trạng thái hiệu lực' : license.status} · Tối đa {license.maxDevices} thiết bị
        </Text>)}
      </View>
      <TouchableOpacity disabled={!canRead} accessibilityRole="button" style={[styles.button, !canRead && styles.disabled]}
        onPress={() => open(page > 1 ? 'continue' : 'start')}>
        <Text style={styles.buttonText}>{page > 1 ? `Đọc tiếp từ trang ${page}` : 'Bắt đầu đọc'}</Text>
      </TouchableOpacity>
      {page > 1 && <TouchableOpacity disabled={!canRead} style={styles.button} onPress={() => open('start')}>
        <Text style={styles.buttonText}>Đọc lại từ đầu</Text>
      </TouchableOpacity>}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, back: { padding: 16 },
  content: { padding: 20, paddingTop: 0 }, cover: { height: 240, width: '100%', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text }, muted: { color: colors.muted, marginVertical: 6 },
  text: { color: colors.text, lineHeight: 23, marginVertical: 5 }, license: { padding: 12, backgroundColor: colors.surface, marginVertical: 16, borderRadius: 12 },
  button: { padding: 15, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', marginBottom: 10 },
  buttonText: { color: colors.surface, fontWeight: '700' }, disabled: { opacity: 0.4 },
});

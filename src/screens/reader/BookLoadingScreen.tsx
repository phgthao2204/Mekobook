import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { prepareReader } from '../../services/reader';
import { getMediaRequestHeaders } from '../../services/api';
import { errorMessage } from '../../services/http';
import { colors } from '../../constants/theme';

const stages = [
  { progress: 0.2, message: 'Đang kiểm tra quyền đọc...' },
  { progress: 0.48, message: 'Đang tải cấu hình đọc...' },
  { progress: 0.74, message: 'Đang chuẩn bị nội dung sách...' },
];

export function BookLoadingScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'BookLoading'>) {
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [stage, setStage] = useState(0);
  const progress = useRef(new Animated.Value(stages[0].progress)).current;
  const preview = route.params.preview;

  useEffect(() => {
    let active = true;
    setError('');
    setStage(0);
    progress.setValue(stages[0].progress);
    const stageTimers = [450, 1050].map((delay, index) => setTimeout(() => {
      if (!active) return;
      const next = index + 1;
      setStage(next);
      Animated.timing(progress, { toValue: stages[next].progress, duration: 300, useNativeDriver: false }).start();
    }, delay));

    prepareReader(route.params.bookId, route.params.mode).then(result => {
      if (!active) return;
      setStage(2);
      Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: false }).start(() => {
        if (active) navigation.replace('Reader', result);
      });
    }).catch(reason => { if (active) setError(errorMessage(reason)); });

    return () => {
      active = false;
      stageTimers.forEach(clearTimeout);
      progress.stopAnimation();
    };
  }, [route.params.bookId, route.params.mode, attempt, navigation, progress]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return <View style={styles.screen}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại chi tiết sách"
      onPress={navigation.goBack} style={styles.back}>
      <Ionicons name="arrow-back" size={23} color={colors.text} />
    </TouchableOpacity>
    <View style={styles.content}>
      <View style={styles.coverFrame}>
        {preview?.coverUrl ? <Image source={{ uri: preview.coverUrl, headers: getMediaRequestHeaders(preview.coverUrl) }}
          style={styles.cover} resizeMode="contain" /> : <Ionicons name="book" size={54} color={colors.primary} />}
      </View>
      <Text style={styles.title} numberOfLines={2}>{preview?.title || 'Đang mở sách'}</Text>
      {!!preview?.author && <Text style={styles.author} numberOfLines={1}>{preview.author}</Text>}

      {error ? <View style={styles.errorCard}>
        <Ionicons name="alert-circle-outline" size={26} color={colors.error} />
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => setAttempt(value => value + 1)}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View> : <View style={styles.loadingBlock}>
        <View style={styles.progressTrack}><Animated.View style={[styles.progressFill, { width }]} /></View>
        <Text style={styles.message}>{stages[stage].message}</Text>
        <Text style={styles.hint}>Vui lòng giữ ứng dụng mở trong giây lát</Text>
      </View>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  back: { position: 'absolute', top: 48, left: 18, zIndex: 2, width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  coverFrame: { width: 170, height: 230, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center',
    justifyContent: 'center', padding: 10, elevation: 5, shadowColor: '#0F172A', shadowOpacity: 0.12,
    shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  cover: { width: '100%', height: '100%', borderRadius: 10 },
  title: { color: colors.text, fontSize: 20, lineHeight: 27, fontWeight: '800', textAlign: 'center', marginTop: 24 },
  author: { color: colors.muted, fontSize: 14, marginTop: 7 },
  loadingBlock: { width: '100%', maxWidth: 380, marginTop: 34, alignItems: 'center' },
  progressTrack: { width: '100%', height: 7, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  message: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 16 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 6 },
  errorCard: { width: '100%', maxWidth: 380, alignItems: 'center', marginTop: 28, padding: 18,
    borderRadius: 14, backgroundColor: '#FEF2F2' },
  error: { color: colors.error, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  retry: { height: 44, paddingHorizontal: 28, borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  retryText: { color: colors.surface, fontWeight: '800' },
});

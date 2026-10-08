import React, { useEffect, useRef } from 'react';
import { Animated, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

export function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 55, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 900, useNativeDriver: false }),
    ]).start();
  }, [opacity, progress, scale]);

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['8%', '100%'] });
  return <SafeAreaView style={styles.screen}>
    <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
    <Animated.View style={[styles.brand, { opacity, transform: [{ scale }] }]}>
      <View style={styles.logoBadge}>
        <Ionicons name="book" size={42} color={colors.surface} />
      </View>
      <Text style={styles.appName}>MEKOBOOK</Text>
      <Text style={styles.tagline}>Thư viện sách điện tử Mekosoft</Text>
    </Animated.View>
    <View style={styles.loading}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
      <Text style={styles.loadingText}>Đang chuẩn bị trải nghiệm đọc...</Text>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  brand: { alignItems: 'center', marginBottom: 90 },
  logoBadge: { width: 88, height: 88, borderRadius: 28, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary,
    shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  appName: { color: colors.primary, fontSize: 31, fontWeight: '900', letterSpacing: 2.5, marginTop: 20 },
  tagline: { color: colors.muted, fontSize: 14, marginTop: 7 },
  loading: { position: 'absolute', left: 44, right: 44, bottom: 60, alignItems: 'center' },
  progressTrack: { width: '100%', maxWidth: 320, height: 5, borderRadius: 3,
    backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  loadingText: { color: colors.muted, fontSize: 12, marginTop: 12 },
});

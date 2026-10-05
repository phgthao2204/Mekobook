import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập không thành công.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.logoBadge}>
          <Ionicons name="book" size={34} color="#FFFFFF" />
        </View>
        <Text style={styles.appName}>MEKOBOOK</Text>
        <Text style={styles.subtitle}>Đăng nhập để truy cập thư viện sách</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Tên đăng nhập hoặc email</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={19} color="#64748B" />
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              editable={!loading}
              placeholder="Nhập tên đăng nhập"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={19} color="#64748B" />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              textContentType="password"
              editable={!loading}
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#94A3B8"
              onSubmitEditing={submit}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((value) => !value)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  appName: { color: '#059669', fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 2 },
  subtitle: { color: '#64748B', fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 32 },
  form: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  label: { color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 4 },
  inputRow: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 11,
    marginBottom: 16,
  },
  input: { flex: 1, color: '#0F172A', fontSize: 14, marginHorizontal: 9 },
  error: { color: '#DC2626', fontSize: 12, lineHeight: 17, marginBottom: 14 },
  button: { height: 50, borderRadius: 11, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

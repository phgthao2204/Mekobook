import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { UserAccount } from '../../types';

interface AccountScreenProps {
  user: UserAccount;
  onBack: () => void;
  onLogout: () => Promise<void>;
  onRefreshProfile: () => Promise<UserAccount>;
}

function ProfileRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return <View style={styles.profileRow}>
    <View style={styles.rowIcon}><Ionicons name={icon} size={19} color={colors.primary} /></View>
    <View style={styles.rowContent}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  </View>;
}

export function AccountScreen({ user, onBack, onLogout, onRefreshProfile }: AccountScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const displayName = user.name || [user.givenName, user.familyName].filter(Boolean).join(' ') || 'Người đọc';
  const accountBriefs = user.accountBriefs || [];
  const refresh = async () => {
    setRefreshing(true);
    setRefreshError('');
    try {
      await onRefreshProfile();
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'Không thể tải lại hồ sơ.');
    } finally {
      setRefreshing(false);
    }
  };
  return <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityRole="button" accessibilityLabel="Quay lại thư viện">
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Thông tin tài khoản</Text>
      <View style={styles.headerSpacer} />
    </View>

    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Ionicons name="person" size={38} color={colors.primary} /></View>
        <Text style={styles.name}>{displayName}</Text>
        {user.emailAddress ? <Text style={styles.email}>{user.emailAddress}</Text> : null}
        <View style={[styles.statusBadge, user.profileUnavailable && styles.statusWarning]}>
          <View style={[styles.statusDot, user.profileUnavailable && styles.statusDotWarning]} />
          <Text style={[styles.statusText, user.profileUnavailable && styles.statusTextWarning]}>
            {user.profileUnavailable ? 'Hồ sơ API chưa khả dụng' : 'Tài khoản đang hoạt động'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
      <View style={styles.detailsCard}>
        <ProfileRow icon="person-outline" label="Tên hiển thị" value={displayName} />
        {user.givenName ? <ProfileRow icon="text-outline" label="Tên" value={user.givenName} /> : null}
        {user.familyName ? <ProfileRow icon="text-outline" label="Họ" value={user.familyName} /> : null}
        {user.emailAddress ? <ProfileRow icon="mail-outline" label="Email" value={user.emailAddress} /> : null}
        {user.id > 0 ? <ProfileRow icon="id-card-outline" label="Mã tài khoản" value={String(user.id)} /> : null}
      </View>

      {accountBriefs.length ? <>
        <Text style={styles.sectionTitle}>Tài khoản tổ chức</Text>
        <View style={styles.detailsCard}>
          {accountBriefs.map((account, index) => <ProfileRow
            key={`${account.id || 'account'}-${index}`}
            icon="business-outline"
            label={account.role || 'Tài khoản liên kết'}
            value={account.name || (account.id ? `Mã ${account.id}` : 'Tài khoản liên kết')}
          />)}
        </View>
      </> : null}

      {user.profileUnavailable ? <View style={styles.warningCard}>
        <Ionicons name="information-circle-outline" size={21} color="#B45309" />
        <View style={styles.warningContent}>
          <Text style={styles.warningTitle}>Chưa tải được hồ sơ đầy đủ</Text>
          <Text style={styles.warningText}>{refreshError || user.profileError || 'Máy chủ chưa cung cấp thông tin hồ sơ cho tài khoản này.'}</Text>
        </View>
      </View> : null}

      {user.profileUnavailable || refreshError ? <TouchableOpacity
        style={styles.refreshButton}
        onPress={refresh}
        disabled={refreshing}
        accessibilityRole="button"
      >
        {refreshing ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="refresh" size={19} color={colors.primary} />}
        <Text style={styles.refreshText}>{refreshing ? 'Đang tải hồ sơ...' : 'Tải lại hồ sơ'}</Text>
      </TouchableOpacity> : null}

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} accessibilityRole="button">
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  headerSpacer: { width: 42 },
  content: { padding: 18, paddingBottom: 36 },
  profileCard: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 22, alignItems: 'center' },
  avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  email: { color: colors.muted, fontSize: 13, marginTop: 5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16, backgroundColor: '#ECFDF5' },
  statusWarning: { backgroundColor: '#FFFBEB' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981', marginRight: 7 },
  statusDotWarning: { backgroundColor: '#F59E0B' },
  statusText: { color: '#065F46', fontSize: 11, fontWeight: '700' },
  statusTextWarning: { color: '#B45309' },
  sectionTitle: { color: '#334155', fontSize: 13, fontWeight: '800', marginTop: 22, marginBottom: 9 },
  detailsCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  profileRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowContent: { flex: 1 },
  rowLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', marginBottom: 3 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  warningCard: { flexDirection: 'row', backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#FDE68A' },
  warningContent: { flex: 1, marginLeft: 10 },
  warningTitle: { color: '#92400E', fontSize: 13, fontWeight: '800' },
  warningText: { color: '#B45309', fontSize: 12, lineHeight: 18, marginTop: 3 },
  refreshButton: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0', backgroundColor: '#ECFDF5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  refreshText: { color: '#065F46', fontSize: 14, fontWeight: '800', marginLeft: 8 },
  logoutButton: { height: 50, borderRadius: 12, backgroundColor: '#FEF2F2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: '800', marginLeft: 8 },
});

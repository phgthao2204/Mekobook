import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { UserPreference } from '../../types';

interface ReaderSettingsModalProps {
  visible: boolean;
  value: UserPreference;
  onClose: () => void;
  onApply: (value: UserPreference) => void;
}

type Choice<T extends string | number> = { label: string; value: T };

function ChoiceRow<T extends string | number>({
  choices, value, onChange,
}: {
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return <View style={styles.choices}>
    {choices.map(choice => <TouchableOpacity
      key={String(choice.value)}
      accessibilityRole="button"
      accessibilityState={{ selected: choice.value === value }}
      style={[styles.choice, choice.value === value && styles.choiceActive]}
      onPress={() => onChange(choice.value)}
    >
      <Text style={[styles.choiceText, choice.value === value && styles.choiceTextActive]}>{choice.label}</Text>
    </TouchableOpacity>)}
  </View>;
}

export function ReaderSettingsModal({ visible, value, onClose, onApply }: ReaderSettingsModalProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (visible) setDraft(value); }, [visible, value]);

  const update = <K extends keyof UserPreference>(key: K, next: UserPreference[K]) => {
    setDraft(current => ({ ...current, [key]: next }));
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Tùy chọn đọc</Text>
            <Text style={styles.subtitle}>Áp dụng ngay cho phiên đọc hiện tại</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng tùy chọn đọc" onPress={onClose} style={styles.close}>
            <Ionicons name="close" size={22} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Hiển thị trang</Text>
          <ChoiceRow choices={[{ label: 'Một trang', value: 0 }, { label: 'Hai trang', value: 1 }]}
            value={draft.dualPageMode ? 1 : 0} onChange={next => update('dualPageMode', next === 1)} />

          <Text style={styles.label}>Giao diện</Text>
          <ChoiceRow choices={[
            { label: 'Sáng', value: 'LIGHT' }, { label: 'Tối', value: 'DARK' },
            { label: 'Sepia', value: 'SEPIA' }, { label: 'Hệ thống', value: 'SYSTEM' },
          ] as Choice<UserPreference['themeMode']>[]}
            value={draft.themeMode} onChange={next => update('themeMode', next)} />

          <Text style={styles.label}>Độ sáng</Text>
          <ChoiceRow choices={[
            { label: '40%', value: 0.4 }, { label: '70%', value: 0.7 }, { label: '100%', value: 1 },
          ]} value={draft.brightness} onChange={next => update('brightness', next)} />

          <Text style={styles.label}>Hiệu ứng chuyển trang</Text>
          <ChoiceRow choices={[
            { label: 'Lật 3D', value: 'CURL_3D' }, { label: 'Trượt', value: 'SLIDE' }, { label: 'Mờ dần', value: 'FADE' },
          ] as Choice<UserPreference['pageTurnEffect']>[]}
            value={draft.pageTurnEffect} onChange={next => update('pageTurnEffect', next)} />

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.switchTitle}>Âm thanh lật trang</Text>
              <Text style={styles.switchHint}>Phát âm thanh ngắn khi chuyển trang</Text>
            </View>
            <Switch value={draft.pageTurnSoundEnabled}
              onValueChange={next => update('pageTurnSoundEnabled', next)}
              trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }} thumbColor={draft.pageTurnSoundEnabled ? colors.primary : '#F8FAFC'} />
          </View>

          <TouchableOpacity accessibilityRole="button" style={styles.apply} onPress={() => onApply(draft)}>
            <Text style={styles.applyText}>Áp dụng</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.42)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: { maxHeight: '88%', backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text, fontSize: 19, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 28 },
  label: { color: '#334155', fontSize: 13, fontWeight: '800', marginTop: 10, marginBottom: 9 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 40, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  choiceActive: { borderColor: colors.primary, backgroundColor: '#ECFDF5' },
  choiceText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  choiceTextActive: { color: colors.primary },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  switchCopy: { flex: 1, marginRight: 12 },
  switchTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  switchHint: { color: colors.muted, fontSize: 11, marginTop: 3 },
  apply: { height: 50, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  applyText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
});

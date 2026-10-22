import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme, useTheme, useThemedStyles } from '../theme';
import {
  addBookToShelf, createPersonalShelf, deletePersonalShelf, deleteShelfItem,
  getShelfItemsByBook, getShelfItemsByShelf, getPersonalShelves, updatePersonalShelf,
} from '../services/api';
import { errorMessage, getMediaRequestHeaders } from '../services/http';
import { Book, PersonalShelf, ShelfItem } from '../types';

const SHELF_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444'];
const SHELF_COLOR_NAMES: Record<string, string> = {
  '#3B82F6': 'Xanh dương', '#10B981': 'Xanh lá', '#F59E0B': 'Vàng',
  '#EC4899': 'Hồng', '#8B5CF6': 'Tím', '#EF4444': 'Đỏ',
};

interface PersonalShelfModalProps {
  visible: boolean;
  bookId?: number;
  books?: Book[];
  onSelectBook?: (book: Book) => void;
  onClose: () => void;
}

export function PersonalShelfModal({ visible, bookId, books = [], onSelectBook, onClose }: PersonalShelfModalProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [shelves, setShelves] = useState<PersonalShelf[]>([]);
  const [memberships, setMemberships] = useState<Map<number, ShelfItem>>(new Map());
  const [selectedShelf, setSelectedShelf] = useState<PersonalShelf | null>(null);
  const [shelfItems, setShelfItems] = useState<ShelfItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [undoRemoval, setUndoRemoval] = useState<{ shelfId: number; bookId: number } | null>(null);
  const [editing, setEditing] = useState<PersonalShelf | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [colorTag, setColorTag] = useState(SHELF_COLORS[0]);
  const booksById = useMemo(() => new Map(books.map(book => [book.id, book])), [books]);

  const resetView = () => {
    setSelectedShelf(null); setShelfItems([]); setEditing(null); setShowForm(false);
    setName(''); setColorTag(SHELF_COLORS[0]); setError(''); setFeedback(''); setUndoRemoval(null);
  };
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [nextShelves, items] = await Promise.all([
        getPersonalShelves(), bookId ? getShelfItemsByBook(bookId) : Promise.resolve([]),
      ]);
      setShelves(nextShelves);
      setMemberships(new Map(items.map(item => [item.shelfId, item])));
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setLoading(false); }
  }, [bookId]);

  useEffect(() => {
    if (visible) { resetView(); void load(); }
  }, [visible, load]);

  const beginCreate = () => {
    setEditing(null); setName(''); setColorTag(SHELF_COLORS[0]); setError(''); setFeedback(''); setShowForm(true);
  };
  const beginEdit = (shelf: PersonalShelf) => {
    setEditing(shelf); setName(shelf.shelfName); setColorTag(shelf.colorTag || SHELF_COLORS[0]); setError(''); setFeedback(''); setShowForm(true);
  };
  const save = async () => {
    const shelfName = name.trim();
    if (!shelfName) { setError('Vui lòng nhập tên tủ sách.'); return; }
    setSavingId(editing?.id || -1); setError('');
    try {
      if (editing) {
        const updated = await updatePersonalShelf(editing.id, { shelfName, colorTag });
        setShelves(current => current.map(item => item.id === updated.id ? updated : item));
        setSelectedShelf(current => current?.id === updated.id ? updated : current);
      } else {
        const created = await createPersonalShelf({ shelfName, colorTag, displayOrder: shelves.length + 1 });
        setShelves(current => [...current, created].sort((a, b) => a.displayOrder - b.displayOrder));
      }
      setEditing(null); setShowForm(false); setName('');
      setFeedback(editing ? 'Đã cập nhật tủ sách.' : 'Đã tạo tủ sách mới.');
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setSavingId(null); }
  };
  const toggleShelf = async (shelf: PersonalShelf) => {
    if (!bookId || savingId !== null) return;
    setSavingId(shelf.id); setError(''); setFeedback(''); setUndoRemoval(null);
    try {
      const existing = memberships.get(shelf.id);
      if (existing) {
        await deleteShelfItem(existing.id);
        setMemberships(current => { const next = new Map(current); next.delete(shelf.id); return next; });
        setUndoRemoval({ shelfId: shelf.id, bookId });
        setFeedback(`Đã gỡ sách khỏi “${shelf.shelfName}”.`);
      } else {
        const created = await addBookToShelf(shelf.id, bookId);
        setMemberships(current => new Map(current).set(shelf.id, created));
        setFeedback(`Đã thêm sách vào “${shelf.shelfName}”.`);
      }
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setSavingId(null); }
  };
  const openShelf = async (shelf: PersonalShelf) => {
    setSelectedShelf(shelf); setLoading(true); setError(''); setFeedback('');
    try { setShelfItems(await getShelfItemsByShelf(shelf.id)); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setLoading(false); }
  };
  const removeItem = async (item: ShelfItem) => {
    if (!selectedShelf) return;
    setSavingId(item.id); setError(''); setFeedback(''); setUndoRemoval(null);
    try {
      await deleteShelfItem(item.id);
      setShelfItems(current => current.filter(value => value.id !== item.id));
      setUndoRemoval({ shelfId: selectedShelf.id, bookId: item.bookId });
      setFeedback('Đã gỡ sách khỏi tủ.');
    }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setSavingId(null); }
  };
  const undoRemoveItem = async () => {
    if (!undoRemoval || savingId !== null) return;
    setSavingId(-2); setError('');
    try {
      const restored = await addBookToShelf(undoRemoval.shelfId, undoRemoval.bookId);
      setMemberships(current => new Map(current).set(undoRemoval.shelfId, restored));
      if (selectedShelf?.id === undoRemoval.shelfId) setShelfItems(current => [restored, ...current]);
      setFeedback('Đã khôi phục sách vào tủ.');
      setUndoRemoval(null);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setSavingId(null); }
  };
  const confirmDeleteShelf = (shelf: PersonalShelf) => Alert.alert(
    'Xóa tủ sách?', `Tủ sách “${shelf.shelfName}” sẽ bị xóa. Sách vẫn còn trong thư viện.`,
    [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => {
      setSavingId(shelf.id); setError('');
      try {
        await deletePersonalShelf(shelf.id);
        setShelves(current => current.filter(item => item.id !== shelf.id));
        setSelectedShelf(null); setShelfItems([]);
        setFeedback('Đã xóa tủ sách.');
      } catch (reason) { setError(errorMessage(reason)); }
      finally { setSavingId(null); }
    } }],
  );
  const openBook = (item: ShelfItem) => {
    const selected = booksById.get(item.bookId);
    if (!selected || !onSelectBook) return;
    onClose(); onSelectBook(selected);
  };

  const title = selectedShelf ? selectedShelf.shelfName : bookId ? 'Thêm vào tủ sách' : 'Tủ sách cá nhân';
  const subtitle = selectedShelf ? `${shelfItems.length} cuốn sách` : bookId
    ? 'Có thể chọn một hoặc nhiều tủ sách' : 'Tạo và sắp xếp sách theo cách của bạn';
  const Loading = () => <View style={styles.state}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.stateText}>Đang tải dữ liệu...</Text></View>;
  const Empty = ({ icon, title: emptyTitle, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) => <View style={styles.empty}><Ionicons name={icon} size={42} color={theme.colors.textMuted} /><Text style={styles.emptyTitle}>{emptyTitle}</Text><Text style={styles.emptyText}>{text}</Text></View>;

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.dismissArea} onPress={onClose} accessibilityLabel="Đóng" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          {selectedShelf ? <TouchableOpacity style={styles.roundButton} onPress={() => setSelectedShelf(null)} accessibilityLabel="Quay lại">
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </TouchableOpacity> : null}
          <View style={styles.heading}><Text style={styles.title} numberOfLines={1}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>
          <TouchableOpacity style={styles.roundButton} onPress={onClose} accessibilityLabel="Đóng tủ sách cá nhân"><Ionicons name="close" size={22} color={theme.colors.text} /></TouchableOpacity>
        </View>
        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
        {feedback ? <View style={styles.feedbackBox} accessibilityRole="alert"><Ionicons name="checkmark-circle" size={17} color={theme.colors.primary} /><Text style={styles.feedbackText}>{feedback}</Text>
          {undoRemoval ? <TouchableOpacity style={styles.undoRemovalButton} disabled={savingId !== null} onPress={undoRemoveItem} accessibilityRole="button">
            {savingId === -2 ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.undoRemovalText}>Hoàn tác</Text>}
          </TouchableOpacity> : null}
        </View> : null}

        {showForm ? <View style={styles.form}>
          <Text style={styles.formTitle}>{editing ? 'Chỉnh sửa tủ sách' : 'Tạo tủ sách mới'}</Text>
          <TextInput value={name} onChangeText={setName} maxLength={80} autoFocus placeholder="Tên tủ sách" placeholderTextColor={theme.colors.disabled} style={styles.input} />
          <Text style={styles.colorLabel}>Màu nhãn</Text>
          <View style={styles.colors}>{SHELF_COLORS.map(value => <TouchableOpacity key={value} onPress={() => setColorTag(value)} accessibilityLabel={`Chọn màu ${SHELF_COLOR_NAMES[value]}`} accessibilityState={{ selected: colorTag === value }} style={[styles.colorButton, { backgroundColor: value }, colorTag === value && styles.colorSelected]}>{colorTag === value ? <Ionicons name="checkmark" size={17} color="#FFFFFF" /> : null}</TouchableOpacity>)}</View>
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelButton} disabled={savingId !== null} onPress={() => setShowForm(false)}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, savingId !== null && styles.disabled]} disabled={savingId !== null} onPress={save}>{savingId !== null ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveText}>{editing ? 'Lưu thay đổi' : 'Tạo tủ'}</Text>}</TouchableOpacity>
          </View>
        </View> : selectedShelf ? <>
          <View style={styles.detailActions}>
            <TouchableOpacity style={styles.secondaryAction} onPress={() => beginEdit(selectedShelf)}><Ionicons name="create-outline" size={18} color={theme.colors.primary} /><Text style={styles.secondaryText}>Đổi tên / màu</Text></TouchableOpacity>
            <TouchableOpacity style={styles.deleteAction} disabled={savingId !== null} onPress={() => confirmDeleteShelf(selectedShelf)}><Ionicons name="trash-outline" size={18} color={theme.colors.error} /><Text style={styles.deleteText}>Xóa tủ</Text></TouchableOpacity>
          </View>
          {loading ? <Loading /> : <ScrollView style={styles.list} contentContainerStyle={shelfItems.length ? styles.listContent : styles.emptyContent}>
            {shelfItems.length ? shelfItems.map(item => {
              const listedBook = booksById.get(item.bookId);
              return <View key={item.id} style={styles.bookRow}>
                <TouchableOpacity style={styles.bookMain} disabled={!listedBook || !onSelectBook}
                  onPress={() => openBook(item)} accessibilityRole="button"
                  accessibilityLabel={`Mở ${listedBook?.title || `sách ${item.bookId}`}`}>
                  {listedBook?.coverUrl ? <Image source={{ uri: listedBook.coverUrl, headers: getMediaRequestHeaders(listedBook.coverUrl) }} style={styles.cover} /> : <View style={styles.coverPlaceholder}><Ionicons name="book-outline" size={22} color={theme.colors.textMuted} /></View>}
                  <View style={styles.shelfInfo}><Text style={styles.shelfName} numberOfLines={2}>{listedBook?.title || `Sách #${item.bookId}`}</Text><Text style={styles.shelfMeta} numberOfLines={1}>{listedBook?.author || 'Sách trong tủ sách cá nhân'}</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeButton} disabled={savingId !== null} onPress={() => removeItem(item)}
                  accessibilityRole="button" accessibilityLabel={`Gỡ ${listedBook?.title || 'sách'} khỏi tủ`}>
                  {savingId === item.id ? <ActivityIndicator size="small" color={theme.colors.error} /> : <Ionicons name="close-circle-outline" size={22} color={theme.colors.error} />}
                </TouchableOpacity>
              </View>;
            }) : <Empty icon="book-outline" title="Tủ sách đang trống" text="Thêm sách từ màn hình thông tin sách." />}
          </ScrollView>}
        </> : <>
          <TouchableOpacity style={styles.createButton} onPress={beginCreate} disabled={loading || savingId !== null}><Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} /><Text style={styles.createText}>Tạo tủ sách mới</Text></TouchableOpacity>
          {loading ? <Loading /> : <ScrollView style={styles.list} contentContainerStyle={shelves.length ? styles.listContent : styles.emptyContent}>
            {shelves.length ? shelves.map(shelf => {
              const selected = memberships.has(shelf.id);
              return <TouchableOpacity key={shelf.id} style={styles.shelfRow} disabled={savingId !== null} onPress={() => bookId ? toggleShelf(shelf) : openShelf(shelf)}>
                <View style={[styles.shelfIcon, { backgroundColor: shelf.colorTag || theme.colors.primary }]}><Ionicons name="albums-outline" size={20} color="#FFFFFF" /></View>
                <View style={styles.shelfInfo}><Text style={styles.shelfName} numberOfLines={1}>{shelf.shelfName}</Text><Text style={styles.shelfMeta}>{bookId ? (selected ? 'Đã có trong tủ sách' : 'Chạm để thêm vào tủ') : 'Xem sách trong tủ'}</Text></View>
                {savingId === shelf.id ? <ActivityIndicator size="small" color={theme.colors.primary} /> : bookId
                  ? <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={24} color={selected ? theme.colors.primary : theme.colors.textMuted} />
                  : <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />}
              </TouchableOpacity>;
            }) : <Empty icon="albums-outline" title="Chưa có tủ sách cá nhân" text="Tạo tủ đầu tiên để sắp xếp sách của bạn." />}
          </ScrollView>}
          {bookId ? <TouchableOpacity style={styles.doneButton} onPress={onClose}><Text style={styles.saveText}>Hoàn tất</Text></TouchableOpacity> : null}
          {error && !loading ? <TouchableOpacity style={styles.retry} onPress={load}><Text style={styles.retryText}>Thử lại</Text></TouchableOpacity> : null}
        </>}
      </View>
    </View>
  </Modal>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' }, dismissArea: { flex: 1 },
  sheet: { height: '86%', maxHeight: 680, backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingBottom: 24 },
  handle: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: theme.colors.borderStrong, marginTop: 9, marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 }, heading: { flex: 1 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '900' }, subtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 },
  roundButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: theme.colors.surfaceMuted },
  errorBox: { backgroundColor: theme.colors.errorSoft, borderWidth: 1, borderColor: theme.colors.error, borderRadius: 10, padding: 10, marginBottom: 10 }, errorText: { color: theme.colors.error, fontSize: 12, lineHeight: 17 },
  feedbackBox: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.colors.successSoft, borderRadius: 10, paddingHorizontal: 10, marginBottom: 10 }, feedbackText: { flex: 1, color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  undoRemovalButton: { minWidth: 64, minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, undoRemovalText: { color: theme.colors.primary, fontSize: 12, fontWeight: '900', textDecorationLine: 'underline' },
  createButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft, marginBottom: 10 }, createText: { color: theme.colors.primary, fontSize: 14, fontWeight: '800' },
  list: { flexGrow: 0 }, listContent: { paddingBottom: 8 }, emptyContent: { minHeight: 220, justifyContent: 'center' },
  shelfRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  shelfIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, shelfInfo: { flex: 1, paddingHorizontal: 12 },
  shelfName: { color: theme.colors.text, fontSize: 14, fontWeight: '800' }, shelfMeta: { color: theme.colors.textMuted, fontSize: 11, marginTop: 3 },
  bookRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  bookMain: { flex: 1, minHeight: 78, flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  cover: { width: 46, height: 62, borderRadius: 6, backgroundColor: theme.colors.border }, coverPlaceholder: { width: 46, height: 62, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceMuted }, removeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  detailActions: { flexDirection: 'row', gap: 10, marginBottom: 8 }, secondaryAction: { flex: 1, height: 42, borderRadius: 10, backgroundColor: theme.colors.primarySoft, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' }, deleteAction: { flex: 0.8, height: 42, borderRadius: 10, backgroundColor: theme.colors.errorSoft, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }, deleteText: { color: theme.colors.error, fontSize: 12, fontWeight: '800' },
  state: { minHeight: 220, alignItems: 'center', justifyContent: 'center' }, stateText: { color: theme.colors.textMuted, fontSize: 12, marginTop: 9 },
  empty: { alignItems: 'center', padding: 24 }, emptyTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800', marginTop: 10 }, emptyText: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 5 },
  retry: { alignSelf: 'center', padding: 10 }, retryText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  doneButton: { height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: theme.colors.primary, marginTop: 10 },
  form: { borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted, padding: 15 }, formTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  input: { height: 48, borderRadius: 11, borderWidth: 1, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surface, paddingHorizontal: 13, color: theme.colors.text, fontSize: 14 }, colorLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 8 }, colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, colorSelected: { borderWidth: 3, borderColor: '#FFFFFF', elevation: 3 }, formActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelButton: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }, cancelText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '800' },
  saveButton: { flex: 1.3, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: theme.colors.primary }, saveText: { color: theme.colors.textInverse, fontSize: 13, fontWeight: '800' }, disabled: { opacity: 0.55 },
});

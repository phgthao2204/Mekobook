import { BookAccess, PreparedReader } from '../types';
import { clampPage, hasReadAccess, latestProgress, normalizePreferences } from '../utils/reader';
import { getBookById, getDrmLicenses, getReadingProgresses, getUserPreferences } from './api';
export async function getBookAccess(bookId: number): Promise<BookAccess> {
  const [book, licenses, progress] = await Promise.all([
    getBookById(bookId), getDrmLicenses(bookId), getReadingProgresses(100, bookId),
  ]);
  return { book: { ...book, readingProgress: latestProgress(progress) }, licenses,
    canRead: hasReadAccess(book.isFree, licenses) };
}
export async function prepareReader(bookId: number, mode: 'start' | 'continue'): Promise<PreparedReader> {
  const [access, preferences] = await Promise.all([getBookAccess(bookId), getUserPreferences()]);
  if (!access.canRead) throw new Error('Sách chưa có giấy phép còn hiệu lực cho tài khoản này.');
  if (!access.book.flipbookBaseUrl) throw new Error('Sách chưa có đường dẫn nội dung Flipbook.');
  return { book: access.book,
    initialPage: clampPage(mode === 'continue' ? access.book.readingProgress?.currentPage || 1 : 1, access.book.totalPages),
    preferences: normalizePreferences(preferences[0]) };
}

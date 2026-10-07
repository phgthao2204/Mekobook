import { BookAccess, PreparedReader } from '../types';
import { clampPage, hasReadAccess, latestProgress, normalizePreferences } from '../utils/reader';
import { getBookById, getDrmLicenses, getReadingProgresses, getUserPreferences } from './api';
export async function getBookAccess(bookId: number): Promise<BookAccess> {
  const [bookResult, licenseResult, progressResult] = await Promise.allSettled([
    getBookById(bookId), getDrmLicenses(bookId), getReadingProgresses(100, bookId),
  ]);
  if (bookResult.status === 'rejected') throw bookResult.reason;
  const book = bookResult.value;
  const licenses = licenseResult.status === 'fulfilled' ? licenseResult.value : [];
  const progressUnavailable = progressResult.status === 'rejected';
  return { book: { ...book, progressUnavailable,
    readingProgress: progressResult.status === 'fulfilled' ? latestProgress(progressResult.value) : undefined },
    licenses, progressUnavailable, licensesUnavailable: licenseResult.status === 'rejected',
    canRead: hasReadAccess(book.isFree, licenses) };
}
export async function prepareReader(bookId: number, mode: 'start' | 'continue'): Promise<PreparedReader> {
  const [access, preferences] = await Promise.all([getBookAccess(bookId), getUserPreferences()]);
  if (!access.canRead) throw new Error('Sách chưa có giấy phép còn hiệu lực cho tài khoản này.');
  if (mode === 'continue' && access.progressUnavailable) throw new Error('Chưa lấy được tiến trình đọc. Vui lòng thử lại hoặc chọn đọc từ đầu.');
  if (!access.book.flipbookBaseUrl) throw new Error('Sách chưa có đường dẫn nội dung Flipbook.');
  return { book: access.book,
    initialPage: clampPage(mode === 'continue' ? access.book.readingProgress?.currentPage || 1 : 1, access.book.totalPages),
    preferences: normalizePreferences(preferences[0]) };
}

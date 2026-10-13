import { BookAccess, PreparedReader } from '../types';
import { clampPage, hasReadAccess, latestProgress, mergeReadingProgress, normalizePreferences } from '../utils/reader';
import { getBookById, getDrmLicenses, getReadingProgresses, getUserPreferences } from './api';
import { getLocalReadingProgress } from './localReadingProgress';
export async function getBookAccess(bookId: number, userId?: number, includeProgress = true): Promise<BookAccess> {
  const [bookResult, licenseResult, progressResult, localProgressResult] = await Promise.allSettled([
    getBookById(bookId), getDrmLicenses(bookId),
    includeProgress ? getReadingProgresses(100, bookId) : Promise.resolve([]),
    includeProgress && userId ? getLocalReadingProgress(userId, bookId) : Promise.resolve(undefined),
  ]);
  if (bookResult.status === 'rejected') throw bookResult.reason;
  const book = bookResult.value;
  const licenses = licenseResult.status === 'fulfilled' ? licenseResult.value : [];
  const serverProgress = progressResult.status === 'fulfilled' ? latestProgress(progressResult.value) : undefined;
  const localProgress = localProgressResult.status === 'fulfilled' ? localProgressResult.value : undefined;
  const readingProgress = mergeReadingProgress(serverProgress, localProgress);
  const progressUnavailable = includeProgress && progressResult.status === 'rejected' && !readingProgress;
  return { book: { ...book, progressUnavailable,
    readingProgress },
    licenses, progressUnavailable, licensesUnavailable: licenseResult.status === 'rejected',
    canRead: hasReadAccess(book.isFree, licenses) };
}
export async function prepareReader(bookId: number, mode: 'start' | 'continue', userId?: number): Promise<PreparedReader> {
  const [access, preferences] = await Promise.all([
    getBookAccess(bookId, userId, mode === 'continue'), getUserPreferences(),
  ]);
  if (!access.canRead) throw new Error('Sách chưa có giấy phép còn hiệu lực cho tài khoản này.');
  if (mode === 'continue' && access.progressUnavailable) throw new Error('Chưa lấy được tiến trình đọc. Vui lòng thử lại hoặc chọn đọc từ đầu.');
  if (!access.book.flipbookBaseUrl) throw new Error('Sách chưa có đường dẫn nội dung Flipbook.');
  return { book: access.book,
    initialPage: clampPage(mode === 'continue' ? access.book.readingProgress?.currentPage || 1 : 1, access.book.totalPages),
    preferences: normalizePreferences(preferences[0]) };
}

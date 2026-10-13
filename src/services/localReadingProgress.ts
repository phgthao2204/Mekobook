import { ReadingProgress } from '../types';

const keyFor = (userId: number, bookId: number) => `mekobook.reading.progress.${userId}.${bookId}`;
const writes = new Map<string, Promise<void>>();

export async function getLocalReadingProgress(userId: number, bookId: number): Promise<ReadingProgress | undefined> {
  const { getReadingProgressValue } = await import('./readingProgressStorage');
  const value = await getReadingProgressValue(keyFor(userId, bookId));
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as ReadingProgress;
    if (parsed.bookId !== bookId || !Number.isInteger(parsed.currentPage) || parsed.currentPage < 1
      || !Number.isFinite(parsed.percentage)) return undefined;
    return parsed;
  } catch { return undefined; }
}

export function saveLocalReadingProgress(userId: number, bookId: number, page: number, totalPages: number): Promise<void> {
  const key = keyFor(userId, bookId);
  const currentPage = Math.max(1, Math.min(totalPages, Math.floor(page)));
  const progress: ReadingProgress = {
    bookId,
    currentPage,
    totalPages,
    percentage: totalPages <= 1 ? 100 : Math.round(((currentPage - 1) / (totalPages - 1)) * 10000) / 100,
    readStatus: currentPage >= totalPages ? 'COMPLETED' : currentPage > 1 ? 'READING' : 'NOT_STARTED',
    lastReadTimestamp: Date.now(),
  };
  const previous = writes.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    const { setReadingProgressValue } = await import('./readingProgressStorage');
    await setReadingProgressValue(key, JSON.stringify(progress));
  });
  writes.set(key, next);
  return next.finally(() => { if (writes.get(key) === next) writes.delete(key); });
}

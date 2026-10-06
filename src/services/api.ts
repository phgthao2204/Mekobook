import { ENV, getApiUrl } from '../constants/env';
import { Book, ChapterTOC, DrmLicense, LiferayItemResponse, ReadingProgress, UserPreference } from '../types';
import { apiHttp } from './http';
import { webDevMediaUrl } from '../utils/media';
export { setApiAccessToken, getMediaRequestHeaders } from './http';

export function normalizeServerUrl(url?: string): string {
  if (!url) return '';
  const base = ENV.API_BASE_URL.replace(/\/$/, '');
  // These are aliases of the same Liferay host in the supplied deployment docs,
  // not arbitrary private hosts. Keep unrelated content origins unchanged.
  const value = url.replace(/^https?:\/\/(?:(localhost|127\.0\.0\.1)(:8080)?|192\.168\.1\.254:8080)(?=\/|$)/i, base);
  const resolved = new URL(value, `${base}/`);
  if (!['http:', 'https:'].includes(resolved.protocol)) throw new Error('Đường dẫn nội dung sách không hợp lệ.');
  return webDevMediaUrl(resolved.toString());
}
function normalizeBook(book: Book): Book {
  if (!Number.isInteger(book.id) || !book.title || !Number.isInteger(book.totalPages) || book.totalPages < 1) {
    throw new Error('API trả dữ liệu sách không hợp lệ.');
  }
  return { ...book, author: book.author || '', coverUrl: normalizeServerUrl(book.coverUrl),
    documentUrl: normalizeServerUrl(book.documentUrl), flipbookBaseUrl: normalizeServerUrl(book.flipbookBaseUrl) };
}
async function getItems<T>(path: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const { data } = await apiHttp.get<LiferayItemResponse<T>>(getApiUrl(path), {
      params: { ...params, page, pageSize: 100 },
    });
    if (!Array.isArray(data.items)) throw new Error('API không trả danh sách hợp lệ.');
    items.push(...data.items);
    lastPage = Number(data.lastPage) || 1;
    if (lastPage > 1000) throw new Error('Số trang dữ liệu API vượt giới hạn.');
    page++;
  } while (page <= lastPage);
  return items;
}
export async function getBooks(_pageSize = 100): Promise<Book[]> {
  return (await getItems<Book>(ENV.API_PATHS.BOOKS, { sort: 'dateCreated:desc' })).map(normalizeBook);
}
export async function getBookById(id: number): Promise<Book> {
  return normalizeBook((await apiHttp.get<Book>(getApiUrl(`${ENV.API_PATHS.BOOKS}/${id}`))).data);
}
export function getBookTOC(bookId: number): Promise<ChapterTOC[]> {
  return getItems(ENV.API_PATHS.CHAPTER_TOCS, { filter: `bookId eq ${bookId}`, sort: 'displayOrder:asc' });
}
export function getReadingProgresses(_pageSize = 100, bookId?: number): Promise<ReadingProgress[]> {
  return getItems(ENV.API_PATHS.READING_PROGRESSES, bookId ? { filter: `bookId eq ${bookId}` } : {});
}
export function normalizeDrmLicense(license: DrmLicense): DrmLicense {
  const status: unknown = license.status;
  const workflow = status && typeof status === 'object'
    ? status as { label?: unknown } : undefined;
  return {
    ...license,
    // A published/approved Liferay object is not proof of an active license.
    status: typeof status === 'string' ? status : 'UNKNOWN',
    workflowStatus: typeof workflow?.label === 'string' ? workflow.label : undefined,
  };
}
export async function getDrmLicenses(bookId: number): Promise<DrmLicense[]> {
  return (await getItems<DrmLicense>(ENV.API_PATHS.DRM_LICENSES, { filter: `bookId eq ${bookId}` })).map(normalizeDrmLicense);
}
export function getUserPreferences(): Promise<UserPreference[]> {
  return getItems(ENV.API_PATHS.USER_PREFERENCES);
}
export function getPageImageUrl(book: Book, pageNumber: number): string {
  const pattern = book.screenPattern || 'mobile/{page}.jpg';
  return normalizeServerUrl(`${book.flipbookBaseUrl.replace(/\/$/, '')}/${pattern.replace('{page}', String(pageNumber))}`);
}
export function getThumbnailUrl(book: Book, pageNumber: number): string {
  const pattern = book.thumbPattern || 'thumb/{page}.jpg';
  return normalizeServerUrl(`${book.flipbookBaseUrl.replace(/\/$/, '')}/${pattern.replace('{page}', String(pageNumber))}`);
}

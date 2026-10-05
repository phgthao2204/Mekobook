/**
 * Mekobook Mobile - Liferay Headless REST API Client
 * Uses hardcoded Basic Auth (phuongthao:admin) as requested for fast staging/dev
 */

import { ENV } from '../config/env';
import { Book, ChapterTOC, LiferayItemResponse, ReadingProgress } from '../types';

const defaultHeaders = {
  'Authorization': ENV.AUTH.BASIC_AUTH_HEADER,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

/**
 * Fetch catalog of books from Liferay Objects /o/c/books
 */
export async function getBooks(pageSize: number = 20): Promise<Book[]> {
  try {
    const url = `${ENV.API_BASE_URL}/o/c/books?pageSize=${pageSize}&sort=dateCreated:desc`;
    const response = await fetch(url, {
      method: 'GET',
      headers: defaultHeaders,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: LiferayItemResponse<Book> = await response.json();
    return data.items || [];
  } catch (error) {
    console.warn('[API] Could not fetch books from Staging, falling back to local seed:', error);
    return getFallbackBooks();
  }
}

/**
 * Fetch a single book by ID
 */
export async function getBookById(id: number): Promise<Book | null> {
  try {
    const url = `${ENV.API_BASE_URL}/o/c/books/${id}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: defaultHeaders,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[API] Error fetching book ${id}:`, error);
    const fallback = getFallbackBooks().find(b => b.id === id);
    return fallback || null;
  }
}

/**
 * Fetch Table of Contents for a book
 */
export async function getBookTOC(bookId: number): Promise<ChapterTOC[]> {
  try {
    const url = `${ENV.API_BASE_URL}/o/c/chaptertocs?filter=bookId%20eq%20${bookId}&sort=displayOrder:asc&pageSize=100`;
    const response = await fetch(url, {
      method: 'GET',
      headers: defaultHeaders,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: LiferayItemResponse<ChapterTOC> = await response.json();
    return data.items || [];
  } catch (error) {
    console.warn(`[API] Error fetching TOC for book ${bookId}:`, error);
    return generateFallbackTOC(bookId);
  }
}

/**
 * Save user reading progress to Liferay
 */
export async function saveReadingProgress(
  bookId: number,
  currentPage: number,
  totalPages: number
): Promise<void> {
  try {
    const percentage = Math.round((currentPage / (totalPages || 1)) * 100);
    const readStatus = percentage >= 100 ? 'COMPLETED' : currentPage > 1 ? 'READING' : 'NOT_STARTED';

    const payload = {
      bookId,
      currentPage,
      totalPages,
      percentage,
      readStatus,
      lastReadTimestamp: Date.now(),
    };

    await fetch(`${ENV.API_BASE_URL}/o/c/readingprogresses`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[API] Could not sync reading progress to server:', err);
  }
}

/**
 * Helper to construct the full page image URL from book patterns
 */
export function getPageImageUrl(book: Book, pageNumber: number): string {
  if (!book.flipbookBaseUrl) return '';
  const pattern = book.screenPattern || 'mobile/{page}.jpg';
  const pagePath = pattern.replace('{page}', String(pageNumber));
  const baseUrl = book.flipbookBaseUrl.endsWith('/') ? book.flipbookBaseUrl : `${book.flipbookBaseUrl}/`;
  return `${baseUrl}${pagePath}?v=20261005_v4`;
}

/**
 * Helper to construct thumbnail URL
 */
export function getThumbnailUrl(book: Book, pageNumber: number): string {
  if (!book.flipbookBaseUrl) return '';
  const pattern = book.thumbPattern || 'thumb/{page}.jpg';
  const pagePath = pattern.replace('{page}', String(pageNumber));
  const baseUrl = book.flipbookBaseUrl.endsWith('/') ? book.flipbookBaseUrl : `${book.flipbookBaseUrl}/`;
  return `${baseUrl}${pagePath}?v=20261005_v4`;
}

/**
 * Local fallback data in case Liferay LAN network is temporarily unreachable
 */
function getFallbackBooks(): Book[] {
  return [
    {
      id: 32884,
      title: 'Lập Trình Di Động React Native & Shader 3D',
      author: 'Ban Công Nghệ Mekosoft',
      publisher: 'Công Ty Cổ Phần Mekosoft',
      language: 'vi',
      description: 'Giáo trình kỹ thuật chuyên sâu về React Native, Reanimated và Shader lật trang 3D Flipbook tối ưu 60 FPS cho hệ thống Mekobook.',
      coverUrl: 'http://192.168.1.254:8080/flipbooks/covers/lap-trinh-di-dong-react-native-3d.jpg',
      flipbookBaseUrl: 'http://192.168.1.254:8080/flipbooks/lap-trinh-di-dong-react-native-3d/files/',
      screenPattern: 'mobile/{page}.jpg',
      thumbPattern: 'thumb/{page}.jpg',
      totalPages: 65,
      samplePagesLimit: 15,
      isFree: true,
      defaultSpread: 'auto',
    },
    {
      id: 32909,
      title: 'Kiến Trúc Microservices & Liferay Headless CMS',
      author: 'Kỹ Sư Giải Pháp Mekosoft',
      publisher: 'Công Ty Cổ Phần Mekosoft',
      language: 'vi',
      description: 'Cẩm nang thiết kế và tích hợp Liferay 7.4 CE Objects, REST APIs, OAuth 2.0 PKCE và phân quyền RBAC cho doanh nghiệp.',
      coverUrl: 'http://192.168.1.254:8080/flipbooks/covers/kien-truc-liferay-headless-cms.jpg',
      flipbookBaseUrl: 'http://192.168.1.254:8080/flipbooks/kien-truc-liferay-headless-cms/files/',
      screenPattern: 'mobile/{page}.jpg',
      thumbPattern: 'thumb/{page}.jpg',
      totalPages: 80,
      samplePagesLimit: 15,
      isFree: false,
      defaultSpread: 'auto',
    }
  ];
}

function generateFallbackTOC(bookId: number): ChapterTOC[] {
  if (bookId === 33359) {
    return [
      { id: 1, bookId, title: 'Bìa Sách & Lời Ngỏ Ban Giám Đốc', startPage: 1, level: 1, displayOrder: 1 },
      { id: 2, bookId, title: 'Mục Lục Tổng Quan & Hướng Dẫn Đọc', startPage: 3, level: 1, displayOrder: 2 },
      { id: 3, bookId, title: 'PHẦN I: SỨ MỆNH, TẦM NHÌN & GIÁ TRỊ CỐT LÕI', startPage: 4, level: 1, displayOrder: 3 },
      { id: 4, bookId, title: '1.1. Lịch sử hình thành & Tầm nhìn MekoEcosystem 2030', startPage: 4, level: 2, displayOrder: 4 },
      { id: 5, bookId, title: '1.2. Hệ giá trị 4T: Tận tâm - Trí tuệ - Tốc độ - Trách nhiệm', startPage: 6, level: 2, displayOrder: 5 },
      { id: 6, bookId, title: '1.3. Triết lý phát triển bền vững & Phụng sự cộng đồng', startPage: 8, level: 2, displayOrder: 6 },
      { id: 7, bookId, title: 'PHẦN II: CHUẨN MỰC TÁC PHONG & GIAO TIẾP CÔNG SỞ', startPage: 10, level: 1, displayOrder: 7 },
      { id: 8, bookId, title: '2.1. Quy tắc diện mạo, trang phục & không gian làm việc', startPage: 10, level: 2, displayOrder: 8 },
      { id: 9, bookId, title: '2.2. Văn hóa ứng xử, chào hỏi & lắng nghe tích cực', startPage: 12, level: 2, displayOrder: 9 },
      { id: 10, bookId, title: '2.3. Quy chuẩn giao tiếp số: Email, Slack & Họp trực tuyến', startPage: 14, level: 2, displayOrder: 10 },
      { id: 11, bookId, title: '2.4. Kỹ năng phối hợp liên phòng ban & Xử lý bất đồng', startPage: 16, level: 2, displayOrder: 11 },
      { id: 12, bookId, title: 'PHẦN III: KỶ LUẬT CÔNG NGHỆ & TIÊU CHUẨN KỸ SƯ', startPage: 18, level: 1, displayOrder: 12 },
      { id: 13, bookId, title: '3.1. Tinh thần Zero-Defect & Tiêu chuẩn chất lượng code', startPage: 18, level: 2, displayOrder: 13 },
      { id: 14, bookId, title: '3.2. Quy chuẩn Git Workflow, Commit Convention & Review', startPage: 21, level: 2, displayOrder: 14 },
      { id: 15, bookId, title: '3.3. Tự động hóa CI/CD & Kỷ luật vận hành hệ thống', startPage: 24, level: 2, displayOrder: 15 },
      { id: 16, bookId, title: '3.4. An toàn thông tin, Mã hóa dữ liệu & Tuân thủ NDA', startPage: 26, level: 2, displayOrder: 16 },
      { id: 17, bookId, title: 'PHẦN IV: ĐÁNH GIÁ NĂNG LỰC & LỘ TRÌNH THĂNG TIẾN', startPage: 28, level: 1, displayOrder: 17 },
      { id: 18, bookId, title: '4.1. Hệ thống quản trị mục tiêu OKRs & Đánh giá KPIs', startPage: 28, level: 2, displayOrder: 18 },
      { id: 19, bookId, title: '4.2. Khung năng lực kỹ sư (Engineering Career Ladder)', startPage: 30, level: 2, displayOrder: 19 },
      { id: 20, bookId, title: '4.3. Chính sách đào tạo, Chứng chỉ quốc tế & Đãi ngộ', startPage: 32, level: 2, displayOrder: 20 },
      { id: 21, bookId, title: 'LỜI KẾT: CAM KẾT ĐỒNG HÀNH & TỰ HÀO MEKOSOFT', startPage: 34, level: 1, displayOrder: 21 }
    ];
  }
  return [
    { id: 1, bookId, title: 'Bìa trước & Lời mở đầu', startPage: 1, level: 1, displayOrder: 1 },
    { id: 2, bookId, title: 'Chương 1: Tổng quan Kiến trúc', startPage: 5, level: 1, displayOrder: 2 },
    { id: 3, bookId, title: '1.1. Luồng dữ liệu Headless', startPage: 8, level: 2, displayOrder: 3 },
    { id: 4, bookId, title: '1.2. Kỹ thuật Lật trang 3D Mesh', startPage: 14, level: 2, displayOrder: 4 },
    { id: 5, bookId, title: 'Chương 2: Tối ưu hiệu năng 60 FPS', startPage: 25, level: 1, displayOrder: 5 },
    { id: 6, bookId, title: 'Chương 3: Bảo mật DRM & Readium LCP', startPage: 40, level: 1, displayOrder: 6 }
  ];
}

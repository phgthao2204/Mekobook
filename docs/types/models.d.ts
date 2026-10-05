/**
 * MEKOBOOK - TypeScript Data Models & Headless API Contracts
 * Based on Liferay 7.4 CE GA132 CDM (Common Data Model)
 */

export interface LiferayItemResponse<T> {
  actions: Record<string, { method: string; href: string }>;
  facets: any[];
  items: T[];
  lastPage: number;
  page: number;
  pageSize: number;
  totalCount: number;
}

/** 1. Book - Sách điện tử & Giáo trình (/o/c/books) */
export interface Book {
  id: number;
  creator: { id: number; name: string };
  dateCreated: string;
  dateModified: string;
  title: string;
  author: string;
  publisher: string;
  language: 'vi' | 'en';
  description: string;
  coverUrl: string;
  documentUrl: string;
  fileSize: number;
  totalPages: number;
  isFree: boolean;
  samplePagesLimit: number;
  flipbookBaseUrl: string;
  screenPattern: string;
  thumbPattern: string;
  readingProgression: 'ltr' | 'rtl';
  defaultSpread: 'auto' | 'single' | 'double';
  isEncrypted: boolean;
}

/** 2. ChapterTOC - Mục lục cây phân cấp (/o/c/chaptertocs) */
export interface ChapterTOC {
  id: number;
  bookId: number;
  parentChapterId?: number | null;
  title: string;
  startPage: number;
  level: number;
  displayOrder: number;
}

/** 3. PersonalShelf - Kệ sách cá nhân độc giả (/o/c/personalshelfs) */
export interface PersonalShelf {
  id: number;
  shelfName: string;
  colorTag: string;
  displayOrder: number;
}

/** 4. ShelfItem - Ánh xạ N:N sách vào kệ cá nhân (/o/c/shelfitems) */
export interface ShelfItem {
  id: number;
  shelfId: number;
  bookId: number;
}

/** 5. UserPreference - Cấu hình trải nghiệm đọc (/o/c/userpreferences) */
export interface UserPreference {
  id: number;
  themeMode: 'LIGHT' | 'SEPIA' | 'DARK';
  brightness: number;
  enablePageCurl3D: boolean;
  pageCurlSpeed: number;
  defaultViewMode: 'SINGLE' | 'DUAL' | 'AUTO';
  keepScreenAwake: boolean;
  fontSizeScale?: number;
}

/** 6. ReadingProgress - Tiến độ đọc sách (/o/c/readingprogresses) */
export interface ReadingProgress {
  id: number;
  bookId: number;
  currentPage: number;
  totalPages: number;
  percentage: number;
  readStatus: 'NOT_STARTED' | 'READING' | 'COMPLETED';
  readDurationSeconds: number;
  lastReadTimestamp: number;
}

/** 7. Bookmark - Đánh dấu ruy băng trang (/o/c/bookmarks) */
export interface Bookmark {
  id: number;
  bookId: number;
  pageNumber: number;
  bookmarkTitle: string;
  colorCode: string;
}

/** 8. Annotation - Nét vẽ bút dạ quang, ghi chú (/o/c/annotations) */
export interface Annotation {
  id: number;
  bookId: number;
  pageNumber: number;
  type: 'HIGHLIGHT' | 'NOTE' | 'DRAWING' | 'UNDERLINE';
  vectorPath?: string;
  color: string;
  opacity: number;
  noteText?: string;
}

/** 9. DrmLicense - Giấy phép bản quyền DRM (/o/c/drmlicenses) */
export interface DrmLicense {
  id: number;
  bookId: number;
  licenseUuid: string;
  orderId: string;
  licenseType: 'PERPETUAL' | 'SUBSCRIPTION' | 'LOAN';
  encryptedContentKey: string;
  userKeyCheck: string;
  startDate: string;
  endDate?: string | null;
  maxDevices: number;
  isFavorite: boolean;
  isArchived: boolean;
}

/** 10. DeviceRegistration - Thiết bị kích hoạt bản quyền (/o/c/deviceregistrations) */
export interface DeviceRegistration {
  id: number;
  deviceId: string;
  deviceFingerprint: string;
  deviceName: string;
  deviceOs: 'iOS' | 'Android';
  status: 'ACTIVE' | 'REVOKED';
  activationDate: string;
  lastSeenDate: string;
}

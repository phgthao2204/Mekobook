/**
 * Mekobook TypeScript Types & Headless API Contracts
 */

export interface LiferayItemResponse<T> {
  actions?: Record<string, { method: string; href: string }>;
  facets?: any[];
  items: T[];
  lastPage: number;
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface UserAccount {
  id: number;
  emailAddress: string;
  name: string;
  givenName?: string;
  familyName?: string;
  alternateName?: string;
  accountBriefs?: Array<{
    id?: number;
    name?: string;
    role?: string;
  }>;
  profileUnavailable?: boolean;
  profileError?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: number;
  user: UserAccount;
}

/** 1. Book - Sách điện tử & Giáo trình (/o/c/books) */
export interface Book {
  id: number;
  creator?: { id: number; name: string };
  dateCreated?: string;
  dateModified?: string;
  title: string;
  author: string;
  publisher?: string;
  publicationYear?: number;
  language?: 'vi' | 'en';
  description?: string;
  coverUrl: string;
  documentUrl?: string;
  fileSize?: number;
  totalPages: number;
  isFree?: boolean;
  samplePagesLimit?: number;
  flipbookBaseUrl: string;
  screenPattern: string;
  thumbPattern: string;
  readingProgression?: 'ltr' | 'rtl';
  defaultSpread?: 'auto' | 'single' | 'double';
  isEncrypted?: boolean;
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

/** 5. UserPreference - Cấu hình trải nghiệm đọc (/o/c/userpreferences) */
export interface UserPreference {
  id?: number;
  themeMode: 'LIGHT' | 'SEPIA' | 'DARK' | 'SYSTEM';
  brightness: number;
  pageTurnEffect: 'CURL_3D' | 'SLIDE' | 'FADE';
  pageTurnSoundEnabled: boolean;
  dualPageMode: boolean;
}

export interface DrmLicense {
  id: number;
  bookId: number;
  licenseType: 'PERPETUAL' | 'RENTAL';
  status: string;
  /** Liferay workflow status is not a DRM entitlement status. */
  workflowStatus?: string;
  maxDevices: number;
  isFavorite: boolean;
}
export interface BookAccess {
  book: LibraryBook;
  licenses: DrmLicense[];
  canRead: boolean;
}
export interface PreparedReader {
  book: LibraryBook;
  initialPage: number;
  preferences: UserPreference;
}

/** 6. ReadingProgress - Tiến độ đọc sách (/o/c/readingprogresses) */
export interface ReadingProgress {
  id?: number;
  bookId: number;
  currentPage: number;
  totalPages?: number;
  percentage: number;
  readStatus?: 'NOT_STARTED' | 'READING' | 'COMPLETED';
  readDurationSeconds?: number;
  lastReadTimestamp?: number;
}

/** Book enriched with the current reader's latest progress for library UI. */
export interface LibraryBook extends Book {
  readingProgress?: ReadingProgress;
}

/** 7. Bookmark - Đánh dấu ruy băng trang (/o/c/bookmarks) */
export interface Bookmark {
  id?: number;
  bookId: number;
  pageNumber: number;
  bookmarkTitle: string;
  colorCode?: string;
}

/** Bridge Messages between React Native and Flipbook WebView Engine */
export type FlipbookToReactNativeMessage =
  | { type: 'ENGINE_READY'; totalPages: number }
  | { type: 'PAGE_CHANGED'; page: number; totalPages: number }
  | { type: 'TAP_CENTER' }
  | { type: 'ERROR'; message: string };

export type ReactNativeToFlipbookMessage =
  | { type: 'ZOOM'; scale: number }
  | { type: 'TURN_NEXT' }
  | { type: 'TURN_PREV' }
  | { type: 'GO_TO_PAGE'; page: number };


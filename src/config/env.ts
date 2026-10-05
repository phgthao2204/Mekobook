/**
 * Mekobook Mobile - Environment & App Configuration
 * Reads public Expo configuration from environment variables.
 */

export const ENV = {
  // Liferay Staging Endpoints
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.254:8080',
  STATIC_FLIPBOOK_BASE_URL: process.env.EXPO_PUBLIC_STATIC_FLIPBOOK_BASE_URL || 'http://192.168.1.254:8080/flipbooks/',

  OAUTH: {
    CLIENT_ID: process.env.EXPO_PUBLIC_OAUTH_CLIENT_ID || '',
    CLIENT_SECRET: process.env.EXPO_PUBLIC_OAUTH_CLIENT_SECRET || '',
    // Leave empty to let Liferay assign the scopes configured for this OAuth
    // application. Set only when the server administrator provides an exact
    // supported scope string.
    SCOPE: process.env.EXPO_PUBLIC_OAUTH_SCOPE || '',
  },

  API_PATHS: {
    OAUTH_TOKEN: process.env.EXPO_PUBLIC_OAUTH_TOKEN_PATH || '/o/oauth2/token',
    MY_USER_ACCOUNT:
      process.env.EXPO_PUBLIC_MY_USER_ACCOUNT_PATH ||
      '/o/headless-admin-user/v1.0/my-user-account',
    BOOKS: process.env.EXPO_PUBLIC_BOOKS_PATH || '/o/c/books',
    CHAPTER_TOCS: process.env.EXPO_PUBLIC_CHAPTER_TOCS_PATH || '/o/c/chaptertocs',
    PERSONAL_SHELFS:
      process.env.EXPO_PUBLIC_PERSONAL_SHELFS_PATH || '/o/c/personalshelfs',
    SHELF_ITEMS: process.env.EXPO_PUBLIC_SHELF_ITEMS_PATH || '/o/c/shelfitems',
    USER_PREFERENCES:
      process.env.EXPO_PUBLIC_USER_PREFERENCES_PATH || '/o/c/userpreferences',
    READING_PROGRESSES:
      process.env.EXPO_PUBLIC_READING_PROGRESSES_PATH || '/o/c/readingprogresses',
    BOOKMARKS: process.env.EXPO_PUBLIC_BOOKMARKS_PATH || '/o/c/bookmarks',
    ANNOTATIONS: process.env.EXPO_PUBLIC_ANNOTATIONS_PATH || '/o/c/annotations',
    DRM_LICENSES: process.env.EXPO_PUBLIC_DRM_LICENSES_PATH || '/o/c/drmlicenses',
    DEVICE_REGISTRATIONS:
      process.env.EXPO_PUBLIC_DEVICE_REGISTRATIONS_PATH || '/o/c/deviceregistrations',
  },

  // Liferay Site & Scope
  LIFERAY_SITE_ID: Number(process.env.EXPO_PUBLIC_LIFERAY_SITE_ID || 20117),

  // 3D Flipbook Engine Settings
  FLIPBOOK: {
    CACHE_SLIDING_WINDOW_SIZE: 4,
    MAX_GPU_MEMORY_MB: 40,
    TARGET_FRAME_RATE: 60,
    DEFAULT_SPREAD: 'auto' as 'auto' | 'single' | 'double',
    ENABLE_WATERMARK: true,
  },
};

export function getApiUrl(path: string): string {
  const baseUrl = ENV.API_BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

export default ENV;

/**
 * Mekobook Mobile - Environment & App Configuration
 * Reads from environment or defaults to Staging Liferay server with phuongthao/admin
 */

export const ENV = {
  // Liferay Staging Endpoints
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.254:8080',
  STATIC_FLIPBOOK_BASE_URL: process.env.EXPO_PUBLIC_STATIC_FLIPBOOK_BASE_URL || 'http://192.168.1.254:8080/flipbooks/',
  PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_PUBLIC_API_BASE_URL || 'https://serrated-catacomb-vendor.ngrok-free.dev',

  // Hardcoded Authentication for Dev/Staging (phuongthao / admin)
  AUTH: {
    USERNAME: 'phuongthao',
    PASSWORD: 'admin',
    USER_ID: 32236,
    // Base64 encoded 'phuongthao:admin'
    BASIC_AUTH_HEADER: 'Basic cGh1b25ndGhhbzphZG1pbg==',
  },

  // Liferay Site & Scope
  LIFERAY_SITE_ID: 20117,

  // 3D Flipbook Engine Settings
  FLIPBOOK: {
    CACHE_SLIDING_WINDOW_SIZE: 4,
    MAX_GPU_MEMORY_MB: 40,
    TARGET_FRAME_RATE: 60,
    DEFAULT_SPREAD: 'auto' as 'auto' | 'single' | 'double',
    ENABLE_WATERMARK: true,
  },
};

export default ENV;

import { DrmLicense, ReadingProgress, UserPreference } from '../types';
import { defaultPreferences } from '../constants/preferences';
export function clampPage(page: number, total: number): number {
  return Math.max(1, Math.min(Number.isFinite(page) ? Math.floor(page) : 1, total));
}
/** Canonical progress formula used by Reader, detail, catalog and local storage. */
export function readingPercentage(page: number, totalPages: number): number {
  if (!Number.isFinite(totalPages) || totalPages < 1) return 0;
  const currentPage = clampPage(page, totalPages);
  return Math.round((currentPage / totalPages) * 10000) / 100;
}
export function hasReadAccess(isFree: boolean | undefined, licenses: DrmLicense[]): boolean {
  return isFree === true || licenses.some(license => license.status === 'ACTIVE');
}
export function latestProgress(items: ReadingProgress[]): ReadingProgress | undefined {
  return [...items].sort((a, b) => (b.lastReadTimestamp || 0) - (a.lastReadTimestamp || 0))[0];
}
export function mergeReadingProgress(server?: ReadingProgress, local?: ReadingProgress): ReadingProgress | undefined {
  if (!server) return local;
  if (!local) return server;
  return (local.lastReadTimestamp || 0) >= (server.lastReadTimestamp || 0) ? local : server;
}
export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ').trim();
}
export function hasStartedReading(progress?: ReadingProgress): boolean {
  return !!progress && (progress.readStatus === 'READING' || progress.readStatus === 'COMPLETED'
    || progress.currentPage > 1 || progress.percentage > 0);
}
export function normalizePreferences(value?: Partial<UserPreference>): UserPreference {
  return {
    ...defaultPreferences,
    themeMode: ['LIGHT', 'DARK', 'SEPIA', 'SYSTEM'].includes(value?.themeMode || '') ? value!.themeMode! : 'LIGHT',
    brightness: typeof value?.brightness === 'number' && Number.isFinite(value.brightness)
      ? Math.max(0.1, Math.min(1, value.brightness)) : 1,
    pageTurnEffect: ['CURL_3D', 'SLIDE', 'FADE'].includes(value?.pageTurnEffect || '') ? value!.pageTurnEffect! : 'CURL_3D',
    pageTurnSoundEnabled: value?.pageTurnSoundEnabled === true,
    dualPageMode: value?.dualPageMode === true,
  };
}

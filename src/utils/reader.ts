import { DrmLicense, ReadingProgress, UserPreference } from '../types';
import { defaultPreferences } from '../constants/preferences';
export function clampPage(page: number, total: number): number {
  return Math.max(1, Math.min(Number.isFinite(page) ? Math.floor(page) : 1, total));
}
export function hasReadAccess(isFree: boolean | undefined, licenses: DrmLicense[]): boolean {
  return isFree === true || licenses.some(license => license.status === 'ACTIVE');
}
export function latestProgress(items: ReadingProgress[]): ReadingProgress | undefined {
  return [...items].sort((a, b) => (b.lastReadTimestamp || 0) - (a.lastReadTimestamp || 0))[0];
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

import { VocalRangeProfile, PracticeSessionRecord, UserStats } from '../types/vocal';
import { getDefaultVocalProfile } from './noteUtils';

const DB_NAME = 'VocalMasterProDB';
const DB_VERSION = 1;
const STORE_PROFILES = 'profiles';
const STORE_SESSIONS = 'sessions';
const STORE_SETTINGS = 'settings';

const LOCAL_STORAGE_PROFILE_KEY = 'vocalmaster_current_profile';
const LOCAL_STORAGE_STATS_KEY = 'vocalmaster_user_stats';
const LOCAL_STORAGE_SETTINGS_KEY = 'vocalmaster_app_settings';

export interface AppSettings {
  a4Frequency: number;
  showPianoLabels: boolean;
  hapticFeedbackEnabled: boolean;
  keepScreenAwake: boolean;
  synthVolume: number;
  tuningToleranceCents: number; // e.g. 10 or 15 cents
  voiceGuidanceVowels: boolean;
  googleDriveConnected: boolean;
  googleDriveUserEmail?: string;
  lastDriveSyncDate?: string;
  language: import('../types/vocal').AppLanguage;
  notation: import('../types/vocal').NotationSystem;
  instrument: import('../types/vocal').InstrumentType;
  theme: import('../types/vocal').AppTheme;
  autoVerticalOnFullscreen: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  a4Frequency: 440,
  showPianoLabels: true,
  hapticFeedbackEnabled: true,
  keepScreenAwake: true,
  synthVolume: 0.8,
  tuningToleranceCents: 12,
  voiceGuidanceVowels: true,
  googleDriveConnected: false,
  language: 'en',
  notation: 'english',
  instrument: 'piano',
  theme: 'classic-piano',
  autoVerticalOnFullscreen: true,
};

/**
 * Open or upgrade IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROFILES)) {
        db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const sessionStore = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
        sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save user's vocal range profile
 */
export async function saveVocalProfile(profile: VocalRangeProfile): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
    const db = await openDB();
    const tx = db.transaction(STORE_PROFILES, 'readwrite');
    tx.objectStore(STORE_PROFILES).put(profile);
  } catch (err) {
    console.warn('Fallback saving vocal profile to localStorage only:', err);
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
  }
}

/**
 * Load active vocal range profile
 */
export async function loadVocalProfile(): Promise<VocalRangeProfile> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }

    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PROFILES, 'readonly');
      const store = tx.objectStore(STORE_PROFILES);
      const req = store.getAll();
      req.onsuccess = () => {
        if (req.result && req.result.length > 0) {
          const profile = req.result[req.result.length - 1];
          localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
          resolve(profile);
        } else {
          resolve(getDefaultVocalProfile());
        }
      };
      req.onerror = () => resolve(getDefaultVocalProfile());
    });
  } catch {
    return getDefaultVocalProfile();
  }
}

/**
 * Save a practice session record and update streaks/analytics
 */
export async function savePracticeSession(session: PracticeSessionRecord): Promise<UserStats> {
  // Save to IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SESSIONS, 'readwrite');
    tx.objectStore(STORE_SESSIONS).put(session);
  } catch (e) {
    console.warn('Failed saving session to IndexedDB, keeping in stats:', e);
  }

  // Update aggregated UserStats
  const stats = loadUserStats();
  stats.sessions.unshift(session);
  if (stats.sessions.length > 100) {
    stats.sessions = stats.sessions.slice(0, 100);
  }

  stats.totalPracticeTimeMinutes += Math.round(session.durationSeconds / 60);
  stats.totalSessionsCompleted += 1;

  // Recalculate streak
  const today = new Date().toISOString().split('T')[0];
  const lastDate = stats.lastPracticeDate ? stats.lastPracticeDate.split('T')[0] : null;

  if (!lastDate) {
    stats.streakDays = 1;
  } else if (lastDate === today) {
    // Already practiced today, keep streak
  } else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (lastDate === yesterday) {
      stats.streakDays += 1;
    } else {
      stats.streakDays = 1; // Streak broken, restart
    }
  }

  stats.lastPracticeDate = new Date().toISOString();

  // Average accuracy
  const totalAcc = stats.sessions.reduce((acc, s) => acc + s.accuracyPercentage, 0);
  stats.overallAccuracyPct = Math.round(totalAcc / stats.sessions.length);

  localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(stats));
  return stats;
}

/**
 * Load overall user analytics and session history
 */
export function loadUserStats(): UserStats {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        totalPracticeTimeMinutes: parsed.totalPracticeTimeMinutes ?? 24,
        streakDays: parsed.streakDays ?? 3,
        lastPracticeDate: parsed.lastPracticeDate ?? new Date().toISOString(),
        totalSessionsCompleted: parsed.totalSessionsCompleted ?? 4,
        overallAccuracyPct: parsed.overallAccuracyPct ?? 82,
        highScorePitchHero: parsed.highScorePitchHero ?? 1250,
        highScoreMatchNote: parsed.highScoreMatchNote ?? 940,
        highScoreInterval: parsed.highScoreInterval ?? 820,
        sessions: parsed.sessions ?? [],
        gameRecords: parsed.gameRecords ?? [],
      };
    }
  } catch (e) {
    console.error('Error loading user stats from storage', e);
  }

  // Initial stats with starter history
  return {
    totalPracticeTimeMinutes: 24,
    streakDays: 3,
    lastPracticeDate: new Date().toISOString(),
    totalSessionsCompleted: 4,
    overallAccuracyPct: 82,
    highScorePitchHero: 1250,
    highScoreMatchNote: 940,
    highScoreInterval: 820,
    gameRecords: [
      {
        id: 'game-starter-1',
        gameType: 'pitch_hero',
        score: 1250,
        highestStreak: 7,
        accuracyPercentage: 88,
        totalNotes: 15,
        notesHit: 13,
        date: 'Yesterday',
        timestamp: Date.now() - 86400000,
      },
    ],
    sessions: [
      {
        id: 'starter-1',
        timestamp: Date.now() - 86400000 * 2,
        exerciseTitle: 'Lip Trill Glide',
        durationSeconds: 320,
        notesAttempted: 18,
        notesHitInTune: 15,
        accuracyPercentage: 83,
        averageCentsError: 8,
        dateString: '2 days ago',
      },
      {
        id: 'starter-2',
        timestamp: Date.now() - 86400000,
        exerciseTitle: '5-Tone Major Scales',
        durationSeconds: 450,
        notesAttempted: 24,
        notesHitInTune: 20,
        accuracyPercentage: 83,
        averageCentsError: 7,
        dateString: 'Yesterday',
      },
      {
        id: 'starter-3',
        timestamp: Date.now() - 3600000 * 4,
        exerciseTitle: 'Target Pitch Mastery',
        durationSeconds: 380,
        notesAttempted: 16,
        notesHitInTune: 14,
        accuracyPercentage: 87,
        averageCentsError: 6,
        dateString: 'Today',
      },
    ],
  };
}

/**
 * Save pitch game record & update high score
 */
export function savePitchGameRecord(record: import('../types/vocal').PitchGameRecord): UserStats {
  const stats = loadUserStats();
  if (!stats.gameRecords) stats.gameRecords = [];
  stats.gameRecords.unshift(record);
  if (stats.gameRecords.length > 50) {
    stats.gameRecords = stats.gameRecords.slice(0, 50);
  }

  if (record.gameType === 'pitch_hero') {
    stats.highScorePitchHero = Math.max(stats.highScorePitchHero || 0, record.score);
  } else if (record.gameType === 'match_note') {
    stats.highScoreMatchNote = Math.max(stats.highScoreMatchNote || 0, record.score);
  } else if (record.gameType === 'interval_challenge') {
    stats.highScoreInterval = Math.max(stats.highScoreInterval || 0, record.score);
  } else if (record.gameType === 'pitch_recognition') {
    stats.highScorePitchRecognition = Math.max(stats.highScorePitchRecognition || 0, record.score);
  }

  // Add practice minutes
  stats.totalPracticeTimeMinutes += 2;
  stats.totalSessionsCompleted += 1;
  stats.lastPracticeDate = new Date().toISOString();

  localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(stats));
  return stats;
}

/**
 * App Settings persistence
 */
export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed reading settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveAppSettings(settings: AppSettings) {
  localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
}

export const loadSettings = loadAppSettings;
export const saveSettings = saveAppSettings;

/**
 * Complete Data Backup Structure (for JSON Export and Google Drive Sync)
 */
export interface FullAppDataBackup {
  version: number;
  appName: string;
  exportDate: string;
  profile: VocalRangeProfile;
  stats: UserStats;
  settings: AppSettings;
}

/**
 * Generate full JSON backup
 */
export async function createFullDataBackup(): Promise<FullAppDataBackup> {
  const profile = await loadVocalProfile();
  const stats = loadUserStats();
  const settings = loadAppSettings();

  return {
    version: 1,
    appName: 'VocalMaster Pro',
    exportDate: new Date().toISOString(),
    profile,
    stats,
    settings,
  };
}

/**
 * Restore data from parsed JSON backup
 */
export async function restoreDataFromBackup(backup: FullAppDataBackup): Promise<boolean> {
  if (!backup || !backup.profile || !backup.stats) {
    throw new Error('Invalid VocalMaster backup format');
  }

  await saveVocalProfile(backup.profile);
  localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(backup.stats));
  if (backup.settings) {
    saveAppSettings(backup.settings);
  }

  return true;
}

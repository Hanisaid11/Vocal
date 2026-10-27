/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, ActiveTab } from './components/Navigation';
import { OfflineBanner } from './components/OfflineBanner';
import { PianoView } from './components/Piano/PianoView';
import { VoiceProfiler } from './components/Profiler/VoiceProfiler';
import { PitchGamesHub } from './components/Games/PitchGamesHub';
import { WarmupRoutines } from './components/Exercises/WarmupRoutines';
import { PitchTrainer } from './components/Training/PitchTrainer';
import { AnalyticsDashboard } from './components/Analytics/AnalyticsDashboard';
import { DriveSyncModal } from './components/Sync/DriveSyncModal';
import { SettingsModal } from './components/Settings/SettingsModal';

import {
  VocalRangeProfile,
  PitchDetectionResult,
  PracticeSessionRecord,
  UserStats,
  PitchGameRecord,
  AppLanguage,
  NotationSystem,
  InstrumentType,
} from './types/vocal';
import { audioEngine } from './audio/audioEngine';
import {
  loadVocalProfile,
  saveVocalProfile,
  loadUserStats,
  savePracticeSession,
  savePitchGameRecord,
  loadSettings,
  saveSettings,
  AppSettings,
} from './utils/storage';
import { getDefaultVocalProfile } from './utils/noteUtils';
import { requestWakeLock, releaseWakeLock } from './utils/wakeLock';
import { translations } from './utils/i18n';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('piano');
  const [profile, setProfile] = useState<VocalRangeProfile>(getDefaultVocalProfile());
  const [stats, setStats] = useState<UserStats>(loadUserStats());
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [isListening, setIsListening] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<PitchDetectionResult | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const t = translations[settings.language];

  // Sync document language, text direction, and audio engine params with settings
  useEffect(() => {
    document.documentElement.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language;
    audioEngine.setInstrument(settings.instrument);
    audioEngine.setReferencePitch(settings.a4Frequency);
    audioEngine.setTuningTolerance(settings.tuningToleranceCents);
  }, [settings]);

  // Initialize profile & stats from storage on load
  useEffect(() => {
    async function initData() {
      const savedProfile = await loadVocalProfile();
      setProfile(savedProfile);
      setStats(loadUserStats());
    }
    initData();
  }, []);

  // Listen for audio engine pitch updates
  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((result) => {
      setCurrentPitch(result);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Screen Wake Lock while active in warmup, games, or pitch trainer
  useEffect(() => {
    if (settings.keepScreenAwake && (activeTab === 'warmup' || activeTab === 'trainer' || activeTab === 'games')) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [activeTab, settings.keepScreenAwake]);

  // Toggle microphone
  const handleToggleMic = async () => {
    if (isListening) {
      audioEngine.stopListening();
      setIsListening(false);
    } else {
      try {
        await audioEngine.startListening();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start microphone listening:', err);
        alert(
          settings.language === 'ar'
            ? 'يرجى السماح بأذونات الميكروفون في متصفحك أو إعدادات أندرويد لتتبع النبرة والصوت المباشر.'
            : 'Please allow microphone permissions in your browser or Android settings to use real-time pitch tracking.'
        );
        setIsListening(false);
      }
    }
  };

  // Quick Language Toggle
  const handleToggleLanguage = () => {
    const nextLang: AppLanguage = settings.language === 'en' ? 'ar' : 'en';
    const updated = { ...settings, language: nextLang };
    setSettings(updated);
    saveSettings(updated);
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Quick Change Notation
  const handleChangeNotation = (notation: NotationSystem) => {
    const updated = { ...settings, notation };
    setSettings(updated);
    saveSettings(updated);
  };

  // Quick Change Instrument
  const handleChangeInstrument = (instrument: InstrumentType) => {
    const updated = { ...settings, instrument };
    setSettings(updated);
    saveSettings(updated);
  };

  // Save new profile from Voice Profiler
  const handleSaveProfile = async (newProfile: VocalRangeProfile) => {
    await saveVocalProfile(newProfile);
    setProfile(newProfile);
    setActiveTab('piano');
  };

  // Record practice session
  const handleRecordSession = async (session: PracticeSessionRecord) => {
    const updatedStats = await savePracticeSession(session);
    setStats(updatedStats);
  };

  // Record game session
  const handleRecordGameSession = (record: PitchGameRecord) => {
    const updatedStats = savePitchGameRecord(record);
    setStats(updatedStats);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500/30">
      {/* Offline connectivity banner */}
      <OfflineBanner />

      {/* Main App Bar */}
      <Header
        profile={profile}
        isListening={isListening}
        onToggleMic={handleToggleMic}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenProfiler={() => setActiveTab('profiler')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleLanguage={handleToggleLanguage}
        language={settings.language}
        notation={settings.notation}
        currentPitch={currentPitch}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-4 md:p-6 pb-24 flex flex-col gap-4">
        {activeTab === 'piano' && (
          <div className="flex flex-col gap-4">
            <PianoView
              profile={profile}
              currentPitch={currentPitch}
              language={settings.language}
              notation={settings.notation}
              instrument={settings.instrument}
              autoVerticalOnFullscreen={settings.autoVerticalOnFullscreen}
              onSelectRangeProfile={handleSaveProfile}
              onChangeNotation={handleChangeNotation}
              onChangeInstrument={handleChangeInstrument}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />

            {/* Quick action bar beneath piano */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">{t.voiceProfilerTitle}</h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">{t.voiceProfilerDesc}</p>
                </div>
                <button
                  onClick={() => setActiveTab('profiler')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-sm"
                >
                  {settings.language === 'ar' ? 'فحص' : 'Test'}
                </button>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">{t.pitchHeroTitle}</h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">{settings.language === 'ar' ? 'ألعاب تدريب النبرة والأذن' : 'Ear & pitch training arena'}</p>
                </div>
                <button
                  onClick={() => setActiveTab('games')}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold transition shadow-sm"
                >
                  {t.playGame}
                </button>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">{t.warmupTitle}</h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">{t.warmupDesc}</p>
                </div>
                <button
                  onClick={() => setActiveTab('warmup')}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition shadow-sm"
                >
                  {t.practice}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profiler' && (
          <VoiceProfiler
            currentProfile={profile}
            currentPitch={currentPitch}
            language={settings.language}
            notation={settings.notation}
            onSaveProfile={handleSaveProfile}
            onClose={() => setActiveTab('piano')}
          />
        )}

        {activeTab === 'games' && (
          <PitchGamesHub
            profile={profile}
            currentPitch={currentPitch}
            stats={stats}
            language={settings.language}
            notation={settings.notation}
            onRecordGameSession={handleRecordGameSession}
          />
        )}

        {activeTab === 'warmup' && (
          <WarmupRoutines
            profile={profile}
            currentPitch={currentPitch}
            onSessionComplete={handleRecordSession}
          />
        )}

        {activeTab === 'trainer' && (
          <PitchTrainer
            profile={profile}
            currentPitch={currentPitch}
            onRecordSession={handleRecordSession}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            stats={stats}
            profile={profile}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Google Drive & JSON Cloud Sync Modal */}
      <DriveSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onDataRestored={async () => {
          const reloadedProfile = await loadVocalProfile();
          setProfile(reloadedProfile);
          setStats(loadUserStats());
        }}
        currentProfile={profile}
        stats={stats}
      />

      {/* Android Mobile Bottom Navigation */}
      <Navigation
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        language={settings.language}
      />
    </div>
  );
}

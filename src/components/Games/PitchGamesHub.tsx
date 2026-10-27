import React, { useState } from 'react';
import { Trophy, Play, Flame, Music, Sparkles, Award, ArrowRight, Brain } from 'lucide-react';
import { VocalRangeProfile, PitchDetectionResult, PitchGameRecord, UserStats, AppLanguage, NotationSystem } from '../../types/vocal';
import { PitchHeroGame } from './PitchHeroGame';
import { IntervalChallengeGame } from './IntervalChallengeGame';
import { NoteMemoryGame } from './NoteMemoryGame';
import { translations } from '../../utils/i18n';
import { haptics } from '../../utils/haptics';

interface PitchGamesHubProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  stats: UserStats;
  language: AppLanguage;
  notation: NotationSystem;
  onRecordGameSession: (record: PitchGameRecord) => void;
}

export const PitchGamesHub: React.FC<PitchGamesHubProps> = ({
  profile,
  currentPitch,
  stats,
  language,
  notation,
  onRecordGameSession,
}) => {
  const [activeGame, setActiveGame] = useState<'hub' | 'pitch_hero' | 'interval' | 'memory'>('hub');
  const t = translations[language];

  if (activeGame === 'pitch_hero') {
    return (
      <PitchHeroGame
        profile={profile}
        currentPitch={currentPitch}
        onGameComplete={(record) => {
          onRecordGameSession(record);
        }}
        onExit={() => setActiveGame('hub')}
      />
    );
  }

  if (activeGame === 'interval') {
    return (
      <IntervalChallengeGame
        profile={profile}
        currentPitch={currentPitch}
        onGameComplete={(record) => {
          onRecordGameSession(record);
        }}
        onExit={() => setActiveGame('hub')}
      />
    );
  }

  if (activeGame === 'memory') {
    return (
      <NoteMemoryGame
        profile={profile}
        currentPitch={currentPitch}
        language={language}
        notation={notation}
        onGameComplete={(record) => {
          onRecordGameSession(record);
        }}
        onExit={() => setActiveGame('hub')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Banner */}
      <div className="bg-gradient-to-r from-pink-950 via-purple-950 to-indigo-950 border border-purple-800/40 p-4 rounded-3xl shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/50">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{t.gamesHubTitle}</h2>
            <p className="text-xs text-slate-300">
              {t.gamesHubDesc}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-2xl border border-slate-800 text-xs">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white font-mono">{stats.highScorePitchHero || 0} pts</span>
          <span className="text-[10px] text-slate-400">{language === 'ar' ? 'الرقم القياسي' : 'Record'}</span>
        </div>
      </div>

      {/* Game Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Game 1: Pitch Hero */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-pink-500/40 p-4 rounded-3xl shadow-md flex flex-col justify-between gap-3 group transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider">
                {language === 'ar' ? 'سرعة البديهة' : 'Fast Reflexes'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono text-[10px] border border-pink-500/30">
                {stats.highScorePitchHero || 0} pts
              </span>
            </div>

            <h3 className="text-base font-bold text-white group-hover:text-pink-300 transition">
              {t.pitchHeroTitle}
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              {t.pitchHeroDesc}
            </p>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono">
              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-cyan-300">
                45s Time Attack
              </span>
              <span>1x–4x Combos</span>
            </div>
          </div>

          <button
            onClick={() => {
              haptics.tap();
              setActiveGame('pitch_hero');
            }}
            className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-pink-950/40 transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t.playGame}</span>
          </button>
        </div>

        {/* Game 2: Note Memory Match */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 p-4 rounded-3xl shadow-md flex flex-col justify-between gap-3 group transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                {language === 'ar' ? 'الذاكرة السمعية' : 'Aural Memory'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] border border-purple-500/30">
                {stats.highScoreMatchNote || 0} pts
              </span>
            </div>

            <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition">
              {t.memoryTitle}
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              {t.memoryDesc}
            </p>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono">
              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-purple-300">
                6 Rounds
              </span>
              <span>Ear Retainment</span>
            </div>
          </div>

          <button
            onClick={() => {
              haptics.tap();
              setActiveGame('memory');
            }}
            className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 transition active:scale-95"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>{t.playGame}</span>
          </button>
        </div>

        {/* Game 3: Interval Challenge */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 p-4 rounded-3xl shadow-md flex flex-col justify-between gap-3 group transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                {language === 'ar' ? 'المسافات الصوتية' : 'Relative Pitch'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] border border-cyan-500/30">
                {stats.highScoreInterval || 0} pts
              </span>
            </div>

            <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
              {t.intervalTitle}
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              {t.intervalDesc}
            </p>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono">
              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-indigo-300">
                8 Questions
              </span>
              <span>Song Mnemonics</span>
            </div>
          </div>

          <button
            onClick={() => {
              haptics.tap();
              setActiveGame('interval');
            }}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t.playGame}</span>
          </button>
        </div>
      </div>

      {/* Recent Game Activity Log */}
      {stats.gameRecords && stats.gameRecords.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl space-y-2">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            {language === 'ar' ? 'سجل نتائج الألعاب الأخيرة' : 'Recent Pitch Game Records'}
          </h4>
          <div className="divide-y divide-slate-800/80">
            {stats.gameRecords.slice(0, 4).map((rec) => (
              <div key={rec.id} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-200 capitalize">
                    {rec.gameType.replace('_', ' ')}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {rec.date} • {t.streak}: {rec.highestStreak}x
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-cyan-400 font-mono text-sm">{rec.score} pts</span>
                  <div className="text-[10px] text-slate-400 font-mono">{rec.accuracyPercentage}% {language === 'ar' ? 'دقة' : 'acc'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

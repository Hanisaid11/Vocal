import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Volume2,
  Play,
  Square,
  ChevronUp,
  ChevronDown,
  Mic,
  Maximize2,
  Minimize2,
  Layers,
} from 'lucide-react';
import {
  NoteInfo,
  VocalRangeProfile,
  PitchDetectionResult,
  AppLanguage,
  NotationSystem,
  AppTheme,
} from '../../types/vocal';
import { midiToNoteInfo, formatNoteName } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { translations } from '../../utils/i18n';
import { THEMES } from '../../utils/theme';
import { haptics } from '../../utils/haptics';

interface VerticalPianoProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language?: AppLanguage;
  notation?: NotationSystem;
  theme?: AppTheme;
  onSelectRangeProfile?: (profile: VocalRangeProfile) => void;
  targetMidi?: number | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const VerticalPiano: React.FC<VerticalPianoProps> = ({
  profile,
  currentPitch,
  language = 'ar',
  notation = 'arabic',
  theme = 'classic-piano',
  targetMidi,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const isAr = language === 'ar';
  const t = translations[language] || translations.en;
  const themeConfig = THEMES[theme] || THEMES['classic-piano'];

  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);

  const [keyHeight, setKeyHeight] = useState<number>(isFullscreen ? 36 : 28);
  const [activeMidiNotes, setActiveMidiNotes] = useState<Set<number>>(new Set());
  const [scrollProgress, setScrollProgress] = useState<number>(0.4);
  const [visibleRatio, setVisibleRatio] = useState<number>(0.25);

  // Recording & Playback state (synchronized with audioEngine)
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [recordedCount, setRecordedCount] = useState(0);

  // Full 88-Key Standard Piano: A0 (21) to C8 (108)
  const full88Keys = useMemo(() => {
    const list: NoteInfo[] = [];
    for (let m = 21; m <= 108; m++) {
      list.push(midiToNoteInfo(m));
    }
    return list;
  }, []);

  const whiteKeys = useMemo(() => {
    return full88Keys.filter((note) => !note.name.includes('#'));
  }, [full88Keys]);

  // Reverse list so highest notes are at top, lowest notes at bottom (natural pitch orientation)
  const display88Keys = useMemo(() => {
    return [...full88Keys].reverse();
  }, [full88Keys]);

  // Subscribe to recording events
  useEffect(() => {
    const unsub = audioEngine.subscribeRecording((rec, play, count) => {
      setIsRecording(rec);
      setIsPlayingRecording(play);
      setRecordedCount(count);
    });
    return () => unsub();
  }, []);

  // Center vertical piano on the user's middle register on initial mount
  useEffect(() => {
    if (containerRef.current) {
      const middleMidi = profile.middleRegisterNote?.midi || 60;
      const index = display88Keys.findIndex((n) => n.midi === middleMidi);
      if (index !== -1) {
        const targetScroll = Math.max(
          0,
          index * keyHeight - containerRef.current.clientHeight / 2 + keyHeight
        );
        containerRef.current.scrollTop = targetScroll;
      }
    }
  }, [keyHeight]);

  // Track vertical scroll to update minimap sliding viewport window
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 0) {
      // Reversed: top of container is high notes
      const progress = 1 - scrollTop / maxScroll;
      setScrollProgress(Math.max(0, Math.min(1, progress)));
      setVisibleRatio(Math.max(0.1, Math.min(0.5, clientHeight / scrollHeight)));
    }
  };

  // Click on minimap to scroll immediately to that octave
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!minimapRef.current || !containerRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));

    const { scrollHeight, clientHeight } = containerRef.current;
    const maxScroll = scrollHeight - clientHeight;
    // Map ratio (0 = A0 at bottom, 1 = C8 at top) to scrollTop (0 = C8 at top, max = A0 at bottom)
    const targetScroll = (1 - ratio) * maxScroll;
    containerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  const scrollByDelta = (semitones: number) => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ top: semitones * keyHeight, behavior: 'smooth' });
  };

  // Play note with authentic grand piano synthesis & long natural ring
  const handlePlayNote = async (midi: number) => {
    haptics.tap();
    const note = midiToNoteInfo(midi);
    setActiveMidiNotes((prev) => new Set(prev).add(midi));

    try {
      // Uses the enhanced physical-acoustic grand piano engine with long acoustic ring
      await audioEngine.playTone(note.frequency, 4.0, undefined, midi);
    } finally {
      setTimeout(() => {
        setActiveMidiNotes((prev) => {
          const next = new Set(prev);
          next.delete(midi);
          return next;
        });
      }, 350);
    }
  };

  const handleToggleRecord = () => {
    haptics.tap();
    if (isRecording) {
      audioEngine.stopRecording();
    } else {
      audioEngine.startRecording();
    }
  };

  const handleTogglePlay = () => {
    haptics.tap();
    if (isPlayingRecording) {
      audioEngine.stopPlayback();
    } else {
      audioEngine.playRecording();
    }
  };

  const isInVocalRange = (midi: number) => {
    return midi >= profile.lowestNote.midi && midi <= profile.highestNote.midi;
  };

  const isSungNote = (midi: number) => {
    return currentPitch?.note?.midi === midi && (currentPitch.clarity ?? 0) > 0.65;
  };

  return (
    <div
      className={`flex flex-col bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : 'w-full'
      }`}
    >
      {/* 
        ========================================================================
        TOP TOOLBAR (Matching the photo layout)
        Includes: Scroll controls, Record Keys with glowing red LED, Play,
        88-Key minimap scrubber, and Key Size (-) and (+) buttons.
        ========================================================================
      */}
      <div
        className={`w-full px-3 py-2 border-b flex items-center justify-between gap-2 shadow-md ${themeConfig.topBarBg} ${themeConfig.topBarBorder}`}
      >
        {/* Scroll Up (Higher Octaves) */}
        <button
          onClick={() => scrollByDelta(-6)}
          aria-label="Scroll piano towards higher notes"
          className="w-8 h-8 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-600 text-slate-100 flex items-center justify-center hover:scale-105 active:scale-95 transition shadow shrink-0"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        {/* Record Keys Button with Glowing Red LED Indicator */}
        <button
          onClick={handleToggleRecord}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition shadow ${
            isRecording
              ? 'bg-rose-950 border-rose-500 text-rose-300 ring-2 ring-rose-500/40 animate-pulse'
              : 'bg-gradient-to-b from-slate-800 to-slate-950 border-slate-700 text-slate-200 hover:text-white'
          }`}
          title={isRecording ? t.stopRecording : t.recordKeys}
        >
          <div className="relative flex items-center justify-center">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                isRecording ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-red-800'
              }`}
            />
            {isRecording && (
              <div className="absolute w-3.5 h-3.5 rounded-full bg-red-400 animate-ping" />
            )}
          </div>
          <span className="hidden sm:inline">{isRecording ? t.recording : t.recordKeys}</span>
          {recordedCount > 0 && (
            <span className="font-mono text-[10px] text-amber-300">({recordedCount})</span>
          )}
        </button>

        {/* Circular Metallic Play Button */}
        <button
          onClick={handleTogglePlay}
          disabled={recordedCount === 0 && !isPlayingRecording}
          className={`w-8 h-8 rounded-full border flex items-center justify-center transition shadow shrink-0 ${
            isPlayingRecording
              ? 'bg-amber-500 border-amber-400 text-slate-950 scale-105'
              : recordedCount > 0
              ? 'bg-gradient-to-b from-slate-700 to-slate-900 border-slate-600 text-slate-100 hover:text-amber-400 hover:scale-105'
              : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
          }`}
          title={isPlayingRecording ? 'Stop' : t.playRecording}
        >
          {isPlayingRecording ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* 88-Key Minimap Overview Strip (Exact photo component) */}
        <div
          ref={minimapRef}
          onClick={handleMinimapClick}
          className="flex-1 h-7 bg-slate-900 border border-slate-700/80 rounded-md relative cursor-pointer overflow-hidden flex items-stretch shadow-inner min-w-[70px]"
          title="Full 88-key overview (click to jump)"
        >
          {/* Miniature White & Black Keys Grid */}
          <div className="w-full h-full flex pointer-events-none relative">
            {whiteKeys.map((k) => (
              <div key={`vert-mini-w-${k.midi}`} className="flex-1 border-r border-slate-800/60 bg-slate-200" />
            ))}

            {/* Miniature Black Keys Overlay */}
            {full88Keys
              .filter((k) => k.name.includes('#'))
              .map((bk) => {
                const whiteIndex = whiteKeys.findIndex((wk) => wk.midi > bk.midi);
                const pct = (whiteIndex / whiteKeys.length) * 100;
                return (
                  <div
                    key={`vert-mini-b-${bk.midi}`}
                    style={{ left: `${pct}%` }}
                    className="absolute top-0 h-4 w-[1.5%] bg-slate-950 rounded-b-xs -translate-x-1/2 z-10"
                  />
                );
              })}
          </div>

          {/* Shaded Viewport Box (Sliding window representing visible keys) */}
          <div
            style={{
              left: `${scrollProgress * (100 - visibleRatio * 100)}%`,
              width: `${visibleRatio * 100}%`,
            }}
            className="absolute top-0 bottom-0 bg-slate-900/75 border-x-2 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)] z-20 transition-all duration-75 pointer-events-none"
          />
        </div>

        {/* Key Size (-) and (+) Metallic Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-slate-300 font-bold hidden md:inline">{t.keySize}</span>
          <button
            onClick={() => setKeyHeight((h) => Math.max(20, h - 3))}
            aria-label="Decrease key size"
            className="w-7 h-7 rounded-full bg-gradient-to-b from-slate-600 via-slate-700 to-slate-900 border border-slate-500 text-slate-100 flex items-center justify-center font-bold text-sm shadow hover:scale-105 active:scale-95 transition"
          >
            –
          </button>
          <button
            onClick={() => setKeyHeight((h) => Math.min(50, h + 3))}
            aria-label="Increase key size"
            className="w-7 h-7 rounded-full bg-gradient-to-b from-slate-600 via-slate-700 to-slate-900 border border-slate-500 text-slate-100 flex items-center justify-center font-bold text-sm shadow hover:scale-105 active:scale-95 transition"
          >
            +
          </button>
        </div>

        {/* Scroll Down (Lower Octaves) */}
        <button
          onClick={() => scrollByDelta(6)}
          aria-label="Scroll piano towards lower notes"
          className="w-8 h-8 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-600 text-slate-100 flex items-center justify-center hover:scale-105 active:scale-95 transition shadow shrink-0"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition shadow shrink-0 ${
              isFullscreen
                ? 'bg-amber-500 border-amber-400 text-slate-950'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isFullscreen ? t.exitFullscreen : t.fullscreen}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* 
        ========================================================================
        VERTICAL PIANO KEYBOARD WITH REAL 3D BUTTONS
        Same 3D ivory & ebony piano button design as horizontal keyboard:
        - 3D ivory bevels, wood grain reflections, and bottom lip shadows
        - 3D raised ebony black keys with drop shadows and side bevels
        - Authentic exponential grand piano acoustic ring
        ========================================================================
      */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`relative flex-1 overflow-y-auto overflow-x-hidden bg-[#0c0f17] p-2 ${
          isFullscreen ? 'h-[calc(100vh-100px)]' : 'h-[500px] max-h-[640px]'
        }`}
      >
        <div className="relative flex flex-col w-full gap-0.5">
          {display88Keys.map((note) => {
            const isBlack = note.name.includes('#');
            const inRange = isInVocalRange(note.midi);
            const isSung = isSungNote(note.midi);
            const isPlayed = activeMidiNotes.has(note.midi);
            const isLowest = profile.lowestNote.midi === note.midi;
            const isHighest = profile.highestNote.midi === note.midi;
            const isMiddle = profile.middleRegisterNote?.midi === note.midi;
            const isTarget = targetMidi === note.midi;

            if (isBlack) {
              // 3D Ebony Black Key (Raised with deep side bevel and cast shadow)
              return (
                <div
                  key={`vert-key-${note.midi}`}
                  style={{ height: `${keyHeight}px` }}
                  className="relative w-full flex items-center"
                >
                  <button
                    onPointerDown={() => handlePlayNote(note.midi)}
                    className={`relative z-20 h-full w-[70%] max-w-sm rounded-r-lg border-y border-r border-black flex items-center justify-between px-3 transition-all active:scale-[0.98] ${
                      isSung
                        ? 'bg-emerald-400 text-slate-950 font-bold ring-2 ring-emerald-300 shadow-[0_0_15px_#34d399]'
                        : isPlayed
                        ? 'bg-gradient-to-r from-[#0a0a0c] via-[#202028] to-[#121214] text-white shadow-inner scale-[0.99]'
                        : isTarget
                        ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 text-white ring-2 ring-amber-400 shadow-lg'
                        : inRange
                        ? 'bg-gradient-to-r from-[#1c1c1e] via-[#2d2d30] to-[#121214] text-slate-300 shadow-[2px_3px_8px_rgba(0,0,0,0.7)] hover:brightness-110'
                        : 'bg-gradient-to-r from-[#101012] via-[#1a1a1c] to-[#0c0c0e] text-slate-600 shadow-md opacity-60'
                    }`}
                  >
                    {/* Left: Sharp symbol and formatted note name */}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm bg-black/80 border border-slate-700 flex items-center justify-center font-mono text-[9px] text-indigo-300 font-bold">
                        ♯
                      </div>
                      <span className="font-mono text-xs font-bold tracking-tight">
                        {formatNoteName(note, notation)}
                      </span>
                    </div>

                    {/* Right: Frequency & Range badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        {Math.round(note.frequency)} {t.hzUnit}
                      </span>
                      {isHighest && (
                        <span className="px-1.5 py-0.2 rounded bg-pink-500/30 text-pink-300 text-[9px] font-mono font-bold border border-pink-500/50">
                          {t.maxBadge}
                        </span>
                      )}
                      {isLowest && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-300 text-[9px] font-mono font-bold border border-cyan-500/50">
                          {t.minBadge}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Right side background plate */}
                  <div className="flex-1 h-full bg-slate-900/40 border-b border-slate-900 pointer-events-none" />
                </div>
              );
            }

            // 3D Ivory White Key (Full width with realistic bevels and wood shadow)
            return (
              <button
                key={`vert-key-${note.midi}`}
                onPointerDown={() => handlePlayNote(note.midi)}
                style={{ height: `${keyHeight}px` }}
                className={`relative w-full rounded-r-xl border-b border-r flex items-center justify-between px-3 transition-all active:scale-[0.99] ${
                  isSung
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 font-bold ring-4 ring-emerald-300/80 shadow-[0_0_20px_#10b981] z-10'
                    : isPlayed
                    ? 'bg-gradient-to-r from-[#d8d5cb] to-[#c2bfb5] text-slate-900 shadow-inner z-10'
                    : isTarget
                    ? 'bg-gradient-to-r from-amber-100 to-amber-200 text-slate-900 ring-2 ring-amber-400 shadow-md z-10'
                    : inRange
                    ? 'bg-gradient-to-r from-[#ffffff] via-[#f7f6f2] to-[#e8e5dc] text-slate-900 border-slate-400/80 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.22)] hover:brightness-105'
                    : 'bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 text-slate-600 border-slate-500 opacity-60'
                }`}
              >
                {/* Left Side: Note Name and Octave */}
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-black tracking-tight text-slate-950">
                    {formatNoteName(note, notation)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600">
                    ({Math.round(note.frequency)} {t.hzUnit})
                  </span>
                </div>

                {/* Right Side: Vocal Range Badges */}
                <div className="flex items-center gap-1.5">
                  {isLowest && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black shadow">
                      {t.minBadge}
                    </span>
                  )}
                  {isHighest && (
                    <span className="px-2 py-0.5 rounded-full bg-pink-600 text-white text-[9px] font-black shadow">
                      {t.maxBadge}
                    </span>
                  )}
                  {isMiddle && !isLowest && !isHighest && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black shadow">
                      {t.midBadge}
                    </span>
                  )}

                  {/* Octave indicator */}
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {t.octave} {note.octave}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 
        ========================================================================
        BOTTOM BAR: CLASSIC RED VELVET CUSHION (Exact layout from the photo!)
        Labeled "VocalMaster Grand" (NO mention of "Real Piano"!)
        Includes live microphone pitch tracking readout.
        ========================================================================
      */}
      <div className={`w-full py-2.5 px-4 flex items-center justify-between text-xs ${themeConfig.cushionBg}`}>
        <div className="flex items-center gap-2">
          <span className={`font-serif tracking-widest text-sm ${themeConfig.cushionText}`}>
            {isAr ? themeConfig.cushionTitleAr : themeConfig.cushionTitleEn}
          </span>
          <span className="text-[11px] text-white/70 font-mono hidden sm:inline">
            • {profile.voiceType} ({formatNoteName(profile.lowestNote, notation)} – {formatNoteName(profile.highestNote, notation)})
          </span>
        </div>

        {/* Live Pitch Readout / Microphone Feedback */}
        {currentPitch?.note ? (
          <div className="flex items-center gap-2 bg-black/40 border border-white/20 text-white px-3 py-1 rounded-full font-mono text-xs animate-pulse">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">{formatNoteName(currentPitch.note, notation)}</span>
            <span>({Math.round(currentPitch.frequency || 0)} {t.hzUnit})</span>
            <span className={currentPitch.isInTune ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
              {currentPitch.cents > 0 ? `+${currentPitch.cents}` : currentPitch.cents}¢
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-white/70 italic hidden sm:inline">
            {t.singPrompt}
          </span>
        )}
      </div>
    </div>
  );
};

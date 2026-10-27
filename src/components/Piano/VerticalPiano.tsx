import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Volume2, Target, Music, Mic, Layers, ArrowUp, ArrowDown, Sparkles, Eye, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { NoteInfo, VocalRangeProfile, PitchDetectionResult, AppLanguage, NotationSystem } from '../../types/vocal';
import { midiToNoteInfo, formatNoteName } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { translations } from '../../utils/i18n';
import { haptics } from '../../utils/haptics';

interface VerticalPianoProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language?: AppLanguage;
  notation?: NotationSystem;
  onSelectRangeProfile?: (profile: VocalRangeProfile) => void;
  targetMidi?: number | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const VerticalPiano: React.FC<VerticalPianoProps> = ({
  profile,
  currentPitch,
  language = 'en',
  notation = 'english',
  targetMidi,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const t = translations[language];
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeMidiNotes, setActiveMidiNotes] = useState<Set<number>>(new Set());
  const [viewScope, setViewScope] = useState<'vocalRange' | 'c2_c6' | 'full'>('vocalRange');
  const [keyHeight, setKeyHeight] = useState<number>(isFullscreen ? 32 : 25);

  const { minMidi, maxMidi } = useMemo(() => {
    if (viewScope === 'vocalRange') {
      const min = Math.max(24, profile.lowestNote.midi - 3);
      const max = Math.min(108, profile.highestNote.midi + 3);
      return { minMidi: min, maxMidi: max };
    } else if (viewScope === 'c2_c6') {
      return { minMidi: 36, maxMidi: 84 };
    } else {
      return { minMidi: 24, maxMidi: 96 };
    }
  }, [viewScope, profile]);

  const notes = useMemo(() => {
    const list: NoteInfo[] = [];
    for (let midi = minMidi; midi <= maxMidi; midi++) {
      list.push(midiToNoteInfo(midi));
    }
    return list.reverse();
  }, [minMidi, maxMidi]);

  useEffect(() => {
    if (containerRef.current) {
      const middleMidi = profile.middleRegisterNote?.midi || 60;
      const index = notes.findIndex((n) => n.midi === middleMidi);
      if (index !== -1) {
        const targetScroll = Math.max(0, index * keyHeight - containerRef.current.clientHeight / 2 + keyHeight);
        containerRef.current.scrollTop = targetScroll;
      }
    }
  }, [viewScope, keyHeight]);

  const handlePlayNote = async (midi: number) => {
    haptics.tap();
    const note = midiToNoteInfo(midi);
    setActiveMidiNotes((prev) => new Set(prev).add(midi));
    try {
      await audioEngine.playTone(note.frequency, 0.85);
    } finally {
      setTimeout(() => {
        setActiveMidiNotes((prev) => {
          const next = new Set(prev);
          next.delete(midi);
          return next;
        });
      }, 250);
    }
  };

  const isInVocalRange = (midi: number) => {
    return midi >= profile.lowestNote.midi && midi <= profile.highestNote.midi;
  };

  const isSungNote = (midi: number) => {
    return currentPitch?.note?.midi === midi && (currentPitch.clarity ?? 0) > 0.65;
  };

  const livePitchPositionPct = useMemo(() => {
    if (!currentPitch?.frequency || !currentPitch.note) return null;
    const midi = currentPitch.note.midi + (currentPitch.cents / 100);
    if (midi < minMidi || midi > maxMidi) return null;
    const totalRange = maxMidi - minMidi;
    const progressFromBottom = (midi - minMidi) / totalRange;
    return (1 - progressFromBottom) * 100;
  }, [currentPitch, minMidi, maxMidi]);

  return (
    <div className={`flex flex-col bg-slate-950 rounded-3xl border border-slate-800/90 overflow-hidden shadow-2xl select-none ${isFullscreen ? 'h-screen fixed inset-0 z-50 rounded-none' : 'h-full'}`}>
      {/* Top Toolbar */}
      <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{t.verticalPiano}</span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] border border-indigo-500/30">
                {profile.voiceType}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {t.lowNotes} ↗ {t.highNotes}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setKeyHeight((h) => Math.max(16, h - 3))}
              aria-label="Decrease key height"
              className="p-1 hover:text-white text-slate-400 rounded transition"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[10px] font-mono text-slate-400">{keyHeight}px</span>
            <button
              onClick={() => setKeyHeight((h) => Math.min(42, h + 3))}
              aria-label="Increase key height"
              className="p-1 hover:text-white text-slate-400 rounded transition"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scope selector */}
          <div className="flex bg-slate-800/90 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setViewScope('vocalRange')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                viewScope === 'vocalRange' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.myRange}
            </button>
            <button
              onClick={() => setViewScope('c2_c6')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                viewScope === 'c2_c6' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              C2–C6
            </button>
          </div>

          {/* Fullscreen toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                isFullscreen
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isFullscreen ? t.exitFullscreen : t.fullscreen}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? t.exitFullscreen : t.fullscreen}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Pitch Readout Bar */}
      <div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span>{t.direction}:</span>
          <span className="flex items-center gap-1 text-indigo-300 font-medium">
            <ArrowDown className="w-3 h-3 text-cyan-400" /> {t.lowNotes}
            <span className="text-slate-600">•</span>
            <ArrowUp className="w-3 h-3 text-pink-400" /> {t.highNotes}
          </span>
        </div>

        {currentPitch?.note ? (
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono text-[11px] animate-pulse">
            <Mic className="w-3 h-3 text-emerald-400" />
            <span className="font-bold">{formatNoteName(currentPitch.note, notation)}</span>
            <span>({Math.round(currentPitch.frequency || 0)}Hz)</span>
            <span className={currentPitch.isInTune ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {currentPitch.cents > 0 ? `+${currentPitch.cents}` : currentPitch.cents}¢
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500 italic">{t.singPrompt}</span>
        )}
      </div>

      {/* Main Vertical Keyboard Track */}
      <div
        ref={containerRef}
        className={`relative flex-1 overflow-y-auto overflow-x-hidden p-2 ${isFullscreen ? 'min-h-[500px]' : 'min-h-[420px] max-h-[640px]'}`}
      >
        <div className="relative flex flex-col w-full">
          {notes.map((note) => {
            const isBlack = note.name.includes('#');
            const inRange = isInVocalRange(note.midi);
            const isSung = isSungNote(note.midi);
            const isPlayed = activeMidiNotes.has(note.midi);
            const isLowest = profile.lowestNote.midi === note.midi;
            const isHighest = profile.highestNote.midi === note.midi;
            const isMiddle = profile.middleRegisterNote?.midi === note.midi;
            const isTarget = targetMidi === note.midi;

            return (
              <div
                key={`vert-${note.midi}`}
                style={{ height: `${keyHeight}px` }}
                onPointerDown={() => handlePlayNote(note.midi)}
                className={`group relative flex items-center justify-between px-3 cursor-pointer border-b border-slate-900/80 transition-all ${
                  isSung
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md z-20'
                    : isPlayed
                    ? 'bg-indigo-500 text-white font-bold z-20'
                    : isTarget
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : isBlack
                    ? inRange
                      ? 'bg-slate-900/95 hover:bg-slate-800 text-indigo-300'
                      : 'bg-slate-950/90 text-slate-600 opacity-60'
                    : inRange
                    ? 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-100'
                    : 'bg-slate-900/40 text-slate-500 opacity-50'
                }`}
              >
                {/* Left Side: Piano Key Representation */}
                <div className="flex items-center gap-2 z-10">
                  <div
                    className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center font-mono text-[8px] font-bold ${
                      isBlack
                        ? 'bg-slate-950 border border-slate-700 text-slate-300'
                        : 'bg-slate-200 text-slate-900'
                    }`}
                  >
                    {isBlack ? '♯' : ''}
                  </div>

                  {/* Note Name according to active notation */}
                  <div className="flex items-baseline gap-1.5">
                    <span className={`font-mono text-xs font-bold ${isBlack ? 'text-indigo-300' : 'text-slate-100'}`}>
                      {formatNoteName(note, notation)}
                    </span>
                    <span className="text-[10px] font-mono opacity-60">
                      {Math.round(note.frequency)} Hz
                    </span>
                  </div>
                </div>

                {/* Right Side: Badges */}
                <div className="flex items-center gap-1.5 z-10">
                  {isHighest && (
                    <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[9px] font-bold">
                      {t.topMax}
                    </span>
                  )}
                  {isLowest && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold">
                      {t.bottomMin}
                    </span>
                  )}
                  {isMiddle && !isLowest && !isHighest && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-bold">
                      {t.midRegister}
                    </span>
                  )}
                  {isTarget && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[9px] font-bold animate-pulse">
                      {t.target}
                    </span>
                  )}

                  {isSung && currentPitch && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold">
                      <span>{t.hit}</span>
                      <span>{currentPitch.cents > 0 ? `+${currentPitch.cents}` : currentPitch.cents}¢</span>
                    </div>
                  )}
                </div>

                {inRange && (
                  <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-r from-transparent to-indigo-500/50" />
                )}
              </div>
            );
          })}

          {/* Floating Pitch Ribbon Line */}
          {livePitchPositionPct !== null && (
            <div
              className="absolute left-0 right-0 pointer-events-none z-30 transition-all duration-75 ease-out flex items-center"
              style={{ top: `${livePitchPositionPct}%` }}
            >
              <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399]" />
              <div className="absolute right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono text-[10px] font-black shadow-lg shadow-emerald-500/50 flex items-center gap-1 -translate-y-1/2">
                <Mic className="w-3 h-3" />
                <span>{formatNoteName(currentPitch?.note || null, notation)}</span>
                <span>{currentPitch?.cents && currentPitch.cents > 0 ? `+${currentPitch.cents}` : currentPitch?.cents}¢</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer helper */}
      <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
        <span>{t.lowNotes} (Bottom) ↗ {t.highNotes} (Top)</span>
        <button
          onClick={() => {
            if (containerRef.current) {
              const middleMidi = profile.middleRegisterNote?.midi || 60;
              const index = notes.findIndex((n) => n.midi === middleMidi);
              if (index !== -1) {
                containerRef.current.scrollTo({
                  top: Math.max(0, index * keyHeight - containerRef.current.clientHeight / 2),
                  behavior: 'smooth',
                });
              }
            }
          }}
          className="text-cyan-400 hover:text-cyan-300 font-semibold"
        >
          {t.centerMid}
        </button>
      </div>
    </div>
  );
};

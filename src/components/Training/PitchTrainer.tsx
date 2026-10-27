import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Trophy, RotateCcw, Target, Radio, Play, Pause, Flame } from 'lucide-react';
import { NoteInfo, PitchDetectionResult, VocalRangeProfile, PracticeSessionRecord } from '../../types/vocal';
import { midiToNoteInfo, frequencyToNote, generateNotesRange } from '../../utils/noteUtils';
import { audioEngine } from '../../audio/audioEngine';
import { haptics } from '../../utils/haptics';

interface PitchTrainerProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  onRecordSession: (session: PracticeSessionRecord) => void;
}

export const PitchTrainer: React.FC<PitchTrainerProps> = ({
  profile,
  currentPitch,
  onRecordSession,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pitchHistoryRef = useRef<Array<{ freq: number | null; cents: number; isInTune: boolean }>>([]);

  // Training mode: 'free_tuner' | 'target_match'
  const [mode, setMode] = useState<'free_tuner' | 'target_match'>('target_match');

  // Target note state
  const [targetMidi, setTargetMidi] = useState<number>(profile.middleRegisterNote.midi);
  const targetNote = midiToNoteInfo(targetMidi);

  // Target match sustained score
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 1
  const [scoreStreak, setScoreStreak] = useState(0);
  const [notesCompleted, setNotesCompleted] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const sessionStartTime = useRef(Date.now());

  // Available notes for trainer (restricted within vocal range)
  const availableNotes = React.useMemo(() => {
    return generateNotesRange(profile.lowestNote.midi, profile.highestNote.midi);
  }, [profile]);

  // Target match detection logic
  useEffect(() => {
    if (mode !== 'target_match') return;

    const isCurrentInTune =
      currentPitch?.note?.midi === targetMidi &&
      Math.abs(currentPitch?.cents ?? 100) <= 14 &&
      (currentPitch?.clarity ?? 0) > 0.65;

    if (isCurrentInTune) {
      setHoldProgress((prev) => {
        const next = prev + 0.05;
        if (next >= 1) {
          // Success! Target completed
          haptics.pitchMatch();
          audioEngine.playSuccessChime();
          setScoreStreak((s) => s + 1);
          setNotesCompleted((c) => c + 1);
          setTotalAttempts((a) => a + 1);

          // Pick next random note within range
          setTimeout(() => {
            const nextIdx = Math.floor(Math.random() * availableNotes.length);
            setTargetMidi(availableNotes[nextIdx].midi);
            setHoldProgress(0);
          }, 350);

          return 0;
        }
        return next;
      });
    } else {
      setHoldProgress((prev) => Math.max(0, prev - 0.03));
    }
  }, [currentPitch, targetMidi, mode, availableNotes]);

  // Canvas Scrolling Pitch Ribbon Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderRibbon = () => {
      // Add current pitch to history
      pitchHistoryRef.current.push({
        freq: currentPitch?.frequency || null,
        cents: currentPitch?.cents || 0,
        isInTune: currentPitch?.isInTune || false,
      });

      if (pitchHistoryRef.current.length > 150) {
        pitchHistoryRef.current.shift();
      }

      const width = canvas.width;
      const height = canvas.height;

      // Dark background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // Draw Grid Lines (Semis & Octaves)
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.lineWidth = 1;
      for (let y = 20; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Target Note Line
      const targetCenterY = height / 2;
      ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.fillRect(0, targetCenterY - 14, width, 28);

      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, targetCenterY);
      ctx.lineTo(width, targetCenterY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw User Pitch Ribbon Trajectory
      const history = pitchHistoryRef.current;
      const stepX = width / 150;

      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1];
        const curr = history[i];

        if (curr.freq && prev.freq) {
          // Calculate Y relative to target note
          // 1 semitone is approximately 25px
          const prevCentsDiff = (prev.cents || 0);
          const currCentsDiff = (curr.cents || 0);

          const prevY = targetCenterY - (prevCentsDiff * 0.7);
          const currY = targetCenterY - (currCentsDiff * 0.7);

          const x1 = (i - 1) * stepX;
          const x2 = i * stepX;

          ctx.beginPath();
          ctx.moveTo(x1, Math.max(10, Math.min(height - 10, prevY)));
          ctx.lineTo(x2, Math.max(10, Math.min(height - 10, currY)));

          // Color by accuracy
          if (Math.abs(curr.cents) <= 12) {
            ctx.strokeStyle = '#34d399'; // Emerald
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 8;
          } else if (Math.abs(curr.cents) <= 25) {
            ctx.strokeStyle = '#fbbf24'; // Amber
            ctx.shadowBlur = 0;
          } else {
            ctx.strokeStyle = '#f43f5e'; // Rose
            ctx.shadowBlur = 0;
          }

          ctx.lineWidth = 3.5;
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;

      // Draw Target Ball at current lead edge
      if (currentPitch?.note) {
        const leadX = width - 20;
        const leadY = targetCenterY - (currentPitch.cents * 0.7);

        ctx.beginPath();
        ctx.arc(leadX, Math.max(12, Math.min(height - 12, leadY)), 8, 0, Math.PI * 2);
        ctx.fillStyle = currentPitch.isInTune ? '#10b981' : '#f59e0b';
        ctx.shadowColor = currentPitch.isInTune ? '#10b981' : '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(renderRibbon);
    };

    animId = requestAnimationFrame(renderRibbon);
    return () => cancelAnimationFrame(animId);
  }, [currentPitch, targetMidi]);

  const playReferenceTone = async () => {
    haptics.tap();
    setIsPlayingReference(true);
    await audioEngine.playTone(targetNote.frequency, 1.5, 'piano');
    setIsPlayingReference(false);
  };

  const nextRandomNote = () => {
    haptics.tap();
    const nextIdx = Math.floor(Math.random() * availableNotes.length);
    setTargetMidi(availableNotes[nextIdx].midi);
    setHoldProgress(0);
  };

  const endSession = () => {
    const durationSeconds = Math.max(10, Math.round((Date.now() - sessionStartTime.current) / 1000));
    const attempted = Math.max(1, totalAttempts + 1);
    const accuracy = Math.round((notesCompleted / attempted) * 100);

    const record: PracticeSessionRecord = {
      id: `pitch-train-${Date.now()}`,
      timestamp: Date.now(),
      exerciseTitle: 'Real-time Pitch Matching',
      durationSeconds,
      notesAttempted: attempted,
      notesHitInTune: notesCompleted,
      accuracyPercentage: Math.min(100, accuracy),
      averageCentsError: 7,
      dateString: 'Just now',
    };

    onRecordSession(record);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl flex flex-col gap-4 max-w-xl mx-auto">
      {/* Header & Mode Switch */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Interactive Pitch Engine</h2>
            <p className="text-xs text-slate-400">Real-time YIN pitch detection & precision tuner</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setMode('target_match')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              mode === 'target_match' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Target Match
          </button>
          <button
            onClick={() => setMode('free_tuner')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              mode === 'free_tuner' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Chromatic Tuner
          </button>
        </div>
      </div>

      {/* Target Note Banner (in Target Match mode) */}
      {mode === 'target_match' && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-950 to-slate-900 p-4 rounded-2xl border border-indigo-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={playReferenceTone}
              disabled={isPlayingReference}
              className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-950/60 transition active:scale-95 shrink-0"
              aria-label="Play reference audio tone"
            >
              <Volume2 className={`w-5 h-5 ${isPlayingReference ? 'animate-pulse' : ''}`} />
            </button>
            <div>
              <div className="text-[10px] uppercase font-bold text-indigo-400">Target Note</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">{targetNote.fullName}</span>
                <span className="text-xs text-slate-400 font-mono">({Math.round(targetNote.frequency)} Hz)</span>
              </div>
            </div>
          </div>

          {/* Quick Note Selector Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={targetMidi}
              onChange={(e) => {
                setTargetMidi(Number(e.target.value));
                setHoldProgress(0);
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono"
            >
              {availableNotes.map((n) => (
                <option key={n.midi} value={n.midi}>
                  {n.fullName} ({Math.round(n.frequency)}Hz)
                </option>
              ))}
            </select>
            <button
              onClick={nextRandomNote}
              title="Next Random Note"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Real-Time Pitch Ribbon Canvas Visualizer */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
          className="w-full h-40 block"
        />

        {/* Live Centered Note Overlay */}
        <div className="absolute top-2 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${currentPitch?.note ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
          <span className="font-mono text-slate-300">
            {currentPitch?.note ? `${currentPitch.note.fullName} (${currentPitch.frequency} Hz)` : 'Sing to track pitch'}
          </span>
        </div>

        {/* Cents deviation indicator top right */}
        {currentPitch?.note && (
          <div
            className={`absolute top-2 right-3 px-2 py-1 rounded-lg text-xs font-mono font-bold border backdrop-blur-md ${
              currentPitch.isInTune
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
            }`}
          >
            {currentPitch.cents > 0 ? `+${currentPitch.cents}` : currentPitch.cents} cents
          </div>
        )}
      </div>

      {/* Target Match Hold Progress (when in target mode) */}
      {mode === 'target_match' && (
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Match & Sustain Target Pitch:</span>
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <Flame className="w-3.5 h-3.5" />
              <span>Streak: {scoreStreak}</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-2.5 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${Math.min(100, Math.round(holdProgress * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Precision Tuner Gauge (-50 to +50 cents) */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col items-center">
        {/* Note display */}
        <div className="text-4xl font-black text-white font-mono-numbers">
          {currentPitch?.note ? currentPitch.note.fullName : '—'}
        </div>

        {/* Cents meter bar */}
        <div className="w-full max-w-xs mt-3">
          <div className="relative h-6 bg-slate-900 rounded-full border border-slate-800 flex items-center px-1 overflow-hidden">
            {/* Center target zone (+/- 10 cents) */}
            <div className="absolute left-1/2 -translate-x-1/2 w-8 h-full bg-emerald-500/20 border-x border-emerald-500/40" />
            <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-indigo-500" />

            {/* Needle / Ball */}
            {currentPitch?.note && (
              <div
                className={`absolute w-4 h-4 rounded-full shadow-lg transition-all duration-75 -translate-x-1/2 ${
                  currentPitch.isInTune
                    ? 'bg-emerald-400 ring-4 ring-emerald-500/30'
                    : 'bg-amber-400 ring-2 ring-amber-500/30'
                }`}
                style={{
                  left: `${Math.max(5, Math.min(95, 50 + (currentPitch.cents / 50) * 45))}%`,
                }}
              />
            )}
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 px-1">
            <span>-50¢ (Flat)</span>
            <span className="text-emerald-400 font-bold">0¢ In-Tune</span>
            <span>+50¢ (Sharp)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

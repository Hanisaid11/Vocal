import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Maximize2, Minimize2, Sliders, Volume2, Globe, Music } from 'lucide-react';
import { VocalRangeProfile, PitchDetectionResult, AppLanguage, NotationSystem, InstrumentType } from '../../types/vocal';
import { VerticalPiano } from './VerticalPiano';
import { HorizontalPiano } from './HorizontalPiano';
import { translations, INSTRUMENT_NAMES, NOTATION_OPTIONS } from '../../utils/i18n';
import { audioEngine } from '../../audio/audioEngine';
import { haptics } from '../../utils/haptics';

interface PianoViewProps {
  profile: VocalRangeProfile;
  currentPitch: PitchDetectionResult | null;
  language?: AppLanguage;
  notation?: NotationSystem;
  instrument?: InstrumentType;
  autoVerticalOnFullscreen?: boolean;
  onSelectRangeProfile?: (profile: VocalRangeProfile) => void;
  targetMidi?: number | null;
  onChangeNotation?: (notation: NotationSystem) => void;
  onChangeInstrument?: (instrument: InstrumentType) => void;
  onOpenSettings?: () => void;
}

export const PianoView: React.FC<PianoViewProps> = ({
  profile,
  currentPitch,
  language = 'en',
  notation = 'english',
  instrument = 'piano',
  autoVerticalOnFullscreen = true,
  onSelectRangeProfile,
  targetMidi,
  onChangeNotation,
  onChangeInstrument,
  onOpenSettings,
}) => {
  const t = translations[language];
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInstrumentMenu, setShowInstrumentMenu] = useState(false);
  const [showNotationMenu, setShowNotationMenu] = useState(false);

  // Monitor browser fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (isFs && autoVerticalOnFullscreen) {
        setOrientation('vertical');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [autoVerticalOnFullscreen]);

  const toggleFullscreen = async () => {
    haptics.tap();
    try {
      if (!document.fullscreenElement) {
        if (autoVerticalOnFullscreen) {
          setOrientation('vertical');
        }
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      }
    } catch {
      // Fallback to internal fullscreen container state
      setIsFullscreen((prev) => {
        const next = !prev;
        if (next && autoVerticalOnFullscreen) {
          setOrientation('vertical');
        }
        return next;
      });
    }
  };

  const handleSelectInstrument = (inst: InstrumentType) => {
    haptics.tap();
    audioEngine.setInstrument(inst);
    if (onChangeInstrument) {
      onChangeInstrument(inst);
    }
    setShowInstrumentMenu(false);
    // Play audition note
    audioEngine.playTone(440, 0.4);
  };

  const handleSelectNotation = (not: NotationSystem) => {
    haptics.tap();
    if (onChangeNotation) {
      onChangeNotation(not);
    }
    setShowNotationMenu(false);
  };

  return (
    <div className={`flex flex-col gap-2.5 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#090d16] p-2' : ''}`}>
      {/* Top Layout & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {/* Left: Quick instrument & notation quick switch */}
        <div className="flex items-center gap-1.5 relative">
          {/* Instrument Pill */}
          <div className="relative">
            <button
              onClick={() => {
                setShowInstrumentMenu(!showInstrumentMenu);
                setShowNotationMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 hover:text-white hover:bg-slate-800 transition"
              title={t.instrumentLabel}
            >
              <span>{INSTRUMENT_NAMES[instrument]?.icon}</span>
              <span className="font-semibold text-[11px] hidden sm:inline">
                {INSTRUMENT_NAMES[instrument]?.[language]}
              </span>
            </button>

            {showInstrumentMenu && (
              <div className="absolute top-full mt-1.5 left-0 z-50 w-52 bg-slate-900 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2.5 py-1 border-b border-slate-800">
                  {t.instrumentLabel}
                </div>
                {(Object.keys(INSTRUMENT_NAMES) as InstrumentType[]).map((instKey) => {
                  const inst = INSTRUMENT_NAMES[instKey];
                  const isSelected = instrument === instKey;
                  return (
                    <button
                      key={instKey}
                      onClick={() => handleSelectInstrument(instKey)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-left transition ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{inst.icon}</span>
                      <span className="flex-1">{inst[language]}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notation Pill */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotationMenu(!showNotationMenu);
                setShowInstrumentMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 hover:text-white hover:bg-slate-800 transition"
              title={t.notationLabel}
            >
              <Music className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-[11px]">
                {notation === 'english' ? 'C D E' : notation === 'solfege' ? 'Do Re Mi' : 'دو ري مي'}
              </span>
            </button>

            {showNotationMenu && (
              <div className="absolute top-full mt-1.5 left-0 z-50 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2.5 py-1 border-b border-slate-800">
                  {t.notationLabel}
                </div>
                {(Object.keys(NOTATION_OPTIONS) as NotationSystem[]).map((notKey) => {
                  const not = NOTATION_OPTIONS[notKey];
                  const isSelected = notation === notKey;
                  return (
                    <button
                      key={notKey}
                      onClick={() => handleSelectNotation(notKey)}
                      className={`w-full flex flex-col items-start px-2.5 py-2 rounded-xl text-xs text-left transition ${
                        isSelected
                          ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{not[language]}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5">{not.example}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Layout switcher (Vertical vs Horizontal) + Fullscreen */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Orientation switch */}
          <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                haptics.tap();
                setOrientation('vertical');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition ${
                orientation === 'vertical'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={t.verticalPiano}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="text-[11px]">{language === 'ar' ? 'رأسي' : 'Vertical'}</span>
            </button>
            <button
              onClick={() => {
                haptics.tap();
                setOrientation('horizontal');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition ${
                orientation === 'horizontal'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={t.horizontalPiano}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="text-[11px]">{language === 'ar' ? 'أفقي' : 'Horizontal'}</span>
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
              isFullscreen
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={isFullscreen ? t.exitFullscreen : t.fullscreen}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">{isFullscreen ? t.exitFullscreen : t.fullscreen}</span>
          </button>

          {/* Settings shortcut */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={t.settings}
              aria-label={t.settings}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Render Active Layout */}
      {orientation === 'vertical' ? (
        <VerticalPiano
          profile={profile}
          currentPitch={currentPitch}
          language={language}
          notation={notation}
          onSelectRangeProfile={onSelectRangeProfile}
          targetMidi={targetMidi}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      ) : (
        <HorizontalPiano
          profile={profile}
          currentPitch={currentPitch}
          language={language}
          notation={notation}
          onSelectRangeProfile={onSelectRangeProfile}
        />
      )}
    </div>
  );
};

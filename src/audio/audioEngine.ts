import { PitchDetectionResult } from '../types/vocal';
import { frequencyToNote } from '../utils/noteUtils';
import { PitchDetector } from './pitchDetection';

export type PitchCallback = (result: PitchDetectionResult) => void;

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private pitchDetector: PitchDetector | null = null;
  private isListening = false;
  private animationFrameId: number | null = null;
  private pitchListeners: Set<PitchCallback> = new Set();

  private timeBuffer: Float32Array<ArrayBuffer> | null = null;
  private freqBuffer: Uint8Array<ArrayBuffer> | null = null;

  // Master output gain for synthesizer
  private synthGain: GainNode | null = null;
  private currentInstrument: import('../types/vocal').InstrumentType = 'piano';
  private referencePitchA4 = 440;
  private tuningToleranceCents = 12;

  public setInstrument(inst: import('../types/vocal').InstrumentType) {
    this.currentInstrument = inst;
  }

  public getInstrument(): import('../types/vocal').InstrumentType {
    return this.currentInstrument;
  }

  public setReferencePitch(a4: number) {
    this.referencePitchA4 = a4;
  }

  public getReferencePitch(): number {
    return this.referencePitchA4;
  }

  public setTuningTolerance(cents: number) {
    this.tuningToleranceCents = cents;
  }

  public getTuningTolerance(): number {
    return this.tuningToleranceCents;
  }

  /**
   * Initialize or resume the Web Audio Context
   */
  public async getAudioContext(): Promise<AudioContext> {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ latencyHint: 'interactive' });

      this.synthGain = this.audioCtx.createGain();
      this.synthGain.gain.setValueAtTime(0.7, this.audioCtx.currentTime);
      this.synthGain.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    return this.audioCtx;
  }

  /**
   * Request microphone stream and attach pitch analyzer
   */
  public async startListening(): Promise<boolean> {
    try {
      const ctx = await this.getAudioContext();

      if (this.isListening) {
        return true;
      }

      // Android & mobile-friendly constraints
      // Note: noiseSuppression is set to false by default for vocal clarity
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      };

      try {
        this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn('Strict mic constraints failed, falling back to standard audio:', err);
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.05; // Quick response for live pitch

      this.micSource = ctx.createMediaStreamSource(this.micStream);
      this.micSource.connect(this.analyser);

      this.timeBuffer = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));
      this.freqBuffer = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      this.pitchDetector = new PitchDetector(ctx.sampleRate, this.analyser.fftSize, 0.15);

      this.isListening = true;
      this.runDetectionLoop();

      return true;
    } catch (error) {
      console.error('Failed to initialize microphone audio engine:', error);
      this.stopListening();
      throw error;
    }
  }

  /**
   * Stop microphone input and processing loop to save Android battery
   */
  public stopListening() {
    this.isListening = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.pitchDetector) {
      this.pitchDetector.reset();
    }

    // Broadcast silence
    this.notifyListeners({
      frequency: null,
      note: null,
      cents: 0,
      clarity: 0,
      rms: 0,
      spectralCentroid: 0,
      isInTune: false,
      stability: 0,
    });
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Subscribe to real-time pitch updates
   */
  public subscribe(cb: PitchCallback): () => void {
    this.pitchListeners.add(cb);
    return () => {
      this.pitchListeners.delete(cb);
    };
  }

  private notifyListeners(result: PitchDetectionResult) {
    this.pitchListeners.forEach((cb) => cb(result));
  }

  /**
   * High performance continuous detection loop
   */
  private runDetectionLoop = () => {
    if (!this.isListening || !this.analyser || !this.pitchDetector || !this.timeBuffer || !this.freqBuffer) {
      return;
    }

    this.analyser.getFloatTimeDomainData(this.timeBuffer);
    this.analyser.getByteFrequencyData(this.freqBuffer);

    const analysis = this.pitchDetector.detectPitch(this.timeBuffer, this.freqBuffer);

    let noteResult = null;
    let cents = 0;
    let isInTune = false;

    if (analysis.frequency) {
      const conv = frequencyToNote(analysis.frequency, this.referencePitchA4);
      noteResult = conv.note;
      cents = conv.cents;
      isInTune = Math.abs(cents) <= this.tuningToleranceCents;
    }

    const result: PitchDetectionResult = {
      frequency: analysis.frequency,
      note: noteResult,
      cents,
      clarity: analysis.clarity,
      rms: analysis.rms,
      spectralCentroid: analysis.spectralCentroid,
      isInTune,
      stability: analysis.clarity > 0.85 ? 1 : analysis.clarity,
    };

    this.notifyListeners(result);

    this.animationFrameId = requestAnimationFrame(this.runDetectionLoop);
  };

  /**
   * Synthesize acoustic vocal reference tone with selectable instrument timbres
   */
  public async playTone(
    frequency: number,
    durationSeconds: number = 1.0,
    instrument?: import('../types/vocal').InstrumentType
  ) {
    const type = instrument || this.currentInstrument || 'piano';
    const ctx = await this.getAudioContext();
    const now = ctx.currentTime;

    const masterNoteGain = ctx.createGain();
    masterNoteGain.gain.setValueAtTime(0.0001, now);

    // Instrument Filter
    const filter = ctx.createBiquadFilter();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const gain3 = ctx.createGain();

    let attack = 0.02;
    let decay = 0.15;
    let sustain = 0.6;
    let release = 0.25;
    let peakVolume = 0.65;

    if (type === 'oud') {
      // Arabic Oud: authentic double-course strings with wooden bowl resonance
      filter.type = 'peaking';
      filter.frequency.setValueAtTime(650, now);
      filter.Q.setValueAtTime(2.2, now);
      filter.gain.setValueAtTime(6.0, now);

      // Course string 1 & Course string 2 slightly detuned by +0.8 cents
      osc1.type = 'triangle';
      osc2.type = 'sawtooth';
      osc3.type = 'sine';

      osc1.frequency.setValueAtTime(frequency, now);
      osc2.frequency.setValueAtTime(frequency * 1.0006, now); // subtle string pair chorus
      osc3.frequency.setValueAtTime(frequency * 2, now); // 2nd harmonic octave

      gain1.gain.setValueAtTime(0.65, now);
      gain2.gain.setValueAtTime(0.2, now);
      gain3.gain.setValueAtTime(0.15, now);

      // Fast plucked plectrum (risha) attack
      attack = 0.008;
      decay = 0.12;
      sustain = 0.45;
      release = 0.35;
      peakVolume = 0.75;
    } else if (type === 'guitar') {
      // Acoustic Guitar: bright plucked transient and resonant decay
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3600, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + durationSeconds);
      filter.Q.setValueAtTime(1.5, now);

      osc1.type = 'triangle';
      osc2.type = 'sawtooth';
      osc3.type = 'sine';

      osc1.frequency.setValueAtTime(frequency, now);
      osc2.frequency.setValueAtTime(frequency * 2, now);
      osc3.frequency.setValueAtTime(frequency * 3, now);

      gain1.gain.setValueAtTime(0.7, now);
      gain2.gain.setValueAtTime(0.25, now);
      gain3.gain.setValueAtTime(0.08, now);

      attack = 0.01;
      decay = 0.18;
      sustain = 0.4;
      release = 0.3;
      peakVolume = 0.7;
    } else if (type === 'vocal') {
      // Vocal tone: warm formant sine/triangle with subtle vibrato
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(frequency * 4, 3200), now);
      filter.Q.setValueAtTime(1.0, now);

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc3.type = 'sine';

      osc1.frequency.setValueAtTime(frequency, now);
      osc2.frequency.setValueAtTime(frequency, now);
      osc3.frequency.setValueAtTime(frequency * 2, now);

      gain1.gain.setValueAtTime(0.75, now);
      gain2.gain.setValueAtTime(0.2, now);
      gain3.gain.setValueAtTime(0.05, now);

      // Subtle human vibrato
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(5.5, now); // 5.5 Hz vibrato rate
      lfoGain.gain.setValueAtTime(1.8, now); // vibrato depth
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfo.start(now + 0.15);
      lfo.stop(now + durationSeconds + 0.1);

      attack = 0.06;
      decay = 0.1;
      sustain = 0.8;
      release = 0.2;
      peakVolume = 0.6;
    } else if (type === 'strings') {
      // Strings / Cello: smooth bowed attack, rich warm sustained overtones
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, now);
      filter.Q.setValueAtTime(1.4, now);

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc3.type = 'sawtooth';

      osc1.frequency.setValueAtTime(frequency, now);
      osc2.frequency.setValueAtTime(frequency * 1.001, now);
      osc3.frequency.setValueAtTime(frequency * 0.999, now);

      gain1.gain.setValueAtTime(0.4, now);
      gain2.gain.setValueAtTime(0.4, now);
      gain3.gain.setValueAtTime(0.2, now);

      attack = 0.12;
      decay = 0.15;
      sustain = 0.85;
      release = 0.4;
      peakVolume = 0.55;
    } else {
      // Classic Grand Piano
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(frequency * 5, 4500), now);
      filter.Q.setValueAtTime(1.2, now);

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc3.type = 'sine';

      osc1.frequency.setValueAtTime(frequency, now);
      osc2.frequency.setValueAtTime(frequency * 2, now);
      osc3.frequency.setValueAtTime(frequency * 3, now);

      gain1.gain.setValueAtTime(0.7, now);
      gain2.gain.setValueAtTime(0.25, now);
      gain3.gain.setValueAtTime(0.08, now);

      attack = 0.02;
      decay = 0.15;
      sustain = 0.6;
      release = 0.25;
      peakVolume = 0.65;
    }

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);

    gain1.connect(filter);
    gain2.connect(filter);
    gain3.connect(filter);

    filter.connect(masterNoteGain);
    masterNoteGain.connect(this.synthGain || ctx.destination);

    // Natural ADSR Envelope
    masterNoteGain.gain.linearRampToValueAtTime(peakVolume, now + attack);
    masterNoteGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain * peakVolume), now + attack + decay);

    const sustainEndTime = now + Math.max(0.1, durationSeconds - release);
    masterNoteGain.gain.setValueAtTime(Math.max(0.0001, sustain * peakVolume), sustainEndTime);
    masterNoteGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    osc1.stop(now + durationSeconds + 0.1);
    osc2.stop(now + durationSeconds + 0.1);
    osc3.stop(now + durationSeconds + 0.1);

    return durationSeconds;
  }

  /**
   * Play celebratory in-tune chime sound (arpeggiated crystal triad)
   */
  public async playSuccessChime() {
    const ctx = await this.getAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.06 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.4);

      osc.connect(gain);
      gain.connect(this.synthGain || ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.45);
    });
  }

  /**
   * Play a clean rhythmic tick for metronome / countdown
   */
  public async playTick(isAccented: boolean = false) {
    const ctx = await this.getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isAccented ? 1200 : 800, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.synthGain || ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const audioEngine = new AudioEngine();

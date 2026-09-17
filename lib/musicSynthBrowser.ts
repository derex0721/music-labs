export interface PlayOptions {
  arpeggiate?: boolean;
  duration?: number;
  onNote?: (note: string, index: number) => void;
}

export interface ProgressionOptions {
  chordDuration?: number;
  gap?: number;
  onChord?: (notes: string[], index: number) => void;
}

export interface LoopOptions {
  bpm?: number;
  onStep?: (index: number) => void;
}

interface Voice {
  oscillators: OscillatorNode[];
  gain: GainNode;
  start: number;
  peak: number;
  envelope: ADSR;
  releaseAt?: number;
  releaseLevel?: number;
  end?: number;
}

export interface ADSR { attack: number; decay: number; sustain: number; release: number }
const FLOOR = 0.0001;
export function envelopeLevel(time: number, start: number, peak: number, adsr: ADSR): number {
  const age = time - start;
  if (age <= 0) return FLOOR;
  if (age < adsr.attack) return FLOOR + (peak - FLOOR) * age / adsr.attack;
  const sustain = Math.max(FLOOR, peak * adsr.sustain);
  if (age < adsr.attack + adsr.decay) return peak * (sustain / peak) ** ((age - adsr.attack) / adsr.decay);
  return sustain;
}

type AudioContextConstructor = new (options?: AudioContextOptions) => AudioContext;

const PITCH_CLASS: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3,
  E: 4, Fb: 4, "E#": 5, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10,
  B: 11, Cb: 11, "B#": 0,
};

function frequencyFor(note: string): number {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(note);
  if (!match) throw new Error(`Unsupported note: ${note}`);
  const pitch = `${match[1]}${match[2]}`;
  let octave = Number(match[3]);
  if (pitch === "B#") octave += 1;
  if (pitch === "Cb") octave -= 1;
  const midi = (octave + 1) * 12 + PITCH_CLASS[pitch];
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Lightweight Web Audio poly-synth. AudioContext is created only after user input. */
export class MusicSynth {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private heldVoices = new Map<string, Voice>();
  private voices = new Set<Voice>();
  private pendingNotes = new Map<string, object>();
  private disposed = false;
  private generation = 0;
  private loopTimer: number | null = null;
  private drawTimers = new Set<number>();
  private loopGeneration = 0;
  private readonly release: number;
  private readonly outputGain: number;
  private adsr: ADSR;

  constructor({ attack = 0.01, decay = 0.15, sustain = 0.65, release = 0.25, volume = 20 * Math.log10(0.7) } = {}) {
    if (![attack, decay, sustain, release, volume].every(Number.isFinite) || attack < 0 || decay < 0 || release < 0 || sustain < 0 || sustain > 1 || volume > 0) throw new RangeError('Invalid synth parameters');
    this.adsr = { attack: Math.max(0.001, attack), decay: Math.max(0.001, decay), sustain, release: Math.max(0.001, release) };
    this.release = release;
    this.outputGain = 10 ** (volume / 20);
  }

  private async ensureReady(): Promise<AudioContext> {
    if (this.disposed) throw new Error('Synth has been disposed');
    if (this.context?.state === "closed") {
      this.context = null;
      this.master = null;
      this.compressor = null;
    }
    if (!this.context) {
      const AudioCtor = (window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext) as
        | AudioContextConstructor
        | undefined;
      if (!AudioCtor) throw new Error("Web Audio API is not supported by this browser.");
      this.context = new AudioCtor({ latencyHint: "interactive" });
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -10;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.2;
      this.master = this.context.createGain();
      this.master.gain.value = this.outputGain;
      this.master.connect(this.compressor).connect(this.context.destination);
    }
    if (this.context.state !== "running") await this.context.resume();
    if (this.disposed) throw new Error('Synth has been disposed');
    if (this.context.state !== "running") throw new Error(`AudioContext state: ${this.context.state}`);
    document.documentElement.dataset.audioState = this.context.state;
    return this.context;
  }

  async unlock(): Promise<void> {
    const context = await this.ensureReady();
    const silent = context.createBufferSource();
    silent.buffer = context.createBuffer(1, 1, context.sampleRate);
    silent.connect(this.master!);
    silent.onended = () => silent.disconnect();
    silent.start();
  }

  private createVoice(note: string, startTime: number, duration?: number, velocity = 0.7): Voice {
    const context = this.context!;
    if (this.voices.size >= 32) throw new Error('Maximum polyphony reached');
    const frequency = frequencyFor(note);
    const gain = context.createGain();
    const level = Math.max(FLOOR, Math.min(1, velocity) * 0.18);
    const envelope = { ...this.adsr };
    gain.gain.setValueAtTime(FLOOR, startTime);
    gain.gain.linearRampToValueAtTime(level, startTime + envelope.attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(FLOOR, level * envelope.sustain), startTime + envelope.attack + envelope.decay);
    gain.connect(this.master!);

    const triangle = context.createOscillator();
    triangle.type = "triangle";
    triangle.frequency.setValueAtTime(frequency, startTime);
    triangle.connect(gain);
    const voice: Voice = { oscillators: [triangle], gain, start: startTime, peak: level, envelope };
    this.voices.add(voice);
    triangle.onended = () => {
      triangle.disconnect();
      gain.disconnect();
      this.voices.delete(voice);
      for (const [key, held] of this.heldVoices) if (held === voice) this.heldVoices.delete(key);
    };
    triangle.start(startTime);
    if (duration !== undefined) {
      this.releaseVoice(voice, startTime + Math.max(0.001, duration));
    }
    return voice;
  }

  private releaseVoice(voice: Voice, releaseTime: number): void {
    const context = this.context;
    if (!context) return;
    const at = Math.max(context.currentTime, releaseTime);
    if (voice.end !== undefined && at >= voice.end) return;
    const level = voice.releaseAt !== undefined && at >= voice.releaseAt
      ? voice.releaseLevel! * (FLOOR / voice.releaseLevel!) ** ((at - voice.releaseAt) / voice.envelope.release)
      : envelopeLevel(at, voice.start, voice.peak, voice.envelope);
    // Preserve the elapsed ramp when scheduling note-off ahead of audio time.
    voice.gain.gain.cancelScheduledValues(at);
    if (at > context.currentTime && at > voice.start) {
      if (at < voice.start + voice.envelope.attack) voice.gain.gain.linearRampToValueAtTime(level, at);
      else voice.gain.gain.exponentialRampToValueAtTime(Math.max(FLOOR, level), at);
    }
    voice.gain.gain.setValueAtTime(Math.max(FLOOR, level), at);
    voice.releaseAt = at;
    voice.releaseLevel = Math.max(FLOOR, level);
    voice.end = at + voice.envelope.release;
    voice.gain.gain.exponentialRampToValueAtTime(FLOOR, voice.end);
    voice.oscillators.forEach((oscillator) => oscillator.stop(voice.end));
  }

  private scheduleChord(notes: string[], startTime: number, duration: number): void {
    const velocity = 1 / Math.sqrt(Math.max(1, notes.length));
    notes.forEach((note) => this.createVoice(note, startTime, duration, velocity));
  }

  async play(notes: string[], options: PlayOptions = {}): Promise<void> {
    const generation = this.generation;
    const context = await this.ensureReady();
    if (generation !== this.generation) return;
    const { arpeggiate = false, duration = this.release, onNote } = options;
    const start = context.currentTime + 0.012;
    if (!arpeggiate) {
      this.scheduleChord(notes, start, duration);
      notes.forEach((note, index) => onNote?.(note, index));
      return;
    }
    notes.forEach((note, index) => {
      const delay = index * 0.14;
      this.createVoice(note, start + delay, duration, 1 / Math.sqrt(Math.max(1, notes.length)));
      const timer = window.setTimeout(() => {
        onNote?.(note, index);
        this.drawTimers.delete(timer);
      }, delay * 1000);
      this.drawTimers.add(timer);
    });
  }

  async playProgression(chords: string[][], options: ProgressionOptions = {}): Promise<void> {
    const generation = this.generation;
    const context = await this.ensureReady();
    if (generation !== this.generation) return;
    const { chordDuration = 0.82, gap = 0.16, onChord } = options;
    const step = chordDuration + gap;
    const start = context.currentTime + 0.03;
    chords.forEach((notes, index) => {
      this.scheduleChord(notes, start + index * step, chordDuration);
      const timer = window.setTimeout(() => {
        onChord?.(notes, index);
        this.drawTimers.delete(timer);
      }, index * step * 1000);
      this.drawTimers.add(timer);
    });
  }

  async attack(note: string): Promise<void> {
    const pending = {};
    this.pendingNotes.set(note, pending);
    await this.ensureReady();
    if (this.pendingNotes.get(note) !== pending) return;
    this.releaseNote(note);
    this.heldVoices.set(note, this.createVoice(note, this.context!.currentTime + 0.005, undefined, 0.9));
  }

  releaseNote(note: string): void {
    this.pendingNotes.delete(note);
    const voice = this.heldVoices.get(note);
    if (!voice || !this.context) return;
    this.releaseVoice(voice, this.context.currentTime);
    this.heldVoices.delete(note);
  }

  releaseAll(): void {
    this.generation++;
    this.pendingNotes.clear();
    if (!this.context) return;
    this.voices.forEach((voice) => this.releaseVoice(voice, this.context!.currentTime));
    this.heldVoices.clear();
  }

  async startLoop(chords: string[][], options: LoopOptions = {}): Promise<void> {
    if (!chords.length) return;
    const pendingGeneration = this.generation;
    const context = await this.ensureReady();
    if (pendingGeneration !== this.generation) return;
    this.stopLoop();
    const generation = ++this.loopGeneration;
    const bpm = Math.min(240, Math.max(40, options.bpm ?? 100));
    const stepSeconds = 240 / bpm;
    let index = 0;
    let nextStepTime = context.currentTime + 0.06;
    const schedule = () => {
      if (generation !== this.loopGeneration) return;
      while (nextStepTime < context.currentTime + 0.16) {
        const stepIndex = index;
        this.scheduleChord(chords[stepIndex], nextStepTime, Math.min(stepSeconds * 0.82, 2.4));
        const delay = Math.max(0, (nextStepTime - context.currentTime) * 1000);
        const timer = window.setTimeout(() => {
          options.onStep?.(stepIndex);
          this.drawTimers.delete(timer);
        }, delay);
        this.drawTimers.add(timer);
        index = (index + 1) % chords.length;
        nextStepTime += stepSeconds;
      }
    };
    schedule();
    this.loopTimer = window.setInterval(schedule, 25);
  }

  stopLoop(): void {
    this.loopGeneration += 1;
    if (this.loopTimer !== null) window.clearInterval(this.loopTimer);
    this.loopTimer = null;
    this.drawTimers.forEach((timer) => window.clearTimeout(timer));
    this.drawTimers.clear();
    this.releaseAll();
  }

  async init(): Promise<void> { await this.ensureReady(); }
  async noteOn(midi: number, velocity = 0.8): Promise<void> {
    if (!Number.isInteger(midi) || midi < 0 || midi > 127 || !Number.isFinite(velocity)) throw new RangeError('Invalid MIDI note or velocity');
    const note = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][midi % 12] + (Math.floor(midi / 12) - 1);
    if (velocity <= 0) { this.releaseNote(note); return; }
    const pending = {};
    this.pendingNotes.set(note, pending);
    await this.ensureReady();
    if (this.pendingNotes.get(note) !== pending) return;
    this.releaseNote(note);
    this.heldVoices.set(note, this.createVoice(note, this.context!.currentTime, undefined, velocity));
  }
  noteOff(midi: number): void {
    if (!Number.isInteger(midi) || midi < 0 || midi > 127) return;
    this.releaseNote(['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][midi % 12] + (Math.floor(midi / 12) - 1));
  }
  allNotesOff(): void { this.stopLoop(); }
  setADSR(patch: Partial<ADSR>): void {
    const next = { ...this.adsr, ...patch };
    if (!Object.values(next).every(Number.isFinite) || next.attack < 0 || next.decay < 0 || next.release < 0 || next.sustain < 0 || next.sustain > 1) throw new RangeError('Invalid ADSR');
    this.adsr = { ...next, attack: Math.max(0.001,next.attack), decay: Math.max(0.001,next.decay), release: Math.max(0.001,next.release) };
  }
  async dispose(): Promise<void> {
    this.disposed = true;
    this.stopLoop();
    const context = this.context;
    if (context && context.state !== 'closed') await context.close();
    for (const voice of this.voices) { voice.oscillators.forEach(osc => osc.disconnect()); voice.gain.disconnect(); }
    this.voices.clear();
    this.master?.disconnect();
    this.compressor?.disconnect();
  }
}

export { MusicSynth as SynthEngine };

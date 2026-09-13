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
  private loopTimer: number | null = null;
  private drawTimers = new Set<number>();
  private loopGeneration = 0;
  private readonly attackTime: number;
  private readonly release: number;
  private readonly outputGain: number;

  constructor({ attack = 0.018, release = 0.7, volume = -2.85 } = {}) {
    this.attackTime = attack;
    this.release = release;
    this.outputGain = 10 ** (volume / 20);
  }

  private async ensureReady(): Promise<AudioContext> {
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
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 5;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.22;
      this.master = this.context.createGain();
      this.master.gain.value = this.outputGain;
      this.master.connect(this.compressor).connect(this.context.destination);
    }
    if (this.context.state !== "running") await this.context.resume();
    if (this.context.state !== "running") throw new Error(`AudioContext state: ${this.context.state}`);
    document.documentElement.dataset.audioState = this.context.state;
    return this.context;
  }

  async unlock(): Promise<void> {
    const context = await this.ensureReady();
    const silent = context.createBufferSource();
    silent.buffer = context.createBuffer(1, 1, context.sampleRate);
    silent.connect(this.master!);
    silent.start();
  }

  private createVoice(note: string, startTime: number, duration?: number, velocity = 0.7): Voice {
    const context = this.context!;
    const frequency = frequencyFor(note);
    const gain = context.createGain();
    const level = Math.max(0.025, Math.min(0.18, velocity * 0.18));
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(4200, startTime);
    filter.Q.setValueAtTime(0.7, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(level, startTime + this.attackTime);
    gain.gain.exponentialRampToValueAtTime(level * 0.58, startTime + this.attackTime + 0.14);
    gain.connect(this.master!);

    const triangle = context.createOscillator();
    triangle.type = "triangle";
    triangle.frequency.setValueAtTime(frequency, startTime);
    triangle.detune.setValueAtTime(-3, startTime);
    const sine = context.createOscillator();
    sine.type = "sine";
    sine.frequency.setValueAtTime(frequency, startTime);
    sine.detune.setValueAtTime(3, startTime);
    const triangleGain = context.createGain();
    triangleGain.gain.value = 0.72;
    const sineGain = context.createGain();
    sineGain.gain.value = 0.28;
    triangle.connect(triangleGain).connect(filter);
    sine.connect(sineGain).connect(filter);
    filter.connect(gain);
    triangle.start(startTime);
    sine.start(startTime);

    const voice = { oscillators: [triangle, sine], gain };
    if (duration !== undefined) {
      const endTime = startTime + Math.max(duration, this.attackTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
      voice.oscillators.forEach((oscillator) => oscillator.stop(endTime + 0.05));
    }
    return voice;
  }

  private releaseVoice(voice: Voice, releaseTime: number): void {
    const context = this.context;
    if (!context) return;
    const at = Math.max(context.currentTime, releaseTime);
    voice.gain.gain.cancelScheduledValues(at);
    voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), at);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, at + this.release);
    voice.oscillators.forEach((oscillator) => oscillator.stop(at + this.release + 0.04));
  }

  private scheduleChord(notes: string[], startTime: number, duration: number): void {
    const velocity = 1 / Math.sqrt(Math.max(1, notes.length));
    notes.forEach((note) => this.createVoice(note, startTime, duration, velocity));
  }

  async play(notes: string[], options: PlayOptions = {}): Promise<void> {
    const context = await this.ensureReady();
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
    const context = await this.ensureReady();
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
    await this.ensureReady();
    this.releaseNote(note);
    this.heldVoices.set(note, this.createVoice(note, this.context!.currentTime + 0.005, undefined, 0.9));
  }

  releaseNote(note: string): void {
    const voice = this.heldVoices.get(note);
    if (!voice || !this.context) return;
    this.releaseVoice(voice, this.context.currentTime);
    this.heldVoices.delete(note);
  }

  releaseAll(): void {
    if (!this.context) return;
    this.heldVoices.forEach((voice) => this.releaseVoice(voice, this.context!.currentTime));
    this.heldVoices.clear();
  }

  async startLoop(chords: string[][], options: LoopOptions = {}): Promise<void> {
    if (!chords.length) return;
    const context = await this.ensureReady();
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
}

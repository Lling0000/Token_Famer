import type { FarmTool } from './game-types';

interface ToneOptions {
  frequency: number;
  start: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
  output: AudioNode;
}

const FARM_MELODIES = [
  [659.25, 783.99, 880, 783.99, 659.25, 587.33, 659.25, 523.25],
  [587.33, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25],
];
const FARM_BASS = [130.81, 98, 110, 87.31];
const FARM_CHORDS = [
  [261.63, 329.63, 392],
  [196, 246.94, 392],
  [220, 261.63, 329.63],
  [174.61, 261.63, 349.23],
];

export class FarmAudioEngine {
  private readonly context = new AudioContext();
  private readonly master = this.context.createGain();
  private readonly music = this.context.createGain();
  private readonly effects = this.context.createGain();
  private musicTimer: number | null = null;
  private musicBar = 0;
  private muted = false;

  constructor() {
    this.master.gain.value = 0.72;
    this.music.gain.value = 0.13;
    this.effects.gain.value = 0.16;
    this.music.connect(this.master);
    this.effects.connect(this.master);
    this.master.connect(this.context.destination);
  }

  async resumeAndStart(): Promise<void> {
    if (this.context.state === 'suspended') await this.context.resume();
    if (this.musicTimer !== null) return;
    this.scheduleMusicBar();
    this.musicTimer = window.setInterval(() => this.scheduleMusicBar(), 7_680);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.72, this.context.currentTime, 0.025);
  }

  isMuted(): boolean {
    return this.muted;
  }

  playClick(): void {
    if (this.muted) return;
    const start = this.context.currentTime;
    this.tone({ frequency: 310, start, duration: 0.045, volume: 0.16, output: this.effects });
    this.tone({
      frequency: 210,
      start: start + 0.045,
      duration: 0.04,
      volume: 0.11,
      type: 'square',
      output: this.effects,
    });
  }

  playFarmEffect(tool: FarmTool): void {
    if (this.muted || tool === 'inspect') return;
    if (tool === 'water') this.playWater();
    else if (tool === 'weed') this.playSoilScrape();
    else if (tool === 'bug') this.playSpray();
    else if (tool === 'harvest') this.playHarvest();
    else this.playSeed();
  }

  playDogBark(): void {
    if (this.muted) return;
    const start = this.context.currentTime;
    this.noise(start, 0.13, 0.06, 900);
    this.tone({
      frequency: 165,
      start,
      duration: 0.12,
      volume: 0.16,
      type: 'sawtooth',
      output: this.effects,
    });
    this.tone({
      frequency: 135,
      start: start + 0.17,
      duration: 0.11,
      volume: 0.13,
      type: 'sawtooth',
      output: this.effects,
    });
  }

  destroy(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    void this.context.close();
  }

  private scheduleMusicBar(): void {
    if (this.muted) return;
    const start = this.context.currentTime + 0.08;
    const step = 0.48;
    const melody = FARM_MELODIES[this.musicBar % FARM_MELODIES.length]!;
    this.scheduleMelody(melody, start, step);
    this.scheduleHarmony(start, step);
    this.scheduleBeat(start, step);
    this.scheduleBirdChirp(start + step * (this.musicBar % 2 === 0 ? 6 : 13));
    this.musicBar += 1;
  }

  private scheduleMelody(melody: number[], start: number, step: number): void {
    melody.forEach((frequency, index) => {
      this.tone({
        frequency,
        start: start + index * step * 2,
        duration: 0.32,
        volume: index % 4 === 0 ? 0.2 : 0.14,
        type: 'triangle',
        output: this.music,
      });
    });
  }

  private scheduleHarmony(start: number, step: number): void {
    FARM_CHORDS.forEach((chord, chordIndex) => {
      this.tone({
        frequency: FARM_BASS[chordIndex]!,
        start: start + chordIndex * step * 4,
        duration: 0.7,
        volume: 0.08,
        type: 'square',
        output: this.music,
      });
      chord.forEach((frequency, noteIndex) =>
        this.tone({
          frequency,
          start: start + chordIndex * step * 4 + noteIndex * step,
          duration: 0.3,
          volume: 0.07,
          type: 'sine',
          output: this.music,
        }),
      );
    });
  }

  private scheduleBeat(start: number, step: number): void {
    [0, 4, 8, 12].forEach((beat) => {
      this.tone({
        frequency: 92,
        start: start + beat * step,
        duration: 0.08,
        volume: 0.055,
        type: 'sine',
        output: this.music,
      });
    });
  }

  private scheduleBirdChirp(start: number): void {
    this.tone({
      frequency: 1_320,
      start,
      duration: 0.08,
      volume: 0.045,
      type: 'sine',
      output: this.music,
    });
    this.tone({
      frequency: 1_680,
      start: start + 0.09,
      duration: 0.07,
      volume: 0.035,
      type: 'sine',
      output: this.music,
    });
  }

  private playSeed(): void {
    const start = this.context.currentTime;
    this.tone({ frequency: 330, start, duration: 0.08, volume: 0.15, output: this.effects });
    this.tone({
      frequency: 494,
      start: start + 0.07,
      duration: 0.12,
      volume: 0.12,
      output: this.effects,
    });
  }

  private playWater(): void {
    const start = this.context.currentTime;
    this.noise(start, 0.42, 0.085, 1_500);
    for (let index = 0; index < 3; index += 1)
      this.tone({
        frequency: 760 - index * 110,
        start: start + index * 0.1,
        duration: 0.1,
        volume: 0.09,
        type: 'sine',
        output: this.effects,
      });
  }

  private playSoilScrape(): void {
    this.noise(this.context.currentTime, 0.24, 0.1, 620);
  }

  private playSpray(): void {
    this.noise(this.context.currentTime, 0.34, 0.075, 2_800);
  }

  private playHarvest(): void {
    const start = this.context.currentTime;
    [523.25, 659.25, 783.99].forEach((frequency, index) =>
      this.tone({
        frequency,
        start: start + index * 0.08,
        duration: 0.18,
        volume: 0.13,
        type: 'triangle',
        output: this.effects,
      }),
    );
  }

  private tone(options: ToneOptions): void {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(options.frequency, options.start);
    gain.gain.setValueAtTime(0.0001, options.start);
    gain.gain.exponentialRampToValueAtTime(options.volume, options.start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, options.start + options.duration);
    oscillator.connect(gain);
    gain.connect(options.output);
    oscillator.start(options.start);
    oscillator.stop(options.start + options.duration + 0.02);
  }

  private noise(start: number, duration: number, volume: number, frequency: number): void {
    const samples = Math.ceil(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, samples, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    const chunkSize = 16_384;
    for (let offset = 0; offset < samples; offset += chunkSize) {
      const values = new Uint32Array(Math.min(chunkSize, samples - offset));
      crypto.getRandomValues(values);
      for (let index = 0; index < values.length; index += 1) {
        channel[offset + index] = (values[index]! / 0xffffffff) * 2 - 1;
      }
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.effects);
    source.start(start);
  }
}

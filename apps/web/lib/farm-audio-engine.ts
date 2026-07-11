import type { FarmTool } from './game-types';

interface ToneOptions {
  frequency: number;
  start: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
  output: AudioNode;
}

export class FarmAudioEngine {
  private readonly context = new AudioContext();
  private readonly master = this.context.createGain();
  private readonly music = this.context.createGain();
  private readonly effects = this.context.createGain();
  private musicTimer: number | null = null;
  private muted = false;

  constructor() {
    this.master.gain.value = 0.72;
    this.music.gain.value = 0.045;
    this.effects.gain.value = 0.14;
    this.music.connect(this.master);
    this.effects.connect(this.master);
    this.master.connect(this.context.destination);
  }

  async resumeAndStart(): Promise<void> {
    if (this.context.state === 'suspended') await this.context.resume();
    if (this.musicTimer !== null) return;
    this.scheduleMusicBar();
    this.musicTimer = window.setInterval(() => this.scheduleMusicBar(), 4_800);
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
    const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 880];
    melody.forEach((frequency, index) => {
      this.tone({
        frequency,
        start: start + index * 0.56,
        duration: 0.28,
        volume: index % 4 === 0 ? 0.17 : 0.11,
        type: 'triangle',
        output: this.music,
      });
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

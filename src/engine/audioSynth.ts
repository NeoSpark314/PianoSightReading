import { MusicPiece } from './types';

export class AudioSynth {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private activeTimeouts: number[] = [];

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playPiece(piece: MusicPiece, onComplete?: () => void) {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    this.isPlaying = true;

    // Calculate beat duration in seconds
    const bpm = piece.tempo || 100;
    const quarterDurationSec = 60 / bpm;

    let currentTimeSec = this.ctx.currentTime + 0.1;

    piece.measures.forEach((measure) => {
      // Treble clef notes
      let trebleTime = currentTimeSec;
      measure.trebleNotes.forEach((n) => {
        const durationSec = n.durationInQuarterNotes * quarterDurationSec;
        if (n.pitch && !n.isRest) {
          this.schedulePianoNote(n.pitch.midi, trebleTime, durationSec * 0.95);
        }
        trebleTime += durationSec;
      });

      // Bass clef notes
      let bassTime = currentTimeSec;
      measure.bassNotes.forEach((n) => {
        const durationSec = n.durationInQuarterNotes * quarterDurationSec;
        if (n.pitch && !n.isRest) {
          this.schedulePianoNote(n.pitch.midi, bassTime, durationSec * 0.95);
        }
        bassTime += durationSec;
      });

      // Advance measure time (assuming full measure duration)
      const measureDurationSec = piece.timeSignature.beats * quarterDurationSec;
      currentTimeSec += measureDurationSec;
    });

    const totalDurationMs = (currentTimeSec - this.ctx.currentTime) * 1000;
    const timeoutId = window.setTimeout(() => {
      this.isPlaying = false;
      if (onComplete) onComplete();
    }, totalDurationMs);

    this.activeTimeouts.push(timeoutId);
  }

  private schedulePianoNote(midi: number, startTime: number, durationSec: number) {
    if (!this.ctx) return;

    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    // Fundamental oscillator (triangle for warmer piano-like tone)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);

    // Harmonic overtone (sine for attack brightness)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    // Envelope gain
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, startTime);
    // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.3, startTime + 0.015);
    // Natural exponential decay
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);

    osc1.stop(startTime + durationSec + 0.05);
    osc2.stop(startTime + durationSec + 0.05);
  }

  public stop() {
    this.isPlaying = false;
    this.activeTimeouts.forEach((id) => clearTimeout(id));
    this.activeTimeouts = [];
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const audioSynth = new AudioSynth();

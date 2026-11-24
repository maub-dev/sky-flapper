/** Tiny synthesized sound effects via Web Audio — no audio assets needed. */
export class Sound {
  muted = false;
  private ctx?: AudioContext;

  /** Must be called from a user gesture before sounds can play. */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  flap(): void {
    this.tone(520, 760, 0.08, 'triangle', 0.18);
  }

  score(): void {
    this.tone(880, 880, 0.07, 'square', 0.08);
    this.tone(1320, 1320, 0.12, 'square', 0.08, 0.07);
  }

  crash(): void {
    this.tone(300, 60, 0.35, 'sawtooth', 0.2);
  }

  private tone(from: number, to: number, dur: number, type: OscillatorType, vol: number, delay = 0): void {
    const ctx = this.ctx;
    if (this.muted || !ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}

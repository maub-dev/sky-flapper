import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { GameEngine, GameState, WORLD_H, WORLD_W } from './game/engine';
import { Renderer } from './game/renderer';
import { Sound } from './game/sound';

const BEST_KEY = 'sky-flapper:best';
const MUTE_KEY = 'sky-flapper:muted';
const FIXED_DT = 1 / 120;

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onKey($event)',
    '(document:visibilitychange)': 'onVisibility()',
  },
})
export class App {

  protected readonly state = signal<GameState>('ready');
  protected readonly score = signal(0);
  protected readonly best = signal(readNumber(BEST_KEY));
  protected readonly newBest = signal(false);
  protected readonly muted = signal(readNumber(MUTE_KEY) === 1);
  protected readonly paused = signal(false);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly engine = new GameEngine();
  private readonly sound = new Sound();
  private renderer?: Renderer;
  private rafId = 0;
  private lastTs = 0;
  private acc = 0;

  constructor() {
    this.sound.muted = this.muted();
    afterNextRender(() => this.start());
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.rafId));
  }

  protected onPointer(ev: PointerEvent): void {
    ev.preventDefault();
    this.press();
  }

  protected onKey(ev: KeyboardEvent): void {
    if (ev.code === 'Space' || ev.code === 'ArrowUp' || ev.code === 'KeyW' || ev.code === 'Enter') {
      ev.preventDefault();
      if (!ev.repeat) this.press();
    } else if (ev.code === 'KeyP' || ev.code === 'Escape') {
      this.togglePause();
    } else if (ev.code === 'KeyM') {
      this.toggleMute();
    }
  }

  protected onVisibility(): void {
    if (document.hidden && this.engine.state === 'playing') this.paused.set(true);
  }

  protected togglePause(): void {
    if (this.engine.state !== 'playing') return;
    this.paused.update((p) => !p);
  }

  protected toggleMute(ev?: Event): void {
    ev?.stopPropagation();
    this.muted.update((m) => !m);
    this.sound.muted = this.muted();
    writeValue(MUTE_KEY, this.muted() ? '1' : '0');
  }

  private press(): void {
    this.sound.unlock();
    if (this.paused()) {
      this.paused.set(false);
      return;
    }
    if (this.engine.input()) this.newBest.set(false);
    this.syncState();
  }

  private start(): void {
    const canvas = this.canvas().nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = WORLD_W * dpr;
    canvas.height = WORLD_H * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    this.renderer = new Renderer(ctx);
    this.rafId = requestAnimationFrame(this.frame);
  }

  private readonly frame = (ts: number): void => {
    const dt = this.lastTs ? Math.min(0.1, (ts - this.lastTs) / 1000) : 0;
    this.lastTs = ts;
    if (!this.paused()) {
      this.acc += dt;
      while (this.acc >= FIXED_DT) {
        this.tick(FIXED_DT);
        this.acc -= FIXED_DT;
      }
    }
    this.renderer?.draw(this.engine);
    this.rafId = requestAnimationFrame(this.frame);
  };

  private tick(dt: number): void {
    const ev = this.engine.step(dt);
    if (ev.flapped) this.sound.flap();
    if (ev.scored) {
      this.sound.score();
      this.score.set(this.engine.score);
    }
    if (ev.crashed) {
      this.sound.crash();
      if (this.engine.score > this.best()) {
        this.best.set(this.engine.score);
        this.newBest.set(true);
        writeValue(BEST_KEY, String(this.engine.score));
      }
      navigator.vibrate?.(80);
    }
    if (ev.crashed || ev.flapped) this.syncState();
  }

  private syncState(): void {
    this.state.set(this.engine.state);
    this.score.set(this.engine.score);
  }
}

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function writeValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — ignore */
  }
}

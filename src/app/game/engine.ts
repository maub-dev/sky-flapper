/** Pure game simulation — no DOM, no rendering. */

export const WORLD_W = 360;
export const WORLD_H = 640;
export const GROUND_H = 96;
export const PLAY_H = WORLD_H - GROUND_H;

const GRAVITY = 1500; // px/s²
const FLAP_VELOCITY = -440; // px/s
const MAX_FALL = 720; // px/s
const BIRD_X = 96;
export const BIRD_R = 15;

export const PIPE_W = 66;
const PIPE_SPACING = 220; // horizontal distance between pipe pairs
const GAP_START = 170;
const GAP_MIN = 128;
const SPEED_START = 150;
const SPEED_MAX = 220;
const EDGE_MARGIN = 60; // min distance from gap to top / ground

export type GameState = 'ready' | 'playing' | 'over';

export interface Pipe {
  x: number;
  gapY: number; // center of the gap
  gap: number;
  scored: boolean;
}

export interface Bird {
  x: number;
  y: number;
  vy: number;
  angle: number;
  wingPhase: number;
}

export interface StepEvents {
  flapped: boolean;
  scored: boolean;
  crashed: boolean;
}

export class GameEngine {
  state: GameState = 'ready';
  score = 0;
  bird: Bird = this.freshBird();
  pipes: Pipe[] = [];
  /** Total horizontal distance scrolled, used for parallax. */
  scroll = 0;
  /** Seconds elapsed, for idle animations. */
  time = 0;
  /** Seconds since the crash, used to delay restart. */
  overTime = 0;

  private flapQueued = false;

  get speed(): number {
    return Math.min(SPEED_MAX, SPEED_START + this.score * 3);
  }

  private get gap(): number {
    return Math.max(GAP_MIN, GAP_START - this.score * 2);
  }

  reset(): void {
    this.state = 'ready';
    this.score = 0;
    this.bird = this.freshBird();
    this.pipes = [];
    this.overTime = 0;
    this.flapQueued = false;
  }

  /** Player input. Returns true if the input restarted the game. */
  input(): boolean {
    if (this.state === 'over') {
      if (this.overTime > 0.6) {
        this.reset();
        return true;
      }
      return false;
    }
    if (this.state === 'ready') {
      this.state = 'playing';
      this.spawnPipe(WORLD_W + 120);
    }
    this.flapQueued = true;
    return false;
  }

  step(dt: number): StepEvents {
    const ev: StepEvents = { flapped: false, scored: false, crashed: false };
    this.time += dt;
    const b = this.bird;
    b.wingPhase += dt * (this.state === 'over' ? 0 : b.vy < 0 ? 22 : 12);

    if (this.state === 'ready') {
      this.scroll += SPEED_START * dt;
      b.y = PLAY_H * 0.45 + Math.sin(this.time * 3) * 8;
      b.angle = 0;
      return ev;
    }

    if (this.state === 'over') {
      this.overTime += dt;
      // Let the bird tumble to the ground.
      if (b.y < PLAY_H - BIRD_R) {
        b.vy = Math.min(MAX_FALL, b.vy + GRAVITY * dt);
        b.y = Math.min(PLAY_H - BIRD_R, b.y + b.vy * dt);
        b.angle = Math.min(Math.PI / 2, b.angle + dt * 8);
      }
      return ev;
    }

    // --- playing ---
    if (this.flapQueued) {
      b.vy = FLAP_VELOCITY;
      this.flapQueued = false;
      ev.flapped = true;
    }
    b.vy = Math.min(MAX_FALL, b.vy + GRAVITY * dt);
    b.y += b.vy * dt;
    const target = b.vy < 0 ? -0.45 : Math.min(Math.PI / 2, (b.vy / MAX_FALL) * 1.6);
    b.angle += (target - b.angle) * Math.min(1, dt * (b.vy < 0 ? 18 : 6));

    const dx = this.speed * dt;
    this.scroll += dx;
    for (const p of this.pipes) {
      p.x -= dx;
      if (!p.scored && p.x + PIPE_W < b.x) {
        p.scored = true;
        this.score++;
        ev.scored = true;
      }
    }
    this.pipes = this.pipes.filter((p) => p.x + PIPE_W > -10);
    const last = this.pipes[this.pipes.length - 1];
    if (!last || last.x < WORLD_W - PIPE_SPACING) {
      this.spawnPipe(last ? last.x + PIPE_SPACING : WORLD_W);
    }

    if (b.y - BIRD_R < -40) b.y = BIRD_R - 40; // ceiling clamp (allow a bit offscreen)
    if (b.y + BIRD_R >= PLAY_H || this.hitsPipe()) {
      b.y = Math.min(b.y, PLAY_H - BIRD_R);
      this.state = 'over';
      this.overTime = 0;
      b.vy = Math.min(b.vy, 0);
      ev.crashed = true;
    }
    return ev;
  }

  private hitsPipe(): boolean {
    const { x, y } = this.bird;
    const r = BIRD_R - 2; // slightly forgiving hitbox
    for (const p of this.pipes) {
      const top = p.gapY - p.gap / 2;
      const bottom = p.gapY + p.gap / 2;
      if (
        circleRect(x, y, r, p.x, -1000, PIPE_W, top + 1000) ||
        circleRect(x, y, r, p.x, bottom, PIPE_W, PLAY_H - bottom)
      ) {
        return true;
      }
    }
    return false;
  }

  private spawnPipe(x: number): void {
    const gap = this.gap;
    const minY = EDGE_MARGIN + gap / 2;
    const maxY = PLAY_H - EDGE_MARGIN - gap / 2;
    const prev = this.pipes[this.pipes.length - 1];
    // Keep consecutive gaps reachable.
    let gapY = minY + Math.random() * (maxY - minY);
    if (prev) gapY = clamp(gapY, prev.gapY - 180, prev.gapY + 180);
    this.pipes.push({ x, gapY, gap, scored: false });
  }

  private freshBird(): Bird {
    return { x: BIRD_X, y: PLAY_H * 0.45, vy: 0, angle: 0, wingPhase: 0 };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function circleRect(cx: number, cy: number, r: number, rx: number, ry: number, rw: number, rh: number): boolean {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

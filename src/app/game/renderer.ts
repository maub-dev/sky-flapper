import { BIRD_R, GameEngine, GROUND_H, PIPE_W, PLAY_H, WORLD_H, WORLD_W } from './engine';

interface Cloud {
  x: number;
  y: number;
  s: number;
}

const CLOUDS: Cloud[] = [
  { x: 40, y: 90, s: 1 },
  { x: 200, y: 150, s: 0.7 },
  { x: 300, y: 60, s: 1.2 },
  { x: 120, y: 230, s: 0.6 },
];

/** Draws the game world. All art is procedural. */
export class Renderer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  draw(g: GameEngine): void {
    const c = this.ctx;
    c.clearRect(0, 0, WORLD_W, WORLD_H);
    this.sky();
    this.sun();
    this.clouds(g.scroll * 0.1);
    this.hills(g.scroll * 0.25, 0.62, '#7fb8a4', 70, 0.011);
    this.hills(g.scroll * 0.45, 0.74, '#5a9e86', 50, 0.017);
    for (const p of g.pipes) this.pillar(p.x, p.gapY, p.gap);
    this.ground(g.scroll);
    this.bird(g);
  }

  private sky(): void {
    const c = this.ctx;
    const grad = c.createLinearGradient(0, 0, 0, PLAY_H);
    grad.addColorStop(0, '#3b4b8f');
    grad.addColorStop(0.55, '#e88a73');
    grad.addColorStop(1, '#ffd29a');
    c.fillStyle = grad;
    c.fillRect(0, 0, WORLD_W, PLAY_H);
  }

  private sun(): void {
    const c = this.ctx;
    const g = c.createRadialGradient(270, 330, 10, 270, 330, 110);
    g.addColorStop(0, 'rgba(255,240,190,0.95)');
    g.addColorStop(0.35, 'rgba(255,220,150,0.6)');
    g.addColorStop(1, 'rgba(255,200,140,0)');
    c.fillStyle = g;
    c.fillRect(150, 210, 240, 240);
  }

  private clouds(offset: number): void {
    const c = this.ctx;
    c.fillStyle = 'rgba(255,255,255,0.55)';
    const span = WORLD_W + 160;
    for (const cl of CLOUDS) {
      const x = ((((cl.x - offset * cl.s) % span) + span) % span) - 80;
      c.beginPath();
      for (const [dx, dy, rx, ry] of [[0, 0, 34, 12], [20, -8, 22, 13], [-16, -4, 18, 10]]) {
        c.moveTo(x + (dx + rx) * cl.s, cl.y + dy * cl.s);
        c.ellipse(x + dx * cl.s, cl.y + dy * cl.s, rx * cl.s, ry * cl.s, 0, 0, Math.PI * 2);
      }
      c.fill();
    }
  }

  private hills(offset: number, baseFrac: number, color: string, amp: number, freq: number): void {
    const c = this.ctx;
    const base = PLAY_H * baseFrac + 60;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, PLAY_H);
    for (let x = 0; x <= WORLD_W; x += 6) {
      const wx = x + offset;
      const y = base - amp * (0.5 + 0.3 * Math.sin(wx * freq) + 0.2 * Math.sin(wx * freq * 2.7 + 1.3));
      c.lineTo(x, y);
    }
    c.lineTo(WORLD_W, PLAY_H);
    c.closePath();
    c.fill();
  }

  /** Stone pillars with mossy caps (the obstacles). */
  private pillar(x: number, gapY: number, gap: number): void {
    const c = this.ctx;
    const top = gapY - gap / 2;
    const bottom = gapY + gap / 2;
    const body = c.createLinearGradient(x, 0, x + PIPE_W, 0);
    body.addColorStop(0, '#6d5a8a');
    body.addColorStop(0.35, '#a891c4');
    body.addColorStop(1, '#4b3d63');

    const drawSeg = (y0: number, h: number, capY: number) => {
      c.fillStyle = body;
      c.fillRect(x + 4, y0, PIPE_W - 8, h);
      // brick lines
      c.strokeStyle = 'rgba(40,28,60,0.35)';
      c.lineWidth = 1;
      for (let y = y0 + 18; y < y0 + h; y += 22) {
        c.beginPath();
        c.moveTo(x + 4, y);
        c.lineTo(x + PIPE_W - 4, y);
        c.stroke();
      }
      // cap
      const capH = 22;
      c.fillStyle = body;
      roundRect(c, x - 2, capY, PIPE_W + 4, capH, 5);
      c.fill();
      c.fillStyle = '#7dc47a';
      const mossY = capY === top - capH ? capY + capH - 6 : capY;
      roundRect(c, x - 2, mossY, PIPE_W + 4, 6, 3);
      c.fill();
      c.strokeStyle = '#2f2540';
      c.lineWidth = 2;
      roundRect(c, x - 2, capY, PIPE_W + 4, capH, 5);
      c.stroke();
    };

    drawSeg(-10, top + 10, top - 22);
    drawSeg(bottom, PLAY_H - bottom, bottom);
  }

  private ground(scroll: number): void {
    const c = this.ctx;
    c.fillStyle = '#d9b47a';
    c.fillRect(0, PLAY_H, WORLD_W, GROUND_H);
    c.fillStyle = '#6fae58';
    c.fillRect(0, PLAY_H, WORLD_W, 14);
    c.fillStyle = '#4f8d3e';
    const off = scroll % 24;
    for (let x = -off; x < WORLD_W; x += 24) {
      c.beginPath();
      c.moveTo(x, PLAY_H + 14);
      c.lineTo(x + 12, PLAY_H + 14);
      c.lineTo(x + 6, PLAY_H + 22);
      c.closePath();
      c.fill();
    }
    c.fillStyle = 'rgba(150,110,60,0.35)';
    const off2 = scroll % 40;
    for (let x = -off2; x < WORLD_W; x += 40) {
      c.fillRect(x, PLAY_H + 40, 14, 4);
      c.fillRect(x + 20, PLAY_H + 64, 10, 4);
    }
    c.fillStyle = '#2f2540';
    c.fillRect(0, PLAY_H, WORLD_W, 2);
  }

  /** A round teal bird with a big eye and orange beak. */
  private bird(g: GameEngine): void {
    const c = this.ctx;
    const b = g.bird;
    c.save();
    c.translate(b.x, b.y);
    c.rotate(b.angle);
    const r = BIRD_R + 2;

    // body
    c.fillStyle = '#3cc4c0';
    c.strokeStyle = '#1d3b4a';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, 0, r + 2, r, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // belly
    c.fillStyle = '#e9fbf5';
    c.beginPath();
    c.ellipse(-2, 6, r - 5, r - 9, 0, 0, Math.PI * 2);
    c.fill();
    // tail
    c.fillStyle = '#2a9a97';
    c.beginPath();
    c.moveTo(-r, -2);
    c.lineTo(-r - 10, -8);
    c.lineTo(-r - 8, 4);
    c.closePath();
    c.fill();
    c.stroke();
    // beak
    c.fillStyle = '#ff9a3c';
    c.beginPath();
    c.moveTo(r - 2, -3);
    c.lineTo(r + 11, 2);
    c.lineTo(r - 2, 7);
    c.closePath();
    c.fill();
    c.stroke();
    // eye
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(6, -6, 6, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#1d1a2a';
    c.beginPath();
    if (g.state === 'over') {
      c.lineWidth = 2;
      c.moveTo(4, -8);
      c.lineTo(10, -2);
      c.moveTo(10, -8);
      c.lineTo(4, -2);
      c.stroke();
    } else {
      c.arc(8, -6, 2.6, 0, Math.PI * 2);
      c.fill();
    }
    // wing
    const flap = Math.sin(b.wingPhase) * 7;
    c.fillStyle = '#28a7a3';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(-5, 1 + flap * 0.4, 9, 5 + Math.abs(flap) * 0.3, -0.3 + flap * 0.05, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();
  }
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

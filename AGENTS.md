# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

**Sky Flapper** is a tap-to-flap arcade game that runs entirely in the browser. It is front-end only: no backend, no API calls, and no image or audio assets. All art is drawn procedurally on an HTML5 canvas, and sound effects are synthesized with the Web Audio API.

- **Live site:** https://maub-dev.github.io/sky-flapper/
- **Repo:** https://github.com/maub-dev/sky-flapper (public)
- **Stack:** Angular 22 (standalone components, zoneless, signals), TypeScript 6.0, Canvas 2D, Web Audio

The game is an original take on the flappy-bird genre. Keep it original: don't add the name, sprites, sounds, or visual style of any existing game.

## Requirements

- **Node.js** `^22.22.3`, `^24.15.0`, or `>=26` (Angular 22 requirement). Local development and CI use **Node 24**.
- npm 11 (bundled with Node 24).

## Commands

```bash
npm install
npm start                                   # dev server at http://localhost:4200
npm run build                               # production build -> dist/sky-flapper/browser
npx ng build --base-href /sky-flapper/      # build exactly as GitHub Pages serves it
```

There is no test runner. The default vitest/jsdom setup was removed on purpose (npm failed to install it, and the game didn't need it). Check engine changes by running the engine headlessly instead. `src/app/game/engine.ts` has no imports, so you can copy it next to a small driver script and run that with `node` (Node 24 strips TypeScript types natively).

## Architecture

```
src/app/
  app.ts / app.html / app.css   Root component: game loop, input, HUD/overlays, persistence
  app.config.ts                 Providers (no router: single-screen app)
  game/engine.ts                Pure simulation: physics, pillars, collisions, scoring, difficulty
  game/renderer.ts              Canvas drawing: sky, sun, clouds, parallax hills, pillars, ground, bird
  game/sound.ts                 Synthesized sound effects (flap, score, crash)
src/styles.css                  Global page styles
```

The code is split by responsibility. Keep it that way:

- **`engine.ts`** is pure logic with no DOM, canvas, or Angular. It uses a fixed 360×640 world (`WORLD_W`, `WORLD_H`, `GROUND_H`). `step(dt)` advances the simulation and returns events (`flapped`, `scored`, `crashed`), and `input()` handles a player press. States are `'ready' | 'playing' | 'over'`.
- **`renderer.ts`** only reads engine state and draws it. It must never change game state.
- **`app.ts`** owns the `requestAnimationFrame` loop. It runs a **fixed 120 Hz timestep** (`FIXED_DT`) with an accumulator, so physics behave the same at any refresh rate. Engine events trigger sounds and update the Angular signals behind the HTML overlays (score, game over panel, pause).
- **HUD/UI** (score, title, game over panel, pause/mute buttons) is Angular template markup layered over the canvas, not drawn on the canvas.
- The canvas backing store is scaled by `devicePixelRatio` (capped at 3) so it stays crisp on high-DPI screens. CSS keeps the frame at a 9:16 aspect ratio.

### Tuning

All gameplay constants are at the top of `engine.ts`: gravity, flap velocity, pipe spacing, gap size (`GAP_START` shrinking to `GAP_MIN`), and speed (`SPEED_START` rising to `SPEED_MAX`). Difficulty increases with score. Consecutive gaps are kept within ±180px of each other so they stay reachable.

### Persistence

The best score (`sky-flapper:best`) and mute setting (`sky-flapper:muted`) are stored in `localStorage`. Every access is wrapped in try/catch because storage can be unavailable. Keep that pattern.

## Conventions

- Standalone components, `ChangeDetectionStrategy.OnPush`, signals for UI state, and the new control flow (`@if`, `@for`).
- No zone.js: the app is zoneless. Don't add zone-dependent code.
- Bind host events with the component `host` metadata, not `@HostListener`.
- Code style is configured in Prettier (`.prettierrc`) and `.editorconfig`.
- Keep the bundle small. Don't add runtime dependencies without a clear need; the initial bundle is about 40 kB transferred.
- Input: pointer (mouse/touch), Space / ↑ / W / Enter to flap, P / Esc to pause, M to mute. On-canvas buttons call `stopPropagation()` on `pointerdown` so pressing them doesn't also flap.

## Deployment

`.github/workflows/deploy.yml` builds on every push to `main` (and on manual dispatch) and deploys `dist/sky-flapper/browser` to GitHub Pages. The base href comes from the repository name (`/sky-flapper/`). If you rename the repo or the Angular project, update the workflow's output path to match.

## Gotchas

- If `ng serve` reports `TS6053 ... lib.es2022.full.d.ts not found` after a dependency upgrade, the cache is stale. Delete `.angular/cache` and restart the server.
- Browsers block audio until the user interacts with the page. `Sound.unlock()` runs on the first press, so sound is silent before then.
- The app pauses automatically when the tab is hidden (`visibilitychange`).

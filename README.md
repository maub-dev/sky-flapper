# Sky Flapper

A tap-to-flap arcade game that runs entirely in the browser, built with **Angular 21** and the HTML5 Canvas. No backend, no image or audio assets: the art is drawn procedurally and the sound effects are synthesized with the Web Audio API.

## How to play

| Action | Input |
| --- | --- |
| Flap | Click / tap, <kbd>Space</kbd>, <kbd>↑</kbd>, <kbd>W</kbd> |
| Pause | <kbd>P</kbd> / <kbd>Esc</kbd> or the pause button |
| Mute | <kbd>M</kbd> or the speaker button |

Fly through the gaps between the stone pillars. Each pillar you pass scores a point, and the game speeds up and the gaps get narrower as your score goes up. Your best score is saved in your browser.

## Development

```bash
npm install
npm start          # http://localhost:4200
npm run build      # production build in dist/sky-flapper/browser
```

## Project structure

```
src/app/
  app.ts / app.html / app.css   Angular component: game loop, input, HUD overlays
  game/engine.ts                Pure simulation (physics, pillars, collisions, scoring)
  game/renderer.ts              Canvas drawing (sky, parallax hills, pillars, bird)
  game/sound.ts                 Synthesized sound effects
```

The simulation runs at a fixed 120 Hz timestep, so it behaves the same on 60 Hz and high-refresh displays. Rendering uses a fixed 360×640 world, scaled to fit the screen with crisp output on high-DPI displays.

## Deployment

Every push to `main` builds the app and deploys it to GitHub Pages through `.github/workflows/deploy.yml`.

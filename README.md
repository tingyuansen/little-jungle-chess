# Little Jungle · 斗兽棋

Two-player, face-to-face animal chess on one phone. Open `dist/index.html` through a static HTTP server; all gameplay runs locally, with device-local saved progress.

- Traditional 7 × 9 board, opposite-facing teams, legal move hints, traps, rivers, jumps, rank-based captures, den victory, elimination and no-move victory.
- Rules use dog 4 / wolf 3 and elephant cannot capture rat, as documented by Yellow Mountain Imports and Ancient Chess. Both sources are linked from the game's help.
- Child-friendly rules, generated animal portraits, undo, optional synthesized sounds and reduced-motion support.
- Run `node --test tests/engine.test.mjs` for movement and capture checks.
- Preview: `python3 -m http.server 4173 --directory dist`.

Rule references:
https://www.ymimports.com/pages/how-to-play-jungle
https://ancientchess.com/page/play-doushouqi.htm

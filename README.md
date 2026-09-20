# Little Jungle Chess · 斗兽棋

A colourful, two-player animal chess game for children and families. Put one phone between two players: each team faces its own end, and the board frame shows whose turn it is.

**[Play Little Jungle Chess](https://tingyuansen.github.io/little-jungle-chess/)**

## Playing

Get any animal into the other team’s den. Tap one of your animals, then a glowing square. Orange goes first.

- Traditional 7 × 9 board with rivers, traps and dens.
- Friendly animal portraits, ranks, touch controls and illustrated rules.
- Legal movement and capture enforcement, including swimming rats and rat-blocked lion/tiger jumps.
- Turn-coloured board frame, full-screen button and responsive portrait/landscape layouts; in full screen the board fills the height.
- Undo, optional sounds, winner celebration and device-local saved progress.

## Install on Android

Open the game in Chrome. When the browser makes installation available, the game offers **Install app** or **Not now**. You can also use the **Install** button, or Chrome’s **⋮ → Install app / Add to Home screen** menu.

The installed app requests full-screen portrait mode. The browser’s full-screen button requires a tap. Browser support and previous installation/dismissal affect when the native prompt appears; declining the game’s prompt pauses automatic offers for seven days.

After one successful online visit, the game, animal artwork and fonts are cached for offline play. Game progress is saved on that device, not shared between phones. An updated cached version activates after older game tabs close, without interrupting a match.

## Rules used

Dog is rank 4 and wolf is rank 3. Rat can capture elephant on land; elephant cannot capture rat except when the rat is weakened in the elephant’s own trap. A rat cannot capture across the water/land boundary. Either side’s swimming rat blocks a lion or tiger jumping through its square. Capturing all enemy animals or leaving the next player no legal moves also wins.

Family sets sometimes use different ranks or elephant/rat rules. The implementation follows the variant described by [Yellow Mountain Imports](https://www.ymimports.com/pages/how-to-play-jungle) and [Ancient Chess](https://ancientchess.com/page/play-doushouqi.htm).

## Local development

No application dependencies or build step are needed. Use Node.js 20+ for checks and Python 3 for a local server.

```sh
npm start
npm run check
npm test
```

Open http://localhost:4173. The service worker uses network-first responses on localhost so edits remain visible; the published app uses a versioned offline shell.

`dist/` contains the complete static website. `tests/` covers game rules, install interactions, manifest icon sizes and offline caching. The GitHub Actions workflow checks and publishes `dist/` to GitHub Pages on pushes to `main`.

When changing app-shell files, increment the cache version in `dist/sw.js`.

## Assets and privacy

Animal portraits were generated for this game. Baloo 2 and Nunito are bundled from [Google Fonts](https://github.com/google/fonts); their SIL Open Font License files are included in `dist/fonts/`.

The game has no ads, analytics, application accounts, external font requests or server-side game storage. GitHub Pages provides static hosting. Local progress and install preferences can be removed by clearing the site’s browser data.

# AsciiPet

A tiny macOS desktop pet that lives in the bottom-right corner of your screen, hops around,
and plays animated ASCII art from [ascii.rest](https://ascii.rest) in miniature.

[Русская версия](README.ru.md)

```
                                                 Z

            _..--------.._        /\        _ z
        _.-'    )   )   ) `-._   /  `----.-' \
      .'      )   )   )   )   `-/            \
     /       )   )   )   )     |  `-'    `-'  |
     |                         |       v      |
     |                          \    `-'-'   /
     |          _.--._           `-._____.-'
 _    \       .'      `.         _(__)  (__)_
( `.   `.   /          \_______.'            `.
 `. `-._ `-(______.---.___________________________)
   `-.__`---'
```

## Features

- **11 animations:** a chibi cat girl of our own, who blinks, twitches an ear, sways her tail and
  waves a paw with a "nya~", plus a donut, heart, jellyfish, campfire, galaxy, Earth, black hole,
  torus knot, butterfly and sleeping cat from ascii.rest.
  Each one is drawn in its own colour gradient.
- **It hops.** Before each jump it crouches, it stretches in the air and squashes on landing.
  Its shadow on the floor shrinks while it's in the air.
- **Click** to hop to the next animation. **Right-click** (or the 🐾 menu bar icon) opens the menu:
  pick an animation, auto-switch (off / 30 s / 1 min / 5 min), size (96 / 128 / 176 pt),
  backdrop (none / dark / light), hopping, launch at login.
- **Stays out of the way.** It floats above other windows on every Space, has no Dock icon,
  passes clicks through its transparent area and pauses when the screen sleeps.
- **Light on resources:** about 1–4% of one CPU core for most animations and ~20 MB of memory
  (measured below).

The menu is in Russian for now.

## Requirements

- macOS 14 Sonoma or later, Apple Silicon or Intel
- Command Line Tools (`xcode-select --install`), Xcode itself is not needed

## Install

```bash
git clone <this repo> ascii-pet
cd ascii-pet
./scripts/build-app.sh --install
```

This builds a universal `build/AsciiPet.app`, copies it to `~/Applications` and launches it.
Without `--install` it only builds.

The app is ad-hoc signed and not notarized. If you share a prebuilt `AsciiPet.app`,
macOS Gatekeeper will block it after download. The recipient can build from source,
or remove the quarantine flag after reviewing the app:

```bash
xattr -dr com.apple.quarantine AsciiPet.app
```

## How it works

- **The original animations run as-is.** Every ascii.rest piece is a pure TypeScript function
  `frame(t) → string` with no DOM and no dependencies. `scripts/fetch-pieces.sh` checks out
  ascii.rest at a pinned commit and bundles the pieces listed in `Resources/pieces.json`
  with esbuild into `Resources/pieces.js`. The app runs that bundle in JavaScriptCore, so the pieces are not ports
  and need no WebView.
- **Rendering.** `AsciiLayer` places glyphs on a strict grid, with each cell twice as tall as it is
  wide, as ascii.rest expects. Characters missing from SF Mono come from a fallback font and are
  centred in their cell. The glyphs serve as a mask over a gradient layer, which gives every piece
  its own colours.
- **Energy.** Frames are capped at 20 fps; at 128 pt that looks the same as 30.
  When a frame matches the previous one, it isn't redrawn. A heavy piece gets a JS budget
  (8% of a core, never below 10 fps). At rest the timer ticks at the animation's frame rate and
  switches to 60 Hz only during a hop. Everything stops while the screen is asleep or the window
  is hidden.

### Why the app is signed with `allow-jit`

JavaScriptCore inside a third-party app only enables its JIT when the app has the
`com.apple.security.cs.allow-jit` entitlement. Without it, the pieces run 15–20× slower
(the donut takes 5.9 ms a frame instead of 0.28 ms). `build-app.sh` signs ad-hoc with the
hardened runtime and that entitlement (`Resources/AsciiPet.entitlements`). `swift run` works for
debugging, but measure performance only on the built `.app`.

### Measurements

Apple M4 Pro, 128 pt, no backdrop, hopping and auto-switch off. Average over 18 s after a warm-up:

| Animation | CPU, % of one core |
|---|---|
| Sleeping cat | 0.9 |
| Cat girl | 3.1 |
| Donut | 3.5–4.0 |
| Campfire (heaviest, on the JS budget) | 10 |

Memory is about 20 MB. macOS runs this light periodic work on efficiency cores.

## Adding animations

The menu is built from `Resources/pieces.json`: one entry per animation, with its `id`, menu title and
gradient colours (`top`, `bottom` as `RRGGBB`), in menu order.

**From ascii.rest:** add an entry with the piece name as `id`, then run:

```bash
./scripts/fetch-pieces.sh && ./scripts/build-app.sh --install
```

Pieces without `palette` in their `meta` (single-ink pieces) fit best.

**Your own:** put a `.ts` file in `pieces/` that follows the ascii.rest contract: `export const meta`
plus a `default()` that returns `frame(t, env)`, and add it to `pieces.json`. `pieces/catgirl.ts` is
an example; it also shows how to precompute the parts that keep still, so only the moving ones cost CPU.
`fetch-pieces.sh` copies such files into the ascii.rest tree and bundles them along with the rest.

**Private ones:** pieces you want on your own desktop but not in the repo — a logo, an inside joke —
go to `local/`, which is git-ignored: `local/pieces.json` and `local/pieces/*.ts`, same format.
`fetch-pieces.sh` bundles them separately into `local/pieces.js`, `build-app.sh` adds that bundle to
the app, and they come first in the menu. Build anything you share with `build-app.sh --public`,
which leaves them out.

## Project layout

```
pieces/catgirl.ts         cat girl animation (ascii.rest piece contract)
scripts/fetch-pieces.sh   bundles the pieces in pieces.json into pieces.js
scripts/build-app.sh      builds, signs and optionally installs AsciiPet.app (--public: without local/)
Resources/pieces.json     animation list: menu order, titles, colours
Resources/pieces.js       prebuilt bundle, committed so the app builds offline
local/                    your private pieces, git-ignored (optional)
Sources/AsciiPet/
  App.swift               entry point, menu bar item
  PetController.swift     the pet: frames, hops, clicks, menu
  PetWindow.swift         transparent always-on-top panel
  AsciiLayer.swift        draws a frame as a glyph grid
  PieceEngine.swift       runs the pieces in JavaScriptCore
  Pieces.swift            reads the animation lists
  Settings.swift          size, backdrop, auto-switch and hopping settings
```

## License

[MIT](LICENSE). The ascii.rest animations are MIT, © bas3line. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

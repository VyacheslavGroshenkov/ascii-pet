<p align="center">
  <img src="docs/banner.png" alt="AsciiPet: a tiny macOS desktop pet that hops and plays ASCII art in miniature" width="100%">
</p>

<p align="center">
  <a href="#install"><img src="https://img.shields.io/badge/macOS-14%2B-7C3AED?logo=apple&logoColor=white&labelColor=0F0F23" alt="macOS 14 or later"></a>
  <img src="https://img.shields.io/badge/Swift-5.10-DB2777?logo=swift&logoColor=white&labelColor=0F0F23" alt="Swift 5.10">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-6D28D9?labelColor=0F0F23" alt="MIT license"></a>
  <a href="https://ascii.rest"><img src="https://img.shields.io/badge/animations-ascii.rest-9333EA?labelColor=0F0F23" alt="Animations from ascii.rest"></a>
</p>

<p align="center">
  <a href="#install"><b>Install</b></a> ·
  <a href="#usage">Usage</a> ·
  <a href="#animations">Animations</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#adding-animations">Add your own</a> ·
  <a href="README.ru.md">Русский</a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-reduced-motion: reduce)" srcset="docs/demo.png">
    <img src="docs/demo.gif" alt="In the corner of a desktop the cat girl waves a paw, crouches, hops and turns into a spinning donut in mid-air, then lands" width="800">
  </picture>
</p>

**A tiny pet for your Mac's desktop.** It sits in the corner of your screen and plays ASCII art: a spinning
donut, a galaxy, a sleeping cat, a cat girl who waves back. Now and then it hops. Click it for the next
trick, or hold it to carry it somewhere else.

Native Swift, no Electron: about 20 MB of memory and 1–4% of one core for most animations.

## Features

- **11 animations,** each in its own colour gradient: ten from [ascii.rest](https://ascii.rest) and a cat girl
  drawn for this project.
- **Feels alive.** It crouches, hops, squashes on landing and swaps animation in mid-air.
- **Never in your way.** Carry it anywhere, another display included. Clicks pass through its transparent area,
  and it has no Dock icon.
- **Easy on your Mac.** It pauses while the screen sleeps and doesn't hop on its own when Reduce Motion is on.
  [Measurements](#performance) are below.

## Install

Requires macOS 14 Sonoma or later (Apple Silicon or Intel) and the Command Line Tools
(`xcode-select --install`). Xcode itself isn't needed.

Clone this repository, then run from its folder:

```bash
./scripts/build-app.sh --install
```

This builds a universal `AsciiPet.app`, copies it to `~/Applications` and launches it.
Without `--install` it only builds into `build/`.

> [!NOTE]
> The app is ad-hoc signed and not notarized. A prebuilt `AsciiPet.app` that you download gets blocked by
> Gatekeeper. Build it from source, or remove the quarantine flag once you've reviewed the app:
> `xattr -dr com.apple.quarantine AsciiPet.app`

## Usage

| Do this | What happens |
|---|---|
| Click the pet | It hops and turns into the next animation in mid-air |
| Press and hold (or just drag) | It lifts off. Carry it anywhere, and it stays there next time |
| Right-click it, or click the paw icon in the menu bar | Menu: animation, auto-switch (off / 30 s / 1 min / 5 min), size (96 / 128 / 176 pt), back to the corner, backdrop (none / dark / light), hopping, launch at login |

The menu is in Russian for now.

## Animations

<p align="center">
  <img src="docs/gallery.png" alt="Eight of the animations: cat girl, donut, jellyfish, campfire, galaxy, Earth, heart and sleeping cat" width="100%">
</p>

The cat girl is drawn for this project. She blinks, twitches an ear, sways her tail and waves a paw with a "nya~".
The donut, heart, jellyfish, campfire, galaxy, Earth, black hole, torus knot, butterfly and sleeping cat come from
[ascii.rest](https://ascii.rest) by [@bas3line](https://github.com/bas3line).

## How it works

- **The original animations run as-is.** Every ascii.rest piece is a pure TypeScript function
  `frame(t) → string`, with no DOM and no dependencies. `scripts/fetch-pieces.sh` checks out ascii.rest at a
  pinned commit and bundles the pieces listed in `Resources/pieces.json` into `Resources/pieces.js` with esbuild.
  The app runs that bundle in JavaScriptCore, so the pieces are not ports and need no WebView.
- **Rendering.** `AsciiLayer` places glyphs on a strict grid, each cell twice as tall as it's wide, as ascii.rest
  expects. Characters missing from SF Mono come from a fallback font and are centred in their cell. The glyphs
  are a mask over a gradient layer, which gives each piece its colours.
- **Energy.** Frames are capped at 20 fps; at 128 pt that looks the same as 30. A frame that matches the
  previous one isn't redrawn. A heavy piece gets a JS budget (8% of a core, never below 10 fps). At rest the timer
  ticks at the animation's frame rate and switches to 60 Hz only during a hop. Everything stops while the screen
  sleeps or the window is hidden.

### Why the app is signed with `allow-jit`

JavaScriptCore inside a third-party app enables its JIT only when the app has the
`com.apple.security.cs.allow-jit` entitlement. Without it the pieces run 15–20× slower
(the donut takes 5.9 ms a frame instead of 0.28 ms). `build-app.sh` signs ad-hoc with the hardened runtime and
that entitlement (`Resources/AsciiPet.entitlements`). `swift run` works for debugging, but measure performance
only on the built `.app`.

### Performance

Apple M4 Pro, 128 pt, no backdrop, hopping and auto-switch off; average over 18 s after warm-up.

| Animation | CPU, % of one core |
|---|---|
| Sleeping cat | 0.9 |
| Cat girl | 3.1 |
| Donut | 3.5–4.0 |
| Campfire (the heaviest, held to the JS budget) | 10 |

Memory stays around 20 MB. macOS runs light periodic work like this on the efficiency cores.

## Adding animations

The menu is built from `Resources/pieces.json`: one entry per animation with its `id`, menu title and gradient
colours (`top`, `bottom` as `RRGGBB`), in menu order.

**From ascii.rest.** Add an entry with the piece name as `id`, then rebuild. Single-ink pieces (no `palette` in
their `meta`) fit best.

```bash
./scripts/fetch-pieces.sh && ./scripts/build-app.sh --install
```

**Your own.** Put a `.ts` file in `pieces/` that follows the ascii.rest contract (`export const meta`, plus a
`default()` that returns `frame(t, env)`) and add it to `pieces.json`. `pieces/catgirl.ts` is an example. It also
shows how to precompute the parts that keep still, so only the moving ones cost CPU.

**Private ones.** Pieces you want on your desktop but not in the repo, like a logo or an inside joke, go to
`local/`, which is git-ignored: `local/pieces.json` and `local/pieces/*.ts`, same format. They're bundled
separately into `local/pieces.js`, added to the app and shown first in the menu. Build anything you share with
`build-app.sh --public`, which leaves them out.

## Project layout

```
pieces/catgirl.ts         cat girl animation (ascii.rest piece contract)
scripts/fetch-pieces.sh   bundles the pieces in pieces.json into pieces.js
scripts/build-app.sh      builds, signs and optionally installs AsciiPet.app (--public: without local/)
Resources/pieces.json     animation list: menu order, titles, colours
Resources/pieces.js       prebuilt bundle, committed so the app builds offline
local/                    your private pieces, git-ignored (optional)
docs/                     images for this README
Sources/AsciiPet/
  App.swift               entry point, menu bar item
  PetController.swift     the pet: frames, hops, dragging, menu
  PetWindow.swift         transparent always-on-top panel
  AsciiLayer.swift        draws a frame as a glyph grid
  PieceEngine.swift       runs the pieces in JavaScriptCore
  Pieces.swift            reads the animation lists
  Settings.swift          size, backdrop, position, auto-switch and hopping settings
```

## License

[MIT](LICENSE). The ascii.rest animations are MIT, © bas3line; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

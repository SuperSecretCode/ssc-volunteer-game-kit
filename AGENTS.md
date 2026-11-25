# Instructions for AI coding agents (Codex and others)

This is the Super Secret Code volunteer game kit. Super Secret Code is a bilingual (English/French) literacy app for children aged 4–7. Read `README.md` and `src/contract.ts` before changing anything.

## What you're building

- ONE React + TypeScript component (`.tsx`) that is the game's play area only. Start from `src/game/MyGame.tsx` (copy and rename it for each game). That file IS the game.
- Never create a standalone HTML version, an HTML preview, or an iframe wrapper. The preview is this kit (`npm run dev`).
- The component's props are exactly `VolunteerGameProps` from `src/contract.ts`.

## Files

- Edit: the game's `.tsx` file(s) in `src/game/`, `src/game/game.config.ts`, and assets in `public/game-assets/`.
- In `src/App.tsx`, change only the import line so it points to the game being built.
- Never edit `src/contract.ts`, anything in `src/shell/`, `src/preview.css`, `package.json` or the build config. They mirror the real app.

## The app owns these: never draw them in the game

Hint, Restart, the EN/FR language button, audio/play/listen buttons, the progress counter, Previous/Next, the header and the splash screen. Respond to the props instead: `hintRequest` (+1 = one hint), `restartRequest` (+1 = restart the CURRENT level), `lang` ('en' | 'fr').

## Audio

- The game never plays sound itself: no `new Audio()`, no `<audio>`, no Web Audio, no `speechSynthesis`.
- Stage instructions: call `onStageEnter('intro' | levelIndex)` once the stage is on screen; the shell plays the recording from `stageAudio` in `game.config.ts`.
- Recordings during play: call `onAudioCue('some.key')` and add that key, with both EN and FR files, to `cueAudio` in `game.config.ts`. Call `onAudioStop()` when a recording should stop.

## Language

- Visible child-facing text lives in `src/game/layout.json` (`text`, English and French) and is read with `L.text(id)`. Screen-reader-only labels and alt text live in a `LABELS` object in the `.tsx`, in both languages.
- A `lang` change must not restart the game, reset progress, re-run `onStageEnter`, or replay anything.

## Progress and completion

- `onProgress(0, total)` first, then on every change; `total` must equal `totalProgress` in `game.config.ts`.
- `onLevelComplete(i)` once per level and `onGameComplete()` once at the end, guarded against double calls.
- With an intro screen, put `data-intro-start-cue={introStartCue || undefined}` on the one button that starts level 1.

## Size and layout

- The shell gives the game a box with an exact shape, as large as fits: 16:9 on desktop, 4:3 on tablet, 9:16 on phone portrait. Fill the whole box, position everything in %, and keep it all inside the box.
- Desktop and tablet are the priority. On a phone the game must still fit and stay tappable; a simpler tall layout is fine.
- Measure with `ResizeObserver` `contentRect` or `clientWidth`/`clientHeight`, never `getBoundingClientRect` (the app may zoom the page).

## Layout and tuning

- Positions, sizes, rotation, layer, text size and per-device images live in `src/game/layout.json` (per profile: desktop 16:9, tablet 4:3, phone 9:16; x, y, w, h in % of the box, x/y = top-left).
- Read them with `makeLayout(layoutFile, tuning, size, lang)` from `src/game/layoutRuntime.ts` (never edit that helper). Spread `{...L.box(id, extraStyle)}` on every tunable element; use `L.text(id)` and `L.src(id)`. Follow `MyGame.tsx`.
- The kit provides the Tune panel. Do NOT build an editor, device frames, pretend controls, a test page, or import/export into the game.
- List screens in `game.config.ts` `screens`, and switch to `tuning.screen` whenever `tuning.screenRequest` changes. While `tuning` is present, taps on tunable items must not play (the kit selects/drags them).
- Never save or load layout in localStorage. `layout.json` is the only source; the person pastes Tune's "Copy all" into it.

## Code rules

- React state only: no `document.querySelector`, `innerHTML` or global mutable variables for game logic.
- Clean up every timer, listener, animation frame and pointer capture on restart and unmount.
- Images: WebP files under `/game-assets/`. Preload the current level's images.
- Font: `fontFamily: "'Rodger', sans-serif"` on all child-facing text, including every button.
- Tap targets at least 44×44 px.

## Checking your work

- Run `npm run build`. It must finish with no TypeScript errors.
- Run `npm run dev` and ask the person to play the game in the preview (Desktop and Tablet first, then a phone; both "Start in" languages; switch language mid-level). The callback log on the right must show no ⚠ lines.
- When you finish, list every image and recording file the game uses, with exact names, and remind the person to deliver `layout.json` and `layoutRuntime.ts` with the game.

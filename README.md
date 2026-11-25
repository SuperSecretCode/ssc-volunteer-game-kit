# Super Secret Code — volunteer game kit

This kit lets you build a game for Super Secret Code and see it **inside a look-alike of the real app page** while you work: the header, the purple audio player, the EN/FR button, Hint, Restart, the counter, the helper text bubble, the splash screen and Previous/Next.

You build **only the play area** (the big rounded box in the middle). The app supplies everything around it. When the game works here, it drops straight into the app.

## The one big rule

> **Your `.tsx` file is the game.** Build it, preview it and fix it here. Don't build or fix the game in a separate HTML file. An HTML copy can't go into the app, and keeping two versions in step is where problems start.

## Opening the kit

**To try the kit: in your browser.** Theresa's StackBlitz link opens the kit with the sample game, with nothing to install. It's great for exploring, but StackBlitz's free plan only makes public projects and allows only small uploads, so **don't build real games there**.

**To build real games: on your computer.** This keeps your artwork private and has no size limits.

1. Download the kit: on https://github.com/SuperSecretCode/ssc-volunteer-game-kit click the green **Code** button, then **Download ZIP**, and unzip it.
2. Install [Node.js](https://nodejs.org) (the LTS version). You only do this once.
3. Open a terminal in the kit folder (on Windows: open the folder, click the address bar, type `cmd` and press Enter) and run:

```
npm install
npm run dev
```

4. Open the address it prints (usually http://localhost:5173). Leave the terminal open while you work; the preview updates every time you save a file.

Start each new game from a fresh copy of the kit, so games don't mix.

**Where to keep your copies: on your computer, not in OneDrive.** Make a folder such as `C:\Users\<your name>\Projects\` and put each game's copy of the kit there, for example `Projects\secret-exhibit-mission-3\`.

- `npm install` creates a `node_modules` folder with thousands of small files. OneDrive tries to sync them all, which slows your computer down and can cause install errors.
- On many Windows computers, OneDrive also backs up your **Desktop** and **Documents** folders, so avoid those too.
- OneDrive is only for finished games: see "What to deliver" below. Never copy `node_modules` there.

## The files

| File | What it is | Edit it? |
| --- | --- | --- |
| `src/game/MyGame.tsx` | The starter game. Copy it, rename it for your game, and replace the gameplay. | **Yes** |
| `src/game/game.config.ts` | Helper text, total count, and every recording (EN and FR). | **Yes** |
| `src/game/layout.json` | Where everything sits (position, size, rotation, layer, text size, per-device images) for desktop (16:9), tablet (4:3) and phone (9:16), plus all visible text in English and French. Edited with the Tune panel. | **Yes** |
| `src/game/layoutRuntime.ts` | Small helper your game uses to read `layout.json`. Deliver it with your game. | **No** |
| `public/game-assets/` | Your images (WebP) and, until Theresa gives final URLs, your recordings. | **Yes** |
| `src/App.tsx` | The preview page. Only change the line that imports your game. | One line |
| `src/contract.ts` | The props the app gives your game. Same as the real app. | **No** |
| `src/shell/` | The look-alike app page. Preview only, never delivered. | **No** |

## The preview tools (grey bar)

- **Device buttons:** desktop, tablet (landscape and portrait) and phone. **Desktop and tablet matter most** for games, so design for those first. On phones the game still has to fit, with everything visible and tappable, but it doesn't need its own special layout.
- **Start in:** English page or French page. French blocks start in French; English blocks start in English. Test both.
- **Fresh visit:** starts over as if a child just opened the page.
- **Tune layout:** opens the Tune panel for placing things by eye (see below). The app never has it.
- **Callback log:** shows everything your game tells the app. **⚠ lines are problems to fix before you deliver.**

None of the grey bar or the log is part of the app.

## How your game talks to the app

The app passes these props to your game (details in `src/contract.ts`):

| Prop | What to do |
| --- | --- |
| `lang` | Show all text in this language: instructions, labels, aria-labels, messages. It can change at any time. **Don't restart or reset anything when it changes.** |
| `hintRequest` | Goes up by one when the child taps Hint. Show one hint, for example a glow on the next thing to tap. |
| `restartRequest` | Goes up by one when the child taps Restart. Restart the **current level** (or stay on the intro). |
| `introStartCue` | Put `data-intro-start-cue={introStartCue \|\| undefined}` on the button that leaves your intro. The app adds the yellow glow when the intro recording ends. |
| `onProgress(found, total)` | Call with `(0, total)` first, then whenever the count changes. Drives the counter. |
| `onStageEnter(stage)` | Call once each stage is on screen: `'intro'`, then `0` for level 1, `1` for level 2… The app plays that stage's recording. |
| `onLevelComplete(i)` | Call once when level `i` is finished. |
| `onGameComplete()` | Call once at the very end. The app unlocks Next. |
| `onAudioCue(key)` | Ask the app to play a recording during play (a clue, a reaction). The key must be in `cueAudio` in `game.config.ts`. |
| `onAudioStop()` | Ask the app to stop the current recording (for example when leaving a room). |

### Things your game must NOT do

- Draw its own Hint, Restart, EN/FR, audio/play buttons, counter, Next/Previous, header or splash. The app has these.
- Play recordings itself (no `new Audio()`, no `<audio>`, no speech synthesis). Use `onStageEnter` and `onAudioCue`, so children get the familiar purple player with pause and language switching.
- Use `document.querySelector`, `innerHTML` or global variables for game logic. Use React state.
- Leave timers, listeners or animations running after Restart or when the game closes.

### Look and feel

- Font: `font-family: 'Rodger', sans-serif` on all child-facing text, **including buttons** (buttons don't inherit fonts). `font-rodger` is not a font name. If Theresa sends you `Rodger.woff2`, put it in `public/fonts/`.
- Images: WebP. Preload each level's images so nothing pops in late.
- Tap targets at least 44 × 44 px.
- **Size:** the app gives your game a box with an exact shape, as large as fits on the screen: **16:9 on desktop, 4:3 on tablet, 9:16 on phone portrait**. Fill the whole box, position things in %, and keep everything inside it. The starter shows how to switch layouts by the box's shape. (In the preview, a faint dashed line shows the box.)
- Measure the box with `ResizeObserver` (`contentRect`) or `clientWidth`/`clientHeight`, never `getBoundingClientRect`, because the app may zoom the page.

## Tuning positions and text (the Tune panel)

The kit has a built-in **Tune panel**, so you don't need to build an editor into each game.

**How your game uses it**
1. Everything you'd want to tune lives in **`src/game/layout.json`**, separately for desktop, tablet and phone:
   - position and size (x, y, width, height, in % of the game box)
   - rotation, layer and text size
   - the image for that device (for example a different background per device)
   - all visible text, in English and French
2. Your game reads it through **`makeLayout`** from `layoutRuntime.ts`. Put `{...L.box('cody')}` on anything that should be tunable, use `L.text('title')` for text and `L.src('background')` for per-device images. See `MyGame.tsx`.
3. List your screens (intro, each level, success) in `screens` in `game.config.ts`, and make the game jump to a screen when `tuning.screenRequest` changes (the starter shows how).

**How you tune**
- Click **Tune layout** in the grey bar, pick a device, then tap an item in the game to select it and drag it.
- The panel also has:
  - number fields and arrow buttons for fine moves
  - Larger/Smaller, Wider/Narrower, Taller/Shorter
  - rotate, Bring forward/Send back, Hide, Ghost, Show all
  - a **Screen** picker to jump to any screen without playing through
  - English and French text editing
  - Reset item, Reset device and Reset text
- When you're happy, click **Copy all (layout.json)** and paste it over the contents of `src/game/layout.json`.
- Drafts are kept in your browser while Tune is on, so a reload doesn't lose your work. **With Tune off, the game only uses `layout.json`.** That's what gets delivered, so what Theresa approves is exactly what children see.

**If you change text that's also recorded audio,** the recording has to be redone. Tell Theresa.

**Not needed anymore** (the kit or the app does these):
- device frames, pretend EN/FR/Hint/Restart buttons, or a separate HTML test page
- your own counters, or listen/play buttons
- whole-board scale and offset settings: the game box is already the right shape
- importing layout files: the game reads `layout.json` directly
- implementation guides and QA tables: a short `NOTES.md` is enough

## Before you deliver: checklist

- [ ] The callback log shows **no ⚠ lines** in a full play-through.
- [ ] Played start to finish on **desktop and tablet**, and checked it still fits and works on a phone.
- [ ] Played starting on the **French page** and on the **English page**, and switched language mid-level: text changed, the game didn't restart.
- [ ] Hint and Restart work on every level.
- [ ] The intro recording plays after the splash Start; the start button glows yellow when it ends.
- [ ] Every recording in `game.config.ts` plays in **both** languages.
- [ ] Next unlocks only at the very end.
- [ ] With Tune off, the game looks right: everything comes from `layout.json`, and you pasted your final Copy all into it.
- [ ] All text is in Rodger, all images are WebP, and every image or recording your game uses is in your delivery.

## What to deliver

Put each finished game in its own folder inside the shared **Super Secret Code Shared Folder → Games** on OneDrive, laid out like this:

```
<game-name>/
├── game/      your .tsx file(s), layout.json, layoutRuntime.ts, any .css or data files they import, and game.config.ts
├── images/    WebP images, named exactly as the code uses them (capitals included)
├── audio/     recordings, if they aren't already uploaded somewhere Theresa gave you
└── NOTES.md   anything unfinished, anything you weren't sure about
```

Then let Theresa know it's there.

**Don't include:** HTML preview files, `App.tsx`, the `shell/` folder, `contract.ts`, `package.json` or `node_modules`.

## Building the game with an AI assistant

- **ChatGPT (in the chat window):** see `CHATGPT_INSTRUCTIONS.md`. Paste it at the start of every game chat.
- **Codex (or another coding agent that works in this folder):** open Codex in the kit folder. It reads `AGENTS.md` automatically, which has the same rules, so you can just describe the game. Codex can also run `npm install` and `npm run dev` for you, but it still needs Node.js installed.

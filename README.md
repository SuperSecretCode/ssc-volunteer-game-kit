# Super Secret Code — volunteer game kit

This kit lets you build a game for Super Secret Code and see it **inside a look-alike of the real app page** while you work: the header, the purple audio player, the EN/FR button, Hint, Restart, the counter, the helper text bubble, the splash screen and Previous/Next.

You build **only the play area** (the big rounded box in the middle). The app supplies everything around it. When the game works here, it drops straight into the app.

## The one big rule

> **Your `.tsx` file is the game.** Build it, preview it and fix it here. Don't build or fix the game in a separate HTML file. An HTML copy can't go into the app, and keeping two versions in step is where problems start.

## Opening the kit

**Option A: in your browser (nothing to install).** Theresa will send you a StackBlitz link. StackBlitz is a free code editor that runs in the browser and shows the live preview beside the code. Edit the files on the left; the preview updates by itself.

**Option B: on your computer.** Install [Node.js](https://nodejs.org) (the LTS version), then in this folder run:

```
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

## The files

| File | What it is | Edit it? |
| --- | --- | --- |
| `src/game/MyGame.tsx` | The starter game. Copy it, rename it for your game, and replace the gameplay. | **Yes** |
| `src/game/game.config.ts` | Helper text, total count, and every recording (EN and FR). | **Yes** |
| `public/game-assets/` | Your images (WebP) and, until Theresa gives final URLs, your recordings. | **Yes** |
| `src/App.tsx` | The preview page. Only change the line that imports your game. | One line |
| `src/contract.ts` | The props the app gives your game. Same as the real app. | **No** |
| `src/shell/` | The look-alike app page. Preview only, never delivered. | **No** |

## The preview tools (grey bar)

- **Device buttons:** desktop, tablet (landscape and portrait) and phone. **Desktop and tablet matter most** for games, so design for those first. On phones the game still has to fit, with everything visible and tappable, but it doesn't need its own special layout.
- **Start in:** English page or French page. French blocks start in French; English blocks start in English. Test both.
- **Fresh visit:** starts over as if a child just opened the page.
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
- Your game fills whatever box the app gives it. Pick your layout from the box's shape (the starter shows how), and keep everything inside the box.

## Before you deliver: checklist

- [ ] The callback log shows **no ⚠ lines** in a full play-through.
- [ ] Played start to finish on **desktop and tablet**, and checked it still fits and works on a phone.
- [ ] Played starting on the **French page** and on the **English page**, and switched language mid-level: text changed, the game didn't restart.
- [ ] Hint and Restart work on every level.
- [ ] The intro recording plays after the splash Start; the start button glows yellow when it ends.
- [ ] Every recording in `game.config.ts` plays in **both** languages.
- [ ] Next unlocks only at the very end.
- [ ] All text is in Rodger, all images are WebP, and every image or recording your game uses is in your delivery.

## What to deliver

1. Your game's `.tsx` file(s) and any `.css` or data files they import.
2. Your filled-in `game.config.ts`.
3. Your assets folder (images, and recordings if they aren't already uploaded), with names exactly as the code uses them, including capitals.
4. A short note: anything unfinished, anything you weren't sure about.

**No HTML preview files, no `App.tsx`, no `shell/` folder, no `package.json`.**

## Building the game with ChatGPT

See `CHATGPT_INSTRUCTIONS.md`. Paste it at the start of every game chat.

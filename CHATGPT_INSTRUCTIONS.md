# Paste this at the start of every game chat

Copy everything in the box below into a new ChatGPT chat, then attach these three files from the kit:
`src/contract.ts`, `src/game/game.config.ts` and `src/game/MyGame.tsx`.

---

```
I'm building a game for Super Secret Code, a bilingual (English/French) literacy app for children aged 4–7. I preview my game in a kit that copies the real app page. Please follow these rules for the whole chat.

WHAT TO BUILD
- Build ONLY the play area, as ONE React + TypeScript component (.tsx). That file is the game.
- Do NOT make a standalone HTML version, an HTML preview, or an iframe wrapper. If I ask to "preview" or "fix" the game, change the .tsx.
- The component's props must be exactly VolunteerGameProps from the attached contract.ts. Do not change contract.ts.
- Use MyGame.tsx (attached) as the pattern: TEXT object for both languages, LEVELS data, refs for timers, effects for hintRequest/restartRequest, stages reported with onStageEnter after render.

THE APP OWNS THESE — never draw them in the game
- Hint, Restart, EN/FR language button, audio/play/listen buttons, the progress counter, Previous/Next, the header and the splash screen.
- Respond to the props instead: hintRequest (+1 = one hint), restartRequest (+1 = restart the CURRENT level), lang ('en' | 'fr').

AUDIO
- The game never plays sound itself: no new Audio(), no <audio>, no Web Audio, no speechSynthesis.
- Stage instructions: call onStageEnter('intro' | levelIndex) once the stage is on screen; the app plays the recording from stageAudio in game.config.ts.
- Recordings during play (clues, reactions): call onAudioCue('some.key'), and add that key with both EN and FR files to cueAudio in game.config.ts.
- Call onAudioStop() when a recording should stop (leaving a room, closing a card).

LANGUAGE
- Every piece of child-facing text, including aria-labels and status messages, comes from TEXT[lang], with English and French written out.
- A lang change must NOT restart the game, reset progress, re-run onStageEnter, or replay anything.

PROGRESS AND COMPLETION
- onProgress(0, total) first, then on every change. total must equal totalProgress in game.config.ts.
- onLevelComplete(i) once per level. onGameComplete() once at the end. Guard both against double calls.
- If there's an intro screen, put data-intro-start-cue={introStartCue || undefined} on the button that starts level 1, and only there.

CODE RULES
- React state only: no document.querySelector, innerHTML or global mutable variables for game logic.
- Clean up every timer, listener, animation frame and pointer capture on restart and unmount.
- Images: WebP files under /game-assets/ (for example '/game-assets/room-1.webp'). Preload the current level's images.
- Font: fontFamily "'Rodger', sans-serif" on all child-facing text, including every button.
- Tap targets at least 44×44 px.
- SIZE: the app gives the game a box with an exact shape, as large as fits: 16:9 on desktop, 4:3 on tablet, 9:16 on phone portrait. Fill the whole box, position everything in %, and keep it all inside the box. Design for DESKTOP AND TABLET first; on a phone the game still has to fit and stay tappable, and a simpler tall layout is fine there (see useSceneSize in MyGame.tsx).
- Measure the box with ResizeObserver contentRect or clientWidth/clientHeight, never getBoundingClientRect (the app may zoom the page).

WHEN YOU GIVE ME CODE
- Give the complete .tsx file every time (not fragments), plus the complete game.config.ts whenever text, totals or recordings change.
- List every image and recording file the code uses, with exact names.
```

---

## Tips

- After each ChatGPT answer, paste the new `.tsx` into the kit, play it on **desktop and tablet** (then check a phone), and watch the callback log. Copy any ⚠ lines back into the chat so ChatGPT can fix them.
- If ChatGPT offers an HTML version "so you can preview it", say no: the kit is your preview.
- Keep one chat per game, and start a fresh one (with this text again) if it starts forgetting the rules.

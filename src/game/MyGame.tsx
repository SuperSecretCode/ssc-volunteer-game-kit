import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Stage, VolunteerGameProps } from '../contract';
import layoutFile from './layout.json';
import { makeLayout, profileFor, type LayoutFile, type Profile } from './layoutRuntime';

/**
 * STARTER GAME — copy this file, rename it for your game, and replace the
 * gameplay. Keep the structure:
 *   - positions, sizes, layers, per-device images and visible text: layout.json
 *     (read through makeLayout, so the kit's Tune panel can edit them)
 *   - screen-reader-only labels: LABELS below (both languages)
 *   - the shell controls (hint, restart, language, audio) come in as props
 *   - report stages, progress and completion through the callbacks
 *
 * This file is the GAME. Never build or fix the game in a separate HTML file.
 */

const LAYOUT = layoutFile as LayoutFile;

/** Labels only screen readers hear. Visible text lives in layout.json. */
const LABELS = {
  en: { target: (n: number) => `Star ${n}` },
  fr: { target: (n: number) => `Étoile ${n}` },
} as const;

/** What is in each level. Where things sit is in layout.json (ids must match). */
const LEVELS = [
  { id: 'level-1', targets: ['star-1', 'star-2', 'star-3'] },
  { id: 'level-2', targets: ['star-4', 'star-5'] },
] as const;

const TOTAL = LEVELS.reduce((sum, level) => sum + level.targets.length, 0);
const FONT = "'Rodger', 'Fredoka', 'Nunito', system-ui, sans-serif";

/**
 * The app gives your game a box with an exact shape: 16:9 on desktop,
 * 4:3 on tablet, 9:16 on phone portrait. Fill the whole box.
 * Measure with ResizeObserver's contentRect (or clientWidth/clientHeight),
 * NEVER getBoundingClientRect: the app may zoom the page.
 */
function useBoxSize() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0, profile: 'desktop' as Profile });
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = (width: number, height: number) => {
      if (!width || !height) return;
      const next = { width: Math.round(width), height: Math.round(height), profile: profileFor(width, height) };
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height && prev.profile === next.profile ? prev : next,
      );
    };
    update(el.clientWidth, el.clientHeight);
    const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width, entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { boxRef, size };
}

/** Preload every image this device's layout uses, so nothing pops in late. */
function usePreload(profile: Profile) {
  useEffect(() => {
    Object.values(LAYOUT.profiles[profile]).forEach((item) => {
      if (item.src) new Image().src = item.src;
    });
  }, [profile]);
}

export default function MyGame({
  lang,
  hintRequest,
  restartRequest,
  introStartCue,
  tuning,
  onProgress,
  onStageEnter,
  onLevelComplete,
  onGameComplete,
  onAudioCue,
}: VolunteerGameProps) {
  const [stage, setStage] = useState<Stage | 'success'>('intro');
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [hintedId, setHintedId] = useState<string | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const lastHint = useRef(hintRequest);
  const lastRestart = useRef(restartRequest);
  const lastScreenRequest = useRef(tuning?.screenRequest ?? 0);
  const reportedLevels = useRef(new Set<number>());
  const reportedGame = useRef(false);
  const { boxRef, size } = useBoxSize();
  usePreload(size.profile);

  const L = makeLayout(LAYOUT, tuning, size, lang);

  // Keep the latest callbacks without re-running effects when the parent re-renders.
  const callbacks = useRef({ onProgress, onStageEnter, onLevelComplete, onGameComplete, onAudioCue });
  callbacks.current = { onProgress, onStageEnter, onLevelComplete, onGameComplete, onAudioCue };

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  };

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  // Report each stage AFTER it is on screen. A language change never re-reports.
  useEffect(() => {
    if (stage === 'success') return;
    const frame = requestAnimationFrame(() => callbacks.current.onStageEnter(stage));
    return () => cancelAnimationFrame(frame);
  }, [stage]);

  useEffect(() => {
    callbacks.current.onProgress(found.size, TOTAL);
  }, [found]);

  const levelIndex = typeof stage === 'number' ? stage : null;
  const level = levelIndex !== null ? LEVELS[levelIndex] : null;

  // Hint: one increase of hintRequest = one hint.
  useEffect(() => {
    if (hintRequest === lastHint.current) return;
    lastHint.current = hintRequest;
    const next = level?.targets.find((id) => !found.has(id));
    if (!next) return;
    setHintedId(next);
    later(() => setHintedId(null), 1800);
  }, [hintRequest, level, found, later]);

  // Restart: reset the CURRENT level only (stay on the intro if there).
  useEffect(() => {
    if (restartRequest === lastRestart.current) return;
    lastRestart.current = restartRequest;
    if (!level || levelIndex === null) return;
    clearTimers();
    const ids = new Set<string>(level.targets);
    setFound((prev) => new Set([...prev].filter((id) => !ids.has(id))));
    reportedLevels.current.delete(levelIndex);
    setHintedId(null);
  }, [restartRequest, level, levelIndex]);

  // TUNE (preview only): jump to the screen the panel asks for.
  useEffect(() => {
    if (!tuning || tuning.screenRequest === lastScreenRequest.current) return;
    lastScreenRequest.current = tuning.screenRequest;
    const screen = tuning.screen;
    if (!screen) return;
    clearTimers();
    if (screen === 'intro') setStage('intro');
    else if (screen === 'success') setStage('success');
    else if (screen?.startsWith('level-')) {
      const index = Number(screen.slice(6)) - 1;
      // Earlier levels count as found, this level starts fresh.
      setFound(new Set(LEVELS.slice(0, index).flatMap((l) => [...l.targets])));
      setStage(index);
    }
  }, [tuning]);

  const tapStar = (id: string) => {
    if (tuning || !level || levelIndex === null || found.has(id)) return; // in Tune, taps select instead
    const next = new Set(found).add(id);
    setFound(next);
    setHintedId(null);
    if (!level.targets.every((t) => next.has(t))) return;

    if (!reportedLevels.current.has(levelIndex)) {
      reportedLevels.current.add(levelIndex);
      callbacks.current.onLevelComplete(levelIndex);
    }
    if (levelIndex === LEVELS.length - 1) {
      callbacks.current.onAudioCue?.('game.complete');
      if (!reportedGame.current) {
        reportedGame.current = true;
        callbacks.current.onGameComplete();
      }
      later(() => setStage('success'), 1200);
      return;
    }
    callbacks.current.onAudioCue?.('level.complete');
    later(() => setStage(levelIndex + 1), 1400);
  };

  const levelDone = !!level && level.targets.every((id) => found.has(id));

  return (
    <div ref={boxRef} style={styles.box}>
      {size.width > 0 && (
        <section style={styles.scene} aria-label={stage === 'intro' ? L.text('intro-title') : L.text('instruction')}>
          <img {...L.box('background', styles.fill)} src={L.src('background')} alt="" draggable={false} />

          {stage === 'intro' && (
            <div {...L.box('intro-card', styles.introCard)}>
              <h2 style={styles.introTitle}>{L.text('intro-title')}</h2>
              <p style={styles.introBody}>{L.text('intro-body')}</p>
              <button
                type="button"
                style={styles.startButton}
                data-intro-start-cue={introStartCue || undefined}
                onClick={() => !tuning && setStage(0)}
              >
                {L.text('start')} →
              </button>
            </div>
          )}

          {level && (
            <>
              {!levelDone && <p {...L.box('instruction', styles.instruction)}>{L.text('instruction')}</p>}
              {level.targets.map((id, index) =>
                found.has(id) ? null : (
                  <button
                    key={id}
                    type="button"
                    aria-label={LABELS[lang].target(index + 1)}
                    onPointerDown={() => tapStar(id)}
                    {...L.box(id, {
                      ...styles.star,
                      boxShadow: hintedId === id ? '0 0 0 6px #ffd84d, 0 0 28px 10px #ffd84d' : undefined,
                    })}
                  >
                    ★
                  </button>
                ),
              )}
              {levelDone && (
                <div role="status" {...L.box('done-card', styles.done)}>
                  {L.text('level-complete')}
                </div>
              )}
            </>
          )}

          {stage === 'success' && (
            <div role="status" {...L.box('done-card', styles.done)}>
              {L.text('game-complete')}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  box: { width: '100%', height: '100%', overflow: 'hidden' },
  scene: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 24,
    background: '#1b1464',
    userSelect: 'none',
    touchAction: 'manipulation',
    fontFamily: FONT,
  },
  fill: { objectFit: 'cover', pointerEvents: 'none' },
  introCard: {
    boxSizing: 'border-box',
    padding: '4%',
    borderRadius: 24,
    border: '4px solid #8a3ffc',
    background: 'rgba(43, 10, 110, 0.86)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '0.8em',
  },
  introTitle: { margin: 0, color: '#c3ff92', fontSize: '1.7em', fontFamily: FONT },
  introBody: { margin: 0, lineHeight: 1.35 },
  startButton: {
    minHeight: 48,
    border: '3px solid #fff',
    borderRadius: 999,
    background: '#c3ff92',
    color: '#1d0b45',
    fontFamily: FONT, // buttons don't inherit the font by default
    fontSize: '1em',
    fontWeight: 700,
    cursor: 'pointer',
  },
  instruction: {
    boxSizing: 'border-box',
    margin: 0,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 999,
    border: '3px solid #fff',
    background: '#2b0a6e',
    color: '#fff',
    textAlign: 'center',
  },
  star: {
    minWidth: 44,
    minHeight: 44,
    border: '3px solid #ffd84d',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.12)',
    color: '#ffd84d',
    fontFamily: FONT,
    cursor: 'pointer',
    padding: 0,
  },
  done: {
    boxSizing: 'border-box',
    display: 'grid',
    placeItems: 'center',
    padding: '1em',
    borderRadius: 24,
    textAlign: 'center',
    background: 'rgba(255, 255, 255, 0.9)',
    color: '#6b16ff',
  },
};

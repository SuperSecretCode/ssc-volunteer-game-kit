import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Stage, VolunteerGameProps } from '../contract';

/**
 * STARTER GAME — copy this file, rename it for your game, and replace the
 * gameplay. Keep the structure:
 *   - all child-facing text in TEXT (both languages)
 *   - all levels, positions and image paths in LEVELS
 *   - the shell controls (hint, restart, language, audio) come in as props
 *   - report stages, progress and completion through the callbacks
 *
 * This file is the GAME. Never build or fix the game in a separate HTML file.
 */

const TEXT = {
  en: {
    introTitle: 'The Night Sky',
    introBody: 'The stars went out! Help Cody light them up again.',
    start: 'Start the mission',
    instruction: 'Tap every star.',
    target: (n: number) => `Star ${n}`,
    levelComplete: 'Level complete!',
    gameComplete: 'The sky is bright again!',
  },
  fr: {
    introTitle: 'Le ciel de nuit',
    introBody: 'Les étoiles se sont éteintes ! Aide Cody à les rallumer.',
    start: 'Commencer la mission',
    instruction: 'Touche toutes les étoiles.',
    target: (n: number) => `Étoile ${n}`,
    levelComplete: 'Niveau terminé !',
    gameComplete: 'Le ciel brille de nouveau !',
  },
} as const;

type Point = { id: string; x: number; y: number };

/**
 * Each level has positions for a wide layout (desktop 16:9 and tablet 4:3, the
 * priority) and a tall layout (phone portrait 9:16). Get the wide layout right first; the
 * tall one just has to keep everything visible and tappable on a phone.
 * Image paths: put files in public/game-assets/ and reference them as
 * '/game-assets/<file>.webp'. Use WebP for every image.
 */
type Level = {
  id: string;
  background: string; // use an image: `url('/game-assets/level-1.webp')`
  targets: { wide: readonly Point[]; tall: readonly Point[] };
};

const LEVELS: readonly Level[] = [
  {
    id: 'level-1',
    background: 'linear-gradient(160deg, #1b1464, #4a1c8c)',
    targets: {
      wide: [
        { id: 'star-1', x: 22, y: 35 },
        { id: 'star-2', x: 50, y: 62 },
        { id: 'star-3', x: 78, y: 35 },
      ],
      tall: [
        { id: 'star-1', x: 30, y: 25 },
        { id: 'star-2', x: 70, y: 48 },
        { id: 'star-3', x: 35, y: 72 },
      ],
    },
  },
  {
    id: 'level-2',
    background: 'linear-gradient(160deg, #0d3b66, #1b1464)',
    targets: {
      wide: [
        { id: 'star-4', x: 32, y: 50 },
        { id: 'star-5', x: 68, y: 50 },
      ],
      tall: [
        { id: 'star-4', x: 50, y: 30 },
        { id: 'star-5', x: 50, y: 66 },
      ],
    },
  },
];

const TOTAL = LEVELS.reduce((sum, level) => sum + level.targets.wide.length, 0);
const FONT = "'Rodger', 'Fredoka', 'Nunito', system-ui, sans-serif";

type Shape = 'wide' | 'tall';

/**
 * The app gives your game a box with an exact shape: 16:9 on desktop,
 * 4:3 on tablet, 9:16 on phone portrait. Fill the whole box and position
 * things in % so they scale. Pick a wide or tall layout from the box's shape.
 *
 * Measure with ResizeObserver's contentRect (or clientWidth/clientHeight),
 * NEVER getBoundingClientRect: the app may zoom the page, and
 * getBoundingClientRect would count the zoom twice.
 */
function useSceneSize() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0, shape: 'wide' as Shape });

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = (width: number, height: number) => {
      if (!width || !height) return;
      const next = { width: Math.round(width), height: Math.round(height), shape: (height > width ? 'tall' : 'wide') as Shape };
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height && prev.shape === next.shape ? prev : next,
      );
    };
    update(box.clientWidth, box.clientHeight);
    const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width, entry.contentRect.height));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return { boxRef, size };
}

export default function MyGame({
  lang,
  hintRequest,
  restartRequest,
  introStartCue,
  onProgress,
  onStageEnter,
  onLevelComplete,
  onGameComplete,
  onAudioCue,
}: VolunteerGameProps) {
  const t = TEXT[lang];
  const [stage, setStage] = useState<Stage>('intro');
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [hintedId, setHintedId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const lastHint = useRef(hintRequest);
  const lastRestart = useRef(restartRequest);
  const reportedLevels = useRef(new Set<number>());
  const reportedGame = useRef(false);
  const { boxRef, size } = useSceneSize();

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

  // Clean up every timer when the game is removed.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  // Report each stage AFTER it is visibly on screen. Depends on `stage` only,
  // so a language change never re-reports a stage.
  useEffect(() => {
    const frame = requestAnimationFrame(() => callbacks.current.onStageEnter(stage));
    return () => cancelAnimationFrame(frame);
  }, [stage]);

  // Progress: (0, TOTAL) first, then every change.
  useEffect(() => {
    callbacks.current.onProgress(found.size, TOTAL);
  }, [found]);

  const level = typeof stage === 'number' ? LEVELS[stage] : null;
  const targets = level ? level.targets[size.shape] : [];

  // Hint: one increase of hintRequest = one hint.
  useEffect(() => {
    if (hintRequest === lastHint.current) return;
    lastHint.current = hintRequest;
    const next = targets.find((p) => !found.has(p.id));
    if (!next) return;
    setHintedId(next.id);
    later(() => setHintedId(null), 1800);
  }, [hintRequest, targets, found, later]);

  // Restart: reset the CURRENT level only (stay on the intro if there).
  useEffect(() => {
    if (restartRequest === lastRestart.current) return;
    lastRestart.current = restartRequest;
    if (!level) return;
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    const ids = new Set(level.targets.wide.map((p) => p.id));
    setFound((prev) => new Set([...prev].filter((id) => !ids.has(id))));
    reportedLevels.current.delete(stage as number);
    setHintedId(null);
    setFinished(false);
  }, [restartRequest, level, stage]);

  const tapStar = (id: string) => {
    if (!level || found.has(id)) return;
    const next = new Set(found).add(id);
    setFound(next);
    setHintedId(null);
    const levelIndex = stage as number;
    if (!level.targets.wide.every((p) => next.has(p.id))) return;

    if (!reportedLevels.current.has(levelIndex)) {
      reportedLevels.current.add(levelIndex);
      callbacks.current.onLevelComplete(levelIndex);
    }
    if (levelIndex === LEVELS.length - 1) {
      setFinished(true);
      callbacks.current.onAudioCue?.('game.complete');
      if (!reportedGame.current) {
        reportedGame.current = true;
        callbacks.current.onGameComplete();
      }
      return;
    }
    callbacks.current.onAudioCue?.('level.complete');
    later(() => setStage(levelIndex + 1), 1400);
  };

  const levelDone = !!level && level.targets.wide.every((p) => found.has(p.id));

  const scene: CSSProperties = {
    ...styles.scene,
    width: size.width,
    height: size.height,
    background: level ? level.background : 'linear-gradient(160deg, #3b1c8c, #6b16ff)',
  };

  return (
    <div ref={boxRef} style={styles.box}>
      {size.width > 0 && (
        <section style={scene} aria-label={stage === 'intro' ? t.introTitle : t.instruction}>
          {stage === 'intro' && (
            <div style={size.shape === 'tall' ? styles.introCardTall : styles.introCard}>
              <h2 style={styles.introTitle}>{t.introTitle}</h2>
              <p style={styles.introBody}>{t.introBody}</p>
              <button
                type="button"
                style={styles.startButton}
                data-intro-start-cue={introStartCue || undefined}
                onClick={() => setStage(0)}
              >
                {t.start} →
              </button>
            </div>
          )}

          {level && (
            <>
              {!levelDone && <p style={styles.instruction}>{t.instruction}</p>}
              {targets.map((p, index) =>
                found.has(p.id) ? null : (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={t.target(index + 1)}
                    onPointerDown={() => tapStar(p.id)}
                    style={{
                      ...styles.star,
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      boxShadow: hintedId === p.id ? '0 0 0 6px #ffd84d, 0 0 28px 10px #ffd84d' : undefined,
                    }}
                  >
                    ★
                  </button>
                ),
              )}
              {levelDone && (
                <div role="status" style={styles.done}>
                  {finished ? t.gameComplete : t.levelComplete}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  box: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  scene: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    userSelect: 'none',
    touchAction: 'manipulation',
    fontFamily: FONT,
  },
  introCard: {
    position: 'absolute',
    top: '6%',
    right: '4%',
    bottom: '6%',
    width: '44%',
    padding: '4%',
    borderRadius: 24,
    border: '4px solid #8a3ffc',
    background: 'rgba(43, 10, 110, 0.86)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '1em',
    fontSize: 'clamp(13px, 1.6vw, 20px)',
  },
  introCardTall: {
    position: 'absolute',
    left: '6%',
    right: '6%',
    bottom: '5%',
    padding: '6%',
    borderRadius: 24,
    border: '4px solid #8a3ffc',
    background: 'rgba(43, 10, 110, 0.86)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8em',
    fontSize: 16,
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
    fontSize: '1.05em',
    fontWeight: 700,
    cursor: 'pointer',
  },
  instruction: {
    position: 'absolute',
    left: '50%',
    bottom: '4%',
    transform: 'translateX(-50%)',
    margin: 0,
    padding: '0.5em 1.2em',
    borderRadius: 999,
    border: '3px solid #fff',
    background: '#2b0a6e',
    color: '#fff',
    fontSize: 'clamp(14px, 2vw, 22px)',
    whiteSpace: 'nowrap',
  },
  star: {
    position: 'absolute',
    width: 'clamp(48px, 11%, 84px)',
    aspectRatio: '1',
    transform: 'translate(-50%, -50%)',
    border: '3px solid #ffd84d',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.12)',
    color: '#ffd84d',
    fontSize: 'clamp(24px, 5vw, 42px)',
    fontFamily: FONT,
    cursor: 'pointer',
  },
  done: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    padding: '1em',
    textAlign: 'center',
    background: 'rgba(255, 255, 255, 0.85)',
    color: '#6b16ff',
    fontSize: 'clamp(22px, 4vw, 44px)',
  },
};

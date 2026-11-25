import { useCallback, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import type { GameConfig, Lang, Stage, VolunteerGameProps } from '../contract';
import { useShellAudio, type AudioItem } from './useShellAudio';
import './MockShell.css';

/**
 * PREVIEW ONLY. A look-alike of the Super Secret Code game page so you can see
 * and hear your game the way children will. It is not the app's real code and
 * is never delivered. Your game only receives the props in contract.ts.
 */

type Props = {
  config: GameConfig;
  Game: ComponentType<VolunteerGameProps>;
  startLang: Lang;
  layout: 'phone' | 'wide';
  /** Very short screens (phone landscape) get compact controls. */
  short?: boolean;
  log: (message: string, level?: 'info' | 'warn') => void;
};

const LABELS = {
  en: { hint: 'hint', restart: 'restart', tell: 'Tell Theresa', helper: 'Helper text', splash: 'Get ready for a game mission!', start: 'Start', play: 'Play instructions', pause: 'Pause' },
  fr: { hint: 'indice', restart: 'recommencer', tell: 'Dis-le à Theresa', helper: 'Aide', splash: 'Prépare-toi pour une mission-jeu !', start: 'Commencer', play: 'Écouter les consignes', pause: 'Pause' },
} as const;

export default function MockShell({ config, Game, startLang, layout, short = false, log }: Props) {
  const [lang, setLang] = useState<Lang>(startLang);
  const [hintRequest, setHintRequest] = useState(0);
  const [restartRequest, setRestartRequest] = useState(0);
  const [splash, setSplash] = useState(true);
  const [progress, setProgress] = useState<{ found: number; total: number } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [helperOpen, setHelperOpen] = useState(false);
  const [introCue, setIntroCue] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const langRef = useRef(lang);
  const splashRef = useRef(true);
  const stageRef = useRef<Stage | null>(null);
  const pendingStage = useRef<Stage | null>(null);
  const firstProgress = useRef(true);
  const totalWarned = useRef(false);
  const levelsReported = useRef(new Set<number>());
  const gameReported = useRef(false);

  const onNaturalEnd = useCallback((item: AudioItem, endedLang: Lang) => {
    if (item.kind === 'stage' && item.stage === 'intro' && stageRef.current === 'intro' && endedLang === langRef.current) {
      setIntroCue(true);
    }
  }, []);

  const audio = useShellAudio({ config, log, onNaturalEnd });
  const { play: playAudio, stop: stopAudio } = audio; // stable between renders

  // ---- Callbacks given to the game -------------------------------------

  const onProgress = useCallback(
    (found: number, total: number) => {
      if (firstProgress.current) {
        firstProgress.current = false;
        if (found !== 0) log(`First onProgress should be (0, ${total}) but was (${found}, ${total})`, 'warn');
      }
      if (total !== config.totalProgress && !totalWarned.current) {
        totalWarned.current = true;
        log(`onProgress total is ${total} but game.config.ts totalProgress is ${config.totalProgress}`, 'warn');
      }
      setProgress((prev) => (prev && prev.found === found && prev.total === total ? prev : { found, total }));
    },
    [config.totalProgress, log],
  );

  const onStageEnter = useCallback(
    (stage: Stage) => {
      log(`onStageEnter(${JSON.stringify(stage)})`);
      if (typeof stage === 'number' && stage >= config.stageAudio.levels.length) {
        log(`Stage ${stage} has no row in game.config.ts stageAudio.levels`, 'warn');
      }
      if (stage === 'intro' && !config.stageAudio.intro) {
        log('The game reported an intro but stageAudio.intro is null', 'warn');
      }
      const sameStage = stageRef.current === stage;
      stageRef.current = stage;
      setIntroCue(false);
      if (sameStage) log(`onStageEnter(${JSON.stringify(stage)}) was reported twice in a row`, 'warn');
      if (splashRef.current) {
        pendingStage.current = stage; // audio waits for the splash Start tap
        return;
      }
      if (sameStage) return;
      playAudio({ kind: 'stage', stage }, langRef.current);
    },
    [playAudio, config.stageAudio, log],
  );

  const onLevelComplete = useCallback(
    (levelIndex: number) => {
      log(`onLevelComplete(${levelIndex})`);
      if (levelsReported.current.has(levelIndex)) log(`onLevelComplete(${levelIndex}) was called more than once`, 'warn');
      levelsReported.current.add(levelIndex);
    },
    [log],
  );

  const onGameComplete = useCallback(() => {
    log('onGameComplete()');
    if (gameReported.current) {
      log('onGameComplete was called more than once', 'warn');
      return;
    }
    gameReported.current = true;
    setCompleted(true);
  }, [log]);

  const onAudioCue = useCallback(
    (key: string) => {
      log(`onAudioCue("${key}")`);
      if (!config.cueAudio[key]) log(`Cue key "${key}" is not in game.config.ts cueAudio`, 'warn');
      setIntroCue(false);
      playAudio({ kind: 'cue', key }, langRef.current);
    },
    [playAudio, config.cueAudio, log],
  );

  const onAudioStop = useCallback(() => {
    log('onAudioStop()');
    stopAudio();
  }, [stopAudio, log]);

  // ---- Shell controls ----------------------------------------------------

  const start = () => {
    // play() first, synchronously inside the tap, before any state change.
    const stage = pendingStage.current ?? (config.stageAudio.intro ? 'intro' : 0);
    audio.play({ kind: 'stage', stage }, langRef.current);
    splashRef.current = false;
    setSplash(false);
  };

  const flipLanguage = () => {
    const next: Lang = lang === 'en' ? 'fr' : 'en';
    langRef.current = next;
    setIntroCue(false);
    audio.switchLanguage(next); // same tap, so iPhone allows it
    setLang(next);
    log(`Language → ${next.toUpperCase()}`);
  };

  const hint = () => {
    setHintRequest((n) => n + 1);
    log('Hint tapped');
  };

  const restart = () => {
    setIntroCue(false);
    setRestartRequest((n) => n + 1);
    log('Restart tapped (current level)');
    audio.play({ kind: 'stage', stage: stageRef.current ?? 0 }, langRef.current);
  };

  const inert = (what: string) => {
    setToast(`${what} isn't active in the preview.`);
    window.setTimeout(() => setToast(null), 1800);
  };

  const next = () => {
    setToast('In the app, Next goes to the following activity.');
    window.setTimeout(() => setToast(null), 2200);
  };

  const L = LABELS[lang];
  // French pages say RÉCRÉ, English pages RECESS (follows the page language).
  const recessLetters = (startLang === 'fr' ? ['R', 'É', 'C', 'R', 'É'] : ['R', 'E', 'C', 'E', 'S', 'S']).map((c, i) => (
    <b key={i}>{c}</b>
  ));
  const playing = audio.state === 'playing' || audio.state === 'loading';
  const hasAudio = !!audio.current && audio.state !== 'missing';
  const total = progress?.total ?? config.totalProgress;
  const found = progress?.found ?? 0;

  return (
    <div className={`ssc ssc--${layout}${short ? ' ssc--short' : ''}${splash ? ' is-splash' : ''}`}>
      <header className="ssc-header">
        {layout === 'wide' && <div className="ssc-title">{config.headerTitle}</div>}
        <button type="button" className="ssc-logo" aria-label="Tips" onClick={() => inert('Tips')}>
          <span />
        </button>
        <div className="ssc-header-right">
          <button type="button" className="ssc-home" aria-label="Home" onClick={() => inert('Home')}>
            <span />
          </button>
          <button type="button" className="ssc-recess" onClick={() => inert('Recess')}>
            {recessLetters}
          </button>
        </div>
      </header>

      <div className="ssc-body">
        <aside className="ssc-controls">
          <button
            type="button"
            className={`ssc-player${hasAudio ? '' : ' is-dim'}${playing ? ' is-playing' : ''}`}
            aria-label={playing ? L.pause : L.play}
            onClick={() => audio.toggle(lang)}
          >
            <span className="ssc-player-btn">{playing ? '❚❚' : '▶'}</span>
            <span className="ssc-wave" aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.09}s` }} />)}
            </span>
          </button>
          <button type="button" className="ssc-lang" onClick={flipLanguage}>
            {lang === 'en' ? 'FR' : 'EN'}
          </button>
          <button type="button" className="ssc-hint" onClick={hint} disabled={completed || splash}>
            <span aria-hidden="true">💡</span> {L.hint}
          </button>
          <button type="button" className="ssc-restart" onClick={restart} disabled={completed || splash}>
            {L.restart}
          </button>
          <div className="ssc-counter" aria-live="polite">
            {found} / {total}
          </div>
          <div className="ssc-helper-wrap">
            <button
              type="button"
              className="ssc-clipboard"
              aria-label={L.helper}
              aria-expanded={helperOpen}
              onClick={() => setHelperOpen((o) => !o)}
            >
              📋
            </button>
            {helperOpen && <div className="ssc-helper">{config.helperText[lang]}</div>}
          </div>
        </aside>

        <main className="ssc-play">
          <Game
            lang={lang}
            hintRequest={hintRequest}
            restartRequest={restartRequest}
            introStartCue={introCue}
            onProgress={onProgress}
            onStageEnter={onStageEnter}
            onLevelComplete={onLevelComplete}
            onGameComplete={onGameComplete}
            onAudioCue={onAudioCue}
            onAudioStop={onAudioStop}
          />
        </main>

        <div className="ssc-footer-left">
          <button type="button" className="ssc-tell" onClick={() => inert('Tell Theresa')}>
            <span aria-hidden="true">📬</span>
            {L.tell}
          </button>
          <button type="button" className="ssc-tracker" aria-label="Activity tracker" onClick={() => inert('The activity tracker')}>
            <span aria-hidden="true">˄</span>
            <i />
          </button>
        </div>
        <button type="button" className="ssc-prev" aria-label="Previous" onClick={() => inert('Previous')}>
          ‹
        </button>
        <button
          type="button"
          className={`ssc-next${completed ? ' is-ready' : ''}`}
          aria-label="Next"
          disabled={!completed}
          onClick={next}
        >
          ›
        </button>
      </div>

      {splash && (
        <div className="ssc-splash">
          <div className="ssc-splash-top">
            <button type="button" className="ssc-home" aria-label="Home" onClick={() => inert('Home')}>
              <span />
            </button>
            <button type="button" className="ssc-recess" onClick={() => inert('Recess')}>
              {recessLetters}
            </button>
          </div>
          <div className="ssc-splash-floor" aria-hidden="true" />
          <div className="ssc-splash-center">
            <div className="ssc-splash-avatar" aria-hidden="true">
              <span>avatar</span>
            </div>
            <div className="ssc-splash-banner">
              <p className="ssc-splash-primary">{LABELS[startLang].splash}</p>
              <p className="ssc-splash-secondary">{LABELS[startLang === 'en' ? 'fr' : 'en'].splash}</p>
            </div>
            {/* The real splash's Start control and timing may differ; this one is approximate. */}
            <button type="button" className="ssc-splash-start" onClick={start}>
              {LABELS[startLang].start}
            </button>
          </div>
        </div>
      )}

      {toast && <div className="ssc-toast">{toast}</div>}
    </div>
  );
}

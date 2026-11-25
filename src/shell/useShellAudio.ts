import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioPair, GameConfig, Lang, Stage } from '../contract';
import { NOT_AVAILABLE } from '../contract';

/**
 * PREVIEW ONLY. A simplified copy of how the app's purple player behaves:
 * one audio element for the whole visit, each new request replaces the last,
 * EN/FR switches what is playing, pause/replay work, stale events are ignored.
 * The real app has its own version; your game never imports this.
 */

export type AudioItem = { kind: 'stage'; stage: Stage } | { kind: 'cue'; key: string };
export type PlayState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'blocked' | 'missing' | 'error';

export function describe(item: AudioItem | null): string {
  if (!item) return 'nothing';
  if (item.kind === 'cue') return `cue "${item.key}"`;
  return item.stage === 'intro' ? 'intro' : `level ${item.stage + 1} (stage ${item.stage})`;
}

export function pairFor(config: GameConfig, item: AudioItem): AudioPair | typeof NOT_AVAILABLE | null {
  if (item.kind === 'cue') return config.cueAudio[item.key] ?? null;
  if (item.stage === 'intro') return config.stageAudio.intro;
  return config.stageAudio.levels[item.stage] ?? null;
}

type Options = {
  config: GameConfig;
  log: (message: string, level?: 'info' | 'warn') => void;
  onNaturalEnd: (item: AudioItem, lang: Lang) => void;
};

export function useShellAudio({ config, log, onNaturalEnd }: Options) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef(0);
  const currentRef = useRef<{ item: AudioItem; lang: Lang } | null>(null);
  const [state, setState] = useState<PlayState>('idle');
  const [current, setCurrent] = useState<{ item: AudioItem; lang: Lang } | null>(null);
  const endRef = useRef(onNaturalEnd);
  endRef.current = onNaturalEnd;

  const audio = () => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  };

  useEffect(() => {
    const el = audio();
    const isCurrent = () => el.dataset.request === String(requestRef.current);
    const onPlaying = () => isCurrent() && setState('playing');
    const onPause = () => isCurrent() && !el.ended && setState('paused');
    const onWaiting = () => isCurrent() && setState('loading');
    const onError = () => {
      if (!isCurrent() || !el.getAttribute('src')) return;
      setState('error');
      log(`Recording failed to load: ${el.getAttribute('src')}`, 'warn');
    };
    const onEnded = () => {
      if (!isCurrent()) return;
      setState('ended');
      const playing = currentRef.current;
      if (playing) endRef.current(playing.item, playing.lang);
    };
    el.addEventListener('playing', onPlaying);
    el.addEventListener('pause', onPause);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('error', onError);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('error', onError);
      el.removeEventListener('ended', onEnded);
      el.pause();
    };
  }, [log]);

  /** Must be called synchronously inside a tap handler the first time (iPhone rule). */
  const play = useCallback(
    (item: AudioItem, lang: Lang) => {
      const el = audio();
      const id = ++requestRef.current;
      el.pause();
      currentRef.current = { item, lang };
      setCurrent({ item, lang });
      const pair = pairFor(config, item);
      if (pair === NOT_AVAILABLE) {
        el.removeAttribute('src');
        setState('idle');
        log(`No recording for ${describe(item)} (NOT AVAILABLE on purpose)`);
        return;
      }
      if (!pair || !pair[lang]) {
        el.removeAttribute('src');
        setState('missing');
        log(`No ${lang.toUpperCase()} recording for ${describe(item)} in game.config.ts`, 'warn');
        return;
      }
      el.dataset.request = String(id);
      el.src = pair[lang];
      el.currentTime = 0;
      setState('loading');
      log(`Playing ${describe(item)} in ${lang.toUpperCase()}`);
      el.play().catch((error: unknown) => {
        if (id !== requestRef.current) return;
        const blocked = error instanceof DOMException && error.name === 'NotAllowedError';
        setState(blocked ? 'blocked' : 'error');
        log(blocked ? 'Browser blocked autoplay; tap the purple play button.' : `Could not play ${pair[lang]}`, 'warn');
      });
    },
    [config, log],
  );

  const stop = useCallback(() => {
    requestRef.current++;
    audio().pause();
    setState((s) => (s === 'missing' ? s : 'idle'));
  }, []);

  /** Purple play button: pause, resume, or replay the latest recording. */
  const toggle = useCallback(
    (lang: Lang) => {
      const el = audio();
      const now = currentRef.current;
      if (!now) return;
      if (state === 'playing' || state === 'loading') {
        el.pause();
        return;
      }
      if (state === 'paused' && now.lang === lang) {
        el.play().catch(() => setState('blocked'));
        return;
      }
      play(now.item, lang);
    },
    [play, state],
  );

  /** EN/FR button: whatever is playing (or paused mid-way) switches language and starts again. */
  const switchLanguage = useCallback(
    (lang: Lang) => {
      const now = currentRef.current;
      if (now && (state === 'playing' || state === 'loading' || state === 'paused')) play(now.item, lang);
      else if (now) {
        currentRef.current = { ...now, lang };
        setCurrent({ ...now, lang });
      }
    },
    [play, state],
  );

  return { state, current, play, stop, toggle, switchLanguage };
}

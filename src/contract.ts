/**
 * The contract between a volunteer game and the Super Secret Code page shell.
 * DO NOT CHANGE THIS FILE. The real app uses the same props.
 *
 * Your game is only the play area. The shell (the app around it) owns:
 * the header, the purple audio player, the EN/FR button, Hint, Restart,
 * the progress counter, helper text, the splash screen and Previous/Next.
 * Never draw your own versions of these inside the game.
 */

export type Lang = 'en' | 'fr';

/** 'intro' for an intro screen inside the game, or a zero-based level index. */
export type Stage = 'intro' | number;

export type VolunteerGameProps = {
  /**
   * The language to show. It can change at any time (the child taps EN/FR).
   * Every piece of child-facing text, including aria-labels, comes from
   * your TEXT[lang] object. A language change must NOT restart the game,
   * reset progress, or call onStageEnter again.
   */
  lang: Lang;

  /** Goes up by 1 each time the child taps the shell's Hint button. One increase = one hint. */
  hintRequest: number;

  /** Goes up by 1 each time the child taps the shell's Restart button. Restart the CURRENT level (or stay on the intro). */
  restartRequest: number;

  /**
   * True once the intro recording has finished playing naturally.
   * Put data-intro-start-cue={introStartCue || undefined} on the ONE button
   * that leaves your intro for level 1. The shell supplies the yellow glow.
   * The button must still work before the recording ends.
   * Games without an intro screen can ignore this.
   */
  introStartCue?: boolean;

  /** Call with (0, total) first, then every time the count changes. */
  onProgress: (found: number, total: number) => void;

  /**
   * Call after a stage is visibly on screen: 'intro' for your intro screen,
   * 0 for level 1, 1 for level 2, and so on. The shell plays that stage's
   * instruction recording from STAGE_AUDIO in game.config.ts.
   */
  onStageEnter: (stage: Stage) => void;

  /** Call once per level when it is finished (zero-based index). Does not change audio. */
  onLevelComplete: (levelIndex: number) => void;

  /** Call once when the whole game is finished. The shell unlocks Next and saves completion. */
  onGameComplete: () => void;

  /**
   * Optional: ask the shell to play a recording during play (for example a clue
   * when the child taps an object). Pass a key from CUE_AUDIO in game.config.ts.
   * The shell plays it in the purple player, in the current language, with
   * pause/replay and EN/FR switching. Never play recordings yourself.
   */
  onAudioCue?: (key: string) => void;

  /** Optional: ask the shell to stop the current recording (for example when leaving a room). */
  onAudioStop?: () => void;
};

/** One recording in both languages. Use full URLs or paths under /game-assets/. */
export type AudioPair = { en: string; fr: string };

/** A stage with no recording on purpose. */
export const NOT_AVAILABLE = 'NOT AVAILABLE' as const;

export type GameConfig = {
  /** Shown in the preview only. Theresa chooses the real names. */
  gameName: string;

  /** The language the game starts in: 'en' for English blocks, 'fr' for French blocks. */
  pageLanguage: Lang;

  /** Preview only: Theresa sets the real header title, for example "Bloc 3 : A, E, O". */
  headerTitle: string;

  /** The text behind the clipboard button, in both languages. One or two short sentences. */
  helperText: { en: string; fr: string };

  /** The total your onProgress reports, for example 24 for 24 artifacts. */
  totalProgress: number;

  /**
   * Instruction recording for each stage.
   * intro: the intro screen's recording (null if the game has no intro screen).
   * levels: one entry per level, in order. Use NOT_AVAILABLE for a level with no recording.
   */
  stageAudio: {
    intro: AudioPair | null;
    levels: Array<AudioPair | typeof NOT_AVAILABLE>;
  };

  /** Recordings the game asks for during play with onAudioCue(key). Empty object if none. */
  cueAudio: Record<string, AudioPair>;
};

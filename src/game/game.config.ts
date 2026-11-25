import type { GameConfig } from '../contract';
// For a level with no recording on purpose, also import NOT_AVAILABLE from '../contract'
// and use it in stageAudio.levels instead of a recording pair.

/**
 * Everything the app needs to know about your game, in one place.
 * Fill this in for every new game and deliver it with your .tsx files.
 * The mock shell reads it, so what you hear and see in the preview is what
 * children will get in the app.
 *
 * Audio: use the final URLs if Theresa has given them to you; otherwise use
 * paths under /game-assets/audio/ and list the files in your delivery.
 * Every recording needs BOTH English and French.
 */

export const GAME_CONFIG: GameConfig = {
  gameName: 'Star Tap (starter example)',

  pageLanguage: 'en',

  headerTitle: 'Block 3: Game',

  helperText: {
    en: 'Tap every star to light up the sky.',
    fr: 'Touche toutes les étoiles pour illuminer le ciel.',
  },

  totalProgress: 5,

  stageAudio: {
    intro: {
      en: '/game-assets/audio/demo-intro-en.wav',
      fr: '/game-assets/audio/demo-intro-fr.wav',
    },
    levels: [
      {
        en: '/game-assets/audio/demo-level1-en.wav',
        fr: '/game-assets/audio/demo-level1-fr.wav',
      },
      {
        en: '/game-assets/audio/demo-level2-en.wav',
        fr: '/game-assets/audio/demo-level2-fr.wav',
      },
    ],
  },

  cueAudio: {
    'level.complete': {
      en: '/game-assets/audio/demo-level-complete-en.wav',
      fr: '/game-assets/audio/demo-level-complete-fr.wav',
    },
    'game.complete': {
      en: '/game-assets/audio/demo-game-complete-en.wav',
      fr: '/game-assets/audio/demo-game-complete-fr.wav',
    },
  },
};

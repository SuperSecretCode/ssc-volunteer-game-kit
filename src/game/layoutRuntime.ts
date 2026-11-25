import type { CSSProperties } from 'react';
import type { Lang, TuningState } from '../contract';

/**
 * Layout helper. DELIVER THIS FILE WITH YOUR GAME (don't change it).
 *
 * Your game reads every position, size, rotation, layer, font size, per-device
 * image and visible text from layout.json through this helper. In the kit,
 * when Tune layout is on, it reads the live draft instead, so changes show up
 * as you make them. In the app there is no Tune, so it reads layout.json only.
 */

export type Profile = 'desktop' | 'tablet' | 'phone';

/** One item on one device. x, y, w, h are % of the game box (x, y = top-left corner). */
export type ItemBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise. */
  rotate?: number;
  /** Layer: higher is in front. */
  z?: number;
  /** Text size in px when the game box is 1000 px wide (it scales with the box). */
  font?: number;
  /** Image for this device, for example '/game-assets/sky-phone.webp'. */
  src?: string;
};

export type LayoutFile = {
  schema: 'ssc-layout-1';
  profiles: Record<Profile, Record<string, ItemBox>>;
  /** Visible text, both languages. Changing recorded text needs a new recording: tell Theresa. */
  text: Record<string, { en: string; fr: string }>;
};

/** Which device layout to use, from the game box's shape (16:9 desktop, 4:3 tablet, 9:16 phone). */
export function profileFor(width: number, height: number): Profile {
  const ratio = width / height;
  if (ratio < 1) return 'phone';
  return ratio > 1.55 ? 'desktop' : 'tablet';
}

type Size = { width: number; height: number; profile: Profile };

export function makeLayout(file: LayoutFile, tuning: TuningState | undefined, size: Size, lang: Lang) {
  const source = (tuning?.layout ?? file) as LayoutFile;
  const items = source.profiles[size.profile] ?? {};

  /** Spread onto any element you want positioned and tunable: <img {...L.box('cody')} />. */
  const box = (id: string, extra?: CSSProperties) => {
    const b = items[id];
    if (!b) {
      console.warn(`[layout] No "${id}" in layout.json for ${size.profile}`);
      return { 'data-tune': id, style: { display: 'none', ...extra } as CSSProperties };
    }
    const style: CSSProperties = {
      position: 'absolute',
      left: `${b.x}%`,
      top: `${b.y}%`,
      width: `${b.w}%`,
      height: `${b.h}%`,
      zIndex: b.z ?? 1,
      transform: b.rotate ? `rotate(${b.rotate}deg)` : undefined,
      fontSize: b.font ? (b.font * size.width) / 1000 : undefined,
      ...extra,
    };
    if (tuning?.hidden.includes(id)) style.visibility = 'hidden';
    if (tuning?.ghosted.includes(id)) style.opacity = 0.3;
    return { 'data-tune': id, style };
  };

  /** Visible text in the current language. */
  const text = (id: string) => source.text[id]?.[lang] ?? `[${id}]`;

  /** The image for this item on this device. */
  const src = (id: string) => items[id]?.src ?? '';

  return { box, text, src, profile: size.profile };
}

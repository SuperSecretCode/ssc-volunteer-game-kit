import { useRef, useState } from 'react';
import type { ItemBox, LayoutFile, Profile } from '../game/layoutRuntime';
import './TunePanel.css';

/**
 * PREVIEW ONLY. The kit's standard Tune panel. It edits a draft of the game's
 * layout.json; the game shows the draft live while Tune is on. Never delivered.
 */

type Props = {
  draft: LayoutFile;
  profile: Profile;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChangeItem: (id: string, patch: Partial<ItemBox>) => void;
  onChangeText: (id: string, lang: 'en' | 'fr', value: string) => void;
  hidden: string[];
  ghosted: string[];
  onToggleHidden: (id: string) => void;
  onToggleGhost: (id: string) => void;
  onShowAll: () => void;
  screens: Array<{ id: string; label: string }>;
  onScreen: (id: string) => void;
  onResetItem: (id: string) => void;
  onResetProfile: () => void;
  onResetText: (id: string) => void;
  onDiscardDraft: () => void;
  draftNote: string | null;
  onClose: () => void;
};

const NUDGE = 0.5;
// Start on the right, over the callback log, so the game stays visible.
const homePosition = () => ({ x: Math.max(16, window.innerWidth - 350), y: 56 });
const round = (n: number) => Math.round(n * 10) / 10;

export default function TunePanel(props: Props) {
  const { draft, profile, selected } = props;
  const items = draft.profiles[profile] ?? {};
  const ids = Object.keys(items).sort((a, b) => (items[b].z ?? 1) - (items[a].z ?? 1) || a.localeCompare(b));
  const item = selected ? items[selected] : undefined;
  const textIds = Object.keys(draft.text);
  const [textId, setTextId] = useState<string>(textIds[0] ?? '');
  const shownTextId = selected && draft.text[selected] ? selected : textId;
  const [pos, setPos] = useState(homePosition);
  const [minimized, setMinimized] = useState(false);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const change = (patch: Partial<ItemBox>) => selected && props.onChangeItem(selected, patch);
  const scale = (fw: number, fh: number) => {
    if (!item) return;
    // Grow or shrink around the centre.
    const w = round(item.w * fw);
    const h = round(item.h * fh);
    change({ w, h, x: round(item.x - (w - item.w) / 2), y: round(item.y - (h - item.h) / 2) });
  };

  const copy = (label: string, text: string) => {
    const done = () => {
      setCopyNote(`${label} copied`);
      setFallback(null);
      window.setTimeout(() => setCopyNote(null), 2000);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => setFallback(text));
    else setFallback(text);
  };

  const numberField = (key: keyof ItemBox, label: string, step = 0.5) => (
    <label className="tune-num">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={item && typeof item[key] === 'number' ? (item[key] as number) : ''}
        placeholder="–"
        onChange={(e) => {
          const raw = e.target.value;
          change({ [key]: raw === '' ? undefined : Number(raw) } as Partial<ItemBox>);
        }}
      />
    </label>
  );

  return (
    <div className={`tune-panel${minimized ? ' is-min' : ''}`} style={{ left: pos.x, top: pos.y }}>
      <div
        className="tune-grip"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current) setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <strong>Tune layout</strong>
        <span className="tune-profile">{profile}</span>
        <button type="button" onClick={() => setMinimized((m) => !m)}>{minimized ? 'Expand' : 'Minimize'}</button>
        <button type="button" onClick={() => setPos(homePosition())} title="Reset panel position">⌖</button>
        <button type="button" onClick={props.onClose} title="Turn Tune off">✕</button>
      </div>

      {!minimized && (
        <div className="tune-body">
          {props.draftNote && (
            <p className="tune-note">
              {props.draftNote}{' '}
              <button type="button" className="tune-link" onClick={props.onDiscardDraft}>Discard draft</button>
            </p>
          )}

          <label className="tune-row">
            <span>Screen</span>
            <select defaultValue="" onChange={(e) => e.target.value && props.onScreen(e.target.value)}>
              <option value="">Jump to…</option>
              {props.screens.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>

          <label className="tune-row">
            <span>Item</span>
            <select value={selected ?? ''} onChange={(e) => props.onSelect(e.target.value || null)}>
              <option value="">Tap an item in the game…</option>
              {ids.map((id) => (
                <option key={id} value={id}>
                  {id}{props.hidden.includes(id) ? ' (hidden)' : ''}{props.ghosted.includes(id) ? ' (ghost)' : ''}
                </option>
              ))}
            </select>
          </label>

          {item && selected && (
            <>
              <div className="tune-grid">
                {numberField('x', 'x %')}
                {numberField('y', 'y %')}
                {numberField('w', 'width %')}
                {numberField('h', 'height %')}
                {numberField('rotate', 'rotate °', 1)}
                {numberField('z', 'layer', 1)}
                {numberField('font', 'text size', 1)}
              </div>

              <div className="tune-buttons">
                <div className="tune-pad">
                  <button type="button" onClick={() => change({ y: round(item.y - NUDGE) })} aria-label="Up">↑</button>
                  <button type="button" onClick={() => change({ x: round(item.x - NUDGE) })} aria-label="Left">←</button>
                  <button type="button" onClick={() => change({ x: round(item.x + NUDGE) })} aria-label="Right">→</button>
                  <button type="button" onClick={() => change({ y: round(item.y + NUDGE) })} aria-label="Down">↓</button>
                </div>
                <button type="button" onClick={() => scale(1.05, 1.05)}>Larger</button>
                <button type="button" onClick={() => scale(1 / 1.05, 1 / 1.05)}>Smaller</button>
                <button type="button" onClick={() => scale(1.05, 1)}>Wider</button>
                <button type="button" onClick={() => scale(1 / 1.05, 1)}>Narrower</button>
                <button type="button" onClick={() => scale(1, 1.05)}>Taller</button>
                <button type="button" onClick={() => scale(1, 1 / 1.05)}>Shorter</button>
                <button type="button" onClick={() => change({ rotate: round((item.rotate ?? 0) - 2) })}>Rotate −2°</button>
                <button type="button" onClick={() => change({ rotate: round((item.rotate ?? 0) + 2) })}>Rotate +2°</button>
                <button type="button" onClick={() => change({ z: (item.z ?? 1) + 1 })}>Bring forward</button>
                <button type="button" onClick={() => change({ z: (item.z ?? 1) - 1 })}>Send back</button>
                <button type="button" onClick={() => props.onToggleHidden(selected)}>
                  {props.hidden.includes(selected) ? 'Show' : 'Hide'}
                </button>
                <button type="button" onClick={() => props.onToggleGhost(selected)}>
                  {props.ghosted.includes(selected) ? 'Unghost' : 'Ghost'}
                </button>
                <button type="button" onClick={() => props.onResetItem(selected)}>Reset item</button>
              </div>
              {item.src !== undefined && (
                <label className="tune-row">
                  <span>Image</span>
                  <input value={item.src} onChange={(e) => change({ src: e.target.value })} />
                </label>
              )}
            </>
          )}

          <div className="tune-buttons">
            <button type="button" onClick={props.onShowAll}>Show all</button>
            <button type="button" onClick={props.onResetProfile}>Reset {profile}</button>
          </div>

          {textIds.length > 0 && (
            <fieldset className="tune-text">
              <legend>Text</legend>
              <select value={shownTextId} onChange={(e) => setTextId(e.target.value)}>
                {textIds.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
              <label>
                English
                <textarea rows={2} value={draft.text[shownTextId]?.en ?? ''} onChange={(e) => props.onChangeText(shownTextId, 'en', e.target.value)} />
              </label>
              <label>
                Français
                <textarea rows={2} value={draft.text[shownTextId]?.fr ?? ''} onChange={(e) => props.onChangeText(shownTextId, 'fr', e.target.value)} />
              </label>
              <button type="button" onClick={() => props.onResetText(shownTextId)}>Reset text</button>
              <p className="tune-warn">If this text is also recorded, the recording must be redone: tell Theresa.</p>
            </fieldset>
          )}

          <div className="tune-buttons tune-copy">
            <button type="button" onClick={() => copy(`${profile} layout`, JSON.stringify(draft.profiles[profile], null, 2))}>
              Copy {profile} only
            </button>
            <button type="button" className="tune-primary" onClick={() => copy('layout.json', `${JSON.stringify(draft, null, 2)}\n`)}>
              Copy all (layout.json)
            </button>
          </div>
          {copyNote && <p className="tune-note">{copyNote}. Paste it into src/game/layout.json.</p>}
          {fallback && (
            <label className="tune-row">
              <span>Copy this text:</span>
              <textarea rows={4} readOnly value={fallback} onFocus={(e) => e.target.select()} />
            </label>
          )}
          <p className="tune-help">
            Tap an item in the game to select it, then drag it. Drafts are kept in this browser while Tune is on;
            the game only uses layout.json, so paste your changes there.
          </p>
        </div>
      )}
    </div>
  );
}

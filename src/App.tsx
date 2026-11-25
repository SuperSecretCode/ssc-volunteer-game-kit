import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Lang, TuningState } from './contract';
import MockShell from './shell/MockShell';
import TunePanel from './shell/TunePanel';
import { GAME_CONFIG } from './game/game.config';
import layoutFile from './game/layout.json';
import type { ItemBox, LayoutFile, Profile } from './game/layoutRuntime';
// To preview a different game, change this import to your game file.
import MyGame from './game/MyGame';

/** PREVIEW TOOLS ONLY — the grey bar and log are never part of the app. */

// Desktop and tablet come first: they're the priority for games.
// shape = the box the app gives the game on that device.
const DEVICES = {
  desktop: { label: 'Desktop', width: 1440, height: 900, shape: '16:9' },
  tablet: { label: 'Tablet landscape', width: 1180, height: 820, shape: '4:3' },
  tabletPortrait: { label: 'Tablet portrait', width: 820, height: 1180, shape: '4:3' },
  phoneLandscape: { label: 'Phone landscape', width: 844, height: 390, shape: '16:9' },
  phone: { label: 'Phone portrait', width: 390, height: 844, shape: '9:16' },
} as const;
type DeviceId = keyof typeof DEVICES;

const FILE = layoutFile as LayoutFile;
const DRAFT_KEY = `ssc-kit-tune-draft:${GAME_CONFIG.gameName}`;
const PROFILE_FOR_SHAPE: Record<string, Profile> = { '16:9': 'desktop', '4:3': 'tablet', '9:16': 'phone' };
const round = (n: number) => Math.round(n * 10) / 10;
const clean = (box: ItemBox): ItemBox =>
  Object.fromEntries(Object.entries(box).filter(([, v]) => v !== undefined && !Number.isNaN(v))) as ItemBox;

type LogEntry = { id: number; time: string; message: string; level: 'info' | 'warn' };

export default function App() {
  const [device, setDevice] = useState<DeviceId>('desktop');
  const [startLang, setStartLang] = useState<Lang>(GAME_CONFIG.pageLanguage);
  const [visit, setVisit] = useState(0);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  // In a narrow window (like StackBlitz's preview panel) start with the log hidden so the game gets the space.
  const [tuning, setTuning] = useState(false);
  const [draft, setDraft] = useState<LayoutFile>(() => structuredClone(FILE));
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [ghosted, setGhosted] = useState<string[]>([]);
  const [screen, setScreen] = useState<{ id: string | null; n: number }>({ id: null, n: 0 });
  const dragStart = useRef<ItemBox | null>(null);
  const [showLog, setShowLog] = useState(() => window.innerWidth >= 1100);
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const log = useCallback((message: string, level: 'info' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setEntries((list) => [{ id: nextId.current++, time, message, level }, ...list].slice(0, 80));
  }, []);

  const { width, height, shape } = DEVICES[device];
  const profile = PROFILE_FOR_SHAPE[shape];

  // ---- Tune (preview only) ----
  // Drafts live in this browser ONLY while Tune is on. With Tune off, the game uses layout.json.
  useEffect(() => {
    if (!tuning) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable: drafts just won't survive a reload */
    }
  }, [tuning, draft]);

  const tuneOn = () => {
    let restored: LayoutFile | null = null;
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
      if (saved?.schema === 'ssc-layout-1' && JSON.stringify(saved) !== JSON.stringify(FILE)) restored = saved;
    } catch {
      restored = null;
    }
    setDraft(restored ?? structuredClone(FILE));
    setDraftNote(restored ? 'Unsaved draft restored from this browser.' : null);
    setTuning(true);
    log('Tune layout on (preview only)');
  };
  const tuneOff = () => {
    setTuning(false);
    setSelected(null);
    setHidden([]);
    setGhosted([]);
    log('Tune layout off: the game shows layout.json');
  };
  const updateItem = (id: string, patch: Partial<ItemBox>) =>
    setDraft((d) => ({
      ...d,
      profiles: { ...d.profiles, [profile]: { ...d.profiles[profile], [id]: clean({ ...d.profiles[profile][id], ...patch }) } },
    }));
  const updateText = (id: string, lang: 'en' | 'fr', value: string) =>
    setDraft((d) => ({ ...d, text: { ...d.text, [id]: { ...d.text[id], [lang]: value } } }));
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const tuningState: TuningState | undefined = tuning
    ? { layout: draft, screen: screen.id, screenRequest: screen.n, hidden, ghosted }
    : undefined;
  // The real app shows its phone layout on narrow screens.
  const layout = width < 700 ? 'phone' : 'wide';
  const short = height < 520; // phone landscape: compact controls

  // Shrink big device frames to fit the window (the shell still lays out at full size).
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const box = el.getBoundingClientRect();
      setScale(Math.min(1, (box.width - 24) / width, (box.height - 24) / height));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height, showLog]);

  const freshVisit = () => {
    setEntries([]);
    setVisit((v) => v + 1);
  };

  const warnings = entries.filter((e) => e.level === 'warn').length;

  return (
    <div className="preview">
      <div className="preview-bar">
        <strong className="preview-name">{GAME_CONFIG.gameName}</strong>
        <div className="preview-group" role="group" aria-label="Device">
          {(Object.keys(DEVICES) as DeviceId[]).map((id) => (
            <button key={id} type="button" aria-pressed={device === id} onClick={() => setDevice(id)}>
              {DEVICES[id].label}
            </button>
          ))}
        </div>
        <label className="preview-select">
          Start in{' '}
          <select
            value={startLang}
            onChange={(e) => {
              setStartLang(e.target.value as Lang);
              freshVisit();
            }}
          >
            <option value="en">English page</option>
            <option value="fr">French page</option>
          </select>
        </label>
        <button type="button" onClick={freshVisit}>Fresh visit</button>
        <button
          type="button"
          aria-pressed={tuning}
          title="Preview only: lets your game show its tuning tools. The app never turns this on."
          onClick={() => (tuning ? tuneOff() : tuneOn())}
        >
          Tune layout
        </button>
        <button type="button" aria-pressed={showLog} onClick={() => setShowLog((s) => !s)}>
          Callback log{warnings ? ` (${warnings} ⚠)` : ''}
        </button>
      </div>

      <div className="preview-main">
        <div className="preview-stage" ref={stageRef}>
          <div className="preview-device" style={{ width: width * scale, height: height * scale }}>
            <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <MockShell
                key={`${visit}-${startLang}`}
                config={GAME_CONFIG}
                Game={MyGame}
                startLang={startLang}
                layout={layout}
                short={short}
                shape={shape}
                tuning={tuningState}
                tune={{
                  selected,
                  onSelect: setSelected,
                  onDragStart: (id) => {
                    dragStart.current = draft.profiles[profile][id] ?? null;
                  },
                  onDrag: (id, dx, dy) => {
                    const start = dragStart.current;
                    if (start) updateItem(id, { x: round(start.x + dx), y: round(start.y + dy) });
                  },
                }}
                log={log}
              />
            </div>
          </div>
        </div>

        {tuning && (
          <TunePanel
            draft={draft}
            profile={profile}
            selected={selected}
            onSelect={setSelected}
            onChangeItem={updateItem}
            onChangeText={updateText}
            hidden={hidden}
            ghosted={ghosted}
            onToggleHidden={(id) => setHidden((h) => toggle(h, id))}
            onToggleGhost={(id) => setGhosted((g) => toggle(g, id))}
            onShowAll={() => {
              setHidden([]);
              setGhosted([]);
            }}
            screens={GAME_CONFIG.screens}
            onScreen={(id) => setScreen((s) => ({ id, n: s.n + 1 }))}
            onResetItem={(id) => {
              const original = FILE.profiles[profile][id];
              if (original)
                setDraft((d) => ({
                  ...d,
                  profiles: { ...d.profiles, [profile]: { ...d.profiles[profile], [id]: structuredClone(original) } },
                }));
            }}
            onResetProfile={() =>
              setDraft((d) => ({ ...d, profiles: { ...d.profiles, [profile]: structuredClone(FILE.profiles[profile]) } }))
            }
            onResetText={(id) => {
              const original = FILE.text[id];
              if (original) setDraft((d) => ({ ...d, text: { ...d.text, [id]: { ...original } } }));
            }}
            onDiscardDraft={() => {
              try {
                localStorage.removeItem(DRAFT_KEY);
              } catch {
                /* ignore */
              }
              setDraft(structuredClone(FILE));
              setDraftNote(null);
            }}
            draftNote={draftNote}
            onClose={tuneOff}
          />
        )}

        {showLog && (
          <aside className="preview-log">
            <h2>What your game told the shell</h2>
            <p className="preview-hint">Newest first. ⚠ lines are problems to fix before delivery.</p>
            <ol>
              {entries.map((e) => (
                <li key={e.id} className={e.level === 'warn' ? 'is-warn' : undefined}>
                  <time>{e.time}</time> {e.level === 'warn' ? '⚠ ' : ''}
                  {e.message}
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>
    </div>
  );
}

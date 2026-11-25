import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { Lang } from './contract';
import MockShell from './shell/MockShell';
import { GAME_CONFIG } from './game/game.config';
// To preview a different game, change this import to your game file.
import MyGame from './game/MyGame';

/** PREVIEW TOOLS ONLY — the grey bar and log are never part of the app. */

// Desktop and tablet come first: they're the priority for games.
const DEVICES = {
  desktop: { label: 'Desktop', width: 1440, height: 900 },
  tablet: { label: 'Tablet landscape', width: 1180, height: 820 },
  tabletPortrait: { label: 'Tablet portrait', width: 820, height: 1180 },
  phoneLandscape: { label: 'Phone landscape', width: 844, height: 390 },
  phone: { label: 'Phone portrait', width: 390, height: 844 },
} as const;
type DeviceId = keyof typeof DEVICES;

type LogEntry = { id: number; time: string; message: string; level: 'info' | 'warn' };

export default function App() {
  const [device, setDevice] = useState<DeviceId>('desktop');
  const [startLang, setStartLang] = useState<Lang>(GAME_CONFIG.pageLanguage);
  const [visit, setVisit] = useState(0);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(true);
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const log = useCallback((message: string, level: 'info' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setEntries((list) => [{ id: nextId.current++, time, message, level }, ...list].slice(0, 80));
  }, []);

  const { width, height } = DEVICES[device];
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
                log={log}
              />
            </div>
          </div>
        </div>

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

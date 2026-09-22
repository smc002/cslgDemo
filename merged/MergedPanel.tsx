'use client';
import { useEffect, useRef, useState } from 'react';
import {
  campaign,
  heroPower,
  slotsUnlocked,
  validLineup,
  autoLineup,
} from '@/lib/campaign';
import { stageAmmo } from '@/lib/balance';
import { MergedBattle, HEROES, SLOTS, COLORS } from './simulation';
import { RECRUIT_HEROES } from '@/lib/recruit';
import { MergedView } from './view';
import HeroPortrait from '@/shared/HeroPortrait';
import '@/shared/portrait.css';
import './merged.css';
export type BattleStatus = {
  stage: number;
  wave: number;
  phase: string;
  alive: number;
  enemies: number;
  paused: boolean;
  boss: boolean;
};
declare global {
  interface Window {
    moriMerged?: {
      snapshot: () => ReturnType<MergedBattle['snapshot']>;
      start: () => void;
      prepare: () => void;
      pause: (v: boolean) => void;
      speed: (n: number) => void;
    };
  }
}
export default function MergedPanel({
  active,
  onStatus,
}: {
  active: boolean;
  onStatus?: (s: BattleStatus) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    frame = useRef<HTMLDivElement>(null),
    game = useRef<MergedBattle | null>(null),
    view = useRef<MergedView | null>(null),
    activeRef = useRef(active),
    notify = useRef(onStatus);
  notify.current = onStatus;
  const [state, setState] = useState(() => new MergedBattle().snapshot()),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [selected, setSelected] = useState<number | null>(null),
    [picked, setPicked] = useState<number | null>(null),
    [revision, setRevision] = useState(0),
    [stage, setStage] = useState(1),
    [auto, setAuto] = useState(true);
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const drag = useRef<{ slot: number; x: number; y: number } | null>(null),
    clearAt = useRef(0),
    settled = useRef(0);
  useEffect(() => {
    activeRef.current = active;
    if (game.current) game.current.active = active;
  }, [active]);
  useEffect(() => {
    campaign.init();
    let disposed = false;
    const g = new MergedBattle();
    game.current = g;
    const configure = () => {
      const d = campaign.read(),
        speed = g.speed;
      g.configure(
        d.bestStage + 1,
        d.lineup,
        RECRUIT_HEROES.map((h) => heroPower(d, h.index)),
      );
      g.speed = speed;
      g.active = activeRef.current;
      setStage(g.stage);
      setSelected(null);
      setPicked(null);
      clearAt.current = 0;
    };
    configure();
    const sync = () => {
      if (disposed) return;
      if (g.phase === 'cleared') {
        if (settled.current !== g.stage) {
          settled.current = g.stage;
          campaign.completeStage(g.stage);
          clearAt.current = performance.now();
        }
        if (autoRef.current && performance.now() - clearAt.current > 2200) {
          const next = campaign.read().bestStage + 1;
          configure();
          if (next % 5 !== 0) g.start();
        }
      }
      const s = g.snapshot();
      setState(s);
      notify.current?.({
        stage: g.stage,
        wave: ((g.wave - 1) % 3) + 1,
        phase: g.phase,
        alive: s.survivors,
        enemies: s.enemies.filter((e) => e.hp > 0).length,
        paused: g.paused,
        boss: g.stage % 5 === 0,
      });
    };
    const v = new MergedView(canvas.current!, g, sync);
    view.current = v;
    const unsub = campaign.subscribe(() => {
      setRevision(campaign.read().revision);
      g.refreshPower(
        RECRUIT_HEROES.map((h) => heroPower(campaign.read(), h.index)),
      );
      if (g.phase === 'prep') {
        configure();
        v.draw();
      }
    });
    const api = {
      snapshot: () => g.snapshot(),
      start: () => {
        if (g.phase === 'cleared' || g.phase === 'defeat') configure();
        g.start();
        campaign.update((d) => {
          d.tutorial = Math.max(1, d.tutorial);
        });
        sync();
      },
      prepare: () => {
        configure();
        sync();
        v.draw();
      },
      pause: (p: boolean) => {
        g.paused = p;
        sync();
      },
      speed: (n: number) => {
        if ([1, 2, 4].includes(n)) g.speed = n;
        sync();
      },
    };
    v.init()
      .then(() => {
        if (!disposed) {
          window.moriMerged = api;
          setReady(true);
          sync();
        }
      })
      .catch(() => setError('战场资源加载失败，请刷新重试'));
    return () => {
      disposed = true;
      unsub();
      v.dispose();
      if (window.moriMerged === api) delete window.moriMerged;
    };
  }, []);
  void revision;
  const d = campaign.read(),
    unlocked = slotsUnlocked(d),
    prep = state.phase === 'prep',
    detail = picked ?? (selected !== null ? state.lineup[selected] : 0),
    info = HEROES[detail >= 0 ? detail : 0];
  const update = (next: number[]) => {
    if (!validLineup(d, next)) return;
    campaign.update((x) => {
      x.lineup = next;
    });
    setSelected(null);
    setPicked(null);
  };
  const place = (slot: number) => {
    if (slot >= unlocked) return;
    if (picked !== null) {
      const n = [...d.lineup],
        old = n.indexOf(picked);
      if (old >= 0) [n[old], n[slot]] = [n[slot], n[old]];
      else n[slot] = picked;
      update(n);
    } else if (selected === null) setSelected(slot);
    else {
      const n = [...d.lineup];
      [n[selected], n[slot]] = [n[slot], n[selected]];
      update(n);
    }
  };
  return (
    <section
      className="portrait-prototype merged-prototype"
      aria-label="物资搜刮"
    >
      <div className="portrait-frame" ref={frame}>
        <canvas
          ref={canvas}
          className="portrait-canvas"
          role="img"
          aria-label="幸存者三路搜刮战场"
        />
        <header className="portrait-header">
          <div>
            <span className="portrait-eyebrow">MORI · 重返废城</span>
            <h1>物资搜刮</h1>
          </div>
          <div className="portrait-wave">
            <strong>
              第 {stage} 关{stage % 5 === 0 ? ' · 首领' : ''}
            </strong>
            <small className="portrait-wave-caption">
              {prep ? '战前布阵' : `第 ${((state.wave - 1) % 3) + 1}/3 波`} ·
              首通 {stageAmmo(stage)} 弹
            </small>
          </div>
          <button
            className="merged-icon"
            disabled={prep || !ready}
            aria-label="暂停搜刮"
            onClick={() => window.moriMerged?.pause(!state.paused)}
          >
            {state.paused ? '▶' : 'Ⅱ'}
          </button>
        </header>
        <div className="merged-lanes">
          {state.lanes.map((l, i) => (
            <div key={i} style={{ borderColor: COLORS[i] }}>
              <b>{['左路', '中路', '右路'][i]}</b>
              <span>
                {i * 3 >= unlocked
                  ? `第 ${i === 1 ? 2 : 4} 关后开放`
                  : prep
                    ? l.balanced
                      ? '坦克 · 治疗 · 输出'
                      : '可调整职业搭配'
                    : l.supporting
                      ? `${l.supporting} 人支援中`
                      : `${l.alive} 人 · ${l.enemies} 敌`}
              </span>
            </div>
          ))}
        </div>
        {prep && (
          <>
            <div className="merged-brief">
              <b>{stage % 5 === 0 ? '首领挡住了去路' : '为幸存者找回补给'}</b>
              <p>
                拖动英雄交换站位
                <br />
                或选择下方英雄，再点击上阵位置
              </p>
            </div>
            <div className="merged-deploy-slots">
              {SLOTS.map((p, i) => (
                <button
                  key={i}
                  disabled={i >= unlocked}
                  aria-label={`部署位置${i + 1}：${state.lineup[i] >= 0 ? HEROES[state.lineup[i]].name : '空位'}`}
                  className={selected === i ? 'selected' : ''}
                  style={{
                    left: `${(p.x / 390) * 100}%`,
                    top: `${(p.y / 752) * 100}%`,
                  }}
                  onPointerDown={(e) => {
                    drag.current = { slot: i, x: e.clientX, y: e.clientY };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerUp={(e) => {
                    const start = drag.current;
                    drag.current = null;
                    if (!start) return;
                    if (
                      Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8
                    ) {
                      place(i);
                      return;
                    }
                    const r = frame.current!.getBoundingClientRect(),
                      x = ((e.clientX - r.left) / r.width) * 390,
                      y = ((e.clientY - r.top) / r.height) * 752;
                    const target = SLOTS.findIndex(
                      (s, n) =>
                        n < unlocked &&
                        Math.abs(x - s.x) < 36 &&
                        Math.abs(y - (s.y - 22)) < 54,
                    );
                    if (target >= 0) {
                      const next = [...d.lineup];
                      [next[i], next[target]] = [next[target], next[i]];
                      update(next);
                    }
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      place(i);
                    }
                  }}
                >
                  <span>
                    {i >= unlocked
                      ? '未开放'
                      : state.lineup[i] < 0
                        ? '空位'
                        : ['前排', '治疗', '输出'][i % 3]}
                  </span>
                </button>
              ))}
            </div>
            <footer className="merged-prep-controls">
              <div className="merged-hero-detail">
                <HeroPortrait hero={detail >= 0 ? detail : 0} height={35} />
                <div>
                  <b>
                    {info.name} · Lv.{d.hunt.level}
                  </b>
                  <p>{info.tip}</p>
                </div>
              </div>
              <div className="merged-roster">
                {RECRUIT_HEROES.map((h) => (
                  <button
                    key={h.id}
                    disabled={!d.recruit.owned[h.id]}
                    className={picked === h.index ? 'selected' : ''}
                    aria-label={`选择${h.name}${d.recruit.owned[h.id] ? '' : '，未获得'}`}
                    onClick={() => {
                      setPicked(h.index);
                      setSelected(null);
                    }}
                  >
                    <HeroPortrait hero={h.index} height={29} />
                  </button>
                ))}
              </div>
              <div className="merged-prep-actions">
                <button onClick={() => campaign.update((x) => autoLineup(x))}>
                  一键配队
                </button>
                <button
                  className="primary"
                  disabled={!ready || !state.heroes.some((h) => h.hero !== 5)}
                  onClick={() => window.moriMerged?.start()}
                >
                  {stage % 5 === 0 ? '挑战首领' : '开始搜刮'}
                </button>
              </div>
            </footer>
          </>
        )}
        {!prep && (
          <footer className="merged-battle-controls">
            <div className="merged-stats">
              <span>
                存活 {state.survivors}/{state.heroes.length}
              </span>
              <span>全队 Lv.{d.hunt.level}</span>
              <span>击杀 {state.kills}</span>
            </div>
            <div className="merged-battle-actions">
              <button onClick={() => window.moriMerged?.prepare()}>
                重新布阵
              </button>
              <div>
                {[1, 2, 4].map((n) => (
                  <button
                    key={n}
                    className={state.speed === n ? 'selected' : ''}
                    onClick={() => window.moriMerged?.speed(n)}
                  >
                    {n}×
                  </button>
                ))}
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={auto}
                  onChange={(e) => setAuto(e.target.checked)}
                />{' '}
                连续挑战
              </label>
            </div>
          </footer>
        )}
        {state.paused && <div className="portrait-state-label">已暂停</div>}
        {state.phase === 'march' && (
          <div className="portrait-state-label">区域清空 · 继续前进</div>
        )}
        {(state.phase === 'defeat' || state.phase === 'cleared') && (
          <div className="portrait-overlay portrait-result">
            <h2>{state.phase === 'cleared' ? '搜刮成功' : '暂时撤退'}</h2>
            <p>
              {state.phase === 'cleared'
                ? `黑金弹 +${stageAmmo(stage)} 已入库`
                : '前往猎场提升全队等级，或调整阵容再挑战。'}
            </p>
            <button onClick={() => window.moriMerged?.prepare()}>
              {state.phase === 'cleared' ? '前往下一关' : '调整阵容'}
            </button>
          </div>
        )}
        {!ready && (
          <div className="portrait-overlay">
            <strong>{error || '幸存者集结中…'}</strong>
          </div>
        )}
      </div>
    </section>
  );
}

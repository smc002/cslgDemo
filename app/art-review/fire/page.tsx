'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import CombatCapture from '@/components/combat-capture';
import { HuntGame, type FX, type Zombie } from '@/hunt/simulation';
import { HuntView } from '@/hunt/view';
import { AMMO_RETURN_SECONDS } from '@/hunt/ammo-return-vfx';
import { freshEconomy, reserve } from '@/lib/hunt-economy';
import { freshAmmoCarrier } from '@/lib/ammo-carrier';

type Preview =
  | 'overlap'
  | 'jackpotOverlap'
  | 'arrival'
  | 'hit'
  | 'pixel'
  | 'heavyDeath'
  | 'deathGallery'
  | 'special'
  | 'courier'
  | 'refund'
  | 'entry'
  | 'shotgun'
  | 'laser'
  | 'fire';
const previews: { kind: Preview; label: string }[] = [
  { kind: 'overlap', label: '拥挤与黑金层级' },
  { kind: 'jackpotOverlap', label: '大奖与连杀避让' },
  { kind: 'arrival', label: '首次入场' },
  { kind: 'hit', label: '01 命中材质' },
  { kind: 'pixel', label: 'A/B 实体倒地' },
  { kind: 'heavyDeath', label: 'C 巨型跪倒' },
  { kind: 'deathGallery', label: '全僵尸死亡图鉴' },
  { kind: 'special', label: '02 特殊击杀' },
  { kind: 'courier', label: '03 运钞大奖' },
  { kind: 'refund', label: '04 黑金回收' },
  { kind: 'entry', label: '05 特殊入场' },
  { kind: 'shotgun', label: '06 散弹枪状态' },
  { kind: 'laser', label: '06 激光枪状态' },
  { kind: 'fire', label: '普通开火测试' },
];
const buttonStyle = {
  padding: '8px 12px',
  background: '#36574b',
  borderRadius: 8,
};
const actor = (id: number, kind: number, x: number, y: number): Zombie => ({
  id,
  kind,
  x,
  y,
  vx: 0,
  vy: 0,
  age: 0,
  seed: 0.5,
  hit: 0,
});

// Every fixture uses production rendering with a fresh in-memory ledger, never the player's save.
export default function FireReview() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<HuntGame | null>(null);
  const view = useRef<HuntView | null>(null);
  const selected = useRef<Preview>('hit');
  const [preview, setPreview] = useState<Preview>('hit');
  const [frameAge, setFrameAge] = useState(0.12);
  const [paused, setPaused] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const showPreview = (kind: Preview, age = 0, freeze = false) => {
    const g = game.current;
    if (!g) return;
    selected.current = kind;
    setPreview(kind);
    setFrameAge(age);
    g.release();
    g.bullets = [];
    g.effects = [];
    g.save.bonus = null;
    g.save.weapons.active = null;
    g.save.weapons.stored = {};
    g.save.courier.reveal = null;
    g.save.courier.active = null;
    g.save.courier.queued = 0;
    g.save.courier.progress = 0;
    g.save.ammoCarrier = freshAmmoCarrier();
    g.save.economy = freshEconomy();
    g.save.expedition.transition = null;
    g.courierVictory = null;
    g.weaponEnding = null;
    g.weaponNotice = null;
    g.finale = 0;
    g.intro = 0;
    g.arrivalAge = null;
    g.shake = 0;
    g.combo = 0;
    g.time = age;
    g.zombies = [actor(10001, 0, 90, 190), actor(10002, 1, 510, 180)];
    const effect = (
      effectKind: FX['kind'],
      species: number,
      x: number,
      y: number,
      life: number,
      points = 0,
    ): FX => ({
      id: 900000 + species,
      kind: effectKind,
      species,
      x,
      y,
      age,
      life,
      points,
      angle: -Math.PI / 2,
      seed: 0.4,
      facing: 'S',
    });
    if (kind === 'overlap' || kind === 'jackpotOverlap') {
      g.combo = 18;
      g.comboLife = 2;
      g.zombies.push(
        actor(10003, 6, 210, 340),
        actor(10004, 6, 290, 345),
        actor(10005, 11, 400, 310),
      );
      g.effects = [
        effect('kill', 5, 300, 380, 1.35, 240),
        effect('kill', 0, 290, 375, 1.35, 50),
      ];
      if (kind === 'overlap') {
        g.effects.push(
          effect('ammoReturn', 12, 290, 420, AMMO_RETURN_SECONDS, 20),
        );
        g.zombies.push(actor(10006, 9, 430, 440));
        g.save.courier.active = { armorHits: 7, bodyHits: 0, x: 430, y: 440 };
      } else {
        g.save.courier.reveal = { serial: 1, tickets: 10 };
        g.courierVictory = { x: 300, y: 400, age, duration: 3.2 };
      }
    } else if (kind === 'arrival') {
      g.arrivalAge = age < 3.2 ? age : null;
      g.zombies.push(actor(10003, 0, 180, 350), actor(10004, 1, 420, 330));
    } else if (kind === 'hit') {
      g.zombies.push(actor(10003, 2, 180, 380), actor(10004, 0, 420, 380));
      g.effects = [
        effect('hit', 2, 180, 350, 0.28),
        effect('hit', 0, 420, 350, 0.28),
      ];
    } else if (kind === 'pixel') {
      g.effects = [
        effect('kill', 0, 175, 380, 1.35, 10),
        effect('kill', 2, 425, 380, 1.35, 80),
      ];
    } else if (kind === 'heavyDeath') {
      g.zombies = [];
      g.effects = [effect('kill', 3, 300, 390, 1.35, 400)];
    } else if (kind === 'deathGallery') {
      g.zombies = [];
      g.effects = Array.from({ length: 13 }, (_, i) =>
        effect(
          'kill',
          i,
          80 + (i % 4) * 145,
          190 + Math.floor(i / 4) * 140,
          1.35,
          0,
        ),
      );
    } else if (kind === 'special') {
      g.effects = [effect('kill', 6, 300, 370, 1.35, 120)];
    } else if (kind === 'courier') {
      g.save.courier.reveal = { serial: 1, tickets: 10 };
      g.courierVictory = { x: 300, y: 370, age, duration: 3.2 };
    } else if (kind === 'refund') {
      g.effects = [effect('ammoReturn', 12, 270, 390, AMMO_RETURN_SECONDS, 20)];
    } else if (kind === 'entry') {
      g.zombies.push(actor(10005, 6, 145, 340), actor(10006, 12, 450, 340));
      g.effects = [
        effect('specialEntry', 6, 145, 230, 0.72),
        effect('specialEntry', 12, 450, 230, 0.72),
      ];
    } else if (kind === 'shotgun' || kind === 'laser') {
      if (age >= 20) {
        g.weaponEnding = age < 20.4 ? { kind, age: age - 20 } : null;
      } else {
        const event = reserve(
          g.save.economy,
          kind === 'shotgun' ? 11 : 10,
          1,
          true,
        )!;
        event.state = 'active';
        g.save.weapons.active = {
          kind,
          room: 1,
          left: 20 - age,
          eventId: event.id,
        };
        if (!freeze) g.press(300, 200);
      }
    } else {
      g.zombies.push(actor(10003, 2, 180, 330), actor(10004, 3, 410, 330));
      if (!freeze) g.press(180, 330);
    }
    g.effects = g.effects.filter((e) => e.age < e.life);
    g.paused = freeze;
    setPaused(freeze);
    view.current?.draw();
  };

  useEffect(() => {
    let disposed = false;
    const g = new HuntGame(
      { ammo: () => 99999, spend: () => true, save: () => {} },
      undefined,
      () => 0.99,
    );
    g.active = true;
    g.spawn = () => {};
    const v = new HuntView(canvas.current!, g, () => {
      for (const z of g.zombies) z.age %= 20;
    });
    game.current = g;
    view.current = v;
    showPreview('hit', 0.12, true);
    v.init()
      .then(() => {
        if (!disposed) setReady(true);
      })
      .catch(() => {
        if (!disposed) setError('资源加载失败，请刷新重试');
      });
    return () => {
      disposed = true;
      g.active = false;
      v.dispose();
    };
  }, []);

  const togglePause = () => {
    const g = game.current;
    if (!g) return;
    g.paused = !g.paused;
    if (!g.paused && ['shotgun', 'laser', 'fire'].includes(selected.current))
      g.press(g.aim.x, g.aim.y);
    setPaused(g.paused);
    view.current?.draw();
  };
  const step = () => {
    const g = game.current;
    if (!g) return;
    g.paused = false;
    g.advance(1 / 60);
    g.paused = true;
    setPaused(true);
    setFrameAge((age) =>
      Math.min(
        selected.current === 'shotgun' || selected.current === 'laser'
          ? 20.4
          : 3.2,
        age + 1 / 60,
      ),
    );
    view.current?.draw();
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#142e29',
        color: '#fff1cd',
        padding: 20,
        fontFamily: 'Microsoft YaHei, sans-serif',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>
          猎场特效 · 入场与战斗验收
        </h1>
        <p style={{ margin: '8px 0 16px', fontSize: 14 }}>
          使用正式战斗渲染器，所有重播和收益均为纯内存预览，不读取或修改主游戏存档。点击战场可测试瞄准。
        </p>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          {previews.map(({ kind, label }) => (
            <button
              key={kind}
              disabled={!ready}
              aria-pressed={preview === kind}
              onClick={() => showPreview(kind)}
              style={{
                ...buttonStyle,
                background: preview === kind ? '#8b651c' : '#36574b',
              }}
            >
              {label} · 重播
            </button>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <button disabled={!ready} onClick={togglePause} style={buttonStyle}>
            {paused ? '继续播放' : '暂停画面'}
          </button>
          <button disabled={!ready} onClick={step} style={buttonStyle}>
            前进一帧
          </button>
          {[0.12, 0.26, 0.62, 1.1].map((age) => (
            <button
              key={age}
              disabled={!ready}
              onClick={() => showPreview(selected.current, age, true)}
              style={buttonStyle}
            >
              静帧 {age.toFixed(2)} 秒
            </button>
          ))}
          {(preview === 'shotgun' || preview === 'laser') && (
            <button
              disabled={!ready}
              onClick={() => showPreview(selected.current, 20.15, true)}
              style={buttonStyle}
            >
              技能结束 · 20.15 秒
            </button>
          )}
          <button
            disabled={!ready}
            onClick={() => showPreview('refund', 0.36, true)}
            style={buttonStyle}
          >
            黑金发光定格
          </button>
          {preview === 'courier' && (
            <>
              <button
                disabled={!ready}
                onClick={() => showPreview('courier', 0.18, true)}
                style={buttonStyle}
              >
                运钞死亡第1帧
              </button>
              <button
                disabled={!ready}
                onClick={() => showPreview('courier', 0.6, true)}
                style={buttonStyle}
              >
                运钞死亡第2帧
              </button>
            </>
          )}
          <button onClick={() => setNarrow(!narrow)} style={buttonStyle}>
            {narrow ? '切换 430px' : '切换 360px'}
          </button>
          <Link href="/#hunt" style={{ padding: '8px 14px', color: '#ffd36a' }}>
            返回游戏
          </Link>
        </div>
        <label
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          静帧时间 {frameAge.toFixed(2)} 秒
          <input
            aria-label="静帧时间"
            type="range"
            min="0"
            max={preview === 'shotgun' || preview === 'laser' ? 20.4 : 3.2}
            step="0.01"
            value={frameAge}
            disabled={!ready}
            onChange={(e) =>
              showPreview(selected.current, Number(e.target.value), true)
            }
            style={{ width: 260, maxWidth: '45vw' }}
          />
        </label>
        <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 12 }}>
          静帧直接定位当前演出；命中 0.28 秒、特殊击杀 1.35 秒、黑金 2.1
          秒、大奖 3.2 秒。技能重播持续 20 秒，可观察自然结束。
        </p>
        {error && <p role="alert">{error}</p>}
        {ready && <CombatCapture />}
        <div
          className="hunt-page mori-gameplay-shell"
          style={{
            position: 'relative',
            display: 'block',
            width: narrow ? 360 : 430,
            maxWidth: '100%',
            height: 'auto',
            flex: 'none',
            overflow: 'hidden',
          }}
        >
          <div
            className="core-energy-track"
            style={{
              height: 28,
              margin: '8px 12px',
              border: '2px solid #b9ffe1',
              borderRadius: 8,
              background: 'linear-gradient(90deg,#319b81 55%,#123e37 55%)',
              textAlign: 'center',
              fontSize: 13,
            }}
          >
            能源核心 · 回收目标预览
          </div>
          <canvas
            ref={canvas}
            aria-label="特效验收战场"
            style={{
              display: 'block',
              width: '100%',
              maxWidth: '100%',
              aspectRatio: '3 / 4',
              touchAction: 'none',
              borderRadius: 12,
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              const p = view.current?.point(event.clientX, event.clientY);
              if (p) game.current?.press(p.x, p.y);
            }}
            onPointerMove={(event) => {
              if (!event.buttons) return;
              const p = view.current?.point(event.clientX, event.clientY);
              if (p) game.current?.press(p.x, p.y);
            }}
          />
          <div
            data-hunt-ammo-inventory
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#13473d',
              border: '2px solid #e4b448',
              borderRadius: 9,
              width: 140,
              margin: '8px 0',
              padding: 5,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/loop/black-gold-ammo.png"
              alt="黑金弹"
              width={30}
              height={30}
            />
            <strong>返弹库存预览</strong>
          </div>
        </div>
      </div>
    </main>
  );
}

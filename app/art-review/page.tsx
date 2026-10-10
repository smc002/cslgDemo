'use client';
/* eslint-disable next/no-img-element -- Review original game assets without image transforms. */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  HERO_ART,
  ZOMBIE_ART,
  TOY_ROOT,
  ToyRenderer,
  ZOMBIE_NAMES,
} from '@/shared/toy-art';
const roster = [
  ...HERO_ART.map(([id, name]) => ({ id, name })),
  ...ZOMBIE_ART.map((id, i) => ({ id, name: ZOMBIE_NAMES[i] })),
];
function Actor({
  id,
  mode,
  left,
}: {
  id: string;
  mode: string;
  left: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let stopped = false,
      raf = 0;
    const art = new ToyRenderer();
    const start = performance.now();
    art
      .load([id])
      .then(() => {
        const draw = () => {
          if (stopped) return;
          const c = ref.current!.getContext('2d')!,
            t = (performance.now() - start) / 1000;
          c.clearRect(0, 0, 320, 340);
          art.draw(c, id, 160, 314, 260, {
            time: t,
            moving: mode === 'walk',
            attack: mode === 'attack' ? 1 : 0,
            left,
            death: mode === 'death' ? t % 1.6 : undefined,
          });
          raf = requestAnimationFrame(draw);
        };
        draw();
      })
      .catch((error) => {
        if (!stopped) console.error(error);
      });
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [id, mode, left]);
  return (
    <canvas
      ref={ref}
      width={320}
      height={340}
      style={{ width: '100%', height: 'auto' }}
    />
  );
}
export default function ArtReview() {
  const [mode, setMode] = useState('idle'),
    [left, setLeft] = useState(false);
  return (
    <main
      style={{
        background: '#edf1e8',
        minHeight: '100vh',
        padding: '32px 24px',
        color: '#293a45',
        fontFamily: 'Microsoft YaHei,sans-serif',
      }}
    >
      <header style={{ maxWidth: 1280, margin: '0 auto 24px' }}>
        <small>曙光营地 · 美术资源 V1</small>
        <h1 style={{ fontSize: 32, margin: '12px 0' }}>新的伙伴，同一个世界</h1>
        <p>9 位英雄 · 13 种僵尸 · 5 张场景 · 12 座建筑 · 3 个载具部件</p>
        <p>
          游戏内显示比例 1.26；此页放大展示细节。22
          个角色均使用独立绘制的行走、攻击动作帧。
        </p>
        <p>英雄背朝玩家、面向上方敌人；头像与剧情继续使用正面立绘。</p>
        <Link href="/#merged">进入游戏 →</Link>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {[
            ['idle', '待机'],
            ['walk', '行走'],
            ['attack', '攻击'],
          ].map(([v, n]) => (
            <button
              key={v}
              onClick={() => setMode(v)}
              style={{
                padding: '10px 20px',
                border: '1px solid #789',
                borderRadius: 8,
                background: mode === v ? '#294755' : 'white',
                color: mode === v ? 'white' : '#294755',
              }}
            >
              {n}
            </button>
          ))}
          <button onClick={() => setLeft(!left)} style={{ padding: 10 }}>
            切换怪物左右朝向
          </button>
        </div>
      </header>
      <section
        style={{
          maxWidth: 1280,
          margin: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
          gap: 16,
        }}
      >
        {roster.map((r, i) => (
          <article
            key={r.id}
            style={{
              background: i < 9 ? '#dae5e8' : '#e2e6d2',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 2px 8px #28383018',
            }}
          >
            <Actor id={r.id} mode={mode} left={left} />
            <h2
              style={{ fontSize: 18, textAlign: 'center', margin: '0 0 18px' }}
            >
              {r.name}
            </h2>
          </article>
        ))}
      </section>
      <h2 style={{ maxWidth: 1280, margin: '40px auto 16px' }}>场景与基地</h2>
      <section
        style={{
          maxWidth: 1280,
          margin: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 16,
        }}
      >
        {[
          'street',
          'hunt-ground',
          'hunt-frozen',
          'hunt-substation',
          'city-terrain-organic',
        ].map((id) => (
          <img
            key={id}
            src={TOY_ROOT + id + '.png'}
            alt={id}
            style={{ width: '100%', borderRadius: 12 }}
          />
        ))}
      </section>
      <section
        style={{
          maxWidth: 1280,
          margin: '24px auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 16,
        }}
      >
        {[
          'hq',
          'power',
          'comms',
          'medical',
          'factory',
          'research',
          'barracks',
          'armory',
          'drone',
          'warehouse',
          'garage',
          'workshop',
        ].map((id) => (
          <img
            key={id}
            src={TOY_ROOT + 'city-' + id + '.png'}
            alt={id}
            style={{ width: '100%' }}
          />
        ))}
      </section>
      <section
        style={{
          maxWidth: 900,
          margin: '24px auto',
          display: 'flex',
          gap: 24,
          alignItems: 'center',
        }}
      >
        {['chassis', 'turret', 'platform'].map((id) => (
          <img
            key={id}
            src={TOY_ROOT + 'vehicle-' + id + '.png'}
            alt={id}
            style={{ width: '30%', maxHeight: 340, objectFit: 'contain' }}
          />
        ))}
      </section>
    </main>
  );
}

'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  TOY_ANIMATIONS,
  TOY_ROOT,
  ZOMBIE_NAMES,
  ZOMBIE_ART,
  HERO_ART,
} from '@/shared/toy-art';
const ids = [
  'zombie-giant',
  'zombie-courier',
  'zombie-armored',
  'hero-tank',
  'hero-robot',
  'zombie-scatter',
];
function Comparison({ id, frame }: { id: string; frame: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.src = TOY_ROOT + 'animations/' + TOY_ANIMATIONS[id].sheet;
    void image.decode().then(() => {
      if (cancelled) return;
      const c = ref.current!.getContext('2d')!,
        a = TOY_ANIMATIONS[id],
        s = 140 / a.bodyHeight;
      c.clearRect(0, 0, 480, 225);
      for (const [index, x] of [
        [0, 120],
        [1, 360],
      ]) {
        const pivot = index
          ? (a.frameAnchors?.[frame] ?? [a.anchorX, a.anchorY])
          : [a.anchorX, a.anchorY];
        c.strokeStyle = '#60847a';
        c.setLineDash([3, 4]);
        c.beginPath();
        c.moveTo(x, 12);
        c.lineTo(x, 215);
        c.moveTo(x - 100, 205);
        c.lineTo(x + 100, 205);
        c.stroke();
        c.setLineDash([]);
        c.drawImage(
          image,
          (frame % 4) * 256,
          Math.floor(frame / 4) * 256,
          256,
          256,
          x - pivot[0] * s,
          205 - pivot[1] * s,
          256 * s,
          256 * s,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, frame]);
  const name = id.startsWith('hero-')
    ? HERO_ART.find((h) => h[0] === id)?.[1]
    : ZOMBIE_NAMES[ZOMBIE_ART.indexOf(id as (typeof ZOMBIE_ART)[number])];
  return (
    <article style={{ background: '#e6eddf', borderRadius: 12, padding: 12 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>{name}</h2>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          fontSize: 13,
        }}
      >
        <span>修正前：随支撑脚偏移</span>
        <span>修正后：主体位置稳定</span>
      </div>
      <canvas
        ref={ref}
        width={480}
        height={225}
        style={{ width: '100%', display: 'block' }}
      />
    </article>
  );
}
export default function StabilityReview() {
  const [playing, setPlaying] = useState(true),
    [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setFrame((f) => (f + 1) % 4), 125);
    return () => clearInterval(timer);
  }, [playing]);
  const buttonStyle = {
    background: '#265f50',
    color: '#fff',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
  };
  return (
    <main
      style={{
        maxWidth: 1080,
        minHeight: '100vh',
        background: '#f4f5ee',
        margin: 'auto',
        padding: 24,
        color: '#203c33',
        fontFamily: 'Microsoft YaHei,sans-serif',
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        行走动画 · 身体稳定性对比
      </h1>
      <p style={{ margin: '12px 0 20px' }}>
        保持角色原地，检查躯干位置；步伐与摆臂继续播放。右侧为游戏当前效果。
      </p>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}
      >
        <button style={buttonStyle} onClick={() => setPlaying(!playing)}>
          {playing ? '暂停' : '播放'}
        </button>
        {[0, 1, 2, 3, 7].map((f) => (
          <button
            style={{
              ...buttonStyle,
              background: !playing && frame === f ? '#b16924' : '#265f50',
            }}
            key={f}
            onClick={() => {
              setPlaying(false);
              setFrame(f);
            }}
          >
            {f === 7 ? '站立' : `第 ${f + 1} 帧`}
          </button>
        ))}
        <Link style={buttonStyle} href="/#merged">
          进入游戏
        </Link>
      </div>
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(min(340px,100%),1fr))',
          gap: 16,
        }}
      >
        {ids.map((id) => (
          <Comparison key={id} id={id} frame={frame} />
        ))}
      </section>
    </main>
  );
}

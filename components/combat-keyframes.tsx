'use client';
import { useEffect, useRef, useState } from 'react';
import {
  COMBAT_KEYFRAME_COUNT,
  startCombatAudit,
  type CombatKeyframe,
} from '@/hunt/combat-audit';

/** A review-only observer: every PNG comes from a completed production draw. */
export default function CombatKeyframes() {
  const [active, setActive] = useState(false);
  const [frames, setFrames] = useState<CombatKeyframe[]>([]);
  const [error, setError] = useState('');
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!active) return;
    stop.current = startCombatAudit(
      (frame) => setFrames((previous) => [...previous, frame]),
      (message) => {
        setError(message);
        setActive(false);
      },
      frames.map((frame) => frame.key),
    );
    return () => stop.current?.();
  }, [active, frames]);
  const toggle = () => {
    if (active) {
      stop.current?.();
      stop.current = null;
      setActive(false);
      return;
    }
    setFrames([]);
    setError('');
    try {
      setActive(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '无法启用采集');
    }
  };
  return (
    <section aria-label="真实实战关键帧" style={{ display: 'grid', gap: 6 }}>
      <button onClick={toggle}>
        {active ? '停止关键帧采集' : '启用真实关键帧采集'}
      </button>
      <small>
        {frames.length}/{COMBAT_KEYFRAME_COUNT} 类 ·{' '}
        {frames.length === COMBAT_KEYFRAME_COUNT
          ? '全部采集完成'
          : active
            ? '等待真实战斗事件'
            : '每类一次'}
        <br />
        只复制战斗画布与实际飞行层，不含 DOM 界面；不会触发特效或修改奖励。
      </small>
      {error && <p role="alert">{error}</p>}
      <div
        style={{
          maxHeight: '35dvh',
          overflowY: 'auto',
          display: 'grid',
          gap: 8,
        }}
      >
        {frames.map((frame) => (
          <figure key={frame.key} style={{ margin: 0 }}>
            <a
              href={frame.png}
              download={`hunt-real-${frame.key}-${frame.spentAmmo}ammo.png`}
            >
              {/* oxlint-disable-next-line next/no-img-element -- Exact locally captured PNG pixels, not a source asset. */}
              <img
                src={frame.png}
                alt={frame.label}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 6,
                  background: '#132927',
                }}
              />
            </a>
            <figcaption style={{ fontSize: 10, lineHeight: 1.5 }}>
              <b>{frame.label}</b>
              <br />
              战斗 {frame.gameTime.toFixed(2)}s · 累计消耗 {frame.spentAmmo} 弹
              · 本场 {frame.fired} 枪<br />
              {frame.effectAge !== undefined && (
                <>
                  效果年龄 {frame.effectAge.toFixed(3)}s · 事件{' '}
                  {frame.effectId ?? '—'}
                  <br />
                </>
              )}
              <time dateTime={frame.capturedAt}>
                {new Date(frame.capturedAt).toLocaleTimeString('zh-CN')}
              </time>
              {' · '}
              <a
                href={frame.png}
                download={`hunt-real-${frame.key}-${frame.spentAmmo}ammo.png`}
              >
                下载 PNG
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

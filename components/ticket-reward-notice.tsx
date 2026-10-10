'use client';
/* eslint-disable @next/next/no-img-element -- Small transparent sprite shared with the Canvas renderer. */
import { useLayoutEffect, useRef, useState } from 'react';
import type { TicketPresentation } from './use-ticket-presentation';
import './ticket-reward-notice.css';

type Point = { x: number; y: number };
type Flight = {
  source: Point;
  target: Point;
  releaseY: number;
  width: number;
  height: number;
  targetBox: { x: number; y: number; w: number; h: number };
};
export default function TicketRewardNotice({
  reward,
}: {
  reward: TicketPresentation | null;
}) {
  const root = useRef<HTMLOutputElement>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const rewardId = reward?.id;
  useLayoutEffect(() => {
    if (rewardId === undefined || !root.current) return;
    const shell = root.current.closest('.mori-gameplay-shell');
    const measure = () => {
      const r = root.current?.getBoundingClientRect();
      const target = shell
        ?.querySelector('[data-guide="nav-recruit"]')
        ?.getBoundingClientRect();
      const source = shell
        ?.querySelector('[data-core-award="active"]')
        ?.getBoundingClientRect();
      const arena = shell
        ?.querySelector('.hunt-page canvas')
        ?.getBoundingClientRect();
      if (!r) return;
      const end = target
        ? {
            x: target.left + target.width / 2 - r.left,
            y: target.top + 12 - r.top,
          }
        : { x: r.width * 0.7, y: r.height - 50 };
      const origin = source
        ? {
            x: source.left + source.width / 2 - r.left,
            y: source.top + source.height / 2 - r.top,
          }
        : end;
      setFlight({
        source: origin,
        target: end,
        releaseY: Math.max(
          origin.y + 36,
          arena ? arena.top - r.top + 8 : origin.y + 90,
        ),
        width: r.width,
        height: r.height,
        targetBox: target
          ? {
              x: target.left + target.width / 2 - r.left,
              y: target.top + target.height / 2 - r.top,
              w: target.width - 4,
              h: target.height - 4,
            }
          : { x: end.x, y: end.y + 20, w: 72, h: 70 },
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (shell) observer.observe(shell);
    return () => observer.disconnect();
  }, [rewardId]);
  const fromCore = !!reward?.core;
  const x = flight?.source.x ?? 0,
    y = flight?.source.y ?? 0;
  const tx = flight?.target.x ?? 0,
    ty = flight?.target.y ?? 0;
  const rx = Math.min((flight?.width ?? 0) - 85, Math.max(85, x)),
    ry = flight?.releaseY ?? y + 36;
  const path = `M ${rx} ${ry + 32} C ${Math.min((flight?.width ?? 0) - 26, rx + 105)} ${ry + 110}, ${tx + 65} ${ty - 120}, ${tx} ${ty}`;
  return (
    <output
      ref={root}
      className="ticket-reward-region"
      aria-live="polite"
      aria-atomic="true"
    >
      {reward && flight && (
        <div
          key={reward.id}
          className={`ticket-source-sequence ${fromCore ? 'from-core' : 'from-other'}`}
          data-ticket-reward
        >
          <span className="sr-only">
            {fromCore ? '能量核心节点奖励' : '奖励'}：抽奖券 +{reward.amount}
            ，已到账
          </span>
          {fromCore && (
            <>
              <span className="core-source-ring" style={{ left: x, top: y }} />
              <svg
                className="core-ticket-stem"
                width={flight.width}
                height={flight.height}
                aria-hidden="true"
              >
                <path
                  className="beam-halo"
                  d={`M ${x} ${y} Q ${x} ${ry} ${rx} ${ry + 32}`}
                />
                <path d={`M ${x} ${y} Q ${x} ${ry} ${rx} ${ry + 32}`} />
              </svg>
              <svg
                className="core-ticket-path"
                width={flight.width}
                height={flight.height}
                aria-hidden="true"
              >
                <path className="trail-halo" pathLength="1" d={path} />
                <path className="trail-gold" pathLength="1" d={path} />
                <path className="trail-white" pathLength="1" d={path} />
              </svg>
              <div
                className="core-ticket-release"
                style={{ left: rx, top: ry }}
                aria-hidden="true"
              >
                <img src="/assets/hunt/combat-v2/ticket.png" alt="" />
                <b>节点奖励 +{reward.amount}</b>
              </div>
              <img
                className="core-ticket-fly"
                src="/assets/hunt/combat-v2/ticket.png"
                alt=""
                style={{ offsetPath: `path('${path}')` }}
              />
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`core-flight-spark spark-${i}`}
                  style={{ offsetPath: `path('${path}')` }}
                  aria-hidden="true"
                >
                  ✦
                </span>
              ))}
            </>
          )}
          <div
            className="ticket-arrived"
            style={{ left: tx, top: ty - (fromCore ? 66 : 42) }}
            aria-hidden="true"
          >
            <img src="/assets/hunt/combat-v2/ticket.png" alt="" />
            <b>+{reward.amount}</b>
            <small>抽奖券到账</small>
          </div>
          <span
            className="ticket-target-ring"
            style={{
              left: flight.targetBox.x,
              top: flight.targetBox.y,
              width: flight.targetBox.w,
              height: flight.targetBox.h,
            }}
            aria-hidden="true"
          />
        </div>
      )}
    </output>
  );
}

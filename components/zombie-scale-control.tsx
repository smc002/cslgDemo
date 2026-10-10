'use client';

import { useState } from 'react';

const KEY = 'mori.demo.hunt-zombie-scale';
const clamp = (n: number) =>
  Math.max(0.5, Math.min(1.5, Math.round(n * 20) / 20));
export function readZombieScale() {
  try {
    const value = Number(localStorage.getItem(KEY) ?? 1);
    return Number.isFinite(value) && value > 0 ? clamp(value) : 1;
  } catch {
    return 1;
  }
}

export default function ZombieScaleControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const update = (next: number) => {
    const scale = clamp(next);
    onChange(scale);
    try {
      localStorage.setItem(KEY, String(scale));
    } catch {
      /* Session-only if storage is unavailable. */
    }
  };
  return (
    <div className={`zombie-scale-control ${open ? 'expanded' : ''}`}>
      <button
        aria-expanded={open}
        aria-controls="zombie-scale-panel"
        onClick={() => setOpen(!open)}
      >
        僵尸大小 {Math.round(value * 100)}%
      </button>
      {open && (
        <div id="zombie-scale-panel">
          <label htmlFor="zombie-scale-range">
            外观比例 <strong>{Math.round(value * 100)}%</strong>
          </label>
          <input
            id="zombie-scale-range"
            type="range"
            min="50"
            max="150"
            step="5"
            value={Math.round(value * 100)}
            onChange={(e) => update(Number(e.target.value) / 100)}
          />
          <div className="zombie-scale-actions">
            <button
              aria-label="缩小僵尸"
              disabled={value <= 0.5}
              onClick={() => update(value - 0.05)}
            >
              −
            </button>
            <button onClick={() => update(1)}>重置</button>
            <button
              aria-label="放大僵尸"
              disabled={value >= 1.5}
              onClick={() => update(value + 0.05)}
            >
              ＋
            </button>
          </div>
          <small>50%–150% · 仅外观 · 自动记忆</small>
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Radio, Sparkles, ChevronsRight, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RECRUIT_HEROES } from '@/lib/recruit';
import HeroPortrait from '@/shared/HeroPortrait';
import './recruit-reveal.css';

const grades = { blue: 0, purple: 1, orange: 2 };
const captions = [
  '正在搜索幸存者信号',
  '信号锁定 · 开启集结通道',
  '援军抵达',
  '援军已集结！',
];
export default function RecruitReveal({
  ids,
  level,
  onClose,
  onTrain,
}: {
  ids: string[];
  level: number;
  onClose: () => void;
  onTrain: () => void;
}) {
  const [phase, setPhase] = useState(0);
  const confirm = useRef<HTMLButtonElement>(null);
  const heroes = ids.map((id) => RECRUIT_HEROES.find((h) => h.id === id)!);
  const featured = heroes.reduce((best, h) =>
    grades[h.rarity] > grades[best.rarity] ? h : best,
  );
  useEffect(() => {
    // The draw has already been saved. This timeline only reveals its real result.
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const timers = reduced
      ? [window.setTimeout(() => setPhase(3), 0)]
      : [
          window.setTimeout(() => setPhase((p) => Math.max(p, 1)), 850),
          window.setTimeout(() => setPhase((p) => Math.max(p, 2)), 1750),
          window.setTimeout(() => setPhase(3), 3250),
        ];
    return () => timers.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (phase === 3) confirm.current?.focus();
  }, [phase]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          if (phase < 3) setPhase(3);
          else onClose();
        }
      }}
    >
      <DialogContent
        className="summon-dialog"
        showCloseButton={false}
        data-phase={phase}
        data-rarity={featured.rarity}
        style={{ '--summon-color': featured.color } as CSSProperties}
      >
        <div className="summon-effects" aria-hidden="true">
          <div className="summon-sky" />
          <div className="summon-beams" aria-hidden="true" />
          <div className="summon-motes" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => (
              <i
                key={i}
                style={
                  {
                    '--angle': `${i * 20}deg`,
                    '--delay': `${(i % 6) * -0.23}s`,
                    '--distance': `${95 + (i % 4) * 32}px`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </div>
        <header className="summon-header">
          <span>
            <Radio size={15} /> 曙光联络站
          </span>
          {phase < 3 ? (
            <button className="summon-skip" onClick={() => setPhase(3)}>
              跳过动画 <ChevronsRight size={15} />
            </button>
          ) : (
            <span className="summon-saved">
              <ShieldCheck size={14} /> 已入队
            </span>
          )}
        </header>
        <div className="summon-heading">
          <small>DAWN · REINFORCEMENTS</small>
          <DialogTitle>{captions[phase]}</DialogTitle>
          <DialogDescription>
            {phase < 3
              ? '穿过废墟，与你并肩。'
              : `获得 ${ids.length} 名英雄 · 已保存至英雄档案`}
          </DialogDescription>
        </div>
        <div className="summon-stage" aria-hidden={phase < 2}>
          <div className="summon-portal" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          {phase < 2 ? (
            <div className="summon-signal">
              <Radio size={56} />
              <b>{phase === 0 ? '搜索中' : '信号锁定'}</b>
              <span>● ━━━ ● ━━━ ●</span>
            </div>
          ) : (
            <div className="summon-arrival" key="arrival">
              <span className="summon-grade">{featured.grade}</span>
              <div className="summon-portrait">
                <HeroPortrait hero={featured.index} height={235} />
              </div>
              <div className="summon-identity">
                <span>
                  {featured.role} · Lv.{level}
                </span>
                <b>{featured.name}</b>
                <small>
                  {ids.length > 1
                    ? '本次集结 · 高品质援军'
                    : '新的战友，已就位'}
                </small>
              </div>
            </div>
          )}
          {phase === 2 && <div className="summon-burst" aria-hidden="true" />}
        </div>
        {phase === 3 ? (
          <>
            {ids.length > 1 && (
              <div className="summon-results" aria-label="本次招募全部结果">
                {heroes.map((h, i) => (
                  <div
                    className="summon-card"
                    key={`${h.id}-${i}`}
                    style={
                      {
                        '--card-color': h.color,
                        '--card-delay': `${i * 0.035}s`,
                      } as CSSProperties
                    }
                  >
                    <HeroPortrait hero={h.index} height={58} />
                    <b>{h.name}</b>
                    <small>
                      {h.grade} · {h.role}
                    </small>
                  </div>
                ))}
              </div>
            )}
            <p className="summon-note">重复英雄已计入升星进度</p>
            <footer className="summon-actions">
              <button onClick={onTrain}>
                <Sparkles size={17} />
                前往培养
              </button>
              <button ref={confirm} onClick={onClose}>
                确定
              </button>
            </footer>
          </>
        ) : (
          <div className="summon-loading" aria-hidden="true">
            <div />
            <span>
              正在建立联络 · {ids.length === 1 ? '单次招募' : '十次招募'}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

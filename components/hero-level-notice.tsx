'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { campaign } from '@/lib/campaign';
import { HERO_ART } from '@/shared/toy-art';
import HeroPortrait from '@/shared/HeroPortrait';
import './hero-level-notice.css';

type LevelBatch = { id: number; level: number; heroes: number[] };
export default function HeroLevelNotice() {
  const [batch, setBatch] = useState<LevelBatch | null>(null);
  useEffect(() => {
    let serial = 0, timer = 0, previousLevel = campaign.read().hunt.level;
    // One active batch plus one merged pending batch bounds rapid level-up bursts.
    let pending: LevelBatch | null = null;
    const play = () => {
      const item = pending;
      pending = null;
      setBatch(item);
      timer = item ? window.setTimeout(play, 1900 + Math.max(0, item.heroes.length - 1) * 700) : 0;
    };
    const unsubscribe = campaign.subscribeHeroLevelUps((level, heroes) => {
      if (!heroes.length) return;
      pending = { id: ++serial, level, heroes: [...new Set([...(pending?.heroes ?? []), ...heroes])] };
      if (!timer) play();
    });
    const reset = campaign.subscribe(() => {
      const level = campaign.read().hunt.level;
      if (level < previousLevel) {
        window.clearTimeout(timer); timer = 0; pending = null; setBatch(null);
      }
      previousLevel = level;
    });
    return () => { unsubscribe(); reset(); window.clearTimeout(timer); };
  }, []);
  return <div className="hero-level-region" aria-live="polite" aria-atomic="true">
    {batch && <div key={batch.id}>
      <span className="sr-only">{batch.heroes.map(hero => `${HERO_ART[hero][1]}等级已提升至${batch.level}级`).join('，')}</span>
      {batch.heroes.map((hero, index) => <div key={hero} className="hero-level-float" aria-hidden="true" style={{ '--hero-delay': `${index * 700}ms` } as CSSProperties}>
        <HeroPortrait hero={hero} height={38} />
        <div><strong>{HERO_ART[hero][1]}等级已提升</strong><small>Lv.{batch.level} <span>↑</span></small></div>
        <b className="hero-level-spark">✦</b>
      </div>)}
    </div>}
  </div>;
}

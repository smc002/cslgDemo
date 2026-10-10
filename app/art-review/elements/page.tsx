'use client';
import { useEffect, useState } from 'react';
import GameplayMenu from '@/components/gameplay-menu';
import { campaign, freshCampaign, KEY } from '@/lib/campaign';
import { STORIES } from '@/lib/prologue';
import { ELEMENT_INTRO_SEEN } from '@/lib/elements';

/** Dedicated elemental preview save, separate from formal and other art-review progress. */
export default function ElementReview() {
  const [allowed, setAllowed] = useState(false);
  const [stage, setStage] = useState(2);
  const [running, setRunning] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    if (KEY !== 'mori.demo.elements.preview.v1' || new URLSearchParams(location.search).get('elements') !== 'preview') return;
    campaign.init(); setAllowed(true);
  }, []);
  useEffect(() => {
    if (!allowed || running) return;
    const timer = setTimeout(() => {
      if (KEY !== 'mori.demo.elements.preview.v1' || !campaign.claim(true)) {
        setError('独立体验存档未就绪。'); return;
      }
      campaign.update(d => {
        Object.assign(d, freshCampaign());
        d.bestStage = stage - 1; d.bestWave = d.bestStage * 3;
        d.tutorial = 1; d.ammo = 1000;
        d.hunt.level = stage === 2 ? 2 : 4;
        d.hunt.expedition.points = 200; d.hunt.economy.spentAmmo = 1;
        d.hunt.arrivalSeen = true;
        d.prologue.seen = STORIES.filter(s => s.ready(d)).map(s => s.id);
        d.prologue.rewards = ['recruit'];
        d.recruit.owned.samurai = 1;
        if (stage >= 3) {
          d.prologue.seen.push('city', 'factory', ELEMENT_INTRO_SEEN);
          d.city.unlocked = true; d.city.factory.level = 1;
          d.recruit.owned.guitar = 1; d.recruit.owned.assassin = 1;
          d.lineup = [3, 4, 5, 0, 1, 2, -1, -1, -1];
        }
        if (stage >= 5) {
          d.recruit.owned.minigun = 1; d.recruit.owned.priest = 1; d.recruit.owned.sniper = 1;
          d.lineup = [3, 4, 5, 0, 1, 2, 6, 7, 8];
        }
        d.notice = '';
      });
      location.hash = 'merged'; setEpoch(e => e + 1); setRunning(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [stage, allowed, running]);
  return <main className="element-review">
    <aside className="element-review-controls"><h1>冰火分路 · 独立验收</h1><p>仅使用体验存档，不改正式进度。</p>
      {!allowed ? <a href="?elements=preview#merged">进入独立体验</a> : [2, 3, 5].map(n => <button key={n} onClick={() => { setRunning(false); setStage(n); }}>第 {n} 关 · {n === 2 ? '首次教学' : n === 3 ? '混合敌情' : '三路布阵'}</button>)}
      <p>先阅读说明，手动调整英雄，再观察各路绿色克制提示与实战伤害。</p>{error && <p role="alert">{error}</p>}
    </aside>
    {allowed && running && <GameplayMenu key={epoch} />}
    <style>{`.element-review{min-height:100dvh;background:#102a29}.element-review-controls{position:fixed;z-index:40;left:max(12px,calc(50% - 480px));top:20px;width:220px;padding:15px;display:grid;gap:12px;background:#214d41;color:#f6e9c7;border:1px solid #c5ab67;border-radius:12px;font:12px/1.5 sans-serif}.element-review h1{font-size:17px;font-weight:900}.element-review-controls button,.element-review-controls a{padding:10px;background:#f5d47c;color:#284a3a;border-radius:7px;font-weight:800}@media(max-width:980px){.element-review-controls{position:relative;left:auto;top:auto;width:min(100%,420px);margin:auto}}`}</style>
  </main>;
}


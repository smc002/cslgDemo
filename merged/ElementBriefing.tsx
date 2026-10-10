/* eslint-disable next/no-img-element -- Reuse the exact game portraits for enemy reconnaissance. */
'use client';
import { Flame, Snowflake, Check, CircleHelp } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HERO_ART, TOY_META, TOY_ROOT, ZOMBIE_ART } from '@/shared/toy-art';
import { ELEMENT_NAMES, heroElement, laneCoverage, laneForecast, opposite, stageLanes, type Element } from '@/lib/elements';
import './elements.css';

export function ElementBadge({ element }: { element?: Element }) {
  if (!element) return null;
  const Icon = element === 'ice' ? Snowflake : Flame;
  return <span className={`element-badge is-${element}`}><Icon size={12} aria-hidden="true" />{ELEMENT_NAMES[element]}</span>;
}
const LANE_NAMES = ['左路', '中路', '右路'];
const KIND_NAMES = ['普通僵尸', '装甲僵尸', '巨型僵尸'];
function EnemyPortrait({ kind }: { kind: number }) {
  const id = ZOMBIE_ART[[0, 2, 3][kind]], m = TOY_META[id], b = m.bounds;
  const scale = 24 / (b[3] - b[1]);
  return <span className="enemy-portrait" style={{ width: (b[2] - b[0]) * scale, height: 24 }}>
    <img alt={KIND_NAMES[kind]} src={`${TOY_ROOT}${id}.png`} style={{ width: m.width * scale, height: m.height * scale, left: -b[0] * scale, top: -b[1] * scale }} />
  </span>;
}
export function ElementIntel({ stage, lineup, onHelp }: { stage: number; lineup: number[]; onHelp: () => void }) {
  return <div className="merged-lanes element-intel" aria-label="本关每路敌情预告">
    <header><b>第 {stage} 关 · 全部小节敌情</b><button onClick={onHelp} aria-label="查看冰火克制说明"><CircleHelp size={13} />怎么克制</button></header>
    {[0, 1, 2].map(lane => {
      const groups = laneForecast(stage, lane), coverage = laneCoverage(stage, lane, lineup);
      if (!groups.length) return <div key={lane} className="element-lane is-locked"><b>{LANE_NAMES[lane]}</b><small>第 4 关后开放</small></div>;
      const total = groups.reduce((n, e) => n + e.count, 0);
      const kinds = [...new Set(groups.map(e => e.kind))].map(kind => ({
        kind, groups: groups.filter(e => e.kind === kind),
      }));
      return <div key={lane} className={`element-lane${coverage.covered.length ? ' has-counter' : ''}`}>
        <b>{LANE_NAMES[lane]} <small>{total} 只</small></b>
        <div className="enemy-intel-list">{kinds.map(e => <div key={e.kind} className="enemy-intel-unit" title={`${KIND_NAMES[e.kind]}：${e.groups.map(g => `${g.element ? ELEMENT_NAMES[g.element] : '无属性'} ×${g.count}`).join('、')}`}>
          <EnemyPortrait kind={e.kind} /><div className="enemy-element-badges">{e.groups.map(g => g.element ? <ElementBadge key={g.element} element={g.element} /> : <span key="neutral" className="element-badge is-neutral">无</span>)}</div><i>×{e.groups.reduce((n, g) => n + g.count, 0)}</i>
        </div>)}</div>
        <small>{coverage.enemies.length === 2 ? '冰火混合 · 建议冰＋火' : `${groups.some(g => !g.element) ? `${ELEMENT_NAMES[coverage.enemies[0]]}＋无属性` : `全${ELEMENT_NAMES[coverage.enemies[0]]}系`} · 建议${ELEMENT_NAMES[opposite(coverage.enemies[0])]}系`}</small>
        <div className="element-lane-result" role="status">{coverage.covered.length ? <><Check size={12} />{coverage.complete ? '克制已就位' : '部分敌人被克制'}</> : '调整英雄到此路'}</div>
      </div>;
    })}
  </div>;
}
export function ElementPlacementHint({ stage, lineup, selectedHero }: { stage: number; lineup: number[]; selectedHero: number | null }) {
  const element = selectedHero === null ? undefined : heroElement(selectedHero, stage);
  const lanes = stageLanes(stage);
  const complete = lanes.every(lane => laneCoverage(stage, lane, lineup).complete);
  const targets = element ? lanes.filter(lane => laneCoverage(stage, lane, lineup).enemies.includes(opposite(element))) : [];
  return <div className={`element-placement-hint${complete ? ' is-ready' : ''}`} role="status">
    {element && targets.length ? `${HERO_ART[selectedHero!][1]}·${ELEMENT_NAMES[element]} → 放到${targets.map(lane => LANE_NAMES[lane]).join('／')}，克制${ELEMENT_NAMES[opposite(element)]}敌人`
      : complete ? '✓ 各路克制已就位：对应目标增伤 30% / 减伤 20%'
      : '先看上方敌情，再选英雄 → 点目标位置；也可拖动交换'}
  </div>;
}
export function ElementTutorial({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <Dialog open={open} modal="trap-focus" disablePointerDismissal onOpenChange={v => { if (!v) onClose(); }}>
    <DialogContent className="element-tutorial">
      <DialogTitle>冰火克制</DialogTitle>
      <DialogDescription>先看上方敌情：<b>火英雄打冰僵尸，冰英雄打火僵尸。</b></DialogDescription>
      <p>克制时，英雄<b>伤害 +30%，受到伤害 −20%。</b></p>
      <p>点击英雄再点目标位置换路，看到<b>“克制已就位”</b>即可出发。</p>
      <button className="element-tutorial-confirm" onClick={onClose}>去调整分路</button>
    </DialogContent>
  </Dialog>;
}

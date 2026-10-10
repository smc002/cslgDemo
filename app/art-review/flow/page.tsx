'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import GameplayMenu from '@/components/gameplay-menu';
import CombatCapture from '@/components/combat-capture';
import CombatKeyframes from '@/components/combat-keyframes';
import {
  campaign,
  completeStage,
  freshCampaign,
  KEY,
  saveHunt,
  type Campaign,
} from '@/lib/campaign';
import { pendingStory, storyRecruit } from '@/lib/prologue';
import { ticketBalance } from '@/lib/recruit';
import { reserve } from '@/lib/hunt-economy';

const PREVIEW_KEY = 'mori.demo.rewards.preview.v1';
type ReviewAction = 'reset' | 'cores' | 'stage' | 'node' | 'shotgun' | 'laser';
const isolated = () =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('rewards') === 'preview' &&
  KEY === PREVIEW_KEY;

function reachCoreMilestone(d: Campaign) {
  const next = structuredClone(d.hunt);
  const gain = Math.max(0, 200 - next.expedition.points);
  next.expedition.points += gain;
  next.xp += gain;
  while (next.xp >= next.level * 200) {
    next.xp -= next.level * 200;
    next.level++;
  }
  return saveHunt(d, next);
}

/** Uses the real shell and only the explicitly selected disposable preview save. */
export default function FlowReview() {
  const [allowed, setAllowed] = useState(false);
  const [running, setRunning] = useState(false);
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [snapshot, setSnapshot] = useState<Campaign | null>(null);
  const [error, setError] = useState('');
  const [ticketReviewAge, setTicketReviewAge] = useState<number>();
  const [arrivalReviewAge, setArrivalReviewAge] = useState<number>();

  useEffect(() => {
    if (!isolated()) return;
    const unsubscribe = campaign.subscribe(() => setSnapshot(campaign.read()));
    const timer = window.setTimeout(() => {
      if (!isolated()) return;
      campaign.init();
      setAllowed(true);
      setRunning(false);
      setAction('reset');
    }, 0);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!allowed || running || !action) return;
    // The previous GameplayMenu/HuntPanel first unmounts and flushes its save.
    // Delay injection until all passive cleanups have completed.
    const timer = window.setTimeout(() => {
      if (!isolated()) {
        setError('预览存档校验失败，未修改任何存档。');
        setAction(null);
        return;
      }
      if (!campaign.claim(true)) {
        setError('无法取得独立体验存档，请关闭其它奖励预览页后重试。');
        setAction(null);
        return;
      }
      let committed = false;
      const accepted = campaign.update((d) => {
        if (
          action === 'reset' ||
          action === 'node' ||
          action === 'shotgun' ||
          action === 'laser'
        ) {
          Object.assign(d, freshCampaign());
          d.bestStage = 1;
          d.bestWave = 3;
          d.tutorial = 1;
          d.ammo = 1000;
          // Actual story id is "arrival", not "intro".
          d.prologue.seen = ['arrival', 'ammo'];
          d.hunt.xp = 190;
          d.hunt.expedition.points = 190;
          if (action === 'node') {
            d.hunt.level = 3;
            d.hunt.xp = 390;
            d.hunt.expedition.points = 990;
            d.ticketsEarned = 4;
          }
          d.hunt.arrivalSeen = false;
          if (action === 'shotgun' || action === 'laser') {
            d.hunt.arrivalSeen = true;
            d.hunt.xp = 0;
            d.hunt.expedition.points = 0;
            const kind = action === 'shotgun' ? 11 : 10;
            const event = reserve(d.hunt.economy, kind, 1, true)!;
            // Disposable, funded target; acquire it through real shots and the normal kill path.
            d.hunt.economy.runtime = {
              id: 100,
              bullets: [],
              spawnClock: 1,
              intro: 0,
              zombies: [
                ...Array.from({ length: 12 }, (_, i) => ({
                  id: i + 1,
                  kind: i % 4 === 0 ? 1 : 0,
                  x: i % 2 ? 500 : 100,
                  y: 200 + Math.floor(i / 2) * 38,
                  vx: i % 2 ? -12 : 12,
                  vy: 16,
                  seed: i / 13,
                  age: 0,
                  hit: 0,
                })),
                {
                  id: 100,
                  kind,
                  x: 300,
                  y: 340,
                  vx: 0,
                  vy: 0,
                  age: 0,
                  hit: 0,
                  seed: 0.4,
                  eventId: event.id,
                },
              ],
            };
          }
          d.notice = '';
          committed = true;
        } else if (action === 'cores') {
          committed = reachCoreMilestone(d);
        } else if (d.bestStage < 2 && reachCoreMilestone(d)) {
          // Complete the stage-two prerequisites within this disposable fixture.
          // This makes the newly pending chapter "city", rather than old "signal".
          if (!d.prologue.seen.includes('signal'))
            d.prologue.seen.push('signal');
          storyRecruit(d);
          committed = completeStage(d, 2);
        } else if (d.bestStage >= 2) committed = true;
      });
      if (!accepted || !committed)
        setError('体验状态提交失败，请重置体验后重试。');
      else setError('');
      setSnapshot(campaign.read());
      window.location.hash = 'hunt';
      setAction(null);
      setEpoch((value) => value + 1);
      setRunning(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [allowed, running, action]);

  const request = (next: ReviewAction) => {
    if (!isolated() || action) return;
    setRunning(false);
    setAction(next);
  };
  const story = snapshot ? pendingStory(snapshot) : undefined;
  return (
    <main className="flow-review">
      <aside className="flow-review-controls" aria-label="主线与入场验收工具">
        <h1>猎场流程验收</h1>
        <p>独立奖励体验存档 · 刷新重置</p>
        <CombatCapture />
        {allowed && <CombatKeyframes />}
        {!allowed ? (
          <Link href="/art-review/flow?rewards=preview#hunt">
            进入独立流程预览
          </Link>
        ) : (
          <>
            <button disabled={!!action} onClick={() => { setArrivalReviewAge(undefined); request('reset'); }}>
              重置体验并首次入场
            </button>
            {[0.4, 1.5, 2.7, 3.6, 4.65].map((age) => (
              <button key={`arrival-${age}`} onClick={() => { setArrivalReviewAge(age); request('reset'); }}>
                入场镜头 · {age.toFixed(2)} 秒
              </button>
            ))}
            <button onClick={() => setArrivalReviewAge(undefined)}>
              播放当前入场
            </button>
            <button disabled={!!action} onClick={() => request('node')}>
              中间节点测试 · 390/600
            </button>
            <button disabled={!!action} onClick={() => request('shotgun')}>
              散弹枪获得提示 · 实战测试
            </button>
            <button disabled={!!action} onClick={() => request('laser')}>
              激光枪获得提示 · 实战测试
            </button>
            {[0.25, 0.7, 1.1].map((age) => (
              <button key={age} onClick={() => setTicketReviewAge(age)}>
                节点演出 · {age.toFixed(2)} 秒
              </button>
            ))}
            <button onClick={() => setTicketReviewAge(undefined)}>
              恢复节点动画
            </button>
            <small>
              节点静帧等待真实奖励触发，只暂停表现；恢复后正常收尾。
            </small>
            <button
              disabled={!!action || !running}
              onClick={() => request('cores')}
            >
              核心达 200 · 后续主线
            </button>
            <button
              disabled={!!action || !running}
              onClick={() => request('stage')}
            >
              第二关完成 · 营地任务
            </button>
            <p>
              核心 {snapshot?.hunt.expedition.points ?? 190} / 200 · 抽奖券{' '}
              {snapshot ? ticketBalance(snapshot) : 0}
            </p>
            <p>
              待续通讯：{story?.title ?? '无'}
              <br />
              首次入场：{snapshot?.hunt.arrivalSeen ? '已完成' : '待播放'}
            </p>
            <small>
              猎场中触发后，任务栏持续呼吸并流动光圈，点击才打开通讯；离开猎场恢复自动通讯及引导。第二关按钮会一并完成前置定向招募。
            </small>
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </aside>
      {allowed && running && (
        <GameplayMenu key={epoch} ticketReviewAge={ticketReviewAge} arrivalReviewAge={arrivalReviewAge} />
      )}
      <style>{`
        .flow-review { min-height: 100dvh; background: #102a29; }
        .flow-review-controls { position: fixed; z-index: 60; top: 16px; left: max(12px, calc(50% - 485px)); width: 225px; max-height: calc(100dvh - 32px); overflow-y: auto; padding: 14px; display: grid; gap: 9px; border: 1px solid #b19c5c; border-radius: 14px; color: #f9ecc5; background: #173d37; font: 12px/1.5 system-ui, sans-serif; }
        .flow-review-controls h1 { font-size: 17px; font-weight: 900; }
        .flow-review-controls button, .flow-review-controls a { padding: 9px; border: 1px solid #eacc7f; border-radius: 8px; color: #263d32; background: #f4d376; font-weight: 800; text-align: center; }
        .flow-review-controls button:disabled { opacity: .5; }
        .flow-review-controls small { color: #bdd4c9; font-size: 11px; }
        .flow-review-controls [role=alert] { color: #ffbfb0; }
        @media (max-width: 980px) { .flow-review-controls { position: relative; top: auto; left: auto; width: min(100%, 414px); margin: 0 auto 12px; } }
      `}</style>
    </main>
  );
}

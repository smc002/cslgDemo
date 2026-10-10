'use client';

import { useEffect, useRef, useState } from 'react';
import HuntPanel from '@/hunt/HuntPanel';
import RecruitPanel from '@/recruit/RecruitPanel';
import TicketRewardNotice from '@/components/ticket-reward-notice';
import { useTicketPresentation } from '@/components/use-ticket-presentation';
import CombatCapture from '@/components/combat-capture';
import { campaign, freshCampaign, KEY, saveHunt } from '@/lib/campaign';
import { ticketBalance } from '@/lib/recruit';
import '@/components/gameplay-menu.css';
import '@/components/loop.css';
import '@/components/phone-ui.css';
import '@/components/bright-ui.css';
import '@/components/hunt-production.css';

const PREVIEW_KEY = 'mori.demo.rewards.preview.v1';

/** Production reward components, backed only by a dedicated disposable save. */
export default function RewardReview() {
  const ticketPresentation = useTicketPresentation();
  const [ready, setReady] = useState(false);
  const [needsPreview, setNeedsPreview] = useState(false);
  const [panel, setPanel] = useState<'hunt' | 'recruit' | 'preparing'>('hunt');
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState('');
  const pendingCourier = useRef(false);

  useEffect(() => {
    if (KEY !== PREVIEW_KEY) {
      setNeedsPreview(true);
      return;
    }
    campaign.init();
    campaign.claim(true);
    campaign.update((d) => {
      Object.assign(d, freshCampaign());
      d.prologue.enabled = false;
      d.bestStage = 2;
      d.bestWave = 6;
      d.ammo = 1000;
      d.notice = '';
    });
    setBalance(ticketBalance(campaign.read()));
    const unsubscribe = campaign.subscribe(() => setBalance(ticketBalance(campaign.read())));
    const lease = window.setInterval(() => campaign.claim(), 1000);
    setReady(true);
    return () => {
      unsubscribe();
      window.clearInterval(lease);
      campaign.releaseLease();
    };
  }, []);

  useEffect(() => {
    if (!ready || panel !== 'preparing' || !pendingCourier.current) return;
    pendingCourier.current = false;
    // The old panel has unmounted and persisted before injecting a new encounter.
    let committed = false;
    campaign.update((d) => {
      const next = structuredClone(d.hunt);
      next.courier.active = null;
      next.courier.completed++;
      next.courier.reveal = { serial: next.courier.completed, tickets: 10 };
      committed = saveHunt(d, next);
    });
    if (!committed) setError('奖励提交失败，请刷新预览页重试。');
    setPanel('hunt');
  }, [ready, panel]);

  return (
    <main className="mori-gameplay-shell" data-gameplay={panel === 'recruit' ? 'recruit' : 'hunt'}>
      {ready && <TicketRewardNotice reward={ticketPresentation} />}
      <header style={{ position: 'relative', zIndex: 10, padding: '12px', background: '#173e35', color: '#fff1c7', flexShrink: 0 }}>
        <h1 style={{ fontWeight: 900, fontSize: 19 }}>奖励效果验收</h1>
        <p style={{ fontSize: 11, margin: '4px 0 10px' }}>独立体验存档 · 刷新重置 · 当前抽奖券 {balance}</p>
        {needsPreview && <p style={{ margin: '10px 0' }}><a href="/art-review/rewards?rewards=preview" style={{ color: '#ffdf75', textDecoration: 'underline' }}>进入独立奖励预览</a></p>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button disabled={!ready} style={controlStyle} onClick={() => {
            campaign.update((d) => { d.ticketsEarned += 10; });
          }}>飘字 +10</button>
          <button disabled={!ready || panel === 'preparing'} style={controlStyle} onClick={() => {
            pendingCourier.current = true;
            setPanel('preparing');
          }}>运钞奖励弹窗</button>
          <button disabled={!ready} style={controlStyle} onClick={() => setPanel(panel === 'recruit' ? 'hunt' : 'recruit')}>
            {panel === 'recruit' ? '返回猎场' : '查看抽奖'}
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
        {ready && panel === 'hunt' && <CombatCapture />}
      </header>
      <div className="mori-gameplay-content">
        {ready && panel === 'hunt' && <HuntPanel active onRecruit={() => setPanel('recruit')} />}
        {ready && panel === 'recruit' && <RecruitPanel active />}
      </div>
    </main>
  );
}

const controlStyle = {
  border: '1px solid #f4d078',
  borderRadius: 8,
  background: '#e8bd59',
  color: '#283e31',
  padding: '7px 9px',
  fontWeight: 800,
  fontSize: 12,
  cursor: 'pointer',
} as const;

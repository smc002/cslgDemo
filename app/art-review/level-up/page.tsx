'use client';
import { useEffect, useState } from 'react';
import { campaign, freshCampaign, KEY, saveHunt } from '@/lib/campaign';
import { RECRUIT_HEROES } from '@/lib/recruit';
import HeroLevelNotice from '@/components/hero-level-notice';
import CoreEnergy from '@/components/core-energy';
import TicketRewardNotice from '@/components/ticket-reward-notice';
import { useTicketPresentation } from '@/components/use-ticket-presentation';
import '@/components/gameplay-menu.css';
import '@/components/loop.css';
import '@/components/phone-ui.css';
import '@/components/bright-ui.css';

export default function LevelUpReview() {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState(campaign.read());
  const tickets = useTicketPresentation();
  useEffect(() => {
    if (KEY !== 'mori.demo.levelup.preview.v1') return;
    campaign.init(); campaign.claim(true);
    campaign.update(d => {
      Object.assign(d, freshCampaign());
      d.hunt.xp = 190; d.hunt.expedition.points = 190;
      RECRUIT_HEROES.forEach(hero => { d.recruit.owned[hero.id] = 1; });
    });
    setData(campaign.read()); setReady(true);
    const unsubscribe = campaign.subscribe(() => setData(campaign.read()));
    const timer = window.setInterval(() => campaign.claim(), 1000);
    return () => { unsubscribe(); window.clearInterval(timer); campaign.releaseLease(); };
  }, []);
  const fill = () => campaign.update(d => {
    const next = structuredClone(d.hunt);
    const gain = next.level * 200 - next.xp;
    next.expedition.points += gain; next.xp = 0; next.level++;
    saveHunt(d, next);
  });
  return <main className="mori-gameplay-shell" style={{ background:'linear-gradient(#1b5047,#102d29)' }}>
    <header style={{ padding:18, color:'#fff0c1', display:'grid', gap:12 }}>
      <h1>英雄升级飘字 · 独立体验</h1>
      {!ready ? <a href="?levelup=preview">进入独立体验存档</a> : <>
        <CoreEnergy level={data.hunt.level} xp={data.hunt.xp} points={data.hunt.expedition.points} award={tickets?.core} awardId={tickets?.id} awardArrived={tickets?.arrived} onOpenChange={() => {}} />
        <p>全队 Lv.{data.hunt.level} · 已拥有全部 9 位英雄</p>
        <button className="gold" onClick={fill}>充满核心并升级</button>
        <button className="gold" onClick={() => { fill(); fill(); }}>连续升级两次</button>
        <p style={{fontSize:12}}>独立存档；刷新重置；升级提示逐个播放，不拦截点击。</p>
      </>}
    </header>
    {ready && <><HeroLevelNotice /><TicketRewardNotice reward={tickets} /></>}
    <div data-guide="nav-recruit" style={{position:'absolute',bottom:24,left:'60%',color:'#ffdd75'}}>英雄</div>
  </main>;
}

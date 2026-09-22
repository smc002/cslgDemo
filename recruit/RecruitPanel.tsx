'use client';
import { useState, useSyncExternalStore } from 'react';
import { campaign, growthOf, promoteHero, slotsUnlocked } from '@/lib/campaign';
import {
  RECRUIT_HEROES,
  drawHeroes,
  ticketBalance,
  QUALITY_COLORS,
  QUALITY_NAMES,
} from '@/lib/recruit';
import HeroPortrait from '@/shared/HeroPortrait';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
export default function RecruitPanel({ active }: { active: boolean }) {
  const d = useSyncExternalStore(
      campaign.subscribe,
      campaign.read,
      campaign.read,
    ),
    [results, setResults] = useState<string[]>([]),
    [detail, setDetail] = useState<string | null>(null),
    [tab, setTab] = useState('recruit');
  const draw = (count: number) => {
    let ids: string[] | null = null;
    campaign.update((x) => {
      ids = drawHeroes(x, count);
      if (ids) x.tutorial = Math.max(x.tutorial, 3);
    });
    if (ids) setResults(ids);
  };
  const selected = RECRUIT_HEROES.find((h) => h.id === detail),
    g = selected ? growthOf(d, selected.id) : null;
  return (
    <section className="loop-page hero-page">
      <header className="loop-heading">
        <span>幸存者档案</span>
        <small>
          全队 Lv.{d.hunt.level} · 已集结{' '}
          {RECRUIT_HEROES.filter((h) => d.recruit.owned[h.id]).length}/
          {RECRUIT_HEROES.length}
        </small>
      </header>
      <Tabs className="hero-tabs" value={tab} onValueChange={setTab}>
        <TabsList className="loop-tabs" aria-label="英雄招募与查看培养">
          <TabsTrigger value="recruit">英雄招募</TabsTrigger>
          <TabsTrigger value="collection">查看培养</TabsTrigger>
        </TabsList>
        <TabsContent value="recruit">
          <div className="recruit-banner">
            <img src="/assets/recruit/sniper.png" alt="狙击手招募立绘" />
            <div>
              <small>废墟电台 · 援军信号</small>
              <h2>
                每个信号
                <br />
                都是新的希望
              </h2>
              <p>
                招募券来自能源核心进度
                <br />
                新英雄立即继承全队等级
              </p>
            </div>
          </div>
          <div className="recruit-draw">
            <strong>招募券 {ticketBalance(d)}</strong>
            <div className="loop-row">
              <button
                className="gold"
                disabled={!active || ticketBalance(d) < 1}
                onClick={() => draw(1)}
              >
                招募一次 · 1券
              </button>
              <button
                disabled={!active || ticketBalance(d) < 10}
                onClick={() => draw(10)}
              >
                招募十次 · 10券
              </button>
            </div>
            <p>蓝色 70% · 紫色 25% · 橙色 5%</p>
            {ticketBalance(d) === 0 && (
              <button onClick={() => (location.hash = 'hunt')}>
                前往猎场获取招募券
              </button>
            )}
          </div>
        </TabsContent>
        <TabsContent value="collection">
          <p className="loop-help">
            点击英雄查看详情与培养。等级全队共享；重复英雄用于升星，满星后进阶。
          </p>
          <div className="hero-grid">
            {RECRUIT_HEROES.map((h) => {
              const g = growthOf(d, h.id),
                owned = d.recruit.owned[h.id];
              return (
                <button
                  key={h.id}
                  className={owned ? '' : 'unowned'}
                  style={{ borderColor: QUALITY_COLORS[g.quality] }}
                  onClick={() => setDetail(h.id)}
                  aria-label={`查看${h.name}${owned ? '并培养' : '，尚未招募'}`}
                >
                  <HeroPortrait hero={h.index} height={76} />
                  <b>{h.name}</b>
                  <small>
                    {h.role} · {owned ? `Lv.${d.hunt.level}` : '未招募'}
                  </small>
                  <span style={{ color: QUALITY_COLORS[g.quality] }}>
                    {QUALITY_NAMES[g.quality]} {'★'.repeat(g.stars)}
                  </span>
                  {owned > 0 && (
                    <small>重复进度 {Math.max(0, owned - 1 - g.used)}</small>
                  )}
                </button>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
      <Dialog
        open={results.length > 0}
        onOpenChange={(open) => {
          if (!open) setResults([]);
        }}
      >
        <DialogContent className="loop-dialog">
          <DialogTitle>援军已集结！</DialogTitle>
          <DialogDescription>
            已保存到英雄档案。重复英雄积累升星进度，可前往物资搜刮调整上阵。
          </DialogDescription>
          <div className="loop-rewards">
            {results.map((id, i) => {
              const h = RECRUIT_HEROES.find((h) => h.id === id)!;
              return (
                <div key={i} style={{ color: h.color }}>
                  <HeroPortrait hero={h.index} height={85} />
                  <b>{h.name}</b>
                  <small>
                    {h.role} · Lv.{d.hunt.level}
                  </small>
                </div>
              );
            })}
          </div>
          <button
            className="gold"
            onClick={() => {
              setResults([]);
              setTab('collection');
            }}
          >
            查看培养
          </button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="loop-dialog">
          <DialogTitle>{selected?.name}</DialogTitle>
          <DialogDescription>
            初始{selected && QUALITY_NAMES[selected.rarity]} · {selected?.role}{' '}
            · 当前等级 Lv.{d.hunt.level}
          </DialogDescription>
          {selected && g && (
            <>
              <div className="hero-detail-art">
                <HeroPortrait hero={selected.index} height={160} />
              </div>
              <p style={{ color: QUALITY_COLORS[g.quality] }}>
                {QUALITY_NAMES[g.quality]} {'★'.repeat(g.stars)} · 重复进度{' '}
                {Math.max(0, d.recruit.owned[selected.id] - 1 - g.used)}
              </p>
              <button
                className="gold"
                disabled={
                  !active ||
                  !d.recruit.owned[selected.id] ||
                  (g.quality === 'red' && g.stars === 3) ||
                  d.recruit.owned[selected.id] - 1 - g.used <
                    (g.stars === 3 ? 3 : g.stars)
                }
                onClick={() =>
                  campaign.update((x) => {
                    promoteHero(x, selected.id);
                  })
                }
              >
                {g.quality === 'red' && g.stars === 3
                  ? '已达最高星级'
                  : `${g.stars === 3 ? '品质进阶' : '提升星级'} · 消耗 ${g.stars === 3 ? 3 : g.stars} 份重复进度`}
              </button>
              <p>
                当前开放 {slotsUnlocked(d)}{' '}
                个上阵位置，可在搜刮布阵时选择这名英雄。
              </p>
              <button
                disabled={!d.recruit.owned[selected.id]}
                onClick={() => {
                  setDetail(null);
                  location.hash = 'merged';
                  window.moriMerged?.prepare();
                }}
              >
                前往上阵
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

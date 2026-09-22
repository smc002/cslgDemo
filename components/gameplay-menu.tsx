'use client';
import { useEffect, useState } from 'react';
import { Settings, Radio, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import MergedPanel, { type BattleStatus } from '@/merged/MergedPanel';
import RecruitPanel from '@/recruit/RecruitPanel';
import HuntPanel from '@/hunt/HuntPanel';
import CityPanel from '@/city/CityPanel';
import { campaign, emergencySupply } from '@/lib/campaign';
import { ticketBalance } from '@/lib/recruit';
import './gameplay-menu.css';
import './loop.css';
import './phone-ui.css';
import './bright-ui.css';
const MODES = [
  { id: 'merged', label: '物资搜刮' },
  { id: 'hunt', label: '禁区猎场' },
  { id: 'recruit', label: '英雄' },
  { id: 'city', label: '内城' },
];
export default function GameplayMenu() {
  const [mode, setMode] = useState('merged'),
    [loaded, setLoaded] = useState(false),
    [visited, setVisited] = useState(false),
    [d, setData] = useState(campaign.read()),
    [owns, setOwns] = useState(true),
    [battle, setBattle] = useState<BattleStatus | null>(null),
    [settings, setSettings] = useState(false),
    [confirmReset, setConfirmReset] = useState(false),
    [epoch, setEpoch] = useState(0),
    [now, setNow] = useState(Date.now()),
    [dismissed, setDismissed] = useState(''),
    [missionOpen, setMissionOpen] = useState(false);
  useEffect(() => {
    if (!d.notice) return;
    const timer = setTimeout(() => setDismissed(d.notice), 4200);
    return () => clearTimeout(timer);
  }, [d.notice]);
  useEffect(() => {
    campaign.init();
    setData(campaign.read());
    const unsub = campaign.subscribe(() => setData(campaign.read()));
    const hash = () => {
      let m = location.hash.slice(1);
      if (!MODES.some((x) => x.id === m)) m = 'merged';
      setMode(m);
      if (m === 'hunt') setVisited(true);
      if (location.hash !== `#${m}`) history.replaceState(null, '', `#${m}`);
    };
    const claim = () => {
      setOwns(campaign.claim());
      setNow(Date.now());
    };
    hash();
    claim();
    setLoaded(true);
    const t = setInterval(claim, 1000);
    const release = () => campaign.releaseLease();
    window.addEventListener('hashchange', hash);
    window.addEventListener('pagehide', release);
    return () => {
      unsub();
      clearInterval(t);
      release();
      window.removeEventListener('hashchange', hash);
      window.removeEventListener('pagehide', release);
    };
  }, []);
  const locked =
    (mode === 'hunt' && d.bestStage < 1) ||
    (mode === 'city' && !d.city.unlocked);
  const hint =
    d.bestStage === 0
      ? '电台：前方发现弹药箱。先完成第一关，补给就能送往猎场。'
      : d.hunt.expedition.points < 200
        ? '电台：把黑金弹装进猎场武器。收集核心能提升全队等级，还能换取招募券。'
        : d.recruit.spent === 0
          ? '电台：援军信号已经接通。前往英雄招募，试着呼叫一位新伙伴。'
          : d.city.unlocked && !d.city.factory.level
            ? '电台：工坊已修复。用赠送的建材建造黑金弹工厂，让补给持续运转。'
            : '';
  return (
    <div className="mori-gameplay-shell" data-gameplay={mode}>
      <div className="global-resources">
        <div className="squad-growth">
          <div className="level-medallion">
            <small>小队</small>
            <b>{d.hunt.level}</b>
          </div>
          <div className="squad-meter">
            <div>
              <b>幸存者小队</b>
              <span>
                {d.hunt.xp}/{d.hunt.level * 200}
              </span>
            </div>
            <progress
              aria-label="小队升级进度"
              max={d.hunt.level * 200}
              value={d.hunt.xp}
            />
          </div>
          <button
            className="settings-button"
            aria-label="游戏设置"
            onClick={() => setSettings(true)}
          >
            <Settings size={20} />
          </button>
        </div>
        <div className="resource-pills">
          <span title="黑金弹">
            <img src="/assets/loop/black-gold-ammo.png" alt="" /> {d.ammo}
          </span>
          <span title="累计能源核心">
            <img src="/assets/loop/energy-core.png" alt="" />{' '}
            {d.hunt.expedition.points}
          </span>
          <span title="招募券">
            <Ticket size={16} />
            {ticketBalance(d)}
          </span>
          <button
            className="mission-button"
            aria-label="查看当前目标"
            onClick={() => setMissionOpen(true)}
          >
            <Radio size={15} />
            目标{hint && <i />}
          </button>
        </div>
      </div>
      <div className="mori-gameplay-content">
        {loaded && (
          <div
            key={epoch}
            className={`mori-gameplay-layer battle-layer ${mode === 'merged' ? 'is-active' : 'is-mini'}`}
          >
            <MergedPanel active={owns} onStatus={setBattle} />
            {mode !== 'merged' && (
              <button
                className="battle-mini-cover"
                onClick={() => (location.hash = 'merged')}
                aria-label="返回物资搜刮"
              >
                <strong>搜刮 {battle?.stage ?? d.bestStage + 1} 关</strong>
                <span>
                  {battle?.phase === 'defeat'
                    ? '失败 · 调整阵容'
                    : battle?.phase === 'prep'
                      ? battle.boss
                        ? '首领出现 · 点击挑战'
                        : '等待出发'
                      : battle?.phase === 'cleared'
                        ? '胜利 · 补给入库'
                        : battle?.paused
                          ? '已暂停'
                          : `第 ${battle?.wave ?? 1}/3 波`}
                </span>
              </button>
            )}
          </div>
        )}
        {mode === 'hunt' && !locked && (
          <div className="mori-gameplay-layer is-active secondary-layer">
            {visited && (
              <HuntPanel
                key={`hunt-${epoch}`}
                active={owns && !settings && !missionOpen}
              />
            )}
          </div>
        )}
        {mode === 'recruit' && (
          <div className="mori-gameplay-layer is-active secondary-layer">
            <RecruitPanel active={owns} />
          </div>
        )}
        {mode === 'city' && !locked && (
          <div className="mori-gameplay-layer is-active secondary-layer">
            <CityPanel active={owns} />
          </div>
        )}
        {locked && (
          <div className="loop-locked">
            <h2>{mode === 'hunt' ? '禁区猎场' : '曙光营地'}</h2>
            <p>
              {mode === 'hunt'
                ? '完成搜刮第 1 关，拿到第一批黑金弹后开放。'
                : '完成搜刮第 2 关，营地工坊和建材包将一并解锁。'}
            </p>
            <button onClick={() => (location.hash = 'merged')}>返回搜刮</button>
          </div>
        )}
        {!owns && (
          <div className="mori-campaign-busy">
            <strong>游戏已在另一个标签页打开</strong>
            <Button
              onClick={() => {
                setOwns(campaign.claim(true));
                setEpoch((e) => e + 1);
              }}
            >
              在此继续
            </Button>
          </div>
        )}
      </div>
      {d.notice && dismissed !== d.notice && (
        <button className="loop-notice" onClick={() => setDismissed(d.notice)}>
          {d.notice}
          <span>×</span>
        </button>
      )}
      <nav className="mori-gameplay-menu" aria-label="玩法切换">
        {MODES.map((m) => (
          <Button
            key={m.id}
            aria-label={m.label}
            aria-current={mode === m.id ? 'page' : undefined}
            className={mode === m.id ? 'selected' : ''}
            onClick={() => {
              location.hash = m.id;
            }}
          >
            <span className={`nav-emblem ${m.id}`}>
              <img src={`/assets/ui-bright/nav-${m.id}.png`} alt="" />
            </span>
            <span>
              {m.id === 'merged' ? '搜刮' : m.id === 'hunt' ? '猎场' : m.label}
              {(m.id === 'city' && !d.city.unlocked) ||
              (m.id === 'hunt' && d.bestStage < 1)
                ? ' 🔒'
                : ''}
            </span>
          </Button>
        ))}
      </nav>
      <Dialog open={missionOpen} onOpenChange={setMissionOpen}>
        <DialogContent className="loop-dialog">
          <DialogTitle>电台 · 当前目标</DialogTitle>
          <DialogDescription>
            {hint || '继续搜刮物资，在猎场收集核心，培养英雄，扩建营地。'}
          </DialogDescription>
          <p>
            已完成第 {d.bestStage} 关 · 全队 Lv.{d.hunt.level}
          </p>
          <p>
            再获得 {200 - (d.hunt.expedition.points % 200)} 能源核心，招募券
            +1。
          </p>
          <button className="gold" onClick={() => setMissionOpen(false)}>
            收到
          </button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={settings}
        onOpenChange={(open) => {
          setSettings(open);
          setConfirmReset(false);
        }}
      >
        <DialogContent className="loop-dialog">
          <DialogTitle>营地通讯</DialogTitle>
          <DialogDescription>
            本机自动存档。切换游戏页面仍会搜刮；关闭浏览器不会离线推关。
          </DialogDescription>
          <p>应急补给：黑金弹不足 5 发时可领 80 发，限 3 次，冷却 3 分钟。</p>
          <button
            disabled={
              !owns ||
              d.bestStage < 1 ||
              d.ammo >= 5 ||
              d.emergency.used >= 3 ||
              now < d.emergency.nextAt
            }
            onClick={() =>
              campaign.update((x) => {
                emergencySupply(x);
              })
            }
          >
            领取应急补给（剩余 {3 - d.emergency.used} 次
            {now < d.emergency.nextAt
              ? `，${Math.ceil((d.emergency.nextAt - now) / 1000)} 秒`
              : ''}
            ）
          </button>
          <button
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true);
                return;
              }
              if (owns) {
                campaign.reset();
                setEpoch((e) => e + 1);
                setSettings(false);
                setConfirmReset(false);
                location.hash = 'merged';
              }
            }}
          >
            {confirmReset ? '确认清空当前进度，重新开始' : '重置本机存档'}
          </button>
          <small>新循环使用独立存档，旧版演示存档保留。</small>
        </DialogContent>
      </Dialog>
    </div>
  );
}

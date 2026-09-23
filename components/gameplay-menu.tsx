'use client';
import { useEffect, useState } from 'react';
import StrongGuide from './strong-guide';
import { PrologueStory, PrologueTask } from './prologue';
import { pendingStory } from '@/lib/prologue';
import { Settings, Ticket } from 'lucide-react';
import CoreEnergy from './core-energy';
import { BALANCE } from '@/lib/balance';
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
import { campaign, emergencySupply, KEY } from '@/lib/campaign';
import { ticketBalance } from '@/lib/recruit';
import './gameplay-menu.css';
import './loop.css';
import './phone-ui.css';
import './bright-ui.css';
import './hunt-production.css';
import './gm-tools.css';
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
    [energyOpen, setEnergyOpen] = useState(false),
    [confirmReset, setConfirmReset] = useState(false),
    [gmConfirm, setGmConfirm] = useState(false),
    [gmError, setGmError] = useState(''),
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
  const storyOpen =
    loaded &&
    owns &&
    !!pendingStory(d) &&
    !settings &&
    !missionOpen &&
    !energyOpen &&
    !gmConfirm;
  const resetCurrentSave = () => {
    if (!campaign.reset()) {
      setGmError('存档正在其他标签页使用，请先在此继续游戏。');
      return;
    }
    setEpoch((e) => e + 1);
    setVisited(false);
    setBattle(null);
    setSettings(false);
    setEnergyOpen(false);
    setMissionOpen(false);
    setConfirmReset(false);
    setGmConfirm(false);
    setGmError('');
    setDismissed('');
    setMode('merged');
    location.hash = 'merged';
  };
  const locked =
    (mode === 'hunt' && d.bestStage < 1) ||
    (mode === 'city' && !d.city.unlocked);
  const hint =
    d.bestStage === 0
      ? '电台：前方发现弹药箱。先完成第一关，补给就能送往猎场。'
      : d.hunt.expedition.points < BALANCE.corePerTicket
        ? '电台：把黑金弹装进猎场武器。收集核心能提升全队等级，还能换取招募券。'
        : d.recruit.spent === 0
          ? '电台：援军信号已经接通。前往英雄招募，试着呼叫一位新伙伴。'
          : d.city.unlocked && !d.city.factory.level
            ? '电台：从空地开始，依次建造指挥部、回收站和黑金弹工厂。'
            : '';
  return (
    <>
      <aside
        className={`gm-tools ${gmConfirm ? 'gm-confirm' : ''}`}
        aria-label="GM调试工具"
        data-gm-tools
      >
        <div>
          <strong>GM · 调试</strong>
          <small>
            {loaded && KEY.includes('preview')
              ? '序章体验存档'
              : '当前游戏存档'}
          </small>
        </div>
        {gmConfirm ? (
          <>
            <p>清除当前进度，从序章重新开始？</p>
            <div className="gm-actions">
              <button
                className="gm-danger"
                disabled={!loaded || !owns}
                onClick={resetCurrentSave}
              >
                确认清除
              </button>
              <button
                onClick={() => {
                  setGmConfirm(false);
                  setGmError('');
                }}
              >
                取消
              </button>
            </div>
          </>
        ) : (
          <button
            className="gm-danger"
            disabled={!loaded || !owns}
            onClick={() => {
              setSettings(false);
              setMissionOpen(false);
              setEnergyOpen(false);
              setGmConfirm(true);
            }}
          >
            清除存档
          </button>
        )}
        {gmError && <p role="alert">{gmError}</p>}
      </aside>
      <div className="mori-gameplay-shell" data-gameplay={mode}>
        {loaded && <PrologueTask data={d} />}
        <PrologueStory data={d} open={storyOpen} />
        <StrongGuide
          data={d}
          mode={mode}
          active={
            loaded &&
            owns &&
            !storyOpen &&
            !settings &&
            !missionOpen &&
            !energyOpen &&
            !gmConfirm
          }
        />
        <div className="global-resources">
          <div className="squad-growth">
            <div className="level-medallion">
              <small>小队</small>
              <b>{d.hunt.level}</b>
            </div>
            <CoreEnergy
              level={d.hunt.level}
              xp={d.hunt.xp}
              points={d.hunt.expedition.points}
              onOpenChange={setEnergyOpen}
            />
            <button
              className="settings-button"
              aria-label="游戏设置"
              onClick={() => setSettings(true)}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
        <div className="mori-gameplay-content">
          {loaded && (
            <div
              key={epoch}
              className={`mori-gameplay-layer battle-layer ${mode === 'merged' ? 'is-active' : 'is-mini'}`}
            >
              <MergedPanel
                active={owns && !storyOpen && !gmConfirm}
                onStatus={setBattle}
              />
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
                  active={
                    owns &&
                    !storyOpen &&
                    !settings &&
                    !missionOpen &&
                    !energyOpen &&
                    !gmConfirm
                  }
                />
              )}
            </div>
          )}
          {mode === 'recruit' && (
            <div className="mori-gameplay-layer is-active secondary-layer">
              <RecruitPanel active={owns && !storyOpen && !gmConfirm} />
            </div>
          )}
          {mode === 'city' && !locked && (
            <div className="mori-gameplay-layer is-active secondary-layer">
              <CityPanel active={owns && !storyOpen && !gmConfirm} />
            </div>
          )}
          {locked && (
            <div className="loop-locked">
              <h2>{mode === 'hunt' ? '禁区猎场' : '曙光营地'}</h2>
              <p>
                {mode === 'hunt'
                  ? '完成搜刮第 1 关，拿到第一批黑金弹后开放。'
                  : '完成搜刮第 2 关，领取建材并开始建造营地。'}
              </p>
              <button onClick={() => (location.hash = 'merged')}>
                返回搜刮
              </button>
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
          <button
            className="loop-notice"
            onClick={() => setDismissed(d.notice)}
          >
            {d.notice}
            <span>×</span>
          </button>
        )}
        <nav className="mori-gameplay-menu" aria-label="玩法切换">
          {MODES.map((m) => (
            <Button
              key={m.id}
              data-guide={`nav-${m.id}`}
              aria-label={
                m.id === 'recruit'
                  ? `英雄，抽卡券 ${ticketBalance(d)} 张`
                  : m.label
              }
              aria-current={mode === m.id ? 'page' : undefined}
              className={mode === m.id ? 'selected' : ''}
              onClick={() => {
                location.hash = m.id;
              }}
            >
              {m.id === 'recruit' && (
                <span
                  className="hero-ticket-bubble"
                  title={`当前抽卡券 ${ticketBalance(d)} 张`}
                >
                  <Ticket size={15} />
                  {ticketBalance(d)}
                </span>
              )}
              <span className={`nav-emblem ${m.id}`}>
                <img src={`/assets/ui-bright/nav-${m.id}.png`} alt="" />
              </span>
              <span>
                {m.id === 'merged'
                  ? '搜刮'
                  : m.id === 'hunt'
                    ? '猎场'
                    : m.label}
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
              再获得{' '}
              {BALANCE.corePerTicket -
                (d.hunt.expedition.points % BALANCE.corePerTicket)}{' '}
              能量核心，抽卡券 +1。
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
            <a href="?prologue=preview#merged">
              体验《夺回营地》序章（独立体验存档）
            </a>
            <button
              onClick={() => {
                setSettings(false);
                setMissionOpen(true);
              }}
            >
              查看当前目标
            </button>
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
                  resetCurrentSave();
                }
              }}
            >
              {confirmReset ? '确认清空当前进度，重新开始' : '重置本机存档'}
            </button>
            <small>新循环使用独立存档，旧版演示存档保留。</small>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

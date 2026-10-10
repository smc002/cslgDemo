'use client';
import './courier-reward.css';
import './weapon-pickup.css';
import { useEffect, useRef, useState } from 'react';
import { campaign, saveHunt } from '@/lib/campaign';
import { HuntGame, ROOMS, ARENA } from './simulation';
import { HuntView } from './view';
import { DeathAudio } from './death-audio';
import { RECRUIT_HEROES } from '@/lib/recruit';
import HeroPortrait from '@/shared/HeroPortrait';
import { ChevronsRight } from 'lucide-react';
import { AMMO_CARRIER, carrierQueued } from '@/lib/ammo-carrier';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export default function HuntPanel({
  active,
  zombieScale = 1,
  arrivalReviewAge,
  onRecruit,
}: {
  active: boolean;
  zombieScale?: number;
  arrivalReviewAge?: number;
  onRecruit?: () => void;
}) {
  const scaleRef = useRef(zombieScale);
  const deathAudio = useRef<DeathAudio | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null),
    sim = useRef<HuntGame | null>(null),
    renderer = useRef<HuntView | null>(null),
    activeRef = useRef(active);
  const [state, setState] = useState<ReturnType<HuntGame['snapshot']> | null>(
      null,
    ),
    [error, setError] = useState(''),
    [ready, setReady] = useState(false),
    [auto, setAuto] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const autoRef = useRef(false);
  useEffect(() => {
    if (renderer.current) {
      renderer.current.arrivalReviewAge = arrivalReviewAge;
      renderer.current.draw();
    }
  }, [arrivalReviewAge]);
  useEffect(() => {
    campaign.init();
    const sound = new DeathAudio();
    deathAudio.current = sound;
    let disposed = false,
      pending = 0;
    const initial = campaign.read();
    const g = new HuntGame(
      {
        ammo: () => Math.max(0, campaign.read().ammo - pending),
        spend: (n) => {
          if (!campaign.owns() || campaign.read().ammo - pending < n)
            return false;
          pending += n;
          return true;
        },
        save: (h) => {
          if (
            campaign.read().bestStage < initial.bestStage ||
            campaign.read().revision < initial.revision
          )
            return;
          let committed = false;
          const cost = pending;
          const accepted = campaign.update((d) => {
            if (d.ammo >= cost && saveHunt(d, h)) {
              d.ammo -= cost;
              committed = true;
            }
          });
          pending = 0;
          if (!accepted || !committed) {
            g.active = false;
            g.release();
          }
        },
        ownsHero: (id) => campaign.read().recruit.owned[id] > 0,
      },
      campaign.read().hunt,
    );
    sim.current = g;
    g.zombieScale = scaleRef.current;
    const v = new HuntView(canvas.current!, g, () => {
      if (disposed) return;
      if (g.save.courier.reveal?.tickets && !g.courierVictory)
        g.dismissCourierReward(true);
      if (
        autoRef.current &&
        g.active &&
        !g.firing &&
        !g.paused &&
        !g.courierBlocksCombat &&
        !document.hidden
      )
        g.press(g.aim.x, g.aim.y);
      if (autoRef.current && g.dry) {
        autoRef.current = false;
        setAuto(false);
        g.release();
      }
      setState(g.snapshot());
      sound.update(g);
    });
    renderer.current = v;
    v.arrivalReviewAge = arrivalReviewAge;
    g.active = activeRef.current;
    if (g.active) g.beginFirstEntry();
    v.init()
      .then(() => {
        if (!disposed) {
          setReady(true);
          setState(g.snapshot());
        }
      })
      .catch(() => setError('猎场资源加载失败，请刷新重试'));
    const hide = () => {
      if (document.hidden) {
        g.release();
        g.persist();
      }
    };
    window.addEventListener('pagehide', hide);
    document.addEventListener('visibilitychange', hide);
    return () => {
      disposed = true;
      g.release();
      g.persist();
      v.dispose();
      sound.dispose();
      if (deathAudio.current === sound) deathAudio.current = null;
      window.removeEventListener('pagehide', hide);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  useEffect(() => {
    if (sim.current) sim.current.zombieScale = zombieScale;
    renderer.current?.draw();
  }, [zombieScale]);
  useEffect(() => {
    activeRef.current = active;
    const g = sim.current,
      v = renderer.current;
    if (g) {
      if (active) g.restoreSave(campaign.read().hunt);
      g.setActive(active);
      if (active) g.beginFirstEntry();
      if (active && ready) v?.start();
      else v?.stop();
    }
    if (!active) {
      setAuto(false);
      autoRef.current = false;
    }
  }, [active, ready]);
  useEffect(() => {
    if (sim.current) sim.current.paused = rewardOpen;
  }, [rewardOpen]);
  const g = sim.current;
  const aim = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = renderer.current?.point(e.clientX, e.clientY);
    if (p && g) {
      g.aim = p;
      if (!g.firing) g.press(p.x, p.y);
    }
  };
  const reward = state?.courier.reveal ?? state?.courier.lastReward;
  const dismissReward = () => {
    setRewardOpen(false);
    if (!g) return;
    g.skipCourierVictory();
    g.dismissCourierReward();
    setState(g.snapshot());
  };
  const carrier = state?.ammoCarrier;
  const carrierRoom = state?.room ?? 1;
  const carrierProgress = carrier
    ? carrier.rooms[carrierRoom].spent % (AMMO_CARRIER.shots * carrierRoom)
    : 0;
  return (
    <section className="loop-page hunt-page">
      <div className="hunt-arena">
        <canvas
          ref={canvas}
          data-guide="hunt-fire"
          data-ready={ready && active}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && ready && active) {
              deathAudio.current?.unlock();
              e.preventDefault();
              g?.press(ARENA.gunX, 220);
              g?.release(true);
            }
          }}
          aria-label="点击射击，按住连射，拖动瞄准"
          onPointerDown={(e) => {
            if (!ready || !active || e.button !== 0) return;
            deathAudio.current?.unlock();
            e.currentTarget.setPointerCapture(e.pointerId);
            aim(e);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) aim(e);
          }}
          onPointerUp={() => {
            if (!autoRef.current) g?.release(true);
          }}
          onPointerCancel={() => g?.release()}
        />
        {!ready && <div className="loop-cover">{error || '猎场准备中…'}</div>}
        <span className="hunt-hint">
          {state?.arrivalAge !== null && state?.arrivalAge !== undefined
            ? '装甲车驶入 · 准备就位'
            : carrier?.active
              ? `返弹 ${carrier.active.refundAmount} · 还需 ${AMMO_CARRIER.hits - carrier.active.hits.length} 次命中 · 数额已固定`
              : state?.bonus
                ? '奖励时间 · 免费弹强化射击'
                : carrier && carrierQueued(carrier, carrierRoom) > 0
                  ? `返弹补给待入场 · ${carrierQueued(carrier, carrierRoom)} 次`
                  : `返弹补给 ${carrierProgress}/${AMMO_CARRIER.shots * carrierRoom} · 按住连射`}
        </span>
        {reward && !state?.courierVictory && (
          <button
            className="hunt-reward-reminder"
            onClick={() => setRewardOpen(true)}
          >
            {reward.tickets
              ? `运钞奖励 · 抽奖券 +${reward.tickets} 已到账`
              : '运钞奖励已入库'}{' '}
            <b>查看 ›</b>
          </button>
        )}
      </div>
      <div className="hunt-scene-label">
        <span>SECTOR 01</span>
        <b>禁区猎场</b>
      </div>
      {state?.bonus && (
        <div className="hunt-bonus-badge">
          奖励时间 <b>{Math.ceil(state.bonus.left)}s</b> · 免费弹{' '}
          {state.bonus.ammo}
        </div>
      )}
      <div className="hunt-console">
        <div className="hunt-actions">
          <div className="ammo-count" data-hunt-ammo-inventory>
            <img src="/assets/loop/black-gold-ammo.png" alt="黑金弹" />
            <strong>{state?.ammo ?? campaign.read().ammo}</strong>
            <span>黑金弹</span>
          </div>
          <button
            className={`gold fire-button ${auto ? 'is-firing' : ''}`}
            disabled={
              !ready ||
              !active ||
              state?.arrivalAge != null ||
              (!auto &&
                (state?.ammo ?? 0) < (state?.room ?? 1) &&
                !state?.bonus &&
                !state?.weapons.active)
            }
            aria-pressed={auto}
            aria-label={`自动开火，${auto ? '已开启，点击关闭' : '未开启，点击开启'}`}
            onClick={() => {
              autoRef.current = !auto;
              if (!auto) deathAudio.current?.unlock();
              setAuto(!auto);
              if (auto) g?.release();
              else g?.press(ARENA.gunX, 220);
            }}
          >
            <span>自动开火</span>
            <small>
              {auto
                ? '已开启'
                : (state?.ammo ?? 0) < (state?.room ?? 1) &&
                    !state?.bonus &&
                    !state?.weapons.active
                  ? '弹药不足'
                  : '未开启'}
            </small>
          </button>
        </div>
        <div className="hunt-multipliers">
          {ROOMS.map((r) => (
            <button
              key={r.m}
              disabled={!ready || !active || campaign.read().ammo < r.need}
              className={state?.room === r.m ? 'selected' : ''}
              onClick={() => {
                g?.selectRoom(r.m);
                setState(g!.snapshot());
              }}
            >
              ×{r.m}
              <small>{r.m} 弹/枪</small>
            </button>
          ))}
        </div>
      </div>
      {state?.weapons.laser || state?.weapons.shotgun || state?.sceneReady ? (
        <div className="hunt-tools">
          {(['laser', 'shotgun'] as const).map(
            (k) =>
              !!state?.weapons[k] && (
                <button
                  key={`${k}-${state.weapons.stored?.[k]?.eventId}`}
                  className={`weapon-ready-card ${k} ${state.weaponPickup?.kind === k ? 'just-acquired' : ''}`}
                  disabled={!!state.weapons.active || !ready || !active}
                  aria-label={`${k === 'laser' ? '激光枪' : '散弹枪'}已获得，点击启用，20秒免费射击`}
                  onClick={() => {
                    if (g?.activateWeapon(k)) setState(g.snapshot());
                  }}
                >
                  <span className="weapon-ready-kicker" role="status">
                    {state.weaponPickup?.kind === k
                      ? '特殊武器已获得！'
                      : '特殊武器待启用'}
                  </span>
                  <span className="weapon-ready-body">
                    {/* oxlint-disable-next-line next/no-img-element -- Shared transparent combat sprite. */}
                    <img
                      src={`/assets/hunt/combat-v2/${k === 'laser' ? 'cyan' : 'amber'}-coil.png`}
                      alt=""
                    />
                    <span>
                      <strong>{k === 'laser' ? '激光枪' : '散弹枪'}</strong>
                      <small>20 秒免费射击</small>
                    </span>
                  </span>
                  <b className="weapon-ready-action">
                    {state.weapons.active ? '当前武器结束后启用' : '点击启用 ›'}
                  </b>
                </button>
              ),
          )}
          {state?.sceneReady && (
            <button onClick={() => g?.startTransition()}>
              <ChevronsRight />
              前往下一区域
            </button>
          )}
        </div>
      ) : null}
      <Dialog
        open={rewardOpen && !!reward && !state?.courierVictory}
        onOpenChange={(open) => {
          if (!open) {
            dismissReward();
          }
        }}
      >
        <DialogContent className="loop-dialog courier-jackpot-dialog">
          <div className="courier-jackpot-heading">
            {/* oxlint-disable-next-line next/no-img-element -- Local transparent VFX sprite, no image optimization needed. */}
            <img
              className="courier-jackpot-plaque"
              src="/assets/hunt/combat-v2/jackpot-plaque.png"
              alt=""
              aria-hidden="true"
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden';
              }}
            />
            <span className="courier-jackpot-kicker">运钞僵尸击破</span>
            <DialogTitle>大奖到手！</DialogTitle>
          </div>
          <DialogDescription>
            {reward?.tickets
              ? '抽奖券已到账，每 10 张可进行一次十连抽。'
              : '此前获得的橙色英雄已加入队伍，继承全队等级。重复英雄用于升星。'}
          </DialogDescription>
          <div className="loop-rewards">
            {reward?.tickets ? (
              <div className="courier-ticket-reward">
                <div className="courier-ticket-fan" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    // oxlint-disable-next-line next/no-img-element -- Local transparent VFX sprite, no image optimization needed.
                    <img
                      key={i}
                      src="/assets/hunt/combat-v2/ticket.png"
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                  ))}
                </div>
                <span className="courier-ticket-label">招募抽奖券</span>
                <b>×{reward.tickets.toLocaleString('zh-CN')}</b>
                <span>
                  {reward.tickets >= 10
                    ? `可进行 ${Math.floor(reward.tickets / 10)} 次十连抽`
                    : '集齐 10 张开启十连抽'}
                </span>
              </div>
            ) : (
              (reward?.heroes ?? (reward?.hero ? [reward.hero] : [])).map(
                (id, i) => {
                  const h = RECRUIT_HEROES.find((h) => h.id === id)!;
                  return (
                    <div key={i}>
                      <HeroPortrait hero={h.index} height={100} />
                      <b>{h.name}</b>
                    </div>
                  );
                },
              )
            )}
          </div>
          <div className="courier-jackpot-actions">
            <button
              className="gold"
              onClick={() => {
                dismissReward();
                if (onRecruit) onRecruit();
                else window.location.hash = 'recruit';
              }}
            >
              去抽奖
            </button>
            <button onClick={dismissReward}>稍后再去</button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

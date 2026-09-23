'use client';
import { useEffect, useRef, useState } from 'react';
import { campaign, saveHunt } from '@/lib/campaign';
import { HuntGame, ROOMS, ARENA } from './simulation';
import { HuntView } from './view';
import { RECRUIT_HEROES } from '@/lib/recruit';
import HeroPortrait from '@/shared/HeroPortrait';
import { Crosshair, ChevronsRight } from 'lucide-react';
import { AMMO_CARRIER, carrierQueued } from '@/lib/ammo-carrier';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export default function HuntPanel({ active }: { active: boolean }) {
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
  const autoRef = useRef(false);
  useEffect(() => {
    campaign.init();
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
    const v = new HuntView(canvas.current!, g, () => {
      if (disposed) return;
      if (
        autoRef.current &&
        g.active &&
        !g.firing &&
        !g.paused &&
        !g.save.courier.reveal &&
        !document.hidden
      )
        g.press(g.aim.x, g.aim.y);
      if (autoRef.current && g.dry) {
        autoRef.current = false;
        setAuto(false);
        g.release();
      }
      setState(g.snapshot());
    });
    renderer.current = v;
    g.active = activeRef.current;
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
      window.removeEventListener('pagehide', hide);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  useEffect(() => {
    activeRef.current = active;
    const g = sim.current,
      v = renderer.current;
    if (g) {
      if (active) g.restoreSave(campaign.read().hunt);
      g.setActive(active);
      if (active && ready) v?.start();
      else v?.stop();
    }
    if (!active) {
      setAuto(false);
      autoRef.current = false;
    }
  }, [active, ready]);
  const g = sim.current;
  const aim = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = renderer.current?.point(e.clientX, e.clientY);
    if (p && g) {
      g.aim = p;
      if (!g.firing) g.press(p.x, p.y);
    }
  };
  const reward = state?.courier.reveal;
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
              e.preventDefault();
              g?.press(ARENA.gunX, 220);
              g?.release(true);
            }
          }}
          aria-label="点击射击，按住连射，拖动瞄准"
          onPointerDown={(e) => {
            if (!ready || !active || e.button !== 0) return;
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
          {carrier?.active
            ? `返弹 ${carrier.active.refundAmount} · 还需 ${AMMO_CARRIER.hits - carrier.active.hits.length} 次命中 · 数额已固定`
            : state?.bonus
              ? '奖励时间 · 免费弹强化射击'
              : carrier && carrierQueued(carrier, carrierRoom) > 0
                ? `返弹补给待入场 · ${carrierQueued(carrier, carrierRoom)} 次`
                : `返弹补给 ${carrierProgress}/${AMMO_CARRIER.shots * carrierRoom} · 按住连射`}
        </span>
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
              (!auto &&
                (state?.ammo ?? 0) < (state?.room ?? 1) &&
                !state?.bonus &&
                !state?.weapons.active)
            }
            aria-pressed={auto}
            aria-label={`自动开火，${auto ? '已开启，点击关闭' : '未开启，点击开启'}`}
            onClick={() => {
              autoRef.current = !auto;
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
                <button key={k} onClick={() => g?.activateWeapon(k)}>
                  <Crosshair />
                  {k === 'laser' ? '激光枪' : '散弹枪'}
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
        open={!!reward}
        onOpenChange={(open) => {
          if (!open) {
            g?.skipCourierVictory();
            g?.dismissCourierReward();
            setState(g!.snapshot());
          }
        }}
      >
        <DialogContent className="loop-dialog">
          <DialogTitle>运钞僵尸击破！</DialogTitle>
          <DialogDescription>
            橙色英雄已加入队伍，继承全队等级。重复英雄用于升星。
          </DialogDescription>
          <div className="loop-rewards">
            {(reward?.heroes ?? (reward ? [reward.hero] : [])).map((id, i) => {
              const h = RECRUIT_HEROES.find((h) => h.id === id)!;
              return (
                <div key={i}>
                  <HeroPortrait hero={h.index} height={100} />
                  <b>{h.name}</b>
                </div>
              );
            })}
          </div>
          <button
            className="gold"
            onClick={() => {
              g?.skipCourierVictory();
              g?.dismissCourierReward();
              setState(g!.snapshot());
            }}
          >
            收下援军
          </button>
        </DialogContent>
      </Dialog>
    </section>
  );
}

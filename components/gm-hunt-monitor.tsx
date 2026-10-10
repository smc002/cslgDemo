'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
import {
  ECONOMY,
  EVENT_BUDGET,
  EVENT_WEIGHTS,
  FUNCTIONAL,
  auditEconomy,
} from '@/lib/hunt-economy';
import { AMMO_CARRIER, carrierQueued } from '@/lib/ammo-carrier';
import { COURIER_RULES, type HuntSave } from '@/lib/hunt-save';
import { ZOMBIE_NAMES } from '@/shared/toy-art';
import {
  SPECIAL_POPULATION,
  specialPopulation,
  specialSpawnBlock,
} from '@/lib/hunt-population';

const points = (value: number) =>
  (value / ECONOMY.unit).toLocaleString('zh-CN', { maximumFractionDigits: 3 });

export default function GmHuntMonitor({
  hunt,
  disabled,
}: {
  hunt: HuntSave;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const e = hunt.economy;
  const ledger = auditEconomy(e);
  const room = hunt.weapons.active?.room ?? hunt.bonus?.room ?? hunt.room;
  const nextCost =
    e.nextKind === null ? 0 : EVENT_BUDGET[e.nextKind] * room * ECONOMY.unit;
  const actors = e.runtime?.zombies ?? [];
  const population = specialPopulation(actors);
  const candidateBlock =
    e.nextKind === null ? null : specialSpawnBlock(actors, e.nextKind);
  const capacityLabel = (block: ReturnType<typeof specialSpawnBlock>) =>
    block === 'kind'
      ? '同类功能怪已满'
      : block === 'total'
        ? '特殊总数已满'
        : block === 'ratio'
          ? '特殊占比已满，等待普通补位'
          : '';
  const carrier = hunt.ammoCarrier;
  const carrierTarget = AMMO_CARRIER.shots * hunt.room;
  const courier = hunt.courier;
  const fundedPerAmmo =
    ECONOMY.ordinaryYield * ECONOMY.rewardCoefficient +
    ECONOMY.shotCorePerAmmo * ECONOMY.unit;
  const specialPerAmmo = fundedPerAmmo - ECONOMY.ammoReturnPerSpent;
  const weightTotal = FUNCTIONAL.reduce(
    (sum, kind) => sum + EVENT_WEIGHTS[kind],
    0,
  );
  return (
    <div className="gm-hunt-monitor">
      <button disabled={disabled} onClick={() => setOpen(true)}>
        猎场奖励监控
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gm-rewards-dialog">
          <DialogTitle>GM · 猎场奖励监控</DialogTitle>
          <DialogDescription>
            实时读取当前存档；猎场运行时约 0.4
            秒更新。积分为奖励预算，不是黑金弹库存。
          </DialogDescription>
          <div className="gm-ledger">
            <span>
              可用奖励积分<b>{points(e.available)}</b>
            </span>
            <span>
              已预留积分<b>{points(ledger.reserved)}</b>
            </span>
            <span>
              已发放积分<b>{points(e.paid)}</b>
            </span>
            <span>
              累计消耗黑金弹<b>{e.spentAmmo.toLocaleString()}</b>
            </span>
            <span>
              返弹专用预算<b>{points(ledger.ammoReturnFunding)}</b>
            </span>
            <span>
              账本差额（应为 0）<b>{points(ledger.difference)}</b>
            </span>
            <span>
              实发特殊核心 / 消耗弹
              <b>{e.spentAmmo > 0 ? points(e.paid / e.spentAmmo) : '—'}</b>
            </span>
            <span>
              特殊在场 / 当前准入上限
              <b>
                {population.special} / {population.capacity}
              </b>
            </span>
            <span>
              特殊占比（含边缘入场）
              <b>{(population.ratio * 100).toFixed(1)}%</b>
            </span>
          </div>
          <div className="gm-schedule">
            <p>
              下一候选：
              <b>
                {e.nextKind === null ? '等待抽取' : ZOMBIE_NAMES[e.nextKind]}
              </b>{' '}
              · 当前 ×{room}
            </p>
            <p>
              {e.nextKind === null
                ? '下次检查时选择符合条件的特殊僵尸。'
                : `需要 ${points(nextCost)} 积分 · ${e.available >= nextCost ? '预算充足，等待刷新检查' : `还差 ${points(nextCost - e.available)} 积分`}`}
            </p>
            {candidateBlock && (
              <p>{capacityLabel(candidateBlock)}；候选及预算保留。</p>
            )}
            <p>
              新增特殊目标准入：占全场不超过 {SPECIAL_POPULATION.maxShare * 100}
              %、 总数不超过 {SPECIAL_POPULATION.maxSpecial}、同类功能怪最多{' '}
              {SPECIAL_POPULATION.maxPerFunctional} 只；运钞与黑金也计入总数。
              普通怪连续死亡可短暂越过占比，普通补位后收敛。
            </p>
            {population.overLimit && (
              <p>
                当前超出准入阈值，暂停新增特殊目标；既有奖励保留，补充普通怪并等待击杀或自然离场。
              </p>
            )}
            <p>
              下次检查 {Math.max(0, e.checkLeft).toFixed(1)} 秒 · 检查间隔{' '}
              {ECONOMY.checkSeconds} 秒 · 奖励积累系数 ×
              {ECONOMY.rewardCoefficient}
            </p>
            <p>
              每消耗 1 发黑金弹，另有 {ECONOMY.shotCorePerAmmo}
              点能源核心转入特殊僵尸奖励池；开火不再直接获得核心。
            </p>
            <p>
              每消耗 1 弹的理论预算：{points(ECONOMY.ordinaryYield)} ×{' '}
              {ECONOMY.rewardCoefficient} + {ECONOMY.shotCorePerAmmo} ={' '}
              {points(fundedPerAmmo)}，其中特殊核心池 {points(specialPerAmmo)}，
              返弹专用 {points(ECONOMY.ammoReturnPerSpent)}
              。消耗弹首个物理命中为 特殊、运钞或黑金目标时，再将{' '}
              {points(ECONOMY.ordinaryYield)} 普通基准收益补入特殊池。
            </p>
            <p>
              普通击杀核心独立按怪物积分结算；{points(ECONOMY.ordinaryYield)}
              是预算基准，不是每发保底收益。理论预算不等于实际返奖率，
              实发特殊核心只统计已兑现的事件收益，未使用技能及在场事件仍属预留。
            </p>
            <p>
              筹备期间低价穿插 {e.nextInterludes ?? 0}/{ECONOMY.maxInterludes}{' '}
              次 （单次预算不超过 {ECONOMY.interludeMaxBudget} ×
              倍率）；用完后优先 攒足下一候选，避免散弹或大奖一直等不到。
            </p>
          </div>
          <div className="gm-table-scroll">
            <table>
              <caption>特殊僵尸统计（当前存档累计）</caption>
              <thead>
                <tr>
                  <th>类型</th>
                  <th>出现</th>
                  <th>在场</th>
                  <th>已发积分</th>
                  <th>权重 / 配置占比</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {FUNCTIONAL.map((kind) => {
                  const stats = e.metrics[kind];
                  const owners = Object.values(e.events).filter(
                    (event) => event.kind === kind,
                  );
                  const locked =
                    (kind === 8 && hunt.expedition.stage < 1) ||
                    (kind === 7 && hunt.expedition.stage < 2);
                  const weaponBusy =
                    (kind === 10 || kind === 11) &&
                    (!!hunt.weapons.laser ||
                      !!hunt.weapons.shotgun ||
                      !!hunt.weapons.active ||
                      Object.values(e.events).some(
                        (event) => event.kind === 10 || event.kind === 11,
                      ));
                  const state = locked
                    ? '区域未解锁'
                    : owners.some((event) => event.state === 'active')
                      ? '奖励生效中'
                      : owners.some((event) => event.state === 'stored')
                        ? '技能待使用'
                        : actors.some((actor) => actor.kind === kind)
                          ? '已在场'
                          : weaponBusy
                            ? '武器槽占用'
                            : kind === e.nextKind
                              ? '下一候选'
                              : '可抽取';
                  return (
                    <tr key={kind}>
                      <th>{ZOMBIE_NAMES[kind]}</th>
                      <td>{stats?.spawned ?? 0}</td>
                      <td>
                        {actors.filter((actor) => actor.kind === kind).length}
                      </td>
                      <td>{points(stats?.paid ?? 0)}</td>
                      <td>
                        {EVENT_WEIGHTS[kind]} /{' '}
                        {((EVENT_WEIGHTS[kind] / weightTotal) * 100).toFixed(1)}
                        %
                      </td>
                      <td>
                        {state}
                        {specialSpawnBlock(actors, kind) &&
                          ` · ${capacityLabel(specialSpawnBlock(actors, kind))}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p>
              配置占比按全部解锁且武器槽为空计算；实际出现受预算、候选筹备、
              关卡解锁和武器占用影响，不是每次检查的出怪概率。
            </p>
          </div>
          <div className="gm-schedule">
            <p>
              <b>黑金僵尸</b> · ×{hunt.room} 进度{' '}
              {carrier.rooms[hunt.room].spent % carrierTarget}/{carrierTarget} ·
              排队 {carrierQueued(carrier, hunt.room)} · 累计出现{' '}
              {carrier.serial}
            </p>
            <p>
              每消耗 {AMMO_CARRIER.shots} × 倍率弹药可排队一只，击败返还{' '}
              {AMMO_CARRIER.refund} × 倍率弹药（
              {(AMMO_CARRIER.refund / AMMO_CARRIER.shots) * 100}
              %）；返弹与核心积分分开记账。
            </p>
            <p>
              {carrier.active
                ? `在场 · ×${carrier.active.room} · 剩余 ${AMMO_CARRIER.hits - carrier.active.hits.length} 次命中`
                : '待满足进度及出场条件'}
            </p>
            <p>
              <b>运钞僵尸</b> · 进度 {courier.progress}/
              {COURIER_RULES.threshold} · 排队 {courier.queued} · 已击败{' '}
              {courier.completed}
            </p>
            <p>
              每累计 {COURIER_RULES.threshold} 弹排队一份运钞奖励，击败获得{' '}
              {COURIER_RULES.ticketsPerBundle} 张招募券；另有{' '}
              {COURIER_RULES.plates * COURIER_RULES.platePoints}
              核心的拆甲奖励，不占特殊核心池。多份合并时奖励等额累加。
            </p>
            <p>
              {courier.reveal
                ? '奖励弹窗待处理'
                : courier.active
                  ? '已在场'
                  : courier.cooldown > 0
                    ? `冷却 ${courier.cooldown.toFixed(1)} 秒`
                    : '等待进度达标 / 当前特殊事件结束'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

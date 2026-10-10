'use client';
import { useState } from 'react';
import { Check, Ticket } from 'lucide-react';
import { coreRewardProgress, type CoreAward } from '@/lib/core-rewards';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function CoreEnergy({
  level,
  xp,
  points,
  award,
  awardId,
  awardArrived,
  onOpenChange,
}: {
  level: number;
  xp: number;
  points: number;
  award?: CoreAward;
  awardId?: number;
  awardArrived?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const changeOpen = (value: boolean) => {
    setOpen(value);
    onOpenChange(value);
  };
  const shown = award ?? { level, xp, points };
  const progress = coreRewardProgress(shown.level, shown.xp, shown.points);
  const nodes = [...progress.checkpoints];
  // Higher levels sample three nodes; reveal the exact earned milestone while it plays.
  if (award && !nodes.some((node) => node.threshold === award.threshold))
    nodes.push({
      threshold: award.threshold,
      xp: award.xp,
      ratio: award.xp / progress.cap,
      reached: true,
    });
  return (
    <>
      <div className="squad-meter core-energy">
        <div className="core-energy-heading">
          <b>能量核心</b>
          <span>
            {shown.xp}/{progress.cap}
          </span>
        </div>
        <div className="core-energy-track">
          <progress
            aria-label="能量核心升级进度"
            max={progress.cap}
            value={shown.xp}
          />
          {nodes.map((node) => (
            <button
              key={`${node.threshold}-${award?.threshold === node.threshold ? awardId : ''}`}
              type="button"
              className={`core-ticket-node ${node.reached ? 'is-reached' : ''} ${award?.threshold === node.threshold ? `is-awarding ${awardArrived ? 'is-award-arrived' : ''}` : ''}`}
              data-core-award={
                award?.threshold === node.threshold ? 'active' : undefined
              }
              style={{ left: `${node.ratio * 100}%` }}
              title={`本级 ${node.xp} 核心 · 抽卡券 +1${node.reached ? ' · 已到账' : ''}`}
              aria-label={`本级 ${node.xp} 核心奖励，抽卡券1张，${node.reached ? '已到账' : '未到达'}；查看阶段奖励`}
              onClick={() => changeOpen(true)}
            >
              {node.reached &&
              (award?.threshold !== node.threshold || awardArrived) ? (
                <Check size={20} strokeWidth={3} />
              ) : (
                <Ticket size={17} />
              )}
              <span className="core-node-threshold">{node.xp}</span>
            </button>
          ))}
        </div>
        <span className="sr-only">
          再获 {progress.remaining} 核心 <Ticket size={12} /> +1
        </span>
      </div>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="loop-dialog">
          <DialogTitle>能量核心 · 阶段奖励</DialogTitle>
          <DialogDescription>
            每收集 {progress.step} 核心，自动获得 1
            张抽卡券。能量条上的票券标记展示本级阶段节点；途中的每份奖励也会自动到账。
          </DialogDescription>
          <div className="core-reward-list">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <span>再获 {progress.remaining + i * progress.step} 核心</span>
                <strong>
                  <Ticket size={18} /> 抽卡券 +1
                </strong>
              </div>
            ))}
          </div>
          <p>核心充满后全队升至 Lv.{level + 1}，溢出核心继续累计。</p>
          <button className="gold" onClick={() => changeOpen(false)}>
            知道了
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}

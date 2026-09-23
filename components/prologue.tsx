'use client';
import { campaign, type Campaign } from '@/lib/campaign';
import { pendingStory, prologueGoal } from '@/lib/prologue';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import './prologue.css';

export function PrologueTask({ data }: { data: Campaign }) {
  if (!data.prologue.enabled || data.prologue.seen.includes('ending'))
    return null;
  const goal = prologueGoal(data);
  return (
    <button
      className="prologue-task"
      onClick={() => {
        location.hash = goal.mode;
      }}
    >
      <small>
        夺回营地 ·{' '}
        {data.bestStage < 2 ? '集结' : data.bestStage < 4 ? '补给' : '三路反攻'}
      </small>
      <span>{goal.text}</span>
      <b aria-hidden="true">›</b>
    </button>
  );
}
export function PrologueStory({
  data,
  open,
}: {
  data: Campaign;
  open: boolean;
}) {
  const story = pendingStory(data);
  if (!story) return null;
  const finish = () => {
    campaign.update((d) => {
      if (!d.prologue.seen.includes(story.id)) d.prologue.seen.push(story.id);
    });
    location.hash = story.mode;
  };
  return (
    <Dialog
      modal="trap-focus"
      disablePointerDismissal
      open={open}
      onOpenChange={(v) => {
        if (!v) finish();
      }}
    >
      <DialogContent className="prologue-story">
        <img
          className="prologue-scene"
          src={`/assets/prologue-v1/gate-${story.id === 'ending' ? 'restored' : 'damaged'}.png`}
          alt=""
        />
        <div className="prologue-story-title">
          <small>曙光营地 · 序章</small>
          <DialogTitle>{story.title}</DialogTitle>
        </div>
        {['ammo', 'factory'].includes(story.id) && (
          <div
            className={`prologue-prop ${story.id === 'factory' ? 'toolbox' : ''}`}
            aria-hidden="true"
          />
        )}
        <img
          className={`prologue-character ${story.id === 'boss' ? 'is-boss' : ''}`}
          src={`/assets/prologue-v1/${story.art}.png`}
          alt={story.id === 'boss' ? '破门王' : '维修员阿栓'}
        />
        <div className="prologue-dialogue">
          <strong>{story.speaker}</strong>
          <DialogDescription>{story.text}</DialogDescription>
          <button onClick={finish}>{story.action} →</button>
          <small>关闭或按 Esc 可跳过本段，任务与奖励仍保留</small>
        </div>
      </DialogContent>
    </Dialog>
  );
}

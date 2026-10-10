/* eslint-disable next/no-img-element -- Share exact game sprite sources across story and combat. */
'use client';
import { campaign, type Campaign } from '@/lib/campaign';
import {
  pendingStory,
  prologueTaskNotice,
  storyIdentity,
  storyScene,
  type Story,
} from '@/lib/prologue';
import { TOY_ROOT, ZOMBIE_ART } from '@/shared/toy-art';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import './prologue.css';

export function PrologueTask({
  data,
  attention = false,
  disabled = false,
  onActivate,
}: {
  data: Campaign;
  attention?: boolean;
  disabled?: boolean;
  onActivate: () => void;
}) {
  const task = prologueTaskNotice(data);
  if (!task) return null;
  return (
    <button
      className={`prologue-task${attention ? ' has-update' : ''}`}
      disabled={disabled}
      data-task-pending={attention || undefined}
      aria-label={`${task.text}，${task.storyId ? '点击继续剧情' : '点击前往任务'}`}
      onClick={onActivate}
    >
      <small>
        夺回营地 ·{' '}
        {data.bestStage < 2 ? '集结' : data.bestStage < 4 ? '补给' : '三路反攻'}
        {attention && <em>{task.storyId ? '待续通讯' : '继续任务'}</em>}
      </small>
      <span>{task.text}</span>
      <b aria-hidden="true">›</b>
    </button>
  );
}
export function PrologueStory({
  data,
  open,
  onComplete,
}: {
  data: Campaign;
  open: boolean;
  onComplete?: () => void;
}) {
  const story = pendingStory(data);
  if (!story) return null;
  const finish = () => {
    onComplete?.();
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
        <StoryContent story={story} onContinue={finish} />
      </DialogContent>
    </Dialog>
  );
}

/** Shared by the live dialogue and the read-only chapter review. */
export function StoryContent({
  story,
  onContinue,
  inDialog = true,
}: {
  story: Story;
  onContinue: () => void;
  inDialog?: boolean;
}) {
  const actor = storyIdentity(story);
  const Title = inDialog ? DialogTitle : 'h2';
  const Description = inDialog ? DialogDescription : 'p';
  return (
    <>
      <img className="prologue-scene" src={storyScene(story)} alt="" />
      <div className="prologue-story-title">
        <small>曙光营地 · 序章</small>
        <Title>{story.title}</Title>
      </div>
      <div className="prologue-stage">
        <img
          className="prologue-character"
          src={actor.portrait}
          alt={actor.name}
          data-hero={story.hero}
        />
        {['ammo', 'factory'].includes(story.id) && (
          <img
            className="prologue-prop"
            src={
              TOY_ROOT +
              (story.id === 'ammo'
                ? 'story-ammo-crate.png'
                : 'story-toolbox.png')
            }
            alt=""
          />
        )}
        {story.id === 'boss' && (
          <figure className="prologue-threat">
            <img
              src={TOY_ROOT + ZOMBIE_ART[3] + '.png'}
              alt="破门王：巨型僵尸"
            />
            <figcaption>敌情 · 破门王</figcaption>
          </figure>
        )}
      </div>
      <div className="prologue-dialogue">
        <strong>
          {actor.name}
          <span className="prologue-speaker-role">{actor.role}</span>
        </strong>
        <Description>{story.text}</Description>
        <button onClick={onContinue}>{story.action} →</button>
        <small>
          {inDialog
            ? '关闭或按 Esc 可跳过本段，任务与奖励仍保留'
            : '剧情预览 · 不写入游戏进度'}
        </small>
      </div>
    </>
  );
}

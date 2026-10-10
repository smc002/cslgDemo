import { HERO_ART, heroImage, TOY_ROOT } from '../shared/toy-art';
import type { Campaign } from './campaign';
import { ticketBalance } from './recruit';
import { nextCitySite, cityMeta } from './city';

export type PrologueState = {
  enabled: boolean;
  seen: string[];
  rewards: string[];
};
export const freshPrologue = (): PrologueState => ({
  enabled: true,
  seen: [],
  rewards: [],
});
export function parsePrologue(value: unknown): PrologueState {
  const v = value as Partial<PrologueState> | null;
  const list = (x: unknown) =>
    Array.isArray(x)
      ? [
          ...new Set(
            x.filter(
              (s): s is string => typeof s === 'string' && s.length < 60,
            ),
          ),
        ].slice(0, 64)
      : [];
  return {
    enabled: v?.enabled === true,
    seen: list(v?.seen),
    rewards: list(v?.rewards),
  };
}
export function rewardOnce(d: Campaign, id: string, give: () => void) {
  if (!d.prologue.enabled || d.prologue.rewards.includes(id)) return false;
  d.prologue.rewards.push(id);
  give();
  return true;
}
export function storyRecruit(d: Campaign): string[] | null {
  if (
    !d.prologue.enabled ||
    d.prologue.rewards.includes('recruit') ||
    ticketBalance(d) < 1
  )
    return null;
  rewardOnce(d, 'recruit', () => {
    d.recruit.spent++;
    d.recruit.owned.samurai++;
    d.recruit.last = ['samurai'];
  });
  d.notice = '定向联络成功：T-100加入！新伙伴继承全队等级。';
  return ['samurai'];
}
export type Story = {
  id: string;
  title: string;
  hero: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  role: string;
  text: string;

  action: string;
  mode: string;
  ready: (d: Campaign) => boolean;
};
/** One identity source for story speaker, portrait, recruitment and combat. */
export const storyIdentity = (story: Story) => ({
  name: HERO_ART[story.hero][1],
  portrait: heroImage(story.hero),
  role: story.role,
});
export const storyScene = (story: Story) =>
  TOY_ROOT + `story-gate-${story.id === 'ending' ? 'restored' : 'damaged'}.png`;
export const STORIES: Story[] = [
  {
    id: 'arrival',
    title: '先把伙伴带回家',
    hero: 2,
    role: '先遣队 · 能量火力',
    text: '队长，我是贾伟思。失散的伙伴还在城里，这座营地能成为我们的落脚点。胖雷开路，仟手照应伤员，我用臂炮掩护。先清理门口，把那箱弹药拿回来！',
    action: '带领先遣队出发',
    mode: 'merged',
    ready: () => true,
  },
  {
    id: 'ammo',
    title: '第一箱弹药到手',
    hero: 2,
    role: '先遣队 · 补给通讯',
    text: '120 发黑金弹，到手！我接通了猎场的车载炮台。队长，用这批弹药清理外围僵尸，回收 200 能源核心，就能让全队升级，并拿到 1 张招募券。我们去找失散的伙伴。',
    action: '去猎场回收核心',
    mode: 'hunt',
    ready: (d) => d.bestStage >= 1,
  },
  {
    id: 'signal',
    title: '接到了 T-100 的信号',
    hero: 2,
    role: '先遣队 · 无线电联络',
    text: '收到 T-100 的回应了，他正守在左侧街口。这次用 1 张招募券就能定向联络他；之后电台会继续搜索其他伙伴。把他接回来，我们就能一起打开通往营地的路。',
    action: '联络 T-100',
    mode: 'recruit',
    ready: (d) => d.hunt.expedition.points >= 200,
  },
  {
    id: 'city',
    title: '六个人，一座新营地',
    hero: 3,
    role: '增援队 · 前线守卫',
    text: '两路都已清理。我找到了大白和梨，他们也会加入队伍。之后根据每路敌人的冰火属性灵活调整分路。营地还有 200 建材：先免费搭起指挥部，再依次建回收站和弹药工厂，让补给接上。',
    action: '建设我们的营地',
    mode: 'city',
    ready: (d) => d.bestStage >= 2,
  },
  {
    id: 'factory',
    title: '补给线重新运转',
    hero: 2,
    role: '先遣队 · 补给通讯',
    text: '工厂启动了，修复后找出的 150 发备用弹已经入库。以后记得回来领取产出的弹药。接下来清理第 3、4 关，打通右路；琴、陆尼艾和霜华正在那边等我们。',
    action: '沿街寻找伙伴',
    mode: 'merged',
    ready: (d) => d.city.factory.level > 0,
  },
  {
    id: 'three',
    title: '九位伙伴，终于到齐',
    hero: 7,
    role: '增援队 · 战地支援',
    text: '琴和霜华都平安，我们赶上了。右路交给我们：琴守在前排压住火线，我照应队友，霜华用冰棱穿透敌群。队长，每路都留好承伤、治疗和输出的位置，先清完的一路就去支援。',
    action: '整备三路小队',
    mode: 'merged',
    ready: (d) => d.bestStage >= 4,
  },
  {
    id: 'elite',
    title: '一个伙伴也没落下',
    hero: 1,
    role: '先遣队 · 战地治疗',
    text: '这场硬仗打赢了，大家先让我检查一下伤势。额外的 150 发黑金弹和 200 建材已经收好。队长，我们再去猎场回收核心、补强队伍，别让下一次出发成为冒险。',
    action: '为下一战补强',
    mode: 'hunt',
    ready: (d) => d.bestStage >= 5,
  },
  {
    id: 'training',
    title: '前排还能再稳一点',
    hero: 0,
    role: '先遣队 · 前排承伤',
    text: '前面交给我！这把锤子还得陪大家走更远。我的首次升星材料已经备齐，到“英雄 → 查看培养”选中胖雷就能升星。以后重复获得的英雄也能用于培养，全队仍共享等级。',
    action: '为胖雷升星',
    mode: 'recruit',
    ready: (d) => d.bestStage >= 6,
  },
  {
    id: 'boss',
    title: '守住门，迎战破门王',
    hero: 2,
    role: '先遣队 · 敌情通讯',
    text: '门外那个巨型僵尸就是破门王！它会举拳蓄力，随后重砸前方。队长，让承伤队员顶住中路；两侧清完后立刻支援。打退它，我们才能安心修好营地大门。',
    action: '整备最后一战',
    mode: 'merged',
    ready: (d) => d.bestStage >= 9,
  },
  {
    id: 'ending',
    title: '今晚，我们有家了',
    hero: 2,
    role: '曙光小队 · 营地通讯',
    text: '门修好了，灯也亮了。胖雷在守门，仟手和大白安顿伤员，其他伙伴也都回来了。队长，今晚九个人能坐在一起吃饭了。明天再去找补给，现在先看看我们亲手建起的营地吧。',
    action: '回营地看看大家',
    mode: 'city',
    ready: (d) => d.bestStage >= 10,
  },
];
export const pendingStory = (d: Campaign) =>
  d.prologue.enabled
    ? STORIES.find((s) => !d.prologue.seen.includes(s.id) && s.ready(d))
    : undefined;
/** Explicitly opening one chapter never opens the following chapter automatically. */
/** Only the hunt defers communications until the player opens the task bar. */
export function shouldShowPrologueStory(
  d: Campaign,
  mode: string,
  requestedId?: string,
) {
  const story = pendingStory(d);
  return !!story && (mode !== 'hunt' || story.id === requestedId);
}
export function battleGate(d: Campaign): string {
  if (!d.prologue.enabled || d.bestStage >= 10) return '';
  if (pendingStory(d)) return '先听完营地通讯';
  if (d.bestStage === 1 && !d.prologue.rewards.includes('recruit'))
    return '前往猎场收集 200 核心，再用 1 张券联络 T-100';
  if (d.bestStage === 2 && !d.city.factory.level)
    return '前往内城，依次建造指挥部、回收站和黑金弹工厂';
  return '';
}
export function prologueGoal(d: Campaign) {
  if (d.bestStage === 0)
    return {
      id: 'first-stage',
      text: '胖雷在前，仟手与贾伟思在后 · 开始搜刮',
      mode: 'merged',
    };
  if (d.bestStage === 1 && d.hunt.expedition.points < 200)
    return {
      id: 'collect-cores',
      text: `瞄准僵尸开火 · 核心 ${d.hunt.expedition.points}/200`,
      mode: 'hunt',
    };
  if (!d.prologue.rewards.includes('recruit') && d.bestStage <= 1)
    return {
      id: 'first-recruit',
      text: '消耗 1 张券 · 定向联络 T-100',
      mode: 'recruit',
    };
  if (d.bestStage === 1)
    return {
      id: 'element-deployment',
      text: '第 2 关 · 看冰火敌情，调整左右分路后出发',
      mode: 'merged',
    };
  if (d.bestStage >= 2 && !d.city.factory.level)
    return {
      id: `build-${nextCitySite(d) ?? 'factory'}`,
      text: `内城建造${cityMeta(nextCitySite(d) ?? 'factory').name} · 工厂建成送 150 发`,
      mode: 'city',
    };
  if (d.bestStage < 4)
    return {
      id: `stage-${d.bestStage + 1}`,
      text: `清理第 ${d.bestStage + 1} 关 · 第 4 关后开放三路`,
      mode: 'merged',
    };
  if (
    d.bestStage >= 6 &&
    (d.growth.shield?.stars ?? 1) === 1 &&
    !d.growth.shield?.used
  )
    return {
      id: 'first-promotion',
      text: '英雄 → 查看培养 → 胖雷 · 完成首次升星',
      mode: 'recruit',
    };
  return {
    id: d.bestStage >= 10 ? 'camp-restored' : `stage-${d.bestStage + 1}`,
    text:
      d.bestStage >= 10
        ? '营地夺回来了 · 继续搜刮、猎场与建设'
        : `三路协同 · 推进第 ${d.bestStage + 1} 关，夺回营地`,
    mode: d.bestStage >= 10 ? 'city' : 'merged',
  };
}

/** A stable task identity: per-shot progress changes text, not the unread marker. */
export function prologueTaskNotice(d: Campaign) {
  if (!d.prologue.enabled || d.prologue.seen.includes('ending')) return;
  const story = pendingStory(d);
  if (story)
    return {
      key: `story-${story.id}`,
      mode: story.mode,
      text: `营地通讯 · ${story.title}`,
      storyId: story.id,
    };
  const goal = prologueGoal(d);
  return {
    key: `goal-${goal.id}`,
    mode: goal.mode,
    text: goal.text,
    storyId: undefined,
  };
}

/** Pending work stays visible in every mode, but never authorizes a modal. */
export function prologueTaskAttention(
  d: Campaign,
  mode: string,
  acknowledged = '',
) {
  const task = prologueTaskNotice(d);
  return (
    !!task &&
    (!!task.storyId || task.key !== acknowledged || task.mode !== mode)
  );
}

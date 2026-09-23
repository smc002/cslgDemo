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
  d.notice = '定向联络成功：大刀战士加入！新伙伴继承全队等级。';
  return ['samurai'];
}
export type Story = {
  id: string;
  title: string;
  speaker: string;
  text: string;
  art: string;
  action: string;
  mode: string;
  ready: (d: Campaign) => boolean;
};
export const STORIES: Story[] = [
  {
    id: 'arrival',
    title: '夺回营地',
    speaker: '阿栓 · 营地维修员',
    text: '队长！营地门还撑得住——大概。先把门口这群家伙赶走，弹药箱就在后面！铁壁队长顶前排，医护和输出跟上。',
    art: 'ashuan-worried',
    action: '出发，清理门口',
    mode: 'merged',
    ready: () => true,
  },
  {
    id: 'ammo',
    title: '第一箱弹药到手',
    speaker: '阿栓',
    text: '120 发黑金弹，够开张了！去猎场瞄准游荡者开火，回收 200 核心。全队一起升级，还能领一张招募券。',
    art: 'ashuan-confident',
    action: '去猎场开火',
    mode: 'hunt',
    ready: (d) => d.bestStage >= 1,
  },
  {
    id: 'signal',
    title: '呼叫援军',
    speaker: '阿栓',
    text: '信号通了！这次已联系到大刀战士，用刚拿到的 1 张券请他加入。后续招募才是普通随机信号。',
    art: 'ashuan-confident',
    action: '去定向联络',
    mode: 'recruit',
    ready: (d) => d.hunt.expedition.points >= 200,
  },
  {
    id: 'city',
    title: '第二路，出发！',
    speaker: '阿栓',
    text: '老队员继续守中路，援军去左路。营地现在只剩空地。先免费搭起指挥部，再用 200 建材依次建回收站和弹药工厂。我还留了 150 发备用弹，工厂建好就搬出来！',
    art: 'ashuan-happy',
    action: '去营地建造',
    mode: 'city',
    ready: (d) => d.bestStage >= 2,
  },
  {
    id: 'factory',
    title: '补给开工',
    speaker: '阿栓',
    text: '工厂转起来了！修复补给 150 发已入库，之后还会持续生产。去猎场补强，再清理第 3、4 关，把右路也打开。',
    art: 'ashuan-confident',
    action: '返回搜刮',
    mode: 'merged',
    ready: (d) => d.city.factory.level > 0,
  },
  {
    id: 'three',
    title: '三路一起上',
    speaker: '阿栓',
    text: '右路打通，九人小队到齐！每路都带上坦克、治疗和输出。哪一路先清完，就能支援另一边。下一关先试试这套配合！',
    art: 'ashuan-happy',
    action: '检查三路阵容',
    mode: 'merged',
    ready: (d) => d.bestStage >= 4,
  },
  {
    id: 'elite',
    title: '第一场硬仗打赢了',
    speaker: '阿栓',
    text: '干得漂亮！额外 150 发黑金弹和 200 建材已入库。继续猎场、搜刮和建设，准备把营地门彻底夺回来。',
    art: 'ashuan-happy',
    action: '补强小队',
    mode: 'hunt',
    ready: (d) => d.bestStage >= 5,
  },
  {
    id: 'training',
    title: '老队员也能变强',
    speaker: '阿栓',
    text: '铁壁队长的首次升星材料已备齐。到英雄的“查看培养”里选铁壁队长升星；重复英雄能用来培养，队伍等级仍然全队共享。',
    art: 'ashuan-confident',
    action: '去培养铁壁队长',
    mode: 'recruit',
    ready: (d) => d.bestStage >= 6,
  },
  {
    id: 'boss',
    title: '破门王来了',
    speaker: '阿栓',
    text: '那个顶着路锥的大块头就是破门王！它会举起护栏，再向前方砸下。让坦克站在前面，先清两侧，再集中支援中路！',
    art: 'boss/portrait',
    action: '准备最后一战',
    mode: 'merged',
    ready: (d) => d.bestStage >= 9,
  },
  {
    id: 'ending',
    title: '营地夺回来了！',
    speaker: '阿栓',
    text: '门修好了，灯也亮了。今晚大家有地方吃饭了——锅是谁带的？队长，明天还得出门找补给，今天先看看我们的营地吧。',
    art: 'ashuan-happy',
    action: '回营地看看',
    mode: 'city',
    ready: (d) => d.bestStage >= 10,
  },
];
export const pendingStory = (d: Campaign) =>
  d.prologue.enabled
    ? STORIES.find((s) => !d.prologue.seen.includes(s.id) && s.ready(d))
    : undefined;
export function battleGate(d: Campaign): string {
  if (!d.prologue.enabled || d.bestStage >= 10) return '';
  if (pendingStory(d)) return '先听完营地通讯';
  if (d.bestStage === 1 && !d.prologue.rewards.includes('recruit'))
    return '前往猎场收集 200 核心，再用 1 张券联络大刀战士';
  if (d.bestStage === 2 && !d.city.factory.level)
    return '前往内城，依次建造指挥部、回收站和黑金弹工厂';
  return '';
}
export function prologueGoal(d: Campaign) {
  if (d.bestStage === 0)
    return { text: '铁壁队长在前，医护和输出在后 · 开始搜刮', mode: 'merged' };
  if (d.bestStage === 1 && d.hunt.expedition.points < 200)
    return {
      text: `瞄准游荡者开火 · 核心 ${d.hunt.expedition.points}/200`,
      mode: 'hunt',
    };
  if (!d.prologue.rewards.includes('recruit') && d.bestStage <= 1)
    return { text: '消耗 1 张券 · 定向联络大刀战士', mode: 'recruit' };
  if (d.bestStage >= 2 && !d.city.factory.level)
    return {
      text: `内城建造${cityMeta(nextCitySite(d) ?? 'factory').name} · 工厂建成送 150 发`,
      mode: 'city',
    };
  if (d.bestStage < 4)
    return {
      text: `清理第 ${d.bestStage + 1} 关 · 第 4 关后开放三路`,
      mode: 'merged',
    };
  if (
    d.bestStage >= 6 &&
    (d.growth.shield?.stars ?? 1) === 1 &&
    !d.growth.shield?.used
  )
    return {
      text: '英雄 → 查看培养 → 铁壁队长 · 完成首次升星',
      mode: 'recruit',
    };
  return {
    text:
      d.bestStage >= 10
        ? '营地夺回来了 · 继续搜刮、猎场与建设'
        : `三路协同 · 推进第 ${d.bestStage + 1} 关，夺回营地`,
    mode: d.bestStage >= 10 ? 'city' : 'merged',
  };
}

'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Hammer, Package, ArrowUp, X, Check, Clock3 } from 'lucide-react';
import { campaign, production, collectCity, buildCity } from '@/lib/campaign';
import './city-scene.css';

type Kind = 'workshop' | 'factory';
const BUILDINGS: Record<
  Kind,
  { name: string; resource: string; amount: number; stages: string[] }
> = {
  workshop: {
    name: '建材工坊',
    resource: '建材',
    amount: 10,
    stages: [
      '待建地基',
      '木棚工坊',
      '扩建工坊',
      '砖石工坊',
      '加固锯木厂',
      '重型建材厂',
    ],
  },
  factory: {
    name: '黑金弹工厂',
    resource: '黑金弹',
    amount: 15,
    stages: [
      '待建地基',
      '弹药作坊',
      '砖石弹药厂',
      '机械弹药厂',
      '加固生产线',
      '重型军械厂',
    ],
  },
};
const VISUAL_LEVELS = [0, 1, 2, 3, 5, 8];
const visualStage = (level: number) =>
  VISUAL_LEVELS.reduce((index, min, i) => (level >= min ? i : index), 0);
const art = (kind: Kind, level: number) =>
  `/assets/city-scene/${kind}-${visualStage(level)}.png`;

export default function CityPanel({ active }: { active: boolean }) {
  const d = useSyncExternalStore(
      campaign.subscribe,
      campaign.read,
      campaign.read,
    ),
    [now, setNow] = useState(Date.now()),
    [selected, setSelected] = useState<Kind | null>(null),
    [feedback, setFeedback] = useState(''),
    [buildingFlash, setBuildingFlash] = useState<Kind | null>(null);
  const buttons = useRef<Partial<Record<Kind, HTMLButtonElement | null>>>({});
  const close = () => {
    const last = selected;
    setSelected(null);
    if (last) buttons.current[last]?.focus();
  };
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(''), 2500);
    return () => clearTimeout(timer);
  }, [feedback]);
  useEffect(() => {
    if (!buildingFlash) return;
    const timer = setTimeout(() => setBuildingFlash(null), 1100);
    return () => clearTimeout(timer);
  }, [buildingFlash]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(null);
        if (selected) buttons.current[selected]?.focus();
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [selected]);
  const info = selected ? BUILDINGS[selected] : null,
    building = selected ? d.city[selected] : null,
    output = selected ? production(d, selected, now) : null,
    nextAppearance = building
      ? VISUAL_LEVELS.find((level) => level > building.level)
      : undefined;
  return (
    <section
      className="loop-page city-page city-scene-page"
      aria-label="曙光营地"
    >
      <div className="city-world" onClick={() => setSelected(null)}>
        <img
          className="city-terrain"
          src="/assets/city-scene/camp-ground.png"
          alt="阳光下的幸存者营地，石板路连接工坊、工厂和指挥部"
          draggable={false}
        />
        <div className="city-world-shade" />
      </div>
      <header className="city-scene-heading">
        <div>
          <small>DAWN OUTPOST</small>
          <h1>曙光营地</h1>
        </div>
        <span aria-label={`建材 ${d.city.materials}`}>
          <Package size={18} />
          <b>{d.city.materials}</b>
          <small>建材</small>
        </span>
      </header>
      <span className="city-hq-label">营地指挥部</span>
      {(['workshop', 'factory'] as Kind[]).map((kind) => {
        const b = d.city[kind],
          p = production(d, kind, now),
          meta = BUILDINGS[kind],
          stage = visualStage(b.level);
        return (
          <button
            key={kind}
            ref={(el) => {
              buttons.current[kind] = el;
            }}
            className={`city-building ${kind} ${selected === kind ? 'is-selected' : ''} ${p.amount ? 'is-ready' : ''} ${buildingFlash === kind ? 'is-building' : ''}`}
            aria-label={`${meta.name} ${b.level ? `等级 ${b.level}` : '待建造'}${p.amount ? `，可领取 ${p.amount} ${meta.resource}` : ''}`}
            aria-expanded={selected === kind}
            aria-controls="city-building-details"
            onClick={() => setSelected(selected === kind ? null : kind)}
          >
            <span className="city-building-glow" />
            <img
              className="city-building-sprite"
              src={art(kind, b.level)}
              alt={meta.stages[stage]}
              draggable={false}
            />
            <span className="city-building-caption">
              <b>{meta.name}</b>
              <small>{b.level ? `Lv.${b.level}` : '待建造'}</small>
            </span>
            <span
              className={`city-production-bubble ${p.amount ? 'can-collect' : ''}`}
            >
              {p.amount ? (
                <>
                  <Package size={14} />
                  <b>+{p.amount}</b>
                </>
              ) : b.level ? (
                <>
                  <Clock3 size={13} />
                  {p.next}s
                </>
              ) : (
                <>
                  <Hammer size={14} />
                  建造
                </>
              )}
            </span>
          </button>
        );
      })}
      {!selected && (
        <p className="city-scene-tip">点击高亮建筑 · 领取物资与扩建</p>
      )}
      <div className="city-feedback" role="status" aria-live="polite">
        {feedback && (
          <span>
            <Check size={16} />
            {feedback}
          </span>
        )}
      </div>
      {selected && info && building && output && (
        <aside
          id="city-building-details"
          className="city-inspector"
          aria-label={`${info.name}操作面板`}
        >
          <button
            className="city-inspector-close"
            onClick={close}
            aria-label="关闭建筑面板"
          >
            <X size={20} />
          </button>
          <div className="city-inspector-title">
            <img src={art(selected, building.level)} alt="" />
            <div>
              <h2>
                {info.name}{' '}
                <small>
                  {building.level ? `Lv.${building.level}` : '待建造'}
                </small>
              </h2>
              <p>
                {info.stages[visualStage(building.level)]} ·{' '}
                {building.level
                  ? `每 ${output.period / 1000} 秒产出 ${building.level * info.amount} ${info.resource}`
                  : '修复生产线，开始供应黑金弹'}
              </p>
            </div>
          </div>
          <div className="city-stock">
            <span>
              可领取 <b>{output.amount}</b> {info.resource}
            </span>
            <small>
              {building.level
                ? output.cycles >= 20
                  ? '仓库已满'
                  : `下批 ${output.next} 秒`
                : '建成后自动生产'}
            </small>
          </div>
          {building.level > 0 && (
            <progress
              aria-label="建筑库存进度"
              max={20}
              value={output.cycles}
            />
          )}
          <div className="city-building-actions">
            <button
              className="city-collect"
              disabled={!active || !output.amount}
              onClick={() => {
                let collected = false;
                campaign.update((x) => {
                  collected = collectCity(x, selected);
                });
                if (collected) {
                  setNow(Date.now());
                  setFeedback(`获得 ${output.amount} ${info.resource}`);
                }
              }}
            >
              <Package size={18} />
              领取{output.amount ? ` ${output.amount}` : ''}
            </button>
            <button
              className="city-upgrade"
              disabled={
                !active ||
                building.level >= 10 ||
                d.city.materials < 100 * (building.level + 1)
              }
              onClick={() => {
                let built = false;
                campaign.update((x) => {
                  built = buildCity(x, selected);
                });
                if (built) {
                  setNow(Date.now());
                  setBuildingFlash(selected);
                  setFeedback(
                    `${info.name} ${building.level ? '升级' : '建造'}完成`,
                  );
                }
              }}
            >
              <ArrowUp size={18} />
              <span>
                {building.level >= 10
                  ? '已满级'
                  : `${building.level ? '升级' : '建造'} · ${100 * (building.level + 1)} 建材`}
              </span>
            </button>
          </div>
          <footer>
            {building.level >= 10
              ? '已完成全部扩建'
              : d.city.materials < 100 * (building.level + 1)
                ? `还需 ${100 * (building.level + 1) - d.city.materials} 建材，可从工坊领取`
                : `${nextAppearance === building.level + 1 ? '本次升级解锁新外观' : nextAppearance ? `Lv.${nextAppearance} 解锁下一阶段外观` : '提升生产效率'}`}
            <small>离线生产 · 最多储存 20 批</small>
          </footer>
        </aside>
      )}
    </section>
  );
}

'use client';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import {
  Package,
  ArrowUp,
  X,
  Check,
  Clock3,
  ChevronRight,
  LockKeyhole,
} from 'lucide-react';
import { campaign, production, collectCity, buildCity } from '@/lib/campaign';
import {
  CITY_BUILDINGS,
  CITY_STAGES,
  CITY_MAX_LEVEL,
  cityMeta,
  cityBuilding,
  cityArt,
  cityStage,
  cityEffect,
  cityUpgradeBlock,
  cityCost,
  cityCapacity,
  type CityKind,
} from '@/lib/city';
import { positionCityPopover } from './popover-position';
import './city-scene.css';

export default function CityPanel({ active }: { active: boolean }) {
  const d = useSyncExternalStore(
    campaign.subscribe,
    campaign.read,
    campaign.read,
  );
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState<CityKind | null>(null);
  const [feedback, setFeedback] = useState('');
  const [flash, setFlash] = useState<CityKind | null>(null);
  const [position, setPosition] = useState<ReturnType<
    typeof positionCityPopover
  > | null>(null);
  const viewport = useRef<HTMLElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const inspector = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const buttons = useRef<Partial<Record<CityKind, HTMLButtonElement | null>>>(
    {},
  );
  const close = () => {
    setSelected(null);
    if (selected) buttons.current[selected]?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(''), 2600);
    return () => clearTimeout(timer);
  }, [feedback]);
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 850);
    return () => clearTimeout(timer);
  }, [flash]);
  useEffect(() => {
    if (!selected) return;
    closeButton.current?.focus({ preventScroll: true });
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelected(null);
      buttons.current[selected]?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [selected]);
  useLayoutEffect(() => {
    if (!selected) {
      setPosition(null);
      return;
    }
    const root = viewport.current,
      anchor = buttons.current[selected],
      panel = inspector.current;
    if (!root || !anchor || !panel) return;
    const update = () => {
      const bounds = root.getBoundingClientRect(),
        a = anchor.getBoundingClientRect();
      if (a.bottom < bounds.top || a.top > bounds.bottom) {
        setSelected(null);
        return;
      }
      setPosition(
        positionCityPopover(
          {
            left: a.left - bounds.left,
            top: a.top - bounds.top,
            width: a.width,
            height: a.height,
          },
          {
            width: Math.min(280, bounds.width - 16),
            height: panel.offsetHeight,
          },
          { width: bounds.width, height: bounds.height },
        ),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    observer.observe(panel);
    const scroller = scroll.current;
    scroller?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      scroller?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [selected]);
  const meta = selected ? cityMeta(selected) : null;
  const b = selected ? cityBuilding(d, selected) : null;
  const output =
    selected === 'workshop' || selected === 'factory'
      ? production(d, selected, now)
      : null;
  const resource = selected === 'workshop' ? '建材' : '黑金弹';
  const block = selected ? cityUpgradeBlock(d, selected) : '';
  const collect = () => {
    if (!active || (selected !== 'workshop' && selected !== 'factory')) return;
    const amount = production(campaign.read(), selected).amount;
    let success = false;
    campaign.update((x) => {
      success = collectCity(x, selected);
    });
    if (success) {
      setNow(Date.now());
      setFeedback(`获得 ${amount} ${resource}`);
    }
  };
  const upgrade = () => {
    if (!active || !selected) return;
    let success = false;
    campaign.update((x) => {
      success = buildCity(x, selected);
    });
    if (success) {
      setNow(Date.now());
      setFlash(selected);
      setFeedback(
        `${cityMeta(selected).name} · Lv.${cityBuilding(campaign.read(), selected).level}`,
      );
    }
  };
  return (
    <section
      ref={viewport}
      className="loop-page city-page city-scene-page"
      aria-label="曙光基地"
    >
      <div
        ref={scroll}
        className="city-scroll"
        onClick={() => setSelected(null)}
      >
        <div className="city-map">
          <img
            className="city-terrain"
            src="/assets/city-v08/terrain.png"
            alt="废墟中重建的武装基地，旧城墙、废车与路障围绕军工设施"
            draggable={false}
          />
          {CITY_BUILDINGS.map((item) => {
            const building = cityBuilding(d, item.id);
            const p =
              item.id === 'workshop' || item.id === 'factory'
                ? production(d, item.id, now)
                : null;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  buttons.current[item.id] = el;
                }}
                className={`city-building ${selected === item.id ? 'is-selected' : ''} ${flash === item.id ? 'is-building' : ''} ${!building.level ? 'is-dormant' : ''}`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  width: `${item.width}%`,
                  height: `${item.height}%`,
                  zIndex: Math.round(item.y),
                }}
                aria-label={`${item.name}，${!item.live ? '规划设施' : building.level ? `等级 ${building.level}` : '待修复'}`}
                aria-expanded={selected === item.id}
                aria-controls={
                  selected === item.id ? 'city-building-details' : undefined
                }
                onClick={(event) => {
                  event.stopPropagation();
                  setSelected(selected === item.id ? null : item.id);
                  setPosition(null);
                }}
              >
                <img
                  className="city-building-sprite"
                  src={cityArt(item.id, building.level)}
                  alt=""
                  draggable={false}
                />
                <span className="city-building-caption">
                  <b>{item.name}</b>
                  {item.live && (
                    <small>
                      {building.level ? `Lv.${building.level}` : '修复'}
                    </small>
                  )}
                </span>
                {!!p?.amount && (
                  <span className="city-production-bubble">
                    <Package size={12} />
                    {p.amount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <header className="city-scene-heading">
        <div>
          <small>DAWN STRONGHOLD</small>
          <h1>曙光基地</h1>
        </div>
        <span>
          <Package size={16} />
          <b>{d.city.materials}</b>
          <small>建材</small>
        </span>
      </header>
      {!selected && <p className="city-scene-tip">点击建筑 · 查看与扩建</p>}
      <div className="city-feedback" role="status" aria-live="polite">
        {feedback && (
          <span>
            <Check size={16} />
            {feedback}
          </span>
        )}
      </div>
      {selected && meta && b && (
        <aside
          ref={inspector}
          id="city-building-details"
          className="city-inspector"
          role="dialog"
          aria-modal="false"
          aria-labelledby="city-building-title"
          data-side={position?.side ?? 'top'}
          style={
            {
              left: position?.left ?? 8,
              top: position?.top ?? 8,
              width: position?.width ?? 280,
              maxHeight: position?.maxHeight,
              visibility: position ? 'visible' : 'hidden',
              '--arrow': `${position?.arrow ?? 40}px`,
            } as CSSProperties
          }
        >
          <i className="city-inspector-arrow" aria-hidden="true" />
          <div className="city-inspector-content">
            <button
              ref={closeButton}
              className="city-inspector-close"
              onClick={close}
              aria-label="关闭建筑信息"
            >
              <X size={18} />
            </button>
            <div className="city-inspector-title">
              <img src={cityArt(selected, b.level)} alt="" />
              <div>
                <h2 id="city-building-title">
                  {meta.name}
                  <small>
                    {meta.live
                      ? b.level
                        ? `Lv.${b.level}`
                        : '待修复'
                      : '规划设施'}
                  </small>
                </h2>
                <p>{meta.role}</p>
              </div>
            </div>
            {meta.live ? (
              <>
                <p className="city-effect">
                  {b.level
                    ? cityEffect(d, selected)
                    : `修复后：${cityEffect(d, selected, true)}`}
                </p>
                {output && (
                  <div className="city-stock">
                    <span>
                      <Package size={14} />
                      库存 <b>{output.amount}</b>
                    </span>
                    <small>
                      {!b.level ? (
                        '修复后开始生产'
                      ) : output.cycles >= cityCapacity(d) ? (
                        '库存已满'
                      ) : (
                        <>
                          <Clock3 size={12} />
                          {output.next}s · {output.cycles}/{cityCapacity(d)} 批
                        </>
                      )}
                    </small>
                  </div>
                )}
                {b.level > 0 && b.level < CITY_MAX_LEVEL && (
                  <p className="city-next">
                    <ChevronRight size={14} />
                    下级：{cityEffect(d, selected, true)}
                  </p>
                )}
                <div className="city-building-actions">
                  {output && (
                    <button
                      className="city-collect"
                      disabled={!active || !output.amount}
                      onClick={collect}
                    >
                      领取
                    </button>
                  )}
                  <button
                    className="city-upgrade"
                    disabled={!active || !!block}
                    onClick={upgrade}
                  >
                    <ArrowUp size={16} />
                    {b.level >= CITY_MAX_LEVEL
                      ? '已满级'
                      : `${b.level ? '升级' : '修复'} · ${cityCost(d, selected)} 建材`}
                  </button>
                </div>
                <p className="city-requirement">
                  {!active
                    ? '请在当前游戏标签页继续'
                    : block ||
                      (b.level < CITY_MAX_LEVEL
                        ? '即时完成 · 自动保存'
                        : '基地设施已完成扩建')}
                </p>
              </>
            ) : (
              <p className="city-planned">
                <LockKeyhole size={15} />
                <span>
                  {meta.plan}
                  <small>专属玩法筹备中，暂不消耗建材。</small>
                </span>
              </p>
            )}
            <div className="city-stages" aria-label="建筑外观规划">
              {CITY_STAGES.map((level, index) => (
                <div
                  className={
                    b.level > 0 && cityStage(b.level) === index ? 'current' : ''
                  }
                  key={level}
                >
                  <img
                    src={cityArt(selected, level)}
                    alt={meta.stages[index]}
                  />
                  <span>
                    Lv.{level}
                    {index === 0 ? '–3' : index === 1 ? '–7' : '–10'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </section>
  );
}

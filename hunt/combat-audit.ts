import type { HuntGame } from './simulation';

export type CombatKeyframe = {
  key: string;
  label: string;
  png: string;
  capturedAt: string;
  gameTime: number;
  effectAge?: number;
  effectId?: number;
  spentAmmo: number;
  fired: number;
  width: number;
  height: number;
};
type AuditListener = (frame: CombatKeyframe) => void;
let listener: AuditListener | null = null;
let onError: ((message: string) => void) | null = null;
let seen = new Set<string>();

export const COMBAT_KEYFRAME_COUNT = 12;
const allowed = () =>
  typeof window !== 'undefined' &&
  window.location.pathname === '/art-review/flow' &&
  new URLSearchParams(window.location.search).get('rewards') === 'preview';

/** Only the explicit review-page button enables observation. Never writes game state. */
export function startCombatAudit(
  receive: AuditListener,
  fail: (message: string) => void,
  capturedKeys: string[] = [],
) {
  if (!allowed()) throw new Error('关键帧采集仅在独立流程审核页可用');
  listener = receive;
  onError = fail;
  seen = new Set(capturedKeys);
  return () => {
    if (listener === receive) {
      listener = null;
      onError = null;
    }
  };
}

function copyRenderedCanvases(source: HTMLCanvasElement) {
  const page =
    source.closest('.mori-gameplay-shell') ?? source.closest('.hunt-page');
  const main = source.getBoundingClientRect();
  if (!page || !main.width || !main.height) return;
  const layers = [
    // HuntView appends its flight layer directly to the shell (legacy: hunt-page).
    // Do not include other games' nested canvases in the shared shell.
    ...page.querySelectorAll<HTMLCanvasElement>(
      ':scope > canvas[aria-hidden="true"], .hunt-page > canvas[aria-hidden="true"]',
    ),
  ].filter(
    (canvas) =>
      canvas !== source && getComputedStyle(canvas).display !== 'none',
  );
  const rects = [
    main,
    ...layers.map((canvas) => canvas.getBoundingClientRect()),
  ];
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  const ratio = Math.min(2, source.width / main.width);
  const output = document.createElement('canvas');
  output.width = Math.max(1, Math.round((right - left) * ratio));
  output.height = Math.max(1, Math.round((bottom - top) * ratio));
  const c = output.getContext('2d');
  if (!c) return;
  // Preserve transparent space outside the combat canvas. DOM HUD is not reconstructed.
  for (const canvas of [source, ...layers]) {
    const r = canvas.getBoundingClientRect();
    c.drawImage(
      canvas,
      (r.left - left) * ratio,
      (r.top - top) * ratio,
      r.width * ratio,
      r.height * ratio,
    );
  }
  return {
    png: output.toDataURL('image/png'),
    width: output.width,
    height: output.height,
  };
}

/** Called after HuntView has finished drawing; reads the live simulation and pixels only. */
export function auditCombatFrame(canvas: HTMLCanvasElement, game: HuntGame) {
  if (!listener || seen.size >= COMBAT_KEYFRAME_COUNT) return;
  const near = (age: number, target: number, window = 0.12) =>
    age >= target && age < target + window;
  const marks: { key: string; label: string; age?: number; id?: number }[] = [];
  const addEffect = (
    key: string,
    label: string,
    predicate: (effect: HuntGame['effects'][number]) => boolean,
  ) => {
    if (seen.has(key)) return;
    const effect = game.effects.find(predicate);
    if (effect) marks.push({ key, label, age: effect.age, id: effect.id });
  };
  if (!game.save.weapons.active) {
    addEffect(
      'normal-shot',
      '普通开火 · 炮口与弹道',
      (e) => e.kind === 'shot' && near(e.age, 0.018, 0.055),
    );
    addEffect(
      'normal-hit',
      '普通命中 · 受击材质',
      (e) => e.kind === 'hit' && e.species < 5 && near(e.age, 0.035, 0.065),
    );
  }
  addEffect(
    'body-death-early',
    '实体死亡 · 0.12 秒失衡',
    (e) => e.kind === 'kill' && e.species < 4 && near(e.age, 0.12, 0.045),
  );
  addEffect(
    'body-death-late',
    '实体死亡 · 0.62 秒落地',
    (e) => e.kind === 'kill' && e.species < 4 && near(e.age, 0.62, 0.045),
  );
  addEffect(
    'special-kill',
    '特殊击杀 · 局部紫爆',
    (e) =>
      e.kind === 'kill' &&
      [5, 6, 7, 8, 10, 11].includes(e.species) &&
      near(e.age, 0.18),
  );
  addEffect(
    'ammo-hold',
    '黑金死亡 · 0.2 秒定格',
    (e) => e.kind === 'ammoReturn' && near(e.age, 0.2),
  );
  addEffect(
    'ammo-flight',
    '黑金回收 · 0.65 秒飞行',
    (e) => e.kind === 'ammoReturn' && near(e.age, 0.65),
  );
  const victory = game.courierVictory;
  if (victory)
    for (const [key, label, target] of [
      ['courier-impact', '运钞死亡 · 0.15 秒爆点', 0.15],
      ['courier-pose', '运钞死亡 · 0.65 秒散券', 0.65],
      ['jackpot', '运钞大奖 · 0.8 秒奖牌', 0.8],
    ] as const)
      if (!seen.has(key) && near(victory.age, target))
        marks.push({ key, label, age: victory.age, id: victory.actorId });
  if (game.save.weapons.active?.kind === 'shotgun')
    addEffect(
      'shotgun',
      '散弹技能 · 实际齐射',
      (e) => e.kind === 'scatter' && e.species === 11 && near(e.age, 0.035),
    );
  if (game.save.weapons.active?.kind === 'laser')
    addEffect(
      'laser',
      '激光技能 · 实际光束',
      (e) => e.kind === 'laser' && near(e.age, 0.035),
    );
  if (!marks.length) return;
  try {
    const pixels = copyRenderedCanvases(canvas);
    if (!pixels) return;
    for (const mark of marks) {
      seen.add(mark.key);
      listener?.({
        ...pixels,
        key: mark.key,
        label: mark.label,
        effectAge: mark.age,
        effectId: mark.id,
        capturedAt: new Date().toISOString(),
        gameTime: game.time,
        spentAmmo: game.save.economy.spentAmmo,
        fired: game.fired,
      });
    }
  } catch (error) {
    const report = onError;
    listener = null;
    onError = null;
    report?.(error instanceof Error ? error.message : '画布采集失败');
  }
}

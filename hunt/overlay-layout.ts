export type OverlayRect = { x: number; y: number; w: number; h: number };
export const overlaps = (a: OverlayRect, b: OverlayRect, gap = 6) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w + gap * 2 &&
  Math.abs(a.y - b.y) * 2 < a.h + b.h + gap * 2;

/** Priority-ordered placement in arena coordinates. No text is drawn over a reserved subject. */
export class CombatOverlayLayout {
  readonly occupied: OverlayRect[] = [];
  constructor(
    readonly top: number,
    readonly bottom = 620,
  ) {}
  reserve(rect: OverlayRect) {
    this.occupied.push(rect);
    return rect;
  }
  place(x: number, y: number, w: number, h: number, local = false) {
    if (w > 584 || h > this.bottom - this.top - 16) return null;
    const candidates: [number, number][] = [[x, y]];
    for (const dy of [-42, 42, -84, 84, -126, 126])
      for (const dx of [0, -80, 80]) candidates.push([x + dx, y + dy]);
    if (!local)
      for (
        let py = this.top + h / 2 + 8;
        py <= this.bottom - h / 2;
        py += h + 10
      )
        for (const px of [300, w / 2 + 12, 588 - w / 2])
          candidates.push([px, py]);
    for (const [px, py] of candidates) {
      const rect = {
        x: Math.max(w / 2 + 8, Math.min(592 - w / 2, px)),
        y: Math.max(this.top + h / 2 + 8, Math.min(this.bottom - h / 2, py)),
        w,
        h,
      };
      if (this.occupied.some((other) => overlaps(rect, other))) continue;
      return this.reserve(rect);
    }
    return null;
  }
}

export const jackpotTitle = (top: number) => ({ x: 236, y: top + 65 });
export const comboRect = (top: number): OverlayRect => ({
  x: 545,
  y: top + 43,
  w: 90,
  h: 64,
});

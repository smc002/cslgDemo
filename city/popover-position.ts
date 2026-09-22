export type Rect = { left: number; top: number; width: number; height: number };
// All coordinates are local to the viewport. Choose the closest fitting side,
// keeping the panel and its arrow clear of the HUD/navigation (outside viewport).
export function positionCityPopover(
  anchor: Rect,
  panel: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  const margin = 8,
    gap = 12;
  const width = Math.min(panel.width, viewport.width - margin * 2);
  const height = Math.min(panel.height, viewport.height - margin * 2);
  const cx = anchor.left + anchor.width / 2;
  const cy = anchor.top + anchor.height / 2;
  const spaces = {
    top: anchor.top - margin,
    bottom: viewport.height - anchor.top - anchor.height - margin,
    left: anchor.left - margin,
    right: viewport.width - anchor.left - anchor.width - margin,
  };
  type Side = keyof typeof spaces;
  const order: Side[] = ['top', 'bottom', 'right', 'left'];
  const side =
    order.find(
      (s) =>
        spaces[s] >= (s === 'top' || s === 'bottom' ? height : width) + gap,
    ) ?? (spaces.top >= spaces.bottom ? 'top' : 'bottom');
  const clamp = (n: number, max: number) => Math.max(margin, Math.min(n, max));
  const left = clamp(
    side === 'left'
      ? anchor.left - width - gap
      : side === 'right'
        ? anchor.left + anchor.width + gap
        : cx - width / 2,
    viewport.width - width - margin,
  );
  const top = clamp(
    side === 'top'
      ? anchor.top - height - gap
      : side === 'bottom'
        ? anchor.top + anchor.height + gap
        : cy - height / 2,
    viewport.height - height - margin,
  );
  return {
    left,
    top,
    width,
    maxHeight: viewport.height - margin * 2,
    side,
    arrow:
      side === 'top' || side === 'bottom'
        ? Math.max(20, Math.min(width - 20, cx - left))
        : Math.max(20, Math.min(height - 20, cy - top)),
  };
}

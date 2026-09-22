import metadata from '../public/assets/hunt/vehicle-v1/metadata.json';
import platform from '../public/assets/hunt/platform-v1/metadata.json';

const platformScale =
  250 / (platform.visible_bbox_px[2] - platform.visible_bbox_px[0]);
export const PLATFORM_RIG = {
  scale: platformScale,
  anchor: { x: 300, y: 800 },
  pixelAnchor: platform.anchor_px,
  bounds: {
    left:
      300 +
      (platform.visible_bbox_px[0] - platform.anchor_px[0]) * platformScale,
    right:
      300 +
      (platform.visible_bbox_px[2] - platform.anchor_px[0]) * platformScale,
    top:
      800 +
      (platform.visible_bbox_px[1] - platform.anchor_px[1]) * platformScale,
    bottom: 800,
  },
};

export const VEHICLE_RIG = {
  chassisScale: 120 / 650,
  turretScale: (120 / 650) * 0.95,
  chassisPivot: metadata.components.chassis.pivot_px,
  turretPivot: metadata.components.turret.pivot_px,
  muzzle: metadata.components.turret.muzzle_px,
};

/** Renderer, ordinary bullets, special weapons and flashes use this same rig. */
export function vehicleMuzzle(
  x: number,
  y: number,
  target: { x: number; y: number },
) {
  const angle = Math.atan2(target.y - y, target.x - x);
  const dx =
    (VEHICLE_RIG.muzzle[0] - VEHICLE_RIG.turretPivot[0]) *
    VEHICLE_RIG.turretScale;
  const dy =
    (VEHICLE_RIG.muzzle[1] - VEHICLE_RIG.turretPivot[1]) *
    VEHICLE_RIG.turretScale;
  const rotation = angle - Math.atan2(dy, dx);
  return {
    x: x + dx * Math.cos(rotation) - dy * Math.sin(rotation),
    y: y + dx * Math.sin(rotation) + dy * Math.cos(rotation),
    angle,
    rotation,
  };
}

/** Keep the car above controls on both tall and short portrait screens. */
export const arenaViewportOffset = (viewportHeight: number) =>
  viewportHeight - 800;

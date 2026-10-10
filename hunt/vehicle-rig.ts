import art from '../shared/toy-art-data.json';
// New source coordinates measured from the generated component sprites.
const platform = art['vehicle-platform'];
const platformScale = 250 / (platform.bounds[2] - platform.bounds[0]);
const platformAnchor = [
  (platform.bounds[0] + platform.bounds[2]) / 2,
  platform.bounds[3],
];
export const PLATFORM_RIG = {
  scale: platformScale,
  anchor: { x: 300, y: 800 },
  pixelAnchor: platformAnchor,
  bounds: {
    left: 175,
    right: 425,
    top: 800 - (platform.bounds[3] - platform.bounds[1]) * platformScale,
    bottom: 800,
  },
};
export const VEHICLE_RIG = {
  chassisScale:
    120 / (art['vehicle-chassis'].bounds[2] - art['vehicle-chassis'].bounds[0]),
  // Retain the previous projected barrel length (85.41 world units).
  turretScale: 85.4123076923077 / (1265 - 64),
  chassisPivot: [574, 500],
  turretPivot: [490, 1265],
  muzzle: [485, 64],
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

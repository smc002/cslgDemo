export const HUNT_ARRIVAL_SECONDS = 4.8;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => {
  const p = clamp(n);
  return p * p * (3 - 2 * p);
};
/** Drive first, then zoom. The camera never moves while the vehicle is still rolling. */
export function huntArrivalFrame(age: number | null | undefined) {
  if (age == null) return { zoom: 1, cameraProgress: 1, vehicleOffset: 0, driving: 0 };
  const drive = smooth((age - 0.3) / 2.3);
  const cameraProgress = smooth((age - 2.9) / 1.75);
  return {
    zoom: 0.5 + 0.5 * cameraProgress,
    cameraProgress,
    vehicleOffset: 680 * (1 - drive),
    driving: age >= 0.3 && age < 2.6 ? 1 : 0,
  };
}

/** One camera for terrain, parking bay and vehicle; exact identity at the endpoint. */
export function arrivalCamera(age: number | null | undefined, viewportHeight: number) {
  const frame = huntArrivalFrame(age);
  const center = 800 - viewportHeight / 2;
  // The 2:3 terrain covers tall viewports too. Keep the overview crop inside its edges.
  const groundHeight = Math.max(900, viewportHeight);
  const overviewTop = 800 - (viewportHeight + groundHeight) / 2 - groundHeight * 0.24;
  const farFocus = Math.max(overviewTop + viewportHeight,
    Math.min(overviewTop + groundHeight * 2 - viewportHeight, 500));
  const focus = farFocus + (center - farFocus) * frame.cameraProgress;
  return { ...frame, translateX: 300 * (1 - frame.zoom), translateY: center - focus * frame.zoom };
}

/** Feather the original arena into the overview so its landmarks never change during zoom. */
export function featherArrivalGround(ground: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = ground.width;
  canvas.height = ground.height;
  const c = canvas.getContext('2d')!;
  c.drawImage(ground, 0, 0);
  c.globalCompositeOperation = 'destination-in';
  for (const horizontal of [true, false]) {
    const mask = c.createLinearGradient(0, 0, horizontal ? canvas.width : 0, horizontal ? 0 : canvas.height);
    mask.addColorStop(0, '#0000');
    mask.addColorStop(0.055, '#000');
    mask.addColorStop(0.945, '#000');
    mask.addColorStop(1, '#0000');
    c.fillStyle = mask;
    c.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

import type { ZombieFacing } from './zombie-animation';

type Point = readonly [number, number];
export type LegRig = {
  outline: readonly Point[];
  hip: number;
  knee: number;
  ankle: number;
};
export type GaitRig = {
  legs: readonly [LegRig, LegRig];
  cycle: number;
  stride: number;
  lift: number;
};

// Anatomical masks of the existing 320px standing poses. The indented edges
// exclude hands hanging in front of thighs: those stay attached to the torso.
const leg = (hip: number, outline: readonly Point[]): LegRig => {
  const root = Math.max(hip, Math.min(...outline.map((p) => p[1])));
  return { outline, hip: root, knee: root + (278 - root) * 0.5, ankle: 278 };
};
// Below the hanging hands, assign the entire sole region to the two legs.
// Narrow thigh masks must never leave a sliver of a wide boot on the torso.
function withSole(points: readonly Point[], left: boolean): Point[] {
  const cut = 268,
    clipped: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    if (a[1] <= cut) clipped.push(a);
    if ((a[1] < cut && b[1] > cut) || (a[1] > cut && b[1] < cut))
      clipped.push([
        a[0] + ((b[0] - a[0]) * (cut - a[1])) / (b[1] - a[1]),
        cut,
      ]);
  }
  const result: Point[] = [];
  clipped.forEach((a, i) => {
    result.push(a);
    const b = clipped[(i + 1) % clipped.length];
    if (a[1] === cut && b[1] === cut) {
      if (left) result.push([a[0], 320], [0, 320], [0, cut]);
      else result.push([320, cut], [320, 320], [b[0], 320]);
    }
  });
  return result;
}
const pair = (hip: number, left: readonly Point[], right: readonly Point[]) =>
  [leg(hip, withSole(left, true)), leg(hip, withSole(right, false))] as const;
const shapes: Record<string, Record<string, readonly [LegRig, LegRig]>> = {
  normal: {
    S: pair(
      222,
      [
        [121, 222],
        [159, 222],
        [159, 320],
        [92, 320],
        [117, 249],
      ],
      [
        [159, 222],
        [203, 222],
        [214, 320],
        [159, 320],
      ],
    ),
    SE: pair(
      227,
      [
        [133, 227],
        [161, 227],
        [158, 320],
        [90, 320],
        [105, 268],
        [115, 246],
      ],
      [
        [161, 227],
        [202, 227],
        [232, 268],
        [240, 320],
        [158, 320],
      ],
    ),
    E: pair(
      228,
      [
        [110, 228],
        [158, 228],
        [153, 320],
        [80, 320],
        [98, 260],
      ],
      [
        [158, 240],
        [185, 240],
        [188, 251],
        [220, 263],
        [240, 320],
        [153, 320],
      ],
    ),
    NE: pair(
      220,
      [
        [127, 220],
        [163, 220],
        [156, 320],
        [96, 320],
      ],
      [
        [163, 220],
        [202, 220],
        [218, 320],
        [156, 320],
      ],
    ),
    N: pair(
      224,
      [
        [120, 224],
        [160, 224],
        [159, 320],
        [98, 320],
      ],
      [
        [160, 224],
        [206, 224],
        [221, 320],
        [159, 320],
      ],
    ),
  },
  armored: {
    S: pair(
      222,
      [
        [117, 222],
        [159, 222],
        [156, 320],
        [97, 320],
        [112, 250],
      ],
      [
        [159, 222],
        [207, 222],
        [222, 320],
        [156, 320],
      ],
    ),
    SE: pair(
      224,
      [
        [90, 259],
        [108, 262],
        [127, 259],
        [140, 253],
        [151, 270],
        [153, 320],
        [80, 320],
      ],
      [
        [154, 224],
        [203, 224],
        [229, 268],
        [240, 320],
        [153, 320],
        [157, 249],
      ],
    ),
    E: pair(
      218,
      [
        [107, 218],
        [152, 230],
        [157, 248],
        [151, 320],
        [72, 320],
        [86, 268],
        [96, 244],
      ],
      [
        [160, 248],
        [179, 257],
        [202, 249],
        [222, 263],
        [240, 320],
        [151, 320],
      ],
    ),
    NE: pair(
      223,
      [
        [108, 223],
        [155, 224],
        [153, 320],
        [73, 320],
        [85, 268],
        [93, 242],
      ],
      [
        [155, 224],
        [196, 224],
        [230, 268],
        [240, 320],
        [153, 320],
      ],
    ),
    N: pair(
      223,
      [
        [114, 223],
        [159, 223],
        [160, 320],
        [98, 320],
      ],
      [
        [159, 223],
        [207, 223],
        [225, 320],
        [160, 320],
      ],
    ),
  },
  explosive: {
    S: pair(
      246,
      [
        [114, 246],
        [153, 246],
        [152, 320],
        [97, 320],
      ],
      [
        [153, 246],
        [191, 246],
        [204, 320],
        [152, 320],
      ],
    ),
    SE: pair(
      245,
      [
        [127, 245],
        [159, 245],
        [153, 320],
        [100, 320],
        [122, 272],
      ],
      [
        [159, 245],
        [184, 245],
        [207, 320],
        [153, 320],
      ],
    ),
    E: pair(
      250,
      [
        [112, 250],
        [158, 250],
        [157, 320],
        [85, 320],
        [99, 268],
      ],
      [
        [158, 250],
        [189, 250],
        [216, 268],
        [230, 320],
        [157, 320],
      ],
    ),
    NE: pair(
      248,
      [
        [118, 248],
        [159, 248],
        [153, 320],
        [90, 320],
        [106, 260],
      ],
      [
        [159, 248],
        [195, 248],
        [224, 268],
        [230, 320],
        [153, 320],
      ],
    ),
    N: pair(
      250,
      [
        [121, 250],
        [159, 250],
        [157, 320],
        [99, 320],
      ],
      [
        [159, 250],
        [196, 250],
        [215, 320],
        [157, 320],
      ],
    ),
  },
  giant: {
    S: pair(
      220,
      [
        [123, 220],
        [161, 220],
        [160, 320],
        [89, 320],
        [119, 266],
        [126, 246],
      ],
      [
        [161, 220],
        [210, 220],
        [232, 320],
        [160, 320],
      ],
    ),
    SE: pair(
      224,
      [
        [126, 224],
        [161, 224],
        [154, 320],
        [92, 320],
        [122, 268],
        [132, 249],
      ],
      [
        [161, 224],
        [206, 224],
        [238, 320],
        [154, 320],
      ],
    ),
    E: pair(
      218,
      [
        [101, 218],
        [151, 227],
        [158, 246],
        [152, 320],
        [60, 320],
        [70, 268],
        [87, 242],
      ],
      [
        [162, 235],
        [177, 239],
        [183, 253],
        [198, 258],
        [222, 250],
        [245, 268],
        [260, 320],
        [152, 320],
      ],
    ),
    NE: pair(
      224,
      [
        [100, 224],
        [160, 224],
        [154, 320],
        [73, 320],
        [89, 250],
      ],
      [
        [160, 224],
        [208, 224],
        [248, 268],
        [260, 320],
        [154, 320],
      ],
    ),
    N: pair(
      222,
      [
        [109, 222],
        [161, 222],
        [158, 320],
        [88, 320],
      ],
      [
        [161, 222],
        [216, 222],
        [239, 320],
        [158, 320],
      ],
    ),
  },
};
const settings: Record<string, [number, number, number]> = {
  normal: [0.72, 18, 11],
  armored: [0.9, 14, 9],
  explosive: [0.82, 17, 8],
  giant: [1.25, 10, 10],
};

export function zombieGaitRig(
  archetype: string,
  facing: ZombieFacing,
): GaitRig | undefined {
  const legs = shapes[archetype]?.[facing];
  if (!legs) return;
  const [cycle, stride, lift] = settings[archetype];
  return { legs, cycle, stride, lift };
}

/** 60% planted travel, 40% lifted recovery. No duplicate/cross-faded poses. */
export function zombieStep(phase: number) {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.6) return { travel: 1 - p / 0.3, lift: 0 };
  const swing = (p - 0.6) / 0.4;
  return {
    travel: -Math.cos(swing * Math.PI),
    lift: Math.sin(swing * Math.PI) ** 2,
  };
}

export function zombieGaitPose(
  rig: GaitRig,
  facing: ZombieFacing,
  seconds: number,
  moving = true,
) {
  const phase = seconds / rig.cycle;
  const side =
    facing === 'E' ? 1 : facing === 'S' || facing === 'N' ? 0.12 : 0.7;
  const depth =
    facing === 'S'
      ? 7
      : facing === 'N'
        ? -7
        : facing === 'SE'
          ? 4
          : facing === 'NE'
            ? -4
            : 0;
  const amount = moving ? 1 : 0;
  const body = {
    x: Math.sin(phase * Math.PI * 2) * 0.8 * amount,
    y: (1 - Math.cos(phase * Math.PI * 4)) * 0.8 * amount,
  };
  return {
    body,
    feet: [0, 0.5].map((offset) => {
      const step = zombieStep(phase + offset);
      return {
        x: step.travel * rig.stride * side * amount,
        y: (step.travel * depth - step.lift * rig.lift) * amount,
      };
    }),
  };
}

// A continuous thigh/knee/ankle deformation; the boot itself stays rigid.
// Shared strip edges preserve the silhouette instead of dissolving two poses.
export function zombieLegStrips(
  legRig: LegRig,
  foot: { x: number; y: number },
  body: { x: number; y: number },
) {
  const { hip, knee, ankle } = legRig;
  const rows = [Math.min(...legRig.outline.map((p) => p[1])), knee, ankle, 320];
  const offset = (y: number) => {
    const t = Math.max(0, Math.min(1, (y - hip) / (ankle - hip)));
    return {
      x: body.x * (1 - t) + foot.x * t,
      y: body.y * (1 - t) + foot.y * t,
    };
  };
  return rows.slice(0, -1).map((top, i) => {
    const bottom = rows[i + 1],
      a = offset(top),
      b = offset(bottom);
    return {
      top,
      bottom,
      shear: (b.x - a.x) / (bottom - top),
      scaleY: 1 + (b.y - a.y) / (bottom - top),
      x: a.x,
      y: a.y,
    };
  });
}

type Layers = { body: HTMLCanvasElement; legs: HTMLCanvasElement[] };
function surface() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 320;
  return canvas;
}
function outline(c: CanvasRenderingContext2D, points: readonly Point[]) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
}

/** Only the 20 source views are cached (~24 MB), never per-enemy/per-frame atlases. */
export class ZombieGaitRenderer {
  private layers = new Map<string, Layers>();
  private scratch = surface();

  draw(
    c: CanvasRenderingContext2D,
    sheet: HTMLImageElement,
    archetype: string,
    facing: ZombieFacing,
    frame: number,
    columns: number,
    seconds: number,
    moving: boolean,
    x: number,
    y: number,
    size: number,
  ) {
    const rig = zombieGaitRig(archetype, facing);
    if (!rig) return false;
    const key = `${archetype}/${facing}/${sheet.src}/${frame}`;
    let layers = this.layers.get(key);
    if (!layers) {
      const body = surface();
      const b = body.getContext('2d')!;
      const sx = (frame % columns) * 320,
        sy = Math.floor(frame / columns) * 320;
      b.drawImage(sheet, sx, sy, 320, 320, 0, 0, 320, 320);
      const legs = rig.legs.map((l) => {
        const canvas = surface(),
          ctx = canvas.getContext('2d')!;
        outline(ctx, l.outline);
        ctx.clip();
        ctx.drawImage(sheet, sx, sy, 320, 320, 0, 0, 320, 320);
        b.save();
        outline(b, l.outline);
        b.clip();
        b.clearRect(0, 0, 320, 320);
        b.restore();
        return canvas;
      });
      layers = { body, legs };
      this.layers.set(key, layers);
    }
    const target = this.scratch.getContext('2d')!;
    target.clearRect(0, 0, 320, 320);
    const pose = zombieGaitPose(rig, facing, seconds, moving);
    rig.legs.forEach((l, i) => {
      for (const strip of zombieLegStrips(l, pose.feet[i], pose.body)) {
        target.save();
        target.transform(
          1,
          0,
          strip.shear,
          strip.scaleY,
          strip.x - strip.shear * strip.top,
          strip.y + strip.top * (1 - strip.scaleY),
        );
        // A subpixel overlap hides antialias seams between adjoining strips.
        const height = Math.min(
          320 - strip.top,
          strip.bottom - strip.top + 0.4,
        );
        target.drawImage(
          layers!.legs[i],
          0,
          strip.top,
          320,
          height,
          0,
          strip.top,
          320,
          height,
        );
        target.restore();
      }
    });
    target.drawImage(layers.body, pose.body.x, pose.body.y);
    // Tint / freeze / hit flash apply once to the composed, articulated sprite.
    c.drawImage(this.scratch, x, y, size, size);
    return true;
  }
}
